/**
 * Brand/Agency specific prompts for social media content generation
 */

import type { GenerateScheduleInput } from "../schedule-generator";

export function getBrandPrompt(input: GenerateScheduleInput): string {
  const allowedPlatforms = input.allowedPlatforms || [];
  const allowedFormats = input.allowedFormats || [];

  return input.locale === "pt"
    ? `Gera uma proposta de calendarização de conteúdos para uma MARCA/AGÊNCIA.

CONTEXTO ESPECÍFICO PARA MARCAS:
- Foco em brand consistency, positioning e KPIs de negócio
- Prioriza formats profissionais (Carousel, Post, Video)
- Conteúdo deve refletir valores da marca e objetivos de negócio
- Usa análise de competidores para diferenciação estratégica
- Brand guidelines e guardrails são prioritários

Regras:
- O output tem de seguir exatamente o schema JSON.
- Distribui items entre as plataformas e formatos de forma realista.
- Usa scheduled_at com timezone (ISO 8601).
- Usa platform e format EXATAMENTE como as opções do schema (lowercase).
- A estratégia é mandatória. NUNCA uses plataformas fora de: ${allowedPlatforms.join(", ")}.
- Assets descrevem o que deve ser produzido (sem URLs).
- rationale explica claramente porquê com base na estratégia, no perfil editorial e nas settings do cliente (tom, público, objetivos, guardrails).
- Em cada ponto de rationale, preenche strategyReference.field com um dos valores do schema e strategyReference.snippet com um excerto curto.
- O texto de reason deve ser direto e explícito (ex.: "A é sugerido porque ..."), sem generalidades.
- Em CADA item, inclui pelo menos 1 ponto de rationale com strategyReference.field = "timing" e explica a escolha do dia e da hora (timezone, comportamento do canal e o que a estratégia pede).
- IMPORTANTE: Prefere usar os horários ideais sugeridos abaixo. Eles são baseados em estudos da indústria e no histórico deste cliente.

Horários ideais por plataforma (preferir estes slots):
${input.optimalSlots || "Não disponível - usar lógica padrão de social media"}

${input.strategy.competitor_insights ? `Insights dos competidores (ANALISA E USA PARA DIFERENCIAÇÃO ESTRATÉGICA):
  Resumo: ${input.strategy.competitor_insights.summary}
  Temas: ${input.strategy.competitor_insights.insights.contentThemes?.slice(0, 10).join(", ") || "N/A"}
  Formatos: ${input.strategy.competitor_insights.insights.contentFormats?.slice(0, 10).join(", ") || "N/A"}
  Hooks: ${input.strategy.competitor_insights.insights.hooks?.slice(0, 10).join(", ") || "N/A"}
  CTAs: ${input.strategy.competitor_insights.insights.ctas?.slice(0, 10).join(", ") || "N/A"}
  Keywords: ${input.strategy.competitor_insights.insights.keywords?.slice(0, 15).join(", ") || "N/A"}
  Pilares: ${input.strategy.competitor_insights.insights.messagingPillars?.slice(0, 10).join(", ") || "N/A"}
  Oportunidades para emular: ${input.strategy.competitor_insights.insights.whatToEmulate?.slice(0, 5).join(", ") || "N/A"}
  Espaços em branco: ${input.strategy.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Ângulos de contra-posicionamento: ${input.strategy.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANTE: Usa estes insights para criar conteúdo que seja melhor, diferente ou explore oportunidades estratégicas que os competidores não estão a explorar.` : ""}

${input.strategy.reference_examples && input.strategy.reference_examples.length > 0 ? `Exemplos de referências (usa como inspiração mantendo brand consistency):
${input.strategy.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` - ${ex.description}` : ""}`).join("\n")}
  IMPORTANTE: Adapta estes exemplos mantendo os valores da marca e guardrails.` : ""}

${input.trendingTopics ? `Tópicos em tendência (considera se alinhados com a marca):
${input.trendingTopics}
IMPORTANTE: Só usa trends que façam sentido para a marca e não comprometam brand consistency.` : ""}

Contexto:
- Timezone: ${input.timezone}
- Intervalo: ${input.startDate} a ${input.endDate}
- Estratégia: ${JSON.stringify(input.strategy)}
- Persona (público-alvo principal; usar linguagem, dores, objeções e preferências): ${JSON.stringify(input.persona ?? null)}
- Planificações recentes (para consistência, evitar repetição e manter lógica): ${JSON.stringify(input.recentPlannings ?? [])}
- Feriados/bank holidays do país (considera para timing e temas): ${JSON.stringify(input.holidays ?? [])}
- Notas adicionais: ${input.notes || ""}

ESTILO PARA MARCAS:
- Títulos e captions devem ser profissionais mas acessíveis
- Mantém brand voice consistente em todos os posts
- Prioriza formats que comunicam melhor mensagens complexas (Carousel > Single Post)
- Cria conteúdo que suporta objetivos de negócio (conversões, awareness, etc.)
- Respeita sempre os guardrails e brand values`
    : `Generate a schedule proposal for a BRAND/AGENCY.

BRAND SPECIFIC CONTEXT:
- Focus on brand consistency, positioning, and business KPIs
- Prioritize professional formats (Carousel, Post, Video)
- Content should reflect brand values and business objectives
- Use competitor analysis for strategic differentiation
- Brand guidelines and guardrails are prioritized

Rules:
- Output must match the JSON schema exactly.
- Distribute items across platforms and formats realistically.
- Use scheduled_at with timezone (ISO 8601).
- Use platform and format EXACTLY as the schema options (lowercase).
- Strategy is mandatory. NEVER use platforms outside: ${allowedPlatforms.join(", ")}.
- Assets describe what to produce (no URLs).
- rationale must explain why, grounded in the strategy, the editorial profile, and client settings (tone, audience, goals, guardrails).
- For each rationale point, fill strategyReference.field with a schema value and strategyReference.snippet with a short excerpt.
- The reason text must be explicit and direct (e.g. "A is suggested because ..."), avoid generic statements.
- For EACH item, include at least 1 rationale point with strategyReference.field = "timing" explaining the day/time choice (timezone, platform behavior, and strategy constraints).
- IMPORTANT: Prefer using the optimal posting times suggested below. They are based on industry studies and this client's historical data.

Optimal posting times by platform (prefer these slots):
${input.optimalSlots || "Not available - use standard social media logic"}

${input.strategy.competitor_insights ? `Competitor insights (ANALYZE AND USE FOR STRATEGIC DIFFERENTIATION):
  Summary: ${input.strategy.competitor_insights.summary}
  Themes: ${input.strategy.competitor_insights.insights.contentThemes?.slice(0, 10).join(", ") || "N/A"}
  Formats: ${input.strategy.competitor_insights.insights.contentFormats?.slice(0, 10).join(", ") || "N/A"}
  Hooks: ${input.strategy.competitor_insights.insights.hooks?.slice(0, 10).join(", ") || "N/A"}
  CTAs: ${input.strategy.competitor_insights.insights.ctas?.slice(0, 10).join(", ") || "N/A"}
  Keywords: ${input.strategy.competitor_insights.insights.keywords?.slice(0, 15).join(", ") || "N/A"}
  Pillars: ${input.strategy.competitor_insights.insights.messagingPillars?.slice(0, 10).join(", ") || "N/A"}
  Opportunities to emulate: ${input.strategy.competitor_insights.insights.whatToEmulate?.slice(0, 5).join(", ") || "N/A"}
  Whitespace: ${input.strategy.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Counter-positioning angles: ${input.strategy.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANT: Use these insights to create content that is better, different, or explores strategic opportunities competitors are not exploring.` : ""}

${input.strategy.reference_examples && input.strategy.reference_examples.length > 0 ? `Reference examples (use as inspiration while maintaining brand consistency):
${input.strategy.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` - ${ex.description}` : ""}`).join("\n")}
  IMPORTANT: Adapt these examples while maintaining brand values and guardrails.` : ""}

${input.trendingTopics ? `Trending topics (consider if aligned with brand):
${input.trendingTopics}
IMPORTANT: Only use trends that make sense for the brand and don't compromise brand consistency.` : ""}

Context:
- Timezone: ${input.timezone}
- Range: ${input.startDate} to ${input.endDate}
- Strategy: ${JSON.stringify(input.strategy)}
- Persona (primary target audience; use language, pain points, objections, preferences): ${JSON.stringify(input.persona ?? null)}
- Recent plannings (keep consistency, avoid repetition, follow a logic): ${JSON.stringify(input.recentPlannings ?? [])}
- Country holidays/bank holidays (consider for timing and themes): ${JSON.stringify(input.holidays ?? [])}
- Additional notes: ${input.notes || ""}

BRAND STYLE:
- Titles and captions should be professional but accessible
- Maintain consistent brand voice across all posts
- Prioritize formats that better communicate complex messages (Carousel > Single Post)
- Create content that supports business objectives (conversions, awareness, etc.)
- Always respect guardrails and brand values`;
}
