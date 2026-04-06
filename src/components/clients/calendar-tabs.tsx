"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import { Locale } from "@/lib/i18n";
import { getTrendingTopics } from "@/lib/ai/trending-topics";

type CalendarTabsProps = {
  clientType: "services" | "content_creator";
  locale: Locale;
  businessTags: string[];
  children?: React.ReactNode;
};

export function CalendarTabs({ clientType, locale, businessTags, children }: CalendarTabsProps) {
  const calendarLabel = locale === "pt" ? "Calendário" : "Calendar";
  const trendingLabel = "Trending";
  const guidelinesLabel = "Brand Guidelines";

  if (clientType === "content_creator") {
    const trendingTopics = getTrendingTopics(businessTags, locale);

    return (
      <Tabs defaultValue="calendar">
        <TabsList className="border border-border/20 bg-surface-1">
          <TabsTrigger value="calendar">{calendarLabel}</TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {trendingLabel}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          {children}
        </TabsContent>

        <TabsContent value="trending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {locale === "pt" ? "Tópicos em Tendência" : "Trending Topics"}
              </CardTitle>
              <CardDescription>
                {locale === "pt"
                  ? "Tópicos relevantes baseados nas tuas tags de negócio e na época do ano"
                  : "Relevant topics based on your business tags and time of year"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendingTopics.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {trendingTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className={`rounded-md border p-3 transition-default ${
                          topic.relevance === "high"
                            ? "border-brand/60 bg-brand/5"
                            : "border-border/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{topic.topic}</p>
                            {topic.reason && (
                              <p className="mt-1 text-xs text-muted-foreground">{topic.reason}</p>
                            )}
                          </div>
                          {topic.relevance === "high" && (
                            <span className="text-xs font-semibold text-brand">★</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {locale === "pt"
                      ? "Adiciona tags de negócio nas configurações para ver tópicos em tendência"
                      : "Add business tags in settings to see trending topics"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  }

  // Services/Brand — Brand Guidelines tab
  return (
    <Tabs defaultValue="calendar">
      <TabsList className="border border-border/20 bg-surface-1">
        <TabsTrigger value="calendar">{calendarLabel}</TabsTrigger>
        <TabsTrigger value="guidelines" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {guidelinesLabel}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calendar" className="mt-4">
        {children}
      </TabsContent>

      <TabsContent value="guidelines" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {guidelinesLabel}
            </CardTitle>
            <CardDescription>
              {locale === "pt"
                ? "Checklist e diretrizes para garantir consistência da marca"
                : "Checklist and guidelines to ensure brand consistency"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {locale === "pt" ? "Tom de Voz" : "Tone of Voice"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "pt"
                      ? "Mantém o tom consistente em todos os posts"
                      : "Keep tone consistent across all posts"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {locale === "pt" ? "Valores da Marca" : "Brand Values"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "pt"
                      ? "Respeita sempre os valores e guardrails da marca"
                      : "Always respect brand values and guardrails"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {locale === "pt" ? "Objetivos de Negócio" : "Business Objectives"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "pt"
                      ? "Cada post deve suportar os objetivos de negócio definidos"
                      : "Each post should support defined business objectives"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {locale === "pt" ? "Formato Profissional" : "Professional Format"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "pt"
                      ? "Prioriza formats profissionais (Carousel, Post) para comunicar melhor mensagens complexas"
                      : "Prioritize professional formats (Carousel, Post) to better communicate complex messages"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
