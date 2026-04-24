"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/(app)/dashboard/clients/actions";
import { BUSINESS_TAGS } from "@/lib/clients/business-tags";
import { BusinessTagPicker } from "@/components/clients/business-tag-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy, Locale } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, Briefcase, User, CheckCircle2 } from "lucide-react";

type ClientType = "services" | "content_creator";

type WizardStep = 1 | 2 | 3 | 4;

type ClientCreateWizardProps = {
  locale: Locale;
  onClose: () => void;
};

export function ClientCreateWizard({ locale, onClose }: ClientCreateWizardProps) {
  const t = copy[locale];
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [clientType, setClientType] = useState<ClientType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    photo_url: "",
    notes: "",
    tags: [] as string[],
    // Services-specific
    business_area: "",
    target_audience: "",
    // Content creator-specific
    content_niche: "",
    primary_platforms: [] as string[],
  });
  const [state, formAction] = useActionState(createClient, {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (state?.success && state?.clientId) {
      router.push(`/dashboard/clients/${state.clientId}`);
      router.refresh();
    }
  }, [state?.success, state?.clientId, router]);

  const handleNext = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const formDataObj = new FormData();
    
    formDataObj.append("locale", locale);
    formDataObj.append("name", formData.name);
    formDataObj.append("description", formData.description);
    formDataObj.append("website", formData.website);
    formDataObj.append("photo_url", formData.photo_url);
    formDataObj.append("notes", formData.notes);
    formDataObj.append("client_type", clientType || "services");

    if (clientType === "services") {
      formDataObj.append("business_area", formData.business_area);
      formDataObj.append("target_audience", formData.target_audience);
    } else if (clientType === "content_creator") {
      formDataObj.append("content_niche", formData.content_niche);
      formDataObj.append("primary_platforms", formData.primary_platforms.join(","));
    }

    // Add tags
    formData.tags.forEach((tag) => {
      formDataObj.append("tags[]", tag);
    });

    await formAction(formDataObj);
    setIsSubmitting(false);
  };

  const canProceedFromStep1 = clientType !== null;
  const canProceedFromStep2 = formData.name.trim().length > 0;
  const canProceedFromStep3 = true; // Step 3 is optional
  const canProceedFromStep4 = true; // Step 4 is optional

  const canProceed = {
    1: canProceedFromStep1,
    2: canProceedFromStep2,
    3: canProceedFromStep3,
    4: canProceedFromStep4,
  }[step];

  const stepLabels = {
    1: locale === "pt" ? "Tipo de cliente" : "Client type",
    2: locale === "pt" ? "Informações básicas" : "Basic information",
    3: locale === "pt" ? "Configurações específicas" : "Specific settings",
    4: locale === "pt" ? "Tags e foto" : "Tags & photo",
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center w-full">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0 ${
                s < step
                  ? "border-brand bg-brand text-primary-foreground"
                  : s === step
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              {s < step ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-xs font-semibold">{s}</span>
              )}
            </div>
            {s < 4 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  s < step ? "bg-brand" : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold">{stepLabels[step]}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 &&
            (locale === "pt"
              ? "Escolhe o tipo de cliente para personalizar a experiência"
              : "Choose the client type to customize the experience")}
          {step === 2 &&
            (locale === "pt"
              ? "Informações essenciais sobre o cliente"
              : "Essential information about the client")}
          {step === 3 &&
            (locale === "pt"
              ? "Configurações específicas para este tipo de cliente"
              : "Specific settings for this client type")}
          {step === 4 &&
            (locale === "pt"
              ? "Tags de negócio e foto de perfil (opcional)"
              : "Business tags and profile photo (optional)")}
        </p>
      </div>

      {state?.error ? (
        <Alert variant="destructive">
          <AlertTitle>{t.common.errorTitle}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Step 1: Client Type */}
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className={`cursor-pointer border-2 transition-all hover:border-brand/50 ${
              clientType === "services"
                ? "border-brand bg-brand/5"
                : "border-border/40"
            }`}
            onClick={() => setClientType("services")}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand/10 p-3">
                  <Briefcase className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {locale === "pt" ? "Serviços" : "Services"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {locale === "pt"
                      ? "Empresas, agências, negócios"
                      : "Businesses, agencies, companies"}
                  </p>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Gestão de múltiplos clientes"
                      : "Multiple client management"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Análise de competidores"
                      : "Competitor analysis"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Estratégias de marca"
                      : "Brand strategies"}
                  </span>
                </li>
              </ul>
            </div>
          </Card>

          <Card
            className={`cursor-pointer border-2 transition-all hover:border-brand/50 ${
              clientType === "content_creator"
                ? "border-brand bg-brand/5"
                : "border-border/40"
            }`}
            onClick={() => setClientType("content_creator")}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand/10 p-3">
                  <User className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <h4 className="font-semibold">
                    {locale === "pt" ? "Criador de Conteúdo" : "Content Creator"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {locale === "pt"
                      ? "Influencers, criadores, personal brands"
                      : "Influencers, creators, personal brands"}
                  </p>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Gestão de conteúdo pessoal"
                      : "Personal content management"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Calendário de publicações"
                      : "Publication calendar"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1">•</span>
                  <span>
                    {locale === "pt"
                      ? "Análise de performance"
                      : "Performance analysis"}
                  </span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      )}

      {/* Step 2: Basic Information */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t.clients.fields.name} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={locale === "pt" ? "Nome do cliente" : "Client name"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t.clients.fields.description}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder={
                locale === "pt"
                  ? "Breve descrição do cliente..."
                  : "Brief description of the client..."
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">{t.clients.fields.website}</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {/* Step 3: Type-specific settings */}
      {step === 3 && clientType === "services" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_area">
              {locale === "pt" ? "Área de negócio" : "Business area"}
            </Label>
            <Input
              id="business_area"
              value={formData.business_area}
              onChange={(e) =>
                setFormData({ ...formData, business_area: e.target.value })
              }
              placeholder={
                locale === "pt"
                  ? "Ex: Wellness, Tech, E-commerce..."
                  : "E.g., Wellness, Tech, E-commerce..."
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_audience">
              {locale === "pt" ? "Audiência-alvo" : "Target audience"}
            </Label>
            <Textarea
              id="target_audience"
              value={formData.target_audience}
              onChange={(e) =>
                setFormData({ ...formData, target_audience: e.target.value })
              }
              rows={3}
              placeholder={
                locale === "pt"
                  ? "Descreve a audiência principal..."
                  : "Describe the main audience..."
              }
            />
          </div>
        </div>
      )}

      {step === 3 && clientType === "content_creator" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content_niche">
              {locale === "pt" ? "Nicho de conteúdo" : "Content niche"}
            </Label>
            <Input
              id="content_niche"
              value={formData.content_niche}
              onChange={(e) =>
                setFormData({ ...formData, content_niche: e.target.value })
              }
              placeholder={
                locale === "pt"
                  ? "Ex: Fitness, Lifestyle, Tech..."
                  : "E.g., Fitness, Lifestyle, Tech..."
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              {locale === "pt" ? "Plataformas principais" : "Primary platforms"}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "X"].map(
                (platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 cursor-pointer rounded-md border border-border/40 p-3 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={formData.primary_platforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            primary_platforms: [...formData.primary_platforms, platform],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            primary_platforms: formData.primary_platforms.filter(
                              (p) => p !== platform
                            ),
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{platform}</span>
                  </label>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Tags and Photo */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo_url">{t.clients.fields.photoUrl}</Label>
            <Input
              id="photo_url"
              type="url"
              value={formData.photo_url}
              onChange={(e) =>
                setFormData({ ...formData, photo_url: e.target.value })
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>{t.clients.tagsLabel}</Label>
            <BusinessTagPicker
              tags={BUSINESS_TAGS}
              locale={locale}
              selectedTags={formData.tags}
              onTagsChange={(tags) => setFormData({ ...formData, tags })}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={step === 1 ? onClose : handleBack}
          disabled={!!state?.success}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1
            ? t.common.close
            : locale === "pt"
              ? "Anterior"
              : "Back"}
        </Button>
        {step < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || !!state?.success}
            variant="brand"
          >
            {locale === "pt" ? "Seguinte" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting || !!state?.success}
            variant="brand"
          >
            {isSubmitting || state?.success
              ? locale === "pt"
                ? "A criar..."
                : "Creating..."
              : t.clients.createSubmit}
          </Button>
        )}
      </div>
    </div>
  );
}
