import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getLocale } from "@/lib/i18n";

type ClientApiDocsPageProps = {
  params: Promise<{ id: string }>;
};

type ActionDoc = {
  name: string;
  description: Record<string, string>;
  params: Array<{ name: string; type: string; description: Record<string, string> }>;
  returns: Record<string, string>;
};

const ACTIONS: ActionDoc[] = [
  {
    name: "acceptScheduleItem(itemId, clientId, locale)",
    description: {
      en: "Accept a suggested post. If a connected social account exists and the scheduled time is in the future, status becomes 'scheduled' and an Inngest publish job is queued.",
      pt: "Aceita um post sugerido. Se existir conta social ativa e a data for futura, o status passa a 'scheduled' e um job Inngest é criado.",
    },
    params: [
      { name: "itemId", type: "string (uuid)", description: { en: "Schedule item ID", pt: "ID do item" } },
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "locale", type: '"en" | "pt"', description: { en: "Response locale", pt: "Locale da resposta" } },
    ],
    returns: { en: "{ success, scheduled, item }", pt: "{ success, scheduled, item }" },
  },
  {
    name: "publishScheduleItemNow(itemId, clientId, locale)",
    description: {
      en: "Immediately queue a post for publishing by setting scheduled_at to now and firing a publish event.",
      pt: "Coloca um post na fila de publicação imediata definindo scheduled_at para agora.",
    },
    params: [
      { name: "itemId", type: "string (uuid)", description: { en: "Schedule item ID", pt: "ID do item" } },
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "locale", type: '"en" | "pt"', description: { en: "Response locale", pt: "Locale da resposta" } },
    ],
    returns: { en: "{ success, item }", pt: "{ success, item }" },
  },
  {
    name: "cancelScheduledPost(itemId, clientId, locale)",
    description: {
      en: "Cancel a scheduled post, reverting it to 'accepted' status.",
      pt: "Cancela um post agendado, revertendo para o estado 'accepted'.",
    },
    params: [
      { name: "itemId", type: "string (uuid)", description: { en: "Schedule item ID", pt: "ID do item" } },
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "locale", type: '"en" | "pt"', description: { en: "Response locale", pt: "Locale da resposta" } },
    ],
    returns: { en: "{ success, item }", pt: "{ success, item }" },
  },
  {
    name: "fetchPostAnalyticsOnDemand(itemId, clientId, locale)",
    description: {
      en: "Fetch engagement metrics for a published post from Meta or TikTok and store in post_analytics.",
      pt: "Obtém métricas de engagement para um post publicado via Meta ou TikTok e guarda em post_analytics.",
    },
    params: [
      { name: "itemId", type: "string (uuid)", description: { en: "Published schedule item ID", pt: "ID do item publicado" } },
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "locale", type: '"en" | "pt"', description: { en: "Response locale", pt: "Locale da resposta" } },
    ],
    returns: { en: "{ analytics: { impressions, reach, engagement, likes, comments, shares, saves, video_views, fetched_at } }", pt: "{ analytics: { ... } }" },
  },
  {
    name: "boostPost(itemId, clientId, locale, params)",
    description: {
      en: "Create a Meta boost campaign for a published Instagram or Facebook post.",
      pt: "Cria uma campanha de boost Meta para um post publicado no Instagram ou Facebook.",
    },
    params: [
      { name: "itemId", type: "string (uuid)", description: { en: "Published post ID", pt: "ID do post publicado" } },
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "params.name", type: "string", description: { en: "Campaign name", pt: "Nome da campanha" } },
      { name: "params.dailyBudgetCents", type: "number", description: { en: "Daily budget in cents (e.g. 1000 = $10)", pt: "Budget diário em cêntimos" } },
      { name: "params.startDate", type: "ISO string", description: { en: "Campaign start date", pt: "Data de início" } },
      { name: "params.endDate", type: "ISO string", description: { en: "Campaign end date", pt: "Data de fim" } },
    ],
    returns: { en: "{ campaign }", pt: "{ campaign }" },
  },
  {
    name: "saveMediaAsset(clientId, locale, payload)",
    description: {
      en: "Save a media asset record after uploading the file to Supabase Storage.",
      pt: "Guarda um registo de asset após upload do ficheiro para o Supabase Storage.",
    },
    params: [
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "payload.name", type: "string", description: { en: "File name", pt: "Nome do ficheiro" } },
      { name: "payload.fileUrl", type: "string", description: { en: "Public URL from Storage", pt: "URL público do Storage" } },
      { name: "payload.fileType", type: '"image" | "video" | "gif"', description: { en: "Asset type", pt: "Tipo de asset" } },
      { name: "payload.mimeType", type: "string", description: { en: "MIME type", pt: "Tipo MIME" } },
    ],
    returns: { en: "{ asset }", pt: "{ asset }" },
  },
  {
    name: "generateSuggestions(clientId, locale)",
    description: {
      en: "Generate AI-powered content strategy suggestions based on post history, analytics, and competitor data.",
      pt: "Gera sugestões de estratégia com IA baseadas no histórico de posts, analytics e competidores.",
    },
    params: [
      { name: "clientId", type: "string (uuid)", description: { en: "Client ID", pt: "ID do cliente" } },
      { name: "locale", type: '"en" | "pt"', description: { en: "Response locale", pt: "Locale da resposta" } },
    ],
    returns: { en: "{ suggestions: Array<{ type, title, body, action? }> }", pt: "{ suggestions: Array<{ type, title, body, action? }> }" },
  },
];

const INNGEST_JOBS = [
  {
    id: "publish-due-posts",
    trigger: { en: "Cron: every minute", pt: "Cron: cada minuto" },
    description: {
      en: "Finds all posts with status='scheduled' and scheduled_at ≤ now, fires publish events (max 10/run).",
      pt: "Encontra posts com status='scheduled' e scheduled_at ≤ now, dispara eventos de publicação (máx 10/execução).",
    },
  },
  {
    id: "publish-scheduled-post",
    trigger: { en: "Event: post/publish.execute", pt: "Evento: post/publish.execute" },
    description: {
      en: "Publishes a single post to its platform (Instagram, Facebook, TikTok). Retries up to 5 times on failure.",
      pt: "Publica um post na plataforma (Instagram, Facebook, TikTok). Tenta até 5 vezes em caso de falha.",
    },
  },
  {
    id: "refresh-meta-tokens",
    trigger: { en: "Cron: daily at 3 AM UTC", pt: "Cron: diariamente às 3h UTC" },
    description: {
      en: "Refreshes Meta long-lived tokens expiring within 10 days.",
      pt: "Renova tokens Meta de longa duração que expiram em 10 dias.",
    },
  },
  {
    id: "refresh-tiktok-tokens",
    trigger: { en: "Cron: every 12 hours", pt: "Cron: cada 12 horas" },
    description: {
      en: "Refreshes TikTok access tokens expiring within 6 hours.",
      pt: "Renova tokens de acesso TikTok que expiram em 6 horas.",
    },
  },
  {
    id: "fetch-post-analytics",
    trigger: { en: "Cron: every 6 hours", pt: "Cron: cada 6 horas" },
    description: {
      en: "Fetches engagement metrics for all posts published in the last 30 days.",
      pt: "Obtém métricas de engagement para todos os posts publicados nos últimos 30 dias.",
    },
  },
];

export default async function ClientApiDocsPage({ params }: ClientApiDocsPageProps) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">
          {locale === "pt" ? "Documentação API" : "API Reference"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === "pt"
            ? "Referência de server actions e jobs de background para integrações."
            : "Server actions and background jobs reference for integrations."}
        </p>
      </div>

      {/* Server Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {locale === "pt" ? "Server Actions" : "Server Actions"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {locale === "pt"
            ? "Importa de @/app/(app)/dashboard/clients/actions. Todas as actions são 'use server' e requerem autenticação."
            : "Import from @/app/(app)/dashboard/clients/actions. All actions are 'use server' and require authentication."}
        </p>
        <div className="space-y-3">
          {ACTIONS.map((action) => (
            <div key={action.name} className="rounded-md border border-border/40 bg-card/60 p-4 space-y-3">
              <code className="block text-sm font-mono text-brand">{action.name}</code>
              <p className="text-sm text-muted-foreground">{action.description[locale]}</p>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {locale === "pt" ? "Parâmetros" : "Parameters"}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-left">
                        <th className="pb-1 pr-4 text-muted-foreground font-medium">{locale === "pt" ? "Nome" : "Name"}</th>
                        <th className="pb-1 pr-4 text-muted-foreground font-medium">{locale === "pt" ? "Tipo" : "Type"}</th>
                        <th className="pb-1 text-muted-foreground font-medium">{locale === "pt" ? "Descrição" : "Description"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {action.params.map((p) => (
                        <tr key={p.name} className="border-b border-border/20">
                          <td className="py-1 pr-4 font-mono text-foreground">{p.name}</td>
                          <td className="py-1 pr-4 font-mono text-muted-foreground">{p.type}</td>
                          <td className="py-1 text-muted-foreground">{p.description[locale]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">
                  {locale === "pt" ? "Retorna: " : "Returns: "}
                </span>
                <code className="font-mono">{action.returns[locale]}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Background Jobs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {locale === "pt" ? "Jobs de Background (Inngest)" : "Background Jobs (Inngest)"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {locale === "pt"
            ? "Jobs geridos pelo Inngest. Em desenvolvimento, acede ao painel em http://localhost:8288."
            : "Jobs managed by Inngest. In development, access the dashboard at http://localhost:8288."}
        </p>
        <div className="space-y-2">
          {INNGEST_JOBS.map((job) => (
            <div key={job.id} className="flex items-start gap-4 rounded-md border border-border/40 bg-card/60 px-4 py-3">
              <div className="min-w-0 flex-1">
                <code className="text-xs font-mono text-brand">{job.id}</code>
                <p className="mt-0.5 text-sm text-muted-foreground">{job.description[locale]}</p>
              </div>
              <div className="shrink-0 rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                {job.trigger[locale]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Storage */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {locale === "pt" ? "Supabase Storage" : "Supabase Storage"}
        </h2>
        <div className="rounded-md border border-border/40 bg-card/60 p-4 space-y-2">
          <div className="flex items-start gap-3">
            <code className="shrink-0 font-mono text-xs text-brand">reference-assets</code>
            <p className="text-sm text-muted-foreground">
              {locale === "pt"
                ? "Bucket público. Armazena todos os assets de posts e da biblioteca de media. Path pattern: {clientId}/schedule/{itemId}/... ou {clientId}/media/..."
                : "Public bucket. Stores all post assets and media library files. Path pattern: {clientId}/schedule/{itemId}/... or {clientId}/media/..."}
            </p>
          </div>
        </div>
      </section>

      {/* Post Status Lifecycle */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {locale === "pt" ? "Ciclo de vida do post" : "Post Status Lifecycle"}
        </h2>
        <div className="rounded-md border border-border/40 bg-card/60 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
            {["suggested", "accepted", "scheduled", "publishing", "published"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <code className="rounded bg-muted/60 px-2 py-0.5 text-xs">{s}</code>
                {i < arr.length - 1 ? <span className="text-muted-foreground">→</span> : null}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {locale === "pt"
              ? "Em caso de falha: publishing → failed. Cancelar scheduled → accepted. O Inngest scan cron executa cada minuto à procura de posts em 'scheduled' com scheduled_at ≤ now."
              : "On failure: publishing → failed. Cancelling scheduled → accepted. The Inngest scan cron runs every minute looking for 'scheduled' posts with scheduled_at ≤ now."}
          </p>
        </div>
      </section>
    </div>
  );
}
