"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Locale } from "@/lib/i18n";
import { createSavedAudience, deleteSavedAudience, type SavedAudience } from "@/app/(app)/dashboard/clients/actions";

type ClientAudiencesProps = {
  clientId: string;
  locale: Locale;
  initialAudiences: SavedAudience[];
};

type CreateFormState = {
  name: string;
  description: string;
  platform: string;
  ageMin: string;
  ageMax: string;
  locations: string;
  interests: string;
};

const EMPTY_FORM: CreateFormState = {
  name: "",
  description: "",
  platform: "instagram",
  ageMin: "18",
  ageMax: "65",
  locations: "",
  interests: "",
};

export function ClientAudiences({ clientId, locale, initialAudiences }: ClientAudiencesProps) {
  const [audiences, setAudiences] = useState<SavedAudience[]>(initialAudiences);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  function handleFormChange(field: keyof CreateFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleCreate() {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const targeting: Record<string, unknown> = {};
      if (form.ageMin) targeting.age_min = parseInt(form.ageMin);
      if (form.ageMax) targeting.age_max = parseInt(form.ageMax);
      if (form.locations) targeting.locations = form.locations.split(",").map((l) => l.trim()).filter(Boolean);
      if (form.interests) targeting.interests = form.interests.split(",").map((i) => i.trim()).filter(Boolean);

      const result = await createSavedAudience(clientId, locale, {
        name: form.name,
        description: form.description || undefined,
        platform: form.platform,
        targeting,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.audience) {
        setAudiences((prev) => [result.audience!, ...prev]);
        toast.success(locale === "pt" ? "Audiência criada." : "Audience created.");
        setShowCreate(false);
        setForm(EMPTY_FORM);
      }
    });
  }

  function handleDelete(audienceId: string) {
    startTransition(async () => {
      const result = await deleteSavedAudience(audienceId, clientId, locale);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAudiences((prev) => prev.filter((a) => a.id !== audienceId));
      toast.success(result.success);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="brand"
          className="gap-2"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          {locale === "pt" ? "Nova audiência" : "New audience"}
        </Button>
      </div>

      {/* Create form */}
      {showCreate ? (
        <div className="rounded-md border border-border/40 bg-card/60 p-4 space-y-3">
          <div className="text-sm font-semibold">
            {locale === "pt" ? "Nova audiência" : "New audience"}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Nome" : "Name"} *</div>
              <Input value={form.name} onChange={(e) => handleFormChange("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Plataforma" : "Platform"}</div>
              <Select value={form.platform} onValueChange={(v) => handleFormChange("platform", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Descrição" : "Description"}</div>
              <Textarea value={form.description} onChange={(e) => handleFormChange("description", e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Idade mín." : "Min age"}</div>
              <Input type="number" value={form.ageMin} onChange={(e) => handleFormChange("ageMin", e.target.value)} min={13} max={65} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Idade máx." : "Max age"}</div>
              <Input type="number" value={form.ageMax} onChange={(e) => handleFormChange("ageMax", e.target.value)} min={13} max={65} />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Localidades (sep. vírgulas)" : "Locations (comma-separated)"}</div>
              <Input value={form.locations} onChange={(e) => handleFormChange("locations", e.target.value)} placeholder="e.g. Portugal, Brazil" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{locale === "pt" ? "Interesses (sep. vírgulas)" : "Interests (comma-separated)"}</div>
              <Input value={form.interests} onChange={(e) => handleFormChange("interests", e.target.value)} placeholder="e.g. fitness, travel" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="brand" disabled={!form.name.trim() || isPending} onClick={handleCreate}>
              {locale === "pt" ? "Criar audiência" : "Create audience"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
              {locale === "pt" ? "Cancelar" : "Cancel"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* List */}
      {audiences.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {locale === "pt" ? "Sem audiências ainda." : "No audiences yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {audiences.map((a) => {
            const targeting = a.targeting as Record<string, unknown>;
            return (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card/60 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.name}</div>
                  {a.description ? (
                    <div className="mt-0.5 text-xs text-muted-foreground">{a.description}</div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted/60 px-1.5 py-0.5">{a.platform}</span>
                    {targeting.age_min || targeting.age_max ? (
                      <span>{`${targeting.age_min ?? "?"}-${targeting.age_max ?? "?"}`}</span>
                    ) : null}
                    {Array.isArray(targeting.locations) && targeting.locations.length > 0 ? (
                      <span>{(targeting.locations as string[]).join(", ")}</span>
                    ) : null}
                  </div>
                  {a.used_in_campaigns > 0 ? (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {locale === "pt" ? `Usada em ${a.used_in_campaigns} campanhas` : `Used in ${a.used_in_campaigns} campaigns`}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isPending}
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
