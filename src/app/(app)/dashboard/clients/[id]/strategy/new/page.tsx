import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientStrategyCreate } from "@/components/clients/client-strategy";

type ClientStrategyCreatePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | {
    [key: string]: string | string[] | undefined;
  };
};

export default async function ClientStrategyCreatePage({
  params,
  searchParams,
}: ClientStrategyCreatePageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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

  const nameParam = resolvedSearchParams?.name;
  const templateParam = resolvedSearchParams?.template;
  const initialTitle = Array.isArray(nameParam) ? nameParam[0] : nameParam;
  const initialTemplateId = Array.isArray(templateParam)
    ? templateParam[0]
    : templateParam;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.strategyCreateSubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/dashboard/clients/${client.id}/strategy`}>
            {t.clients.sections.strategyBackToList}
          </Link>
        </Button>
      </div>

      <ClientStrategyCreate
        clientId={client.id}
        locale={locale}
        initialTitle={initialTitle}
        initialTemplateId={initialTemplateId}
        personas={personas ?? []}
        competitors={competitors ?? []}
        referenceGroups={referenceGroups ?? []}
      />
    </div>
  );
}
