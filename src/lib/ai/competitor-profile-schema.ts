import { z } from "zod";

const EvidenceSourceSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    page_title: z.string().nullable().default(null),
    excerpt: z.string().nullable().default(null),
  }),
]);

const EvidenceDetailSchema = z.object({
  justification: z.string(),
  sources: z.array(EvidenceSourceSchema).default([]),
});

const EvidenceItemSchema = z.object({
  text: z.string(),
  justification: z.string(),
  sources: z.array(EvidenceSourceSchema).default([]),
});

export const CompetitorProfileSchema = z.object({
  overview: z.string(),
  overview_evidence: EvidenceDetailSchema,
  category: z.string().nullable().default(null),
  business_model: z.string().nullable().default(null),
  positioning: z.string(),
  positioning_evidence: EvidenceDetailSchema,
  value_proposition: z.string(),
  value_proposition_evidence: EvidenceDetailSchema,

  offerings: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullable().default(null),
        target: z.string().nullable().default(null),
        price_hint: z.string().nullable().default(null),
        justification: z.string(),
        sources: z.array(EvidenceSourceSchema).default([]),
      }),
    )
    .default([]),

  audience_segments: z
    .array(
      z.object({
        segment: z.string(),
        segment_justification: z.string(),
        sources: z.array(EvidenceSourceSchema).default([]),
        pains: z.array(EvidenceItemSchema).default([]),
        desires: z.array(EvidenceItemSchema).default([]),
        objections: z.array(EvidenceItemSchema).default([]),
      }),
    )
    .default([]),

  differentiators: z.array(EvidenceItemSchema).default([]),
  proof_points: z
    .array(
      z.object({
        point: z.string(),
        justification: z.string(),
        sources: z.array(EvidenceSourceSchema).default([]),
      }),
    )
    .default([]),

  messaging: z.object({
    keywords: z.array(EvidenceItemSchema).default([]),
    pillars: z.array(EvidenceItemSchema).default([]),
    tagline_examples: z.array(EvidenceItemSchema).default([]),
  }),

  tone_of_voice: z.object({
    summary: z.string(),
    summary_evidence: EvidenceDetailSchema,
    traits: z.array(EvidenceItemSchema).default([]),
    do: z.array(EvidenceItemSchema).default([]),
    dont: z.array(EvidenceItemSchema).default([]),
  }),

  funnel: z.object({
    top: z.array(EvidenceItemSchema).default([]),
    middle: z.array(EvidenceItemSchema).default([]),
    bottom: z.array(EvidenceItemSchema).default([]),
  }),

  channels: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string().nullable().default(null),
        role: z.string().nullable().default(null),
        audience_fit: z.string().nullable().default(null),
        channel_justification: z.string(),
        sources: z.array(EvidenceSourceSchema).default([]),
        content_types: z.array(EvidenceItemSchema).default([]),
        cadence_guess: z.string().nullable().default(null),
        best_practices: z.array(EvidenceItemSchema).default([]),
      }),
    )
    .default([]),

  content_strategy: z.object({
    themes: z.array(EvidenceItemSchema).default([]),
    formats: z.array(EvidenceItemSchema).default([]),
    hooks: z.array(EvidenceItemSchema).default([]),
    ctas: z.array(EvidenceItemSchema).default([]),
    cadence_guess: z.string().nullable().default(null),
    series_ideas: z.array(EvidenceItemSchema).default([]),
  }),

  risks: z.array(EvidenceItemSchema).default([]),
  opportunities: z.array(EvidenceItemSchema).default([]),

  strategy_implications: z.object({
    emulate: z.array(EvidenceItemSchema).default([]),
    avoid: z.array(EvidenceItemSchema).default([]),
    whitespace: z.array(EvidenceItemSchema).default([]),
    counter_angles: z.array(EvidenceItemSchema).default([]),
    experiments: z.array(EvidenceItemSchema).default([]),
  }),

  evidence: z
    .array(
      z.object({
        claim: z.string(),
        sources: z.array(EvidenceSourceSchema).default([]),
      }),
    )
    .default([]),
});

export type CompetitorProfile = z.infer<typeof CompetitorProfileSchema>;

