"use client";

import { useState, useTransition } from "react";
import { BarChart2, Clock, Lightbulb, RefreshCw, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n";
import { generateSuggestions, type AISuggestion } from "@/app/(app)/dashboard/clients/actions";

type ClientSuggestionsProps = {
  clientId: string;
  locale: Locale;
};

const TYPE_ICONS: Record<AISuggestion["type"], React.ReactNode> = {
  format: <TrendingUp className="h-5 w-5" />,
  timing: <Clock className="h-5 w-5" />,
  competitor: <Users className="h-5 w-5" />,
  trending: <BarChart2 className="h-5 w-5" />,
  general: <Lightbulb className="h-5 w-5" />,
};

const TYPE_COLORS: Record<AISuggestion["type"], string> = {
  format: "text-brand bg-brand/10 border-brand/20",
  timing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  competitor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  trending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  general: "text-green-400 bg-green-500/10 border-green-500/20",
};

export function ClientSuggestions({ clientId, locale }: ClientSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateSuggestions(clientId, locale);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuggestions(result.suggestions ?? []);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="brand"
          className="gap-2"
          disabled={isPending}
          onClick={handleGenerate}
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending
            ? locale === "pt" ? "A gerar…" : "Generating…"
            : locale === "pt" ? "Gerar sugestões" : "Generate suggestions"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {suggestions === null ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-border/40 bg-card/60 p-8 text-center gap-3">
          <Lightbulb className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {locale === "pt"
              ? "Clica em \"Gerar sugestões\" para obter recomendações personalizadas."
              : "Click \"Generate suggestions\" to get personalised recommendations."}
          </p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-md border border-border/40 bg-card/60 p-8">
          <p className="text-sm text-muted-foreground">
            {locale === "pt" ? "Sem sugestões por agora." : "No suggestions at this time."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {suggestions.map((s, i) => {
            const colorCls = TYPE_COLORS[s.type] ?? TYPE_COLORS.general;
            const icon = TYPE_ICONS[s.type] ?? TYPE_ICONS.general;
            return (
              <div
                key={`sug-${i}`}
                className={`rounded-md border p-4 space-y-2 ${colorCls}`}
              >
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <p className="text-sm opacity-80">{s.body}</p>
                {s.action ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 gap-1.5 opacity-80 hover:opacity-100"
                  >
                    {s.action}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
