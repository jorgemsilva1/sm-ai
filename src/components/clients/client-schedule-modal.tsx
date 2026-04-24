"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import pt from "date-fns/locale/pt";
import enUS from "date-fns/locale/en-US";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import { SchedulePostDetailModal } from "@/components/clients/schedule-post-detail-modal";
import {
  acceptScheduleItem,
  initScheduleDraft,
  generateScheduleDraftPost,
  retryScheduleItem,
} from "@/app/(app)/dashboard/clients/actions";

type StrategyOption = { id: string; title: string; is_active?: boolean | null };

type Asset = {
  id: string;
  type: "image" | "video";
  label: string;
  ratio: "1:1" | "4:5" | "9:16" | "16:9";
  durationSec?: number;
};

type SuggestedPost = {
  id: string;
  platform: string;
  format: string;
  scheduledAtISO: string;
  scheduledAtLabel: string;
  title: string;
  caption: string;
  assets: { type: "image" | "video" | "carousel"; description: string; notes: string | null; url?: string | null }[];
  rationale: {
    reason: string;
    strategyReference: { field: string; snippet: string } | string | null;
  }[];
  status: "suggested" | "accepted" | "retrying";
  contentGroup?: string | null;
};

type Step = "setup" | "thinking" | "generating" | "review";

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function DatePickerField({
  locale,
  label,
  value,
  onChange,
  fromDate,
}: {
  locale: Locale;
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  fromDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dfLocale = locale === "pt" ? pt : enUS;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
          onClick={() => setOpen((v) => !v)}
        >
          <span>{format(value, "PPP", { locale: dfLocale })}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-50 mt-2 rounded-md border border-border/40 bg-popover p-3 shadow-xl">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={(d) => {
                if (!d) return;
                onChange(d);
                setOpen(false);
              }}
              weekStartsOn={1}
              fromDate={fromDate}
              locale={dfLocale}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function toDateOnly(date: Date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function labelFromISO(locale: Locale, iso: string) {
  const d = new Date(iso);
  const dfLocale = locale === "pt" ? pt : enUS;
  return `${format(d, "dd/MM", { locale: dfLocale })} • ${format(d, "HH:mm", { locale: dfLocale })}`;
}

function normalizeAssets(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const obj = a as any;
      const type = String(obj.type || "").toLowerCase();
      if (type !== "image" && type !== "video" && type !== "carousel") return null;
      const description = String(obj.description || "").trim();
      if (!description) return null;
      const notes = obj.notes === null || typeof obj.notes === "string" ? obj.notes : null;
      const url = obj.url === null || typeof obj.url === "string" ? obj.url : null;
      return { type, description, notes, url } as {
        type: "image" | "video" | "carousel";
        description: string;
        notes: string | null;
        url?: string | null;
      };
    })
    .filter(Boolean) as Array<{
    type: "image" | "video" | "carousel";
    description: string;
    notes: string | null;
    url?: string | null;
  }>;
}

function normalizeRationale(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const obj = r as any;
      const reason = String(obj.reason || "").trim();
      if (!reason) return null;
      const sr = obj.strategyReference;
      if (sr && typeof sr === "object") {
        const field = String((sr as any).field || "").trim();
        const snippet = String((sr as any).snippet || "").trim();
        if (field && snippet) return { reason, strategyReference: { field, snippet } };
      }
      if (typeof sr === "string") return { reason, strategyReference: sr };
      return { reason, strategyReference: null };
    })
    .filter(Boolean) as Array<{
    reason: string;
    strategyReference: { field: string; snippet: string } | string | null;
  }>;
}

// Nota: o popup de detalhe foi extraído para `SchedulePostDetailModal` para ser reutilizável também no calendário.

export function ScheduleGeneratorModal({
  locale,
  strategies,
  clientId,
  timezone,
}: {
  locale: Locale;
  strategies: StrategyOption[];
  clientId: string;
  timezone?: string | null;
}) {
  const t = copy[locale];
  const labels = t.clients.sections.calendarProgram;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("setup");

  const today = useMemo(() => new Date(), []);
  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState<Date>(() => today);
  const [endDate, setEndDate] = useState<Date>(() => addDays(today, 7));

  const [strategyId, setStrategyId] = useState("");
  const selectedStrategyTitle = useMemo(
    () => strategies.find((s) => s.id === strategyId)?.title ?? "",
    [strategies, strategyId]
  );

  const [posts, setPosts] = useState<SuggestedPost[]>([]);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [generatingDone, setGeneratingDone] = useState(0);
  const [generatingTotal, setGeneratingTotal] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [, startTransition] = useTransition();

  const [retryFeedbackPostId, setRetryFeedbackPostId] = useState<string | null>(null);
  const [retryFeedback, setRetryFeedback] = useState("");
  const [retryNewFormat, setRetryNewFormat] = useState("");

  // set default strategy when opening
  useEffect(() => {
    if (!open) return;
    if (!strategies.length) {
      setStrategyId("");
      return;
    }
    const next = strategies.find((s) => s.is_active)?.id ?? strategies[0].id;
    setStrategyId((prev) => (prev ? prev : next));
  }, [open, strategies]);

  const closeAll = () => {
    setOpen(false);
    setStep("setup");
    setPosts([]);
    setDetailPostId(null);
    setDraftId(null);
    setGeneratingDone(0);
    setGeneratingTotal(0);
    setSetupError(null);
    setIsRunning(false);
  };

  const canConfirm =
    Boolean(strategyId) && Boolean(startDate) && Boolean(endDate) && startDate <= endDate;

  const confirmAndRun = async () => {
    if (!canConfirm || isRunning) return;
    setIsRunning(true);
    setStep("thinking");
    setSetupError(null);
    setDetailPostId(null);
    setPosts([]);

    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("strategy_id", strategyId);
    fd.set("name", planName);
    fd.set("start_date", toDateOnly(startDate));
    fd.set("end_date", toDateOnly(endDate));
    fd.set("timezone", timezone || "Europe/Lisbon");

    try {
      const initResult = await initScheduleDraft(clientId, {}, fd);
      if (initResult.error || !initResult.draftId || !initResult.slots?.length) {
        setSetupError(initResult.error ?? "Unknown error");
        setStep("setup");
        return;
      }

      const { draftId: newDraftId, slots } = initResult;
      setDraftId(newDraftId);
      setGeneratingTotal(slots.length);
      setGeneratingDone(0);
      setStep("generating");

      // Collect posts in a local array (single JS thread = no race conditions on the array)
      // then setPosts once authoritatively before switching to review.
      const collected: SuggestedPost[] = [];
      const postErrors: string[] = [];

      await Promise.all(
        slots.map(async (slot) => {
          try {
            const res = await generateScheduleDraftPost(newDraftId, clientId, locale as "pt" | "en", slot);
            if (res.item) {
              const row = res.item;
              const post: SuggestedPost = {
                id: row.id,
                platform: row.platform,
                format: row.format,
                scheduledAtISO: row.scheduled_at,
                scheduledAtLabel: labelFromISO(locale, row.scheduled_at),
                title: row.title,
                caption: row.caption,
                assets: normalizeAssets(row.assets),
                rationale: normalizeRationale(row.rationale),
                status: row.status === "accepted" ? "accepted" : "suggested",
                contentGroup: (row as any).content_group ?? null,
              };
              collected.push(post);
              // Show progress in the generating step
              setPosts([...collected]);
            } else if (res.error) {
              postErrors.push(`${slot.platform}/${slot.format}: ${res.error}`);
            }
          } catch (e) {
            postErrors.push(`${slot.platform}/${slot.format}: ${e instanceof Error ? e.message : "Unknown error"}`);
          }
          setGeneratingDone((n) => n + 1);
        })
      );

      if (postErrors.length > 0 && postErrors.length === slots.length) {
        setSetupError(`All posts failed to generate. First error: ${postErrors[0]}`);
        setStep("setup");
        return;
      }

      // Authoritative final set before review — avoids stale closure in concurrent render
      setPosts([...collected]);

      setStep("review");
    } finally {
      setIsRunning(false);
    }
  };

  const acceptPost = (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "accepted" } : p)));
    startTransition(async () => {
      const res = await acceptScheduleItem(postId, clientId, locale);
      if (res?.item) {
        const nextStatus = res.item.status as SuggestedPost["status"];
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status: nextStatus === "scheduled" ? "accepted" : nextStatus,
                  title: res.item!.title,
                  caption: res.item!.caption,
                  assets: res.item!.assets as any,
                  rationale: res.item!.rationale as any,
                }
              : p
          )
        );
      }
    });
  };

  const retryPost = (postId: string, options?: { userFeedback?: string; newFormat?: string }) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "retrying" } : p)));
    setRetryFeedbackPostId(null);
    setRetryFeedback("");
    setRetryNewFormat("");
    startTransition(async () => {
      const res = await retryScheduleItem(postId, clientId, locale, options);
      if (res?.item) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status: res.item!.status === "accepted" ? "accepted" : "suggested",
                  format: res.item!.format ?? p.format,
                  title: res.item!.title,
                  caption: res.item!.caption,
                  assets: res.item!.assets as any,
                  rationale: res.item!.rationale as any,
                }
              : p
          )
        );
      } else {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, status: "suggested" } : p)));
      }
    });
  };

  const detailPost = useMemo(
    () => posts.find((p) => p.id === detailPostId) ?? null,
    [detailPostId, posts]
  );

  return (
    <>
      <Button type="button" variant="brand" onClick={() => setOpen(true)}>
        {labels.create}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={closeAll}>
          <div
            className="h-[80vh] w-[80vw] max-w-5xl overflow-hidden rounded-md border border-border/40 bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">{labels.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
              </div>
              <Button type="button" variant="ghost" onClick={closeAll}>
                {t.common.close}
              </Button>
            </div>

            <div className="h-[calc(80vh-72px)] min-h-0 overflow-y-auto p-6">
              {step === "setup" ? (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="rounded-md border border-border/40 bg-card/60 p-5">
                    <div className="text-sm font-semibold">{labels.setupTitle}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{labels.setupBody}</p>
                    {setupError ? (
                      <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {setupError}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{labels.planName}</div>
                        <input
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                          value={planName}
                          onChange={(e) => setPlanName(e.target.value)}
                          placeholder={labels.planNamePlaceholder}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{labels.strategy}</div>
                        <Select value={strategyId} onValueChange={setStrategyId} disabled={!strategies.length}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={!strategies.length ? labels.noStrategies : labels.strategyPlaceholder}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {strategies.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.title}
                                {s.is_active ? (locale === "pt" ? " (Ativa)" : " (Active)") : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <DatePickerField
                        locale={locale}
                        label={labels.startDate}
                        value={startDate}
                        onChange={(d) => {
                          setStartDate(d);
                          if (d > endDate) setEndDate(d);
                        }}
                      />
                      <DatePickerField
                        locale={locale}
                        label={labels.endDate}
                        value={endDate}
                        fromDate={startDate}
                        onChange={(d) => setEndDate(d)}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">{labels.setupHint}</p>
                      <Button
                        type="button"
                        variant="brand"
                        disabled={!canConfirm || isRunning}
                        onClick={confirmAndRun}
                      >
                        {labels.confirm}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {step === "thinking" ? (
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand" />
                  <div className="text-sm font-semibold">{labels.thinkingTitle}</div>
                  <div className="text-sm text-muted-foreground">{labels.thinkingBody}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {labels.thinkingMeta.replace("{strategy}", selectedStrategyTitle || "—")}
                  </div>
                </div>
              ) : null}

              {step === "generating" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{labels.generatingTitle}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {generatingTotal > 0
                          ? labels.generatingProgress
                              .replace("{done}", String(generatingDone))
                              .replace("{total}", String(generatingTotal))
                          : labels.generatingBody}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand" />
                      {generatingTotal > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {Math.round((generatingDone / generatingTotal) * 100)}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {posts.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {posts.map((post) => (
                        <div key={post.id} className="rounded-md border border-border/40 bg-card/60 p-4 opacity-80">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {post.platform} · {post.format} · {post.scheduledAtLabel}
                            </div>
                            {post.contentGroup ? (
                              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
                                Cross-platform
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm font-semibold">{post.title}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.caption}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === "review" ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{labels.reviewTitle}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{labels.reviewSubtitle}</div>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setStep("setup")}>
                      {labels.back}
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {posts.map((post) => (
                      <div key={post.id} className="rounded-md border border-border/40 bg-card/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {post.platform} · {post.format} · {post.scheduledAtLabel}
                          </div>
                          {post.contentGroup ? (
                            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
                              {locale === "pt" ? "Cross-platform" : "Cross-platform"}
                            </span>
                          ) : null}
                          {post.status === "accepted" ? (
                            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
                              {labels.accepted}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{post.title}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.caption}</div>
                        {post.rationale?.[0]?.strategyReference && typeof post.rationale[0].strategyReference === "object" ? (
                          <div className="mt-3 rounded-md border border-border/40 bg-background/40 p-3 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {locale === "pt" ? "Estratégia → " : "Strategy → "}
                            </span>
                            {locale === "pt" ? "Sugerido porque " : "Suggested because "}
                            <span className="text-foreground">{post.rationale[0].reason}</span>
                            {" — "}
                            {locale === "pt" ? "como pedido na estratégia: " : "as requested in the strategy: "}
                            <span className="font-medium text-foreground">
                              {post.rationale[0].strategyReference.field}
                            </span>
                            : &quot;{post.rationale[0].strategyReference.snippet}&quot;
                          </div>
                        ) : null}

                        {retryFeedbackPostId === post.id ? (
                          <div className="mt-4 space-y-2 rounded-md border border-border/40 bg-muted/30 p-3">
                            <Textarea
                              rows={2}
                              placeholder={labels.retryFeedbackPlaceholder}
                              value={retryFeedback}
                              onChange={(e) => setRetryFeedback(e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Select value={retryNewFormat} onValueChange={setRetryNewFormat}>
                                <SelectTrigger className="h-7 w-36 text-xs">
                                  <SelectValue placeholder={labels.retryChangeFormat} />
                                </SelectTrigger>
                                <SelectContent>
                                  {["post", "reel", "story", "carousel", "short", "video", "thread"].map((f) => (
                                    <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="ml-auto flex items-center gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => { setRetryFeedbackPostId(null); setRetryFeedback(""); setRetryNewFormat(""); }}>
                                  {labels.retryCancel}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="brand"
                                  onClick={() => retryPost(post.id, { userFeedback: retryFeedback || undefined, newFormat: retryNewFormat || undefined })}
                                >
                                  {labels.retryConfirm}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setDetailPostId(post.id)}>
                            {labels.viewDetails}
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="brand"
                              disabled={post.status === "accepted" || post.status === "retrying"}
                              onClick={() => acceptPost(post.id)}
                            >
                              {post.status === "accepted"
                                ? labels.accepted
                                : ["instagram", "facebook", "tiktok"].includes(post.platform)
                                  ? locale === "pt" ? "Aceitar & Agendar" : "Accept & Schedule"
                                  : labels.accept}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={post.status === "retrying"}
                              onClick={() => {
                                if (retryFeedbackPostId === post.id) {
                                  retryPost(post.id);
                                } else {
                                  setRetryFeedbackPostId(post.id);
                                  setRetryFeedback("");
                                  setRetryNewFormat("");
                                }
                              }}
                            >
                              {post.status === "retrying" ? labels.retrying : labels.retry}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {detailPost ? (
            <SchedulePostDetailModal
              locale={locale}
              post={{
                id: detailPost.id,
                platform: detailPost.platform,
                format: detailPost.format,
                scheduledAtISO: detailPost.scheduledAtISO,
                title: detailPost.title,
                caption: detailPost.caption,
                assets: detailPost.assets,
                rationale: detailPost.rationale,
                strategyTitle: selectedStrategyTitle || null,
              }}
              onClose={() => setDetailPostId(null)}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

