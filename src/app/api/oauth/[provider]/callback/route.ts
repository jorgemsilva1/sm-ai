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
        tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
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
    if (provider === "instagram" || provider === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
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

  await supabase.from("client_social_accounts").upsert({
    client_id: row.client_id,
    owner_id: user.id,
    provider,
    provider_account_id: profile?.provider_account_id ?? null,
    username: profile?.username ?? null,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    scopes,
    access_token: accessToken || null,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    token_type: tokenType,
    metadata: (profile as any)?.metadata ?? {},
  });

  await supabase.from("client_oauth_states").delete().eq("id", row.id);

  return NextResponse.redirect(
    `${origin}/dashboard/clients/${row.client_id}/integrations?oauth_success=${provider}`
  );
}

