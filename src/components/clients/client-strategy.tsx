"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStrategy,
  deleteStrategy,
  setActiveStrategy,
  updateStrategy,
} from "@/app/(app)/dashboard/clients/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/form/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copy, Locale } from "@/lib/i18n";
import { Info } from "lucide-react";

type Strategy = {
  id: string;
  title: string;
  status: string | null;
  objectives: string | null;
  audience: string | null;
  persona_id?: string | null;
  use_celebration_dates?: boolean | null;
  competitor_ids?: string[] | null;
  reference_group_ids?: string[] | null;
  positioning: string | null;
  key_messages: string | null;
  content_pillars: string | null;
  formats: string | null;
  channels: string | null;
  cadence: string | null;
  kpis: string | null;
  guardrails: string | null;
  ai_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ClientStrategyListProps = {
  clientId: string;
  locale: Locale;
  strategies: Strategy[];
};

type ClientStrategyCreateProps = {
  clientId: string;
  locale: Locale;
  clientType?: "services" | "content_creator";
  initialTitle?: string;
  initialTemplateId?: string;
  personas: { id: string; name: string }[];
  competitors: { id: string; name: string }[];
  referenceGroups: { id: string; name: string }[];
};

type StrategyFormData = {
  title: string;
  status: string;
  objectives: string[];
  objectives_other: string;
  audience_text: string;
  audience_personas: string[];
  persona_id: string;
  use_celebration_dates: boolean;
  competitor_ids: string[];
  reference_group_ids: string[];
  positioning: string;
  key_messages: string;
  content_pillars: string[];
  content_pillars_other: string;
  formats: string[];
  formats_other: string;
  channels: string[];
  channels_other: string;
  cadence: string;
  cadence_other: string;
  kpis: string[];
  kpis_other: string;
  guardrails: string;
  ai_notes: string;
  is_active: boolean;
};

function parseList(value?: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitKnownUnknown(values: string[], knownOptions: readonly string[]) {
  const known = new Set(knownOptions);
  const selected: string[] = [];
  const unknown: string[] = [];
  values.forEach((value) => {
    if (known.has(value)) selected.push(value);
    else unknown.push(value);
  });
  return { selected, other: unknown.join(", ") };
}

function parseAudience(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return { personas: [] as string[], text: "" };
  const match = raw.match(/^Personas:\s*(.*?)(?:\.\s*(.*))?$/);
  if (!match) return { personas: [] as string[], text: raw };
  return {
    personas: match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    text: (match[2] ?? "").trim(),
  };
}

export function ClientStrategyList({ clientId, locale, strategies }: ClientStrategyListProps) {
  const t = copy[locale];
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftTemplate, setDraftTemplate] = useState<string | null>(null);
  const strategyTemplates = t.clients.sections.strategyTemplates;

  const handleContinue = () => {
    if (!draftName.trim()) return;
    const params = new URLSearchParams();
    params.set("name", draftName.trim());
    if (draftTemplate) params.set("template", draftTemplate);
    router.push(`/dashboard/clients/${clientId}/strategy/new?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t.clients.sections.strategyTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.clients.sections.strategyBody}</p>
        </div>
        <Button variant="brand" onClick={() => setShowCreateModal(true)}>
          {t.clients.sections.strategyActions.create}
        </Button>
      </div>

      {strategies.length ? (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              clientId={clientId}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/30 bg-surface-1/50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t.clients.sections.strategyEmpty}</p>
        </div>
      )}

      {showCreateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-xl rounded-md border border-border/40 bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {t.clients.sections.strategyCreateTitle}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.clients.sections.strategyCreateBody}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                {t.common.close}
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <FieldLabel
                htmlFor="strategy-draft-name"
                label={t.clients.sections.strategyCreateName}
                tooltip={t.clients.sections.strategyTooltips.title}
              />
              <Input
                id="strategy-draft-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
            </div>
            <div className="mt-4 space-y-2">
              <FieldLabel
                htmlFor="strategy-template"
                label={t.clients.sections.strategyCreateTemplate}
                tooltip={t.clients.sections.strategyTooltips.template}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {strategyTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`rounded-md border border-border/40 p-3 text-left hover:border-brand/60 hover:bg-muted/30 ${
                      draftTemplate == template.id ? "border-brand/60 bg-brand/10" : ""
                    }`}
                    onClick={() => setDraftTemplate(template.id)}
                  >
                    <p className="text-sm font-semibold">{template.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setDraftTemplate(null)}>
                {t.clients.sections.strategyCreateNoTemplate}
              </Button>
              <Button
                variant="brand"
                onClick={handleContinue}
                disabled={!draftName.trim()}
              >
                {t.clients.sections.strategyCreateStart}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ClientStrategyCreate({
  clientId,
  locale,
  clientType = "services",
  initialTitle,
  initialTemplateId,
  personas,
  competitors,
  referenceGroups,
}: ClientStrategyCreateProps) {
  const t = copy[locale];
  const [createState, createAction] = useActionState(
    createStrategy.bind(null, clientId),
    {}
  );
  const strategyOptions = t.clients.sections.strategyOptions;
  const strategyTemplates = t.clients.sections.strategyTemplates;
  const strategyTooltips = t.clients.sections.strategyTooltips;

  const emptyCreate = useMemo(
    () => ({
      title: "",
      status: "",
      objectives: [] as string[],
      objectives_other: "",
      audience_text: "",
      audience_personas: [] as string[],
      persona_id: "",
      use_celebration_dates: true,
      competitor_ids: [] as string[],
      reference_group_ids: [] as string[],
      positioning: "",
      key_messages: "",
      content_pillars: [] as string[],
      content_pillars_other: "",
      formats: [] as string[],
      formats_other: "",
      channels: [] as string[],
      channels_other: "",
      cadence: "",
      cadence_other: "",
      kpis: [] as string[],
      kpis_other: "",
      guardrails: "",
      ai_notes: "",
      is_active: false,
    }),
    []
  );

  const buildInitialData = useMemo(() => {
    const base = { ...emptyCreate };
    if (initialTitle) {
      base.title = initialTitle;
    }
    if (initialTemplateId) {
      const template = strategyTemplates.find((item) => item.id === initialTemplateId);
      if (template) {
        base.title = initialTitle || template.title;
        base.objectives = [...(template.objectives ?? [])];
        base.content_pillars = [...(template.contentPillars ?? [])];
        base.formats = [...(template.formats ?? [])];
        base.channels = [...(template.channels ?? [])];
        base.kpis = [...(template.kpis ?? [])];
        base.cadence = template.cadence && (strategyOptions.cadence as readonly string[]).includes(template.cadence)
          ? template.cadence
          : "";
        base.cadence_other =
          template.cadence && !(strategyOptions.cadence as readonly string[]).includes(template.cadence)
            ? template.cadence
            : "";
        base.positioning = template.positioning ?? "";
        base.key_messages = template.keyMessages ?? "";
      }
    }
    return base;
  }, [
    emptyCreate,
    initialTemplateId,
    initialTitle,
    strategyOptions.cadence,
    strategyTemplates,
  ]);

  const [createData, setCreateData] = useState(buildInitialData);
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    setCreateData(buildInitialData);
  }, [buildInitialData]);

  const listCount = (list: string[], other?: string) =>
    list.length + (other?.trim() ? 1 : 0);

  const stepValidity = useMemo(() => {
    const objectivesCount = listCount(createData.objectives, createData.objectives_other);
    const pillarsCount = listCount(
      createData.content_pillars,
      createData.content_pillars_other
    );
    const formatsCount = listCount(createData.formats, createData.formats_other);
    const channelsCount = listCount(createData.channels, createData.channels_other);
    const kpisCount = listCount(createData.kpis, createData.kpis_other);

    return [
      Boolean(createData.title.trim()) && objectivesCount > 0,
      Boolean(createData.positioning.trim()) &&
        Boolean(createData.key_messages.trim()) &&
        pillarsCount > 0,
      formatsCount > 0 && channelsCount > 0,
      kpisCount > 0,
    ];
  }, [
    createData.title,
    createData.objectives,
    createData.objectives_other,
    createData.audience_text,
    createData.audience_personas,
    createData.positioning,
    createData.key_messages,
    createData.content_pillars,
    createData.content_pillars_other,
    createData.formats,
    createData.formats_other,
    createData.channels,
    createData.channels_other,
    createData.kpis,
    createData.kpis_other,
  ]);

  const canNext = stepValidity[wizardStep];
  const canSave = stepValidity.every(Boolean);
  const steps = t.clients.sections.strategyWizardSteps;

  const toggleListValue = (key: keyof typeof emptyCreate, value: string) => {
    setCreateData((prev) => {
      const current = new Set(prev[key] as string[]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [key]: Array.from(current) };
    });
  };

  return (
    <div className="space-y-6">
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

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {steps.map((stepLabel, index) => (
          <span
            key={stepLabel}
            className={`rounded-full border px-2 py-1 ${
              index === wizardStep ? "border-brand/60 bg-brand/10 text-brand" : ""
            }`}
          >
            {stepLabel}
          </span>
        ))}
      </div>

      <form action={createAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <div className={wizardStep === 0 ? "contents" : "hidden"}>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-title"
                label={t.clients.sections.strategyFields.title}
                tooltip={strategyTooltips.title}
              />
              <Input
                id="strategy-title"
                name="title"
                required
                value={createData.title}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-status"
                label={t.clients.sections.strategyFields.status}
                tooltip={strategyTooltips.status}
              />
              <Input
                id="strategy-status"
                name="status"
                value={createData.status}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, status: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-objectives"
                label={t.clients.sections.strategyFields.objectives}
                tooltip={strategyTooltips.objectives}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.objectives.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`objective-${option}`}
                      type="checkbox"
                      name="objectives"
                      value={option}
                      checked={createData.objectives.includes(option)}
                      onChange={() => toggleListValue("objectives", option)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`objective-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="objectives_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.objectives_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        objectives_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-audience-personas"
                label={t.clients.sections.strategyFields.audiencePersonas}
                tooltip={strategyTooltips.audiencePersonas}
              />
              <div className="flex flex-wrap gap-2">
                {personas.length ? (
                  personas.map((persona) => (
                    <div key={persona.id} className="relative">
                      <input
                        id={`persona-${persona.id}`}
                        type="checkbox"
                        name="audience_personas"
                        value={persona.name}
                        checked={createData.audience_personas.includes(persona.name)}
                        onChange={() => toggleListValue("audience_personas", persona.name)}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`persona-${persona.id}`}
                        className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                      >
                        {persona.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.clients.sections.strategyAudienceEmpty}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-persona"
                label={t.clients.sections.strategyFields.persona}
                tooltip={locale === "pt"
                  ? "Persona principal que deve orientar a planificação (quando aplicável)."
                  : "Primary persona to guide planning (when applicable)."}
              />
              <input type="hidden" name="persona_id" value={createData.persona_id || ""} />
              <Select
                value={createData.persona_id || "__none__"}
                onValueChange={(v) =>
                  setCreateData((prev) => ({ ...prev, persona_id: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={locale === "pt" ? "Nenhuma (opcional)" : "None (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {locale === "pt" ? "Nenhuma (opcional)" : "None (optional)"}
                  </SelectItem>
                  {personas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-audience-text"
                label={t.clients.sections.strategyFields.audienceText}
                tooltip={strategyTooltips.audienceText}
              />
              <Textarea
                id="strategy-audience-text"
                name="audience_text"
                rows={2}
                value={createData.audience_text}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, audience_text: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-celebrations"
                label={t.clients.sections.strategyFields.celebrations}
                tooltip={strategyTooltips.celebrations}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  id="strategy-celebrations"
                  type="checkbox"
                  name="use_celebration_dates"
                  checked={Boolean(createData.use_celebration_dates)}
                  onChange={(event) =>
                    setCreateData((prev) => ({
                      ...prev,
                      use_celebration_dates: event.target.checked,
                    }))
                  }
                />
                {locale === "pt" ? "Ativar datas festivas" : "Enable celebration dates"}
              </label>
            </div>
            {clientType === "content_creator" ? (
              <div className="space-y-2 md:col-span-2">
                <FieldLabel
                  htmlFor="strategy-personal-story"
                  label={locale === "pt" ? "Ângulo de história pessoal" : "Personal story angle"}
                  tooltip={locale === "pt" 
                    ? "Como queres incorporar a tua história pessoal e autenticidade no conteúdo?"
                    : "How do you want to incorporate your personal story and authenticity into content?"}
                />
                <Textarea
                  id="strategy-personal-story"
                  name="personal_story_angle"
                  rows={2}
                  placeholder={locale === "pt" 
                    ? "Ex: Partilhar experiências pessoais, mostrar o processo criativo..."
                    : "E.g. Share personal experiences, show creative process..."}
                />
              </div>
            ) : null}
            {clientType === "services" ? (
              <div className="space-y-2 md:col-span-2">
                <FieldLabel
                  htmlFor="strategy-campaign-objectives"
                  label={locale === "pt" ? "Objetivos de campanha" : "Campaign objectives"}
                  tooltip={locale === "pt"
                    ? "Objetivos específicos de negócio para esta estratégia (ex: conversões, awareness, lead generation)"
                    : "Specific business objectives for this strategy (e.g. conversions, awareness, lead generation)"}
                />
                <Textarea
                  id="strategy-campaign-objectives"
                  name="campaign_objectives"
                  rows={2}
                  placeholder={locale === "pt"
                    ? "Ex: Aumentar vendas em 20%, gerar 100 leads qualificados..."
                    : "E.g. Increase sales by 20%, generate 100 qualified leads..."}
                />
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-competitors"
                label={t.clients.sections.strategyFields.competitors}
                tooltip={strategyTooltips.competitors}
              />
              {competitors.length ? (
                <div className="flex flex-wrap gap-2">
                  {competitors.map((competitor) => (
                    <div key={competitor.id} className="relative">
                      <input
                        id={`competitor-${competitor.id}`}
                        type="checkbox"
                        name="competitor_ids"
                        value={competitor.id}
                        checked={createData.competitor_ids.includes(competitor.id)}
                        onChange={() => toggleListValue("competitor_ids", competitor.id)}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`competitor-${competitor.id}`}
                        className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                      >
                        {competitor.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === "pt"
                    ? "Ainda não tens competidores. Cria competidores primeiro."
                    : "No competitors yet. Create competitors first."}
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-reference-folders"
                label={t.clients.sections.strategyFields.referenceFolders}
                tooltip={strategyTooltips.referenceFolders}
              />
              {referenceGroups.length ? (
                <div className="flex flex-wrap gap-2">
                  {referenceGroups.map((group) => (
                    <div key={group.id} className="relative">
                      <input
                        id={`ref-group-${group.id}`}
                        type="checkbox"
                        name="reference_group_ids"
                        value={group.id}
                        checked={createData.reference_group_ids.includes(group.id)}
                        onChange={() => toggleListValue("reference_group_ids", group.id)}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`ref-group-${group.id}`}
                        className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                      >
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {locale === "pt"
                    ? "Ainda não tens pastas de referências. Cria pastas primeiro."
                    : "No reference folders yet. Create folders first."}
                </p>
              )}
            </div>
        </div>

        <div className={wizardStep === 1 ? "contents" : "hidden"}>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-positioning"
                label={t.clients.sections.strategyFields.positioning}
                tooltip={strategyTooltips.positioning}
              />
              <Textarea
                id="strategy-positioning"
                name="positioning"
                rows={2}
                value={createData.positioning}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, positioning: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-messages"
                label={t.clients.sections.strategyFields.keyMessages}
                tooltip={strategyTooltips.keyMessages}
              />
              <Textarea
                id="strategy-messages"
                name="key_messages"
                rows={2}
                value={createData.key_messages}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, key_messages: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-pillars"
                label={t.clients.sections.strategyFields.contentPillars}
                tooltip={strategyTooltips.contentPillars}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.contentPillars.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`pillar-${option}`}
                      type="checkbox"
                      name="content_pillars"
                      value={option}
                      checked={createData.content_pillars.includes(option)}
                      onChange={() => toggleListValue("content_pillars", option)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`pillar-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="content_pillars_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.content_pillars_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        content_pillars_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
        </div>

        <div className={wizardStep === 2 ? "contents" : "hidden"}>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-formats"
                label={t.clients.sections.strategyFields.formats}
                tooltip={strategyTooltips.formats}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.formats.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`format-${option}`}
                      type="checkbox"
                      name="formats"
                      value={option}
                      checked={createData.formats.includes(option)}
                      onChange={() => toggleListValue("formats", option)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`format-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="formats_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.formats_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        formats_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-channels"
                label={t.clients.sections.strategyFields.channels}
                tooltip={strategyTooltips.channels}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.channels.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`channel-${option}`}
                      type="checkbox"
                      name="channels"
                      value={option}
                      checked={createData.channels.includes(option)}
                      onChange={() => toggleListValue("channels", option)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`channel-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="channels_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.channels_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        channels_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-cadence"
                label={t.clients.sections.strategyFields.cadence}
                tooltip={strategyTooltips.cadence}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.cadence.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`cadence-${option}`}
                      type="radio"
                      name="cadence"
                      value={option}
                      checked={createData.cadence === option}
                      onChange={() =>
                        setCreateData((prev) => ({
                          ...prev,
                          cadence: option,
                          cadence_other: "",
                        }))
                      }
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`cadence-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="cadence_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.cadence_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        cadence: "",
                        cadence_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
        </div>

        <div className={wizardStep === 3 ? "contents" : "hidden"}>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-kpis"
                label={t.clients.sections.strategyFields.kpis}
                tooltip={strategyTooltips.kpis}
              />
              <div className="flex flex-wrap gap-2">
                {strategyOptions.kpis.map((option) => (
                  <div key={option} className="relative">
                    <input
                      id={`kpi-${option}`}
                      type="checkbox"
                      name="kpis"
                      value={option}
                      checked={createData.kpis.includes(option)}
                      onChange={() => toggleListValue("kpis", option)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`kpi-${option}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
                <div className="w-full">
                  <Input
                    name="kpis_other"
                    placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                    title={strategyTooltips.other}
                    value={createData.kpis_other}
                    onChange={(event) =>
                      setCreateData((prev) => ({
                        ...prev,
                        kpis_other: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-guardrails"
                label={t.clients.sections.strategyFields.guardrails}
                tooltip={strategyTooltips.guardrails}
              />
              <Textarea
                id="strategy-guardrails"
                name="guardrails"
                rows={2}
                value={createData.guardrails}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, guardrails: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor="strategy-ai"
                label={t.clients.sections.strategyFields.aiNotes}
                tooltip={strategyTooltips.aiNotes}
              />
              <Textarea
                id="strategy-ai"
                name="ai_notes"
                rows={2}
                value={createData.ai_notes}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, ai_notes: event.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="strategy-active"
                type="checkbox"
                name="is_active"
                checked={createData.is_active}
                onChange={(event) =>
                  setCreateData((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              <Label htmlFor="strategy-active">{t.clients.sections.strategyFields.active}</Label>
              <InfoTooltip text={strategyTooltips.active} />
            </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))}
            disabled={wizardStep === 0}
          >
            {t.clients.sections.strategyActions.back}
          </Button>
          {wizardStep < steps.length - 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={!canNext}
            >
              {t.clients.sections.strategyActions.next}
            </Button>
          ) : (
            <SubmitButton variant="brand" disabled={!canSave}>
              {t.clients.sections.strategyActions.save}
            </SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}

export function ClientStrategyEditor({
  clientId,
  locale,
  clientType = "services",
  strategy,
  personas,
  competitors,
  referenceGroups,
}: {
  clientId: string;
  locale: Locale;
  clientType?: "services" | "content_creator";
  strategy: Strategy;
  personas: { id: string; name: string }[];
  competitors: { id: string; name: string }[];
  referenceGroups: { id: string; name: string }[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar esta estratégia? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this strategy? This action cannot be undone.";

  const [updateState, updateAction] = useActionState(
    updateStrategy.bind(null, strategy.id, clientId),
    {}
  );
  const [deleteState, deleteAction] = useActionState(
    deleteStrategy.bind(null, strategy.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!deleteState?.success) return;
    router.push(`/dashboard/clients/${clientId}/strategy`);
    router.refresh();
  }, [clientId, deleteState?.success, router]);

  const strategyOptions = t.clients.sections.strategyOptions;
  const strategyTooltips = t.clients.sections.strategyTooltips;

  const emptyEdit = useMemo(
    () => ({
      title: "",
      status: "",
      objectives: [] as string[],
      objectives_other: "",
      audience_text: "",
      audience_personas: [] as string[],
      persona_id: "",
      use_celebration_dates: true,
      competitor_ids: [] as string[],
      reference_group_ids: [] as string[],
      positioning: "",
      key_messages: "",
      content_pillars: [] as string[],
      content_pillars_other: "",
      formats: [] as string[],
      formats_other: "",
      channels: [] as string[],
      channels_other: "",
      cadence: "",
      cadence_other: "",
      kpis: [] as string[],
      kpis_other: "",
      guardrails: "",
      ai_notes: "",
      is_active: false,
    }),
    []
  );

  const buildInitialData = useMemo(() => {
    const base = { ...emptyEdit };
    base.title = strategy.title ?? "";
    base.status = strategy.status ?? "";
    base.positioning = strategy.positioning ?? "";
    base.key_messages = strategy.key_messages ?? "";
    base.guardrails = strategy.guardrails ?? "";
    base.ai_notes = strategy.ai_notes ?? "";
    base.is_active = Boolean(strategy.is_active);

    const audience = parseAudience(strategy.audience);
    base.audience_personas = audience.personas;
    base.audience_text = audience.text;
    base.persona_id = strategy.persona_id ?? "";
    base.use_celebration_dates = Boolean(strategy.use_celebration_dates ?? true);
    base.competitor_ids = (strategy.competitor_ids ?? []) as string[];
    base.reference_group_ids = (strategy.reference_group_ids ?? []) as string[];

    const objectives = splitKnownUnknown(parseList(strategy.objectives), strategyOptions.objectives);
    base.objectives = objectives.selected;
    base.objectives_other = objectives.other;

    const pillars = splitKnownUnknown(
      parseList(strategy.content_pillars),
      strategyOptions.contentPillars
    );
    base.content_pillars = pillars.selected;
    base.content_pillars_other = pillars.other;

    const formats = splitKnownUnknown(parseList(strategy.formats), strategyOptions.formats);
    base.formats = formats.selected;
    base.formats_other = formats.other;

    const channels = splitKnownUnknown(parseList(strategy.channels), strategyOptions.channels);
    base.channels = channels.selected;
    base.channels_other = channels.other;

    const kpis = splitKnownUnknown(parseList(strategy.kpis), strategyOptions.kpis);
    base.kpis = kpis.selected;
    base.kpis_other = kpis.other;

    const cadenceRaw = (strategy.cadence ?? "").trim();
    base.cadence = cadenceRaw && (strategyOptions.cadence as readonly string[]).includes(cadenceRaw) ? cadenceRaw : "";
    base.cadence_other =
      cadenceRaw && !(strategyOptions.cadence as readonly string[]).includes(cadenceRaw) ? cadenceRaw : "";

    return base;
  }, [emptyEdit, strategy, strategyOptions]);

  const [editData, setEditData] = useState(buildInitialData);
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    setEditData(buildInitialData);
  }, [buildInitialData]);

  const listCount = (list: string[], other?: string) => list.length + (other?.trim() ? 1 : 0);

  const stepValidity = useMemo(() => {
    const objectivesCount = listCount(editData.objectives, editData.objectives_other);
    const pillarsCount = listCount(editData.content_pillars, editData.content_pillars_other);
    const formatsCount = listCount(editData.formats, editData.formats_other);
    const channelsCount = listCount(editData.channels, editData.channels_other);
    const kpisCount = listCount(editData.kpis, editData.kpis_other);

    return [
      Boolean(editData.title.trim()) && objectivesCount > 0,
      Boolean(editData.positioning.trim()) &&
        Boolean(editData.key_messages.trim()) &&
        pillarsCount > 0,
      formatsCount > 0 && channelsCount > 0,
      kpisCount > 0,
    ];
  }, [editData]);

  const canNext = stepValidity[wizardStep];
  const canSave = stepValidity.every(Boolean);
  const steps = t.clients.sections.strategyWizardSteps;

  const toggleListValue = (key: keyof typeof emptyEdit, value: string) => {
    setEditData((prev) => {
      const current = new Set(prev[key] as string[]);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...prev, [key]: Array.from(current) };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <EntityContextMenu
          ariaLabel={locale === "pt" ? "Ações da estratégia" : "Strategy actions"}
          items={[
            {
              key: "back",
              label: locale === "pt" ? "Voltar à lista" : "Back to list",
              onSelect: () => router.push(`/dashboard/clients/${clientId}/strategy`),
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

      {updateState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{updateState.error}</AlertDescription>
        </Alert>
      ) : null}
      {updateState?.success ? (
        <Alert>
          <AlertTitle>{t.common.successTitle}</AlertTitle>
          <AlertDescription>{updateState.success}</AlertDescription>
        </Alert>
      ) : null}
      {deleteState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{deleteState.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {steps.map((stepLabel, index) => (
          <span
            key={stepLabel}
            className={`rounded-full border px-2 py-1 ${
              index === wizardStep ? "border-brand/60 bg-brand/10 text-brand" : ""
            }`}
          >
            {stepLabel}
          </span>
        ))}
      </div>

      <form action={updateAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="locale" value={locale} />
        <div className={wizardStep === 0 ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-title-${strategy.id}`}
              label={t.clients.sections.strategyFields.title}
              tooltip={strategyTooltips.title}
            />
            <Input
              id={`strategy-title-${strategy.id}`}
              name="title"
              required
              value={editData.title}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-status-${strategy.id}`}
              label={t.clients.sections.strategyFields.status}
              tooltip={strategyTooltips.status}
            />
            <Input
              id={`strategy-status-${strategy.id}`}
              name="status"
              value={editData.status}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, status: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-objectives-${strategy.id}`}
              label={t.clients.sections.strategyFields.objectives}
              tooltip={strategyTooltips.objectives}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.objectives.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`objective-${strategy.id}-${option}`}
                    type="checkbox"
                    name="objectives"
                    value={option}
                    checked={editData.objectives.includes(option)}
                    onChange={() => toggleListValue("objectives", option)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`objective-${strategy.id}-${option}`}
                    className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="objectives_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.objectives_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      objectives_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-audience-personas-${strategy.id}`}
              label={t.clients.sections.strategyFields.audiencePersonas}
              tooltip={strategyTooltips.audiencePersonas}
            />
            <div className="flex flex-wrap gap-2">
              {personas.length ? (
                personas.map((persona) => (
                  <div key={persona.id} className="relative">
                    <input
                      id={`persona-${strategy.id}-${persona.id}`}
                      type="checkbox"
                      name="audience_personas"
                      value={persona.name}
                      checked={editData.audience_personas.includes(persona.name)}
                      onChange={() => toggleListValue("audience_personas", persona.name)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`persona-${strategy.id}-${persona.id}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {persona.name}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.clients.sections.strategyAudienceEmpty}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-persona-${strategy.id}`}
              label={t.clients.sections.strategyFields.persona}
              tooltip={
                locale === "pt"
                  ? "Persona principal que deve orientar a planificação (quando aplicável)."
                  : "Primary persona to guide planning (when applicable)."
              }
            />
            <input type="hidden" name="persona_id" value={editData.persona_id || ""} />
            <Select
              value={editData.persona_id || "__none__"}
              onValueChange={(v) =>
                setEditData((prev) => ({ ...prev, persona_id: v === "__none__" ? "" : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={locale === "pt" ? "Nenhuma (opcional)" : "None (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {locale === "pt" ? "Nenhuma (opcional)" : "None (optional)"}
                </SelectItem>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-audience-text-${strategy.id}`}
              label={t.clients.sections.strategyFields.audienceText}
              tooltip={strategyTooltips.audienceText}
            />
            <Textarea
              id={`strategy-audience-text-${strategy.id}`}
              name="audience_text"
              rows={2}
              value={editData.audience_text}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, audience_text: event.target.value }))
              }
            />
          </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel
                htmlFor={`strategy-celebrations-${strategy.id}`}
                label={t.clients.sections.strategyFields.celebrations}
                tooltip={strategyTooltips.celebrations}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  id={`strategy-celebrations-${strategy.id}`}
                  type="checkbox"
                  name="use_celebration_dates"
                  checked={Boolean(editData.use_celebration_dates)}
                  onChange={(event) =>
                    setEditData((prev) => ({ ...prev, use_celebration_dates: event.target.checked }))
                  }
                />
                {locale === "pt" ? "Ativar datas festivas" : "Enable celebration dates"}
              </label>
            </div>
            {clientType === "content_creator" ? (
              <div className="space-y-2 md:col-span-2">
                <FieldLabel
                  htmlFor={`strategy-personal-story-${strategy.id}`}
                  label={locale === "pt" ? "Ângulo de história pessoal" : "Personal story angle"}
                  tooltip={locale === "pt" 
                    ? "Como queres incorporar a tua história pessoal e autenticidade no conteúdo?"
                    : "How do you want to incorporate your personal story and authenticity into content?"}
                />
                <Textarea
                  id={`strategy-personal-story-${strategy.id}`}
                  name="personal_story_angle"
                  rows={2}
                  placeholder={locale === "pt" 
                    ? "Ex: Partilhar experiências pessoais, mostrar o processo criativo..."
                    : "E.g. Share personal experiences, show creative process..."}
                />
              </div>
            ) : null}
            {clientType === "services" ? (
              <div className="space-y-2 md:col-span-2">
                <FieldLabel
                  htmlFor={`strategy-campaign-objectives-${strategy.id}`}
                  label={locale === "pt" ? "Objetivos de campanha" : "Campaign objectives"}
                  tooltip={locale === "pt"
                    ? "Objetivos específicos de negócio para esta estratégia (ex: conversões, awareness, lead generation)"
                    : "Specific business objectives for this strategy (e.g. conversions, awareness, lead generation)"}
                />
                <Textarea
                  id={`strategy-campaign-objectives-${strategy.id}`}
                  name="campaign_objectives"
                  rows={2}
                  placeholder={locale === "pt"
                    ? "Ex: Aumentar vendas em 20%, gerar 100 leads qualificados..."
                    : "E.g. Increase sales by 20%, generate 100 qualified leads..."}
                />
              </div>
            ) : null}
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-competitors-${strategy.id}`}
              label={t.clients.sections.strategyFields.competitors}
              tooltip={strategyTooltips.competitors}
            />
            {competitors.length ? (
              <div className="flex flex-wrap gap-2">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="relative">
                    <input
                      id={`competitor-${strategy.id}-${competitor.id}`}
                      type="checkbox"
                      name="competitor_ids"
                      value={competitor.id}
                      checked={editData.competitor_ids.includes(competitor.id)}
                      onChange={() => toggleListValue("competitor_ids", competitor.id)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`competitor-${strategy.id}-${competitor.id}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {competitor.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {locale === "pt"
                  ? "Ainda não tens competidores. Cria competidores primeiro."
                  : "No competitors yet. Create competitors first."}
              </p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-reference-folders-${strategy.id}`}
              label={t.clients.sections.strategyFields.referenceFolders}
              tooltip={strategyTooltips.referenceFolders}
            />
            {referenceGroups.length ? (
              <div className="flex flex-wrap gap-2">
                {referenceGroups.map((group) => (
                  <div key={group.id} className="relative">
                    <input
                      id={`ref-group-${strategy.id}-${group.id}`}
                      type="checkbox"
                      name="reference_group_ids"
                      value={group.id}
                      checked={editData.reference_group_ids.includes(group.id)}
                      onChange={() => toggleListValue("reference_group_ids", group.id)}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`ref-group-${strategy.id}-${group.id}`}
                      className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                    >
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {locale === "pt"
                  ? "Ainda não tens pastas de referências. Cria pastas primeiro."
                  : "No reference folders yet. Create folders first."}
              </p>
            )}
          </div>
        </div>

        <div className={wizardStep === 1 ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-positioning-${strategy.id}`}
              label={t.clients.sections.strategyFields.positioning}
              tooltip={strategyTooltips.positioning}
            />
            <Textarea
              id={`strategy-positioning-${strategy.id}`}
              name="positioning"
              rows={2}
              value={editData.positioning}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, positioning: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-messages-${strategy.id}`}
              label={t.clients.sections.strategyFields.keyMessages}
              tooltip={strategyTooltips.keyMessages}
            />
            <Textarea
              id={`strategy-messages-${strategy.id}`}
              name="key_messages"
              rows={2}
              value={editData.key_messages}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, key_messages: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-pillars-${strategy.id}`}
              label={t.clients.sections.strategyFields.contentPillars}
              tooltip={strategyTooltips.contentPillars}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.contentPillars.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`pillar-${strategy.id}-${option}`}
                    type="checkbox"
                    name="content_pillars"
                    value={option}
                    checked={editData.content_pillars.includes(option)}
                    onChange={() => toggleListValue("content_pillars", option)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`pillar-${strategy.id}-${option}`}
                    className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="content_pillars_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.content_pillars_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      content_pillars_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className={wizardStep === 2 ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-formats-${strategy.id}`}
              label={t.clients.sections.strategyFields.formats}
              tooltip={strategyTooltips.formats}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.formats.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`format-${strategy.id}-${option}`}
                    type="checkbox"
                    name="formats"
                    value={option}
                    checked={editData.formats.includes(option)}
                    onChange={() => toggleListValue("formats", option)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`format-${strategy.id}-${option}`}
                    className={`cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10 ${
                      clientType === "content_creator" && ((option as string) === "reel" || (option as string) === "short" || (option as string) === "story")
                        ? "ring-2 ring-brand/40"
                        : ""
                    }`}
                  >
                    {option}
                    {clientType === "content_creator" && ((option as string) === "reel" || (option as string) === "short" || (option as string) === "story") ? (
                      <span className="ml-1 text-xs text-brand">★</span>
                    ) : null}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="formats_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.formats_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      formats_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-channels-${strategy.id}`}
              label={t.clients.sections.strategyFields.channels}
              tooltip={strategyTooltips.channels}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.channels.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`channel-${strategy.id}-${option}`}
                    type="checkbox"
                    name="channels"
                    value={option}
                    checked={editData.channels.includes(option)}
                    onChange={() => toggleListValue("channels", option)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`channel-${strategy.id}-${option}`}
                    className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="channels_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.channels_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      channels_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-cadence-${strategy.id}`}
              label={t.clients.sections.strategyFields.cadence}
              tooltip={strategyTooltips.cadence}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.cadence.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`cadence-${strategy.id}-${option}`}
                    type="radio"
                    name="cadence"
                    value={option}
                    checked={editData.cadence === option}
                    onChange={() =>
                      setEditData((prev) => ({
                        ...prev,
                        cadence: option,
                        cadence_other: "",
                      }))
                    }
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`cadence-${strategy.id}-${option}`}
                    className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="cadence_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.cadence_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      cadence: "",
                      cadence_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className={wizardStep === 3 ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-kpis-${strategy.id}`}
              label={t.clients.sections.strategyFields.kpis}
              tooltip={strategyTooltips.kpis}
            />
            <div className="flex flex-wrap gap-2">
              {strategyOptions.kpis.map((option) => (
                <div key={option} className="relative">
                  <input
                    id={`kpi-${strategy.id}-${option}`}
                    type="checkbox"
                    name="kpis"
                    value={option}
                    checked={editData.kpis.includes(option)}
                    onChange={() => toggleListValue("kpis", option)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`kpi-${strategy.id}-${option}`}
                    className="cursor-pointer rounded-full border border-border/60 px-3 py-1 text-sm peer-checked:border-brand/60 peer-checked:bg-brand/10"
                  >
                    {option}
                  </Label>
                </div>
              ))}
              <div className="w-full">
                <Input
                  name="kpis_other"
                  placeholder={t.clients.sections.strategyFields.otherPlaceholder}
                  title={strategyTooltips.other}
                  value={editData.kpis_other}
                  onChange={(event) =>
                    setEditData((prev) => ({
                      ...prev,
                      kpis_other: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-guardrails-${strategy.id}`}
              label={t.clients.sections.strategyFields.guardrails}
              tooltip={strategyTooltips.guardrails}
            />
            <Textarea
              id={`strategy-guardrails-${strategy.id}`}
              name="guardrails"
              rows={2}
              value={editData.guardrails}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, guardrails: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`strategy-ai-${strategy.id}`}
              label={t.clients.sections.strategyFields.aiNotes}
              tooltip={strategyTooltips.aiNotes}
            />
            <Textarea
              id={`strategy-ai-${strategy.id}`}
              name="ai_notes"
              rows={2}
              value={editData.ai_notes}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, ai_notes: event.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id={`strategy-active-${strategy.id}`}
              type="checkbox"
              name="is_active"
              checked={editData.is_active}
              onChange={(event) =>
                setEditData((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            <Label htmlFor={`strategy-active-${strategy.id}`}>
              {t.clients.sections.strategyFields.active}
            </Label>
            <InfoTooltip text={strategyTooltips.active} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWizardStep((prev) => Math.max(0, prev - 1))}
            disabled={wizardStep === 0}
          >
            {t.clients.sections.strategyActions.back}
          </Button>
          {wizardStep < steps.length - 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={!canNext}
            >
              {t.clients.sections.strategyActions.next}
            </Button>
          ) : (
            <SubmitButton variant="brand" disabled={!canSave}>
              {t.clients.sections.strategyActions.save}
            </SubmitButton>
          )}
        </div>
      </form>

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" />
      </form>
    </div>
  );
}

function StrategyCard({
  strategy,
  clientId,
  locale,
}: {
  strategy: Strategy;
  clientId: string;
  locale: Locale;
}) {
  const t = copy[locale];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar esta estratégia? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this strategy? This action cannot be undone.";
  const [deleteState, deleteAction] = useActionState(
    deleteStrategy.bind(null, strategy.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const parseList = (value?: string | null) =>
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const objectives = parseList(strategy.objectives).slice(0, 3);
  const channels = parseList(strategy.channels).slice(0, 3);

  const setActive = () => {
    startTransition(async () => {
      await setActiveStrategy(strategy.id, clientId, locale);
      router.refresh();
    });
  };

  return (
    <div className={`rounded-xl border p-4 transition-default ${strategy.is_active ? "border-brand/30 bg-surface-1 shadow-sm" : "border-border/20 bg-surface-1"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{strategy.title}</h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                strategy.is_active
                  ? "border-brand/60 bg-brand/10 text-brand"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {strategy.is_active
                ? t.clients.sections.strategyActive
                : t.clients.sections.strategyInactive}
            </span>
          </div>
          {strategy.status ? (
            <p className="mt-1 text-xs text-muted-foreground">{strategy.status}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
        {!strategy.is_active ? (
          <Button variant="outline" size="sm" onClick={setActive} disabled={isPending}>
            {t.clients.sections.strategyActions.setActive}
          </Button>
        ) : null}
          <EntityContextMenu
            ariaLabel={locale === "pt" ? "Ações da estratégia" : "Strategy actions"}
            items={[
              {
                key: "edit",
                label: locale === "pt" ? "Editar" : "Edit",
                onSelect: () =>
                  router.push(`/dashboard/clients/${clientId}/strategy/${strategy.id}`),
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
      </div>
      {(objectives.length || channels.length) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {objectives.map((item) => (
            <span key={`objective-${item}`} className="rounded-full border px-2 py-1">
              {item}
            </span>
          ))}
          {channels.map((item) => (
            <span key={`channel-${item}`} className="rounded-full border px-2 py-1">
              {item}
            </span>
          ))}
        </div>
      )}
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

function FieldLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor: string;
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      <InfoTooltip text={tooltip} />
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-4 w-4 text-muted-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md border border-border/60 bg-popover px-2 py-1 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
