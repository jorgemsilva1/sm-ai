import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { codeChallengeS256, generateCodeVerifier, generateState } from "@/lib/oauth/pkce";

export const runtime = "nodejs";

const PROVIDERS = ["instagram", "facebook", "tiktok", "linkedin", "youtube", "x"] as const;
type Provider = (typeof PROVIDERS)[number];

function assertProvider(value: string): Provider | null {
  const v = value.toLowerCase();
  return (PROVIDERS as readonly string[]).includes(v) ? (v as Provider) : null;
}

function getOAuthConfig(provider: Provider) {
  switch (provider) {
    case "instagram":
    case "facebook":
      return {
        authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
        clientId: process.env.META_APP_ID || "",
        scopes:
          provider === "instagram"
            ? [
                "instagram_basic",
                "pages_show_list",
                "pages_read_engagement",
                "instagram_manage_insights",
              ]
            : ["pages_show_list", "pages_read_engagement"],
      };
    case "tiktok":
      return {
        authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
        clientId: process.env.TIKTOK_CLIENT_KEY || "",
        scopes: ["user.info.basic", "video.list"],
      };
    case "linkedin":
      return {
        authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
        clientId: process.env.LINKEDIN_CLIENT_ID || "",
        scopes: ["openid", "profile", "email"],
      };
    case "youtube":
      return {
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        scopes: ["openid", "profile", "email", "https://www.googleapis.com/auth/youtube.readonly"],
      };
    case "x":
      return {
        authorizeUrl: "https://twitter.com/i/oauth2/authorize",
        clientId: process.env.X_CLIENT_ID || process.env.TWITTER_CLIENT_ID || "",
        scopes: ["tweet.read", "users.read", "offline.access"],
      };
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
  const clientId = String(url.searchParams.get("clientId") || "").trim();
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Validate ownership
  const { data: client } = await supabase
    .from("clients")
    .select("id, owner_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client || client.owner_id !== user.id) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/oauth/${provider}/callback`;

  const cfg = getOAuthConfig(provider);
  if (!cfg.clientId) {
    return NextResponse.json(
      { error: `Missing OAuth env for ${provider}.` },
      { status: 400 }
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeS256(codeVerifier);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error: insertError } = await supabase.from("client_oauth_states").insert({
    client_id: clientId,
    owner_id: user.id,
    provider,
    state,
    code_verifier: codeVerifier,
    expires_at: expiresAt,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  const authUrl = new URL(cfg.authorizeUrl);
  authUrl.searchParams.set("client_id", cfg.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", cfg.scopes.join(provider === "tiktok" ? "," : " "));
  authUrl.searchParams.set("response_type", "code");

  // PKCE
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  // Provider quirks
  if (provider === "youtube") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }

  return NextResponse.redirect(authUrl.toString());
}

