import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

type ClientFeedPageProps = {
  params: Promise<{ id: string }>;
};

type FeedPost = {
  id: string;
  platform: string;
  format: string;
  title: string;
  caption: string;
  scheduled_at: string;
  status: string;
  assets: Array<{ url?: string | null; type: string; description: string }>;
};

const PLATFORMS = ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube"] as const;

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
};

const STATUS_BADGE: Record<string, { label: Record<string, string>; cls: string }> = {
  published: { label: { en: "Published", pt: "Publicado" }, cls: "bg-green-500/20 text-green-400" },
  scheduled: { label: { en: "Scheduled", pt: "Agendado" }, cls: "bg-blue-500/20 text-blue-400" },
  publishing: { label: { en: "Publishing", pt: "A publicar" }, cls: "bg-amber-500/20 text-amber-400" },
  failed: { label: { en: "Failed", pt: "Falhou" }, cls: "bg-destructive/20 text-destructive" },
  accepted: { label: { en: "Active", pt: "Ativo" }, cls: "bg-muted/60 text-foreground" },
  suggested: { label: { en: "Draft", pt: "Draft" }, cls: "bg-muted/40 text-muted-foreground" },
};

function PlatformGrid({
  platform,
  posts,
  clientName,
  avatarUrl,
  locale,
}: {
  platform: string;
  posts: FeedPost[];
  clientName: string;
  avatarUrl: string | null;
  locale: string;
}) {
  // Instagram-style 3-col grid, TikTok and others use same grid layout
  const isVertical = platform === "tiktok";

  return (
    <div className="space-y-3">
      {/* Platform header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted/60 border border-border/40 shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={clientName} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <div className="text-sm font-semibold">{clientName}</div>
          <div className="text-xs text-muted-foreground">
            {PLATFORM_LABELS[platform] ?? platform} · {posts.length} posts
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-md border border-border/40 bg-card/40">
          <p className="text-xs text-muted-foreground">
            {locale === "pt" ? "Sem posts" : "No posts"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((post) => {
            const assets = Array.isArray(post.assets) ? post.assets : [];
            const firstUrl = assets[0]?.url;
            const badge = STATUS_BADGE[post.status];

            return (
              <div
                key={post.id}
                className={`group relative overflow-hidden bg-muted/40 ${
                  isVertical ? "aspect-[9/16]" : "aspect-square"
                }`}
              >
                {firstUrl ? (
                  <img
                    src={firstUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/60 p-1 text-center">
                    {post.format}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-start justify-end bg-black/60 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {badge ? (
                    <span className={`mb-0.5 rounded px-1 py-0.5 text-[9px] font-medium ${badge.cls}`}>
                      {badge.label[locale] ?? badge.label.en}
                    </span>
                  ) : null}
                  <p className="line-clamp-2 text-[9px] text-white">{post.caption}</p>
                </div>

                {/* Status dot */}
                {post.status === "published" ? (
                  <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-green-400" />
                ) : post.status === "scheduled" ? (
                  <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                ) : post.status === "failed" ? (
                  <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function ClientFeedPage({ params }: ClientFeedPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const supabase = await createSupabaseServerClient();

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, photo_url")
    .eq("id", id)
    .single<{ id: string; name: string; photo_url: string | null }>();

  if (clientErr || !client) notFound();

  // Fetch recent accepted/scheduled/published posts for all platforms
  const { data: posts } = await supabase
    .from("client_schedule_items")
    .select("id, platform, format, title, caption, scheduled_at, status, assets")
    .eq("client_id", id)
    .in("status", ["accepted", "scheduled", "publishing", "published"])
    .order("scheduled_at", { ascending: false })
    .limit(60);

  const allPosts = (posts ?? []) as FeedPost[];

  // Group by platform, only include platforms that have posts
  const byPlatform = PLATFORMS.reduce(
    (acc, p) => {
      const platformPosts = allPosts.filter((post) => post.platform === p);
      if (platformPosts.length > 0) acc[p] = platformPosts.slice(0, 9);
      return acc;
    },
    {} as Record<string, FeedPost[]>
  );

  const activePlatforms = Object.keys(byPlatform);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Feed Preview" : "Feed Preview"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Pré-visualização do feed por plataforma."
            : "Feed preview per platform."}
        </p>
      </div>

      {activePlatforms.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <p className="text-sm text-muted-foreground">
            {locale === "pt"
              ? "Sem posts ainda. Aceita posts no calendário para ver o feed."
              : "No posts yet. Accept posts in the calendar to see the feed."}
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {activePlatforms.map((platform) => (
            <div key={platform} className="rounded-md border border-border/40 bg-card/40 p-4">
              <PlatformGrid
                platform={platform}
                posts={byPlatform[platform]}
                clientName={client.name}
                avatarUrl={client.photo_url}
                locale={locale}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
