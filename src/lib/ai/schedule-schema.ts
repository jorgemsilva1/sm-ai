import { z } from "zod";

export const ScheduleAssetSchema = z.object({
  type: z.enum(["image", "video", "carousel"]),
  description: z.string().min(1),
  notes: z.string().nullable(),
});

export const ScheduleRationalePointSchema = z.object({
  reason: z.string().min(1),
  strategyReference: z.object({
    field: z.string().min(1),
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
  format: z.string().min(1),
  title: z.string().min(1),
  caption: z.string().min(1),
  assets: z.array(ScheduleAssetSchema).min(1),
  rationale: z.array(ScheduleRationalePointSchema).min(1),
  content_group: z.string().nullable().optional().describe("If this content is cross-posted to another platform, use the same group ID (e.g. 'group-1'). Null if unique to this platform."),
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

