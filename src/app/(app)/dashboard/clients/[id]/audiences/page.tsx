import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";
import { getSavedAudiences } from "@/app/(app)/dashboard/clients/actions";
import { ClientAudiences } from "@/components/clients/client-audiences";

type ClientAudiencesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientAudiencesPage({ params }: ClientAudiencesPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const supabase = await createSupabaseServerClient();

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .single();

  if (clientErr || !client) notFound();

  const { audiences = [] } = await getSavedAudiences(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Audiências" : "Audiences"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Audiências guardadas para reutilizar em campanhas."
            : "Saved audiences for reuse across campaigns."}
        </p>
      </div>
      <ClientAudiences clientId={id} locale={locale} initialAudiences={audiences} />
    </div>
  );
}
