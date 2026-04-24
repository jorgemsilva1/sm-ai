"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Loader2, Plus, Search, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copy, getClientLocale } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteMediaAsset, saveMediaAsset, type MediaAsset } from "@/app/(app)/dashboard/clients/actions";

type ClientMediaLibraryProps = {
  clientId: string;
  initialAssets: MediaAsset[];
};

type FilterKey = "all" | "image" | "video" | "gif";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClientMediaLibrary({ clientId, initialAssets }: ClientMediaLibraryProps) {
  const locale = getClientLocale();
  const t = copy[locale].clients.sections;
  const [assets, setAssets] = useState<MediaAsset[]>(initialAssets);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = assets.filter((a) => {
    if (filter !== "all" && a.file_type !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadError(null);
    setUploadingName(file.name);

    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${clientId}/media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("reference-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage.from("reference-assets").getPublicUrl(path);

      let fileType: "image" | "video" | "gif" = "image";
      if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type === "image/gif") fileType = "gif";

      // Read dimensions
      let width: number | null = null;
      let height: number | null = null;
      let durationMs: number | null = null;

      if (fileType === "image" || fileType === "gif") {
        try {
          const blobUrl = URL.createObjectURL(file);
          const img = new Image();
          img.src = blobUrl;
          await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
          width = img.naturalWidth || null;
          height = img.naturalHeight || null;
          URL.revokeObjectURL(blobUrl);
        } catch { /* best-effort */ }
      } else if (fileType === "video") {
        try {
          const blobUrl = URL.createObjectURL(file);
          const vid = document.createElement("video");
          vid.src = blobUrl;
          vid.muted = true;
          await new Promise<void>((res) => { vid.onloadedmetadata = () => res(); vid.onerror = () => res(); });
          width = vid.videoWidth || null;
          height = vid.videoHeight || null;
          durationMs = Number.isFinite(vid.duration) ? Math.round(vid.duration * 1000) : null;
          URL.revokeObjectURL(blobUrl);
        } catch { /* best-effort */ }
      }

      const result = await saveMediaAsset(clientId, locale, {
        name: file.name,
        fileUrl: urlData.publicUrl,
        fileType,
        mimeType: file.type,
        fileSize: file.size,
        width,
        height,
        durationMs,
      });

      if (result.error) throw new Error(result.error);
      if (result.asset) setAssets((prev) => [result.asset!, ...prev]);
      toast.success(locale === "pt" ? "Ativo carregado." : "Asset uploaded.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
    } finally {
      setUploadingName(null);
    }
  }

  function handleDelete(assetId: string) {
    startTransition(async () => {
      const result = await deleteMediaAsset(assetId, clientId, locale);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      toast.success(result.success);
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t.mediaSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "image", "video", "gif"] as FilterKey[]).map((f) => {
            const labels: Record<FilterKey, string> = {
              all: t.mediaFilterAll,
              image: t.mediaFilterImages,
              video: t.mediaFilterVideos,
              gif: "GIF",
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  filter === f
                    ? "bg-muted/80 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="brand"
          className="gap-2"
          disabled={!!uploadingName}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadingName ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {uploadingName ? (locale === "pt" ? "A carregar…" : "Uploading…") : t.mediaUploadAsset}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      ) : null}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <p className="text-sm text-muted-foreground">
            {assets.length === 0 ? t.mediaEmptyState : (locale === "pt" ? "Nenhum resultado." : "No results.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-md border border-border/40 bg-card/60"
            >
              {/* Thumbnail */}
              <div className="aspect-square w-full overflow-hidden bg-muted/40">
                {asset.file_type === "video" ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                ) : (
                  <img
                    src={asset.file_url}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Delete overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  disabled={isPending}
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {locale === "pt" ? "Apagar" : "Delete"}
                </Button>
              </div>

              {/* Info */}
              <div className="border-t border-border/40 p-2">
                <p className="truncate text-xs font-medium text-foreground">{asset.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {asset.file_type === "video" ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  <span>{formatBytes(asset.file_size)}</span>
                  {asset.width && asset.height ? (
                    <span>{asset.width}×{asset.height}</span>
                  ) : null}
                </div>
                {asset.used_in_posts > 0 ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {t.mediaUsedInPosts.replace("{count}", String(asset.used_in_posts))}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
