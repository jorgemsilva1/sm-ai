"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { enUS } from "date-fns/locale/en-US";
import { CalendarDays, Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copy, type Locale } from "@/lib/i18n";
import { createScheduleItemManual, createScheduleItemWithAI } from "@/app/(app)/dashboard/clients/actions";

type StrategyOption = { id: string; title: string; channels?: string | null; formats?: string | null };

function extractAllowedPlatforms(channels: string | null | undefined) {
  const text = String(channels || "").toLowerCase();
  const out = new Set<string>();
  if (/\b(instagram|ig)\b/.test(text)) out.add("instagram");
  if (/\b(tiktok|tik\s*tok)\b/.test(text)) out.add("tiktok");
  if (/\bfacebook|fb\b/.test(text)) out.add("facebook");
  if (/\blinkedin\b/.test(text)) out.add("linkedin");
  if (/\b(youtube|yt)\b/.test(text)) out.add("youtube");
  if (/\bblog\b/.test(text)) out.add("blog");
  if (/\b(twitter|x)\b/.test(text)) out.add("x");
  return Array.from(out);
}

function extractAllowedFormats(formats: string | null | undefined) {
  const text = String(formats || "").toLowerCase();
  const out = new Set<string>();
  if (/\b(reel|reels)\b/.test(text)) out.add("reel");
  if (/\b(story|stories)\b/.test(text)) out.add("story");
  if (/\b(carousel|carrossel)\b/.test(text)) out.add("carousel");
  if (/\b(thread|fio)\b/.test(text)) out.add("thread");
  if (/\b(short|shorts)\b/.test(text)) out.add("short");
  if (/\b(video|vídeo)\b/.test(text)) out.add("video");
  if (/\b(post|publicaç)\b/.test(text)) out.add("post");
  return Array.from(out);
}

type Mode = "manual" | "ai";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function DatePickerField({
  locale,
  label,
  value,
  onChange,
}: {
  locale: Locale;
  label: string;
  value: Date;
  onChange: (next: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const dfLocale = locale === "pt" ? pt : enUS;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // close only if click happens outside the popover container
      const popover = document.getElementById("sm-date-popover");
      if (popover && !popover.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="relative">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
          onClick={() => setOpen((v) => !v)}
        >
          <span>{format(value, "PPP", { locale: dfLocale })}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
        {open ? (
          <div
            id="sm-date-popover"
            className="absolute left-0 top-full z-[90] mt-2 rounded-md border border-border/40 bg-popover p-3 shadow-xl"
          >
            <DayPicker
              mode="single"
              selected={value}
              onSelect={(d) => {
                if (!d) return;
                onChange(d);
                setOpen(false);
              }}
              weekStartsOn={1}
              locale={dfLocale}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildTimeOptions(stepMinutes = 15) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      out.push(`${pad2(h)}:${pad2(m)}`);
    }
  }
  return out;
}

export function ScheduleCreateItemModal({
  locale,
  clientId,
  strategies,
  initialDate,
  onClose,
  onCreated,
}: {
  locale: Locale;
  clientId: string;
  strategies: StrategyOption[];
  initialDate: Date;
  onClose: () => void;
  onCreated: (data: {
    strategyId: string;
    id: string;
    draft_id: string;
    scheduled_at: string;
    platform: string;
    format: string;
    title: string;
    caption: string;
    assets: unknown;
    rationale: unknown;
    status: string;
  }) => void;
}) {
  const t = copy[locale];
  const [isPending, startTransition] = useTransition();
  const [aiProgress, setAiProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("manual");
  const [strategyId, setStrategyId] = useState<string>(() => strategies[0]?.id ?? "");

  const [dateValue, setDateValue] = useState<Date>(() => initialDate);
  const [timeStr, setTimeStr] = useState(() => format(initialDate, "HH:mm"));
  const timeOptions = useMemo(() => buildTimeOptions(15), []);
  const [timeMode, setTimeMode] = useState<"preset" | "custom">("preset");

  const selectedStrategy = useMemo(
    () => strategies.find((s) => s.id === strategyId) ?? null,
    [strategies, strategyId]
  );

  const allowedPlatforms = useMemo(
    () => extractAllowedPlatforms(selectedStrategy?.channels),
    [selectedStrategy?.channels]
  );
  const allowedFormats = useMemo(
    () => extractAllowedFormats(selectedStrategy?.formats),
    [selectedStrategy?.formats]
  );

  const [platform, setPlatform] = useState<string>(() => allowedPlatforms[0] ?? "instagram");
  const [formatValue, setFormatValue] = useState<string>(() => allowedFormats[0] ?? "post");

  // keep defaults when strategy changes
  useEffect(() => {
    if (allowedPlatforms.length) {
      setPlatform((p) => (allowedPlatforms.includes(p) ? p : allowedPlatforms[0]));
    }
    if (allowedFormats.length) {
      setFormatValue((f) => (allowedFormats.includes(f) ? f : allowedFormats[0]));
    }
  }, [allowedFormats, allowedPlatforms]);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [assetLines, setAssetLines] = useState<string[]>([""]);
  const [aiPrompt, setAiPrompt] = useState("");

  const scheduledAtISO = useMemo(() => {
    const yyyy = dateValue.getFullYear();
    const mm = pad2(dateValue.getMonth() + 1);
    const dd = pad2(dateValue.getDate());
    return new Date(`${yyyy}-${mm}-${dd}T${timeStr}:00`).toISOString();
  }, [dateValue, timeStr]);

  const isCarousel = String(formatValue).toLowerCase() === "carousel";
  const normalizedAssets = useMemo(
    () => assetLines.map((l) => l.trim()).filter(Boolean),
    [assetLines]
  );
  const canSubmitManual = useMemo(() => {
    if (isCarousel) return normalizedAssets.length >= 2;
    return normalizedAssets.length >= 1;
  }, [isCarousel, normalizedAssets.length]);

  useEffect(() => {
    if (!aiProgress) return;
    const timers: number[] = [];
    // progress hints (simples e úteis; não dependem do backend)
    timers.push(
      window.setTimeout(() => {
        setAiProgress(locale === "pt" ? "A preparar contexto…" : "Preparing context…");
      }, 400)
    );
    timers.push(
      window.setTimeout(() => {
        setAiProgress(locale === "pt" ? "A gerar o post com IA…" : "Generating with AI…");
      }, 1400)
    );
    timers.push(
      window.setTimeout(() => {
        setAiProgress(locale === "pt" ? "A guardar no calendário…" : "Saving to calendar…");
      }, 3200)
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [aiProgress, locale]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="h-[80vh] w-[80vw] max-w-4xl overflow-hidden rounded-md border border-border/40 bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">{locale === "pt" ? "Novo post" : "New post"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {locale === "pt"
                ? "Cria manualmente ou pede à IA uma versão baseada na estratégia."
                : "Create manually or ask AI for a version based on the strategy."}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>

        <div className="h-[calc(80vh-72px)] overflow-y-auto p-6 space-y-6">
          {formError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          ) : null}

          {mode === "ai" && aiProgress ? (
            <div className="flex items-center gap-2 rounded-md border border-border/40 bg-card/60 p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">{aiProgress}</span>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Estratégia" : "Strategy"}</div>
              <Select value={strategyId} onValueChange={setStrategyId}>
                <SelectTrigger>
                  <SelectValue placeholder={locale === "pt" ? "Escolhe a estratégia" : "Pick a strategy"} />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Modo" : "Mode"}</div>
              <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{locale === "pt" ? "Manual" : "Manual"}</SelectItem>
                  <SelectItem value="ai">{locale === "pt" ? "AI (com prompt)" : "AI (with prompt)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DatePickerField
              locale={locale}
              label={locale === "pt" ? "Data" : "Date"}
              value={dateValue}
              onChange={(d) => setDateValue(d)}
            />

            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Hora" : "Time"}</div>
              <Select
                value={timeMode === "custom" ? "__custom__" : timeStr}
                onValueChange={(v) => {
                  if (v === "__custom__") {
                    setTimeMode("custom");
                    return;
                  }
                  setTimeMode("preset");
                  setTimeStr(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="HH:mm" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">{locale === "pt" ? "Custom…" : "Custom…"}</SelectItem>
                </SelectContent>
              </Select>
              {timeMode === "custom" ? (
                <div className="mt-2">
                  <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {locale === "pt"
                  ? "Escolhe um slot (15 min) ou escolhe “Custom…” para definir manualmente."
                  : "Pick a slot (15 min) or choose “Custom…” to type manually."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Plataforma" : "Platform"}</div>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(allowedPlatforms.length ? allowedPlatforms : ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube", "blog"]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Formato" : "Format"}</div>
              <Select value={formatValue} onValueChange={setFormatValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(allowedFormats.length ? allowedFormats : ["post", "reel", "story", "carousel", "short", "video", "thread"]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === "manual" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">{locale === "pt" ? "Título" : "Title"}</div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={locale === "pt" ? "Ex: Lançamento do produto..." : "e.g. Product launch..."} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">
                      {locale === "pt" ? "Assets" : "Assets"}
                      {isCarousel ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {locale === "pt" ? "(mín. 2)" : "(min 2)"}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setAssetLines((prev) => [...prev, ""])}
                    >
                      <Plus className="h-4 w-4" />
                      {locale === "pt" ? "Adicionar" : "Add"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {assetLines.map((line, idx) => (
                      <div key={`asset-${idx}`} className="flex items-center gap-2">
                        <Input
                          value={line}
                          onChange={(e) =>
                            setAssetLines((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))
                          }
                          placeholder={
                            locale === "pt"
                              ? "Ex: Foto do produto em fundo neutro"
                              : "e.g. Product photo on neutral background"
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={assetLines.length <= 1}
                          onClick={() => setAssetLines((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {!canSubmitManual ? (
                    <p className="text-xs text-destructive">
                      {locale === "pt"
                        ? isCarousel
                          ? "Carousel precisa de pelo menos 2 assets."
                          : "Adiciona pelo menos 1 asset."
                        : isCarousel
                          ? "Carousel requires at least 2 assets."
                          : "Add at least 1 asset."}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">{locale === "pt" ? "Texto" : "Caption"}</div>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium">{locale === "pt" ? "Prompt para a IA" : "AI prompt"}</div>
              <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={6} placeholder={locale === "pt" ? "O que queres que este post diga/foco/CTA/ângulo..." : "What should this post say/focus/CTA/angle..."} />
              <p className="text-xs text-muted-foreground">
                {locale === "pt"
                  ? "A IA vai usar toda a estratégia + persona + editorial + settings + plannings recentes + feriados."
                  : "AI uses full strategy + persona + editorial + settings + recent plannings + holidays."}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {locale === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="brand" className="gap-2"
              disabled={isPending || !strategyId || (mode === "manual" && !canSubmitManual)}
              onClick={() =>
                startTransition(async () => {
                  setFormError(null);
                  if (mode === "manual") {
                    const assets = normalizedAssets.map((d) => ({
                      type: "image" as const,
                      description: d,
                      notes: null,
                    }));
                    const res = await createScheduleItemManual(clientId, locale, {
                      strategyId,
                      scheduledAtISO,
                      platform,
                      format: formatValue,
                      title: title.trim() || (locale === "pt" ? "Post manual" : "Manual post"),
                      caption: caption.trim() || "—",
                      assets,
                    });
                    if (res?.item) {
                      onCreated({ strategyId, ...res.item });
                      onClose();
                    }
                    if (res?.error) setFormError(res.error);
                    return;
                  }

                  setAiProgress(locale === "pt" ? "A iniciar…" : "Starting…");
                  const res = await createScheduleItemWithAI(clientId, locale, {
                    strategyId,
                    scheduledAtISO,
                    platform: platform as any,
                    format: formatValue as any,
                    prompt: aiPrompt.trim() || (locale === "pt" ? "Cria um post." : "Create a post."),
                  });
                  setAiProgress(null);
                  if (res?.item) {
                    onCreated({ strategyId, ...res.item });
                    onClose();
                  } else if (res?.error) {
                    setFormError(res.error);
                  }
                })
              }
            >
              {mode === "ai" ? (
                isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )
              ) : null}
              {mode === "ai"
                ? isPending
                  ? locale === "pt"
                    ? "A gerar…"
                    : "Generating…"
                  : locale === "pt"
                    ? "Criar com IA"
                    : "Create with AI"
                : locale === "pt"
                  ? "Criar"
                  : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

