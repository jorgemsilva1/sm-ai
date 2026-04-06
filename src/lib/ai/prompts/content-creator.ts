/**
 * Content Creator specific prompts for social media content generation
 */

import type { GenerateScheduleInput } from "./schedule-generator";

export function getContentCreatorPrompt(input: GenerateScheduleInput): string {
  const allowedPlatforms = input.allowedPlatforms || [];
  const allowedFormats = input.allowedFormats || [];

  return input.locale === "pt"
    ? `Gera uma proposta de calendarização de conteúdos para um CRIADOR DE CONTEÚDO.

CONTEXTO ESPECÍFICO PARA CRIADORES:
- Foco em autenticidade, conexão pessoal e engagement
- Prioriza formats virais (Reels, Shorts, Stories)
- Conteúdo deve refletir a personalidade e história do criador
- Usa trends e tópicos do momento para relevância
- Engagement e crescimento são prioritários sobre brand consistency

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

${input.trendingTopics ? `Tópicos em tendência (USA ESTES PARA CRIAR CONTEÚDO RELEVANTE E ATUAL):
${input.trendingTopics}
IMPORTANTE: Integra estes tópicos naturalmente no conteúdo.` : ""}

${input.strategy.competitor_insights ? `Insights dos competidores (ANALISA E USA PARA SER MELHOR OU DIFERENTE):
  Resumo: ${input.strategy.competitor_insights.summary}
  Temas: ${input.strategy.competitor_insights.insights.contentThemes?.slice(0, 10).join(", ") || "N/A"}
  Hooks: ${input.strategy.competitor_insights.insights.hooks?.slice(0, 10).join(", ") || "N/A"}
  Espaços em branco: ${input.strategy.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANTE: Cria conteúdo que explore oportunidades que os competidores não estão a explorar.` : ""}

${input.strategy.reference_examples && input.strategy.reference_examples.length > 0 ? `Exemplos de referências (usa como inspiração):
${input.strategy.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` - ${ex.description}` : ""}`).join("\n")}
  IMPORTANTE: Adapta estes exemplos à tua personalidade e estilo único.` : ""}

Contexto:
- Timezone: ${input.timezone}
- Intervalo: ${input.startDate} a ${input.endDate}
- Estratégia: ${JSON.stringify(input.strategy)}
- Persona (público-alvo principal; usar linguagem, dores, objeções e preferências): ${JSON.stringify(input.persona ?? null)}
- Planificações recentes (para consistência, evitar repetição e manter lógica): ${JSON.stringify(input.recentPlannings ?? [])}
- Feriados/bank holidays do país (considera para timing e temas): ${JSON.stringify(input.holidays ?? [])}
- Notas adicionais: ${input.notes || ""}

ESTILO PARA CRIADORES:
- Títulos e captions devem ser conversacionais e autênticos
- Usa linguagem pessoal ("eu", "tu", "nós")
- Inclui elementos de storytelling pessoal quando relevante
- Prioriza formats que geram mais engagement (Reels > Posts, Shorts > Long videos)
- Cria conteúdo que o criador pode facilmente produzir sozinho`
    : `Generate a schedule proposal for a CONTENT CREATOR.

CONTENT CREATOR SPECIFIC CONTEXT:
- Focus on authenticity, personal connection, and engagement
- Prioritize viral formats (Reels, Shorts, Stories)
- Content should reflect creator's personality and story
- Use trends and current topics for relevance
- Engagement and growth are prioritized over brand consistency

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

${input.trendingTopics ? `Trending topics (USE THESE TO CREATE RELEVANT AND CURRENT CONTENT):
${input.trendingTopics}
IMPORTANT: Integrate these topics naturally into content.` : ""}

${input.strategy.competitor_insights ? `Competitor insights (ANALYZE AND USE TO BE BETTER OR DIFFERENT):
  Summary: ${input.strategy.competitor_insights.summary}
  Themes: ${input.strategy.competitor_insights.insights.contentThemes?.slice(0, 10).join(", ") || "N/A"}
  Hooks: ${input.strategy.competitor_insights.insights.hooks?.slice(0, 10).join(", ") || "N/A"}
  Whitespace: ${input.strategy.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANT: Create content that explores opportunities competitors are not exploring.` : ""}

${input.strategy.reference_examples && input.strategy.reference_examples.length > 0 ? `Reference examples (use as inspiration):
${input.strategy.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` - ${ex.description}` : ""}`).join("\n")}
  IMPORTANT: Adapt these examples to your unique personality and style.` : ""}

Context:
- Timezone: ${input.timezone}
- Range: ${input.startDate} to ${input.endDate}
- Strategy: ${JSON.stringify(input.strategy)}
- Persona (primary target audience; use language, pain points, objections, preferences): ${JSON.stringify(input.persona ?? null)}
- Recent plannings (keep consistency, avoid repetition, follow a logic): ${JSON.stringify(input.recentPlannings ?? [])}
- Country holidays/bank holidays (consider for timing and themes): ${JSON.stringify(input.holidays ?? [])}
- Additional notes: ${input.notes || ""}

CREATOR STYLE:
- Titles and captions should be conversational and authentic
- Use personal language ("I", "you", "we")
- Include personal storytelling elements when relevant
- Prioritize formats that generate more engagement (Reels > Posts, Shorts > Long videos)
- Create content the creator can easily produce alone`;
}
