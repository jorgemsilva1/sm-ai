import { createAdminClient } from "@/lib/supabase/admin";
import type { PublishResult, PostInsights, SocialAccountRow, ScheduleItemForPublish } from "./types";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

// --- Token management ---

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number }> {
  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = await res.json();
  if (!res.ok || json.error?.code !== "ok") {
    throw new Error(json.error?.message || "Failed to refresh TikTok token");
  }
  const data = json.data ?? json;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
  };
}

/**
 * Lazy refresh: checks expires_at, refreshes if needed, returns valid token.
 */
export async function getValidAccessToken(account: SocialAccountRow): Promise<string> {
  if (!account.access_token) throw new Error("No TikTok access token stored");

  const expiresAt = account.expires_at ? new Date(account.expires_at) : null;
  const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);

  if (expiresAt && expiresAt < sixHoursFromNow && account.refresh_token) {
    const refreshed = await refreshAccessToken(account.refresh_token);
    const supabase = createAdminClient();
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
    return refreshed.accessToken;
  }

  return account.access_token;
}

// --- Creator info ---

type CreatorInfo = {
  privacy_level_options: string[];
  max_video_post_duration_sec: number;
};

export async function queryCreatorInfo(token: string): Promise<CreatorInfo> {
  const res = await fetch(`${TIKTOK_API}/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  const data = json.data ?? {};
  return {
    privacy_level_options: data.privacy_level_options ?? ["PUBLIC_TO_EVERYONE"],
    max_video_post_duration_sec: data.max_video_post_duration_sec ?? 600,
  };
}

// --- Publishing ---

async function pollTikTokStatus(
  token: string,
  publishId: string
): Promise<{ status: string; fail_reason?: string; publicaly_available_post_id?: string[] }> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const json = await res.json();
    const data = json.data ?? {};
    if (data.status === "PUBLISH_COMPLETE" || data.status === "FAILED") {
      return { status: data.status, fail_reason: data.fail_reason, publicaly_available_post_id: data.publicaly_available_post_id };
    }
  }
  throw new Error("Timed out waiting for TikTok publish to complete");
}

export async function publishToTikTok(
  account: SocialAccountRow,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const token = await getValidAccessToken(account);
  const creatorInfo = await queryCreatorInfo(token);

  const videoAsset = (post.assets as Array<{ url: string; type: string }> | null)?.find(
    (a) => a.type === "video"
  );
  if (!videoAsset?.url) {
    return { success: false, error: "No video asset found for TikTok post" };
  }

  const privacyLevel = creatorInfo.privacy_level_options.includes("PUBLIC_TO_EVERYONE")
    ? "PUBLIC_TO_EVERYONE"
    : creatorInfo.privacy_level_options[0];

  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: post.caption?.slice(0, 150) || post.title,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_stitch: false,
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoAsset.url,
      },
    }),
  });
  const initJson = await initRes.json();

  if (initJson.error?.code !== "ok") {
    if (initJson.error?.code === "rate_limit_exceeded") {
      return { success: false, rateLimited: true, retryAfterSeconds: 60 };
    }
    return { success: false, error: initJson.error?.message || "TikTok publish init failed" };
  }

  const publishId = initJson.data.publish_id;
  const statusResult = await pollTikTokStatus(token, publishId);

  if (statusResult.status === "FAILED") {
    return { success: false, error: statusResult.fail_reason || "TikTok publish failed" };
  }

  const postId = statusResult.publicaly_available_post_id?.[0] || publishId;
  return {
    success: true,
    externalId: postId,
    externalUrl: statusResult.publicaly_available_post_id?.[0]
      ? `https://www.tiktok.com/@${account.username}/video/${postId}`
      : undefined,
  };
}

// --- Analytics ---

export async function getVideoInsights(token: string, videoId: string): Promise<PostInsights> {
  const res = await fetch(
    `${TIKTOK_API}/video/query/?fields=id,like_count,comment_count,share_count,view_count`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    }
  );
  const json = await res.json();
  const video = json.data?.videos?.[0] ?? {};
  return {
    impressions: 0,
    reach: 0,
    engagement: (video.like_count ?? 0) + (video.comment_count ?? 0) + (video.share_count ?? 0),
    likes: video.like_count ?? 0,
    comments: video.comment_count ?? 0,
    shares: video.share_count ?? 0,
    saves: 0,
    videoViews: video.view_count ?? 0,
    clicks: 0,
  };
}
