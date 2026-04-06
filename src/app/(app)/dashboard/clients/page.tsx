import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ClientCreateModal } from "@/components/clients/client-create-modal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.clients.listTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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

      {clients?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="group">
              <Card className="h-full border-border/20 bg-surface-1 p-5 transition-default hover:border-border/50 hover:bg-surface-2">
                <div className="flex items-start gap-3">
                  <Avatar className="size-11 ring-2 ring-border/20">
                    {client.photo_url ? (
                      <AvatarImage src={client.photo_url} alt={client.name} />
                    ) : null}
                    <AvatarFallback className="bg-surface-2 text-sm font-semibold">
                      {client.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold transition-default group-hover:text-brand">
                      {client.name}
                    </h2>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {client.description || t.clients.noDescription}
                    </p>
                  </div>
                </div>
                {client.website ? (
                  <p className="mt-3 truncate text-xs text-brand/70">{client.website}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 bg-surface-1/50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t.clients.emptyState}</p>
        </div>
      )}
    </div>
  );
}
