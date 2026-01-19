"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCompetitor,
  deleteCompetitor,
  updateCompetitor,
} from "@/app/(app)/dashboard/clients/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";

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
  swot_strengths: string | null;
  swot_weaknesses: string | null;
  swot_opportunities: string | null;
  swot_threats: string | null;
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
      <div className="rounded-md border border-border/40 p-4 text-sm text-muted-foreground">
        {t.clients.sections.competitorsEmpty}
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
    <div className="rounded-md border border-border/40 p-4">
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
          <Button type="submit" className="bg-brand text-primary-foreground">
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
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!deleteState?.success) return;
    router.push(`/dashboard/clients/${clientId}/competitors`);
    router.refresh();
  }, [clientId, deleteState?.success, router]);

  const tabs = useMemo(
    () => [
      { key: "profile", label: t.clients.sections.competitorsTabs.profile },
      { key: "social", label: t.clients.sections.competitorsTabs.socials },
      { key: "notes", label: t.clients.sections.competitorsTabs.notes },
      { key: "swot", label: t.clients.sections.competitorsTabs.swot },
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

        <div className={activeTab === "swot" ? "contents" : "hidden"}>
          <div className="space-y-2 md:col-span-2">
            <div className="text-sm font-medium">{t.clients.sections.competitorsFields.swot}</div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.clients.sections.competitorsFields.swotStrengths}
            </label>
            <Textarea name="swot_strengths" rows={4} defaultValue={competitor.swot_strengths ?? ""} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.clients.sections.competitorsFields.swotWeaknesses}
            </label>
            <Textarea name="swot_weaknesses" rows={4} defaultValue={competitor.swot_weaknesses ?? ""} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.clients.sections.competitorsFields.swotOpportunities}
            </label>
            <Textarea
              name="swot_opportunities"
              rows={4}
              defaultValue={competitor.swot_opportunities ?? ""}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.clients.sections.competitorsFields.swotThreats}
            </label>
            <Textarea name="swot_threats" rows={4} defaultValue={competitor.swot_threats ?? ""} />
          </div>
        </div>

        <div className="md:col-span-2">
          <Button type="submit" className="bg-brand text-primary-foreground">
            {t.clients.sections.competitorsActions.update}
          </Button>
        </div>
      </form>

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" />
      </form>
    </div>
  );
}

