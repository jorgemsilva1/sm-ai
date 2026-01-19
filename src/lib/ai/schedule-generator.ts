import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import {
  ScheduleProposalSchema,
  ScheduleSingleItemSchema,
  type ScheduleProposedItem,
  type ScheduleProposal,
} from "@/lib/ai/schedule-schema";

type StrategyForAI = {
  id: string;
  title: string;
  status?: string | null;
  objectives?: string | null;
  audience?: string | null;
  positioning?: string | null;
  key_messages?: string | null;
  content_pillars?: string | null;
  formats?: string | null;
  channels?: string | null;
  cadence?: string | null;
  kpis?: string | null;
  guardrails?: string | null;
  ai_notes?: string | null;
  client?: {
    name?: string | null;
    website?: string | null;
    description?: string | null;
    notes?: string | null;
    focus_area?: string | null;
  };
  editorial_profile?: {
    audience?: string | null;
    tone?: string | null;
    goals?: string | null;
    brand_values?: string | null;
    references_text?: string | null;
  };
  business_tags?: string[];
  competitors?: Array<{
    name: string;
    website?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
    x?: string | null;
  }>;
  reference_folders?: Array<{
    name: string;
    description?: string | null;
  }>;
};

type PersonaForAI = {
  id: string;
  name: string;
  role_title: string | null;
  age_range: string | null;
  gender: string | null;
  location: string | null;
  goals: string | null;
  pain_points: string | null;
  motivations: string | null;
  channels: string | null;
  content_preferences: string | null;
  objections: string | null;
  notes: string | null;
  style_preferences: string | null;
  demographics: string | null;
};

type GenerateScheduleInput = {
  locale: "pt" | "en";
  timezone: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  strategy: StrategyForAI;
  notes?: string | null;
  allowedPlatforms?: Array<
    "instagram" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube" | "blog"
  >;
  allowedFormats?: Array<
    "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread"
  >;
  recentPlannings?: Array<{
    scheduled_at: string;
    platform: string;
    format: string;
    title: string;
    status: string;
  }>;
  holidays?: Array<{
    date: string; // YYYY-MM-DD
    name: string;
    type: string;
  }>;
  persona?: PersonaForAI;
};

const ALL_PLATFORMS = ["instagram", "tiktok", "facebook", "linkedin", "x", "youtube", "blog"] as const;
const ALL_FORMATS = ["post", "reel", "story", "carousel", "short", "video", "thread"] as const;
const RATIONALE_FIELDS = [
  "objectives",
  "audience",
  "tone",
  "brand_values",
  "key_messages",
  "content_pillars",
  "formats",
  "channels",
  "cadence",
  "kpis",
  "guardrails",
  "competitors",
  "reference_folders",
  "previous_plannings",
  "holidays",
  "timing",
  "client_settings",
] as const;

export async function generateScheduleWithOpenAI(
  input: GenerateScheduleInput,
): Promise<ScheduleProposal> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const allowedPlatforms =
    input.allowedPlatforms && input.allowedPlatforms.length
      ? input.allowedPlatforms
      : (ALL_PLATFORMS as unknown as string[]);
  const allowedFormats =
    input.allowedFormats && input.allowedFormats.length
      ? input.allowedFormats
      : (ALL_FORMATS as unknown as string[]);

  const system =
    input.locale === "pt"
      ? "És um estratega de social media. Responde SEMPRE em JSON válido e APENAS JSON."
      : "You are a social media strategist. Respond ONLY with valid JSON and ONLY JSON.";

  const user =
    input.locale === "pt"
      ? `Gera uma proposta de calendarização de conteúdos.

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

Contexto:
- Timezone: ${input.timezone}
- Intervalo: ${input.startDate} a ${input.endDate}
- Estratégia: ${JSON.stringify(input.strategy)}
- Persona (público-alvo principal; usar linguagem, dores, objeções e preferências): ${JSON.stringify(input.persona ?? null)}
- Planificações recentes (para consistência, evitar repetição e manter lógica): ${JSON.stringify(input.recentPlannings ?? [])}
- Feriados/bank holidays do país (considera para timing e temas): ${JSON.stringify(input.holidays ?? [])}
- Notas adicionais: ${input.notes || ""}`
      : `Generate a social media schedule proposal.

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

Context:
- Timezone: ${input.timezone}
- Range: ${input.startDate} to ${input.endDate}
- Strategy: ${JSON.stringify(input.strategy)}
- Persona (primary target audience; use language, pain points, objections, preferences): ${JSON.stringify(input.persona ?? null)}
- Recent plannings (keep consistency, avoid repetition, follow a logic): ${JSON.stringify(input.recentPlannings ?? [])}
- Country holidays/bank holidays (consider for timing and themes): ${JSON.stringify(input.holidays ?? [])}
- Additional notes: ${input.notes || ""}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    text: {
      format: {
        type: "json_schema",
        name: "schedule_proposal",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  scheduled_at: { type: "string", format: "date-time" },
                  platform: {
                    type: "string",
                    enum: allowedPlatforms,
                  },
                  format: {
                    type: "string",
                    enum: allowedFormats,
                  },
                  title: { type: "string" },
                  caption: { type: "string" },
                  assets: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        type: { type: "string", enum: ["image", "video", "carousel"] },
                        description: { type: "string" },
                        notes: { type: ["string", "null"] },
                      },
                      required: ["type", "description", "notes"],
                    },
                  },
                  rationale: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        reason: { type: "string" },
                        strategyReference: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            field: { type: "string", enum: RATIONALE_FIELDS as unknown as string[] },
                            snippet: { type: "string" },
                          },
                          required: ["field", "snippet"],
                        },
                      },
                      required: ["reason", "strategyReference"],
                    },
                  },
                },
                required: [
                  "scheduled_at",
                  "platform",
                  "format",
                  "title",
                  "caption",
                  "assets",
                  "rationale",
                ],
              },
            },
          },
          required: ["items"],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("OpenAI returned empty output_text.");
  }
  const parsed = JSON.parse(text);
  return ScheduleProposalSchema.parse(parsed);
}

type RetryItemInput = {
  locale: "pt" | "en";
  timezone: string;
  strategy: StrategyForAI;
  persona?: PersonaForAI;
  scheduledAt: string; // ISO
  platform:
    | "instagram"
    | "tiktok"
    | "facebook"
    | "linkedin"
    | "x"
    | "youtube"
    | "blog";
  format: "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread";
  previousTitle: string;
  previousCaption: string;
};

export async function regenerateScheduleItemWithOpenAI(
  input: RetryItemInput,
): Promise<ScheduleProposedItem> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const system =
    input.locale === "pt"
      ? "És um estratega de social media. Responde SEMPRE em JSON válido e APENAS JSON."
      : "You are a social media strategist. Respond ONLY with valid JSON and ONLY JSON.";

  const user =
    input.locale === "pt"
      ? `Reescreve UM item de calendarização para ser uma alternativa melhor, mantendo o slot e canal.

Regras:
- O output tem de seguir exatamente o schema JSON.
- Mantém "scheduled_at" exatamente igual: ${input.scheduledAt}
- Mantém "platform" exatamente igual: ${input.platform}
- Mantém "format" exatamente igual: ${input.format}
- Deve ser significativamente diferente (ângulo, hook, estrutura), mas coerente com a estratégia.

Estratégia: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}

Item anterior:
Título: ${input.previousTitle}
Caption: ${input.previousCaption}`
      : `Rewrite ONE schedule item as a stronger alternative while preserving slot and channel.

Rules:
- Output must match the JSON schema exactly.
- Keep "scheduled_at" exactly: ${input.scheduledAt}
- Keep "platform" exactly: ${input.platform}
- Keep "format" exactly: ${input.format}
- Make it meaningfully different (angle, hook, structure) but consistent with the strategy.

Strategy: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}

Previous item:
Title: ${input.previousTitle}
Caption: ${input.previousCaption}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    text: {
      format: {
        type: "json_schema",
        name: "schedule_single_item",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            item: {
              type: "object",
              additionalProperties: false,
              properties: {
                scheduled_at: { type: "string", format: "date-time" },
                platform: {
                  type: "string",
                  enum: [input.platform],
                },
                format: {
                  type: "string",
                  enum: [input.format],
                },
                title: { type: "string" },
                caption: { type: "string" },
                assets: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      type: { type: "string", enum: ["image", "video", "carousel"] },
                      description: { type: "string" },
                      notes: { type: ["string", "null"] },
                    },
                    required: ["type", "description", "notes"],
                  },
                },
                rationale: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      reason: { type: "string" },
                      strategyReference: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          field: { type: "string", enum: RATIONALE_FIELDS as unknown as string[] },
                          snippet: { type: "string" },
                        },
                        required: ["field", "snippet"],
                      },
                    },
                    required: ["reason", "strategyReference"],
                  },
                },
              },
              required: [
                "scheduled_at",
                "platform",
                "format",
                "title",
                "caption",
                "assets",
                "rationale",
              ],
            },
          },
          required: ["item"],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("OpenAI returned empty output_text.");
  }
  const parsed = JSON.parse(text);
  const validated = ScheduleSingleItemSchema.parse(parsed);
  return validated.item;
}

type GenerateOneItemInput = {
  locale: "pt" | "en";
  timezone: string;
  strategy: StrategyForAI;
  persona?: PersonaForAI;
  scheduledAt: string; // ISO
  platform:
    | "instagram"
    | "tiktok"
    | "facebook"
    | "linkedin"
    | "x"
    | "youtube"
    | "blog";
  format: "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread";
  userPrompt: string;
  recentPlannings?: unknown[];
  holidays?: unknown[];
};

export async function generateOneScheduleItemWithOpenAI(
  input: GenerateOneItemInput,
): Promise<ScheduleProposedItem> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const system =
    input.locale === "pt"
      ? "És um estratega de social media. Responde SEMPRE em JSON válido e APENAS JSON."
      : "You are a social media strategist. Respond ONLY with valid JSON and ONLY JSON.";

  const user =
    input.locale === "pt"
      ? `Gera UM item de calendarização de conteúdos, com base na estratégia e no prompt do utilizador.

Regras:
- O output tem de seguir exatamente o schema JSON.
- Mantém "scheduled_at" exatamente igual: ${input.scheduledAt}
- Mantém "platform" exatamente igual: ${input.platform}
- Mantém "format" exatamente igual: ${input.format}
- A estratégia é mandatória (canais/objetivos/tom/guardrails). Nunca saias dela.
- Persona é mandatória quando existir.
- Assets descrevem o que deve ser produzido (sem URLs).
- rationale tem de ser super explícito ("A é sugerido porque... como pedido na estratégia ...").
- Em cada ponto de rationale, preenche strategyReference.field e strategyReference.snippet.
- Inclui OBRIGATORIAMENTE 1 ponto de rationale com strategyReference.field = "timing" e explica a escolha do dia e hora (timezone + lógica de canal + estratégia).

Contexto:
- Timezone: ${input.timezone}
- Estratégia: ${JSON.stringify(input.strategy)}
- Persona: ${JSON.stringify(input.persona ?? null)}
- Planificações recentes: ${JSON.stringify(input.recentPlannings ?? [])}
- Feriados/celebrações: ${JSON.stringify(input.holidays ?? [])}

Prompt do utilizador (instruções adicionais):
${input.userPrompt}`
      : `Generate ONE schedule item based on the strategy and the user's prompt.

Rules:
- Output must match the JSON schema exactly.
- Keep "scheduled_at" exactly: ${input.scheduledAt}
- Keep "platform" exactly: ${input.platform}
- Keep "format" exactly: ${input.format}
- Strategy is mandatory (channels/objectives/tone/guardrails). Do not deviate.
- Persona is mandatory when provided.
- Assets describe what to produce (no URLs).
- rationale must be explicit ("A is suggested because... as requested in the strategy ...").
- Each rationale point must include strategyReference.field and strategyReference.snippet.
- MUST include 1 rationale point with strategyReference.field = "timing" explaining day/time choice (timezone + platform behavior + strategy constraints).

Context:
- Timezone: ${input.timezone}
- Strategy: ${JSON.stringify(input.strategy)}
- Persona: ${JSON.stringify(input.persona ?? null)}
- Recent plannings: ${JSON.stringify(input.recentPlannings ?? [])}
- Holidays/celebrations: ${JSON.stringify(input.holidays ?? [])}

User prompt (additional instructions):
${input.userPrompt}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    text: {
      format: {
        type: "json_schema",
        name: "schedule_single_item_from_prompt",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            item: {
              type: "object",
              additionalProperties: false,
              properties: {
                scheduled_at: { type: "string", format: "date-time" },
                platform: { type: "string", enum: [input.platform] },
                format: { type: "string", enum: [input.format] },
                title: { type: "string" },
                caption: { type: "string" },
                assets: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      type: { type: "string", enum: ["image", "video", "carousel"] },
                      description: { type: "string" },
                      notes: { type: ["string", "null"] },
                    },
                    required: ["type", "description", "notes"],
                  },
                },
                rationale: {
                  type: "array",
                  minItems: 2,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      reason: { type: "string" },
                      strategyReference: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          field: { type: "string", enum: RATIONALE_FIELDS as unknown as string[] },
                          snippet: { type: "string" },
                        },
                        required: ["field", "snippet"],
                      },
                    },
                    required: ["reason", "strategyReference"],
                  },
                },
              },
              required: ["scheduled_at", "platform", "format", "title", "caption", "assets", "rationale"],
            },
          },
          required: ["item"],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("OpenAI returned empty output_text.");
  const parsed = JSON.parse(text);
  const validated = ScheduleSingleItemSchema.parse(parsed);
  return validated.item;
}


type GenerateAssetsInput = {
  locale: "pt" | "en";
  strategy: StrategyForAI;
  persona?: PersonaForAI;
  platform: string;
  format: string;
  title: string;
  caption: string;
};

export async function generateAssetsWithOpenAI(input: GenerateAssetsInput): Promise<
  Array<{ type: "image" | "video" | "carousel"; description: string; notes: string | null }>
> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const system =
    input.locale === "pt"
      ? "És um diretor criativo. Responde APENAS em JSON válido."
      : "You are a creative director. Respond ONLY with valid JSON.";

  const user =
    input.locale === "pt"
      ? `Gera uma lista de assets a produzir para este post (sem URLs), alinhado com estratégia/persona.

Plataforma: ${input.platform}
Formato: ${input.format}
Título: ${input.title}
Texto: ${input.caption}

Estratégia: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}`
      : `Generate a list of assets to produce for this post (no URLs), aligned with strategy/persona.

Platform: ${input.platform}
Format: ${input.format}
Title: ${input.title}
Text: ${input.caption}

Strategy: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    text: {
      format: {
        type: "json_schema",
        name: "assets_only",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            assets: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  type: { type: "string", enum: ["image", "video", "carousel"] },
                  description: { type: "string" },
                  notes: { type: ["string", "null"] },
                },
                required: ["type", "description", "notes"],
              },
            },
          },
          required: ["assets"],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("OpenAI returned empty output_text.");
  const parsed = JSON.parse(text);
  const assets = Array.isArray(parsed?.assets) ? parsed.assets : [];
  return assets as Array<{ type: "image" | "video" | "carousel"; description: string; notes: string | null }>;
}

type RegenerateTextInput = {
  locale: "pt" | "en";
  strategy: StrategyForAI;
  persona?: PersonaForAI;
  platform: string;
  format: string;
  scheduledAtISO: string;
  previousTitle: string;
  previousCaption: string;
};

export async function regenerateTextWithOpenAI(input: RegenerateTextInput): Promise<{
  title: string;
  caption: string;
  rationale: Array<{ reason: string; strategyReference: { field: string; snippet: string } }>;
}> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const system =
    input.locale === "pt"
      ? "És um estratega de social media. Responde APENAS em JSON válido."
      : "You are a social media strategist. Respond ONLY with valid JSON.";

  const user =
    input.locale === "pt"
      ? `Reescreve o texto (título + caption) para este post, mantendo o slot e o canal.

Regras:
- Mantém scheduled_at exatamente: ${input.scheduledAtISO}
- Mantém platform exatamente: ${input.platform}
- Mantém format exatamente: ${input.format}
- A estratégia é mandatória (canais/objetivos/tom/guardrails).
- A persona é mandatória (linguagem, dores, objeções).
- rationale deve ser super explícito e sempre com strategyReference {field, snippet}.

Anterior:
Título: ${input.previousTitle}
Caption: ${input.previousCaption}

Estratégia: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}`
      : `Rewrite the copy (title + caption) for this post while keeping slot and channel.

Rules:
- Keep scheduled_at exactly: ${input.scheduledAtISO}
- Keep platform exactly: ${input.platform}
- Keep format exactly: ${input.format}
- Strategy is mandatory (channels/objectives/tone/guardrails).
- Persona is mandatory (language, pain points, objections).
- rationale must be explicit and always use strategyReference {field, snippet}.

Previous:
Title: ${input.previousTitle}
Caption: ${input.previousCaption}

Strategy: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.8,
    text: {
      format: {
        type: "json_schema",
        name: "copy_variant",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            scheduled_at: { type: "string", format: "date-time" },
            platform: { type: "string" },
            format: { type: "string" },
            title: { type: "string" },
            caption: { type: "string" },
            rationale: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reason: { type: "string" },
                  strategyReference: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      field: { type: "string" },
                      snippet: { type: "string" },
                    },
                    required: ["field", "snippet"],
                  },
                },
                required: ["reason", "strategyReference"],
              },
            },
          },
          required: ["scheduled_at", "platform", "format", "title", "caption", "rationale"],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("OpenAI returned empty output_text.");
  const parsed = JSON.parse(text);
  return { title: parsed.title, caption: parsed.caption, rationale: parsed.rationale };
}

