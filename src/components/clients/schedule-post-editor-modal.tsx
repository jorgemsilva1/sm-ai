import { useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  BarChart2,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Library,
  Loader2,
  RefreshCw,
  Upload,
  Video,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateScheduleItemAssetUrl, fetchPostAnalyticsOnDemand, boostPost, type PostAnalytics } from "@/app/(app)/dashboard/clients/actions";
import { copy, type Locale } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TabKey = "overview" | "preview" | "text" | "assets" | "rationale" | "analytics";

export type ScheduleEditorPost = {
  id: string;
  clientId: string;
  clientName?: string | null;
  clientPhotoUrl?: string | null;
  allowedPlatforms?: string[];
  allowedFormats?: string[];
  platform: string;
  format: string;
  scheduledAtISO: string;
  title: string;
  caption: string;
  status: "suggested" | "accepted" | "scheduled" | "publishing" | "published" | "failed" | "cancelled";
  publishedAt?: string | null;
  externalUrl?: string | null;
  failureReason?: string | null;
  assets: { type: "image" | "video" | "carousel"; description: string; notes: string | null; url?: string | null }[];
  rationale: Array<{
    reason: string;
    strategyReference: { field: string; snippet: string } | string | null;
  }>;
  draftName?: string | null;
  strategyTitle?: string | null;
};

type CopyProposal = {
  title: string;
  caption: string;
  rationale: ScheduleEditorPost["rationale"];
};

type RatioRule = { label: string; w: number; h: number };

function ratioLabel(rule: RatioRule) {
  return rule.label;
}

function allowedCreativeRatios(platform: string, format: string): RatioRule[] {
  const p = platform.toLowerCase();
  const f = format.toLowerCase();

  // Simplified, practical defaults (can be expanded later)
  if (p === "tiktok") return [{ label: "9:16", w: 9, h: 16 }];

  if (p === "instagram") {
    if (f === "story" || f === "reel" || f === "video" || f === "short") return [{ label: "9:16", w: 9, h: 16 }];
    return [
      { label: "1:1", w: 1, h: 1 },
      { label: "4:5", w: 4, h: 5 },
    ];
  }

  if (p === "facebook") {
    return [
      { label: "1:1", w: 1, h: 1 },
      { label: "4:5", w: 4, h: 5 },
      { label: "1.91:1", w: 191, h: 100 },
    ];
  }

  if (p === "linkedin") {
    return [
      { label: "1:1", w: 1, h: 1 },
      { label: "1.91:1", w: 191, h: 100 },
    ];
  }

  // default
  return [
    { label: "1:1", w: 1, h: 1 },
    { label: "4:5", w: 4, h: 5 },
    { label: "9:16", w: 9, h: 16 },
  ];
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image."));
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVideoMeta(file: File): Promise<{ width: number; height: number; durationSec: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video metadata."));
    });
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      durationSec: Number.isFinite(video.duration) ? video.duration : 0,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function aspectOk(width: number, height: number, rule: RatioRule, tolerance = 0.015) {
  const actual = width / height;
  const target = rule.w / rule.h;
  const diff = Math.abs(actual - target) / target;
  return diff <= tolerance;
}

function InstagramPreview({
  caption,
  assets,
  format,
  brandName,
  avatarUrl,
}: {
  caption: string;
  assets: ScheduleEditorPost["assets"];
  format: string;
  brandName: string;
  avatarUrl: string | null;
}) {
  const urls = assets.map((a) => a.url).filter((u): u is string => Boolean(u));
  const isCarousel = format === "carousel" || assets.length > 1;
  const [idx, setIdx] = useState(0);
  const slideCount = Math.max(1, isCarousel ? Math.max(urls.length, assets.length) : 1);
  const safeIdx = Math.min(Math.max(idx, 0), slideCount - 1);
  const currentUrl = urls[safeIdx] ?? urls[0] ?? null;
  const isStory = format === "story";
  const isReel = format === "reel" || format === "video" || format === "short";

  const frameClass =
    isStory || isReel ? "aspect-[9/16]" : "aspect-square";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-border/40 bg-background shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-muted/60 border border-border/40">
              {avatarUrl ? <img src={avatarUrl} alt={brandName} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none truncate">{brandName}</div>
              <div className="text-[11px] text-muted-foreground leading-none mt-1">
                Sponsored
              </div>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Media */}
        <div className={`w-full ${frameClass} bg-muted/40 border-y border-border/40 relative`}>
          {currentUrl ? (
            <img src={currentUrl} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="text-sm font-medium text-foreground">
                {isStory || isReel ? "Sem imagem ainda (9:16)" : "Sem imagem ainda (1:1)"}
              </div>
              <div className="text-xs text-muted-foreground">
                {`Vai ao tab "Assets" e clica "Gerar imagem" num dos assets.`}
              </div>
            </div>
          )}
          {isCarousel ? (
            <>
              <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-1 text-[11px] text-white">
                {`${safeIdx + 1}/${slideCount}`}
              </div>
              {/* Dots (Instagram-style) */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                {Array.from({ length: Math.min(12, slideCount) }).map((_, i) => (
                  <button
                    key={`dot-${i}`}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`h-1.5 w-1.5 rounded-full ${i === safeIdx ? "bg-white" : "bg-white/40"}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
              {/* Nav buttons (subtle) */}
              <button
                type="button"
                onClick={() => setIdx((v) => Math.max(0, v - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-xs text-white"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIdx((v) => Math.min(slideCount - 1, v + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-xs text-white"
                aria-label="Next"
              >
                ›
              </button>
            </>
          ) : null}
        </div>

        {/* Actions */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="h-6 w-6" />
              <MessageCircle className="h-6 w-6" />
              <Send className="h-6 w-6" />
            </div>
            {isCarousel ? (
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.max(1, assets.length)) }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-brand" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
            ) : (
              <div className="h-6" />
            )}
          </div>

          {/* (No thumbnails in Instagram UI; keep it clean) */}

          {/* Caption */}
          <div className="mt-3 text-sm">
            <span className="font-semibold">{brandName}</span>{" "}
            <span className="text-muted-foreground whitespace-pre-line">{caption || "—"}</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">View all comments</div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {`Preview aproximado (UI nativa varia por plataforma/OS).`}
      </p>
    </div>
  );
}

function TikTokPreview({
  caption,
  assets,
  brandName,
  avatarUrl,
}: {
  caption: string;
  assets: ScheduleEditorPost["assets"];
  brandName: string;
  avatarUrl: string | null;
}) {
  const first = assets.find((a) => a.url) ?? null;
  const url = first?.url ?? null;
  const urlLooksVideo = url ? /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) : false;
  const isVideo = (first?.type && String(first.type).toLowerCase() === "video") || urlLooksVideo;
  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-black shadow-sm">
        <div className="relative aspect-[9/16] w-full bg-black">
          {url ? (
            isVideo ? (
              <video
                src={url}
                className="h-full w-full object-cover opacity-95"
                controls
                playsInline
              />
            ) : (
              <img src={url} alt="tiktok" className="h-full w-full object-cover opacity-95" />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="text-sm font-medium text-white">Sem imagem ainda (9:16)</div>
              <div className="text-xs text-white/70">{`Vai ao tab "Assets" e clica "Gerar imagem".`}</div>
            </div>
          )}

          {/* Bottom gradient (TikTok-style) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          {/* Right rail */}
          <div className="absolute bottom-20 right-3 flex flex-col items-center gap-4 text-white">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/15 border border-white/20">
              {avatarUrl ? <img src={avatarUrl} alt={brandName} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex flex-col items-center gap-1">
              <Heart className="h-7 w-7" />
              <div className="text-[10px] text-white/80">12.3K</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <MessageCircle className="h-7 w-7" />
              <div className="text-[10px] text-white/80">421</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Send className="h-7 w-7" />
              <div className="text-[10px] text-white/80">Share</div>
            </div>
          </div>

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="text-sm font-semibold">@{brandName}</div>
            <div className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-white/90">
              {caption || "—"}
            </div>
            <div className="mt-2 text-[10px] text-white/70">Sound • Original audio</div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{`Preview aproximado (UI nativa varia).`}</p>
    </div>
  );
}

function LinkedInPreview({
  caption,
  assets,
  brandName,
  avatarUrl,
}: {
  caption: string;
  assets: ScheduleEditorPost["assets"];
  brandName: string;
  avatarUrl: string | null;
}) {
  const url = assets.find((a) => a.url)?.url ?? null;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-muted/60 border border-border/40">
              {avatarUrl ? <img src={avatarUrl} alt={brandName} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none truncate">{brandName}</div>
              <div className="mt-1 text-[11px] text-muted-foreground leading-none">
                12,345 followers • Promoted
              </div>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Text */}
        <div className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">
          {caption || "—"}
        </div>

        {/* Media */}
        <div className="border-y border-border/40 bg-muted/20">
          {url ? (
            <img src={url} alt="linkedin" className="h-auto w-full object-cover" />
          ) : (
            <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
              Sem imagem ainda — gera no tab &quot;Assets&quot;
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>👍 1,024 • 💬 63</div>
            <div>12 reposts</div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2"><Heart className="h-4 w-4" />Like</div>
            <div className="flex items-center justify-center gap-2"><MessageCircle className="h-4 w-4" />Comment</div>
            <div className="flex items-center justify-center gap-2"><Send className="h-4 w-4" />Repost</div>
            <div className="flex items-center justify-center gap-2"><Send className="h-4 w-4" />Send</div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{`Preview aproximado (UI nativa varia).`}</p>
    </div>
  );
}

function FacebookPreview({
  caption,
  assets,
  brandName,
  avatarUrl,
}: {
  caption: string;
  assets: ScheduleEditorPost["assets"];
  brandName: string;
  avatarUrl: string | null;
}) {
  const url = assets.find((a) => a.url)?.url ?? null;
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-background shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-muted/60 border border-border/40">
              {avatarUrl ? <img src={avatarUrl} alt={brandName} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-none truncate">{brandName}</div>
              <div className="mt-1 text-[11px] text-muted-foreground leading-none">
                Just now • Sponsored
              </div>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="px-4 pb-3 text-sm text-muted-foreground whitespace-pre-line">
          {caption || "—"}
        </div>

        <div className="border-y border-border/40 bg-muted/20">
          {url ? (
            <img src={url} alt="facebook" className="h-auto w-full object-cover" />
          ) : (
            <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
              Sem imagem ainda — gera no tab &quot;Assets&quot;
            </div>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div>👍 ❤️ 😂 2.1K</div>
            <div>321 comments • 44 shares</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2"><Heart className="h-4 w-4" />Like</div>
            <div className="flex items-center justify-center gap-2"><MessageCircle className="h-4 w-4" />Comment</div>
            <div className="flex items-center justify-center gap-2"><Send className="h-4 w-4" />Share</div>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{`Preview aproximado (UI nativa varia).`}</p>
    </div>
  );
}

export function SchedulePostEditorModal({
  locale,
  post,
  onClose,
  onDelete,
  onToggleStatus,
  onSaveText,
  onSaveDateTime,
  onGenerateAssets,
  onGenerateAssetImage,
  onChangeChannel,
  onPreviewRegenerateText,
  onApplyRegeneratedText,
  onCancelSchedule,
  onPublishNow,
  onRetryPublish,
}: {
  locale: Locale;
  post: ScheduleEditorPost;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onToggleStatus: (next: "suggested" | "accepted") => Promise<void>;
  onSaveText: (next: { title: string; caption: string }) => Promise<void>;
  onSaveDateTime: (nextISO: string) => Promise<void>;
  onGenerateAssets: () => Promise<void>;
  onGenerateAssetImage: (assetIndex: number) => Promise<void>;
  onChangeChannel: (next: { platform: string; format: string }) => Promise<void>;
  onPreviewRegenerateText: () => Promise<CopyProposal | null>;
  onApplyRegeneratedText: (proposal: CopyProposal) => Promise<void>;
  onCancelSchedule?: () => Promise<void>;
  onPublishNow?: () => Promise<void>;
  onRetryPublish?: () => Promise<void>;
}) {
  const t = copy[locale];
  const labels = t.clients.sections.calendarProgram;

  const [tab, setTab] = useState<TabKey>("overview");
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const uploadRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function refreshAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await fetchPostAnalyticsOnDemand(post.id, post.clientId, locale);
      if (res.error) setAnalyticsError(res.error);
      else if (res.analytics) setAnalytics(res.analytics);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  // Boost
  const [showBoost, setShowBoost] = useState(false);
  const [boostName, setBoostName] = useState(() => `Boost — ${post.title}`.slice(0, 80));
  const [boostBudget, setBoostBudget] = useState("10");
  const [boostStart, setBoostStart] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [boostEnd, setBoostEnd] = useState(() => format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"));
  const [boostError, setBoostError] = useState<string | null>(null);
  const [boostSuccess, setBoostSuccess] = useState(false);

  async function handleBoost() {
    setBoostError(null);
    const dailyCents = Math.round(parseFloat(boostBudget) * 100);
    if (!dailyCents || dailyCents < 100) {
      setBoostError(locale === "pt" ? "Budget mínimo: $1/dia." : "Minimum budget: $1/day.");
      return;
    }
    const res = await boostPost(post.id, post.clientId, locale, {
      name: boostName || `Boost — ${post.title}`,
      dailyBudgetCents: dailyCents,
      startDate: new Date(boostStart).toISOString(),
      endDate: new Date(boostEnd).toISOString(),
    });
    if (res.error) { setBoostError(res.error); return; }
    setBoostSuccess(true);
    setTimeout(() => { setShowBoost(false); setBoostSuccess(false); }, 2000);
  }

  // Media library picker
  type LibraryAsset = { id: string; name: string; file_url: string; file_type: string; thumbnail_url: string | null };
  const [libraryPickerIndex, setLibraryPickerIndex] = useState<number | null>(null);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);

  async function openLibraryPicker(assetIdx: number) {
    setLibraryPickerIndex(assetIdx);
    if (libraryAssets !== null) return; // already loaded
    setLibraryLoading(true);
    try {
      const { data } = await supabase
        .from("client_media_assets")
        .select("id, name, file_url, file_type, thumbnail_url")
        .eq("client_id", post.clientId)
        .order("created_at", { ascending: false })
        .limit(100);
      setLibraryAssets((data ?? []) as LibraryAsset[]);
    } finally {
      setLibraryLoading(false);
    }
  }

  async function pickLibraryAsset(asset: LibraryAsset, assetIdx: number) {
    setLibraryPickerIndex(null);
    const isVideo = asset.file_type === "video";
    const res = await updateScheduleItemAssetUrl(
      post.id,
      post.clientId,
      locale,
      assetIdx,
      asset.file_url,
      isVideo ? "video" : "image"
    );
    if (res?.item) {
      if (post.assets[assetIdx]) (post.assets[assetIdx] as Record<string, unknown>).url = asset.file_url;
    }
    if ((res as { error?: string }).error) {
      setUploadError((res as { error?: string }).error ?? "Failed.");
    }
  }

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [draftTitle, setDraftTitle] = useState(post.title);
  const [draftCaption, setDraftCaption] = useState(post.caption);
  const [draftPlatform, setDraftPlatform] = useState(post.platform);
  const [draftFormat, setDraftFormat] = useState(post.format);
  const [aiProposal, setAiProposal] = useState<CopyProposal | null>(null);

  const [dateStr, setDateStr] = useState(() => format(new Date(post.scheduledAtISO), "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState(() => format(new Date(post.scheduledAtISO), "HH:mm"));

  const scheduledLabel = useMemo(() => {
    const d = new Date(post.scheduledAtISO);
    return `${format(d, "PPP")} • ${format(d, "HH:mm")}`;
  }, [post.scheduledAtISO]);

  const mainWhy = post.rationale?.[0];
  const platformOptions = (post.allowedPlatforms?.length ? post.allowedPlatforms : ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube", "blog"]).map(String);
  const formatOptions = (post.allowedFormats?.length ? post.allowedFormats : ["post", "reel", "story", "carousel", "short", "video", "thread"]).map(String);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div
        className="h-[78vh] w-[80vw] max-w-5xl overflow-hidden rounded-md border border-border/40 bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{labels.postDetailTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {post.draftName ? `${post.draftName} · ` : ""}
              {post.platform} · {post.format} · {scheduledLabel}
              {" · "}
              <span className={post.status === "accepted" ? "text-foreground" : ""}>
                {locale === "pt" ? (post.status === "accepted" ? "Ativo" : "Draft") : post.status === "accepted" ? "Active" : "Draft"}
              </span>
            </p>
            {post.strategyTitle ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {locale === "pt" ? "Estratégia:" : "Strategy:"} {post.strategyTitle}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>

        <div className="flex h-[calc(78vh-72px)] min-h-0">
          {/* left: tabs */}
          <div className="w-[260px] shrink-0 border-r border-border/40 p-4">
            <div className="space-y-2">
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "overview" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                onClick={() => setTab("overview")}
              >
                {locale === "pt" ? "Overview" : "Overview"}
              </button>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "preview" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                onClick={() => setTab("preview")}
              >
                {locale === "pt" ? "Preview" : "Preview"}
              </button>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "text" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                onClick={() => setTab("text")}
              >
                {locale === "pt" ? "Texto" : "Text"}
              </button>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "assets" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                onClick={() => setTab("assets")}
              >
                {locale === "pt" ? "Assets" : "Assets"}
              </button>
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "rationale" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                onClick={() => setTab("rationale")}
              >
                {locale === "pt" ? "Justificação" : "Rationale"}
              </button>
              {post.status === "published" ? (
                <button
                  type="button"
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${tab === "analytics" ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}
                  onClick={() => setTab("analytics")}
                >
                  {locale === "pt" ? "Analytics" : "Analytics"}
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await onToggleStatus(post.status === "accepted" ? "suggested" : "accepted");
                  })
                }
              >
                <CheckCircle2 className="h-4 w-4" />
                {locale === "pt"
                  ? post.status === "accepted"
                    ? "Colocar em draft"
                    : "Ativar"
                  : post.status === "accepted"
                    ? "Set draft"
                    : "Activate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-2"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await navigator.clipboard.writeText(post.caption || "");
                  })
                }
              >
                <Clipboard className="h-4 w-4" />
                {locale === "pt" ? "Copiar texto" : "Copy text"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start gap-2"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await onDelete();
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                {locale === "pt" ? "Apagar post" : "Delete post"}
              </Button>
            </div>
          </div>

          {/* right: content */}
          <div className="min-w-0 flex-1 overflow-y-auto p-6">
            {tab === "overview" ? (
              <div className="space-y-4">
                {/* Publishing status block */}
                {post.status === "scheduled" ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>
                        {locale === "pt" ? "Agendado para publicação em " : "Scheduled to publish at "}
                        <span className="font-medium">{new Date(post.scheduledAtISO).toLocaleString()}</span>
                      </span>
                    </div>
                    {onCancelSchedule ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await onCancelSchedule(); })}
                      >
                        <X className="h-3.5 w-3.5" />
                        {locale === "pt" ? "Cancelar" : "Cancel"}
                      </Button>
                    ) : null}
                  </div>
                ) : post.status === "publishing" ? (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    {locale === "pt" ? "A publicar agora…" : "Publishing now…"}
                  </div>
                ) : post.status === "published" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-green-500/30 bg-green-500/10 p-3">
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>
                          {locale === "pt" ? "Publicado em " : "Published on "}
                          <span className="font-medium">
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "—"}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.externalUrl ? (
                          <Button asChild type="button" variant="outline" size="sm" className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10">
                            <a href={post.externalUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                              {locale === "pt" ? "Ver post" : "View post"}
                            </a>
                          </Button>
                        ) : null}
                        {["instagram", "facebook"].includes(String(post.platform).toLowerCase()) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-brand/30 text-brand hover:bg-brand/10"
                            onClick={() => setShowBoost((v) => !v)}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {locale === "pt" ? "Boost" : "Boost"}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {/* Boost panel */}
                    {showBoost ? (
                      <div className="rounded-md border border-brand/20 bg-brand/5 p-4 space-y-3">
                        <div className="text-sm font-semibold text-foreground">
                          {locale === "pt" ? "Configurar boost" : "Configure boost"}
                        </div>
                        {boostError ? (
                          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                            {boostError}
                          </div>
                        ) : null}
                        {boostSuccess ? (
                          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-2 text-xs text-green-400">
                            {locale === "pt" ? "Boost criado!" : "Boost created!"}
                          </div>
                        ) : null}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 sm:col-span-2">
                            <div className="text-xs text-muted-foreground">{locale === "pt" ? "Nome da campanha" : "Campaign name"}</div>
                            <input
                              type="text"
                              value={boostName}
                              onChange={(e) => setBoostName(e.target.value)}
                              className="w-full rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{locale === "pt" ? "Budget diário (USD)" : "Daily budget (USD)"}</div>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={boostBudget}
                              onChange={(e) => setBoostBudget(e.target.value)}
                              className="w-full rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{locale === "pt" ? "Data início" : "Start date"}</div>
                            <input
                              type="date"
                              value={boostStart}
                              onChange={(e) => setBoostStart(e.target.value)}
                              className="w-full rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{locale === "pt" ? "Data fim" : "End date"}</div>
                            <input
                              type="date"
                              value={boostEnd}
                              onChange={(e) => setBoostEnd(e.target.value)}
                              className="w-full rounded-md border border-border/40 bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand/50"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="brand"
                            size="sm"
                            className="gap-1.5"
                            disabled={isPending}
                            onClick={() => startTransition(async () => { await handleBoost(); })}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            {locale === "pt" ? "Lançar boost" : "Launch boost"}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowBoost(false); setBoostError(null); }}>
                            {locale === "pt" ? "Cancelar" : "Cancel"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : post.status === "failed" ? (
                  <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {locale === "pt" ? "Falha na publicação" : "Publish failed"}
                    </div>
                    {post.failureReason ? (
                      <p className="text-xs text-muted-foreground">{post.failureReason}</p>
                    ) : null}
                    {onRetryPublish ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={isPending}
                        onClick={() => startTransition(async () => { await onRetryPublish(); })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {locale === "pt" ? "Tentar novamente" : "Retry publish"}
                      </Button>
                    ) : null}
                  </div>
                ) : post.status === "accepted" && onPublishNow ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-card/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      {locale === "pt"
                        ? "Data passada. Publicar agora ou actualizar a data."
                        : "Scheduled time is in the past. Publish now or update the date."}
                    </p>
                    <Button
                      type="button"
                      variant="brand"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      disabled={isPending}
                      onClick={() => startTransition(async () => { await onPublishNow(); })}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {locale === "pt" ? "Publicar agora" : "Publish now"}
                    </Button>
                  </div>
                ) : null}

                {/* TikTok requires a video asset */}
                {String(post.platform).toLowerCase() === "tiktok" &&
                post.status === "accepted" &&
                !post.assets.some((a) => a.url && String(a.type).toLowerCase() === "video") ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="space-y-1">
                      <p className="text-sm text-amber-400">
                        {locale === "pt"
                          ? "TikTok requer um vídeo."
                          : "TikTok requires a video."}
                      </p>
                      <p className="text-xs text-amber-400/70">
                        {locale === "pt"
                          ? "Vai ao tab \"Assets\" e faz upload de um vídeo antes de agendar."
                          : "Go to the \"Assets\" tab and upload a video before scheduling."}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-amber-400 underline underline-offset-2 hover:text-amber-300"
                        onClick={() => setTab("assets")}
                      >
                        {locale === "pt" ? "Ir para Assets →" : "Go to Assets →"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{locale === "pt" ? "Canal" : "Channel"}</div>
                    <div className="text-xs text-muted-foreground">
                      {locale === "pt" ? "Respeita a estratégia" : "Strict to strategy"}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{locale === "pt" ? "Plataforma" : "Platform"}</div>
                      <Select value={draftPlatform} onValueChange={(v) => setDraftPlatform(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={locale === "pt" ? "Escolhe a plataforma" : "Select platform"} />
                        </SelectTrigger>
                        <SelectContent>
                          {platformOptions.map((p) => (
                            <SelectItem key={`p-${p}`} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{locale === "pt" ? "Formato" : "Format"}</div>
                      <Select value={draftFormat} onValueChange={(v) => setDraftFormat(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={locale === "pt" ? "Escolhe o formato" : "Select format"} />
                        </SelectTrigger>
                        <SelectContent>
                          {formatOptions.map((f) => (
                            <SelectItem key={`f-${f}`} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await onChangeChannel({ platform: draftPlatform, format: draftFormat });
                        })
                      }
                    >
                      <Save className="h-4 w-4" />
                      {locale === "pt" ? "Guardar canal" : "Save channel"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {locale === "pt" ? "Estratégia → Post" : "Strategy → Post"}
                  </div>
                  {mainWhy ? (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="text-muted-foreground">
                        {locale === "pt" ? "Sugerido porque " : "Suggested because "}
                      </span>
                      <span className="text-foreground">{mainWhy.reason}</span>
                      {mainWhy.strategyReference && typeof mainWhy.strategyReference === "object" ? (
                        <span className="text-muted-foreground">
                          {" "}
                          — {locale === "pt" ? "como pedido na estratégia: " : "as requested in the strategy: "}
                          <span className="font-medium text-foreground">
                            {mainWhy.strategyReference.field}
                          </span>
                          : &quot;{mainWhy.strategyReference.snippet}&quot;
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {locale === "pt" ? "Sem justificação disponível." : "No rationale available."}
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{locale === "pt" ? "Data & hora" : "Date & time"}</div>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{locale === "pt" ? "Data" : "Date"}</div>
                      <Input value={dateStr} type="date" onChange={(e) => setDateStr(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">{locale === "pt" ? "Hora" : "Time"}</div>
                      <Input value={timeStr} type="time" onChange={(e) => setTimeStr(e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const iso = new Date(`${dateStr}T${timeStr}:00`).toISOString();
                          await onSaveDateTime(iso);
                        })
                      }
                    >
                      <Save className="h-4 w-4" />
                      {locale === "pt" ? "Guardar data" : "Save date"}
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {locale === "pt"
                        ? "Também podes arrastar e largar no calendário (week/day)."
                        : "You can also drag & drop on the calendar (week/day)."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "preview" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{locale === "pt" ? "Preview" : "Preview"}</div>
                  <div className="text-xs text-muted-foreground">
                    {locale === "pt" ? "Plataforma: " : "Platform: "}
                    <span className="text-foreground font-medium">{post.platform}</span>
                    {" · "}
                    {locale === "pt" ? "Formato: " : "Format: "}
                    <span className="text-foreground font-medium">{post.format}</span>
                  </div>
                </div>

                {(() => {
                  const p = String(post.platform).toLowerCase();
                  const brandName = String(post.clientName || "yourbrand");
                  const avatarUrl = post.clientPhotoUrl ?? null;
                  if (p === "instagram") {
                    return (
                      <InstagramPreview
                        caption={post.caption}
                        assets={post.assets}
                        format={String(post.format).toLowerCase()}
                        brandName={brandName}
                        avatarUrl={avatarUrl}
                      />
                    );
                  }
                  if (p === "tiktok") return <TikTokPreview caption={post.caption} assets={post.assets} brandName={brandName} avatarUrl={avatarUrl} />;
                  if (p === "linkedin") return <LinkedInPreview caption={post.caption} assets={post.assets} brandName={brandName} avatarUrl={avatarUrl} />;
                  if (p === "facebook") return <FacebookPreview caption={post.caption} assets={post.assets} brandName={brandName} avatarUrl={avatarUrl} />;
                  return (
                    <div className="rounded-md border border-border/40 bg-card/60 p-4 text-sm text-muted-foreground">
                      {locale === "pt"
                        ? "Preview detalhado ainda não está disponível para esta plataforma."
                        : "Detailed preview is not available for this platform yet."}
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {tab === "text" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{locale === "pt" ? "Copy" : "Copy"}</div>
                  <Button
                    type="button"
                    variant="brand" className="gap-2"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const proposal = await onPreviewRegenerateText();
                        if (proposal) setAiProposal(proposal);
                      })
                    }
                  >
                    <Sparkles className="h-4 w-4" />
                    {locale === "pt" ? "Regenerar texto com IA" : "Regenerate with AI"}
                  </Button>
                </div>

                {aiProposal ? (
                  <div className="rounded-md border border-border/40 bg-card/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {locale === "pt" ? "Proposta (não aplicada)" : "Proposal (not applied)"}
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground">{locale === "pt" ? "Título" : "Title"}</div>
                        <div className="mt-1 text-sm text-foreground">{aiProposal.title}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{labels.textTitle}</div>
                        <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{aiProposal.caption}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">{labels.whyTitle}</div>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {aiProposal.rationale.map((r, idx) => (
                            <li key={`prop-r-${idx}`}>
                              <span className="text-foreground">{r.reason}</span>
                              {r.strategyReference && typeof r.strategyReference === "object" ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  — {locale === "pt" ? "como pedido na estratégia: " : "as requested in the strategy: "}
                                  <span className="font-medium text-foreground">{r.strategyReference.field}</span>
                                  : &quot;{r.strategyReference.snippet}&quot;
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="brand" className="gap-2"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await onApplyRegeneratedText(aiProposal);
                            setAiProposal(null);
                          })
                        }
                      >
                        <Save className="h-4 w-4" />
                        {locale === "pt" ? "Aplicar proposta" : "Apply proposal"}
                      </Button>
                      <Button type="button" variant="outline" disabled={isPending} onClick={() => setAiProposal(null)}>
                        {locale === "pt" ? "Cancelar" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{locale === "pt" ? "Título" : "Title"}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingTitle((v) => !v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  {editingTitle ? (
                    <Input className="mt-2" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                  ) : (
                    <div className="mt-2 text-sm text-muted-foreground">{draftTitle}</div>
                  )}
                </div>

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{labels.textTitle}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCaption((v) => !v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  {editingCaption ? (
                    <Textarea className="mt-2" rows={8} value={draftCaption} onChange={(e) => setDraftCaption(e.target.value)} />
                  ) : (
                    <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{draftCaption}</div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="brand" className="gap-2"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await onSaveText({ title: draftTitle, caption: draftCaption });
                      setEditingTitle(false);
                      setEditingCaption(false);
                    })
                  }
                >
                  <Save className="h-4 w-4" />
                  {locale === "pt" ? "Guardar texto" : "Save text"}
                </Button>
              </div>
            ) : null}

            {tab === "assets" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{labels.assetsTitle}</div>
                  <Button
                    type="button"
                    variant="brand" className="gap-2"
                    disabled={isPending}
                    onClick={() => startTransition(async () => onGenerateAssets())}
                  >
                    <Sparkles className="h-4 w-4" />
                    {locale === "pt" ? "Gerar assets com IA" : "Generate assets with AI"}
                  </Button>
                </div>
                {String(post.platform).toLowerCase() === "tiktok" &&
                !post.assets.some((a) => a.url && String(a.type).toLowerCase() === "video") ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-400">
                      {locale === "pt"
                        ? "TikTok requer um vídeo (9:16). Faz upload abaixo."
                        : "TikTok requires a video (9:16). Upload one below."}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  {uploadError ? (
                    <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {uploadError}
                    </div>
                  ) : null}
                  {post.assets.length ? (
                    <div className="space-y-2">
                      {post.assets.map((a, idx) => (
                        <div key={`${post.id}-a-${idx}`} className="rounded-md border border-border/40 bg-background/40 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {a.type}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{a.description}</div>
                          {a.notes ? <div className="mt-1 text-xs text-muted-foreground">{a.notes}</div> : null}
                          {a.url ? (
                            <div className="mt-3 overflow-hidden rounded-md border border-border/40 bg-background/60">
                              {String(a.type).toLowerCase() === "video" ? (
                                <video src={a.url} className="h-auto w-full" controls playsInline />
                              ) : (
                                <img src={a.url} alt={a.description} className="h-auto w-full" />
                              )}
                            </div>
                          ) : null}
                          <div className="mt-3 text-xs text-muted-foreground">
                            {locale === "pt" ? "Regras de creative: " : "Creative rules: "}
                            <span className="text-foreground">
                              {allowedCreativeRatios(post.platform, post.format).map(ratioLabel).join(", ")}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              disabled={isPending}
                              onClick={() => startTransition(async () => onGenerateAssetImage(idx))}
                            >
                              <ImageIcon className="h-4 w-4" />
                              {locale === "pt"
                                ? a.url
                                  ? "Refazer imagem"
                                  : "Gerar imagem"
                                : a.url
                                  ? "Regenerate image"
                                  : "Generate image"}
                            </Button>

                            <input
                              ref={(el) => {
                                uploadRefs.current[idx] = el;
                              }}
                              type="file"
                              accept={
                                String(post.platform).toLowerCase() === "tiktok" || String(a.type).toLowerCase() === "video"
                                  ? "image/*,video/*"
                                  : "image/*"
                              }
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadError(null);
                                startTransition(async () => {
                                  try {
                                    setUploadingIndex(idx);
                                    const isVideo = file.type.startsWith("video/");
                                    if (isVideo && !(String(post.platform).toLowerCase() === "tiktok" || String(a.type).toLowerCase() === "video")) {
                                      throw new Error(
                                        locale === "pt"
                                          ? "Vídeo só é permitido quando a plataforma é TikTok (ou quando o asset é do tipo vídeo)."
                                          : "Video is only allowed for TikTok (or when the asset type is video)."
                                      );
                                    }

                                    const meta = isVideo ? await readVideoMeta(file) : await readImageSize(file);
                                    const width = meta.width;
                                    const height = meta.height;

                                    const rules = allowedCreativeRatios(post.platform, post.format);
                                    const ok = rules.some((r) => aspectOk(width, height, r));
                                    if (!ok) {
                                      const allowed = rules.map(ratioLabel).join(", ");
                                      throw new Error(
                                        locale === "pt"
                                          ? `Formato inválido: ${width}x${height}. Aceites: ${allowed}.`
                                          : `Invalid aspect: ${width}x${height}. Allowed: ${allowed}.`
                                      );
                                    }

                                    // Optional basic TikTok duration sanity check (soft)
                                    if (String(post.platform).toLowerCase() === "tiktok" && isVideo && "durationSec" in meta) {
                                      const d = (meta as { durationSec: number }).durationSec;
                                      if (d && d < 1) {
                                        throw new Error(locale === "pt" ? "Vídeo inválido (duração)." : "Invalid video (duration).");
                                      }
                                    }

                                    const ext = file.name.split(".").pop() || "png";
                                    const path = `${post.clientId}/schedule/${post.id}/upload-${idx}-${Date.now()}.${ext}`;
                                    const { error } = await supabase.storage
                                      .from("reference-assets")
                                      .upload(path, file, { upsert: true, contentType: file.type });
                                    if (error) throw new Error(error.message);
                                    const { data } = supabase.storage.from("reference-assets").getPublicUrl(path);
                                    const url = data.publicUrl;

                                    // persist via callback wiring (calendar updates state)
                                    const res = await updateScheduleItemAssetUrl(
                                      post.id,
                                      post.clientId,
                                      locale,
                                      idx,
                                      url,
                                      isVideo ? "video" : "image"
                                    );
                                    if (res?.item) {
                                      // local UI will update on next render from parent/calendar;
                                      // keep the current view responsive by patching the in-memory object too.
                                      if (post.assets[idx]) (post.assets[idx] as any).url = url;
                                    } else if ((res as any)?.error) {
                                      throw new Error((res as any).error);
                                    }
                                  } catch (err: any) {
                                    setUploadError(err?.message || "Upload failed.");
                                  } finally {
                                    setUploadingIndex(null);
                                    if (uploadRefs.current[idx]) uploadRefs.current[idx]!.value = "";
                                  }
                                });
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              disabled={isPending || uploadingIndex === idx}
                              onClick={() => uploadRefs.current[idx]?.click()}
                            >
                              <Upload className="h-4 w-4" />
                              {uploadingIndex === idx
                                ? locale === "pt"
                                  ? "A fazer upload…"
                                  : "Uploading…"
                                : locale === "pt"
                                  ? (String(post.platform).toLowerCase() === "tiktok" || String(a.type).toLowerCase() === "video"
                                      ? "Upload media"
                                      : "Upload imagem")
                                  : (String(post.platform).toLowerCase() === "tiktok" || String(a.type).toLowerCase() === "video"
                                      ? "Upload media"
                                      : "Upload image")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              disabled={isPending}
                              onClick={() => openLibraryPicker(idx)}
                            >
                              <Library className="h-4 w-4" />
                              {locale === "pt" ? "Biblioteca" : "Browse Library"}
                            </Button>
                            {String(post.platform).toLowerCase() === "tiktok" ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Video className="h-4 w-4" />
                                {locale === "pt" ? "TikTok aceita vídeo (9:16)." : "TikTok supports video (9:16)."}
                              </div>
                            ) : null}
                            {a.url ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="gap-2"
                                onClick={() => window.open(a.url as string, "_blank")}
                              >
                                {locale === "pt" ? "Abrir" : "Open"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{labels.assetsHint}</p>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "rationale" ? (
              <div className="space-y-4">
                <div className="text-sm font-semibold">{labels.whyTitle}</div>
                <div className="rounded-md border border-border/40 bg-card/60 p-4">
                  <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {post.rationale.map((r, idx) => (
                      <li key={`${post.id}-r-${idx}`}>
                        <span className="text-muted-foreground">{locale === "pt" ? "Sugerido porque " : "Suggested because "}</span>
                        <span className="text-foreground">{r.reason}</span>
                        {r.strategyReference && typeof r.strategyReference === "object" ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {locale === "pt" ? "como pedido na estratégia: " : "as requested in the strategy: "}
                            <span className="font-medium text-foreground">{r.strategyReference.field}</span>
                            : &quot;{r.strategyReference.snippet}&quot;
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {tab === "analytics" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                      {locale === "pt" ? "Analytics" : "Analytics"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={analyticsLoading}
                    onClick={refreshAnalytics}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${analyticsLoading ? "animate-spin" : ""}`} />
                    {locale === "pt" ? "Atualizar" : "Refresh"}
                  </Button>
                </div>

                {analyticsError ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {analyticsError}
                  </div>
                ) : null}

                {analytics ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {([
                        { key: "impressions", label: locale === "pt" ? "Impressões" : "Impressions" },
                        { key: "reach", label: locale === "pt" ? "Alcance" : "Reach" },
                        { key: "engagement", label: locale === "pt" ? "Engagement" : "Engagement" },
                        { key: "likes", label: locale === "pt" ? "Gostos" : "Likes" },
                        { key: "comments", label: locale === "pt" ? "Comentários" : "Comments" },
                        { key: "shares", label: locale === "pt" ? "Partilhas" : "Shares" },
                        { key: "saves", label: locale === "pt" ? "Guardados" : "Saves" },
                        { key: "video_views", label: locale === "pt" ? "Views" : "Video Views" },
                      ] as { key: keyof PostAnalytics; label: string }[])
                        .filter((m) => analytics[m.key] !== null && analytics[m.key] !== undefined)
                        .map((m) => (
                          <div
                            key={m.key}
                            className="rounded-md border border-border/40 bg-card/60 p-3"
                          >
                            <div className="text-xs text-muted-foreground">{m.label}</div>
                            <div className="mt-1 text-2xl font-semibold">
                              {Number(analytics[m.key]).toLocaleString()}
                            </div>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locale === "pt" ? "Última actualização: " : "Last updated: "}
                      {new Date(analytics.fetched_at).toLocaleString()}
                    </p>
                  </>
                ) : !analyticsLoading ? (
                  <div className="rounded-md border border-border/40 bg-card/60 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {locale === "pt"
                        ? "Sem dados de analytics. Clica em \"Atualizar\" para obter métricas."
                        : "No analytics data yet. Click \"Refresh\" to fetch metrics."}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Media Library Picker */}
      {libraryPickerIndex !== null ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4"
          onClick={() => setLibraryPickerIndex(null)}
        >
          <div
            className="flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border border-border/40 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
              <h3 className="text-sm font-semibold">
                {locale === "pt" ? "Biblioteca de media" : "Media Library"}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryPickerIndex(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !libraryAssets || libraryAssets.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    {locale === "pt"
                      ? "Biblioteca vazia. Vai a Media para fazer upload de assets."
                      : "Library is empty. Go to Media to upload assets."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {libraryAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="group overflow-hidden rounded-md border border-border/40 bg-card/60 text-left transition-colors hover:border-brand/50"
                      onClick={() => {
                        const idx = libraryPickerIndex;
                        startTransition(async () => {
                          await pickLibraryAsset(asset, idx);
                        });
                      }}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-muted/40">
                        {asset.file_type === "video" ? (
                          <div className="flex h-full w-full items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground/60" />
                          </div>
                        ) : (
                          <img
                            src={asset.thumbnail_url ?? asset.file_url}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p className="truncate text-[11px] text-muted-foreground">{asset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

