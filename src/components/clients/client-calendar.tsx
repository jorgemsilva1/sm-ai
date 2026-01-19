"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type CalendarProps,
  type Messages,
  type View,
  type Event as RBCEvent,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { addDays, addMonths, addWeeks, format, getDay, parse, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { enUS } from "date-fns/locale/en-US";
import { Button } from "@/components/ui/button";
import { copy, Locale } from "@/lib/i18n";
import { SchedulePostEditorModal, type ScheduleEditorPost } from "@/components/clients/schedule-post-editor-modal";
import { ScheduleCreateItemModal } from "@/components/clients/schedule-create-item-modal";
import {
  applyScheduleItemCopyProposal,
  deleteScheduleItem,
  generateScheduleItemAssetImage,
  generateScheduleItemAssets,
  previewRegenerateScheduleItemText,
  setScheduleItemStatus,
  updateScheduleItemChannel,
  updateScheduleItemDatetime,
  updateScheduleItemText,
} from "@/app/(app)/dashboard/clients/actions";

const DragAndDropCalendar = withDragAndDrop<CalendarEvent, object>(
  Calendar as unknown as React.ComponentType<CalendarProps<CalendarEvent, object>>,
);

function allowedPlatformsFromChannels(channels?: string | null) {
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

function allowedFormatsFromFormats(formats?: string | null) {
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

export type CalendarEvent = RBCEvent & {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    kind?: "post" | "holiday" | "celebration";
    clientId?: string;
    clientName?: string;
    clientPhotoUrl?: string | null;
    postTitle?: string;
    allowedPlatforms?: string[];
    allowedFormats?: string[];
    status?: "suggested" | "accepted" | string;
    platform?: string;
    id?: string;
    draftId?: string | null;
    draftName?: string | null;
    draftStatus?: string | null;
    strategyTitle?: string | null;
    scheduledAtISO?: string;
    format?: string;
    caption?: string;
    assets?: unknown;
    rationale?: unknown;
    holidayName?: string;
    holidayType?: string;
    countryCode?: string;
  };
};

export function ClientCalendar({
  locale,
  clientId,
  clientName,
  clientPhotoUrl,
  strategies,
  events,
}: {
  locale: Locale;
  clientId: string;
  clientName: string;
  clientPhotoUrl: string | null;
  strategies: Array<{ id: string; title: string; channels?: string | null; formats?: string | null }>;
  events?: CalendarEvent[];
}) {
  const t = copy[locale];
  const labels = t.clients.sections.calendarViews;
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(() => new Date());
  const [editor, setEditor] = useState<ScheduleEditorPost | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date>(() => new Date());
  const [addedEvents, setAddedEvents] = useState<CalendarEvent[]>([]);
  const [deletedIds, setDeletedIds] = useState<Record<string, true>>({});
  const [overrides, setOverrides] = useState<
    Record<
      string,
      {
        start?: Date;
        end?: Date;
        title?: string;
        resource?: Partial<NonNullable<CalendarEvent["resource"]>>;
      }
    >
  >({});

  const mergedEvents = useMemo(() => {
    const base = events ?? [];
    return [...base, ...addedEvents]
      .filter((e) => {
        const id = e.resource?.id;
        return id ? !deletedIds[id] : true;
      })
      .map((e) => {
        const id = e.resource?.id;
        if (!id) return e;
        const o = overrides[id];
        if (!o) return e;
        return {
          ...e,
          start: o.start ?? e.start,
          end: o.end ?? e.end,
          title: o.title ?? e.title,
          resource: { ...(e.resource ?? {}), ...(o.resource ?? {}) },
        };
      });
  }, [addedEvents, deletedIds, events, overrides]);

  const localizer = useMemo(() => {
    const locales = { "en-US": enUS, pt };
    return dateFnsLocalizer({
      format,
      parse,
      startOfWeek: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }),
      getDay,
      locales,
    });
  }, []);

  const title = useMemo(() => {
    const fmt = locale === "pt" ? "MMMM yyyy" : "MMMM yyyy";
    return format(date, fmt, { locale: locale === "pt" ? pt : enUS });
  }, [date, locale]);

  const messages: Messages = useMemo(() => {
    if (locale === "pt") {
      return {
        next: labels.next,
        previous: labels.prev,
        today: labels.today,
        month: labels.month,
        week: labels.week,
        day: labels.day,
        agenda: "Agenda",
        date: "Data",
        time: "Hora",
        event: "Evento",
        noEventsInRange: "Sem eventos neste intervalo.",
        showMore: (total: number) => `+${total} mais`,
      };
    }
    return {
      next: labels.next,
      previous: labels.prev,
      today: labels.today,
      month: labels.month,
      week: labels.week,
      day: labels.day,
      agenda: "Agenda",
      date: "Date",
      time: "Time",
      event: "Event",
      noEventsInRange: "No events in this range.",
      showMore: (total: number) => `+${total} more`,
    };
  }, [labels, locale]);

  const navigate = (direction: "today" | "prev" | "next") => {
    if (direction === "today") {
      setDate(new Date());
      return;
    }
    const delta =
      view === "month"
        ? (d: Date, amount: number) => addMonths(d, amount)
        : view === "week"
          ? (d: Date, amount: number) => addWeeks(d, amount)
          : (d: Date, amount: number) => addDays(d, amount);
    setDate((prev) => delta(prev, direction === "next" ? 1 : -1));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[160px] text-sm font-semibold">{title}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("today")}>
            {labels.today}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("prev")}>
            {labels.prev}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("next")}>
            {labels.next}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === "day" ? "default" : "outline"}
            className={view === "day" ? "bg-brand text-primary-foreground" : ""}
            onClick={() => setView("day")}
          >
            {labels.day}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "week" ? "default" : "outline"}
            className={view === "week" ? "bg-brand text-primary-foreground" : ""}
            onClick={() => setView("week")}
          >
            {labels.week}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "month" ? "default" : "outline"}
            className={view === "month" ? "bg-brand text-primary-foreground" : ""}
            onClick={() => setView("month")}
          >
            {labels.month}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border/40 bg-card/60 p-2">
        <DragAndDropCalendar
          localizer={localizer}
          culture={locale === "pt" ? "pt" : "en-US"}
          events={mergedEvents}
          startAccessor="start"
          endAccessor="end"
          date={date}
          view={view}
          views={["month", "week", "day"]}
          onView={(next: View) => setView(next)}
          onNavigate={(nextDate: Date) => setDate(nextDate)}
          toolbar={false}
          popup
          selectable
          className="sm-rbc"
          style={{ height: "70vh", minHeight: 560 }}
          messages={messages}
          draggableAccessor={(event: CalendarEvent) => event?.resource?.kind === "post"}
          onSelectSlot={({ start }) => {
            setCreateDate(start as Date);
            setCreateOpen(true);
          }}
          onEventDrop={({ event, start }) => {
            const r = (event as CalendarEvent).resource;
            if (!r?.id || r.kind !== "post") return;
            const clientId = r.clientId;
            if (!clientId) return;
            const nextISO = (start as Date).toISOString();
            setOverrides((prev) => ({
              ...prev,
              [r.id]: {
                ...(prev[r.id] ?? {}),
                start: start as Date,
                end: new Date((start as Date).getTime() + 30 * 60 * 1000),
                resource: { scheduledAtISO: nextISO },
              },
            }));
            void updateScheduleItemDatetime(r.id, clientId, locale, nextISO);
          }}
          onSelectEvent={(event: CalendarEvent) => {
            const r = event.resource;
            if (r?.kind === "holiday" || r?.kind === "celebration") return;
            if (!r?.id || !r.scheduledAtISO || !r.platform || !r.format) return;
            if (!r.caption || !r.assets || !r.rationale) return;
            // open editor with full actions
            setEditor({
              id: r.id,
              clientId: String(r.clientId || ""),
              clientName: String((r as any).clientName || clientName),
              clientPhotoUrl: (r as any).clientPhotoUrl ?? clientPhotoUrl ?? null,
              allowedPlatforms: (r.allowedPlatforms ?? []) as string[],
              allowedFormats: (r.allowedFormats ?? []) as string[],
              platform: r.platform,
              format: r.format,
              scheduledAtISO: r.scheduledAtISO,
              title: String(r.postTitle || ""),
              caption: String(r.caption),
              status: r.status === "accepted" ? "accepted" : "suggested",
              assets: r.assets as unknown as ScheduleEditorPost["assets"],
              rationale: r.rationale as unknown as ScheduleEditorPost["rationale"],
              draftName: r.draftName ?? null,
              strategyTitle: r.strategyTitle ?? null,
            });
          }}
          dayPropGetter={(d: Date) => {
            const now = new Date();
            const isToday =
              d.getFullYear() === now.getFullYear() &&
              d.getMonth() === now.getMonth() &&
              d.getDate() === now.getDate();
            return isToday ? { className: "sm-rbc-today" } : {};
          }}
          eventPropGetter={(event: CalendarEvent) => {
            const status = event?.resource?.status;
            const platform = String(event?.resource?.platform || "").toLowerCase();
            const kind = event?.resource?.kind;
            const base = "sm-rbc-event";
            if (kind === "holiday") {
              return { className: `${base} sm-rbc-event-holiday` };
            }
            if (kind === "celebration") {
              return { className: `${base} sm-rbc-event-celebration` };
            }
            const byStatus =
              status === "accepted"
                ? " sm-rbc-event-accepted"
                : status === "suggested"
                  ? " sm-rbc-event-suggested"
                  : "";
            const byPlatform = platform ? ` sm-rbc-event-${platform}` : "";
            return { className: `${base}${byStatus}${byPlatform}` };
          }}
        />
      </div>

      {createOpen ? (
        <ScheduleCreateItemModal
          locale={locale}
          clientId={clientId}
          strategies={strategies}
          initialDate={createDate}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            const strategy = strategies.find((s) => s.id === created.strategyId) ?? null;
            const strategyTitle = strategy?.title ?? null;
            const allowedPlatforms = allowedPlatformsFromChannels(strategy?.channels);
            const allowedFormats = allowedFormatsFromFormats(strategy?.formats);
            const draftName = locale === "pt" ? "Manual" : "Manual";
            const start = new Date(created.scheduled_at);
            const end = new Date(start.getTime() + 30 * 60 * 1000);

            const ev: CalendarEvent = {
              title: `${draftName} • ${String(created.platform).toUpperCase()}: ${created.title}`,
              start,
              end,
              resource: {
                kind: "post" as const,
                clientId,
                clientName,
                clientPhotoUrl,
                postTitle: created.title,
                status: created.status,
                platform: created.platform,
                format: created.format,
                id: created.id,
                draftId: created.draft_id,
                draftStatus: "draft",
                draftName,
                strategyTitle,
                scheduledAtISO: created.scheduled_at,
                caption: created.caption,
                assets: created.assets,
                rationale: created.rationale,
                allowedPlatforms,
                allowedFormats,
              },
            };

            setAddedEvents((prev) => [ev, ...prev]);
            setEditor({
              id: created.id,
              clientId,
              clientName,
              clientPhotoUrl,
              allowedPlatforms,
              allowedFormats,
              platform: created.platform,
              format: created.format,
              scheduledAtISO: created.scheduled_at,
              title: created.title,
              caption: created.caption,
              status: created.status === "accepted" ? "accepted" : "suggested",
              assets: created.assets as unknown as ScheduleEditorPost["assets"],
              rationale: created.rationale as unknown as ScheduleEditorPost["rationale"],
              draftName,
              strategyTitle,
            });
          }}
        />
      ) : null}

      {editor ? (
        <SchedulePostEditorModal
          locale={locale}
          post={editor}
          onClose={() => setEditor(null)}
          onDelete={async () => {
            await deleteScheduleItem(editor.id, editor.clientId, locale);
            setDeletedIds((prev) => ({ ...prev, [editor.id]: true }));
            setEditor(null);
          }}
          onToggleStatus={async (next) => {
            const res = await setScheduleItemStatus(editor.id, editor.clientId, locale, next);
            if (res?.item) {
              setEditor((prev) => (prev ? { ...prev, status: res.item!.status as "suggested" | "accepted" } : prev));
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  resource: { ...(prev[editor.id]?.resource ?? {}), status: res.item!.status },
                },
              }));
            }
          }}
          onSaveText={async (next) => {
            const res = await updateScheduleItemText(editor.id, editor.clientId, locale, next);
            if (res?.item) {
              setEditor((prev) => (prev ? { ...prev, title: res.item!.title, caption: res.item!.caption } : prev));
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  title: `${editor.draftName ?? ""} • ${String(editor.platform).toUpperCase()}: ${res.item!.title}`.trim(),
                  resource: { ...(prev[editor.id]?.resource ?? {}), postTitle: res.item!.title, caption: res.item!.caption },
                },
              }));
            }
          }}
          onSaveDateTime={async (nextISO) => {
            const res = await updateScheduleItemDatetime(editor.id, editor.clientId, locale, nextISO);
            if (res?.item) {
              setEditor((prev) => (prev ? { ...prev, scheduledAtISO: res.item!.scheduled_at } : prev));
              const start = new Date(res.item!.scheduled_at);
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  start,
                  end: new Date(start.getTime() + 30 * 60 * 1000),
                  resource: { ...(prev[editor.id]?.resource ?? {}), scheduledAtISO: res.item!.scheduled_at },
                },
              }));
            }
          }}
          onGenerateAssets={async () => {
            const res = await generateScheduleItemAssets(editor.id, editor.clientId, locale);
            if (res?.item) {
              setEditor((prev) =>
                prev
                  ? {
                      ...prev,
                      assets: res.item!.assets as unknown as ScheduleEditorPost["assets"],
                    }
                  : prev
              );
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  resource: { ...(prev[editor.id]?.resource ?? {}), assets: res.item!.assets },
                },
              }));
            }
          }}
          onGenerateAssetImage={async (assetIndex) => {
            const res = await generateScheduleItemAssetImage(editor.id, editor.clientId, locale, assetIndex);
            if (res?.item) {
              setEditor((prev) =>
                prev
                  ? {
                      ...prev,
                      assets: res.item!.assets as unknown as ScheduleEditorPost["assets"],
                    }
                  : prev
              );
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  resource: { ...(prev[editor.id]?.resource ?? {}), assets: res.item!.assets },
                },
              }));
            }
          }}
          onChangeChannel={async (next) => {
            const res = await updateScheduleItemChannel(editor.id, editor.clientId, locale, next);
            if (res?.item) {
              setEditor((prev) =>
                prev
                  ? {
                      ...prev,
                      platform: res.item!.platform,
                      format: res.item!.format,
                    }
                  : prev
              );
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  resource: {
                    ...(prev[editor.id]?.resource ?? {}),
                    platform: res.item!.platform,
                    format: res.item!.format,
                  },
                },
              }));
            }
          }}
          onPreviewRegenerateText={async () => {
            const res = await previewRegenerateScheduleItemText(editor.id, editor.clientId, locale);
            if (!res?.proposal) return null;
            return {
              title: res.proposal.title,
              caption: res.proposal.caption,
              rationale: res.proposal.rationale as unknown as ScheduleEditorPost["rationale"],
            };
          }}
          onApplyRegeneratedText={async (proposal) => {
            const res = await applyScheduleItemCopyProposal(editor.id, editor.clientId, locale, proposal);
            if (res?.item) {
              setEditor((prev) =>
                prev
                  ? {
                      ...prev,
                      title: res.item!.title,
                      caption: res.item!.caption,
                      rationale: res.item!.rationale as unknown as ScheduleEditorPost["rationale"],
                    }
                  : prev
              );
              setOverrides((prev) => ({
                ...prev,
                [editor.id]: {
                  ...(prev[editor.id] ?? {}),
                  title: `${editor.draftName ?? ""} • ${String(editor.platform).toUpperCase()}: ${res.item!.title}`.trim(),
                  resource: {
                    ...(prev[editor.id]?.resource ?? {}),
                    postTitle: res.item!.title,
                    caption: res.item!.caption,
                    rationale: res.item!.rationale,
                  },
                },
              }));
            }
          }}
        />
      ) : null}
    </div>
  );
}

