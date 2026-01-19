import { useMemo } from "react";
import { format } from "date-fns";
import pt from "date-fns/locale/pt";
import enUS from "date-fns/locale/en-US";
import { Button } from "@/components/ui/button";
import { copy, type Locale } from "@/lib/i18n";

export type SchedulePostDetail = {
  id: string;
  platform: string;
  format: string;
  scheduledAtISO: string;
  title: string;
  caption: string;
  assets: { type: "image" | "video" | "carousel"; description: string; notes: string | null; url?: string | null }[];
  rationale: {
    reason: string;
    strategyReference:
      | { field: string; snippet: string }
      | string
      | null;
  }[];
  draftName?: string | null;
  draftStatus?: string | null;
  strategyTitle?: string | null;
};

export function SchedulePostDetailModal({
  locale,
  post,
  onClose,
}: {
  locale: Locale;
  post: SchedulePostDetail;
  onClose: () => void;
}) {
  const t = copy[locale];
  const labels = t.clients.sections.calendarProgram;
  const dfLocale = locale === "pt" ? pt : enUS;

  const scheduledLabel = useMemo(() => {
    const d = new Date(post.scheduledAtISO);
    return `${format(d, "PPP", { locale: dfLocale })} • ${format(d, "HH:mm", { locale: dfLocale })}`;
  }, [dfLocale, post.scheduledAtISO]);

  const timingWhy = useMemo(() => {
    const match = post.rationale.find(
      (r) => r.strategyReference && typeof r.strategyReference === "object" && r.strategyReference.field === "timing",
    );
    if (!match || !match.strategyReference || typeof match.strategyReference !== "object") return null;
    return { reason: match.reason, snippet: match.strategyReference.snippet };
  }, [post.rationale]);

  const holidayWhy = useMemo(() => {
    const match = post.rationale.find(
      (r) => r.strategyReference && typeof r.strategyReference === "object" && r.strategyReference.field === "holidays",
    );
    if (!match || !match.strategyReference || typeof match.strategyReference !== "object") return null;
    return { reason: match.reason, snippet: match.strategyReference.snippet };
  }, [post.rationale]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div
        className="h-[70vh] w-[70vw] max-w-4xl overflow-hidden rounded-md border border-border/40 bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">{labels.postDetailTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {post.draftName ? (
                <>
                  {post.draftName}
                  {" · "}
                </>
              ) : null}
              {post.platform} · {post.format} · {scheduledLabel}
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

        <div className="h-[calc(70vh-72px)] min-h-0 overflow-y-auto space-y-4 p-6">
          <div className="rounded-md border border-border/40 bg-card/60 p-4">
            <div className="text-base font-semibold">{post.title}</div>
          </div>

          {timingWhy ? (
            <div className="rounded-md border border-border/40 bg-background/40 p-4">
              <div className="text-sm font-semibold">
                {locale === "pt" ? "Data & hora (justificação)" : "Date & time (justification)"}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {locale === "pt" ? "Sugerido porque " : "Suggested because "}
                <span className="text-foreground">{timingWhy.reason}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                timing: &quot;{timingWhy.snippet}&quot;
              </div>
            </div>
          ) : null}

          {holidayWhy ? (
            <div className="rounded-md border border-border/40 bg-background/40 p-4">
              <div className="text-sm font-semibold">
                {locale === "pt" ? "Feriados (consideração)" : "Holidays (consideration)"}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {locale === "pt" ? "Sugerido porque " : "Suggested because "}
                <span className="text-foreground">{holidayWhy.reason}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                holidays: &quot;{holidayWhy.snippet}&quot;
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-border/40 bg-card/60 p-4">
            <div className="text-sm font-semibold">{labels.assetsTitle}</div>
            <div className="mt-3 space-y-2">
              {post.assets.map((asset, idx) => (
                <div
                  key={`${post.id}-asset-${idx}`}
                  className="rounded-md border border-border/40 bg-background/40 p-3"
                >
                  <div className="text-sm font-semibold">
                    {labels.assetLabel.replace("{n}", String(idx + 1))}: {asset.description}
                  </div>
                  {asset.notes ? <div className="mt-1 text-xs text-muted-foreground">{asset.notes}</div> : null}
                  {asset.url ? (
                    <div className="mt-3 overflow-hidden rounded-md border border-border/40 bg-background/60">
                      <img src={asset.url} alt={asset.description} className="h-auto w-full" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{labels.assetsHint}</p>
          </div>

          <div className="rounded-md border border-border/40 bg-card/60 p-4">
            <div className="text-sm font-semibold">{labels.textTitle}</div>
            <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{post.caption}</div>
          </div>

          <div className="rounded-md border border-border/40 bg-card/60 p-4">
            <div className="text-sm font-semibold">{labels.whyTitle}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {post.rationale.map((r, idx) => (
                <li key={`${post.id}-why-${idx}`}>
                  <span className="text-muted-foreground">
                    {locale === "pt" ? "Sugerido porque " : "Suggested because "}
                  </span>
                  {r.reason}
                  {r.strategyReference && typeof r.strategyReference === "object" ? (
                    <span className="text-muted-foreground">
                      {" "}
                      {locale === "pt" ? "— como pedido na estratégia: " : "— as requested in the strategy: "}
                      <span className="font-medium text-foreground">
                        {r.strategyReference.field}
                      </span>
                      : &quot;{r.strategyReference.snippet}&quot;
                    </span>
                  ) : r.strategyReference && typeof r.strategyReference === "string" ? (
                    <span className="text-muted-foreground"> ({r.strategyReference})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

