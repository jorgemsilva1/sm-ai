"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPersona,
  deletePersona,
  updatePersona,
} from "@/app/(app)/dashboard/clients/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EntityContextMenu } from "@/components/ui/entity-context-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import { Info } from "lucide-react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    google?: any;
  }
}

type Persona = {
  id: string;
  name: string;
  role_title: string | null;
  avatar_color: string | null;
  age_range: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  gender: string | null;
  style_preferences: string | null;
  demographics: string | null;
  goals: string | null;
  pain_points: string | null;
  motivations: string | null;
  channels: string | null;
  content_preferences: string | null;
  objections: string | null;
  notes: string | null;
};

type ClientPersonasProps = {
  clientId: string;
  locale: Locale;
  personas: Persona[];
};

const AVATAR_COLORS = [
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#10B981",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const AGE_RANGES = ["16-24", "25-34", "35-44", "45-54", "55+"];
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function getStyleOptions(locale: Locale) {
  return locale === "pt"
    ? [
        "Minimalista",
        "Colorido",
        "Premium",
        "Divertido",
        "Educativo",
        "Autêntico",
        "Trend-driven",
        "UGC",
        "Narrativo",
      ]
    : [
        "Minimal",
        "Colorful",
        "Premium",
        "Playful",
        "Educational",
        "Authentic",
        "Trend-driven",
        "UGC",
        "Story-driven",
      ];
}

function splitList(value?: string | null) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function getOtherValues(value: string | null, options: string[]) {
  const values = splitList(value);
  const others = values.filter((item) => !options.includes(item));
  return others.join(", ");
}

function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function PersonaPreview({
  name,
  role,
  avatarColor,
  ageRange,
  location,
  gender,
  goals,
  channels,
  locale,
}: {
  name: string;
  role: string;
  avatarColor: string;
  ageRange: string;
  location: string;
  gender: string;
  goals: string[];
  channels: string[];
  locale: Locale;
}) {
  const t = copy[locale];
  const tooltips = t.clients.sections.personasTooltips;
  const genderOptions =
    locale === "pt"
      ? ["Feminino", "Masculino", "Não-binário", "Outro", "Prefere não dizer"]
      : ["Female", "Male", "Non-binary", "Other", "Prefer not to say"];
  const styleOptions =
    locale === "pt"
      ? [
          "Minimalista",
          "Colorido",
          "Premium",
          "Divertido",
          "Educativo",
          "Autêntico",
          "Trend-driven",
          "UGC",
          "Narrativo",
        ]
      : [
          "Minimal",
          "Colorful",
          "Premium",
          "Playful",
          "Educational",
          "Authentic",
          "Trend-driven",
          "UGC",
          "Story-driven",
        ];
  return (
    <div className="rounded-md border border-border/40 bg-card/60 p-4">
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
          style={{ backgroundColor: avatarColor }}
        >
          {name ? name.slice(0, 2).toUpperCase() : "?"}
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {name || t.clients.sections.personasFields.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {role || t.clients.sections.personasFields.roleTitle}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {ageRange ? <span>{ageRange}</span> : null}
            {gender ? <span>{gender}</span> : null}
            {location ? <span>{location}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {t.clients.sections.personasFields.goals}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {goals.length ? (
              goals.map((goal) => (
                <span
                  key={goal}
                  className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground"
                >
                  {goal}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/70">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {t.clients.sections.personasFields.channels}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {channels.length ? (
              channels.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground"
                >
                  {channel}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/70">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientPersonaForm({
  clientId,
  locale,
}: {
  clientId: string;
  locale: Locale;
}) {
  const t = copy[locale];
  const tooltips = t.clients.sections.personasTooltips;
  const [createState, createAction] = useActionState(
    createPersona.bind(null, clientId),
    {}
  );

  const goalOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Reconhecimento", "Engagement", "Vendas", "Leads", "Fidelização"]
        : ["Awareness", "Engagement", "Sales", "Leads", "Retention"],
    [locale]
  );
  const channelOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"]
        : ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"],
    [locale]
  );
  const painOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Pouco tempo", "Baixo alcance", "Sem estratégia", "Orçamento limitado"]
        : ["Low time", "Low reach", "No strategy", "Limited budget"],
    [locale]
  );
  const motivationOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Crescimento", "Reconhecimento", "Aprendizagem", "Confiança"]
        : ["Growth", "Recognition", "Learning", "Trust"],
    [locale]
  );
  const contentOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Reels/Shorts", "Carrosséis", "Stories", "UGC", "Educativo"]
        : ["Reels/Shorts", "Carousels", "Stories", "UGC", "Educational"],
    [locale]
  );
  const objectionOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Preço", "Tempo", "Resultados", "Complexidade"]
        : ["Price", "Time", "Results", "Complexity"],
    [locale]
  );
  const genderOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Feminino", "Masculino", "Não-binário", "Outro", "Prefere não dizer"]
        : ["Female", "Male", "Non-binary", "Other", "Prefer not to say"],
    [locale]
  );
  const styleOptions = useMemo(() => getStyleOptions(locale), [locale]);

  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createAvatar, setCreateAvatar] = useState(AVATAR_COLORS[0]);
  const [createAgeRange, setCreateAgeRange] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [createLocationPlaceId, setCreateLocationPlaceId] = useState("");
  const [createLocationLat, setCreateLocationLat] = useState("");
  const [createLocationLng, setCreateLocationLng] = useState("");
  const [createGender, setCreateGender] = useState("");
  const [createStylePreferences, setCreateStylePreferences] = useState<string[]>([]);
  const [createGoals, setCreateGoals] = useState<string[]>([]);
  const [createChannels, setCreateChannels] = useState<string[]>([]);

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">
          {t.clients.sections.personasCreateTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t.clients.sections.personasCreateSubtitle}
        </p>
      </div>

      <PersonaPreview
        name={createName}
        role={createRole}
        avatarColor={createAvatar}
        ageRange={createAgeRange}
        location={createLocation}
        gender={createGender}
        goals={createGoals}
        channels={createChannels}
        locale={locale}
      />

      {createState?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{createState.error}</AlertDescription>
        </Alert>
      ) : null}

      {createState?.success ? (
        <Alert>
          <AlertTitle>{t.common.updatedTitle}</AlertTitle>
          <AlertDescription>{createState.success}</AlertDescription>
        </Alert>
      ) : null}

      <form action={createAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-2">
            <FieldLabel
              htmlFor="persona-name"
              label={t.clients.sections.personasFields.name}
              tooltip={tooltips.name}
            />
            <Input
              id="persona-name"
              name="name"
              required
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel
              htmlFor="persona-role"
              label={t.clients.sections.personasFields.roleTitle}
              tooltip={tooltips.roleTitle}
            />
            <Input
              id="persona-role"
              name="role_title"
              value={createRole}
              onChange={(event) => setCreateRole(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              label={t.clients.sections.personasFields.demographics}
            />
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="persona-age"
                  label={t.clients.sections.personasFields.ageRange}
                  tooltip={tooltips.ageRange}
                />
                <input type="hidden" name="age_range" value={createAgeRange || ""} />
                <Select value={createAgeRange || "__none__"} onValueChange={(v) => setCreateAgeRange(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {AGE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor="persona-gender"
                  label={t.clients.sections.personasFields.gender}
                  tooltip={tooltips.gender}
                />
                <input type="hidden" name="gender" value={createGender || ""} />
                <Select value={createGender || "__none__"} onValueChange={(v) => setCreateGender(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {genderOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <LocationInput
                  id="persona-location"
                  label={t.clients.sections.personasFields.location}
                  hint={t.clients.sections.personasFields.locationHint}
                  tooltip={tooltips.location}
                  value={createLocation}
                  placeId={createLocationPlaceId}
                  lat={createLocationLat}
                  lng={createLocationLng}
                  onChange={(next) => setCreateLocation(next)}
                  onPlaceChange={(next) => {
                    setCreateLocation(next.value);
                    setCreateLocationPlaceId(next.placeId ?? "");
                    setCreateLocationLat(next.lat ?? "");
                    setCreateLocationLng(next.lng ?? "");
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor="persona-avatar"
              label={t.clients.sections.personasFields.avatarColor}
              tooltip={tooltips.avatarColor}
            />
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <label key={color} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="avatar_color"
                    value={color}
                    checked={createAvatar === color}
                    onChange={() => setCreateAvatar(color)}
                  />
                  <span
                    className="h-6 w-6 rounded-full border border-border/40"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>
          <CheckboxGroup
            title={t.clients.sections.personasFields.goals}
            tooltip={tooltips.goals}
            name="goals"
            options={goalOptions}
            onChange={setCreateGoals}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.channels}
            tooltip={tooltips.channels}
            name="channels"
            options={channelOptions}
            onChange={setCreateChannels}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.painPoints}
            tooltip={tooltips.painPoints}
            name="pain_points"
            options={painOptions}
            otherName="pain_points_other"
            otherPlaceholder={t.common.other}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.motivations}
            tooltip={tooltips.motivations}
            name="motivations"
            options={motivationOptions}
            otherName="motivations_other"
            otherPlaceholder={t.common.other}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.contentPreferences}
            tooltip={tooltips.contentPreferences}
            name="content_preferences"
            options={contentOptions}
            otherName="content_preferences_other"
            otherPlaceholder={t.common.other}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.stylePreferences}
            tooltip={tooltips.stylePreferences}
            name="style_preferences"
            options={styleOptions}
            onChange={setCreateStylePreferences}
            otherName="style_preferences_other"
            otherPlaceholder={t.common.other}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.objections}
            tooltip={tooltips.objections}
            name="objections"
            options={objectionOptions}
            otherName="objections_other"
            otherPlaceholder={t.common.other}
          />
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor="persona-notes"
              label={t.clients.sections.personasFields.notes}
              tooltip={tooltips.notes}
            />
            <Textarea id="persona-notes" name="notes" rows={2} />
          </div>
          <div className="md:col-span-2">
            <SubmitButton variant="brand">
              {t.clients.sections.personasActions.create}
            </SubmitButton>
          </div>
        </form>
    </section>
  );
}

export function ClientPersonasList({
  clientId,
  locale,
  personas,
}: ClientPersonasProps) {
  const t = copy[locale];
  const goalOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Reconhecimento", "Engagement", "Vendas", "Leads", "Fidelização"]
        : ["Awareness", "Engagement", "Sales", "Leads", "Retention"],
    [locale]
  );
  const channelOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"]
        : ["Instagram", "TikTok", "Facebook", "LinkedIn", "YouTube", "Newsletter"],
    [locale]
  );
  const painOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Pouco tempo", "Baixo alcance", "Sem estratégia", "Orçamento limitado"]
        : ["Low time", "Low reach", "No strategy", "Limited budget"],
    [locale]
  );
  const motivationOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Crescimento", "Reconhecimento", "Aprendizagem", "Confiança"]
        : ["Growth", "Recognition", "Learning", "Trust"],
    [locale]
  );
  const contentOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Reels/Shorts", "Carrosséis", "Stories", "UGC", "Educativo"]
        : ["Reels/Shorts", "Carousels", "Stories", "UGC", "Educational"],
    [locale]
  );
  const objectionOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Preço", "Tempo", "Resultados", "Complexidade"]
        : ["Price", "Time", "Results", "Complexity"],
    [locale]
  );

  if (!personas.length) {
    return (
      <div className="rounded-md border border-border/40 p-4 text-sm text-muted-foreground">
        {t.clients.sections.personasEmpty}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {personas.map((persona) => (
        <PersonaSummaryCard
          key={persona.id}
          clientId={clientId}
          locale={locale}
          persona={persona}
          goals={splitList(persona.goals)}
          channels={splitList(persona.channels)}
        />
      ))}
    </div>
  );
}

function CheckboxGroup({
  title,
  tooltip,
  name,
  options,
  otherName,
  otherPlaceholder,
  otherDefaultValue,
  onChange,
  defaultValues,
}: {
  title: string;
  tooltip?: string;
  name: string;
  options: string[];
  otherName?: string;
  otherPlaceholder?: string;
  otherDefaultValue?: string;
  onChange?: (values: string[]) => void;
  defaultValues?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues ?? []);

  const handleToggle = (value: string) => {
    const next = toggleValue(selected, value);
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-2 md:col-span-2">
      <FieldLabel label={title} tooltip={tooltip} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground"
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={selected.includes(option)}
              onChange={() => handleToggle(option)}
            />
            {option}
          </label>
        ))}
      </div>
      {otherName ? (
        <Input
          name={otherName}
          placeholder={otherPlaceholder ?? "Other"}
          className="max-w-sm"
          defaultValue={otherDefaultValue}
        />
      ) : null}
    </div>
  );
}

type LocationInputProps = {
  id: string;
  label: string;
  hint?: string;
  tooltip?: string;
  value: string;
  placeId: string;
  lat: string;
  lng: string;
  onChange: (value: string) => void;
  onPlaceChange: (next: {
    value: string;
    placeId?: string;
    lat?: string;
    lng?: string;
  }) => void;
};

function LocationInput({
  id,
  label,
  hint,
  tooltip,
  value,
  placeId,
  lat,
  lng,
  onChange,
  onPlaceChange,
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || !inputRef.current) return;
    let autocomplete: any = null;

    const initAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;
      autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["(cities)"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete?.getPlace();
        const formatted =
          place?.formatted_address || place?.name || inputRef.current?.value || "";
        const latValue = place?.geometry?.location?.lat();
        const lngValue = place?.geometry?.location?.lng();
        onPlaceChange({
          value: formatted,
          placeId: place?.place_id ?? "",
          lat: latValue ? String(latValue) : "",
          lng: lngValue ? String(lngValue) : "",
        });
      });
    };

    const existing = document.getElementById("google-maps-places");
    if (existing) {
      initAutocomplete();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-places";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = initAutocomplete;
    document.body.appendChild(script);

    return () => {
      autocomplete = null;
    };
  }, [onPlaceChange]);

  return (
    <div className="space-y-1">
      <FieldLabel htmlFor={id} label={label} tooltip={tooltip} />
      <Input
        id={id}
        name="location"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          onPlaceChange({ value: nextValue, placeId: "", lat: "", lng: "" });
        }}
        ref={inputRef}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input type="hidden" name="location_place_id" value={placeId} />
      <input type="hidden" name="location_lat" value={lat} />
      <input type="hidden" name="location_lng" value={lng} />
    </div>
  );
}

function FieldLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor?: string;
  label: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {htmlFor ? <Label htmlFor={htmlFor}>{label}</Label> : <Label>{label}</Label>}
      {tooltip ? <InfoTooltip text={tooltip} /> : null}
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

export function PersonaEditor({
  clientId,
  locale,
  persona,
  goalOptions,
  channelOptions,
  painOptions,
  motivationOptions,
  contentOptions,
  objectionOptions,
}: {
  clientId: string;
  locale: Locale;
  persona: Persona;
  goalOptions: string[];
  channelOptions: string[];
  painOptions: string[];
  motivationOptions: string[];
  contentOptions: string[];
  objectionOptions: string[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar esta persona? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this persona? This action cannot be undone.";
  const tooltips = t.clients.sections.personasTooltips;
  const [updateState, updateAction] = useActionState(
    updatePersona.bind(null, persona.id, clientId),
    {}
  );
  const [deleteState, deleteAction] = useActionState(
    deletePersona.bind(null, persona.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const styleOptions = useMemo(() => getStyleOptions(locale), [locale]);
  const genderOptions = useMemo(
    () =>
      locale === "pt"
        ? ["Feminino", "Masculino", "Não-binário", "Outro", "Prefere não dizer"]
        : ["Female", "Male", "Non-binary", "Other", "Prefer not to say"],
    [locale]
  );
  const goals = splitList(persona.goals);
  const channels = splitList(persona.channels);
  const stylePreferences = splitList(persona.style_preferences);
  const styleOther = getOtherValues(persona.style_preferences, styleOptions);
  const [editAgeRange, setEditAgeRange] = useState(persona.age_range ?? "");
  const [editGender, setEditGender] = useState(persona.gender ?? "");
  const [editLocation, setEditLocation] = useState(persona.location ?? "");
  const [editLocationPlaceId, setEditLocationPlaceId] = useState(
    persona.location_place_id ?? ""
  );
  const [editLocationLat, setEditLocationLat] = useState(
    persona.location_lat ? String(persona.location_lat) : ""
  );
  const [editLocationLng, setEditLocationLng] = useState(
    persona.location_lng ? String(persona.location_lng) : ""
  );

  return (
    <div className="rounded-md border border-border/40 p-4">
      <div className="mb-2 flex items-center justify-end">
        <EntityContextMenu
          ariaLabel={locale === "pt" ? "Ações da persona" : "Persona actions"}
          items={[
            {
              key: "back",
              label: locale === "pt" ? "Voltar à lista" : "Back to list",
              onSelect: () => router.push(`/dashboard/clients/${clientId}/personas`),
            },
            { type: "separator", key: "sep-1" },
            {
              key: "delete",
              label: t.clients.sections.personasActions.delete,
              variant: "destructive",
              onSelect: () => {
                if (!confirm(confirmDeleteText)) return;
                deleteFormRef.current?.requestSubmit();
              },
            },
          ]}
        />
      </div>
      <PersonaPreview
        name={persona.name}
        role={persona.role_title ?? ""}
        avatarColor={persona.avatar_color ?? AVATAR_COLORS[0]}
        ageRange={persona.age_range ?? ""}
        location={editLocation}
        gender={persona.gender ?? ""}
        goals={goals}
        channels={channels}
        locale={locale}
      />

      <div className="mt-4 space-y-4">
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
        {deleteState?.success ? (
          <Alert>
            <AlertTitle>{t.common.updatedTitle}</AlertTitle>
            <AlertDescription>{deleteState.success}</AlertDescription>
          </Alert>
        ) : null}

        <form action={updateAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-2">
            <FieldLabel
              htmlFor={`name-${persona.id}`}
              label={t.clients.sections.personasFields.name}
              tooltip={tooltips.name}
            />
            <Input id={`name-${persona.id}`} name="name" defaultValue={persona.name} required />
          </div>
          <div className="space-y-2">
            <FieldLabel
              htmlFor={`role-${persona.id}`}
              label={t.clients.sections.personasFields.roleTitle}
              tooltip={tooltips.roleTitle}
            />
            <Input
              id={`role-${persona.id}`}
              name="role_title"
              defaultValue={persona.role_title ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              label={t.clients.sections.personasFields.demographics}
            />
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel
                  htmlFor={`age-${persona.id}`}
                  label={t.clients.sections.personasFields.ageRange}
                  tooltip={tooltips.ageRange}
                />
                <input type="hidden" name="age_range" value={editAgeRange || ""} />
                <Select
                  value={editAgeRange || "__none__"}
                  onValueChange={(v) => setEditAgeRange(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {AGE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel
                  htmlFor={`gender-${persona.id}`}
                  label={t.clients.sections.personasFields.gender}
                  tooltip={tooltips.gender}
                />
                <input type="hidden" name="gender" value={editGender || ""} />
                <Select
                  value={editGender || "__none__"}
                  onValueChange={(v) => setEditGender(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {genderOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <LocationInput
                  id={`location-${persona.id}`}
                  label={t.clients.sections.personasFields.location}
                  hint={t.clients.sections.personasFields.locationHint}
                  tooltip={tooltips.location}
                  value={editLocation}
                  placeId={editLocationPlaceId}
                  lat={editLocationLat}
                  lng={editLocationLng}
                  onChange={setEditLocation}
                  onPlaceChange={(next) => {
                    setEditLocation(next.value);
                    setEditLocationPlaceId(next.placeId ?? "");
                    setEditLocationLat(next.lat ?? "");
                    setEditLocationLng(next.lng ?? "");
                  }}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`avatar-${persona.id}`}
              label={t.clients.sections.personasFields.avatarColor}
              tooltip={tooltips.avatarColor}
            />
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <label key={color} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="avatar_color"
                    value={color}
                    defaultChecked={
                      persona.avatar_color
                        ? persona.avatar_color === color
                        : color === AVATAR_COLORS[0]
                    }
                  />
                  <span
                    className="h-6 w-6 rounded-full border border-border/40"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>
          <CheckboxGroup
            title={t.clients.sections.personasFields.goals}
            tooltip={tooltips.goals}
            name="goals"
            options={goalOptions}
            defaultValues={splitList(persona.goals)}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.channels}
            tooltip={tooltips.channels}
            name="channels"
            options={channelOptions}
            defaultValues={splitList(persona.channels)}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.painPoints}
            tooltip={tooltips.painPoints}
            name="pain_points"
            options={painOptions}
            defaultValues={splitList(persona.pain_points)}
            otherName="pain_points_other"
            otherPlaceholder={t.common.other}
            otherDefaultValue={getOtherValues(persona.pain_points, painOptions)}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.motivations}
            tooltip={tooltips.motivations}
            name="motivations"
            options={motivationOptions}
            defaultValues={splitList(persona.motivations)}
            otherName="motivations_other"
            otherPlaceholder={t.common.other}
            otherDefaultValue={getOtherValues(persona.motivations, motivationOptions)}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.contentPreferences}
            tooltip={tooltips.contentPreferences}
            name="content_preferences"
            options={contentOptions}
            defaultValues={splitList(persona.content_preferences)}
            otherName="content_preferences_other"
            otherPlaceholder={t.common.other}
            otherDefaultValue={getOtherValues(
              persona.content_preferences,
              contentOptions
            )}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.stylePreferences}
            tooltip={tooltips.stylePreferences}
            name="style_preferences"
            options={styleOptions}
            defaultValues={stylePreferences}
            otherName="style_preferences_other"
            otherPlaceholder={t.common.other}
            otherDefaultValue={styleOther}
          />
          <CheckboxGroup
            title={t.clients.sections.personasFields.objections}
            tooltip={tooltips.objections}
            name="objections"
            options={objectionOptions}
            defaultValues={splitList(persona.objections)}
            otherName="objections_other"
            otherPlaceholder={t.common.other}
            otherDefaultValue={getOtherValues(persona.objections, objectionOptions)}
          />
          <div className="space-y-2 md:col-span-2">
            <FieldLabel
              htmlFor={`notes-${persona.id}`}
              label={t.clients.sections.personasFields.notes}
              tooltip={tooltips.notes}
            />
            <Textarea
              id={`notes-${persona.id}`}
              name="notes"
              rows={2}
              defaultValue={persona.notes ?? ""}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <SubmitButton variant="brand">
              {t.clients.sections.personasActions.update}
            </SubmitButton>
          </div>
        </form>

        <form ref={deleteFormRef} action={deleteAction} className="hidden">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" />
        </form>
      </div>
    </div>
  );
}

function PersonaSummaryCard({
  clientId,
  locale,
  persona,
  goals,
  channels,
}: {
  clientId: string;
  locale: Locale;
  persona: Persona;
  goals: string[];
  channels: string[];
}) {
  const t = copy[locale];
  const router = useRouter();
  const confirmDeleteText =
    locale === "pt"
      ? "Tens a certeza que queres apagar esta persona? Esta ação não pode ser revertida."
      : "Are you sure you want to delete this persona? This action cannot be undone.";
  const [deleteState, deleteAction] = useActionState(
    deletePersona.bind(null, persona.id, clientId),
    {}
  );
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  return (
    <div className="rounded-md border border-border/40 p-4">
      <PersonaPreview
        name={persona.name}
        role={persona.role_title ?? ""}
        avatarColor={persona.avatar_color ?? AVATAR_COLORS[0]}
        ageRange={persona.age_range ?? ""}
        location={persona.location ?? ""}
        gender={persona.gender ?? ""}
        goals={goals}
        channels={channels}
        locale={locale}
      />
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {t.clients.sections.personasTitle}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/dashboard/clients/${clientId}/personas/${persona.id}`}>
              {t.clients.sections.personasActions.view}
            </a>
          </Button>
          <EntityContextMenu
            ariaLabel={locale === "pt" ? "Ações da persona" : "Persona actions"}
            items={[
              {
                key: "edit",
                label: locale === "pt" ? "Editar" : "Edit",
                onSelect: () =>
                  router.push(`/dashboard/clients/${clientId}/personas/${persona.id}`),
              },
              { type: "separator", key: "sep-1" },
              {
                key: "delete",
                label: t.clients.sections.personasActions.delete,
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
