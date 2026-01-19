"use client";

import { useActionState } from "react";
import { updateClientTags } from "@/app/(app)/dashboard/clients/actions";
import { SubmitButton } from "@/components/form/submit-button";
import { BusinessTagPicker } from "@/components/clients/business-tag-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { copy, Locale } from "@/lib/i18n";
import { BusinessTag } from "@/lib/clients/business-tags";

type ClientTagsFormProps = {
  clientId: string;
  locale: Locale;
  businessTags: BusinessTag[];
  selectedTags: string[];
};

export function ClientTagsForm({
  clientId,
  locale,
  businessTags,
  selectedTags,
}: ClientTagsFormProps) {
  const t = copy[locale];
  const [state, formAction] = useActionState(
    updateClientTags.bind(null, clientId),
    {}
  );

  return (
    <section className="border-b border-border/40 pb-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t.clients.tagsSectionTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {t.clients.tagsSectionSubtitle}
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

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <BusinessTagPicker
            tags={businessTags}
            selectedSlugs={selectedTags}
            locale={locale}
          />
          <div>
            <SubmitButton className="bg-brand text-primary-foreground">
              {t.clients.tagsSubmit}
            </SubmitButton>
          </div>
        </form>
      </div>
    </section>
  );
}
