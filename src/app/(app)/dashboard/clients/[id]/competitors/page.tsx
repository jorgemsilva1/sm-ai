import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientCompetitorsList } from "@/components/clients/client-competitors";

type ClientCompetitorsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientCompetitorsPage({
  params,
}: ClientCompetitorsPageProps) {
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

  const { data: competitors } = await supabase
    .from("client_competitors")
    .select(
      "id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, notes, swot_strengths, swot_weaknesses, swot_opportunities, swot_threats, created_at, updated_at"
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.competitorsSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="brand">
            <Link href={`/dashboard/clients/${client.id}/competitors/new`}>
              {t.clients.sections.competitorsActions.create}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <ClientCompetitorsList
        clientId={client.id}
        locale={locale}
        competitors={competitors ?? []}
      />
    </div>
  );
}

