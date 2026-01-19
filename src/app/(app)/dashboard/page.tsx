import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const t = copy[locale];
  const supabase = await createSupabaseServerClient();

  const [{ count: clientCount, error: clientError }, { count: profileCount }] =
    await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase
        .from("client_profiles")
        .select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.dashboard.subtitle}
          </p>
        </div>
        <Button asChild className="bg-brand text-primary-foreground">
          <Link href="/dashboard/clients">{t.dashboard.newClient}</Link>
        </Button>
      </div>

      {clientError ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>
            {t.dashboard.loadError}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/40 bg-card/80 p-6">
          <p className="text-sm text-muted-foreground">
            {t.dashboard.clientsActive}
          </p>
          <p className="mt-3 text-3xl font-semibold">{clientCount ?? 0}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.dashboard.clientsHint}
          </p>
        </Card>
        <Card className="border-border/40 bg-card/80 p-6">
          <p className="text-sm text-muted-foreground">
            {t.dashboard.profilesReady}
          </p>
          <p className="mt-3 text-3xl font-semibold">{profileCount ?? 0}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t.dashboard.profilesHint}
          </p>
        </Card>
      </div>
    </div>
  );
}
