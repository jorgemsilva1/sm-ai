import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PersonaEditor } from "@/components/clients/client-personas";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientPersonaDetailPageProps = {
  params: Promise<{ id: string; personaId: string }>;
};

export default async function ClientPersonaDetailPage({
  params,
}: ClientPersonaDetailPageProps) {
  const { id, personaId } = await params;
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

  const { data: persona, error: personaError } = await supabase
    .from("client_personas")
    .select(
      "id, name, role_title, avatar_color, age_range, location, location_place_id, location_lat, location_lng, gender, style_preferences, demographics, goals, pain_points, motivations, channels, content_preferences, objections, notes"
    )
    .eq("id", personaId)
    .eq("client_id", client.id)
    .single();

  if (personaError || !persona) {
    notFound();
  }

  const goalOptions =
    locale === "pt"
      ? ["Reconhecimento", "Engagement", "Vendas", "Leads", "Fidelização"]
      : ["Awareness", "Engagement", "Sales", "Leads", "Retention"];
  const channelOptions =
    locale === "pt"
      ? ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"]
      : ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"];
  const painOptions =
    locale === "pt"
      ? ["Pouco tempo", "Baixo alcance", "Sem estratégia", "Orçamento limitado"]
      : ["Low time", "Low reach", "No strategy", "Limited budget"];
  const motivationOptions =
    locale === "pt"
      ? ["Crescimento", "Reconhecimento", "Aprendizagem", "Confiança"]
      : ["Growth", "Recognition", "Learning", "Trust"];
  const contentOptions =
    locale === "pt"
      ? ["Reels/Shorts", "Carrosséis", "Stories", "UGC", "Educativo"]
      : ["Reels/Shorts", "Carousels", "Stories", "UGC", "Educational"];
  const objectionOptions =
    locale === "pt"
      ? ["Preço", "Tempo", "Resultados", "Complexidade"]
      : ["Price", "Time", "Results", "Complexity"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.personasSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href={`/dashboard/clients/${client.id}/personas`}>
              {t.clients.sections.personasTitle}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <PersonaEditor
        clientId={client.id}
        locale={locale}
        persona={persona}
        goalOptions={goalOptions}
        channelOptions={channelOptions}
        painOptions={painOptions}
        motivationOptions={motivationOptions}
        contentOptions={contentOptions}
        objectionOptions={objectionOptions}
      />
    </div>
  );
}
