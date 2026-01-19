import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientCreateModal } from "@/components/clients/client-create-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

export default async function ClientsPage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, website, description, photo_url, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t.clients.listTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {t.clients.listSubtitle}
          </p>
        </div>
        <ClientCreateModal locale={locale} />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{t.clients.loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="divide-y divide-border/40 rounded-md border border-border/40">
        {clients?.length ? (
          clients.map((client) => (
            <div key={client.id} className="p-5">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10">
                    {client.photo_url ? (
                      <AvatarImage src={client.photo_url} alt={client.name} />
                    ) : null}
                    <AvatarFallback>
                      {client.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">{client.name}</h2>
                    <div className="text-sm text-muted-foreground">
                      {client.description || t.clients.noDescription}
                    </div>
                    {client.website ? (
                      <a
                        href={client.website}
                        className="text-sm text-brand hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {client.website}
                      </a>
                    ) : null}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/clients/${client.id}`}>
                    {t.clients.clientProfile}
                  </Link>
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            {t.clients.emptyState}
          </div>
        )}
      </div>
    </div>
  );
}
