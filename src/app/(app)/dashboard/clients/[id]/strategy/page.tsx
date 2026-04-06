import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientStrategyList } from "@/components/clients/client-strategy";

type ClientStrategyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientStrategyPage({
  params,
}: ClientStrategyPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !client) {
    notFound();
  }

  const { data: strategies } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, competitor_ids, reference_group_ids, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, is_active, created_at, updated_at"
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.strategySubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard/clients">
            {t.common.backToClients}
          </Link>
        </Button>
      </div>

      <ClientStrategyList clientId={client.id} locale={locale} strategies={strategies ?? []} />
    </div>
  );
}
