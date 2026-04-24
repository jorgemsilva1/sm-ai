/**
 * Brand/Agency specific prompts for social media content generation
 */

import type { GenerateScheduleInput } from "../schedule-generator";

export function getBrandPrompt(input: GenerateScheduleInput): string {
  const allowedPlatforms = input.allowedPlatforms || [];
  const s = input.strategy;
  const ep = s.editorial_profile;
  const c = s.client;

  return input.locale === "pt"
    ? `Gera uma proposta de calendarização de conteúdos para uma MARCA/AGÊNCIA.

REGRAS DE CADÊNCIA (SEGUIR RIGOROSAMENTE):
- Gera EXATAMENTE ${input.expectedPostCount ?? "o número correto de"} items no total.
- Isso significa ${input.postsPerPlatform ?? "a quantidade correta de"} items POR plataforma: ${allowedPlatforms.join(", ")}.
- A cadência da estratégia é: "${s.cadence || "não definida"}".
- Se um conteúdo funcionar em 2+ plataformas, gera-o para AMBAS com captions adaptadas. Usa o mesmo content_group. Conta como 1 post na quota de cada plataforma.
- Distribui os posts uniformemente pelo intervalo. Não os concentres todos no mesmo dia.

=== BRIEFING DO CLIENTE (OBRIGATÓRIO) ===
Nome: ${c?.name || "N/A"}
Website: ${c?.website || "N/A"}
O que faz: ${c?.description || "N/A"}
Notas: ${c?.notes || "N/A"}
Área de foco: ${c?.focus_area || "N/A"}

=== DIRECTIVAS DA ESTRATÉGIA (SEGUIR RIGOROSAMENTE) ===
Posicionamento: ${s.positioning || "N/A"}
Mensagens-chave: ${s.key_messages || "N/A"}
Notas para IA / Brief de campanha: ${s.ai_notes || "Nenhuma"}
${s.ai_notes ? `^^^ ACIMA ESTÁ O BRIEF MAIS IMPORTANTE. SE EXISTEM NOTAS, CADA POST DEVE ESTAR DIRETAMENTE RELACIONADO COM ELAS.
Se menciona um lançamento, produto, evento ou campanha — TODOS os posts devem suportá-lo (teasers, anúncios, highlights, follow-ups). NÃO IGNORES ESTAS NOTAS.` : ""}

=== FRAMEWORK DE CONTEÚDO ===
Objetivos: ${s.objectives || "N/A"}
Pilares de conteúdo: ${s.content_pillars || "N/A"}
Audiência: ${s.audience || "N/A"}
KPIs: ${s.kpis || "N/A"}

=== PERFIL EDITORIAL ===
Tom: ${ep?.tone || "N/A"}
Valores da marca: ${ep?.brand_values || "N/A"}
Objetivos editoriais: ${ep?.goals || "N/A"}
Referências: ${ep?.references_text || "N/A"}
Tags do negócio: ${s.business_tags?.join(", ") || "N/A"}

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
Insights dos competidores (usa para diferenciação):
  Oportunidades não exploradas: ${s.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Ângulos de diferenciação: ${s.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  Temas dos competidores: ${s.competitor_insights.insights.contentThemes?.slice(0, 8).join(", ") || "N/A"}
  Hooks eficazes: ${s.competitor_insights.insights.hooks?.slice(0, 8).join(", ") || "N/A"}
  O que emular: ${s.competitor_insights.insights.whatToEmulate?.slice(0, 5).join(", ") || "N/A"}
  O que evitar: ${s.competitor_insights.insights.whatToAvoid?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANTE: Cria pelo menos 1 post que explore uma oportunidade não explorada pelos competidores.` : ""}
${s.reference_examples && s.reference_examples.length > 0 ? `
Exemplos de referências (inspiração, não copiar):
${s.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` — ${ex.description}` : ""}`).join("\n")}` : ""}
${input.trendingTopics ? `
Tópicos em tendência (só usa se alinhados com a marca):
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
- Mantém brand voice consistente. Respeita guardrails.`
    : `Generate a schedule proposal for a BRAND/AGENCY.

CADENCE RULES (FOLLOW STRICTLY):
- Generate EXACTLY ${input.expectedPostCount ?? "the correct number of"} items total.
- That means ${input.postsPerPlatform ?? "the correct number of"} items PER platform: ${allowedPlatforms.join(", ")}.
- The cadence from the strategy is: "${s.cadence || "not defined"}".
- If content works on 2+ platforms, generate it for BOTH with adapted captions. Use the same content_group. Counts as 1 post per platform quota.
- Distribute posts evenly across the date range.

=== CLIENT BRIEF (MANDATORY) ===
Name: ${c?.name || "N/A"}
Website: ${c?.website || "N/A"}
What they do: ${c?.description || "N/A"}
Notes: ${c?.notes || "N/A"}
Focus area: ${c?.focus_area || "N/A"}

=== STRATEGY DIRECTIVES (FOLLOW STRICTLY) ===
Positioning: ${s.positioning || "N/A"}
Key Messages: ${s.key_messages || "N/A"}
AI Notes / Campaign Brief: ${s.ai_notes || "None"}
${s.ai_notes ? `^^^ THE ABOVE IS THE MOST IMPORTANT DIRECTIVE. IF NOTES EXIST, EVERY POST MUST BE DIRECTLY RELATED TO THEM.
If it mentions a launch, product, event, or campaign — ALL posts should support it (teasers, announcements, highlights, follow-ups). DO NOT IGNORE THESE NOTES.` : ""}

=== CONTENT FRAMEWORK ===
Objectives: ${s.objectives || "N/A"}
Content Pillars: ${s.content_pillars || "N/A"}
Audience: ${s.audience || "N/A"}
KPIs: ${s.kpis || "N/A"}

=== EDITORIAL PROFILE ===
Tone: ${ep?.tone || "N/A"}
Brand Values: ${ep?.brand_values || "N/A"}
Editorial Goals: ${ep?.goals || "N/A"}
References: ${ep?.references_text || "N/A"}
Business tags: ${s.business_tags?.join(", ") || "N/A"}

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
Competitor insights (use for differentiation):
  Unexploited opportunities: ${s.competitor_insights.insights.whitespaceOpportunities?.slice(0, 5).join(", ") || "N/A"}
  Differentiation angles: ${s.competitor_insights.insights.counterAngles?.slice(0, 5).join(", ") || "N/A"}
  Competitor themes: ${s.competitor_insights.insights.contentThemes?.slice(0, 8).join(", ") || "N/A"}
  Effective hooks: ${s.competitor_insights.insights.hooks?.slice(0, 8).join(", ") || "N/A"}
  What to emulate: ${s.competitor_insights.insights.whatToEmulate?.slice(0, 5).join(", ") || "N/A"}
  What to avoid: ${s.competitor_insights.insights.whatToAvoid?.slice(0, 5).join(", ") || "N/A"}
  IMPORTANT: Create at least 1 post that exploits an opportunity competitors are not covering.` : ""}
${s.reference_examples && s.reference_examples.length > 0 ? `
Reference examples (inspiration, don't copy):
${s.reference_examples.slice(0, 10).map((ex, i) => `  ${i + 1}. [${ex.group_name}] ${ex.title}${ex.description ? ` — ${ex.description}` : ""}`).join("\n")}` : ""}
${input.trendingTopics ? `
Trending topics (only use if aligned with the brand):
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
- Maintain consistent brand voice. Always respect guardrails.`;
}
