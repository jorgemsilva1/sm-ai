# Strategy-to-Posts Pipeline Overhaul — Implementation Plan

## Overview

The current flow from strategy creation to post generation has several gaps that reduce the platform's effectiveness for agency use. Posts don't respect cadence settings, the retry mechanism is blind (no user feedback), the AI ignores important strategy context (like SaaS launches), competitor insights are dropped during retries, and there's no cross-platform content awareness. This plan addresses all of these to make the platform commercially viable.

## Current State Analysis

### How It Works Today
1. User creates editorial profile (client info, tone, brand values)
2. User adds references (grouped items with titles/descriptions)
3. User adds competitors (with optional AI profiling via web crawling)
4. User creates personas (target audience profiles)
5. User creates strategy (4-step wizard: objectives/audience → positioning/pillars → formats/channels/cadence → KPIs/guardrails)
6. User generates schedule (picks strategy → date range → AI generates posts)
7. User reviews posts (accept/retry each one)

### Key Discoveries
- **No cadence enforcement**: `schedule-generator.ts:279` JSON schema has `minItems: 1` with no max. The AI decides post count from the `cadence` field buried in a JSON dump — often wrong
- **Blind retry**: `retryScheduleItem` at `actions.ts:1596` only passes `previousTitle`/`previousCaption`. No user feedback, no format change allowed
- **Competitor insights dropped on retry**: `actions.ts:1664` calls `buildStrategyForAI()` without the `competitorInsights` 4th arg, while `generateScheduleDraft` at `actions.ts:1464` passes it
- **Reference examples dropped on retry**: `retryScheduleItem` never fetches `reference_examples`
- **Dead campaign_objectives field**: `client-strategy.tsx:611-629` renders it but `getStrategyPayload` never reads it
- **No cross-platform linking**: Each post is fully independent — same content on IG and TikTok creates 2 unrelated items
- **Strategy context underweighted in prompts**: `ai_notes` and specific campaign context get serialized as JSON fields but aren't prominently surfaced in the prompt
- **Platform extraction via regex is fragile and duplicated in 3 places**

## Desired End State

After this plan is complete:
1. **Smart cadence**: If user sets "3x/week" and has 2 platforms, AI generates ~3 content pieces per platform per week, with cross-platform content sharing where it makes sense
2. **Guided retry**: When retrying a post, user can change the format (reel → carousel, etc.) AND provide free-text instructions ("make it about our product launch", "more casual tone")
3. **Strategy actually drives content**: A strategy mentioning "SaaS launch" produces posts about the SaaS launch. AI notes and campaign objectives are given prominence
4. **Consistent context**: Retry uses the same rich context as initial generation (competitor insights, reference examples, trending topics, optimal slots)
5. **Better competitor analysis**: Crawl produces higher quality insights; AI profiles are more actionable
6. **Cross-platform awareness**: Posts that work on multiple platforms are linked and counted smartly against cadence

### Verification
- Generate a schedule for a client with "3x/week" cadence and 2 platforms → get ~6 posts (3 per platform), some shared across platforms
- Set a strategy with `ai_notes: "We're launching a SaaS product called X on April 15th"` → posts reference the launch
- Retry a post with feedback "make this a carousel about our pricing" → get a carousel about pricing
- Retry uses competitor insights → rationale references competitor differentiation

## What We're NOT Doing

- Changing the database schema for `client_strategies` (fields are sufficient, the problem is prompt engineering)
- Building a full content approval workflow (accept/reject is enough for now)
- Adding new social platforms
- Auto-publishing to social platforms
- Rewriting the calendar UI

## Implementation Approach

The plan is split into 5 phases, ordered by impact and dependency. Phases 1-2 are bug fixes + critical improvements. Phases 3-5 are feature additions.

---

## Phase 1: Fix Data Context Bugs (Parity Between Generate and Retry)

### Overview
Ensure retry and single-item regeneration use the same rich context as bulk generation. This is purely backend — no UI changes.

### Changes Required

#### 1. Fix `retryScheduleItem` missing competitor insights
**File**: `src/app/(app)/dashboard/clients/actions.ts` (lines 1596–1725)

**Changes**:
- Fetch competitors WITH `ai_profile` column (currently line 1640 doesn't select it)
- Call `extractCompetitorInsights()` and pass result to `buildStrategyForAI()` as 4th argument
- Fetch reference examples (same query as `generateScheduleDraft` lines 1405-1422)
- Fetch optimal posting slots and trending topics
- Pass all of this to the regeneration function

```typescript
// In retryScheduleItem, after fetching competitorDetails:
const competitorInsights = competitorDetails.length > 0
  ? extractCompetitorInsights(competitorDetails.map((c) => ({
      name: c.name,
      ai_profile: (c as any).ai_profile,
    })))
  : null;

// Fetch reference examples
const referenceGroupIds = strategy.reference_group_ids;
const referenceExamples = referenceGroupIds?.length
  ? (await supabase
      .from("client_reference_items")
      .select("title, description, client_reference_groups(name)")
      .eq("client_id", clientId)
      .in("group_id", referenceGroupIds)
      .order("created_at", { ascending: false })
      .limit(15)
    ).data?.map((item: any) => ({
      title: item.title || "",
      description: item.description,
      group_name: item.client_reference_groups?.name || "",
    })) ?? []
  : [];

const strategyForAI = {
  ...buildStrategyForAI(strategy, competitorDetails, referenceFolders, competitorInsights),
  client: brandContext.client ?? undefined,
  editorial_profile: brandContext.editorial_profile ?? undefined,
  business_tags: brandContext.business_tags,
  reference_examples: referenceExamples.length > 0 ? referenceExamples : undefined,
};
```

Also update the competitor SELECT to include `ai_profile`:
```typescript
// Change line 1640 from:
.select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
// To:
.select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x, ai_profile")
```

#### 2. Fix `previewRegenerateScheduleItemText` same issue
**File**: `src/app/(app)/dashboard/clients/actions.ts` (line ~2503)

Apply the same fix: fetch `ai_profile`, extract competitor insights, fetch reference examples, pass to `buildStrategyForAI`.

#### 3. Fix dead `campaign_objectives` field
**File**: `src/app/(app)/dashboard/clients/actions.ts` — `getStrategyPayload` function

**Changes**: Read `campaign_objectives` from FormData and store it in `ai_notes` (appended, since there's no dedicated column and adding one is out of scope):

```typescript
// In getStrategyPayload, after reading ai_notes:
const campaignObjectives = String(formData.get("campaign_objectives") || "").trim();
const aiNotes = String(formData.get("ai_notes") || "").trim();
const combinedAiNotes = [aiNotes, campaignObjectives ? `Campaign objectives: ${campaignObjectives}` : ""]
  .filter(Boolean)
  .join("\n");
```

#### 4. Deduplicate platform/format extraction
**File**: Create `src/lib/utils/platform-extraction.ts`

**Changes**: Extract the regex logic duplicated in `calendar/page.tsx:59-83`, `schedule-create-item-modal.tsx:18-42`, and `actions.ts` into a single shared utility:

```typescript
export function extractAllowedPlatforms(channels: string | null): string[] { ... }
export function extractAllowedFormats(formats: string | null): string[] { ... }
```

Then import from all three locations.

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Retry a post → check that the retried post's rationale mentions competitor insights (if competitors exist)
- [ ] Create a strategy with campaign_objectives filled → verify it appears in the generated posts' context
- [ ] Verify platform extraction still works correctly after deduplication

---

## Phase 2: Guided Retry with Feedback

### Overview
Transform the blind retry into a guided experience where the user can change the format and provide text instructions about what they want different.

### Changes Required

#### 1. Add `userFeedback` and `newFormat` to retry function signature
**File**: `src/lib/ai/schedule-generator.ts` — `regenerateScheduleItemWithOpenAI`

**Changes**: Extend `RetryItemInput` type and update the prompt:

```typescript
type RetryItemInput = {
  // ... existing fields ...
  userFeedback?: string | null;  // NEW: free text from user
  newFormat?: string | null;      // NEW: if user wants a different format
};
```

Update the prompt to incorporate feedback:

```typescript
// PT version:
const user = input.locale === "pt"
  ? `Reescreve UM item de calendarização para ser uma alternativa melhor.

Regras:
- O output tem de seguir exatamente o schema JSON.
- Mantém "scheduled_at" exatamente igual: ${input.scheduledAt}
- Mantém "platform" exatamente igual: ${input.platform}
- Usa "format": ${input.newFormat || input.format}
- Deve ser significativamente diferente (ângulo, hook, estrutura), mas coerente com a estratégia.
${input.userFeedback ? `
INSTRUÇÃO DO UTILIZADOR (PRIORIDADE MÁXIMA):
${input.userFeedback}
Segue estas instruções como prioridade. O utilizador quer algo específico — entrega exatamente o que pede.
` : ""}
${input.strategy.competitor_insights ? `
Insights dos competidores:
  Temas: ${input.strategy.competitor_insights.insights.contentThemes?.slice(0, 5).join(", ") || "N/A"}
  Oportunidades: ${input.strategy.competitor_insights.insights.whitespaceOpportunities?.slice(0, 3).join(", ") || "N/A"}
  IMPORTANTE: Diferencia-te dos competidores.
` : ""}

Estratégia: ${JSON.stringify(input.strategy)}
Persona: ${JSON.stringify(input.persona ?? null)}

Item anterior:
Título: ${input.previousTitle}
Caption: ${input.previousCaption}`
  : // ... EN version with same structure
```

Also update the JSON schema `format` enum to use `[input.newFormat || input.format]` instead of `[input.format]`.

#### 2. Update `retryScheduleItem` server action
**File**: `src/app/(app)/dashboard/clients/actions.ts`

**Changes**: Accept `userFeedback` and `newFormat` parameters:

```typescript
export async function retryScheduleItem(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  options?: { userFeedback?: string; newFormat?: string }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  // ... existing context assembly ...

  const next = await regenerateScheduleItemWithOpenAI({
    locale: aiLocale,
    timezone: ...,
    strategy: strategyForAI,
    persona: persona ?? undefined,
    scheduledAt: item.scheduled_at,
    platform: normalizePlatform(item.platform) ?? "instagram",
    format: normalizeFormat(options?.newFormat || item.format) ?? "post",
    previousTitle: item.title,
    previousCaption: item.caption,
    userFeedback: options?.userFeedback || null,
    newFormat: options?.newFormat || null,
  });

  // Also update the format in the DB if it changed:
  const updatePayload: Record<string, unknown> = {
    title: next.title,
    caption: next.caption,
    assets: next.assets,
    rationale: next.rationale,
    status: "suggested",
    retry_count: (item.retry_count ?? 0) + 1,
  };
  if (options?.newFormat) {
    updatePayload.format = normalizeFormat(options.newFormat);
  }
  // ... rest of update ...
}
```

#### 3. Add retry feedback UI to `ScheduleGeneratorModal`
**File**: `src/components/clients/client-schedule-modal.tsx`

**Changes**: Replace the simple retry button with a feedback popover:

When user clicks "Retry" on a post card (line ~503-511), instead of immediately calling `retryPost(post.id)`:
- Show inline feedback UI below the post card with:
  - A format selector (dropdown with the strategy's allowed formats)
  - A textarea for free-text instructions (placeholder: "What would you like different? e.g., more focused on our product launch, try a different angle...")
  - "Regenerate" and "Cancel" buttons
- On "Regenerate", call `retryPost(post.id, { userFeedback, newFormat })`

```tsx
// New state per post:
const [retryFeedback, setRetryFeedback] = useState<Record<string, { open: boolean; text: string; format: string }>>({});

// In the post card, replace the retry Button with:
{retryFeedback[post.id]?.open ? (
  <div className="mt-3 space-y-3 rounded-md border border-border/40 bg-background/60 p-3">
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {locale === "pt" ? "Formato" : "Format"}
      </div>
      <Select
        value={retryFeedback[post.id]?.format || post.format}
        onValueChange={(v) => setRetryFeedback(prev => ({
          ...prev,
          [post.id]: { ...prev[post.id], format: v }
        }))}
      >
        {/* allowedFormats options */}
      </Select>
    </div>
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">
        {locale === "pt" ? "O que queres diferente?" : "What would you like different?"}
      </div>
      <Textarea
        rows={2}
        value={retryFeedback[post.id]?.text || ""}
        onChange={(e) => setRetryFeedback(prev => ({
          ...prev,
          [post.id]: { ...prev[post.id], text: e.target.value }
        }))}
        placeholder={locale === "pt"
          ? "Ex: Foca mais no lançamento do produto, tenta um ângulo mais casual..."
          : "E.g., Focus more on the product launch, try a more casual angle..."}
      />
    </div>
    <div className="flex items-center gap-2">
      <Button size="sm" variant="brand"
        onClick={() => retryPost(post.id, {
          userFeedback: retryFeedback[post.id]?.text,
          newFormat: retryFeedback[post.id]?.format !== post.format ? retryFeedback[post.id]?.format : undefined,
        })}
      >
        {locale === "pt" ? "Regenerar" : "Regenerate"}
      </Button>
      <Button size="sm" variant="outline"
        onClick={() => setRetryFeedback(prev => ({ ...prev, [post.id]: { ...prev[post.id], open: false } }))}
      >
        {locale === "pt" ? "Cancelar" : "Cancel"}
      </Button>
    </div>
  </div>
) : (
  <Button size="sm" variant="outline"
    onClick={() => setRetryFeedback(prev => ({
      ...prev,
      [post.id]: { open: true, text: "", format: post.format }
    }))}
  >
    {labels.retry}
  </Button>
)}
```

#### 4. Add retry feedback to `SchedulePostEditorModal`
**File**: `src/components/clients/schedule-post-editor-modal.tsx`

**Changes**: In the Text tab where "Regenerate with AI" button exists (~line 841), add a similar feedback textarea + format selector before the regenerate action. The existing `onPreviewRegenerateText` callback should also accept and pass through feedback.

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] In schedule review: click Retry on a post → feedback UI appears with format dropdown + textarea
- [ ] Enter "make this about our product launch" → regenerated post is about the product launch
- [ ] Change format from "post" to "carousel" → regenerated post is a carousel
- [ ] Empty feedback + same format → regenerated post is different (existing behavior preserved)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding.

---

## Phase 3: Smart Cadence Enforcement & Cross-Platform Awareness

### Overview
Make the AI respect the strategy's cadence setting by explicitly calculating expected post counts and adding cross-platform content linking.

### Changes Required

#### 1. Calculate expected post count before calling AI
**File**: `src/app/(app)/dashboard/clients/actions.ts` — inside `generateScheduleDraft`

**Changes**: Parse the cadence and calculate the expected number of posts per platform:

```typescript
// After extracting allowedPlatforms, before calling generateScheduleWithOpenAI:
function parseCadencePerWeek(cadence: string | null): number {
  if (!cadence) return 3; // sensible default
  const raw = cadence.toLowerCase().trim();

  // Match patterns like "3x/week", "3x/semana", "3 per week", "daily", etc.
  const match = raw.match(/(\d+)\s*x?\s*[\/per]*\s*(week|semana|sem)/i);
  if (match) return parseInt(match[1], 10);

  if (/daily|diário|diaria/.test(raw)) return 7;
  if (/2x.*day|2x.*dia/.test(raw)) return 14;
  if (/5x/.test(raw)) return 5;
  if (/4x/.test(raw)) return 4;
  if (/3x/.test(raw)) return 3;
  if (/2x/.test(raw)) return 2;
  if (/1x|once|uma vez/.test(raw)) return 1;

  return 3; // fallback
}

const postsPerWeek = parseCadencePerWeek(strategy.cadence);
const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
const weeksSpan = Math.max(1, daysDiff / 7);
const totalPostsPerPlatform = Math.max(1, Math.round(postsPerWeek * weeksSpan));
const totalPosts = totalPostsPerPlatform * allowedPlatforms.length;
```

#### 2. Pass count guidance to the AI prompt
**File**: `src/lib/ai/schedule-generator.ts` — `GenerateScheduleInput` type and prompt

**Changes**: Add `expectedPostCount` and `postsPerPlatform` to `GenerateScheduleInput`:

```typescript
type GenerateScheduleInput = {
  // ... existing fields ...
  expectedPostCount?: number;      // NEW: total posts to generate
  postsPerPlatform?: number;       // NEW: posts per platform
  crossPlatformEnabled?: boolean;  // NEW: allow same content on multiple platforms
};
```

Add explicit count instructions to ALL prompt variants (brand, content_creator, and fallback):

```
CADENCE RULES (FOLLOW STRICTLY):
- Generate EXACTLY ${input.expectedPostCount} items total.
- That means ${input.postsPerPlatform} items PER platform across these platforms: ${allowedPlatforms.join(", ")}.
- The cadence from the strategy is: "${input.strategy.cadence}".
- If a content piece works naturally on 2+ platforms (e.g., a Reel that works on Instagram AND TikTok), generate it for BOTH platforms with adapted captions/hashtags. This counts as 1 post for each platform's quota.
- When cross-posting, add a rationale point with strategyReference.field = "channels" explaining why this content works on both platforms.
- Distribute posts evenly across the date range. Don't cluster them all on one day.
```

#### 3. Add cross-platform linking field to the JSON schema
**File**: `src/lib/ai/schedule-generator.ts` — the JSON schema in `generateScheduleWithOpenAI`

**Changes**: Add an optional `content_group_id` field so the AI can indicate which posts share the same content:

```typescript
// Add to the item schema properties:
content_group: {
  type: ["string", "null"],
  description: "If this content is cross-posted to another platform, use the same group ID (e.g. 'group-1'). Null if unique to this platform."
},
```

Also add to the `required` array. Update the Zod schema in `schedule-schema.ts` accordingly:

```typescript
export const ScheduleProposedItemSchema = z.object({
  // ... existing ...
  content_group: z.string().nullable().optional(),
});
```

#### 4. Store and display cross-platform groups
**File**: `src/app/(app)/dashboard/clients/actions.ts` — `generateScheduleDraft`

**Changes**: When persisting items, store `content_group` in a metadata field (the `assets` JSONB could hold it, but cleaner to add it to the item row). Since we want to avoid schema changes, store it as part of the `rationale` or as a top-level field in the JSONB.

Actually, the simplest approach: store `content_group` as a new column. Add migration:

```sql
-- supabase/scripts/31_schedule_items_content_group.sql
ALTER TABLE public.client_schedule_items
  ADD COLUMN IF NOT EXISTS content_group text;
```

In the review UI (`client-schedule-modal.tsx`), group posts with the same `content_group` visually:

```tsx
// Group posts by content_group for display
const groupedPosts = useMemo(() => {
  const groups = new Map<string, SuggestedPost[]>();
  const standalone: SuggestedPost[] = [];
  for (const post of posts) {
    if (post.contentGroup) {
      const existing = groups.get(post.contentGroup) || [];
      existing.push(post);
      groups.set(post.contentGroup, existing);
    } else {
      standalone.push(post);
    }
  }
  return { groups: Array.from(groups.entries()), standalone };
}, [posts]);
```

Display grouped posts with a visual indicator like "Same content on Instagram, TikTok" badge.

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Migration applies: run the SQL script

#### Manual Verification
- [ ] Strategy with "3x/week", 2 platforms, 1-week range → generates ~6 posts (3 per platform)
- [ ] Some posts are cross-posted (same content_group) with platform-adapted captions
- [ ] Posts are evenly distributed across the week (not clustered)
- [ ] Cross-posted items show a visual indicator in the review UI

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 4: Better AI Prompt Engineering (Strategy Context Effectiveness)

### Overview
Restructure the prompts so that strategy context (especially ai_notes, objectives, positioning, and key_messages) actually drives content generation rather than being buried in a JSON dump.

### Changes Required

#### 1. Restructure the prompt architecture
**File**: `src/lib/ai/schedule-generator.ts` and `src/lib/ai/prompts/brand.ts` and `src/lib/ai/prompts/content-creator.ts`

The core problem: the strategy is passed as `JSON.stringify(input.strategy)` — a giant blob. The AI treats all fields equally. Instead, structure the prompt with explicit sections and priority ordering:

```
=== CRITICAL: CLIENT BRIEF ===
Client: {name}
What they do: {description}
Website: {website}

=== STRATEGY DIRECTIVES (MUST FOLLOW) ===
Positioning: {positioning}
Key Messages: {key_messages}
AI Notes / Campaign Brief: {ai_notes}   ← THIS IS THE MOST IMPORTANT FIELD

=== CONTENT FRAMEWORK ===
Objectives: {objectives}
Content Pillars: {content_pillars}
Target Audience: {audience}

=== EDITORIAL PROFILE ===
Tone: {tone}
Brand Values: {brand_values}
Goals: {goals}

=== CONSTRAINTS ===
Guardrails: {guardrails}
Cadence: {cadence}
Platforms: {channels}
Formats: {formats}

=== CONTEXT (USE AS INSPIRATION) ===
Persona: {persona details}
Competitor Insights: {competitor insights}
Reference Examples: {reference examples}
Trending Topics: {trending topics}
Recent Plannings: {recent plannings}
Holidays: {holidays}
```

The key change: `ai_notes` gets prominent placement with explicit instruction:

```
AI Notes / Campaign Brief: ${input.strategy.ai_notes || "None"}
^^^ THE ABOVE IS THE MOST IMPORTANT DIRECTIVE. If the user mentions a specific campaign,
product launch, event, or topic — EVERY post should be directly related to or supportive of it.
If ai_notes says "SaaS launch for product X on April 15", then posts should be about:
- Pre-launch teasers
- Launch day announcements
- Feature highlights
- Social proof / testimonials
- Post-launch follow-ups
Do NOT generate generic content that ignores the ai_notes.
```

#### 2. Extract strategy fields individually in the prompt
**File**: `src/lib/ai/prompts/brand.ts` and `content-creator.ts`

**Changes**: Instead of `Strategy: ${JSON.stringify(input.strategy)}`, destructure and place each field in its appropriate section:

```typescript
export function getBrandPrompt(input: GenerateScheduleInput): string {
  const s = input.strategy;
  const ep = s.editorial_profile;
  const c = s.client;

  return input.locale === "pt"
    ? `Gera uma proposta de calendarização para uma MARCA/AGÊNCIA.

=== BRIEFING DO CLIENTE (OBRIGATÓRIO) ===
Nome: ${c?.name || "N/A"}
Website: ${c?.website || "N/A"}
O que faz: ${c?.description || "N/A"}
Notas: ${c?.notes || "N/A"}

=== DIRECTIVAS DA ESTRATÉGIA (SEGUIR RIGOROSAMENTE) ===
Posicionamento: ${s.positioning || "N/A"}
Mensagens-chave: ${s.key_messages || "N/A"}
Notas para IA / Brief de campanha: ${s.ai_notes || "Nenhuma"}
^^^ SE EXISTEM NOTAS ACIMA, CADA POST DEVE ESTAR RELACIONADO COM ELAS. NÃO IGNORES.

=== FRAMEWORK DE CONTEÚDO ===
Objetivos: ${s.objectives || "N/A"}
Pilares de conteúdo: ${s.content_pillars || "N/A"}
Audiência: ${s.audience || "N/A"}

=== PERFIL EDITORIAL ===
Tom: ${ep?.tone || "N/A"}
Valores da marca: ${ep?.brand_values || "N/A"}
Objetivos: ${ep?.goals || "N/A"}
Referências: ${ep?.references_text || "N/A"}

=== RESTRIÇÕES ===
Guardrails: ${s.guardrails || "N/A"}

... rest of rules ...`
    : // EN version
}
```

#### 3. Add "strategy alignment score" to the JSON schema
**File**: `src/lib/ai/schedule-generator.ts`

**Changes**: Add a field to each item that forces the AI to explicitly state how the post relates to the strategy's ai_notes:

```typescript
// Add to item schema properties:
strategy_alignment: {
  type: "string",
  description: "One sentence explaining how this post directly serves the strategy's ai_notes/campaign brief. If no campaign brief exists, explain which objective it serves."
},
```

This forces the model to connect every post to the campaign brief, making it harder to generate generic content.

#### 4. Update the fallback prompt (non-brand, non-creator)
**File**: `src/lib/ai/schedule-generator.ts` — the inline prompt at lines 175-264

**Changes**: Apply the same restructuring as brand/creator prompts. This ensures clients without a `client_type` set still get the improved prompt.

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Create strategy with ai_notes: "Launching SaaS product called BrandFlow on April 20th" → generate schedule → ALL posts reference BrandFlow or the launch
- [ ] Strategy with detailed positioning → posts reflect that positioning, not generic social media advice
- [ ] Posts include `strategy_alignment` field showing the connection to the campaign brief

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Phase 5: Competitor Analysis Improvements

### Overview
Improve the quality of competitor AI analysis by enhancing crawl quality, prompt precision, and how insights feed downstream.

### Changes Required

#### 1. Increase crawl text limits
**File**: `src/lib/crawler/web-crawler.ts`

**Changes**: The current limits are conservative. Increase for better analysis:

```typescript
// In crawlUrl defaults:
maxBytes: 2_000_000,    // was 1.5MB
maxTextChars: 20_000,   // was 12K — more text = better analysis
```

In `analyzeCompetitorWithAI` (`actions.ts:1102`), increase the page text limit:
```typescript
// Change from:
maxTextChars: 12_000,
// To:
maxTextChars: 20_000,
```

In `competitor-profiler.ts`, increase the per-page slice:
```typescript
// Change from:
const text = p.text.slice(0, 6000);
// To:
const text = p.text.slice(0, 10000);
```

#### 2. Improve competitor profiler prompt
**File**: `src/lib/ai/competitor-profiler.ts`

**Changes**: Add more specific instructions about what makes a useful competitive analysis:

```
EXTRA RULES FOR QUALITY:
- For "content_strategy", focus on what ACTUALLY works for them (evidence from their posts/pages), not generic advice
- For "channels", include specific examples of their best content if visible on their pages
- For "strategy_implications.whitespace", identify SPECIFIC gaps where our client can differentiate — not vague suggestions
- For "strategy_implications.counter_angles", propose actual content angles that directly counter this competitor's positioning
- If the crawled pages have limited content, say so. Do NOT fabricate detailed insights from thin data.
```

#### 3. Improve insights extraction for schedule generation
**File**: `src/lib/ai/competitor-insights.ts`

**Changes**: The current extraction is flat string arrays. Add a `competitorSummaryForPrompt` function that creates a more narrative, actionable summary:

```typescript
export function formatCompetitorInsightsForPrompt(
  insights: CompetitorInsights,
  locale: "pt" | "en"
): string {
  if (!insights) return "";

  const sections: string[] = [];

  if (insights.insights.whitespaceOpportunities.length > 0) {
    sections.push(locale === "pt"
      ? `OPORTUNIDADES NÃO EXPLORADAS (prioriza estas no conteúdo):
${insights.insights.whitespaceOpportunities.slice(0, 5).map((o, i) => `  ${i+1}. ${o}`).join("\n")}`
      : `UNEXPLOITED OPPORTUNITIES (prioritize these in content):
${insights.insights.whitespaceOpportunities.slice(0, 5).map((o, i) => `  ${i+1}. ${o}`).join("\n")}`
    );
  }

  if (insights.insights.counterAngles.length > 0) {
    sections.push(locale === "pt"
      ? `ÂNGULOS DE DIFERENCIAÇÃO (usa pelo menos 1 destes):
${insights.insights.counterAngles.slice(0, 5).map((a, i) => `  ${i+1}. ${a}`).join("\n")}`
      : `DIFFERENTIATION ANGLES (use at least 1 of these):
${insights.insights.counterAngles.slice(0, 5).map((a, i) => `  ${i+1}. ${a}`).join("\n")}`
    );
  }

  // ... similar for other insight types ...

  return sections.join("\n\n");
}
```

Use this in the prompt instead of the current inline interpolation that lists raw arrays.

#### 4. Show competitor insights summary in the schedule review UI
**File**: `src/components/clients/client-schedule-modal.tsx`

**Changes**: After generating posts, show a collapsible "Competitor Intelligence Used" summary in the review step so the user can see what differentiation was considered:

```tsx
{step === "review" && competitorInsightsSummary ? (
  <details className="rounded-md border border-border/40 bg-card/40 p-3">
    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
      {locale === "pt" ? "Inteligência competitiva utilizada" : "Competitor intelligence used"}
    </summary>
    <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
      {competitorInsightsSummary}
    </div>
  </details>
) : null}
```

### Success Criteria

#### Automated Verification
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

#### Manual Verification
- [ ] Run competitor analysis → profile has specific, actionable insights (not generic marketing advice)
- [ ] Generate schedule with competitors linked → posts show differentiation from competitors
- [ ] Competitor insights summary visible in schedule review UI
- [ ] Retried posts also show competitor-informed differentiation (from Phase 1 fix)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation.

---

## Testing Strategy

### Manual Testing Steps
1. **Full pipeline test**: Create a new client → add editorial profile → add 1 competitor with AI analysis → add 1 persona → create strategy with "SaaS launch for ProductX" in ai_notes and "3x/week" cadence with Instagram + TikTok → generate schedule for 1 week → verify 6 posts (3 per platform), all about ProductX launch, some cross-posted
2. **Retry test**: On a generated post, click retry → enter "make this a carousel about pricing" → verify carousel format + pricing content
3. **Empty feedback retry test**: Retry without any feedback → verify post changes but stays on-strategy
4. **Competitor differentiation test**: With competitor insights active, verify at least 1 post per schedule has a rationale referencing competitive whitespace

### Edge Cases
- Strategy with no channels defined → should show clear error (existing behavior)
- Strategy with 1 platform only → cadence applies to that single platform
- Retry with format change on a platform that doesn't support it (e.g., "thread" on Instagram) → should gracefully fall back or show an error
- Very short date range (1 day) with "3x/week" → should generate ~1 post, not 3

## Performance Considerations

- Increased crawl text limits (Phase 5) will increase OpenAI token usage per competitor analysis. Monitor costs.
- The restructured prompts (Phase 4) may be slightly longer but should produce better first-try results, reducing retries.
- Cross-platform grouping (Phase 3) adds minimal overhead — it's just a text field on existing rows.

## Migration Notes

One new migration needed:
- `supabase/scripts/31_schedule_items_content_group.sql` — adds `content_group text` column to `client_schedule_items`

This is non-breaking. Existing items will have `content_group = NULL`.

## References

- Strategy creation flow: `src/components/clients/client-strategy.tsx`
- Schedule generation: `src/lib/ai/schedule-generator.ts`
- Server actions: `src/app/(app)/dashboard/clients/actions.ts`
- AI prompts: `src/lib/ai/prompts/brand.ts`, `src/lib/ai/prompts/content-creator.ts`
- Competitor analysis: `src/lib/ai/competitor-profiler.ts`, `src/lib/ai/competitor-insights.ts`
- Web crawler: `src/lib/crawler/web-crawler.ts`
- Schedule review UI: `src/components/clients/client-schedule-modal.tsx`
- Post editor: `src/components/clients/schedule-post-editor-modal.tsx`
