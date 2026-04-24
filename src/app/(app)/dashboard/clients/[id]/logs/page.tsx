import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

type ClientLogsPageProps = {
  params: Promise<{ id: string }>;
};

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

const ACTION_ICONS: Record<string, string> = {
  published: "✓",
  scheduled: "⏰",
  accepted: "☑",
  failed: "✕",
  retried: "↺",
  deleted: "🗑",
  cancelled: "⊘",
};

export default async function ClientLogsPage({ params }: ClientLogsPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const locale = getLocale(cookieStore);
  const supabase = await createSupabaseServerClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !client) notFound();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, details, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  const logList = (logs ?? []) as ActivityLog[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Registo de Atividade" : "Activity Logs"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Histórico completo de ações para este cliente."
            : "Full history of actions for this client."}
        </p>
      </div>

      {logList.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <p className="text-sm text-muted-foreground">
            {locale === "pt" ? "Sem atividade ainda." : "No activity yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logList.map((log) => {
            const icon = ACTION_ICONS[log.action] ?? "•";
            const date = new Date(log.created_at);
            const title = log.details?.title as string | undefined;
            const platform = log.details?.platform as string | undefined;
            const reason = log.details?.reason as string | undefined;

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-md border border-border/40 bg-card/60 px-4 py-3"
              >
                <span className="mt-0.5 shrink-0 text-sm text-muted-foreground">{icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                    {platform ? (
                      <span className="rounded bg-muted/60 px-1.5 py-0.5 text-xs text-muted-foreground">
                        {platform}
                      </span>
                    ) : null}
                  </div>
                  {title ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{title}</p>
                  ) : null}
                  {reason ? (
                    <p className="mt-0.5 text-xs text-destructive/80">{reason}</p>
                  ) : null}
                </div>
                <time
                  className="shrink-0 text-xs text-muted-foreground"
                  dateTime={log.created_at}
                  title={date.toLocaleString()}
                >
                  {date.toLocaleString(locale === "pt" ? "pt-PT" : "en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
