"use client";

import { useState } from "react";
import { ClientCreateWizard } from "@/components/clients/client-create-wizard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copy, Locale } from "@/lib/i18n";

type ClientCreateModalProps = {
  locale: Locale;
};

export function ClientCreateModal({ locale }: ClientCreateModalProps) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="brand"
        onClick={() => setOpen(true)}
      >
        {t.clients.addClient}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border/20 bg-surface-2 shadow-lg">
          <DialogHeader>
            <DialogTitle>{t.clients.createTitle}</DialogTitle>
            <DialogDescription>
              {locale === "pt"
                ? "Guia passo a passo para configurar o teu cliente"
                : "Step-by-step guide to set up your client"}
            </DialogDescription>
          </DialogHeader>
          <ClientCreateWizard locale={locale} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
