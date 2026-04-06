import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientCalendar } from "@/components/clients/client-calendar";
import { ScheduleGeneratorModal } from "@/components/clients/client-schedule-modal";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { addDays, addMinutes } from "date-fns";
import Holidays from "date-holidays";
import { CalendarTabs } from "@/components/clients/calendar-tabs";

type ClientCalendarPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientCalendarPage({ params }: ClientCalendarPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();

  const withNewCols = await supabase
    .from("clients")
    .select("id, name, photo_url, country_code, timezone, default_locale, client_type")
    .eq("id", id)
    .single();

  const fallback = await supabase
    .from("clients")
    .select("id, name, photo_url, country_code")
    .eq("id", id)
    .single();

  const client =
    withNewCols.data ??
    (fallback.data
      ? ({ 
          ...(fallback.data as any), 
          timezone: "Europe/Lisbon", 
          default_locale: locale,
          client_type: "services",
        } as any)
      : null);
  const error = withNewCols.error && !withNewCols.data ? withNewCols.error : fallback.error;

  if (error || !client) {
    notFound();
  }

  const { data: strategies } = await supabase
    .from("client_strategies")
    .select("id, title, is_active, channels, formats")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const extractAllowedPlatforms = (channels: string | null) => {
    const text = (channels || "").toLowerCase();
    const out = new Set<string>();
    if (/\b(instagram|ig)\b/.test(text)) out.add("instagram");
    if (/\b(tiktok|tik\s*tok)\b/.test(text)) out.add("tiktok");
    if (/\bfacebook|fb\b/.test(text)) out.add("facebook");
    if (/\blinkedin\b/.test(text)) out.add("linkedin");
    if (/\b(youtube|yt)\b/.test(text)) out.add("youtube");
    if (/\bblog\b/.test(text)) out.add("blog");
    if (/\b(twitter|x)\b/.test(text)) out.add("x");
    return Array.from(out);
  };

  const extractAllowedFormats = (formats: string | null) => {
    const text = (formats || "").toLowerCase();
    const out = new Set<string>();
    if (/\b(reel|reels)\b/.test(text)) out.add("reel");
    if (/\b(story|stories)\b/.test(text)) out.add("story");
    if (/\b(carousel|carrossel)\b/.test(text)) out.add("carousel");
    if (/\b(thread|fio)\b/.test(text)) out.add("thread");
    if (/\b(short|shorts)\b/.test(text)) out.add("short");
    if (/\b(video|vídeo)\b/.test(text)) out.add("video");
    if (/\b(post|publicaç)\b/.test(text)) out.add("post");
    return Array.from(out);
  };


  type DraftRow = {
    id: string;
    name: string | null;
    status: string;
    created_at: string;
  };

  type CalendarItemRow = {
    id: string;
    draft_id: string;
    strategy_id: string;
    scheduled_at: string;
    title: string;
    platform: string;
    format: string;
    caption: string;
    assets: unknown;
    rationale: unknown;
    status: string;
  };

  const { data: drafts } = await supabase
    .from("client_schedule_drafts")
    .select("id, name, status, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const draftList: DraftRow[] = (drafts ?? []) as DraftRow[];
  const draftIds = draftList.map((d) => d.id);
  const draftMap = new Map(draftList.map((d) => [d.id, d]));

  const itemsResult: { data: CalendarItemRow[] | null } = draftIds.length
    ? await supabase
        .from("client_schedule_items")
        .select(
          "id, draft_id, strategy_id, scheduled_at, platform, format, title, caption, assets, rationale, status"
        )
        .eq("client_id", client.id)
        .in("draft_id", draftIds)
        .order("scheduled_at", { ascending: true })
    : { data: [] };

  const items = itemsResult.data ?? [];
  const strategyTitleById = new Map((strategies ?? []).map((s) => [s.id, s.title]));
  const allowedPlatformsByStrategyId = new Map(
    (strategies ?? []).map((s) => [s.id, extractAllowedPlatforms((s as any).channels ?? null)]),
  );
  const allowedFormatsByStrategyId = new Map(
    (strategies ?? []).map((s) => [s.id, extractAllowedFormats((s as any).formats ?? null)]),
  );

  const events = items.map((it) => {
    const d = draftMap.get(it.draft_id);
    const draftName = d?.name?.trim() || (locale === "pt" ? "Planificação" : "Schedule");
    const draftStatus = d?.status || "draft";
    const start = new Date(it.scheduled_at);
    const end = addMinutes(start, 30);
    return {
      title: `${draftName} • ${String(it.platform).toUpperCase()}: ${it.title}`,
      start,
      end,
      resource: {
        kind: "post" as const,
        clientId: client.id,
        clientName: client.name,
        clientPhotoUrl: (client as { photo_url?: string | null }).photo_url ?? null,
        postTitle: it.title,
        allowedPlatforms: allowedPlatformsByStrategyId.get(it.strategy_id) ?? [],
        allowedFormats: allowedFormatsByStrategyId.get(it.strategy_id) ?? [],
        status: it.status,
        platform: it.platform,
        id: it.id,
        draftId: it.draft_id,
        draftStatus,
        draftName,
        strategyTitle: strategyTitleById.get(it.strategy_id) ?? null,
        scheduledAtISO: it.scheduled_at,
        format: it.format,
        caption: it.caption,
        assets: it.assets,
        rationale: it.rationale,
      },
    };
  });

  // Holidays (3-year window: prev/current/next)
  const countryCode = String((client as { country_code?: string | null }).country_code || "PT").toUpperCase();
  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const hd = new Holidays(countryCode);
  const holidayEvents =
    years
      .flatMap((y) => {
        try {
          return hd.getHolidays(y) ?? [];
        } catch {
          return [];
        }
      })
      .map((h: { date: string; name: string; type: string }) => {
        const kind = h.type === "observance" || h.type === "optional" ? ("celebration" as const) : ("holiday" as const);
        const date = new Date(h.date);
        const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const end = addDays(start, 1);
        return {
          title:
            kind === "celebration"
              ? locale === "pt"
                ? `Celebração: ${h.name}`
                : `Celebration: ${h.name}`
              : locale === "pt"
                ? `Feriado: ${h.name}`
                : `Holiday: ${h.name}`,
          start,
          end,
          allDay: true,
          resource: {
            kind,
            holidayName: h.name,
            holidayType: h.type,
            countryCode,
          },
        };
      });

  // Fetch business tags for trending topics
  const { data: tagData } = await supabase
    .from("client_business_tags")
    .select("business_tags(slug)")
    .eq("client_id", client.id);

  const businessTags =
    tagData
      ?.map((row) => (row.business_tags as { slug?: string })?.slug)
      .filter((slug): slug is string => Boolean(slug)) ?? [];

  const clientType =
    (client as { client_type?: string }).client_type === "content_creator"
      ? "content_creator"
      : "services";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">{t.clients.sections.calendarSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <ScheduleGeneratorModal
            locale={locale}
            strategies={strategies ?? []}
            clientId={client.id}
            timezone={(client as { timezone?: string | null }).timezone ?? "Europe/Lisbon"}
          />
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <CalendarTabs clientType={clientType} locale={locale} businessTags={businessTags}>
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t.clients.sections.calendarTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t.clients.sections.calendarBody}</p>
          </div>
          <ClientCalendar
            locale={locale}
            clientId={client.id}
            clientName={client.name}
            clientPhotoUrl={(client as { photo_url?: string | null }).photo_url ?? null}
            strategies={(strategies ?? []) as any}
            events={[...holidayEvents, ...events]}
          />
        </section>
      </CalendarTabs>
    </div>
  );
}

