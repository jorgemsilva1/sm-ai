import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientCompetitorCreate } from "@/components/clients/client-competitors";

type ClientCompetitorCreatePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | {
    [key: string]: string | string[] | undefined;
  };
};

export default async function ClientCompetitorCreatePage({
  params,
  searchParams,
}: ClientCompetitorCreatePageProps) {
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

  const nameParam = resolvedSearchParams?.name;
  const initialName = Array.isArray(nameParam) ? nameParam[0] : nameParam;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.competitorsCreateSubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/dashboard/clients/${client.id}/competitors`}>
            {t.clients.sections.competitorsBackToList}
          </Link>
        </Button>
      </div>

      <ClientCompetitorCreate
        clientId={client.id}
        locale={locale}
        initialName={initialName}
      />
    </div>
  );
}

