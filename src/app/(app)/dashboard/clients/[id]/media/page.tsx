import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { ClientMediaLibrary } from "@/components/clients/client-media-library";
import { getMediaAssets } from "@/app/(app)/dashboard/clients/actions";

type ClientMediaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientMediaPage({ params }: ClientMediaPageProps) {
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

  const { assets = [] } = await getMediaAssets(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t.clients.sections.mediaTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.clients.sections.mediaSubtitle}</p>
      </div>

      <ClientMediaLibrary clientId={id} initialAssets={assets} />
    </div>
  );
}
