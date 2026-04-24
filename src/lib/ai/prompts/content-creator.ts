/**
 * Content Creator specific prompts for social media content generation
 */

import type { GenerateScheduleInput } from "../schedule-generator";

export function getContentCreatorPrompt(input: GenerateScheduleInput): string {
  const allowedPlatforms = input.allowedPlatforms || [];
  const s = input.strategy;
  const ep = s.editorial_profile;
  const c = s.client;

  return input.locale === "pt"
    ? `Gera uma proposta de calendarização de conteúdos para um CRIADOR DE CONTEÚDO.

REGRAS DE CADÊNCIA (SEGUIR RIGOROSAMENTE):
- Gera EXATAMENTE ${input.expectedPostCount ?? "o número correto de"} items no total.
- Isso significa ${input.postsPerPlatform ?? "a quantidade correta de"} items POR plataforma: ${allowedPlatforms.join(", ")}.
- A cadência da estratégia é: "${s.cadence || "não definida"}".
- Se um conteúdo funcionar em 2+ plataformas, gera-o para AMBAS com captions adaptadas. Usa o mesmo content_group. Conta como 1 post na quota de cada plataforma.
- Distribui os posts uniformemente pelo intervalo. Não os concentres todos no mesmo dia.

=== CONTEXTO DO CRIADOR (OBRIGATÓRIO) ===
Nome: ${c?.name || "N/A"}
Website: ${c?.website || "N/A"}
O que faz: ${c?.description || "N/A"}
Nicho/foco: ${c?.focus_area || "N/A"}
Tags: ${s.business_tags?.join(", ") || "N/A"}

=== DIRECTIVAS DA ESTRATÉGIA (SEGUIR RIGOROSAMENTE) ===
Posicionamento: ${s.positioning || "N/A"}
Mensagens-chave: ${s.key_messages || "N/A"}
Notas para IA / Brief de campanha: ${s.ai_notes || "Nenhuma"}
${s.ai_notes ? `^^^ ACIMA ESTÁ O BRIEF MAIS IMPORTANTE. SE EXISTEM NOTAS, CADA POST DEVE ESTAR DIRETAMENTE RELACIONADO COM ELAS.
Se menciona um lançamento, série de conteúdo, colaboração ou tema especial — TODOS os posts devem suportá-lo. NÃO IGNORES ESTAS NOTAS.` : ""}

=== FRAMEWORK DE CONTEÚDO ===
Objetivos: ${s.objectives || "N/A"}
Pilares de conteúdo: ${s.content_pillars || "N/A"}
Audiência: ${s.audience || "N/A"}

=== PERFIL EDITORIAL ===
Tom: ${ep?.tone || "N/A"}
Valores: ${ep?.brand_values || "N/A"}
Objetivos editoriais: ${ep?.goals || "N/A"}

=== RESTRIÇÕES ===
Guardrails: ${s.guardrails || "N/A"}
Formatos permitidos: ${input.allowedFormats?.join(", ") || "N/A"}
Plataformas: ${allowedPlatforms.join(", ")}

=== CONTEXTO (USA COMO INSPIRAÇÃO) ===
Timezone: ${input.timezone}
Intervalo: ${input.startDate} a ${input.endDate}
Persona (público-alvo): ${JSON.stringify(input.persona ?? null)}
Planificações recentes (evita repetição): ${JSON.stringify(input.recentPlannings ?? [])}
Feriados: ${JSON.stringify(input.holidays ?? [])}
${s.competitor_insights ? `
Insights dos competidores (usa para ser diferente):
  Oportunidades não exploradas: ${s.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Ângulos de diferenciação: ${s.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  Hooks eficazes: ${s.competitor_insights.insights.hooks?.slice(0, 8).join(", ") || "N/A"}
  IMPORTANTE: Cria pelo menos 1 post com um ângulo único que os outros criadores não estão a explorar.` : ""}
${s.reference_examples && s.reference_examples.length > 0 ? `
Exemplos de referências (inspiração, não copiar):
${s.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` — ${ex.description}` : ""}`).join("\n")}` : ""}
${input.trendingTopics ? `
Tópicos em tendência (integra naturalmente se relevantes):
${input.trendingTopics}` : ""}
${input.optimalSlots ? `
Horários ideais por plataforma (prefere estes):
${input.optimalSlots}` : ""}

Regras de output:
- O output tem de seguir exatamente o schema JSON.
- Usa scheduled_at com timezone (ISO 8601).
- Usa platform e format EXATAMENTE como as opções do schema (lowercase).
- NUNCA uses plataformas fora de: ${allowedPlatforms.join(", ")}.
- Assets descrevem o que deve ser produzido (sem URLs).
- Em cada ponto de rationale: strategyReference.field = campo relevante do schema, strategyReference.snippet = excerto curto.
- Reason deve ser direto: "A é sugerido porque ...".
- Em CADA item, inclui 1 ponto de rationale com field = "timing" (justifica dia e hora).
- Tom conversacional e autêntico. Linguagem pessoal. Conteúdo que o criador pode produzir sozinho.`
    : `Generate a schedule proposal for a CONTENT CREATOR.

CADENCE RULES (FOLLOW STRICTLY):
- Generate EXACTLY ${input.expectedPostCount ?? "the correct number of"} items total.
- That means ${input.postsPerPlatform ?? "the correct number of"} items PER platform: ${allowedPlatforms.join(", ")}.
- The cadence from the strategy is: "${s.cadence || "not defined"}".
- If content works on 2+ platforms, generate it for BOTH with adapted captions. Use the same content_group. Counts as 1 post per platform quota.
- Distribute posts evenly across the date range.

=== CREATOR CONTEXT (MANDATORY) ===
Name: ${c?.name || "N/A"}
Website: ${c?.website || "N/A"}
What they do: ${c?.description || "N/A"}
Niche/focus: ${c?.focus_area || "N/A"}
Tags: ${s.business_tags?.join(", ") || "N/A"}

=== STRATEGY DIRECTIVES (FOLLOW STRICTLY) ===
Positioning: ${s.positioning || "N/A"}
Key Messages: ${s.key_messages || "N/A"}
AI Notes / Campaign Brief: ${s.ai_notes || "None"}
${s.ai_notes ? `^^^ THE ABOVE IS THE MOST IMPORTANT DIRECTIVE. IF NOTES EXIST, EVERY POST MUST DIRECTLY RELATE TO THEM.
If it mentions a launch, content series, collab, or special theme — ALL posts should support it. DO NOT IGNORE THESE NOTES.` : ""}

=== CONTENT FRAMEWORK ===
Objectives: ${s.objectives || "N/A"}
Content Pillars: ${s.content_pillars || "N/A"}
Audience: ${s.audience || "N/A"}

=== EDITORIAL PROFILE ===
Tone: ${ep?.tone || "N/A"}
Values: ${ep?.brand_values || "N/A"}
Editorial Goals: ${ep?.goals || "N/A"}

=== CONSTRAINTS ===
Guardrails: ${s.guardrails || "N/A"}
Allowed formats: ${input.allowedFormats?.join(", ") || "N/A"}
Platforms: ${allowedPlatforms.join(", ")}

=== CONTEXT (USE AS INSPIRATION) ===
Timezone: ${input.timezone}
Range: ${input.startDate} to ${input.endDate}
Persona (primary audience): ${JSON.stringify(input.persona ?? null)}
Recent plannings (avoid repetition): ${JSON.stringify(input.recentPlannings ?? [])}
Holidays: ${JSON.stringify(input.holidays ?? [])}
${s.competitor_insights ? `
Competitor insights (use to be different):
  Unexploited opportunities: ${s.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Differentiation angles: ${s.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  Effective hooks: ${s.competitor_insights.insights.hooks?.slice(0, 8).join(", ") || "N/A"}
  IMPORTANT: Create at least 1 post with a unique angle others aren't covering.` : ""}
${s.reference_examples && s.reference_examples.length > 0 ? `
Reference examples (inspiration, don't copy):
${s.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` — ${ex.description}` : ""}`).join("\n")}` : ""}
${input.trendingTopics ? `
Trending topics (integrate naturally if relevant):
${input.trendingTopics}` : ""}
${input.optimalSlots ? `
Optimal posting times by platform (prefer these):
${input.optimalSlots}` : ""}

Output rules:
- Output must match the JSON schema exactly.
- Use scheduled_at with timezone (ISO 8601).
- Use platform and format EXACTLY as schema options (lowercase).
- NEVER use platforms outside: ${allowedPlatforms.join(", ")}.
- Assets describe what to produce (no URLs).
- For each rationale point: strategyReference.field = relevant schema field, strategyReference.snippet = short excerpt.
- Reason must be direct: "A is suggested because ...".
- For EACH item, include 1 rationale point with field = "timing" (justify day and time).
- Conversational and authentic tone. Personal language. Content creator can produce alone.`;
}
