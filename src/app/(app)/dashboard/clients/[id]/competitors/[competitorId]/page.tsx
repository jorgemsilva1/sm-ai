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

  // Try with all columns first (including new progress columns)
  let competitor = null;
  let competitorError = null;

  const withAICols = await supabase
    .from("client_competitors")
    .select(
      "id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, notes, ai_profile, ai_profile_status, ai_profile_error, ai_profile_updated_at, ai_profile_progress, ai_profile_stage, created_at, updated_at"
    )
    .eq("id", competitorId)
    .eq("client_id", client.id)
    .single();

  if (withAICols.data) {
    competitor = withAICols.data;
  } else if (withAICols.error) {
    // If error, try without progress columns (they might not exist yet)
    const withoutProgress = await supabase
      .from("client_competitors")
      .select(
        "id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, notes, ai_profile, ai_profile_status, ai_profile_error, ai_profile_updated_at, created_at, updated_at"
      )
      .eq("id", competitorId)
      .eq("client_id", client.id)
      .single();

    if (withoutProgress.data) {
      competitor = withoutProgress.data;
    } else {
      // Final fallback: basic columns only
      const basic = await supabase
        .from("client_competitors")
        .select(
          "id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, notes, created_at, updated_at"
        )
        .eq("id", competitorId)
        .eq("client_id", client.id)
        .single();

      if (basic.data) {
        competitor = basic.data;
      } else {
        competitorError = basic.error;
      }
    }
  }

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

