"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCompetitor,
  deleteCompetitor,
  updateCompetitor,
  analyzeCompetitorWithAI,
  regenerateCompetitorAISection,
} from "@/app/(app)/dashboard/clients/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type React from "react";
import {
  Eye,
  Loader2,
  Megaphone,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Boxes,
  BadgeInfo,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  MessageSquareText,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Competitor = {
  id: string;
  name: string;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  x: string | null;
  notes: string | null;
  ai_profile?: unknown | null;
  ai_profile_status?: string | null;
  ai_profile_error?: string | null;
  ai_profile_updated_at?: string | null;
  ai_profile_progress?: number | null;
  ai_profile_stage?: string | null;
  created_at?: string;
  updated_at?: string;
};

function normalizeUrl(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function openExternal(value?: string | null) {
  const url = normalizeUrl(value);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ClientCompetitorsList({
  clientId,
  locale,
  competitors,
}: {
  clientId: string;
  locale: Locale;
  competitors: Competitor[];
}) {
  const t = copy[locale];

  if (!competitors.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 bg-surface-1/50 px-6 py-16 text-center">
        <p className="text-sm font-medium text-muted-foreground">{t.clients.sections.competitorsEmpty}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {competitors.map((competitor) => (
        <CompetitorCard
          key={competitor.id}
          clientId={clientId}
          locale={locale}
          competitor={competitor}
        />
      ))}
    </div>
  );
}

function CompetitorCard({
  clientId,
  locale,
  competitor,
}: {
  clientId: string;
  locale: Locale;
  competitor: Competitor;
}) {
  const t = copy[locale];
  const router = useRouter();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar este competidor? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this competitor? This action cannot be undone.";
  const [deleteState, deleteAction] = useActionState(
    deleteCompetitor.bind(null, competitor.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const hasAnySocial =
    Boolean(competitor.instagram) ||
    Boolean(competitor.tiktok) ||
    Boolean(competitor.facebook) ||
    Boolean(competitor.youtube) ||
    Boolean(competitor.linkedin) ||
    Boolean(competitor.x);

  return (
    <div className="rounded-xl border border-border/20 bg-surface-1 p-4 transition-default hover:border-brand/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{competitor.name}</h3>
          {competitor.website ? (
            <p className="mt-1 text-xs text-muted-foreground">{competitor.website}</p>
          ) : null}
        </div>
        <EntityContextMenu
          ariaLabel={locale === "pt" ? "Ações do competidor" : "Competitor actions"}
          items={[
            {
              key: "open",
              label: locale === "pt" ? "Abrir" : "Open",
              onSelect: () =>
                router.push(`/dashboard/clients/${clientId}/competitors/${competitor.id}`),
            },
            {
              key: "open-website",
              label: locale === "pt" ? "Abrir website" : "Open website",
              disabled: !normalizeUrl(competitor.website),
              onSelect: () => openExternal(competitor.website),
            },
            {
              key: "open-instagram",
              label: locale === "pt" ? "Abrir Instagram" : "Open Instagram",
              disabled: !normalizeUrl(competitor.instagram),
              onSelect: () => openExternal(competitor.instagram),
            },
            {
              key: "open-tiktok",
              label: locale === "pt" ? "Abrir TikTok" : "Open TikTok",
              disabled: !normalizeUrl(competitor.tiktok),
              onSelect: () => openExternal(competitor.tiktok),
            },
            {
              key: "open-facebook",
              label: locale === "pt" ? "Abrir Facebook" : "Open Facebook",
              disabled: !normalizeUrl(competitor.facebook),
              onSelect: () => openExternal(competitor.facebook),
            },
            {
              key: "open-youtube",
              label: locale === "pt" ? "Abrir YouTube" : "Open YouTube",
              disabled: !normalizeUrl(competitor.youtube),
              onSelect: () => openExternal(competitor.youtube),
            },
            {
              key: "open-linkedin",
              label: locale === "pt" ? "Abrir LinkedIn" : "Open LinkedIn",
              disabled: !normalizeUrl(competitor.linkedin),
              onSelect: () => openExternal(competitor.linkedin),
            },
            {
              key: "open-x",
              label: locale === "pt" ? "Abrir X" : "Open X",
              disabled: !normalizeUrl(competitor.x),
              onSelect: () => openExternal(competitor.x),
            },
            {
              key: "open-socials",
              label: locale === "pt" ? "Abrir todas as redes" : "Open all socials",
              disabled: !hasAnySocial,
              onSelect: () => {
                openExternal(competitor.instagram);
                openExternal(competitor.tiktok);
                openExternal(competitor.facebook);
                openExternal(competitor.youtube);
                openExternal(competitor.linkedin);
                openExternal(competitor.x);
              },
            },
            { type: "separator", key: "sep-1" },
            {
              key: "delete",
              label: locale === "pt" ? "Apagar" : "Delete",
              variant: "destructive",
              onSelect: () => {
                if (!confirm(confirmDeleteText)) return;
                deleteFormRef.current?.requestSubmit();
              },
            },
          ]}
        />
      </div>

      {deleteState?.error ? (
        <p className="mt-3 text-xs text-destructive">{deleteState.error}</p>
      ) : null}

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" />
      </form>
    </div>
  );
}

export function ClientCompetitorCreate({
  clientId,
  locale,
  initialName,
}: {
  clientId: string;
  locale: Locale;
  initialName?: string;
}) {
  const t = copy[locale];
  const router = useRouter();
  const [createState, createAction] = useActionState(
    createCompetitor.bind(null, clientId),
    {}
  );
  const [name, setName] = useState(initialName ?? "");

  useEffect(() => {
    if (!createState?.success) return;
    router.push(`/dashboard/clients/${clientId}/competitors`);
    router.refresh();
  }, [clientId, createState?.success, router]);

  return (
    <div className="space-y-4">
      {createState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{createState.error}</AlertDescription>
        </Alert>
      ) : null}
      {createState?.success ? (
        <Alert>
          <AlertTitle>{t.common.successTitle}</AlertTitle>
          <AlertDescription>{createState.success}</AlertDescription>
        </Alert>
      ) : null}

      <form action={createAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">{t.clients.sections.competitorsFields.name}</label>
          <Input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">{t.clients.sections.competitorsFields.website}</label>
          <Input name="website" placeholder="https://..." />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">{t.clients.sections.competitorsFields.socials}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input name="instagram" placeholder="Instagram URL" />
            <Input name="tiktok" placeholder="TikTok URL" />
            <Input name="facebook" placeholder="Facebook URL" />
            <Input name="youtube" placeholder="YouTube URL" />
            <Input name="linkedin" placeholder="LinkedIn URL" />
            <Input name="x" placeholder="X / Twitter URL" />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">{t.clients.sections.competitorsFields.notes}</label>
          <Textarea name="notes" rows={3} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">{t.clients.sections.competitorsFields.swot}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.clients.sections.competitorsFields.swotStrengths}
              </label>
              <Textarea name="swot_strengths" rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.clients.sections.competitorsFields.swotWeaknesses}
              </label>
              <Textarea name="swot_weaknesses" rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.clients.sections.competitorsFields.swotOpportunities}
              </label>
              <Textarea name="swot_opportunities" rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t.clients.sections.competitorsFields.swotThreats}
              </label>
              <Textarea name="swot_threats" rows={3} />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" variant="brand">
            {t.clients.sections.competitorsActions.create}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ClientCompetitorEditor({
  clientId,
  locale,
  competitor,
}: {
  clientId: string;
  locale: Locale;
  competitor: Competitor;
}) {
  const t = copy[locale];
  const router = useRouter();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar este competidor? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this competitor? This action cannot be undone.";

  const [updateState, updateAction] = useActionState(
    updateCompetitor.bind(null, competitor.id, clientId),
    {}
  );
  const [deleteState, deleteAction] = useActionState(
    deleteCompetitor.bind(null, competitor.id, clientId),
    {}
  );
  const [analyzeState, analyzeAction] = useActionState(
    analyzeCompetitorWithAI.bind(null, competitor.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);
  const analyzeFormRef = useRef<HTMLFormElement | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();

  useEffect(() => {
    if (!deleteState?.success) return;
    router.push(`/dashboard/clients/${clientId}/competitors`);
    router.refresh();
  }, [clientId, deleteState?.success, router]);

  useEffect(() => {
    if (!analyzeState?.success) return;
    router.refresh();
  }, [analyzeState?.success, router]);

  const tabs = useMemo(
    () => [
      { key: "profile", label: t.clients.sections.competitorsTabs.profile },
      { key: "social", label: t.clients.sections.competitorsTabs.socials },
      { key: "notes", label: t.clients.sections.competitorsTabs.notes },
      { key: "ai", label: t.clients.sections.competitorsTabs.ai },
    ],
    [t]
  );
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("profile");
  const hasAnySocial =
    Boolean(competitor.instagram) ||
    Boolean(competitor.tiktok) ||
    Boolean(competitor.facebook) ||
    Boolean(competitor.youtube) ||
    Boolean(competitor.linkedin) ||
    Boolean(competitor.x);

  return (
    <div className="space-y-4">
      {isAnalyzing ? (
        <CompetitorAnalyzeLoadingModal
          locale={locale}
          name={competitor.name}
          competitorId={competitor.id}
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{competitor.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t.clients.sections.competitorsDetailSubtitle}
          </p>
        </div>
        <EntityContextMenu
          ariaLabel={locale === "pt" ? "Ações do competidor" : "Competitor actions"}
          items={[
            {
              key: "back",
              label: locale === "pt" ? "Voltar à lista" : "Back to list",
              onSelect: () => router.push(`/dashboard/clients/${clientId}/competitors`),
            },
            {
              key: "open-website",
              label: locale === "pt" ? "Abrir website" : "Open website",
              disabled: !normalizeUrl(competitor.website),
              onSelect: () => openExternal(competitor.website),
            },
            {
              key: "open-socials",
              label: locale === "pt" ? "Abrir todas as redes" : "Open all socials",
              disabled: !hasAnySocial,
              onSelect: () => {
                openExternal(competitor.instagram);
                openExternal(competitor.tiktok);
                openExternal(competitor.facebook);
                openExternal(competitor.youtube);
                openExternal(competitor.linkedin);
                openExternal(competitor.x);
              },
            },
            { type: "separator", key: "sep-1" },
            {
              key: "delete",
              label: locale === "pt" ? "Apagar" : "Delete",
              variant: "destructive",
              onSelect: () => {
                if (!confirm(confirmDeleteText)) return;
                deleteFormRef.current?.requestSubmit();
              },
            },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            className={activeTab === tab.key ? "bg-brand text-primary-foreground" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {updateState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{updateState.error}</AlertDescription>
        </Alert>
      ) : null}
      {updateState?.success ? (
        <Alert>
          <AlertTitle>{t.common.updatedTitle}</AlertTitle>
          <AlertDescription>{updateState.success}</AlertDescription>
        </Alert>
      ) : null}
      {deleteState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{deleteState.error}</AlertDescription>
        </Alert>
      ) : null}
      {analyzeState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{analyzeState.error}</AlertDescription>
        </Alert>
      ) : null}
      {analyzeState?.success ? (
        <Alert>
          <AlertTitle>{t.common.updatedTitle}</AlertTitle>
          <AlertDescription>{analyzeState.success}</AlertDescription>
        </Alert>
      ) : null}
      {competitor.ai_profile_error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{competitor.ai_profile_error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={updateAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />

        <div className={activeTab === "profile" ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">{t.clients.sections.competitorsFields.name}</label>
            <Input name="name" required defaultValue={competitor.name} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">{t.clients.sections.competitorsFields.website}</label>
            <Input name="website" defaultValue={competitor.website ?? ""} placeholder="https://..." />
          </div>
        </div>

        <div className={activeTab === "social" ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-medium">{t.clients.sections.competitorsFields.socials}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="instagram" defaultValue={competitor.instagram ?? ""} placeholder="Instagram URL" />
              <Input name="tiktok" defaultValue={competitor.tiktok ?? ""} placeholder="TikTok URL" />
              <Input name="facebook" defaultValue={competitor.facebook ?? ""} placeholder="Facebook URL" />
              <Input name="youtube" defaultValue={competitor.youtube ?? ""} placeholder="YouTube URL" />
              <Input name="linkedin" defaultValue={competitor.linkedin ?? ""} placeholder="LinkedIn URL" />
              <Input name="x" defaultValue={competitor.x ?? ""} placeholder="X / Twitter URL" />
            </div>
          </div>
        </div>

        <div className={activeTab === "notes" ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">{t.clients.sections.competitorsFields.notes}</label>
            <Textarea name="notes" rows={6} defaultValue={competitor.notes ?? ""} />
          </div>
        </div>

        <div className={activeTab === "ai" ? "hidden" : "md:col-span-2"}>
          <Button type="submit" variant="brand">
            {t.clients.sections.competitorsActions.update}
          </Button>
        </div>
      </form>

      <div className={activeTab === "ai" ? "space-y-3" : "hidden"}>
        <div className="rounded-md border border-border/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{t.clients.sections.competitorsTabs.ai}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {locale === "pt"
                  ? "O crawler vai extrair texto do website/redes e a IA vai construir um perfil estruturado."
                  : "The crawler extracts text from website/socials and the AI builds a structured profile."}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{locale === "pt" ? "Estado" : "Status"}:</span>{" "}
                  {String(competitor.ai_profile_status || "idle")}
                </div>
                {competitor.ai_profile_updated_at ? (
                  <div className="mt-1">
                    <span className="font-medium">{locale === "pt" ? "Última análise" : "Last analysis"}:</span>{" "}
                    {new Date(competitor.ai_profile_updated_at).toLocaleString(locale === "pt" ? "pt-PT" : "en-US")}
                  </div>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="brand"
              disabled={isAnalyzing}
              onClick={() => startAnalyzing(() => analyzeFormRef.current?.requestSubmit())}
            >
              <span className="inline-flex items-center gap-2">
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isAnalyzing ? t.clients.sections.competitorsActions.analyzing : t.clients.sections.competitorsActions.analyze}
              </span>
            </Button>
          </div>
        </div>

        {competitor.ai_profile ? (
          <CompetitorAIProfileVisual locale={locale} competitor={competitor} clientId={clientId} />
        ) : (
          <div className="rounded-md border border-border/40 p-4 text-sm text-muted-foreground">
            {locale === "pt"
              ? "Ainda não existe um perfil IA para este competidor."
              : "No AI profile exists for this competitor yet."}
          </div>
        )}
      </div>

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" />
      </form>

      <form ref={analyzeFormRef} action={analyzeAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" />
      </form>
    </div>
  );
}

function CompetitorAnalyzeLoadingModal({
  locale,
  name,
  competitorId,
}: {
  locale: Locale;
  name: string;
  competitorId: string;
}) {
  const fallbackStages = useMemo(
    () =>
      locale === "pt"
        ? [
            "A recolher fontes…",
            "A extrair conteúdo…",
            "A interpretar dados…",
            "A construir o perfil…",
            "A validar evidências…",
          ]
        : ["Collecting sources…", "Extracting content…", "Interpreting…", "Building profile…", "Validating…"],
    [locale]
  );

  const [progress, setProgress] = useState<number>(5);
  const [stage, setStage] = useState<string>(fallbackStages[0] || "");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let localTick = 0;

    async function poll() {
      const { data, error } = await supabase
        .from("client_competitors")
        .select("ai_profile_progress, ai_profile_stage, ai_profile_status")
        .eq("id", competitorId)
        .single();

      if (cancelled) return;

      // If the columns/migration are not present yet, fallback to local animation.
      if (error || !data || data.ai_profile_progress == null) {
        localTick += 1;
        const p = Math.min(88, 5 + localTick);
        setProgress((prev) => (p > prev ? p : prev));
        setStage(fallbackStages[Math.min(fallbackStages.length - 1, Math.floor(localTick / 6))] || "");
        return;
      }

      const p = Math.min(100, Math.max(0, Number(data.ai_profile_progress)));
      setProgress(p);
      setStage(String(data.ai_profile_stage || ""));
    }

    poll();
    const interval = setInterval(poll, 650);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [competitorId, fallbackStages]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border/40 bg-background shadow-lg">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-xl border border-border/40 bg-brand/10 p-2 text-brand">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold">
                {locale === "pt"
                  ? "Estamos a gerar o perfil do teu competidor"
                  : "We’re generating your competitor profile"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground truncate">{name}</div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/40">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{stage}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function sectionTitle(locale: Locale, textPt: string, textEn: string) {
  return locale === "pt" ? textPt : textEn;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).map((s) => s.trim()).filter(Boolean);
}

type EvidenceSource = { url: string; excerpt?: string | null; page_title?: string | null };
type EvidenceItem = { text: string; justification: string; sources: EvidenceSource[] };

function asEvidenceItems(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  const out: EvidenceItem[] = [];
  for (const v of value) {
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) continue;
      out.push({ text: t, justification: "", sources: [] });
      continue;
    }
    if (v && typeof v === "object") {
      const text = String((v as any).text || "").trim();
      if (!text) continue;
      const rawSources = Array.isArray((v as any).sources) ? (v as any).sources : [];
      const sources: EvidenceSource[] = [];
      for (const s of rawSources) {
        if (typeof s === "string") {
          const url = s.trim();
          if (!url) continue;
          sources.push({ url, excerpt: null, page_title: null });
          continue;
        }
        if (s && typeof s === "object") {
          const url = String((s as any).url || "").trim();
          if (!url) continue;
          sources.push({
            url,
            excerpt: String((s as any).excerpt || "").trim() || null,
            page_title: String((s as any).page_title || "").trim() || null,
          });
        }
      }
      out.push({
        text,
        justification: String((v as any).justification || "").trim(),
        sources,
      });
    }
  }
  return out;
}

function EvidenceInfo({
  label,
  itemText,
  justification,
  sources,
}: {
  label: string;
  itemText: string;
  justification: string;
  sources: EvidenceSource[];
}) {
  const hasDetails = Boolean(justification) || (sources?.length ?? 0) > 0;
  if (!hasDetails) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Ver detalhe e fontes"
          aria-label="Ver detalhe e fontes"
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/40 bg-background/70 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[360px] p-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-semibold whitespace-pre-line">{itemText}</div>
        {justification ? (
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{justification}</div>
        ) : null}
        {sources?.length ? (
          <>
            <DropdownMenuSeparator />
            <div className="text-xs font-medium text-muted-foreground">Fontes</div>
            <div className="mt-2 space-y-2">
              {sources.slice(0, 6).map((s, i) => (
                <div key={`${s.url}-${i}`} className="rounded-md border border-border/40 bg-muted/10 p-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block truncate text-xs text-brand hover:underline"
                    title={s.url}
                  >
                    {s.page_title ? `${s.page_title} — ${s.url}` : s.url}
                  </a>
                  {s.excerpt ? (
                    <div className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                      “{s.excerpt}”
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "brand" | "info" | "success" | "warning" | "neutral";
}) {
  const cls =
    tone === "brand"
      ? "bg-brand/10 text-brand border-brand/20"
      : tone === "info"
        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
        : tone === "success"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : tone === "warning"
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
            : "bg-muted/40 text-foreground/80 border-border/40";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function CompetitorAIProfileVisual({ 
  locale, 
  competitor, 
  clientId 
}: { 
  locale: Locale; 
  competitor: Competitor;
  clientId: string;
}) {
  const profile = (competitor.ai_profile ?? {}) as any;
  const [showRaw, setShowRaw] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const router = useRouter();
  
  const [regenerateState, setRegenerateState] = useState<{ error?: string; success?: string } | null>(null);
  const [isRegenerating, startRegenerating] = useTransition();

  useEffect(() => {
    if (regenerateState?.success) {
      router.refresh();
      setRegeneratingSection(null);
      setRegenerateState(null);
    }
  }, [regenerateState?.success, router]);

  const handleRegenerateSection = (sectionKey: string) => {
    setRegeneratingSection(sectionKey);
    setRegenerateState(null);
    const formData = new FormData();
    formData.append("locale", locale);
    const boundAction = regenerateCompetitorAISection.bind(null, competitor.id, clientId, sectionKey);
    startRegenerating(async () => {
      const result = await boundAction({}, formData);
      setRegenerateState(result);
      if (result.success) {
        router.refresh();
        setRegeneratingSection(null);
      }
    });
  };

  const messaging = profile?.messaging ?? {};
  const tone = profile?.tone_of_voice ?? {};
  const contentStrategy = profile?.content_strategy ?? {};
  const funnel = profile?.funnel ?? {};
  const channels = Array.isArray(profile?.channels) ? profile.channels : [];
  const offerings = Array.isArray(profile?.offerings) ? profile.offerings : [];
  const segments = Array.isArray(profile?.audience_segments) ? profile.audience_segments : [];
  const proof = Array.isArray(profile?.proof_points) ? profile.proof_points : [];
  const implications = profile?.strategy_implications ?? {};
  const overviewEvidence = profile?.overview_evidence ?? null;
  const positioningEvidence = profile?.positioning_evidence ?? null;
  const valuePropEvidence = profile?.value_proposition_evidence ?? null;

  const SectionReloadButton = ({ sectionKey }: { sectionKey: string }) => {
    const isRegeneratingThis = regeneratingSection === sectionKey;
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-6 w-6 p-0"
        onClick={() => handleRegenerateSection(sectionKey)}
        disabled={isRegenerating || isRegeneratingThis}
        title={locale === "pt" ? "Regenerar esta secção" : "Regenerate this section"}
      >
        {isRegeneratingThis ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    );
  };

  return (
    <div className="space-y-3">
      {regenerateState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{locale === "pt" ? "Erro" : "Error"}</AlertTitle>
          <AlertDescription>{regenerateState.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-brand/10 via-background to-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-brand" />
            {sectionTitle(locale, "Visão geral", "Overview")}
            <EvidenceInfo
              label={locale === "pt" ? "Visão geral" : "Overview"}
              itemText={String(profile?.overview || "")}
              justification={String(overviewEvidence?.justification || "")}
              sources={Array.isArray(overviewEvidence?.sources) ? overviewEvidence.sources : []}
            />
            <SectionReloadButton sectionKey="overview" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
            {String(profile?.overview || "—")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile?.category ? <Pill tone="info">{String(profile.category)}</Pill> : null}
            {profile?.business_model ? <Pill tone="neutral">{String(profile.business_model)}</Pill> : null}
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-sky-500/10 via-background to-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-sky-600 dark:text-sky-300" />
            {sectionTitle(locale, "Posicionamento", "Positioning")}
            <EvidenceInfo
              label={locale === "pt" ? "Posicionamento" : "Positioning"}
              itemText={String(profile?.positioning || "")}
              justification={String(positioningEvidence?.justification || "")}
              sources={Array.isArray(positioningEvidence?.sources) ? positioningEvidence.sources : []}
            />
            <SectionReloadButton sectionKey="positioning" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
            {String(profile?.positioning || "—")}
          </div>
          <div className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
            <span className="font-medium text-foreground/90">
              {locale === "pt" ? "Proposta de valor: " : "Value proposition: "}
            </span>
            {String(profile?.value_proposition || "—")}
            <EvidenceInfo
              label={locale === "pt" ? "Proposta de valor" : "Value proposition"}
              itemText={String(profile?.value_proposition || "")}
              justification={String(valuePropEvidence?.justification || "")}
              sources={Array.isArray(valuePropEvidence?.sources) ? valuePropEvidence.sources : []}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-emerald-500/10 via-background to-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            {sectionTitle(locale, "Segmentos de audiência", "Audience segments")}
            <SectionReloadButton sectionKey="audience_segments" />
          </div>
          {segments.length ? (
            <div className="mt-3 space-y-3">
              {segments.slice(0, 4).map((seg: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-border/40 bg-muted/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <BadgeInfo className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    {String(seg?.segment || "—")}
                    <EvidenceInfo
                      label={locale === "pt" ? "Segmento" : "Segment"}
                      itemText={String(seg?.segment || "")}
                      justification={String(seg?.segment_justification || "")}
                      sources={Array.isArray(seg?.sources) ? seg.sources : []}
                    />
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Dores" : "Pains"}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {asEvidenceItems(seg?.pains).slice(0, 6).map((it, i) => (
                          <Pill key={i} tone="warning">
                            {it.text}
                            <EvidenceInfo
                              label={locale === "pt" ? "Dor" : "Pain"}
                              itemText={it.text}
                              justification={it.justification}
                              sources={it.sources}
                            />
                          </Pill>
                        ))}
                        {!asEvidenceItems(seg?.pains).length ? <div className="text-xs text-muted-foreground">—</div> : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Desejos" : "Desires"}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {asEvidenceItems(seg?.desires).slice(0, 6).map((it, i) => (
                          <Pill key={i} tone="success">
                            {it.text}
                            <EvidenceInfo
                              label={locale === "pt" ? "Desejo" : "Desire"}
                              itemText={it.text}
                              justification={it.justification}
                              sources={it.sources}
                            />
                          </Pill>
                        ))}
                        {!asEvidenceItems(seg?.desires).length ? <div className="text-xs text-muted-foreground">—</div> : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Objeções" : "Objections"}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {asEvidenceItems(seg?.objections).slice(0, 6).map((it, i) => (
                          <Pill key={i} tone="neutral">
                            {it.text}
                            <EvidenceInfo
                              label={locale === "pt" ? "Objeção" : "Objection"}
                              itemText={it.text}
                              justification={it.justification}
                              sources={it.sources}
                            />
                          </Pill>
                        ))}
                        {!asEvidenceItems(seg?.objections).length ? <div className="text-xs text-muted-foreground">—</div> : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">—</div>
          )}
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-amber-500/10 via-background to-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            {sectionTitle(locale, "Tom de voz", "Tone of voice")}
            <SectionReloadButton sectionKey="tone_of_voice" />
          </div>
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{String(tone?.summary || "—")}</div>
          <div className="mt-2">
            <EvidenceInfo
              label={locale === "pt" ? "Tom de voz" : "Tone of voice"}
              itemText={String(tone?.summary || "")}
              justification={String(tone?.summary_evidence?.justification || "")}
              sources={Array.isArray(tone?.summary_evidence?.sources) ? tone.summary_evidence.sources : []}
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Traços" : "Traits"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {asEvidenceItems(tone?.traits).slice(0, 10).map((it, i) => (
                  <Pill key={i} tone="info">
                    {it.text}
                    <EvidenceInfo label="Trait" itemText={it.text} justification={it.justification} sources={it.sources} />
                  </Pill>
                ))}
                {!asEvidenceItems(tone?.traits).length ? <div className="text-xs text-muted-foreground">—</div> : null}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Do / Don't" : "Do / Don't"}</div>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {asEvidenceItems(tone?.do).slice(0, 3).map((it, i) => (
                  <div key={`do-${i}`} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-[2px] h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <span className="whitespace-pre-line">
                      {it.text}
                      <EvidenceInfo label="Do" itemText={it.text} justification={it.justification} sources={it.sources} />
                    </span>
                  </div>
                ))}
                {asEvidenceItems(tone?.dont).slice(0, 3).map((it, i) => (
                  <div key={`dont-${i}`} className="flex items-start gap-2">
                    <AlertTriangle className="mt-[2px] h-4 w-4 text-amber-600 dark:text-amber-300" />
                    <span className="whitespace-pre-line">
                      {it.text}
                      <EvidenceInfo label="Don't" itemText={it.text} justification={it.justification} sources={it.sources} />
                    </span>
                  </div>
                ))}
                {!asEvidenceItems(tone?.do).length && !asEvidenceItems(tone?.dont).length ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="h-4 w-4 text-muted-foreground" />
            {locale === "pt" ? "Oferta / Produtos" : "Offerings"}
            <SectionReloadButton sectionKey="offerings" />
          </div>
          {offerings.length ? (
            <div className="mt-3 space-y-3">
              {offerings.slice(0, 6).map((o: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-border/40 bg-muted/10 p-3">
                  <div className="text-sm font-semibold">
                    {String(o?.name || "—")}
                    <EvidenceInfo
                      label={locale === "pt" ? "Oferta" : "Offering"}
                      itemText={String(o?.name || "")}
                      justification={String(o?.justification || "")}
                      sources={Array.isArray(o?.sources) ? o.sources : []}
                    />
                  </div>
                  {o?.description ? (
                    <div className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                      {String(o.description)}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o?.target ? <Pill tone="info">{String(o.target)}</Pill> : null}
                    {o?.price_hint ? <Pill tone="neutral">{String(o.price_hint)}</Pill> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">—</div>
          )}
        </div>

        <div className="rounded-xl border border-border/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            {locale === "pt" ? "Mensagens" : "Messaging"}
            <SectionReloadButton sectionKey="messaging" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Keywords" : "Keywords"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {asEvidenceItems(messaging?.keywords).slice(0, 16).map((it, i) => (
                  <Pill key={i} tone="brand">
                    {it.text}
                    <EvidenceInfo label="Keyword" itemText={it.text} justification={it.justification} sources={it.sources} />
                  </Pill>
                ))}
                {!asEvidenceItems(messaging?.keywords).length ? <div className="text-xs text-muted-foreground">—</div> : null}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Pilares" : "Pillars"}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {asEvidenceItems(messaging?.pillars).slice(0, 12).map((it, i) => (
                  <Pill key={i} tone="info">
                    {it.text}
                    <EvidenceInfo label="Pillar" itemText={it.text} justification={it.justification} sources={it.sources} />
                  </Pill>
                ))}
                {!asEvidenceItems(messaging?.pillars).length ? <div className="text-xs text-muted-foreground">—</div> : null}
              </div>
            </div>
          </div>
          {asEvidenceItems(messaging?.tagline_examples).length ? (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Exemplos de tagline" : "Tagline examples"}</div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {asEvidenceItems(messaging?.tagline_examples).slice(0, 6).map((it, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="whitespace-pre-line">
                      {it.text}
                      <EvidenceInfo label="Tagline" itemText={it.text} justification={it.justification} sources={it.sources} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          {locale === "pt" ? "Estratégia de conteúdo (inferida)" : "Content strategy (inferred)"}
          <SectionReloadButton sectionKey="content_strategy" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Temas" : "Themes"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {asEvidenceItems(contentStrategy?.themes).slice(0, 14).map((it, i) => (
                <Pill key={i} tone="info">
                  {it.text}
                  <EvidenceInfo label="Theme" itemText={it.text} justification={it.justification} sources={it.sources} />
                </Pill>
              ))}
              {!asEvidenceItems(contentStrategy?.themes).length ? <div className="text-xs text-muted-foreground">—</div> : null}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Formatos" : "Formats"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {asEvidenceItems(contentStrategy?.formats).slice(0, 14).map((it, i) => (
                <Pill key={i} tone="neutral">
                  {it.text}
                  <EvidenceInfo label="Format" itemText={it.text} justification={it.justification} sources={it.sources} />
                </Pill>
              ))}
              {!asEvidenceItems(contentStrategy?.formats).length ? <div className="text-xs text-muted-foreground">—</div> : null}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Cadência (guess)" : "Cadence (guess)"}</div>
            <div className="mt-2 text-sm text-muted-foreground">{String(contentStrategy?.cadence_guess || "—")}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Hooks" : "Hooks"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {asEvidenceItems(contentStrategy?.hooks).slice(0, 12).map((it, i) => (
                <Pill key={i} tone="brand">
                  {it.text}
                  <EvidenceInfo label="Hook" itemText={it.text} justification={it.justification} sources={it.sources} />
                </Pill>
              ))}
              {!asEvidenceItems(contentStrategy?.hooks).length ? <div className="text-xs text-muted-foreground">—</div> : null}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "CTAs" : "CTAs"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {asEvidenceItems(contentStrategy?.ctas).slice(0, 12).map((it, i) => (
                <Pill key={i} tone="success">
                  {it.text}
                  <EvidenceInfo label="CTA" itemText={it.text} justification={it.justification} sources={it.sources} />
                </Pill>
              ))}
              {!asEvidenceItems(contentStrategy?.ctas).length ? <div className="text-xs text-muted-foreground">—</div> : null}
            </div>
          </div>
        </div>
        {asEvidenceItems(contentStrategy?.series_ideas).length ? (
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Ideias de séries" : "Series ideas"}</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {asEvidenceItems(contentStrategy?.series_ideas).slice(0, 8).map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="mt-[2px] h-4 w-4 text-brand" />
                  <span className="whitespace-pre-line">
                    {it.text}
                    <EvidenceInfo label="Series idea" itemText={it.text} justification={it.justification} sources={it.sources} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" />
          {locale === "pt" ? "Canais (inferido)" : "Channels (inferred)"}
          <SectionReloadButton sectionKey="channels" />
        </div>
        {channels.length ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {channels.slice(0, 6).map((c: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-border/40 bg-muted/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{String(c?.platform || "—")}</div>
                  <div className="flex flex-wrap gap-2">
                    {c?.role ? <Pill tone="info">{String(c.role)}</Pill> : null}
                    {c?.cadence_guess ? <Pill tone="neutral">{String(c.cadence_guess)}</Pill> : null}
                  </div>
                </div>
                {c?.audience_fit ? (
                  <div className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                    <span className="font-medium text-foreground/90">{locale === "pt" ? "Fit: " : "Fit: "}</span>
                    {String(c.audience_fit)}
                  </div>
                ) : null}
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Tipos de conteúdo" : "Content types"}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {asEvidenceItems(c?.content_types).slice(0, 10).map((it, i) => (
                      <Pill key={i} tone="brand">
                        {it.text}
                        <EvidenceInfo label="Content type" itemText={it.text} justification={it.justification} sources={it.sources} />
                      </Pill>
                    ))}
                    {!asEvidenceItems(c?.content_types).length ? <div className="text-xs text-muted-foreground">—</div> : null}
                  </div>
                </div>
                {asEvidenceItems(c?.best_practices).length ? (
                  <div className="mt-3">
                    <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Boas práticas" : "Best practices"}</div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {asEvidenceItems(c?.best_practices).slice(0, 4).map((it, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                          <span className="whitespace-pre-line">
                            {it.text}
                            <EvidenceInfo label="Best practice" itemText={it.text} justification={it.justification} sources={it.sources} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted-foreground">—</div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            {locale === "pt" ? "Diferenciadores + prova" : "Differentiators + proof"}
            <div className="ml-auto flex gap-2">
              <SectionReloadButton sectionKey="differentiators" />
              <SectionReloadButton sectionKey="proof_points" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {asEvidenceItems(profile?.differentiators).slice(0, 16).map((it, i) => (
              <Pill key={i} tone="info">
                {it.text}
                <EvidenceInfo label="Differentiator" itemText={it.text} justification={it.justification} sources={it.sources} />
              </Pill>
            ))}
            {!asEvidenceItems(profile?.differentiators).length ? <div className="text-sm text-muted-foreground">—</div> : null}
          </div>
          {proof.length ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {proof.slice(0, 6).map((p: any, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="whitespace-pre-line">{String(p?.point || "—")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="rounded-xl border border-border/40 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-muted-foreground" />
            {locale === "pt" ? "Funil (inferido)" : "Funnel (inferred)"}
            <SectionReloadButton sectionKey="funnel" />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {[
              { key: "top", label: locale === "pt" ? "Topo" : "Top", items: funnel?.top },
              { key: "middle", label: locale === "pt" ? "Meio" : "Middle", items: funnel?.middle },
              { key: "bottom", label: locale === "pt" ? "Fundo" : "Bottom", items: funnel?.bottom },
            ].map((col) => (
              <div key={col.key}>
                <div className="text-xs font-medium text-muted-foreground">{col.label}</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {asEvidenceItems(col.items).slice(0, 6).map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                      <span className="whitespace-pre-line">
                        {it.text}
                        <EvidenceInfo label="Funnel" itemText={it.text} justification={it.justification} sources={it.sources} />
                      </span>
                    </li>
                  ))}
                  {!asEvidenceItems(col.items).length ? <li>—</li> : null}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          {locale === "pt" ? "Implicações para a tua estratégia" : "Strategy implications for you"}
          <SectionReloadButton sectionKey="strategy_implications" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {[
            { key: "emulate", label: locale === "pt" ? "O que emular" : "Emulate", items: implications?.emulate, tone: "success" as const },
            { key: "avoid", label: locale === "pt" ? "O que evitar" : "Avoid", items: implications?.avoid, tone: "warning" as const },
            { key: "whitespace", label: locale === "pt" ? "White space" : "Whitespace", items: implications?.whitespace, tone: "info" as const },
            { key: "counter_angles", label: locale === "pt" ? "Ângulos de contra-posicionamento" : "Counter angles", items: implications?.counter_angles, tone: "brand" as const },
          ].map((box) => (
            <div key={box.key} className="rounded-xl border border-border/40 bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground">{box.label}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {asEvidenceItems(box.items).slice(0, 10).map((it, i) => (
                  <Pill key={i} tone={box.tone}>
                    {it.text}
                    <EvidenceInfo label={box.label} itemText={it.text} justification={it.justification} sources={it.sources} />
                  </Pill>
                ))}
                {!asEvidenceItems(box.items).length ? <div className="text-xs text-muted-foreground">—</div> : null}
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-border/40 bg-muted/10 p-3 md:col-span-2">
            <div className="text-xs font-medium text-muted-foreground">{locale === "pt" ? "Experiências sugeridas" : "Suggested experiments"}</div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {asEvidenceItems(implications?.experiments).slice(0, 10).map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles className="mt-[2px] h-4 w-4 text-brand" />
                  <span className="whitespace-pre-line">
                    {it.text}
                    <EvidenceInfo label="Experiment" itemText={it.text} justification={it.justification} sources={it.sources} />
                  </span>
                </li>
              ))}
              {!asEvidenceItems(implications?.experiments).length ? <li>—</li> : null}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {locale === "pt" ? "Debug" : "Debug"}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? (locale === "pt" ? "Esconder raw" : "Hide raw") : locale === "pt" ? "Ver raw JSON" : "View raw JSON"}
          </Button>
        </div>

        {showRaw ? (
          <pre className="mt-3 max-h-[420px] overflow-auto rounded-md bg-muted/30 p-3 text-xs">
            {JSON.stringify({ profile: competitor.ai_profile }, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

