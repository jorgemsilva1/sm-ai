import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";
import { ClientSuggestions } from "@/components/clients/client-suggestions";

type ClientSuggestionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientSuggestionsPage({ params }: ClientSuggestionsPageProps) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Sugestões" : "Suggestions"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Recomendações de IA para melhorar o desempenho."
            : "AI-powered recommendations to improve performance."}
        </p>
      </div>
      <ClientSuggestions clientId={id} locale={locale} />
    </div>
  );
}
