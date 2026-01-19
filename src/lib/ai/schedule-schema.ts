import { z } from "zod";

export const ScheduleAssetSchema = z.object({
  type: z.enum(["image", "video", "carousel"]),
  description: z.string().min(1),
  notes: z.string().nullable(),
});

export const ScheduleRationalePointSchema = z.object({
  reason: z.string().min(1),
  strategyReference: z.object({
    field: z.enum([
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
    ]),
    snippet: z.string().min(1),
  }),
});

export const ScheduleProposedItemSchema = z.object({
  scheduled_at: z
    .string()
    .datetime({ offset: true })
    .describe("ISO 8601 datetime with timezone, e.g. 2026-01-19T10:00:00+00:00"),
  platform: z
    .enum(["instagram", "tiktok", "facebook", "linkedin", "x", "youtube", "blog"])
    .describe("Target platform"),
  format: z.enum(["post", "reel", "story", "carousel", "short", "video", "thread"]),
  title: z.string().min(1),
  caption: z.string().min(1),
  assets: z.array(ScheduleAssetSchema).min(1),
  rationale: z.array(ScheduleRationalePointSchema).min(1),
});

export const ScheduleProposalSchema = z.object({
  items: z.array(ScheduleProposedItemSchema).min(1),
});

export const ScheduleSingleItemSchema = z.object({
  item: ScheduleProposedItemSchema,
});

export type ScheduleProposal = z.infer<typeof ScheduleProposalSchema>;
export type ScheduleProposedItem = z.infer<typeof ScheduleProposedItemSchema>;
export type ScheduleSingleItem = z.infer<typeof ScheduleSingleItemSchema>;

