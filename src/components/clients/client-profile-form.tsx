"use client";

import { useActionState, useMemo, useState } from "react";
import { updateClientProfile } from "@/app/(app)/dashboard/clients/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Info } from "lucide-react";

type ClientProfileFormProps = {
  clientId: string;
  locale: Locale;
  defaultValues: {
    audience: string | null;
    tone: string | null;
    references_text: string | null;
    goals: string | null;
    brand_values: string | null;
  };
};

export function ClientProfileForm({
  clientId,
  locale,
  defaultValues,
}: ClientProfileFormProps) {
  const t = copy[locale];
  const toneOptions = useMemo(() => t.clients.profile.toneOptions, [t]);
  const [toneValue, setToneValue] = useState(defaultValues.tone ?? "");
  const [state, formAction] = useActionState(
    updateClientProfile.bind(null, clientId),
    {}
  );

  return (
    <section className="border-b border-border/40 pb-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t.clients.profile.title}</h2>
        <p className="text-sm text-muted-foreground">
          {t.clients.profile.subtitle}
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
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="brand_values">{t.clients.profile.brandValues}</Label>
              <Info
                className="h-4 w-4 text-muted-foreground"
                title={t.clients.profile.tooltips.brandValues}
              />
            </div>
            <Textarea
              id="brand_values"
              name="brand_values"
              rows={3}
              defaultValue={defaultValues.brand_values ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="tone">{t.clients.profile.tone}</Label>
              <Info
                className="h-4 w-4 text-muted-foreground"
                title={t.clients.profile.tooltips.tone}
              />
            </div>
            <input type="hidden" name="tone" value={toneValue} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm transition hover:bg-muted/40"
                >
                  <span>
                    {toneValue || t.clients.profile.tonePlaceholder}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuRadioGroup
                  value={toneValue}
                  onValueChange={(value) => setToneValue(value)}
                >
                  {toneOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {option.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="goals">{t.clients.profile.goals}</Label>
              <Info
                className="h-4 w-4 text-muted-foreground"
                title={t.clients.profile.tooltips.goals}
              />
            </div>
            <Textarea
              id="goals"
              name="goals"
              rows={2}
              defaultValue={defaultValues.goals ?? ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="references">{t.clients.profile.references}</Label>
              <Info
                className="h-4 w-4 text-muted-foreground"
                title={t.clients.profile.tooltips.references}
              />
            </div>
            <Textarea
              id="references"
              name="references"
              rows={3}
              defaultValue={defaultValues.references_text ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <SubmitButton className="bg-brand text-primary-foreground">
              {t.clients.profile.submit}
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  );
}
