import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getValidAccessToken as getMetaToken, getMediaInsights } from "@/lib/social/meta-client";
import { getValidAccessToken as getTikTokToken, getVideoInsights } from "@/lib/social/tiktok-client";
import type { SocialAccountRow } from "@/lib/social/types";

export const fetchPostAnalytics = inngest.createFunction(
  { id: "fetch-post-analytics", concurrency: { limit: 1 } },
  { cron: "0 */6 * * *" },
  async () => {
    const supabase = createAdminClient();

    // Fetch published posts with external IDs from the last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts, error: postsErr } = await supabase
      .from("client_schedule_items")
      .select("id, client_id, platform, external_id, social_account_id")
      .eq("status", "published")
      .not("external_id", "is", null)
      .gte("published_at", cutoff);

    if (postsErr || !posts || posts.length === 0) return { fetched: 0 };

    let fetched = 0;

    for (const post of posts) {
      try {
        if (!post.external_id || !post.social_account_id) continue;

        // Load the social account for token
        const { data: account } = await supabase
          .from("client_social_accounts")
          .select("*")
          .eq("id", post.social_account_id)
          .single<SocialAccountRow>();
        if (!account) continue;

        const platform = String(post.platform).toLowerCase();
        let insights: Record<string, number> = {};

        if (platform === "instagram" || platform === "facebook") {
          const token = await getMetaToken(account);
          insights = await getMediaInsights(token, post.external_id);
        } else if (platform === "tiktok") {
          const token = await getTikTokToken(account);
          insights = await getVideoInsights(token, post.external_id);
        } else {
          continue;
        }

        // Get current user (owner) of the client
        const { data: client } = await supabase
          .from("clients")
          .select("owner_id")
          .eq("id", post.client_id)
          .single<{ owner_id: string }>();
        if (!client) continue;

        await supabase.from("post_analytics").upsert(
          {
            schedule_item_id: post.id,
            client_id: post.client_id,
            owner_id: client.owner_id,
            impressions: insights.impressions ?? null,
            reach: insights.reach ?? null,
            engagement: insights.engagement ?? null,
            likes: insights.likes ?? null,
            comments: insights.comments ?? null,
            shares: insights.shares ?? null,
            saves: insights.saves ?? null,
            video_views: insights.video_views ?? null,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "schedule_item_id" }
        );
        fetched++;
      } catch {
        // best-effort per post, don't fail the whole run
      }
    }

    return { fetched };
  }
);
