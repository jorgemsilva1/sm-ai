import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientSidebarNav } from "@/components/clients/client-sidebar-nav";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
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
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="h-fit border border-border/40 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {client.name}
        </p>
        <ClientSidebarNav clientId={client.id} locale={locale} />
      </aside>
      <div>{children}</div>
    </div>
  );
}
