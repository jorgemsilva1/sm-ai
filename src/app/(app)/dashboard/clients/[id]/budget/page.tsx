import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";
import { getAdCampaigns } from "@/app/(app)/dashboard/clients/actions";

type ClientBudgetPageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400",
  pending: "text-amber-400",
  completed: "text-muted-foreground",
  failed: "text-destructive",
  paused: "text-blue-400",
  draft: "text-muted-foreground",
};

function formatCurrency(cents: number | null, currency: string | null): string {
  if (cents == null) return "—";
  const amount = cents / 100;
  const cur = currency ?? "USD";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
}

export default async function ClientBudgetPage({ params }: ClientBudgetPageProps) {
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

  const { campaigns = [] } = await getAdCampaigns(id);

  const totalDailyBudget = campaigns
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + (c.daily_budget_cents ?? 0), 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Orçamento & Campanhas" : "Budget & Campaigns"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Controlo de gastos e campanhas de boost."
            : "Ad spend and boost campaign tracking."}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-md border border-border/40 bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">
            {locale === "pt" ? "Campanhas ativas" : "Active campaigns"}
          </div>
          <div className="mt-1 text-3xl font-semibold">{activeCampaigns}</div>
        </div>
        <div className="rounded-md border border-border/40 bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">
            {locale === "pt" ? "Budget diário total" : "Total daily budget"}
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {formatCurrency(totalDailyBudget, campaigns[0]?.currency ?? "USD")}
          </div>
        </div>
        <div className="rounded-md border border-border/40 bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">
            {locale === "pt" ? "Total de campanhas" : "Total campaigns"}
          </div>
          <div className="mt-1 text-3xl font-semibold">{campaigns.length}</div>
        </div>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <p className="text-sm text-muted-foreground">
            {locale === "pt"
              ? "Sem campanhas ainda. Faz boost de um post publicado para começar."
              : "No campaigns yet. Boost a published post to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="rounded-md border border-border/40 bg-card/60 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{c.platform}</span>
                    <span>·</span>
                    <span className={STATUS_COLORS[c.status] ?? "text-muted-foreground"}>
                      {c.status}
                    </span>
                    {c.start_date ? (
                      <>
                        <span>·</span>
                        <span>
                          {new Date(c.start_date).toLocaleDateString()} →{" "}
                          {c.end_date ? new Date(c.end_date).toLocaleDateString() : "—"}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatCurrency(c.daily_budget_cents, c.currency)}{" "}
                    <span className="text-xs text-muted-foreground">
                      {locale === "pt" ? "/dia" : "/day"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
