import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientStrategyEditor } from "@/components/clients/client-strategy";

type ClientStrategyDetailPageProps = {
  params: Promise<{ id: string; strategyId: string }>;
};

export default async function ClientStrategyDetailPage({
  params,
}: ClientStrategyDetailPageProps) {
  const { id, strategyId } = await params;
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

  const { data: strategy, error: strategyError } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, competitor_ids, reference_group_ids, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, is_active, created_at, updated_at"
    )
    .eq("id", strategyId)
    .eq("client_id", client.id)
    .single();

  if (strategyError || !strategy) {
    notFound();
  }

  const { data: personas } = await supabase
    .from("client_personas")
    .select("id, name")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });

  const { data: competitors } = await supabase
    .from("client_competitors")
    .select("id, name")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const { data: referenceGroups } = await supabase
    .from("client_reference_groups")
    .select("id, name")
    .eq("client_id", client.id)
    .order("position", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.strategySubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/clients/${client.id}/strategy`}>
              {t.clients.sections.strategyBackToList}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <ClientStrategyEditor
        clientId={client.id}
        locale={locale}
        strategy={strategy}
        personas={personas ?? []}
        competitors={competitors ?? []}
        referenceGroups={referenceGroups ?? []}
      />
    </div>
  );
}

