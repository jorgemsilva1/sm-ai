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
