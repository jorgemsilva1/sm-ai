import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshMetaLongLivedToken } from "@/lib/social/meta-client";
import { refreshAccessToken as refreshTikTokToken } from "@/lib/social/tiktok-client";

// Runs daily at 3am, refreshes Meta tokens expiring within 10 days
export const refreshMetaTokens = inngest.createFunction(
  { id: "refresh-meta-tokens" },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const accounts = await step.run("find-expiring-meta-accounts", async () => {
      const supabase = createAdminClient();
      const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("id, client_id, owner_id, access_token, expires_at")
        .in("provider", ["instagram", "facebook"])
        .eq("token_status", "active")
        .lt("expires_at", tenDaysFromNow)
        .not("access_token", "is", null);
      if (error) throw new Error(`Failed to query Meta accounts: ${error.message}`);
      return data ?? [];
    });

    const results = { refreshed: 0, failed: 0 };

    for (const account of accounts) {
      await step.run(`refresh-meta-${account.id}`, async () => {
        const supabase = createAdminClient();
        try {
          const { accessToken, expiresIn } = await refreshMetaLongLivedToken(account.access_token!);
          await supabase
            .from("client_social_accounts")
            .update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
              token_status: "active",
            })
            .eq("id", account.id);
          await supabase.from("activity_logs").insert({
            client_id: account.client_id,
            owner_id: account.owner_id,
            action: "token_refreshed",
            entity_type: "social_account",
            entity_id: account.id,
            details: { provider: "meta" },
          });
          results.refreshed++;
        } catch (err) {
          await supabase
            .from("client_social_accounts")
            .update({ token_status: "expired" })
            .eq("id", account.id);
          await supabase.from("activity_logs").insert({
            client_id: account.client_id,
            owner_id: account.owner_id,
            action: "token_refresh_failed",
            entity_type: "social_account",
            entity_id: account.id,
            details: { provider: "meta", error: err instanceof Error ? err.message : String(err) },
          });
          results.failed++;
        }
      });
    }

    return results;
  }
);

// Runs every 12 hours, refreshes TikTok tokens expiring within 6 hours
export const refreshTikTokTokens = inngest.createFunction(
  { id: "refresh-tiktok-tokens" },
  { cron: "0 */12 * * *" },
  async ({ step }) => {
    const accounts = await step.run("find-expiring-tiktok-accounts", async () => {
      const supabase = createAdminClient();
      const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("client_social_accounts")
        .select("id, client_id, owner_id, access_token, refresh_token, expires_at, refresh_expires_at")
        .eq("provider", "tiktok")
        .eq("token_status", "active")
        .lt("expires_at", sixHoursFromNow)
        .not("refresh_token", "is", null);
      if (error) throw new Error(`Failed to query TikTok accounts: ${error.message}`);
      return data ?? [];
    });

    const results = { refreshed: 0, failed: 0 };

    for (const account of accounts) {
      await step.run(`refresh-tiktok-${account.id}`, async () => {
        const supabase = createAdminClient();

        // Check refresh token hasn't expired
        if (account.refresh_expires_at && new Date(account.refresh_expires_at) < new Date()) {
          await supabase
            .from("client_social_accounts")
            .update({ token_status: "expired" })
            .eq("id", account.id);
          results.failed++;
          return;
        }

        try {
          const refreshed = await refreshTikTokToken(account.refresh_token!);
          await supabase
            .from("client_social_accounts")
            .update({
              access_token: refreshed.accessToken,
              refresh_token: refreshed.refreshToken,
              expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
              refresh_expires_at: new Date(Date.now() + refreshed.refreshExpiresIn * 1000).toISOString(),
              token_status: "active",
            })
            .eq("id", account.id);
          await supabase.from("activity_logs").insert({
            client_id: account.client_id,
            owner_id: account.owner_id,
            action: "token_refreshed",
            entity_type: "social_account",
            entity_id: account.id,
            details: { provider: "tiktok" },
          });
          results.refreshed++;
        } catch (err) {
          await supabase
            .from("client_social_accounts")
            .update({ token_status: "expired" })
            .eq("id", account.id);
          await supabase.from("activity_logs").insert({
            client_id: account.client_id,
            owner_id: account.owner_id,
            action: "token_refresh_failed",
            entity_type: "social_account",
            entity_id: account.id,
            details: { provider: "tiktok", error: err instanceof Error ? err.message : String(err) },
          });
          results.failed++;
        }
      });
    }

    return results;
  }
);
