import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PROVIDERS = ["instagram", "facebook", "tiktok", "linkedin", "youtube", "x"] as const;
type Provider = (typeof PROVIDERS)[number];

function assertProvider(value: string): Provider | null {
  const v = value.toLowerCase();
  return (PROVIDERS as readonly string[]).includes(v) ? (v as Provider) : null;
}

function tokenConfig(provider: Provider) {
  switch (provider) {
    case "instagram":
    case "facebook":
      return {
        tokenUrl: "https://graph.facebook.com/v25.0/oauth/access_token",
        clientId: process.env.META_APP_ID || "",
        clientSecret: process.env.META_APP_SECRET || "",
      };
    case "tiktok":
      return {
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        clientId: process.env.TIKTOK_CLIENT_KEY || "",
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
      };
    case "linkedin":
      return {
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        clientId: process.env.LINKEDIN_CLIENT_ID || "",
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
      };
    case "youtube":
      return {
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      };
    case "x":
      return {
        tokenUrl: "https://api.twitter.com/2/oauth2/token",
        clientId: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "",
        clientSecret: process.env.X_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET || "",
      };
  }
}

async function fetchProfile(provider: Provider, accessToken: string) {
  try {
    if (provider === "instagram") {
      // Fetch pages with linked Instagram Business Accounts
      const res = await fetch(
        `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const json = await res.json() as { data?: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string } }> };
      const page = json.data?.[0];
      if (!page?.instagram_business_account?.id) return null;
      return {
        provider_account_id: page.instagram_business_account.id,
        display_name: page.name ?? null,
        _page_id: page.id,
        _page_access_token: page.access_token,
      };
    }
    if (provider === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/v25.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { id?: string; name?: string };
      return { provider_account_id: json.id ?? null, display_name: json.name ?? null };
    }
    if (provider === "tiktok") {
      const res = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const user = json?.data?.user ?? {};
      return {
        provider_account_id: user.open_id ?? null,
        display_name: user.display_name ?? null,
        avatar_url: user.avatar_url ?? null,
      };
    }
    if (provider === "linkedin") {
      const res = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { sub?: string; name?: string; picture?: string; email?: string };
      return {
        provider_account_id: json.sub ?? null,
        display_name: json.name ?? null,
        avatar_url: json.picture ?? null,
        metadata: json.email ? { email: json.email } : {},
      };
    }
    if (provider === "youtube") {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { sub?: string; name?: string; picture?: string; email?: string };
      return {
        provider_account_id: json.sub ?? null,
        display_name: json.name ?? null,
        avatar_url: json.picture ?? null,
        metadata: json.email ? { email: json.email } : {},
      };
    }
    if (provider === "x") {
      const res = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const json = await res.json();
      const data = json?.data ?? {};
      return { provider_account_id: data.id ?? null, display_name: data.name ?? null, username: data.username ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await ctx.params;
  const provider = assertProvider(rawProvider);
  if (!provider) return NextResponse.json({ error: "Invalid provider" }, { status: 400 });

  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "");
  const state = String(url.searchParams.get("state") || "");
  const error = String(url.searchParams.get("error") || "");

  const origin = new URL(request.url).origin;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard?oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard?oauth_error=missing_code_or_state`);
  }

  const { data: row } = await supabase
    .from("client_oauth_states")
    .select("id, client_id, owner_id, provider, code_verifier, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (!row || row.owner_id !== user.id || row.provider !== provider) {
    return NextResponse.redirect(`${origin}/dashboard?oauth_error=invalid_state`);
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabase.from("client_oauth_states").delete().eq("id", row.id);
    return NextResponse.redirect(`${origin}/dashboard/clients/${row.client_id}/integrations?oauth_error=state_expired`);
  }

  const redirectUri = `${origin}/api/oauth/${provider}/callback`;
  const cfg = tokenConfig(provider);
  if (!cfg.clientId || !cfg.clientSecret) {
    return NextResponse.redirect(`${origin}/dashboard/clients/${row.client_id}/integrations?oauth_error=missing_env`);
  }

  let tokenJson: any = null;
  try {
    if (provider === "tiktok") {
      const res = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: row.code_verifier,
        }),
      });
      tokenJson = await res.json();
      if (!res.ok) throw new Error(tokenJson?.message || "token_error");
      tokenJson = tokenJson?.data ?? tokenJson;
    } else if (provider === "x") {
      const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
      const res = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: cfg.clientId,
          redirect_uri: redirectUri,
          code_verifier: row.code_verifier,
        }),
      });
      tokenJson = await res.json();
      if (!res.ok) throw new Error(tokenJson?.error || "token_error");
    } else if (provider === "instagram" || provider === "facebook") {
      const tokenUrl = new URL(cfg.tokenUrl);
      tokenUrl.searchParams.set("client_id", cfg.clientId);
      tokenUrl.searchParams.set("client_secret", cfg.clientSecret);
      tokenUrl.searchParams.set("redirect_uri", redirectUri);
      tokenUrl.searchParams.set("code", code);
      const res = await fetch(tokenUrl.toString(), { cache: "no-store" });
      tokenJson = await res.json();
      if (!res.ok) throw new Error(tokenJson?.error?.message || "token_error");
    } else {
      const res = await fetch(cfg.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: row.code_verifier,
        }),
      });
      tokenJson = await res.json();
      if (!res.ok) throw new Error(tokenJson?.error_description || "token_error");
    }
  } catch (e: any) {
    await supabase.from("client_oauth_states").delete().eq("id", row.id);
    return NextResponse.redirect(
      `${origin}/dashboard/clients/${row.client_id}/integrations?oauth_error=${encodeURIComponent(
        e?.message || "token_error"
      )}`
    );
  }

  const accessToken: string = tokenJson.access_token || tokenJson.accessToken || "";
  const refreshToken: string | null = tokenJson.refresh_token || tokenJson.refreshToken || null;
  const expiresIn: number | null = tokenJson.expires_in ?? tokenJson.expiresIn ?? null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  const tokenType: string | null = tokenJson.token_type ?? tokenJson.tokenType ?? null;
  const scopeRaw: string = tokenJson.scope || tokenJson.scopes || "";
  const scopes = Array.isArray(scopeRaw)
    ? scopeRaw
    : String(scopeRaw)
        .split(/[ ,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const profile = await fetchProfile(provider, accessToken);

  // For Meta providers: exchange short-lived token for long-lived (60 days)
  let finalAccessToken = accessToken;
  let finalExpiresAt = expiresAt;
  let pageAccessToken: string | null = null;
  let pageId: string | null = null;
  let refreshExpiresAt: string | null = null;

  if (provider === "instagram" || provider === "facebook") {
    try {
      const appId = process.env.META_APP_ID || "";
      const appSecret = process.env.META_APP_SECRET || "";
      const llUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(accessToken)}`;
      const llRes = await fetch(llUrl, { cache: "no-store" });
      const llJson = await llRes.json();
      if (llRes.ok && llJson.access_token) {
        finalAccessToken = llJson.access_token;
        finalExpiresAt = llJson.expires_in
          ? new Date(Date.now() + llJson.expires_in * 1000).toISOString()
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
      }
    } catch {
      // Keep short-lived token if exchange fails
    }

    // For Instagram: page data is already in profile (fetched during fetchProfile)
    if (provider === "instagram" && profile) {
      const p = profile as { _page_id?: string; _page_access_token?: string };
      if (p._page_id) pageId = p._page_id;
      if (p._page_access_token) pageAccessToken = p._page_access_token;
    }

    // For Facebook: fetch Page Access Token (never expires)
    if (provider === "facebook" && profile?.provider_account_id) {
      try {
        const pageUrl = `https://graph.facebook.com/v25.0/${profile.provider_account_id}/accounts?access_token=${encodeURIComponent(finalAccessToken)}`;
        const pageRes = await fetch(pageUrl, { cache: "no-store" });
        const pageJson = await pageRes.json();
        if (pageRes.ok && pageJson.data?.[0]) {
          pageId = pageJson.data[0].id;
          pageAccessToken = pageJson.data[0].access_token;
        }
      } catch {
        // Page token fetch is best-effort
      }
    }
  }

  // For TikTok: store refresh_expires_at (refresh tokens expire in 365 days)
  if (provider === "tiktok") {
    const tiktokRefreshExpiry = tokenJson.refresh_expires_in ?? 31536000; // 365 days default
    refreshExpiresAt = new Date(Date.now() + tiktokRefreshExpiry * 1000).toISOString();
  }

  await supabase.from("client_social_accounts").upsert({
    client_id: row.client_id,
    owner_id: user.id,
    provider,
    provider_account_id: profile?.provider_account_id ?? null,
    username: (profile as Record<string, unknown> | null)?.username as string | null ?? null,
    display_name: profile?.display_name ?? null,
    avatar_url: (profile as Record<string, unknown> | null)?.avatar_url as string | null ?? null,
    scopes,
    access_token: finalAccessToken || null,
    refresh_token: refreshToken,
    expires_at: finalExpiresAt,
    refresh_expires_at: refreshExpiresAt,
    page_access_token: pageAccessToken,
    page_id: pageId,
    token_type: tokenType,
    token_status: "active",
    metadata: (profile as Record<string, unknown> | null)?.metadata ?? {},
  });

  await supabase.from("client_oauth_states").delete().eq("id", row.id);

  return NextResponse.redirect(
    `${origin}/dashboard/clients/${row.client_id}/integrations?oauth_success=${provider}`
  );
}

