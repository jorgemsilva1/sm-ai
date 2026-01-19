import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientIntegrations, type ClientSocialAccount } from "@/components/clients/client-integrations";

type ClientIntegrationsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientIntegrationsPage({
  params,
}: ClientIntegrationsPageProps) {
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

  const { data: accounts } = await supabase
    .from("client_social_accounts")
    .select("id, provider, provider_account_id, username, display_name, avatar_url, profile_url, scopes, expires_at, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.integrationsSubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard/clients">
            {t.common.backToClients}
          </Link>
        </Button>
      </div>

      <section className="border-b border-border/40 pb-6">
        <h2 className="text-lg font-semibold">
          {t.clients.sections.integrationsTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.clients.sections.integrationsBody}
        </p>
      </section>

      <ClientIntegrations
        locale={locale}
        clientId={client.id}
        accounts={(accounts ?? []) as unknown as ClientSocialAccount[]}
      />
    </div>
  );
}
