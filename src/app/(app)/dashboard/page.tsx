import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cookies } from "next/headers";
import { copy, getLocale } from "@/lib/i18n";
import { Users, FileText } from "lucide-react";

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="mt-1 text-base text-muted-foreground">
            {t.dashboard.subtitle}
          </p>
        </div>
        <Button asChild variant="brand">
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

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-border/20 bg-surface-1 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t.dashboard.clientsActive}
            </p>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight">{clientCount ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.dashboard.clientsHint}
          </p>
        </Card>
        <Card className="border-border/20 bg-surface-1 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {t.dashboard.profilesReady}
            </p>
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight">{profileCount ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.dashboard.profilesHint}
          </p>
        </Card>
      </div>
    </div>
  );
}
