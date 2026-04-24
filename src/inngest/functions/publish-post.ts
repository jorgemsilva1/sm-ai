import { NonRetriableError, RetryAfterError } from "inngest";
import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishToInstagram, publishToFacebook } from "@/lib/social/meta-client";
import { publishToTikTok } from "@/lib/social/tiktok-client";
import type { SocialAccountRow, ScheduleItemForPublish } from "@/lib/social/types";

// Cron: runs every minute, fans out publish events for due posts.
// This avoids Inngest's 7-day sleep limit on the free tier.
export const publishDuePosts = inngest.createFunction(
  { id: "publish-due-posts" },
  { cron: "* * * * *" },
  async ({ step }) => {
    const posts = await step.run("find-due-posts", async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("client_schedule_items")
        .select("id, client_id, owner_id, platform, scheduled_at, social_account_id")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(10);
      return data ?? [];
    });

    if (posts.length > 0) {
      await step.sendEvent(
        "dispatch-publishes",
        posts.map((post) => ({
          name: "post/publish.execute" as const,
          data: {
            postId: post.id,
            clientId: post.client_id,
            ownerId: post.owner_id,
            platform: post.platform,
            socialAccountId: post.social_account_id,
          },
        }))
      );
    }

    return { dispatched: posts.length };
  }
);

// Handles a single post publish, triggered by post/publish.execute event.
export const publishScheduledPost = inngest.createFunction(
  {
    id: "publish-scheduled-post",
    retries: 5,
    onFailure: async ({ event, error }) => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({ status: "failed", failure_reason: error.message })
        .eq("id", event.data.event.data.postId);
      await supabase.from("activity_logs").insert({
        client_id: event.data.event.data.clientId,
        owner_id: event.data.event.data.ownerId,
        action: "publish_failed",
        entity_type: "schedule_item",
        entity_id: event.data.event.data.postId,
        details: { error: error.message, platform: event.data.event.data.platform },
      });
    },
  },
  { event: "post/publish.execute" },
  async ({ event, step }) => {
    const { postId, clientId, ownerId, platform, socialAccountId } = event.data;

    // 1. Validate post still exists and is scheduled
    const post = await step.run("validate-post", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("client_schedule_items")
        .select("id, status, platform, format, title, caption, assets, scheduled_at, social_account_id")
        .eq("id", postId)
        .single();
      if (error || !data) throw new NonRetriableError(`Post ${postId} not found`);
      if (data.status === "cancelled") throw new NonRetriableError("Post was cancelled");
      if (data.status === "published") throw new NonRetriableError("Post already published");
      if (data.status !== "scheduled") throw new NonRetriableError(`Unexpected status: ${data.status}`);
      return data;
    });

    // 2. Get social account with valid token
    const account = await step.run("get-account", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("id, client_id, owner_id, provider, provider_account_id, username, access_token, refresh_token, expires_at, refresh_expires_at, page_access_token, page_id, token_status, scopes")
        .eq("id", socialAccountId)
        .single();
      if (error || !data) throw new NonRetriableError("Social account not found or disconnected");
      if (data.token_status === "expired" || data.token_status === "revoked") {
        throw new NonRetriableError(`Token ${data.token_status} — reconnect required`);
      }
      return data as SocialAccountRow;
    });

    // 3. Set status to 'publishing'
    await step.run("set-publishing", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({ status: "publishing" })
        .eq("id", postId);
    });

    // 4. Publish to platform
    const result = await step.run("publish", async () => {
      const postForPublish: ScheduleItemForPublish = {
        id: post.id,
        platform: post.platform,
        format: post.format,
        title: post.title,
        caption: post.caption,
        assets: post.assets as ScheduleItemForPublish["assets"],
        scheduled_at: post.scheduled_at,
      };

      if (platform === "instagram") {
        return await publishToInstagram(account, postForPublish);
      }
      if (platform === "facebook") {
        return await publishToFacebook(account, postForPublish);
      }
      if (platform === "tiktok") {
        return await publishToTikTok(account, postForPublish);
      }
      throw new NonRetriableError(`Unsupported platform: ${platform}`);
    });

    if (!result.success) {
      if (result.rateLimited && result.retryAfterSeconds) {
        throw new RetryAfterError("Rate limited", result.retryAfterSeconds * 1000);
      }
      throw new Error(result.error ?? "Publish failed");
    }

    // 5. Mark published
    await step.run("mark-published", async () => {
      const supabase = createAdminClient();
      await supabase
        .from("client_schedule_items")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          external_id: result.externalId ?? null,
          external_url: result.externalUrl ?? null,
        })
        .eq("id", postId);
      await supabase.from("activity_logs").insert({
        client_id: clientId,
        owner_id: ownerId,
        action: "published",
        entity_type: "schedule_item",
        entity_id: postId,
        details: { platform, externalId: result.externalId },
      });
    });

    return { success: true, postId, externalId: result.externalId };
  }
);
