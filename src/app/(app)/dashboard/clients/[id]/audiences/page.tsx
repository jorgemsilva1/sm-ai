import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientAudiencesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientAudiencesPage({
  params,
}: ClientAudiencesPageProps) {
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
            {t.clients.sections.audiencesSubtitle}
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
          {t.clients.sections.audiencesTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.clients.sections.audiencesBody}
        </p>
      </section>
    </div>
  );
}
