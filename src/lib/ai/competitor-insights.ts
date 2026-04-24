/**
 * Extract actionable insights from competitor AI profiles for content generation
 */

type CompetitorAIProfile = {
  content_strategy?: {
    themes?: Array<{ text: string; justification?: string }>;
    formats?: Array<{ text: string; justification?: string }>;
    hooks?: Array<{ text: string; justification?: string }>;
    ctas?: Array<{ text: string; justification?: string }>;
    series_ideas?: Array<{ text: string; justification?: string }>;
  };
  messaging?: {
    keywords?: Array<{ text: string; justification?: string }>;
    pillars?: Array<{ text: string; justification?: string }>;
    tagline_examples?: Array<{ text: string; justification?: string }>;
  };
  tone_of_voice?: {
    summary?: string;
    traits?: Array<{ text: string; justification?: string }>;
    do?: Array<{ text: string; justification?: string }>;
    dont?: Array<{ text: string; justification?: string }>;
  };
  strategy_implications?: {
    emulate?: Array<{ text: string; justification?: string }>;
    avoid?: Array<{ text: string; justification?: string }>;
    whitespace?: Array<{ text: string; justification?: string }>;
    counter_angles?: Array<{ text: string; justification?: string }>;
  };
};

export type CompetitorInsights = {
  summary: string;
  insights: {
    contentThemes: string[];
    contentFormats: string[];
    hooks: string[];
    ctas: string[];
    keywords: string[];
    messagingPillars: string[];
    toneTraits: string[];
    whatToEmulate: string[];
    whatToAvoid: string[];
    whitespaceOpportunities: string[];
    counterAngles: string[];
  };
  competitorNames: string[];
};

type CompetitorInsightsInternal = {
  contentThemes: string[];
  contentFormats: string[];
  hooks: string[];
  ctas: string[];
  keywords: string[];
  messagingPillars: string[];
  toneTraits: string[];
  whatToEmulate: string[];
  whatToAvoid: string[];
  whitespaceOpportunities: string[];
  counterAngles: string[];
};

/**
 * Extract insights from a single competitor's AI profile
 */
function extractInsightsFromProfile(profile: CompetitorAIProfile): CompetitorInsightsInternal {
  const asText = (items: Array<{ text: string }> | undefined): string[] => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => String(item.text || "")).filter(Boolean);
  };

  return {
    contentThemes: asText(profile.content_strategy?.themes),
    contentFormats: asText(profile.content_strategy?.formats),
    hooks: asText(profile.content_strategy?.hooks),
    ctas: asText(profile.content_strategy?.ctas),
    keywords: asText(profile.messaging?.keywords),
    messagingPillars: asText(profile.messaging?.pillars),
    toneTraits: asText(profile.tone_of_voice?.traits),
    whatToEmulate: asText(profile.strategy_implications?.emulate),
    whatToAvoid: asText(profile.strategy_implications?.avoid),
    whitespaceOpportunities: asText(profile.strategy_implications?.whitespace),
    counterAngles: asText(profile.strategy_implications?.counter_angles),
  };
}

/**
 * Extract and aggregate insights from multiple competitor AI profiles
 */
export function extractCompetitorInsights(
  competitors: Array<{ name: string; ai_profile?: unknown | null }>
): CompetitorInsights | null {
  const competitorNames: string[] = [];
  const aggregated: CompetitorInsightsInternal = {
    contentThemes: [],
    contentFormats: [],
    hooks: [],
    ctas: [],
    keywords: [],
    messagingPillars: [],
    toneTraits: [],
    whatToEmulate: [],
    whatToAvoid: [],
    whitespaceOpportunities: [],
    counterAngles: [],
  };

  for (const competitor of competitors) {
    if (!competitor.ai_profile) continue;

    competitorNames.push(competitor.name);
    const profile = competitor.ai_profile as CompetitorAIProfile;
    const insights = extractInsightsFromProfile(profile);

    // Aggregate (avoid duplicates)
    const addUnique = (target: string[], source: string[]) => {
      for (const item of source) {
        if (!target.includes(item)) {
          target.push(item);
        }
      }
    };

    addUnique(aggregated.contentThemes, insights.contentThemes);
    addUnique(aggregated.contentFormats, insights.contentFormats);
    addUnique(aggregated.hooks, insights.hooks);
    addUnique(aggregated.ctas, insights.ctas);
    addUnique(aggregated.keywords, insights.keywords);
    addUnique(aggregated.messagingPillars, insights.messagingPillars);
    addUnique(aggregated.toneTraits, insights.toneTraits);
    addUnique(aggregated.whatToEmulate, insights.whatToEmulate);
    addUnique(aggregated.whatToAvoid, insights.whatToAvoid);
    addUnique(aggregated.whitespaceOpportunities, insights.whitespaceOpportunities);
    addUnique(aggregated.counterAngles, insights.counterAngles);
  }

  // Create summary text
  const summaryParts: string[] = [];
  
  if (aggregated.contentThemes.length > 0) {
    summaryParts.push(`Temas de conteúdo comuns: ${aggregated.contentThemes.slice(0, 5).join(", ")}`);
  }
  if (aggregated.hooks.length > 0) {
    summaryParts.push(`Hooks eficazes: ${aggregated.hooks.slice(0, 5).join(", ")}`);
  }
  if (aggregated.whatToEmulate.length > 0) {
    summaryParts.push(`Oportunidades para emular: ${aggregated.whatToEmulate.slice(0, 3).join(", ")}`);
  }
  if (aggregated.whitespaceOpportunities.length > 0) {
    summaryParts.push(`Espaços em branco (oportunidades): ${aggregated.whitespaceOpportunities.slice(0, 3).join(", ")}`);
  }

  const summary = summaryParts.length > 0 
    ? summaryParts.join(". ") 
    : "Análise de competidores disponível - usar insights detalhados abaixo.";

  return {
    summary,
    insights: aggregated,
    competitorNames,
  };
}

/**
 * Format competitor insights as a structured, actionable narrative for AI prompts.
 * More readable than raw arrays — surfaces the most important signals prominently.
 */
export function formatCompetitorInsightsForPrompt(
  insights: CompetitorInsights,
  locale: "pt" | "en"
): string {
  const sections: string[] = [];

  if (insights.insights.whitespaceOpportunities.length > 0) {
    sections.push(locale === "pt"
      ? `OPORTUNIDADES NÃO EXPLORADAS (prioriza no conteúdo):\n${insights.insights.whitespaceOpportunities.slice(0, 5).map((o, i) => `  ${i + 1}. ${o}`).join("\n")}`
      : `UNEXPLOITED OPPORTUNITIES (prioritize in content):\n${insights.insights.whitespaceOpportunities.slice(0, 5).map((o, i) => `  ${i + 1}. ${o}`).join("\n")}`
    );
  }

  if (insights.insights.counterAngles.length > 0) {
    sections.push(locale === "pt"
      ? `ÂNGULOS DE DIFERENCIAÇÃO (usa pelo menos 1):\n${insights.insights.counterAngles.slice(0, 5).map((a, i) => `  ${i + 1}. ${a}`).join("\n")}`
      : `DIFFERENTIATION ANGLES (use at least 1):\n${insights.insights.counterAngles.slice(0, 5).map((a, i) => `  ${i + 1}. ${a}`).join("\n")}`
    );
  }

  if (insights.insights.hooks.length > 0) {
    sections.push(locale === "pt"
      ? `HOOKS EFICAZES (adapta para o cliente): ${insights.insights.hooks.slice(0, 5).join(", ")}`
      : `EFFECTIVE HOOKS (adapt for client): ${insights.insights.hooks.slice(0, 5).join(", ")}`
    );
  }

  if (insights.insights.whatToAvoid.length > 0) {
    sections.push(locale === "pt"
      ? `O QUE EVITAR (não repitas erros dos competidores): ${insights.insights.whatToAvoid.slice(0, 5).join(", ")}`
      : `WHAT TO AVOID (don't repeat competitor mistakes): ${insights.insights.whatToAvoid.slice(0, 5).join(", ")}`
    );
  }

  if (insights.insights.contentThemes.length > 0) {
    sections.push(locale === "pt"
      ? `TEMAS COMUNS DOS COMPETIDORES (para contexto, não copiar): ${insights.insights.contentThemes.slice(0, 8).join(", ")}`
      : `COMPETITOR CONTENT THEMES (for context, don't copy): ${insights.insights.contentThemes.slice(0, 8).join(", ")}`
    );
  }

  return sections.join("\n\n");
}
