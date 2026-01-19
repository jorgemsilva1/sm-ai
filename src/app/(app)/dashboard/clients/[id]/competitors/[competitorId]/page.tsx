import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientCompetitorEditor } from "@/components/clients/client-competitors";

type ClientCompetitorDetailPageProps = {
  params: Promise<{ id: string; competitorId: string }>;
};

export default async function ClientCompetitorDetailPage({
  params,
}: ClientCompetitorDetailPageProps) {
  const { id, competitorId } = await params;
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

  const { data: competitor, error: competitorError } = await supabase
    .from("client_competitors")
    .select(
      "id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, notes, swot_strengths, swot_weaknesses, swot_opportunities, swot_threats, created_at, updated_at"
    )
    .eq("id", competitorId)
    .eq("client_id", client.id)
    .single();

  if (competitorError || !competitor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.competitorsSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/clients/${client.id}/competitors`}>
              {t.clients.sections.competitorsBackToList}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <ClientCompetitorEditor
        clientId={client.id}
        locale={locale}
        competitor={competitor}
      />
    </div>
  );
}

