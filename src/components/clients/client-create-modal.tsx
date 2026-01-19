"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/app/(app)/dashboard/clients/actions";
import { BUSINESS_TAGS } from "@/lib/clients/business-tags";
import { SubmitButton } from "@/components/form/submit-button";
import { BusinessTagPicker } from "@/components/clients/business-tag-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";

type ClientCreateModalProps = {
  locale: Locale;
};

export function ClientCreateModal({ locale }: ClientCreateModalProps) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createClient, {});

  useEffect(() => {
    if (state?.error) {
      setOpen(true);
    }
  }, [state]);

  return (
    <>
      <Button
        className="bg-brand text-primary-foreground"
        onClick={() => setOpen(true)}
      >
        {t.clients.addClient}
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-border/40 bg-card/95 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">
                  {t.clients.createTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t.clients.createSubtitle}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t.common.close}
              </Button>
            </div>

            {state?.error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>{t.common.errorTitle}</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <form action={formAction} className="mt-6 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />
              <div className="space-y-2">
                <Label htmlFor="name">{t.clients.fields.name}</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t.clients.fields.description}</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">{t.clients.fields.website}</Label>
                <Input id="website" name="website" type="url" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo_url">{t.clients.fields.photoUrl}</Label>
                <Input
                  id="photo_url"
                  name="photo_url"
                  type="url"
                  placeholder="https://"
                />
              </div>
              <BusinessTagPicker tags={BUSINESS_TAGS} locale={locale} />
              <div className="md:col-span-2">
                <SubmitButton className="bg-brand text-primary-foreground">
                  {t.clients.createSubmit}
                </SubmitButton>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </>
  );
}
