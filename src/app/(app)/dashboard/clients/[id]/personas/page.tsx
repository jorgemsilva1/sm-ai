import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientPersonasList } from "@/components/clients/client-personas";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientPersonasPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientPersonasPage({
  params,
}: ClientPersonasPageProps) {
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

  const { data: personas } = await supabase
    .from("client_personas")
    .select(
      "id, name, role_title, avatar_color, age_range, location, gender, style_preferences, location_place_id, location_lat, location_lng, demographics, goals, pain_points, motivations, channels, content_preferences, objections, notes, created_at"
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

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
          <Button asChild className="bg-brand text-primary-foreground">
            <Link href={`/dashboard/clients/${client.id}/personas/new`}>
              {t.clients.sections.personasActions.create}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/dashboard/clients">{t.common.backToClients}</Link>
          </Button>
        </div>
      </div>

      <ClientPersonasList clientId={client.id} locale={locale} personas={personas ?? []} />
    </div>
  );
}
