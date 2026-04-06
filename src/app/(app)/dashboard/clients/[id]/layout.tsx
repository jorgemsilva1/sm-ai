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
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-24 h-fit rounded-xl border border-border/20 bg-surface-1 p-5 shadow-sm">
        <p className="mb-5 text-sm font-semibold text-foreground/80">
          {client.name}
        </p>
        <ClientSidebarNav clientId={client.id} locale={locale} />
      </aside>
      <div>{children}</div>
    </div>
  );
}
