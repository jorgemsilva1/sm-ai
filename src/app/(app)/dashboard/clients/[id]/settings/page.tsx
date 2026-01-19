import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientSettingsForm } from "@/components/clients/client-info-form";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientSettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientSettingsPage({
  params,
}: ClientSettingsPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();

  const withNewCols = await supabase
    .from("clients")
    .select("id, name, website, description, photo_url, notes, country_code, timezone, default_locale")
    .eq("id", id)
    .single();

  const fallback = await supabase
    .from("clients")
    .select("id, name, website, description, photo_url, notes, country_code")
    .eq("id", id)
    .single();

  const client =
    withNewCols.data ??
    (fallback.data
      ? ({ ...(fallback.data as any), timezone: "Europe/Lisbon", default_locale: locale } as any)
      : null);
  const error = withNewCols.error && !withNewCols.data ? withNewCols.error : fallback.error;

  if (error || !client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.settingsSubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard/clients">
            {t.common.backToClients}
          </Link>
        </Button>
      </div>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">
          {t.clients.sections.settingsTitle}
        </h2>
        <ClientSettingsForm
          clientId={client.id}
          locale={locale}
          defaultValues={{
            name: client.name,
            website: client.website,
            description: client.description,
            photo_url: client.photo_url,
            notes: client.notes,
            country_code: client.country_code ?? "PT",
            timezone: (client as { timezone?: string | null }).timezone ?? "Europe/Lisbon",
            default_locale: (client as { default_locale?: string | null }).default_locale ?? locale,
          }}
        />
      </section>
    </div>
  );
}
