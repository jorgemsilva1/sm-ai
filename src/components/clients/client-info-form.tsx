"use client";

import { useActionState, useState } from "react";
import { updateClientInfo } from "@/app/(app)/dashboard/clients/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";

type ClientSettingsFormProps = {
  clientId: string;
  locale: Locale;
  defaultValues: {
    name: string;
    website: string | null;
    description: string | null;
    photo_url: string | null;
    notes: string | null;
    country_code: string | null;
    timezone?: string | null;
    default_locale?: string | null;
  };
};

function flagEmoji(countryCode: string) {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  const A = 0x41;
  const OFFSET = 0x1f1e6;
  const c1 = code.charCodeAt(0) - A + OFFSET;
  const c2 = code.charCodeAt(1) - A + OFFSET;
  return String.fromCodePoint(c1, c2);
}

function offsetLabelForTimeZone(timeZone: string, date = new Date()) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(date);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    // Examples: "GMT", "GMT+1", "GMT+01:00", "GMT-3"
    const m = tzName.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!m) return "GMT+00:00";
    const sign = m[1];
    const hh = String(m[2]).padStart(2, "0");
    const mm = String(m[3] ?? "00").padStart(2, "0");
    return `GMT${sign}${hh}:${mm}`;
  } catch {
    return "GMT+00:00";
  }
}

function offsetMinutes(label: string) {
  const m = label.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2] || 0);
  const mm = Number(m[3] || 0);
  return sign * (hh * 60 + mm);
}

function normalizeOffsetOrTimeZoneToOffset(value: string | null | undefined) {
  const v = String(value || "").trim();
  if (!v) return "GMT+00:00";
  if (/^GMT[+-]\d{2}:\d{2}$/.test(v)) return v;
  const m = v.match(/^([+-])(\d{2}):(\d{2})$/);
  if (m) return `GMT${m[1]}${m[2]}:${m[3]}`;
  // assume it's an IANA tz like "Europe/Lisbon"
  return offsetLabelForTimeZone(v);
}

export function ClientSettingsForm({
  clientId,
  locale,
  defaultValues,
}: ClientSettingsFormProps) {
  const t = copy[locale];
  const [state, formAction] = useActionState(
    updateClientInfo.bind(null, clientId),
    {}
  );
  const [countryCode, setCountryCode] = useState(
    (defaultValues.country_code ?? "PT").toUpperCase()
  );
  const [timezone, setTimezone] = useState(
    normalizeOffsetOrTimeZoneToOffset(defaultValues.timezone ?? "Europe/Lisbon")
  );
  const [defaultLocale, setDefaultLocale] = useState(
    (defaultValues.default_locale ?? locale) === "en" ? "en" : "pt"
  );

  const regionOptions = (() => {
    try {
      // Browser support (Node doesn't matter, this is client component)
      // @ts-expect-error Intl.supportedValuesOf exists in modern runtimes
      const regions: string[] = Intl.supportedValuesOf("region");
      const dn = new Intl.DisplayNames([locale === "pt" ? "pt-PT" : "en-US"], { type: "region" });
      return regions
        .filter((r) => /^[A-Z]{2}$/.test(r))
        .map((code) => ({
          code,
          label: `${flagEmoji(code)} ${dn.of(code) || code} (${code})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      const fallback = ["PT", "ES", "BR", "US", "GB", "FR", "DE", "IT"];
      return fallback.map((code) => ({ code, label: `${flagEmoji(code)} ${code}` }));
    }
  })();

  const timeZoneOptions = (() => {
    try {
      // @ts-expect-error Intl.supportedValuesOf exists in modern runtimes
      const tzs: string[] = Intl.supportedValuesOf("timeZone");
      const now = new Date();
      const offsets = new Map<string, true>();
      for (const tz of tzs) {
        offsets.set(offsetLabelForTimeZone(tz, now), true);
      }
      return Array.from(offsets.keys())
        .sort((a, b) => offsetMinutes(a) - offsetMinutes(b))
        .map((o) => ({ tz: o, label: o }));
    } catch {
      const fallback = ["GMT-08:00", "GMT-05:00", "GMT+00:00", "GMT+01:00", "GMT+03:00", "GMT+05:30", "GMT+08:00"];
      return fallback.map((o) => ({ tz: o, label: o }));
    }
  })();

  return (
    <section className="border-b border-border/40 pb-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t.clients.info.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t.clients.info.subtitle}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {state?.error ? (
          <Alert variant="destructive">
            <AlertTitle>{t.common.errorTitle}</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state?.success ? (
          <Alert>
            <AlertTitle>{t.common.updatedTitle}</AlertTitle>
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        ) : null}

        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="country_code" value={countryCode} />
          <input type="hidden" name="timezone" value={timezone} />
          <input type="hidden" name="default_locale" value={defaultLocale} />
          <div className="space-y-2">
            <Label htmlFor="name">{t.clients.fields.name}</Label>
            <Input
              id="name"
              name="name"
              defaultValue={defaultValues.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t.clients.fields.country}</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger>
                <SelectValue placeholder={locale === "pt" ? "Escolhe o país" : "Pick a country"} />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((r) => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {locale === "pt"
                ? "Usado para feriados e contextos locais."
                : "Used for holidays and local context."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t.clients.fields.timezone}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="GMT+00:00" />
              </SelectTrigger>
              <SelectContent>
                {timeZoneOptions.map((o) => (
                  <SelectItem key={o.tz} value={o.tz}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {locale === "pt"
                ? "Usado para calcular horários e justificar timing no calendário/AI."
                : "Used to compute times and justify timing in calendar/AI."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t.clients.fields.defaultLanguage}</Label>
            <Select value={defaultLocale} onValueChange={(v) => setDefaultLocale(v === "en" ? "en" : "pt")}>
              <SelectTrigger>
                <SelectValue placeholder={locale === "pt" ? "Escolhe a língua" : "Pick a language"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">🇵🇹 Português</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {locale === "pt"
                ? "A língua default do cliente é a que a IA vai usar para gerar conteúdos."
                : "The client default language is the one the AI will use to generate content."}
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t.clients.fields.description}</Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={defaultValues.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t.clients.fields.website}</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={defaultValues.website ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo_url">{t.clients.fields.photoUrl}</Label>
            <Input
              id="photo_url"
              name="photo_url"
              type="url"
              defaultValue={defaultValues.photo_url ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">{t.clients.fields.notes}</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={defaultValues.notes ?? ""}
            />
          </div>

          <div className="md:col-span-2">
            <SubmitButton variant="brand">
              {t.clients.info.submit}
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  );
}
