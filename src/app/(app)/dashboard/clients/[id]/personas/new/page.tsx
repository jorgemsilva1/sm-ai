import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientPersonaForm } from "@/components/clients/client-personas";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientPersonaNewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientPersonaNewPage({
  params,
}: ClientPersonaNewPageProps) {
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

      <ClientPersonaForm clientId={client.id} locale={locale} />
    </div>
  );
}
