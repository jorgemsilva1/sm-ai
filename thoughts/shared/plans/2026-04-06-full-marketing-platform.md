# Full Social Media Marketing Platform — Implementation Plan

## Overview

Evolve SM-AI from a content planning/generation tool into a complete social media marketing platform. This means: posts generated on the calendar get published to real social platforms at their `scheduled_at` time, agencies can manage media assets, track analytics, boost posts, and manage budgets — all from a single dashboard.

## Current State Analysis

### What Works
1. OAuth connect/disconnect flow with PKCE for 6 platforms (Instagram, Facebook, TikTok, LinkedIn, YouTube, X)
2. `client_social_accounts` stores tokens (`access_token`, `refresh_token`, `expires_at`, `scopes`)
3. Full AI content pipeline: strategy → schedule generation → post editing → accept/retry
4. Calendar with drag-drop, 5-tab editor (overview, preview, text, assets, rationale)
5. Asset upload to Supabase Storage (`reference-assets` bucket) with aspect ratio validation
6. Platform-specific preview components (Instagram, TikTok, LinkedIn, Facebook)

### Key Discoveries
- **Post lifecycle ends at `accepted`** — `actions.ts:1860-1903` flips status but never publishes
- **`scheduled_at` is calendar-only** — `calendar/page.tsx:141` uses it for position, no scheduler reads it
- **No background job infrastructure** — no cron, no queue, no Inngest/Bull/pg-boss in `package.json`
- **No media library table** — assets are inline JSONB on `client_schedule_items`
- **8 placeholder pages** — budget, media, feed, audiences, suggestions, api-docs, logs, social-media-platforms all show "Coming soon."
- **Token refresh not implemented** — Meta tokens expire in 60 days, TikTok access tokens in 24 hours
- **No `published`, `scheduled`, `failed` statuses** — only `suggested` | `accepted` (`actions.ts:124`)
- **Supabase server client uses `cookies()`** — Inngest functions run outside request context, need a service-role client

### Platform API Requirements

**Meta (Instagram + Facebook):**
- 2-step container model: create container → poll until `FINISHED` → call `media_publish`
- Instagram: image posts, carousels (up to 10 items), reels, stories
- Facebook Pages: requires Page Access Token (derived from long-lived user token, never expires)
- Rate limit: 100 API-published posts per account per rolling 24h
- Scopes needed: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, `pages_manage_posts`, `pages_read_engagement`
- Token flow: short-lived (1-2h) → long-lived (60 days, refreshable) → page token (never expires)
- Boosting: Campaign → Ad Set → Creative → Ad (requires `ads_management` scope)

**TikTok:**
- Init upload → upload video → poll until `PUBLISH_COMPLETE`
- Access tokens expire in 24h, refresh tokens in 365 days
- Scopes needed: `video.publish`, `video.list`, `user.info.basic`, `user.info.stats`
- Rate limit: 6 publish requests/min, 30 status polls/min
- App audit required for public posting

## Desired End State

After this plan is complete:

1. **Publish to platforms**: Accepted posts automatically publish at their `scheduled_at` time via Inngest background jobs
2. **Full post lifecycle**: `suggested → accepted → scheduled → publishing → published → failed` with clear UI indicators
3. **Media library**: Centralized per-client asset management; reuse assets across posts; browse/upload from the post editor
4. **Token management**: Automatic refresh for Meta (every ~50 days) and TikTok (every ~20h) tokens; graceful handling of expired/revoked tokens
5. **Analytics**: Pull engagement metrics (likes, comments, reach) from Meta and TikTok; display per-post and account-level insights
6. **Feed preview**: Visual Instagram grid planner showing how posts look together
7. **Post boosting**: Promote published posts via Meta Marketing API with budget/targeting controls
8. **Budget tracking**: Track ad spend per client with budget limits and alerts
9. **Audience management**: Define and reuse targeting audiences for ad campaigns
10. **Activity logs**: Track all actions (publish, boost, retry, accept) with timestamps and actor
11. **Suggestions**: AI-powered content suggestions based on analytics and competitor data

### Verification
- Accept a post with `scheduled_at` in 5 minutes → post appears on Instagram at that time
- Open media library → see all uploaded assets → select one for a new post
- View a published post → see likes, comments, reach metrics
- Boost a published Instagram post → set $10/day budget → ad goes live
- Check activity log → see full history of who did what and when

## What We're NOT Doing

- LinkedIn, YouTube, X publishing (Phase 2 of a future plan)
- Full ad campaign builder (only post boosting for now)
- Auto-publishing without explicit user acceptance (accepted = intent to publish)
- Webhook-based real-time analytics (polling on demand is sufficient)
- Multi-user roles/permissions (current owner-based RLS is sufficient)
- Content approval workflows beyond accept/reject

## Implementation Approach

7 phases, ordered by dependency. Phases 1-3 are infrastructure. Phases 4-5 are core publishing. Phases 6-7 are value-add features.

The key architectural decision: **accepting a post = scheduling it for publish**. When a user accepts a post, if `scheduled_at` is in the future, an Inngest job is created with `step.sleepUntil(scheduled_at)`. If `scheduled_at` is in the past, we either publish immediately or prompt the user to pick a new time.

---

## Phase 1: Foundation — Post Status Lifecycle + Media Library + Supabase Admin Client

### Overview
Extend the post status system, create the media library infrastructure, and set up a Supabase admin client for background jobs.

### Changes Required

#### 1. Extend post status enum
**File**: `src/app/(app)/dashboard/clients/actions.ts` (line 124)

Change from:
```typescript
type ScheduleItemStatus = "suggested" | "accepted";
```
To:
```typescript
type ScheduleItemStatus = "suggested" | "accepted" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";
```

#### 2. Add publishing columns to schedule items
**File**: Create `supabase/scripts/32_schedule_items_publishing.sql`

```sql
-- Add publishing-related columns
ALTER TABLE public.client_schedule_items
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS publish_job_id text,
  ADD COLUMN IF NOT EXISTS social_account_id uuid REFERENCES public.client_social_accounts(id) ON DELETE SET NULL;

-- Index for finding posts to publish
CREATE INDEX IF NOT EXISTS idx_schedule_items_status_scheduled
  ON public.client_schedule_items (status, scheduled_at)
  WHERE status IN ('scheduled', 'publishing');
```

#### 3. Create media library table
**File**: Create `supabase/scripts/33_client_media_assets.sql`

```sql
CREATE TABLE IF NOT EXISTS public.client_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_url text NOT NULL,
  thumbnail_url text,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'gif')),
  mime_type text NOT NULL,
  file_size bigint,
  width integer,
  height integer,
  duration_ms integer,
  tags text[] DEFAULT '{}',
  folder text DEFAULT 'general',
  metadata jsonb DEFAULT '{}'::jsonb,
  used_in_posts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media assets are viewable by owner"
  ON public.client_media_assets FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Media assets are insertable by owner"
  ON public.client_media_assets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Media assets are updatable by owner"
  ON public.client_media_assets FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Media assets are deletable by owner"
  ON public.client_media_assets FOR DELETE USING (auth.uid() = owner_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_client ON public.client_media_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON public.client_media_assets(client_id, folder);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON public.client_media_assets USING gin(tags);

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.client_media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### 4. Create analytics table
**File**: Create `supabase/scripts/34_post_analytics.sql`

```sql
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_item_id uuid NOT NULL REFERENCES public.client_schedule_items(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_id text,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  engagement integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  video_views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post analytics are viewable by owner"
  ON public.post_analytics FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Post analytics are insertable by owner"
  ON public.post_analytics FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Post analytics are updatable by owner"
  ON public.post_analytics FOR UPDATE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_post_analytics_item ON public.post_analytics(schedule_item_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_client ON public.post_analytics(client_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.post_analytics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### 5. Create activity log table
**File**: Create `supabase/scripts/35_activity_logs.sql`

```sql
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity logs are viewable by owner"
  ON public.activity_logs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Activity logs are insertable by owner"
  ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_client ON public.activity_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
```

#### 6. Create ad campaigns table (for future boosting)
**File**: Create `supabase/scripts/36_ad_campaigns.sql`

```sql
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_item_id uuid REFERENCES public.client_schedule_items(id) ON DELETE SET NULL,
  social_account_id uuid REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'boost' CHECK (campaign_type IN ('boost', 'campaign')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'completed', 'failed')),
  external_campaign_id text,
  external_adset_id text,
  external_ad_id text,
  name text NOT NULL,
  daily_budget_cents integer,
  total_budget_cents integer,
  currency text DEFAULT 'USD',
  start_date timestamptz,
  end_date timestamptz,
  targeting jsonb DEFAULT '{}'::jsonb,
  results jsonb DEFAULT '{}'::jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ad campaigns are viewable by owner"
  ON public.ad_campaigns FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are insertable by owner"
  ON public.ad_campaigns FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are updatable by owner"
  ON public.ad_campaigns FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Ad campaigns are deletable by owner"
  ON public.ad_campaigns FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_client ON public.ad_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_item ON public.ad_campaigns(schedule_item_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### 7. Create saved audiences table
**File**: Create `supabase/scripts/37_saved_audiences.sql`

```sql
CREATE TABLE IF NOT EXISTS public.saved_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  platform text NOT NULL,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_reach jsonb,
  used_in_campaigns integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Saved audiences are viewable by owner"
  ON public.saved_audiences FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are insertable by owner"
  ON public.saved_audiences FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are updatable by owner"
  ON public.saved_audiences FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Saved audiences are deletable by owner"
  ON public.saved_audiences FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_saved_audiences_client ON public.saved_audiences(client_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.saved_audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

#### 8. Create Supabase admin client for background jobs
**File**: Create `src/lib/supabase/admin.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client for use in background jobs (Inngest functions)
 * where there is no request context (no cookies).
 * Uses the service role key — bypasses RLS.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
```

Add `SUPABASE_SERVICE_ROLE_KEY` to env:
**File**: `supabase/env.example` — add line:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 9. Update calendar UI with new status indicators
**File**: `src/components/clients/client-calendar.tsx`

Update `eventPropGetter` to add CSS classes for new statuses:
- `sm-rbc-event-scheduled` — blue indicator
- `sm-rbc-event-publishing` — pulsing/spinning indicator
- `sm-rbc-event-published` — green indicator with checkmark
- `sm-rbc-event-failed` — red indicator

**File**: `src/app/globals.css`

Add calendar event styles for new statuses:
```css
.sm-rbc-event-scheduled { border-left: 3px solid oklch(0.65 0.15 250); }
.sm-rbc-event-publishing { border-left: 3px solid oklch(0.7 0.15 85); animation: pulse 1.5s infinite; }
.sm-rbc-event-published { border-left: 3px solid oklch(0.65 0.18 145); }
.sm-rbc-event-failed { border-left: 3px solid oklch(0.65 0.2 25); }
```

#### 10. Update i18n with new status labels
**File**: `src/lib/i18n.ts`

Add translations for all new statuses, media library labels, analytics labels, activity log labels, audience labels, budget labels, and suggestions labels.

### Success Criteria

#### Automated Verification
- [x] `npm run build` passes (pre-existing TS error in page.tsx unrelated to Phase 1)
- [x] `npm run lint` passes (pre-existing any errors in unchanged code)
- [x] All 6 migration scripts apply cleanly

#### Manual Verification
- [ ] Calendar shows distinct visual indicators for each status
- [ ] New status type compiles without TypeScript errors throughout the codebase
- [ ] Supabase admin client can query data when tested from a server action

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 2: Inngest Setup + Token Management

### Overview
Set up Inngest for background job processing and implement automatic token refresh for Meta and TikTok.

### Changes Required

#### 1. Install and configure Inngest
**Terminal**: `npm install inngest`

**File**: Create `src/inngest/client.ts`
```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "sm-ai" });
```

**File**: Create `src/app/api/inngest/route.ts`
```typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { refreshMetaTokens, refreshTikTokTokens } from "@/inngest/functions";

export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    refreshMetaTokens,
    refreshTikTokTokens,
  ],
});
```

**File**: `.env.local` — add `INNGEST_DEV=1`

**File**: `package.json` — add script:
```json
"dev:inngest": "npx inngest-cli@latest dev -u http://localhost:3000/api/inngest"
```

#### 2. Enhance OAuth callback for Meta token exchange
**File**: `src/app/api/oauth/[provider]/callback/route.ts`

After the initial token exchange, for Meta providers (Instagram/Facebook):
- Exchange the short-lived token for a long-lived token via `GET https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}`
- For Facebook: also fetch Page Access Token via `GET /v25.0/{user-id}/accounts` and store the page token (never expires)
- Store `refresh_expires_at` alongside `expires_at` in `client_social_accounts`

For TikTok:
- The initial token exchange already returns both `access_token` (24h) and `refresh_token` (365 days)
- Store `refresh_expires_at = now() + 365 days`

#### 3. Add `refresh_expires_at` column
**File**: Create `supabase/scripts/38_social_accounts_refresh_expiry.sql`

```sql
ALTER TABLE public.client_social_accounts
  ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS page_access_token text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS token_status text DEFAULT 'active'
    CHECK (token_status IN ('active', 'expiring_soon', 'expired', 'revoked'));
```

#### 4. Create token refresh Inngest functions
**File**: Create `src/inngest/functions/refresh-tokens.ts`

```typescript
// Meta: runs daily, refreshes tokens expiring within 10 days
export const refreshMetaTokens = inngest.createFunction(
  { id: "refresh-meta-tokens" },
  { cron: "0 3 * * *" }, // 3am daily
  async ({ step }) => {
    // 1. Query client_social_accounts where provider IN ('instagram', 'facebook')
    //    AND expires_at < now() + interval '10 days'
    //    AND token_status = 'active'
    // 2. For each: call Meta refresh endpoint
    // 3. Update access_token, expires_at in DB
    // 4. If refresh fails, set token_status = 'expired'
    // 5. Log activity
  }
);

// TikTok: runs every 12 hours, refreshes tokens expiring within 6 hours
export const refreshTikTokTokens = inngest.createFunction(
  { id: "refresh-tiktok-tokens" },
  { cron: "0 */12 * * *" }, // every 12 hours
  async ({ step }) => {
    // 1. Query client_social_accounts where provider = 'tiktok'
    //    AND expires_at < now() + interval '6 hours'
    //    AND token_status = 'active'
    // 2. For each: POST https://open.tiktokapis.com/v2/oauth/token/
    //    with grant_type=refresh_token
    // 3. Update access_token, refresh_token (may change!), expires_at
    // 4. If refresh fails and refresh_token expired, set token_status = 'expired'
    // 5. Log activity
  }
);
```

#### 5. Create platform API client utilities
**File**: Create `src/lib/social/meta-client.ts`

Utility functions for Meta Graph API calls:
- `getValidAccessToken(accountId)` — lazy refresh: checks `expires_at`, refreshes if needed, returns valid token
- `createInstagramContainer(token, igUserId, params)` — creates media container
- `pollContainerStatus(token, containerId)` — polls until `FINISHED` or `ERROR`
- `publishContainer(token, igUserId, containerId)` — publishes
- `getMediaInsights(token, mediaId)` — fetches engagement metrics
- `createFacebookPost(pageToken, pageId, params)` — publishes to FB page
- `exchangeForLongLivedToken(shortToken)` — token exchange
- `getPageAccessToken(longLivedToken, userId)` — derives page token

**File**: Create `src/lib/social/tiktok-client.ts`

Utility functions for TikTok API calls:
- `getValidAccessToken(accountId)` — lazy refresh
- `queryCreatorInfo(token)` — gets privacy levels, limits
- `initVideoUpload(token, params)` — initializes publish
- `uploadVideoFile(uploadUrl, videoBuffer)` — uploads video
- `pollPublishStatus(token, publishId)` — polls until complete
- `getVideoList(token)` — fetches videos with engagement metrics
- `refreshAccessToken(refreshToken)` — token refresh

**File**: Create `src/lib/social/types.ts`

Shared types:
```typescript
export type PublishResult = {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
};

export type PlatformPublisher = {
  publish(post: ScheduleItemForPublish, account: SocialAccount): Promise<PublishResult>;
  getInsights(externalId: string, account: SocialAccount): Promise<PostInsights>;
};
```

#### 6. Show token status in integrations UI
**File**: `src/components/clients/client-integrations.tsx`

For each connected account, show a status badge:
- `active` — green dot
- `expiring_soon` — yellow dot with "Expires in X days"
- `expired` — red dot with "Reconnect required"
- `revoked` — red dot with "Access revoked — reconnect"

When status is `expired` or `revoked`, the "Connect" button should be prominent.

### Success Criteria

#### Automated Verification
- [x] `npm run build` passes (pre-existing TS error unrelated to Phase 2)
- [x] `npm run lint` passes (pre-existing any errors in unchanged code)
- [ ] `npx inngest-cli@latest dev` starts and discovers functions at `/api/inngest`
- [x] Migration applies cleanly

#### Manual Verification
- [ ] Connect an Instagram account → verify long-lived token is stored (check `expires_at` is ~60 days out)
- [ ] Inngest dev dashboard shows `refresh-meta-tokens` and `refresh-tiktok-tokens` cron functions
- [ ] Trigger `refresh-meta-tokens` manually → see it query accounts (even if none need refresh)
- [ ] Token status badges appear correctly in integrations UI

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 3: Publishing Engine — Meta (Instagram + Facebook)

### Overview
Implement the actual publishing flow: when a post is accepted, it gets scheduled via Inngest, and at `scheduled_at` time, it's published to Instagram or Facebook using the Meta Graph API.

### Changes Required

#### 1. Create the publish Inngest function
**File**: Create `src/inngest/functions/publish-post.ts`

```typescript
import { NonRetriableError, RetryAfterError } from "inngest";
import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram, publishToFacebook } from "@/lib/social/meta-client";

export const publishScheduledPost = inngest.createFunction(
  {
    id: "publish-scheduled-post",
    retries: 5,
    onFailure: async ({ event, error }) => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({ status: "failed", failure_reason: error.message })
        .eq("id", event.data.postId);
      // Log activity
      await supabase.from("activity_logs").insert({
        client_id: event.data.clientId,
        owner_id: event.data.ownerId,
        action: "publish_failed",
        entity_type: "schedule_item",
        entity_id: event.data.postId,
        details: { error: error.message, platform: event.data.platform },
      });
    },
  },
  { event: "post/publish.scheduled" },
  async ({ event, step }) => {
    const { postId, scheduledAt, platform, clientId, ownerId, socialAccountId } = event.data;

    // 1. Validate post still exists and is in 'scheduled' status
    const post = await step.run("validate-post", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("client_schedule_items")
        .select("*, client_schedule_drafts(strategy_id)")
        .eq("id", postId)
        .single();
      if (error || !data) throw new NonRetriableError(`Post ${postId} not found`);
      if (data.status === "cancelled") throw new NonRetriableError("Post was cancelled");
      if (data.status === "published") throw new NonRetriableError("Post already published");
      return data;
    });

    // 2. Sleep until scheduled time
    await step.sleepUntil("wait-for-publish-time", scheduledAt);

    // 3. Re-validate (user might have cancelled during sleep)
    const currentPost = await step.run("re-validate", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("client_schedule_items")
        .select("status, scheduled_at, caption, title, assets, platform, format")
        .eq("id", postId)
        .single();
      if (!data || data.status === "cancelled") {
        throw new NonRetriableError("Post was cancelled during wait");
      }
      return data;
    });

    // 4. Get social account with valid token
    const account = await step.run("get-account", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("*")
        .eq("id", socialAccountId)
        .single();
      if (error || !data) throw new NonRetriableError("Social account not found or disconnected");
      if (data.token_status === "expired" || data.token_status === "revoked") {
        throw new NonRetriableError(`Token ${data.token_status} — reconnect required`);
      }
      return data;
    });

    // 5. Set status to 'publishing'
    await step.run("set-publishing", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({ status: "publishing" })
        .eq("id", postId);
    });

    // 6. Publish to platform
    const result = await step.run("publish", async () => {
      if (platform === "instagram") {
        return await publishToInstagram(account, currentPost);
      } else if (platform === "facebook") {
        return await publishToFacebook(account, currentPost);
      }
      throw new NonRetriableError(`Unsupported platform: ${platform}`);
    });

    // 7. Update DB with published status
    await step.run("mark-published", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          external_id: result.externalId,
          external_url: result.externalUrl,
        })
        .eq("id", postId);
      // Log activity
      await supabase.from("activity_logs").insert({
        client_id: clientId,
        owner_id: ownerId,
        action: "published",
        entity_type: "schedule_item",
        entity_id: postId,
        details: { platform, externalId: result.externalId },
      });
    });

    return { success: true, postId, ...result };
  }
);
```

Register in `src/app/api/inngest/route.ts`.

#### 2. Implement Instagram publishing in meta-client.ts
**File**: `src/lib/social/meta-client.ts`

Implement the full Instagram flow:

```typescript
export async function publishToInstagram(
  account: SocialAccountRow,
  post: ScheduleItemRow
): Promise<PublishResult> {
  const token = await getValidAccessToken(account);
  const igUserId = account.provider_account_id;

  // Determine media type based on format
  if (post.format === "carousel") {
    return publishCarousel(token, igUserId, post);
  } else if (post.format === "reel") {
    return publishReel(token, igUserId, post);
  } else if (post.format === "story") {
    return publishStory(token, igUserId, post);
  } else {
    return publishImagePost(token, igUserId, post);
  }
}

async function publishImagePost(token, igUserId, post): Promise<PublishResult> {
  const imageUrl = post.assets?.[0]?.url;
  if (!imageUrl) return { success: false, error: "No image URL" };

  // Step 1: Create container
  const container = await fetch(
    `https://graph.facebook.com/v25.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: post.caption,
        access_token: token,
      }),
    }
  ).then(r => r.json());

  if (container.error) {
    if (container.error.code === 4) { // rate limit
      return { success: false, rateLimited: true, retryAfterSeconds: 300 };
    }
    return { success: false, error: container.error.message };
  }

  // Step 2: Poll until FINISHED
  await pollUntilFinished(token, container.id);

  // Step 3: Publish
  const published = await fetch(
    `https://graph.facebook.com/v25.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: token,
      }),
    }
  ).then(r => r.json());

  if (published.error) return { success: false, error: published.error.message };

  return {
    success: true,
    externalId: published.id,
    externalUrl: `https://www.instagram.com/p/${published.id}/`,
  };
}
// Similar implementations for publishCarousel, publishReel, publishStory, publishToFacebook
```

#### 3. Update `acceptScheduleItem` to trigger Inngest
**File**: `src/app/(app)/dashboard/clients/actions.ts`

When accepting a post:
1. Check if the client has a connected social account for this platform
2. If yes and `scheduled_at` is in the future: set status to `scheduled`, fire `inngest.send({ name: "post/publish.scheduled", ... })`
3. If yes and `scheduled_at` is in the past: prompt user to either publish now or pick a new time
4. If no connected account: set status to `accepted` (current behavior — plan-only mode)

```typescript
export async function acceptScheduleItem(
  itemId: string,
  clientId: string,
  locale: ActionLocale
) {
  // ... existing auth + update logic ...

  // Check for connected social account
  const { data: accounts } = await supabase
    .from("client_social_accounts")
    .select("id, provider, token_status")
    .eq("client_id", clientId)
    .eq("provider", item.platform)
    .eq("token_status", "active");

  const hasActiveAccount = accounts && accounts.length > 0;
  const scheduledAt = new Date(item.scheduled_at);
  const isInFuture = scheduledAt > new Date();

  if (hasActiveAccount && isInFuture) {
    // Schedule for publishing
    await supabase
      .from("client_schedule_items")
      .update({
        status: "scheduled",
        social_account_id: accounts[0].id,
      })
      .eq("id", itemId);

    await inngest.send({
      name: "post/publish.scheduled",
      data: {
        postId: itemId,
        clientId,
        ownerId: user.id,
        platform: item.platform,
        scheduledAt: item.scheduled_at,
        socialAccountId: accounts[0].id,
      },
    });

    return { success: "scheduled", item: updatedItem };
  }

  // No account or past date — just accept (plan-only mode)
  await supabase
    .from("client_schedule_items")
    .update({ status: "accepted" })
    .eq("id", itemId);

  return { success: "accepted", item: updatedItem };
}
```

#### 4. Add "Publish Now" action for past-dated accepted posts
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New server action `publishScheduleItemNow` for posts where `scheduled_at` is in the past but user wants to publish immediately.

#### 5. Add cancel scheduling action
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New server action `cancelScheduledPost` that sets status back to `accepted` and `publish_job_id = null`. The Inngest function will detect the cancellation in its re-validate step.

#### 6. Update the post editor modal with publishing controls
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

In the Overview tab, add:
- If `status === "scheduled"`: show "Scheduled for [date]" badge + "Cancel scheduling" button
- If `status === "published"`: show "Published on [date]" badge + link to external post
- If `status === "failed"`: show error message + "Retry publish" button
- If `status === "accepted"` and no social account connected: show "Connect [platform] to enable publishing" link

#### 7. Update schedule review modal
**File**: `src/components/clients/client-schedule-modal.tsx`

When accepting posts:
- If social account exists: accept button says "Accept & Schedule"
- Show a summary after accepting all: "X posts scheduled for publishing, Y posts accepted (no [platform] account connected)"

### Success Criteria

#### Automated Verification
- [x] `npm run build` passes (pre-existing TS error unrelated to Phase 3)
- [x] `npm run lint` passes (pre-existing any errors in unchanged code; new files clean)
- [ ] Inngest dev dashboard shows `publish-scheduled-post` function

#### Manual Verification
- [ ] Connect Instagram test account → accept a post with future `scheduled_at` → status becomes "scheduled"
- [ ] Wait for `scheduled_at` → post publishes to Instagram → status becomes "published"
- [ ] Cancel a scheduled post → status reverts to "accepted"
- [ ] Accept a post without connected account → status stays "accepted" (plan-only)
- [ ] Post with past `scheduled_at` + connected account → "Publish Now" option appears
- [ ] Failed publish → error message shown → "Retry publish" button works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 4: Publishing Engine — TikTok

### Overview
Add TikTok video publishing to the same Inngest pipeline.

### Changes Required

#### 1. Implement TikTok publishing in tiktok-client.ts
**File**: `src/lib/social/tiktok-client.ts`

Implement the full TikTok flow:

```typescript
export async function publishToTikTok(
  account: SocialAccountRow,
  post: ScheduleItemRow
): Promise<PublishResult> {
  const token = await getValidAccessToken(account);

  // 1. Query creator info for privacy levels
  const creatorInfo = await queryCreatorInfo(token);

  // 2. Get video URL from assets
  const videoAsset = post.assets?.find(a => a.type === "video");
  if (!videoAsset?.url) {
    return { success: false, error: "No video asset found for TikTok post" };
  }

  // 3. Initialize upload (URL-based for Supabase Storage URLs)
  const initResult = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: `${post.caption?.slice(0, 150) || post.title}`,
          privacy_level: creatorInfo.privacy_level_options.includes("PUBLIC_TO_EVERYONE")
            ? "PUBLIC_TO_EVERYONE"
            : creatorInfo.privacy_level_options[0],
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: videoAsset.url,
        },
      }),
    }
  ).then(r => r.json());

  if (initResult.error?.code !== "ok") {
    if (initResult.error?.code === "rate_limit_exceeded") {
      return { success: false, rateLimited: true, retryAfterSeconds: 60 };
    }
    return { success: false, error: initResult.error?.message || "TikTok init failed" };
  }

  // 4. Poll until published
  const publishId = initResult.data.publish_id;
  const statusResult = await pollTikTokStatus(token, publishId);

  if (statusResult.status === "FAILED") {
    return { success: false, error: statusResult.fail_reason || "TikTok publish failed" };
  }

  return {
    success: true,
    externalId: statusResult.publicaly_available_post_id?.[0] || publishId,
    externalUrl: statusResult.publicaly_available_post_id?.[0]
      ? `https://www.tiktok.com/@${account.username}/video/${statusResult.publicaly_available_post_id[0]}`
      : undefined,
  };
}
```

#### 2. Add TikTok to the publish router
**File**: `src/inngest/functions/publish-post.ts`

In the "publish" step, add TikTok:
```typescript
if (platform === "tiktok") {
  return await publishToTikTok(account, currentPost);
}
```

#### 3. Handle TikTok-specific asset requirements
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

When platform is TikTok and status is `accepted`:
- Validate that at least one video asset exists before allowing scheduling
- Show a warning if no video is uploaded: "TikTok requires a video. Upload one in the Assets tab."

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Connect TikTok test account → accept a post with video asset → publishes to TikTok
- [ ] TikTok post without video → shows clear error message
- [ ] Token refresh works (wait > 24h or trigger manually)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 5: Media Library

### Overview
Build the centralized per-client media library with upload, browse, tag, and folder functionality. Integrate it into the post editor so users can select existing assets instead of always uploading new ones.

### Changes Required

#### 1. Create media library server actions
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New actions:
- `uploadMediaAsset(clientId, locale, file, metadata)` — upload to Supabase Storage, create `client_media_assets` row
- `deleteMediaAsset(assetId, clientId, locale)` — delete from storage + DB
- `updateMediaAsset(assetId, clientId, locale, updates)` — update name, tags, folder
- `getMediaAssets(clientId, folder?, tags?)` — fetch with filters
- `createMediaFolder(clientId, folderName)` — not a DB entity, just a string value on assets

#### 2. Create media library component
**File**: Create `src/components/clients/client-media-library.tsx`

Full-featured media library UI:
- Grid view of assets with thumbnails
- Folder sidebar (derived from distinct `folder` values)
- Upload dropzone (drag & drop + click to upload)
- Multi-select for bulk operations (delete, move, tag)
- Search by name/description/tags
- Filter by file type (image/video)
- Asset detail panel (click to see full info, edit name/tags)
- "Used in X posts" counter per asset

#### 3. Build the media library page
**File**: `src/app/(app)/dashboard/clients/[id]/media/page.tsx`

Replace the "Coming soon" placeholder with the full media library page:
- Server Component that fetches `client_media_assets` for the client
- Passes data to `<ClientMediaLibrary>` component
- Page header with upload button

#### 4. Integrate media library into post editor
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

In the Assets tab, add a "Browse Library" button next to the existing upload input. When clicked:
- Open a media picker modal showing the client's media library
- Allow selecting one or multiple assets
- On select, update the post's `assets` JSONB with the selected media URLs
- When uploading new assets in the editor, also save them to the media library automatically

#### 5. Auto-save generated/uploaded assets to media library
**File**: `src/app/(app)/dashboard/clients/actions.ts`

When `generateScheduleItemAssetImage` or `updateScheduleItemAssetUrl` is called, also insert a row into `client_media_assets` so the asset appears in the library for reuse.

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Upload an image to the media library → appears in the grid
- [ ] Create folders, move assets between them
- [ ] Tag assets, search by tag
- [ ] Open post editor → Assets tab → "Browse Library" → select asset → appears on post
- [ ] Generate an AI image for a post → it also appears in the media library
- [ ] Upload a new image in the post editor → it also appears in the media library
- [ ] "Used in X posts" counter updates when assets are assigned to posts

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 6: Analytics & Insights + Feed Preview + Activity Logs

### Overview
Pull engagement metrics from Meta and TikTok, build the feed preview, and implement activity logging.

### Changes Required

#### 1. Create analytics fetch Inngest function
**File**: Create `src/inngest/functions/fetch-analytics.ts`

```typescript
// Runs every 6 hours, fetches metrics for all published posts from the last 30 days
export const fetchPostAnalytics = inngest.createFunction(
  { id: "fetch-post-analytics" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    // 1. Query client_schedule_items where status = 'published'
    //    AND published_at > now() - 30 days
    // 2. Group by social_account_id
    // 3. For each account:
    //    - Meta: GET /{media-id}/insights?metric=impressions,reach,engagement,saved,shares
    //    - TikTok: GET /v2/video/list/ with engagement fields
    // 4. Upsert into post_analytics table
  }
);
```

Register in `src/app/api/inngest/route.ts`.

#### 2. Add analytics to post editor modal
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

Add a new tab "Analytics" (6th tab) that shows:
- Only visible when `status === "published"`
- Impressions, reach, engagement, likes, comments, shares, saves
- Simple bar chart or stat cards
- "Last updated: [fetched_at]"
- "Refresh" button to trigger on-demand fetch

#### 3. Create on-demand analytics fetch action
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New action `fetchPostAnalyticsOnDemand(itemId, clientId, locale)` that:
- Gets the post's `external_id` and `social_account_id`
- Calls the appropriate platform API
- Upserts into `post_analytics`
- Returns the latest metrics

#### 4. Build feed preview page
**File**: `src/app/(app)/dashboard/clients/[id]/feed/page.tsx`

Replace placeholder with a visual Instagram grid preview:
- Server Component fetching all `client_schedule_items` for Instagram, ordered by `scheduled_at DESC`
- 3-column grid mimicking Instagram profile layout
- Each cell shows the first asset's thumbnail
- Click opens the post detail
- Filter by status (all, published, scheduled, suggested)
- Drag to reorder (updates `scheduled_at` order)

**File**: Create `src/components/clients/client-feed-preview.tsx`

The grid component with:
- 3×N grid layout matching Instagram's profile view
- Aspect ratio 1:1 crop for thumbnails
- Status indicator overlay (green check for published, clock for scheduled, etc.)
- Hover to see caption preview

#### 5. Build activity logs page
**File**: `src/app/(app)/dashboard/clients/[id]/logs/page.tsx`

Replace placeholder with activity log:
- Server Component fetching from `activity_logs` for the client
- Chronological list with filters (action type, date range)
- Each entry: "[Action] on [entity] at [time]"

**File**: Create `src/components/clients/client-activity-logs.tsx`

Table/list component with:
- Action type icons (publish, accept, retry, boost, etc.)
- Entity links (click to navigate to the post)
- Time display with relative formatting ("2 hours ago")
- Pagination (load more)

#### 6. Add activity logging throughout the app
**File**: `src/app/(app)/dashboard/clients/actions.ts`

Add `activity_logs` inserts to key actions:
- `acceptScheduleItem` → "accepted"
- `retryScheduleItem` → "retried"
- `deleteScheduleItem` → "deleted"
- `createScheduleItemManual` → "created_manual"
- `createScheduleItemWithAI` → "created_ai"
- `updateScheduleItemText` → "edited_text"
- `disconnectClientSocialAccount` → "disconnected_account"
- Publishing success/failure → handled in Inngest functions

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Published Instagram post → Analytics tab shows impressions, reach, engagement
- [ ] Published TikTok post → Analytics tab shows views, likes, comments
- [ ] Feed preview shows Instagram grid correctly
- [ ] Activity logs show full history of actions
- [ ] Analytics auto-refresh via Inngest cron (check after 6h or trigger manually)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 7: Post Boosting + Budget + Audiences + Suggestions

### Overview
Enable agencies to boost published posts, manage ad budgets, save target audiences, and get AI-powered content suggestions.

### Changes Required

#### 1. Create boost action
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New action `boostPost(itemId, clientId, locale, params)`:
- Validates post is `published` and has `external_id`
- Creates Meta Marketing API hierarchy:
  1. Campaign (objective: POST_ENGAGEMENT)
  2. Ad Set (budget, targeting, dates)
  3. Ad Creative (from `object_story_id`)
  4. Ad (links creative to ad set)
- Stores IDs in `ad_campaigns` table
- Logs activity

#### 2. Create boost UI in post editor
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

Add "Boost" button in the Overview tab (visible only for `status === "published"` + Instagram/Facebook):
- Opens a boost configuration panel:
  - Daily budget input (with currency)
  - Start/end date pickers
  - Audience selector (from saved audiences or manual targeting)
  - Preview estimated reach (if available from Meta API)
- "Launch Boost" button → calls `boostPost` action

#### 3. Build budget page
**File**: `src/app/(app)/dashboard/clients/[id]/budget/page.tsx`

Replace placeholder with budget dashboard:
- Total spend across all campaigns
- Per-campaign breakdown (name, status, spend, results)
- Monthly budget limit setting
- Spend trend chart

**File**: Create `src/components/clients/client-budget-dashboard.tsx`

Dashboard component with:
- Summary cards: total spend, active campaigns, budget remaining
- Campaign list with status, budget, actual spend, results (reach, engagement)
- Simple chart (could use recharts or a lightweight lib)

#### 4. Build audiences page
**File**: `src/app/(app)/dashboard/clients/[id]/audiences/page.tsx`

Replace placeholder with audience management:
- List of saved audiences
- Create new audience form (name, description, targeting criteria)
- Targeting builder: locations, age range, interests, gender

**File**: Create `src/components/clients/client-audiences.tsx`

Audience CRUD component:
- Audience cards with name, description, targeting summary, "Used in X campaigns"
- Create/edit modal with targeting form
- Delete with confirmation

#### 5. Build suggestions page
**File**: `src/app/(app)/dashboard/clients/[id]/suggestions/page.tsx`

Replace placeholder with AI-powered suggestions:
- Based on analytics data: "Your reels get 3x more engagement — try more reels"
- Based on competitor insights: "Competitor X is posting about [topic] — consider creating content about it"
- Based on posting patterns: "You haven't posted on Wednesdays — optimal posting times suggest Wed 6pm"
- Based on trending topics: show relevant trending topics from `trending-topics.ts`

**File**: Create `src/components/clients/client-suggestions.tsx`

Suggestions component:
- Card-based layout with suggestion type icons
- "Apply" button that navigates to relevant action (e.g., create a reel, schedule for Wednesday)
- Refresh button to regenerate suggestions

#### 6. Create suggestions generation action
**File**: `src/app/(app)/dashboard/clients/actions.ts`

New action `generateSuggestions(clientId, locale)`:
- Fetches recent analytics, competitor insights, posting patterns
- Calls OpenAI with a prompt to generate actionable suggestions
- Returns structured suggestion objects

#### 7. Build API docs page
**File**: `src/app/(app)/dashboard/clients/[id]/api-docs/page.tsx`

Replace placeholder with API reference for the client:
- Document the available server actions as an internal API reference
- Show webhook endpoints (for future use)
- Integration guide for connecting external tools

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Boost a published Instagram post → ad appears in Meta Ads Manager
- [ ] Budget page shows campaign spend
- [ ] Create a saved audience → use it in a boost → targeting applied correctly
- [ ] Suggestions page shows relevant, actionable suggestions based on real data
- [ ] API docs page renders reference documentation

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Testing Strategy

### Integration Tests (Manual)
1. **Full publish pipeline**: Generate schedule → accept post → verify it transitions to `scheduled` → wait for `scheduled_at` → verify it publishes to Instagram → verify analytics appear after 6h
2. **Token refresh**: Connect account → wait for token to approach expiry → verify Inngest refreshes it → verify publishing still works
3. **Cancel flow**: Schedule a post → cancel it before `scheduled_at` → verify it reverts to `accepted` and Inngest job exits gracefully
4. **Media library round-trip**: Upload to media library → create post → select media from library → publish → verify correct media on platform
5. **Boost flow**: Publish post → boost it → verify campaign in Meta Ads Manager → check budget tracking

### Edge Cases
- Accept post with no connected account → stays `accepted`, no Inngest job
- Post with `scheduled_at` in the past → "Publish Now" option, not `sleepUntil`
- Token expires between scheduling and publishing → `onFailure` marks as `failed`, user prompted to reconnect
- TikTok post without video → clear error before scheduling
- Rate limit hit during publishing → `RetryAfterError` with backoff
- User deletes post while Inngest is sleeping → `NonRetriableError` in re-validate step
- Drag-drop a scheduled post to new time → cancel old job, create new one

## Performance Considerations

- **Inngest free tier**: 50K step executions/month. Each publish is ~7 steps. Budget for ~7K publishes/month on free tier.
- **Inngest 7-day sleep limit on free tier**: Posts scheduled >7 days ahead need Pro ($75/month). Consider a cron-based approach as fallback: scan for posts where `status = 'scheduled' AND scheduled_at < now() + 5 min`, publish them. This avoids the sleep limit entirely.
- **Meta rate limit**: 100 posts/24h/account. For agencies with many clients, implement per-account rate tracking.
- **TikTok rate limit**: 6 publishes/min. Queue TikTok posts with minimum 10-second spacing.
- **Analytics polling**: Every 6 hours for 30-day window. For 100 published posts, that's 100 API calls per cycle. Meta allows ~200 calls per hour per token.
- **Supabase admin client**: Bypasses RLS. All queries must explicitly filter by `client_id` and/or `owner_id` to prevent data leaks.

## Migration Notes

New migrations (run in order):
1. `32_schedule_items_publishing.sql` — publishing columns on schedule items
2. `33_client_media_assets.sql` — media library table
3. `34_post_analytics.sql` — analytics storage
4. `35_activity_logs.sql` — activity logging
5. `36_ad_campaigns.sql` — ad campaigns/boosts
6. `37_saved_audiences.sql` — audience targeting presets
7. `38_social_accounts_refresh_expiry.sql` — token management columns

All migrations are additive (new columns, new tables). No existing data is modified. Backward compatible.

New environment variables:
- `SUPABASE_SERVICE_ROLE_KEY` — for Inngest background jobs
- `INNGEST_DEV=1` — for local development
- `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` — for production (set via Vercel integration)

New npm packages:
- `inngest` — background job processing

## Cron-Based Alternative to Inngest Sleep (Recommended)

Given the 7-day sleep limit on Inngest's free tier, a more robust approach:

Instead of `step.sleepUntil(scheduledAt)` per post, use a **single cron function** that runs every minute:

```typescript
export const publishDuePosts = inngest.createFunction(
  { id: "publish-due-posts" },
  { cron: "* * * * *" }, // every minute
  async ({ step }) => {
    const posts = await step.run("find-due-posts", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("client_schedule_items")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);
      return data || [];
    });

    // Fan out: one event per post for parallel processing
    if (posts.length > 0) {
      await step.sendEvent(
        "dispatch-publishes",
        posts.map((post) => ({
          name: "post/publish.execute",
          data: { postId: post.id, ... },
        }))
      );
    }
  }
);
```

This avoids the sleep limit entirely, works on the free tier, and handles posts scheduled any time in the future.

## References

- Strategy pipeline plan: `thoughts/shared/plans/2026-04-06-strategy-to-posts-pipeline-overhaul.md`
- OAuth flow: `src/app/api/oauth/[provider]/start/route.ts`, `callback/route.ts`
- Social accounts table: `supabase/scripts/21_client_social_accounts.sql`
- Schedule items table: `supabase/scripts/16_client_schedule_items.sql`
- Post editor: `src/components/clients/schedule-post-editor-modal.tsx`
- Calendar: `src/components/clients/client-calendar.tsx`
- Server actions: `src/app/(app)/dashboard/clients/actions.ts`
- Integrations UI: `src/components/clients/client-integrations.tsx`
- Meta Graph API docs: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- TikTok Content API docs: https://developers.tiktok.com/doc/content-posting-api-get-started
- Inngest docs: https://www.inngest.com/docs/getting-started/nextjs-quick-start
