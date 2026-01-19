import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ClientReferences } from "@/components/clients/client-references";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

type ClientReferencesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientReferencesPage({
  params,
}: ClientReferencesPageProps) {
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

  const { data: groups } = await supabase
    .from("client_reference_groups")
    .select("id, name, description, parent_id, created_at")
    .eq("client_id", client.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: items } = await supabase
    .from("client_reference_items")
    .select(
      "id, group_id, owner_id, type, title, url, notes, thumbnail_url, created_at, updated_at"
    )
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });

  const { data: comments } = await supabase
    .from("client_reference_item_comments")
    .select("id, item_id, owner_id, body, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{client.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.referencesSubtitle}
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/dashboard/clients">
            {t.common.backToClients}
          </Link>
        </Button>
      </div>

      <ClientReferences
        clientId={client.id}
        locale={locale}
        groups={groups ?? []}
        items={items ?? []}
        comments={comments ?? []}
      />
    </div>
  );
}
