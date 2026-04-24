import { createAdminClient } from "@/lib/supabase/admin";
import type { PublishResult, PostInsights, SocialAccountRow, ScheduleItemForPublish } from "./types";
import { META_GRAPH_URL as GRAPH_API } from "./config";

// --- Token management ---

export async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const url = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(shortToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || "Failed to exchange Meta token");
  return json.access_token;
}

export async function getPageAccessToken(
  longLivedToken: string,
  userId: string
): Promise<{ pageId: string; pageToken: string } | null> {
  const url = `${GRAPH_API}/${userId}/accounts?access_token=${encodeURIComponent(longLivedToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error || !json.data?.length) return null;
  const page = json.data[0];
  return { pageId: page.id, pageToken: page.access_token };
}

export async function refreshMetaLongLivedToken(currentToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const url = `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(currentToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || "Failed to refresh Meta token");
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

/**
 * Lazy refresh: checks expires_at, refreshes if needed, returns valid token.
 */
export async function getValidAccessToken(account: SocialAccountRow): Promise<string> {
  if (!account.access_token) throw new Error("No access token stored");

  const expiresAt = account.expires_at ? new Date(account.expires_at) : null;
  const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  if (expiresAt && expiresAt < tenDaysFromNow) {
    try {
      const { accessToken, expiresIn } = await refreshMetaLongLivedToken(account.access_token);
      const supabase = createAdminClient();
      await supabase
        .from("client_social_accounts")
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          token_status: "active",
        })
        .eq("id", account.id);
      return accessToken;
    } catch {
      // Return existing token and let the publish fail naturally if expired
    }
  }

  return account.access_token;
}

// --- Publishing ---

async function pollUntilFinished(token: string, containerId: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `${GRAPH_API}/${containerId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Container ${containerId} status: ${json.status_code}`);
    }
  }
  throw new Error("Timed out waiting for container to finish processing");
}

async function publishImagePost(
  token: string,
  igUserId: string,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const imageUrl = (post.assets as Array<{ url: string }> | null)?.[0]?.url;
  if (!imageUrl) return { success: false, error: "No image URL for Instagram post" };

  const createRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: post.caption, access_token: token }),
  });
  const container = await createRes.json();
  if (container.error) {
    if (container.error.code === 4) return { success: false, rateLimited: true, retryAfterSeconds: 300 };
    return { success: false, error: container.error.message };
  }

  await pollUntilFinished(token, container.id);

  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json();
  if (published.error) return { success: false, error: published.error.message };

  return {
    success: true,
    externalId: published.id,
    externalUrl: `https://www.instagram.com/p/${published.id}/`,
  };
}

async function publishCarousel(
  token: string,
  igUserId: string,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const assets = (post.assets as Array<{ url: string; type?: string }> | null) ?? [];
  if (!assets.length) return { success: false, error: "No assets for carousel" };

  // Create item containers
  const itemIds: string[] = [];
  for (const asset of assets.slice(0, 10)) {
    const isVideo = asset.type === "video";
    const body = isVideo
      ? { video_url: asset.url, media_type: "VIDEO", is_carousel_item: true, access_token: token }
      : { image_url: asset.url, is_carousel_item: true, access_token: token };
    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) return { success: false, error: json.error.message };
    await pollUntilFinished(token, json.id);
    itemIds.push(json.id);
  }

  // Create carousel container
  const carouselRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "CAROUSEL", caption: post.caption, children: itemIds, access_token: token }),
  });
  const carousel = await carouselRes.json();
  if (carousel.error) return { success: false, error: carousel.error.message };

  await pollUntilFinished(token, carousel.id);

  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carousel.id, access_token: token }),
  });
  const published = await publishRes.json();
  if (published.error) return { success: false, error: published.error.message };

  return {
    success: true,
    externalId: published.id,
    externalUrl: `https://www.instagram.com/p/${published.id}/`,
  };
}

async function publishReel(
  token: string,
  igUserId: string,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const videoUrl = (post.assets as Array<{ url: string; type?: string }> | null)?.find(
    (a) => a.type === "video"
  )?.url;
  if (!videoUrl) return { success: false, error: "No video asset for Reel" };

  const createRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "REELS", video_url: videoUrl, caption: post.caption, access_token: token }),
  });
  const container = await createRes.json();
  if (container.error) return { success: false, error: container.error.message };

  await pollUntilFinished(token, container.id);

  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json();
  if (published.error) return { success: false, error: published.error.message };

  return {
    success: true,
    externalId: published.id,
    externalUrl: `https://www.instagram.com/reel/${published.id}/`,
  };
}

async function publishStory(
  token: string,
  igUserId: string,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const asset = (post.assets as Array<{ url: string; type?: string }> | null)?.[0];
  if (!asset) return { success: false, error: "No asset for Story" };

  const isVideo = asset.type === "video";
  const body = isVideo
    ? { media_type: "STORIES", video_url: asset.url, access_token: token }
    : { media_type: "STORIES", image_url: asset.url, access_token: token };

  const createRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const container = await createRes.json();
  if (container.error) return { success: false, error: container.error.message };

  await pollUntilFinished(token, container.id);

  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: token }),
  });
  const published = await publishRes.json();
  if (published.error) return { success: false, error: published.error.message };

  return { success: true, externalId: published.id };
}

export async function publishToInstagram(
  account: SocialAccountRow,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const token = await getValidAccessToken(account);
  const igUserId = account.provider_account_id;
  if (!igUserId) return { success: false, error: "No Instagram user ID on account" };

  if (post.format === "carousel") return publishCarousel(token, igUserId, post);
  if (post.format === "reel") return publishReel(token, igUserId, post);
  if (post.format === "story") return publishStory(token, igUserId, post);
  return publishImagePost(token, igUserId, post);
}

export async function publishToFacebook(
  account: SocialAccountRow,
  post: ScheduleItemForPublish
): Promise<PublishResult> {
  const pageToken = account.page_access_token;
  const pageId = account.page_id;
  if (!pageToken || !pageId) return { success: false, error: "No Facebook page token or page ID" };

  const imageUrl = (post.assets as Array<{ url: string }> | null)?.[0]?.url;

  // Use /photos for image posts, /feed for text-only
  const endpoint = imageUrl ? `${GRAPH_API}/${pageId}/photos` : `${GRAPH_API}/${pageId}/feed`;
  const body: Record<string, string> = { access_token: pageToken };
  if (imageUrl) {
    body.url = imageUrl;
    body.caption = post.caption;
  } else {
    body.message = post.caption;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.code === 4) return { success: false, rateLimited: true, retryAfterSeconds: 300 };
    return { success: false, error: json.error.message };
  }

  const postId = json.post_id ?? json.id;
  return {
    success: true,
    externalId: postId,
    externalUrl: `https://www.facebook.com/${pageId}/posts/${postId?.split("_")[1] ?? postId}`,
  };
}

// --- Analytics ---

export async function getMediaInsights(
  token: string,
  mediaId: string
): Promise<PostInsights> {
  const metrics = "impressions,reach,engagement,saved,shares,likes,comments,video_views";
  const res = await fetch(
    `${GRAPH_API}/${mediaId}/insights?metric=${metrics}&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const data: Record<string, number> = {};
  for (const item of json.data ?? []) {
    data[item.name] = item.values?.[0]?.value ?? 0;
  }
  return {
    impressions: data.impressions ?? 0,
    reach: data.reach ?? 0,
    engagement: data.engagement ?? 0,
    likes: data.likes ?? 0,
    comments: data.comments ?? 0,
    shares: data.shares ?? 0,
    saves: data.saved ?? 0,
    videoViews: data.video_views ?? 0,
    clicks: 0,
  };
}
