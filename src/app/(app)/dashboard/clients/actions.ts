"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Holidays from "date-holidays";
import {
  generateScheduleWithOpenAI,
  generateAssetsWithOpenAI,
  regenerateTextWithOpenAI,
  generateOneScheduleItemWithOpenAI,
  regenerateScheduleItemWithOpenAI,
} from "@/lib/ai/schedule-generator";
import { generateImageBase64 } from "@/lib/ai/image-generator";

export type ClientActionState = {
  error?: string;
  success?: string;
};

type ActionLocale = "en" | "pt";

const ACTION_COPY: Record<ActionLocale, Record<string, string>> = {
  en: {
    nameRequired: "Client name is required.",
    sessionExpired: "Session expired. Please sign in again.",
    clientUpdated: "Client information updated.",
    profileUpdated: "Editorial profile updated.",
    tagsUpdated: "Business tags updated.",
    personaNameRequired: "Persona name is required.",
    personaCreated: "Persona created.",
    personaUpdated: "Persona updated.",
    personaDeleted: "Persona deleted.",
    referenceGroupCreated: "Reference folder created.",
    referenceItemCreated: "Reference added.",
    commentRequired: "Comment is required.",
    commentAdded: "Comment added.",
    strategyTitleRequired: "Strategy title is required.",
    strategyCreated: "Strategy created.",
    strategyUpdated: "Strategy updated.",
    strategyDeleted: "Strategy deleted.",
    strategyActivated: "Strategy activated.",
    competitorNameRequired: "Competitor name is required.",
    competitorCreated: "Competitor created.",
    competitorUpdated: "Competitor updated.",
    competitorDeleted: "Competitor deleted.",
    scheduleDraftCreated: "Schedule draft created.",
    scheduleItemAccepted: "Post accepted.",
    scheduleItemRetried: "New variation generated.",
  },
  pt: {
    nameRequired: "O nome do cliente é obrigatório.",
    sessionExpired: "Sessão expirada. Faz login novamente.",
    clientUpdated: "Informação do cliente atualizada.",
    profileUpdated: "Perfil editorial atualizado.",
    tagsUpdated: "Tags de negócio atualizadas.",
    personaNameRequired: "O nome da persona é obrigatório.",
    personaCreated: "Persona criada.",
    personaUpdated: "Persona atualizada.",
    personaDeleted: "Persona eliminada.",
    referenceGroupCreated: "Pasta criada.",
    referenceItemCreated: "Referência adicionada.",
    commentRequired: "O comentário é obrigatório.",
    commentAdded: "Comentário adicionado.",
    strategyTitleRequired: "O título da estratégia é obrigatório.",
    strategyCreated: "Estratégia criada.",
    strategyUpdated: "Estratégia atualizada.",
    strategyDeleted: "Estratégia eliminada.",
    strategyActivated: "Estratégia ativada.",
    competitorNameRequired: "O nome do competidor é obrigatório.",
    competitorCreated: "Competidor criado.",
    competitorUpdated: "Competidor atualizado.",
    competitorDeleted: "Competidor eliminado.",
    scheduleDraftCreated: "Rascunho de calendarização criado.",
    scheduleItemAccepted: "Post aceite.",
    scheduleItemRetried: "Nova variação gerada.",
  },
};

function getActionLocale(formData: FormData): ActionLocale {
  const locale = String(formData.get("locale") || "").toLowerCase();
  return locale === "pt" ? "pt" : "en";
}

type ScheduleItemRow = {
  id: string;
  draft_id: string;
  scheduled_at: string;
  platform: string;
  format: string;
  title: string;
  caption: string;
  assets: unknown;
  rationale: unknown;
  status: string;
  retry_count: number;
};

export type ScheduleDraftActionState = ClientActionState & {
  draftId?: string;
  items?: ScheduleItemRow[];
};

type ScheduleItemStatus = "suggested" | "accepted";

function asDateOnly(value: string) {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function dateOnlyFromISO(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type StrategyRowForAI = {
  id: string;
  title: string;
  status: string | null;
  objectives: string | null;
  audience: string | null;
  positioning: string | null;
  key_messages: string | null;
  content_pillars: string | null;
  formats: string | null;
  channels: string | null;
  cadence: string | null;
  kpis: string | null;
  guardrails: string | null;
  ai_notes: string | null;
  competitor_ids: string[] | null;
  reference_group_ids: string[] | null;
  persona_id: string | null;
  use_celebration_dates: boolean | null;
};

type CompetitorRowForAI = {
  id: string;
  name: string;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  x: string | null;
};

type ReferenceGroupRowForAI = {
  id: string;
  name: string;
  description: string | null;
};

type ClientRowForAI = {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  notes: string | null;
  focus_area: string | null;
  country_code: string | null;
  timezone?: string | null;
  default_locale?: string | null;
};

type PersonaRowForAI = {
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

type ClientProfileRowForAI = {
  audience: string | null;
  tone: string | null;
  references_text: string | null;
  goals: string | null;
  brand_values: string | null;
};

type ClientBusinessTagRowForAI = {
  business_tags: { slug: string } | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ScheduleRecentRowForAI = {
  scheduled_at: string;
  platform: string;
  format: string;
  title: string;
  status: string;
};

function extractAllowedPlatformsFromChannels(channels: string | null) {
  const text = (channels || "").toLowerCase();
  const out = new Set<
    "instagram" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube" | "blog"
  >();

  const add = (p: "instagram" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube" | "blog") =>
    out.add(p);

  if (/\b(instagram|ig)\b/.test(text)) add("instagram");
  if (/\b(tiktok|tik\s*tok)\b/.test(text)) add("tiktok");
  if (/\bfacebook|fb\b/.test(text)) add("facebook");
  if (/\blinkedin\b/.test(text)) add("linkedin");
  if (/\b(youtube|yt)\b/.test(text)) add("youtube");
  if (/\bblog\b/.test(text)) add("blog");
  // "x" é ambíguo; tentamos apanhar "twitter" ou " x " como canal
  if (/\b(twitter|x)\b/.test(text)) add("x");

  return Array.from(out);
}

function extractAllowedFormatsFromFormats(formats: string | null) {
  const text = (formats || "").toLowerCase();
  const out = new Set<
    "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread"
  >();

  const add = (f: "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread") =>
    out.add(f);

  if (/\b(reel|reels)\b/.test(text)) add("reel");
  if (/\b(story|stories)\b/.test(text)) add("story");
  if (/\b(carousel|carrossel)\b/.test(text)) add("carousel");
  if (/\b(thread|fio)\b/.test(text)) add("thread");
  if (/\b(short|shorts)\b/.test(text)) add("short");
  if (/\b(video|vídeo)\b/.test(text)) add("video");
  if (/\b(post|publicaç)\b/.test(text)) add("post");

  return Array.from(out);
}

async function fetchRecentPlanningsForAI(
  supabase: SupabaseServerClient,
  clientId: string,
  days: number,
  limit: number,
) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("client_schedule_items")
    .select("scheduled_at, platform, format, title, status")
    .eq("client_id", clientId)
    .gte("scheduled_at", since)
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as ScheduleRecentRowForAI[];
}

function normalizePlatform(value: string) {
  const v = String(value || "").toLowerCase();
  if (v === "instagram" || v === "tiktok" || v === "facebook" || v === "linkedin" || v === "x" || v === "youtube" || v === "blog") {
    return v;
  }
  return null;
}

function normalizeFormat(value: string) {
  const v = String(value || "").toLowerCase();
  if (v === "post" || v === "reel" || v === "story" || v === "carousel" || v === "short" || v === "video" || v === "thread") {
    return v;
  }
  return null;
}

function buildStrategyForAI(
  strategy: StrategyRowForAI,
  competitors: CompetitorRowForAI[],
  referenceFolders: ReferenceGroupRowForAI[],
) {
  const competitorNames = competitors.map((c) => c.name).filter(Boolean);

  return {
    id: String(strategy.id),
    title: String(strategy.title),
    status: strategy.status,
    objectives: strategy.objectives,
    audience: strategy.audience,
    positioning: strategy.positioning,
    key_messages: strategy.key_messages,
    content_pillars: strategy.content_pillars,
    formats: strategy.formats,
    channels: strategy.channels,
    cadence: strategy.cadence,
    kpis: strategy.kpis,
    guardrails: strategy.guardrails,
    ai_notes: strategy.ai_notes,
    competitors,
    reference_folders: referenceFolders.map((g) => ({
      name: g.name,
      description: g.description,
    })),
    competitor_names: competitorNames,
  };
}

async function fetchClientContextForAI(supabase: SupabaseServerClient, clientId: string) {
  const withNewCols = await supabase
    .from("clients")
    .select("id, name, website, description, notes, focus_area, country_code, timezone, default_locale")
    .eq("id", clientId)
    .single();

  const fallback = await supabase
    .from("clients")
    .select("id, name, website, description, notes, focus_area, country_code")
    .eq("id", clientId)
    .single();

  const client =
    withNewCols.data ??
    (fallback.data
      ? ({
          ...(fallback.data as unknown as Omit<ClientRowForAI, "timezone" | "default_locale">),
          timezone: "Europe/Lisbon",
          default_locale: "pt",
        } as ClientRowForAI)
      : null);

  const { data: profile } = await supabase
    .from("client_profiles")
    .select("audience, tone, references_text, goals, brand_values")
    .eq("client_id", clientId)
    .maybeSingle();

  const { data: tagData } = await supabase
    .from("client_business_tags")
    .select("business_tags(slug)")
    .eq("client_id", clientId);

  const businessTags =
    (tagData as unknown as ClientBusinessTagRowForAI[] | null)
      ?.map((row) => row.business_tags?.slug)
      .filter((slug): slug is string => Boolean(slug)) ?? [];

  return {
    client: (client as unknown as ClientRowForAI | null) ?? null,
    editorial_profile: (profile as unknown as ClientProfileRowForAI | null) ?? null,
    business_tags: businessTags,
  };
}

function getHolidaysInRange(
  countryCode: string,
  startDate: string,
  endDate: string,
  includeCelebrations: boolean,
) {
  try {
    const hd = new Holidays(String(countryCode || "PT").toUpperCase());
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);
    const years = Array.from(
      new Set([start.getUTCFullYear(), end.getUTCFullYear()]),
    );
    const out: Array<{ date: string; name: string; type: string }> = [];
    for (const y of years) {
      const list = hd.getHolidays(y) ?? [];
      for (const h of list) {
        const d = new Date(h.date);
        const type = String(h.type || "");
        const isCelebration = type === "observance" || type === "optional";
        if (isCelebration && !includeCelebrations) continue;
        if (d >= start && d <= end) {
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd = String(d.getUTCDate()).padStart(2, "0");
          out.push({ date: `${yyyy}-${mm}-${dd}`, name: h.name, type });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

function getSelectedTags(formData: FormData) {
  return formData
    .getAll("business_tags")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function createClient(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const name = String(formData.get("name") || "").trim();
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const website = String(formData.get("website") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const photoUrl = String(formData.get("photo_url") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const selectedTags = getSelectedTags(formData);

  if (!name) {
    return { error: t.nameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name,
      website: website || null,
      description: description || null,
      photo_url: photoUrl || null,
      notes: notes || null,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (selectedTags.length) {
    const { data: tags, error: tagsError } = await supabase
      .from("business_tags")
      .select("id, slug")
      .in("slug", selectedTags);

    if (tagsError) {
      return { error: tagsError.message };
    }

    const tagRows =
      tags?.map((tag) => ({
        client_id: data.id,
        tag_id: tag.id,
        owner_id: user.id,
      })) ?? [];

    if (tagRows.length) {
      const { error: tagInsertError } = await supabase
        .from("client_business_tags")
        .insert(tagRows);

      if (tagInsertError) {
        return { error: tagInsertError.message };
      }
    }
  }

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${data.id}`);
}

export async function updateClientInfo(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const name = String(formData.get("name") || "").trim();
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const website = String(formData.get("website") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const photoUrl = String(formData.get("photo_url") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const countryCodeRaw = String(formData.get("country_code") || "").trim();
  const country_code = (countryCodeRaw || "PT").slice(0, 2).toUpperCase();
  const timezone = String(formData.get("timezone") || "").trim() || "Europe/Lisbon";
  const defaultLocaleRaw = String(formData.get("default_locale") || "").trim().toLowerCase();
  const default_locale = defaultLocaleRaw === "en" ? "en" : "pt";

  if (!name) {
    return { error: t.nameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      website: website || null,
      description: description || null,
      photo_url: photoUrl || null,
      notes: notes || null,
      country_code,
      timezone,
      default_locale,
    })
    .eq("id", clientId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: t.clientUpdated };
}

export async function updateClientTags(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const selectedTags = getSelectedTags(formData);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error: deleteError } = await supabase
    .from("client_business_tags")
    .delete()
    .eq("client_id", clientId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (selectedTags.length) {
    const { data: tags, error: tagsError } = await supabase
      .from("business_tags")
      .select("id, slug")
      .in("slug", selectedTags);

    if (tagsError) {
      return { error: tagsError.message };
    }

    const tagRows =
      tags?.map((tag) => ({
        client_id: clientId,
        tag_id: tag.id,
        owner_id: user.id,
      })) ?? [];

    if (tagRows.length) {
      const { error: insertError } = await supabase
        .from("client_business_tags")
        .insert(tagRows);

      if (insertError) {
        return { error: insertError.message };
      }
    }
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: t.tagsUpdated };
}

type PersonaPayload = {
  name: string;
  role_title: string | null;
  avatar_color: string | null;
  age_range: string | null;
  location: string | null;
  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  gender: string | null;
  style_preferences: string | null;
  demographics: string | null;
  goals: string | null;
  pain_points: string | null;
  motivations: string | null;
  channels: string | null;
  content_preferences: string | null;
  objections: string | null;
  notes: string | null;
};

function getListValue(formData: FormData, name: string, otherName?: string) {
  const values = formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const other = otherName ? String(formData.get(otherName) || "").trim() : "";
  if (other) {
    values.push(other);
  }
  return values.length ? values.join(", ") : null;
}

function getPersonaPayload(formData: FormData): PersonaPayload {
  const name = String(formData.get("name") || "").trim();
  return {
    name,
    role_title: String(formData.get("role_title") || "").trim() || null,
    avatar_color: String(formData.get("avatar_color") || "").trim() || null,
    age_range: String(formData.get("age_range") || "").trim() || null,
    location: String(formData.get("location") || "").trim() || null,
    location_place_id: String(formData.get("location_place_id") || "").trim() || null,
    location_lat: formData.get("location_lat")
      ? Number(formData.get("location_lat"))
      : null,
    location_lng: formData.get("location_lng")
      ? Number(formData.get("location_lng"))
      : null,
    gender: String(formData.get("gender") || "").trim() || null,
    style_preferences: getListValue(
      formData,
      "style_preferences",
      "style_preferences_other"
    ),
    demographics: String(formData.get("demographics") || "").trim() || null,
    goals: getListValue(formData, "goals", "goals_other"),
    pain_points: getListValue(formData, "pain_points", "pain_points_other"),
    motivations: getListValue(formData, "motivations", "motivations_other"),
    channels: getListValue(formData, "channels", "channels_other"),
    content_preferences: getListValue(
      formData,
      "content_preferences",
      "content_preferences_other"
    ),
    objections: getListValue(formData, "objections", "objections_other"),
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

function getStrategyPayload(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const personaId = String(formData.get("persona_id") || "").trim();
  const useCelebrations = formData.get("use_celebration_dates") === "on";
  const audienceText = String(formData.get("audience_text") || "").trim();
  const audiencePersonas = formData
    .getAll("audience_personas")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const competitorIds = formData
    .getAll("competitor_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const referenceGroupIds = formData
    .getAll("reference_group_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const audienceValue = audiencePersonas.length
    ? `Personas: ${audiencePersonas.join(", ")}${audienceText ? `. ${audienceText}` : ""}`
    : audienceText;
  const cadence = String(formData.get("cadence") || "").trim();
  const cadenceOther = String(formData.get("cadence_other") || "").trim();
  const cadenceValue = cadence || cadenceOther;
  return {
    title,
    status: String(formData.get("status") || "").trim() || null,
    objectives: getListValue(formData, "objectives", "objectives_other"),
    audience: audienceValue || null,
    persona_id: personaId || null,
    use_celebration_dates: useCelebrations,
    competitor_ids: competitorIds,
    reference_group_ids: referenceGroupIds,
    positioning: String(formData.get("positioning") || "").trim() || null,
    key_messages: String(formData.get("key_messages") || "").trim() || null,
    content_pillars: getListValue(formData, "content_pillars", "content_pillars_other"),
    formats: getListValue(formData, "formats", "formats_other"),
    channels: getListValue(formData, "channels", "channels_other"),
    cadence: cadenceValue || null,
    kpis: getListValue(formData, "kpis", "kpis_other"),
    guardrails: String(formData.get("guardrails") || "").trim() || null,
    ai_notes: String(formData.get("ai_notes") || "").trim() || null,
  };
}

export async function createPersona(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getPersonaPayload(formData);

  if (!payload.name) {
    return { error: t.personaNameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase.from("client_personas").insert({
    client_id: clientId,
    owner_id: user.id,
    ...payload,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/personas`);
  return { success: t.personaCreated };
}

export async function updatePersona(
  personaId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getPersonaPayload(formData);

  if (!payload.name) {
    return { error: t.personaNameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_personas")
    .update(payload)
    .eq("id", personaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/personas`);
  return { success: t.personaUpdated };
}

export async function deletePersona(
  personaId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_personas")
    .delete()
    .eq("id", personaId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/personas`);
  return { success: t.personaDeleted };
}

export async function createStrategy(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getStrategyPayload(formData);
  const isActive = formData.get("is_active") === "on";

  if (!payload.title) {
    return { error: t.strategyTitleRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  if (isActive) {
    await supabase
      .from("client_strategies")
      .update({ is_active: false })
      .eq("client_id", clientId);
  }

  const { error } = await supabase.from("client_strategies").insert({
    client_id: clientId,
    owner_id: user.id,
    is_active: isActive,
    ...payload,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/strategy`);
  return { success: t.strategyCreated };
}

export async function updateStrategy(
  strategyId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getStrategyPayload(formData);
  const isActive = formData.get("is_active") === "on";

  if (!payload.title) {
    return { error: t.strategyTitleRequired };
  }

  const supabase = await createSupabaseServerClient();

  if (isActive) {
    await supabase
      .from("client_strategies")
      .update({ is_active: false })
      .eq("client_id", clientId);
  }

  const { error } = await supabase
    .from("client_strategies")
    .update({ ...payload, is_active: isActive })
    .eq("id", strategyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/strategy`);
  return { success: t.strategyUpdated };
}

export async function deleteStrategy(
  strategyId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_strategies")
    .delete()
    .eq("id", strategyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/strategy`);
  return { success: t.strategyDeleted };
}

type CompetitorPayload = {
  name: string;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  x: string | null;
  notes: string | null;
  swot_strengths: string | null;
  swot_weaknesses: string | null;
  swot_opportunities: string | null;
  swot_threats: string | null;
};

function getCompetitorPayload(formData: FormData): CompetitorPayload {
  const name = String(formData.get("name") || "").trim();
  return {
    name,
    website: String(formData.get("website") || "").trim() || null,
    instagram: String(formData.get("instagram") || "").trim() || null,
    tiktok: String(formData.get("tiktok") || "").trim() || null,
    facebook: String(formData.get("facebook") || "").trim() || null,
    youtube: String(formData.get("youtube") || "").trim() || null,
    linkedin: String(formData.get("linkedin") || "").trim() || null,
    x: String(formData.get("x") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    swot_strengths: String(formData.get("swot_strengths") || "").trim() || null,
    swot_weaknesses: String(formData.get("swot_weaknesses") || "").trim() || null,
    swot_opportunities: String(formData.get("swot_opportunities") || "").trim() || null,
    swot_threats: String(formData.get("swot_threats") || "").trim() || null,
  };
}

export async function createCompetitor(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getCompetitorPayload(formData);

  if (!payload.name) {
    return { error: t.competitorNameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase.from("client_competitors").insert({
    client_id: clientId,
    owner_id: user.id,
    ...payload,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/competitors`);
  return { success: t.competitorCreated };
}

export async function updateCompetitor(
  competitorId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const payload = getCompetitorPayload(formData);

  if (!payload.name) {
    return { error: t.competitorNameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_competitors")
    .update(payload)
    .eq("id", competitorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/competitors`);
  return { success: t.competitorUpdated };
}

export async function deleteCompetitor(
  competitorId: string,
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_competitors")
    .delete()
    .eq("id", competitorId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/competitors`);
  return { success: t.competitorDeleted };
}

export async function setActiveStrategy(
  strategyId: string,
  clientId: string,
  locale: ActionLocale
): Promise<ClientActionState> {
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();

  const { error: resetError } = await supabase
    .from("client_strategies")
    .update({ is_active: false })
    .eq("client_id", clientId);

  if (resetError) {
    return { error: resetError.message };
  }

  const { error } = await supabase
    .from("client_strategies")
    .update({ is_active: true })
    .eq("id", strategyId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/strategy`);
  return { success: t.strategyActivated };
}

export async function generateScheduleDraft(
  clientId: string,
  _prevState: ScheduleDraftActionState,
  formData: FormData
): Promise<ScheduleDraftActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];

  const strategyId = String(formData.get("strategy_id") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const startDate = asDateOnly(String(formData.get("start_date") || ""));
  const endDate = asDateOnly(String(formData.get("end_date") || ""));
  const timezone = String(formData.get("timezone") || "Europe/Lisbon").trim() || "Europe/Lisbon";

  if (!strategyId) return { error: locale === "pt" ? "Escolhe uma estratégia." : "Pick a strategy." };
  if (!startDate) return { error: locale === "pt" ? "Start Date inválida." : "Invalid start date." };
  if (!endDate) return { error: locale === "pt" ? "End Date inválida." : "Invalid end date." };
  if (endDate < startDate) {
    return { error: locale === "pt" ? "End Date não pode ser antes da Start Date." : "End date cannot be before start date." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { data: strategy, error: strategyError } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", strategyId)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (strategyError || !strategy) {
    return { error: strategyError?.message || (locale === "pt" ? "Estratégia não encontrada." : "Strategy not found.") };
  }

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const recentPlannings = await fetchRecentPlanningsForAI(supabase, clientId, 75, 30);
  const allowedPlatforms = extractAllowedPlatformsFromChannels(strategy.channels);
  const allowedFormats = extractAllowedFormatsFromFormats(strategy.formats);
  const countryCode = (brandContext.client?.country_code || "PT").toUpperCase();
  const clientTimezone = brandContext.client?.timezone || null;
  const effectiveTimezone = clientTimezone || timezone;
  const holidays = getHolidaysInRange(
    countryCode,
    startDate,
    endDate,
    Boolean(strategy.use_celebration_dates),
  );

  const persona: PersonaRowForAI | null = strategy.persona_id
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", strategy.persona_id)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  if (allowedPlatforms.length === 0) {
    return {
      error:
        locale === "pt"
          ? "A estratégia não tem canais definidos (ex.: Instagram, TikTok). Define os canais para gerar uma planificação."
          : "Strategy has no channels defined. Define channels to generate a schedule.",
    };
  }

  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const { data: draft, error: draftError } = await supabase
    .from("client_schedule_drafts")
    .insert({
      client_id: clientId,
      owner_id: user.id,
      strategy_id: strategyId,
      persona_id: persona?.id ?? null,
      name: name || null,
      start_date: startDate,
      end_date: endDate,
      timezone: effectiveTimezone,
      status: "draft",
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    return { error: draftError?.message || "Failed to create draft." };
  }

  const proposal = await generateScheduleWithOpenAI({
    locale: aiLocale,
    timezone: effectiveTimezone,
    startDate,
    endDate,
    strategy: strategyForAI,
    notes: strategy.ai_notes ?? null,
    allowedPlatforms,
    allowedFormats,
    recentPlannings,
    holidays,
    persona: persona ?? undefined,
  });

  const rows = proposal.items.map((item) => ({
    draft_id: draft.id,
    client_id: clientId,
    owner_id: user.id,
    strategy_id: strategyId,
    scheduled_at: item.scheduled_at,
    platform: item.platform,
    format: item.format,
    title: item.title,
    caption: item.caption,
    assets: item.assets,
    rationale: item.rationale,
    status: "suggested",
  }));

  const { data: items, error: itemsError } = await supabase
    .from("client_schedule_items")
    .insert(rows)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    );

  if (itemsError) {
    return { error: itemsError.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return {
    success: t.scheduleDraftCreated,
    draftId: draft.id,
    items: ((items ?? []) as unknown as ScheduleItemRow[]),
  };

}

export async function acceptScheduleItem(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase
    .from("client_schedule_items")
    .update({ status: "accepted" })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };

  // Se não existir mais nenhum item "suggested" neste draft, marcamos o draft como "published".
  if (data?.draft_id) {
    const { count } = await supabase
      .from("client_schedule_items")
      .select("id", { count: "exact", head: true })
      .eq("draft_id", data.draft_id)
      .neq("status", "accepted");

    if ((count ?? 0) === 0) {
      await supabase
        .from("client_schedule_drafts")
        .update({ status: "published" })
        .eq("id", data.draft_id);
    }
  }

  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: t.scheduleItemAccepted, item: data as unknown as ScheduleItemRow };
}

export async function retryScheduleItem(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const t = ACTION_COPY[locale];
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, strategy_id, retry_count"
    )
    .eq("id", itemId)
    .single();

  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const { data: draft, error: draftError } = await supabase
    .from("client_schedule_drafts")
    .select("id, timezone, persona_id")
    .eq("id", item.draft_id)
    .single<{ id: string; timezone: string; persona_id: string | null }>();

  if (draftError || !draft) return { error: draftError?.message || "Draft not found." };

  const { data: strategy, error: strategyError } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (strategyError || !strategy) {
    return { error: strategyError?.message || (locale === "pt" ? "Estratégia não encontrada." : "Strategy not found.") };
  }

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const persona: PersonaRowForAI | null = draft.persona_id
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", draft.persona_id)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const next = await regenerateScheduleItemWithOpenAI({
    locale: aiLocale,
    timezone: String(draft.timezone || brandContext.client?.timezone || "Europe/Lisbon"),
    strategy: strategyForAI,
    persona: persona ?? undefined,
    scheduledAt: item.scheduled_at,
    platform: normalizePlatform(item.platform) ?? "instagram",
    format: normalizeFormat(item.format) ?? "post",
    previousTitle: item.title,
    previousCaption: item.caption,
  });

  const { data: updated, error: updateError } = await supabase
    .from("client_schedule_items")
    .update({
      title: next.title,
      caption: next.caption,
      assets: next.assets,
      rationale: next.rationale,
      status: "suggested",
      retry_count: (item.retry_count ?? 0) + 1,
    })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (updateError) return { error: updateError.message };

  // Se houver um retry (voltou a suggested), garantimos que o draft não fica "published".
  if (updated?.draft_id) {
    await supabase
      .from("client_schedule_drafts")
      .update({ status: "draft" })
      .eq("id", updated.draft_id);
  }

  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: t.scheduleItemRetried, item: updated as unknown as ScheduleItemRow };
}

export async function deleteScheduleItem(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<ClientActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("client_schedule_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Post eliminado." : "Post deleted." };
}

export async function updateScheduleItemDatetime(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  scheduledAtISO: string
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_schedule_items")
    .update({ scheduled_at: scheduledAtISO })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Data atualizada." : "Date updated.", item: data as unknown as ScheduleItemRow };
}

export async function updateScheduleItemText(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  payload: { title?: string; caption?: string }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const update: Record<string, string> = {};
  if (typeof payload.title === "string") update.title = payload.title;
  if (typeof payload.caption === "string") update.caption = payload.caption;

  const { data, error } = await supabase
    .from("client_schedule_items")
    .update(update)
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Texto atualizado." : "Text updated.", item: data as unknown as ScheduleItemRow };
}

export async function setScheduleItemStatus(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  status: ScheduleItemStatus
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_schedule_items")
    .update({ status })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Estado atualizado." : "Status updated.", item: data as unknown as ScheduleItemRow };
}

export async function generateScheduleItemAssets(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, platform, format, title, caption, strategy_id, draft_id")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const { data: draft } = await supabase
    .from("client_schedule_drafts")
    .select("id, persona_id")
    .eq("id", item.draft_id)
    .maybeSingle();

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const personaId = (draft?.persona_id || strategy.persona_id) ?? null;
  const persona: PersonaRowForAI | null = personaId
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", personaId)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const assets = await generateAssetsWithOpenAI({
    locale: aiLocale,
    strategy: strategyForAI,
    persona: persona ?? undefined,
    platform: String(item.platform),
    format: String(item.format),
    title: String(item.title),
    caption: String(item.caption),
  });

  const { data: updated, error: updateError } = await supabase
    .from("client_schedule_items")
    .update({ assets })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (updateError) return { error: updateError.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Assets gerados." : "Assets generated.", item: updated as unknown as ScheduleItemRow };
}

export async function generateScheduleItemAssetImage(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  assetIndex: number
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, platform, format, title, caption, assets, strategy_id, draft_id")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const assetsArr = Array.isArray(item.assets) ? (item.assets as unknown[]) : [];
  if (assetIndex < 0 || assetIndex >= assetsArr.length) {
    return { error: locale === "pt" ? "Asset inválido." : "Invalid asset." };
  }
  const rawAsset = assetsArr[assetIndex];
  if (!rawAsset || typeof rawAsset !== "object") {
    return { error: locale === "pt" ? "Asset inválido." : "Invalid asset." };
  }
  const asset = rawAsset as { type?: string; description?: string; notes?: string | null; url?: string | null };
  const description = String(asset.description || "").trim();
  if (!description) {
    return { error: locale === "pt" ? "O asset não tem descrição." : "Asset has no description." };
  }

  const { data: draft } = await supabase
    .from("client_schedule_drafts")
    .select("id, persona_id")
    .eq("id", item.draft_id)
    .maybeSingle();

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const personaId = (draft?.persona_id || strategy.persona_id) ?? null;
  const persona: PersonaRowForAI | null = personaId
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", personaId)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const prompt =
    aiLocale === "pt"
      ? `Gera UMA imagem para um post de social media.

Contexto do post:
- Plataforma: ${String(item.platform)}
- Formato: ${String(item.format)}
- Título: ${String(item.title)}
- Texto: ${String(item.caption)}

Asset a produzir (este é o alvo EXATO):
- Tipo: ${String(asset.type || "image")}
- Descrição: ${description}
- Notas: ${asset.notes ?? ""}

Regras:
- Alinha estritamente com a estratégia e a persona.
- Não uses texto ilegível na imagem; se houver texto, que seja mínimo e legível.
- Estilo consistente com tom/guardrails do cliente.

Estratégia: ${JSON.stringify(strategyForAI)}
Persona: ${JSON.stringify(persona ?? null)}`
      : `Generate ONE image for a social media post.

Post context:
- Platform: ${String(item.platform)}
- Format: ${String(item.format)}
- Title: ${String(item.title)}
- Caption: ${String(item.caption)}

Target asset (EXACT target):
- Type: ${String(asset.type || "image")}
- Description: ${description}
- Notes: ${asset.notes ?? ""}

Rules:
- Align strictly with the strategy and persona.
- Avoid unreadable text; if any text appears, keep it minimal and readable.
- Style must match client tone/guardrails.

Strategy: ${JSON.stringify(strategyForAI)}
Persona: ${JSON.stringify(persona ?? null)}`;

  const { b64 } = await generateImageBase64({
    prompt,
    size: "1024x1024",
    quality: "high",
    outputFormat: "png",
  });

  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: "image/png" });
  const bucket = "reference-assets";
  const path = `${clientId}/schedule/${itemId}/asset-${assetIndex}-${Date.now()}.png`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  const nextAssets = assetsArr.map((a, idx) => {
    if (idx !== assetIndex) return a;
    if (!a || typeof a !== "object") return a;
    return { ...(a as Record<string, unknown>), url: publicUrl };
  });

  const { data: updated, error: updateError } = await supabase
    .from("client_schedule_items")
    .update({ assets: nextAssets })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (updateError) return { error: updateError.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Imagem gerada." : "Image generated.", item: updated as unknown as ScheduleItemRow };
}

export async function updateScheduleItemAssetUrl(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  assetIndex: number,
  url: string,
  assetType?: "image" | "video" | "carousel" | null
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, assets")
    .eq("id", itemId)
    .eq("client_id", clientId)
    .single();

  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const assetsArr = Array.isArray(item.assets) ? (item.assets as unknown[]) : [];
  if (assetIndex < 0 || assetIndex >= assetsArr.length) {
    return { error: locale === "pt" ? "Asset inválido." : "Invalid asset." };
  }

  const nextAssets = assetsArr.map((a, idx) => {
    if (idx !== assetIndex) return a;
    if (!a || typeof a !== "object") return a;
    const base = { ...(a as Record<string, unknown>), url };
    if (assetType) return { ...base, type: assetType };
    return base;
  });

  const { data: updated, error: updateError } = await supabase
    .from("client_schedule_items")
    .update({ assets: nextAssets })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (updateError) return { error: updateError.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Imagem atualizada." : "Image updated.", item: updated as unknown as ScheduleItemRow };
}

export async function createScheduleItemManual(
  clientId: string,
  locale: ActionLocale,
  payload: {
    strategyId: string;
    scheduledAtISO: string;
    platform: string;
    format: string;
    title: string;
    caption: string;
    assets: Array<{ type: "image" | "video" | "carousel"; description: string; notes: string | null }>;
  }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: ACTION_COPY[locale].sessionExpired };

  const dateOnly = dateOnlyFromISO(payload.scheduledAtISO);
  if (!dateOnly) return { error: locale === "pt" ? "Data inválida." : "Invalid date." };

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const timezone = String(brandContext.client?.timezone || "GMT+00:00");

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select("id, persona_id")
    .eq("id", payload.strategyId)
    .eq("client_id", clientId)
    .maybeSingle<{ id: string; persona_id: string | null }>();
  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const draft = await ensureDraftForDate(
    supabase,
    clientId,
    user.id,
    payload.strategyId,
    dateOnly,
    timezone,
    strategy.persona_id ?? null
  );

  const { data, error } = await supabase
    .from("client_schedule_items")
    .insert({
      draft_id: draft.id,
      client_id: clientId,
      owner_id: user.id,
      strategy_id: payload.strategyId,
      scheduled_at: payload.scheduledAtISO,
      platform: payload.platform,
      format: payload.format,
      title: payload.title,
      caption: payload.caption,
      assets: payload.assets,
      rationale: [],
      status: "suggested",
    })
    .select("id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Post criado." : "Post created.", item: data as unknown as ScheduleItemRow };
}

export async function createScheduleItemWithAI(
  clientId: string,
  locale: ActionLocale,
  payload: {
    strategyId: string;
    scheduledAtISO: string;
    platform: "instagram" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube" | "blog";
    format: "post" | "reel" | "story" | "carousel" | "short" | "video" | "thread";
    prompt: string;
  }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: ACTION_COPY[locale].sessionExpired };

  const dateOnly = dateOnlyFromISO(payload.scheduledAtISO);
  if (!dateOnly) return { error: locale === "pt" ? "Data inválida." : "Invalid date." };

  const { data: strategy, error: strategyError } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", payload.strategyId)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (strategyError || !strategy) {
    return { error: strategyError?.message || (locale === "pt" ? "Estratégia não encontrada." : "Strategy not found.") };
  }

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const timezone = String(brandContext.client?.timezone || "GMT+00:00");
  const recentPlannings = await fetchRecentPlanningsForAI(supabase, clientId, 75, 30);
  const holidays = getHolidaysInRange(
    String((brandContext.client?.country_code || "PT")).toUpperCase(),
    dateOnly,
    dateOnly,
    Boolean(strategy.use_celebration_dates),
  );

  const persona: PersonaRowForAI | null = strategy.persona_id
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", strategy.persona_id)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const draft = await ensureDraftForDate(
    supabase,
    clientId,
    user.id,
    payload.strategyId,
    dateOnly,
    timezone,
    persona?.id ?? null
  );

  const item = await generateOneScheduleItemWithOpenAI({
    locale: aiLocale,
    timezone,
    strategy: strategyForAI,
    persona: persona ?? undefined,
    scheduledAt: payload.scheduledAtISO,
    platform: payload.platform,
    format: payload.format,
    userPrompt: payload.prompt,
    recentPlannings,
    holidays,
  });

  const { data, error } = await supabase
    .from("client_schedule_items")
    .insert({
      draft_id: draft.id,
      client_id: clientId,
      owner_id: user.id,
      strategy_id: payload.strategyId,
      scheduled_at: item.scheduled_at,
      platform: item.platform,
      format: item.format,
      title: item.title,
      caption: item.caption,
      assets: item.assets,
      rationale: item.rationale,
      status: "suggested",
    })
    .select("id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Post criado com IA." : "AI post created.", item: data as unknown as ScheduleItemRow };
}

export async function updateScheduleItemChannel(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  next: { platform: string; format: string }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, strategy_id")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select("id, channels, formats")
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const allowedPlatforms = extractAllowedPlatformsFromChannels(
    (strategy as { channels?: string | null }).channels ?? null
  );
  const allowedFormats = extractAllowedFormatsFromFormats(
    (strategy as { formats?: string | null }).formats ?? null
  );
  const platform = String(next.platform || "").toLowerCase();
  const format = String(next.format || "").toLowerCase();

  if (allowedPlatforms.length && !allowedPlatforms.includes(platform as (typeof allowedPlatforms)[number])) {
    return { error: locale === "pt" ? "Plataforma não permitida pela estratégia." : "Platform not allowed by strategy." };
  }
  if (allowedFormats.length && !allowedFormats.includes(format as (typeof allowedFormats)[number])) {
    return { error: locale === "pt" ? "Formato não permitido pela estratégia." : "Format not allowed by strategy." };
  }

  const { data: updated, error } = await supabase
    .from("client_schedule_items")
    .update({ platform, format })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Canal atualizado." : "Channel updated.", item: updated as unknown as ScheduleItemRow };
}

export async function regenerateScheduleItemText(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, scheduled_at, platform, format, title, caption, strategy_id, draft_id")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const { data: draft } = await supabase
    .from("client_schedule_drafts")
    .select("id, persona_id")
    .eq("id", item.draft_id)
    .maybeSingle();

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const personaId = (draft?.persona_id || strategy.persona_id) ?? null;
  const persona: PersonaRowForAI | null = personaId
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", personaId)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const next = await regenerateTextWithOpenAI({
    locale: aiLocale,
    strategy: strategyForAI,
    persona: persona ?? undefined,
    platform: String(item.platform),
    format: String(item.format),
    scheduledAtISO: String(item.scheduled_at),
    previousTitle: String(item.title),
    previousCaption: String(item.caption),
  });

  const { data: updated, error } = await supabase
    .from("client_schedule_items")
    .update({ title: next.title, caption: next.caption, rationale: next.rationale })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Texto regenerado." : "Text regenerated.", item: updated as unknown as ScheduleItemRow };
}

export async function previewRegenerateScheduleItemText(
  itemId: string,
  clientId: string,
  locale: ActionLocale
): Promise<{
  error?: string;
  success?: string;
  proposal?: { title: string; caption: string; rationale: unknown };
}> {
  const supabase = await createSupabaseServerClient();

  const { data: item, error: itemError } = await supabase
    .from("client_schedule_items")
    .select("id, scheduled_at, platform, format, title, caption, strategy_id, draft_id")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message || "Item not found." };

  const { data: draft } = await supabase
    .from("client_schedule_drafts")
    .select("id, persona_id")
    .eq("id", item.draft_id)
    .maybeSingle();

  const { data: strategy } = await supabase
    .from("client_strategies")
    .select(
      "id, title, status, objectives, audience, persona_id, use_celebration_dates, positioning, key_messages, content_pillars, formats, channels, cadence, kpis, guardrails, ai_notes, competitor_ids, reference_group_ids"
    )
    .eq("id", item.strategy_id)
    .eq("client_id", clientId)
    .single<StrategyRowForAI>();

  if (!strategy) return { error: locale === "pt" ? "Estratégia não encontrada." : "Strategy not found." };

  const competitorIds = strategy.competitor_ids;
  const competitorDetails: CompetitorRowForAI[] = competitorIds?.length
    ? (
        (
          await supabase
            .from("client_competitors")
            .select("id, name, website, instagram, tiktok, facebook, youtube, linkedin, x")
            .eq("client_id", clientId)
            .in("id", competitorIds)
        ).data ?? []
      ) as CompetitorRowForAI[]
    : [];

  const referenceGroupIds = strategy.reference_group_ids;
  const referenceFolders: ReferenceGroupRowForAI[] = referenceGroupIds?.length
    ? (
        (
          await supabase
            .from("client_reference_groups")
            .select("id, name, description")
            .eq("client_id", clientId)
            .in("id", referenceGroupIds)
        ).data ?? []
      ) as ReferenceGroupRowForAI[]
    : [];

  const brandContext = await fetchClientContextForAI(supabase, clientId);
  const aiLocale: "pt" | "en" = brandContext.client?.default_locale === "en" ? "en" : "pt";
  const strategyForAI = {
    ...buildStrategyForAI(strategy, competitorDetails, referenceFolders),
    client: brandContext.client ?? undefined,
    editorial_profile: brandContext.editorial_profile ?? undefined,
    business_tags: brandContext.business_tags,
  };

  const personaId = (draft?.persona_id || strategy.persona_id) ?? null;
  const persona: PersonaRowForAI | null = personaId
    ? (
        (
          await supabase
            .from("client_personas")
            .select(
              "id, name, role_title, age_range, gender, location, goals, pain_points, motivations, channels, content_preferences, objections, notes, style_preferences, demographics"
            )
            .eq("client_id", clientId)
            .eq("id", personaId)
            .maybeSingle()
        ).data ?? null
      )
    : null;

  const next = await regenerateTextWithOpenAI({
    locale: aiLocale,
    strategy: strategyForAI,
    persona: persona ?? undefined,
    platform: String(item.platform),
    format: String(item.format),
    scheduledAtISO: String(item.scheduled_at),
    previousTitle: String(item.title),
    previousCaption: String(item.caption),
  });

  return {
    success: locale === "pt" ? "Proposta gerada." : "Proposal generated.",
    proposal: { title: next.title, caption: next.caption, rationale: next.rationale },
  };
}

export async function applyScheduleItemCopyProposal(
  itemId: string,
  clientId: string,
  locale: ActionLocale,
  proposal: { title: string; caption: string; rationale: unknown }
): Promise<{ error?: string; success?: string; item?: ScheduleItemRow }> {
  const supabase = await createSupabaseServerClient();
  const { data: updated, error } = await supabase
    .from("client_schedule_items")
    .update({ title: proposal.title, caption: proposal.caption, rationale: proposal.rationale })
    .eq("id", itemId)
    .select(
      "id, draft_id, scheduled_at, platform, format, title, caption, assets, rationale, status, retry_count"
    )
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/calendar`);
  return { success: locale === "pt" ? "Proposta aplicada." : "Proposal applied.", item: updated as unknown as ScheduleItemRow };
}

export async function disconnectClientSocialAccount(
  clientId: string,
  accountId: string,
  locale: ActionLocale
): Promise<ClientActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("client_id", clientId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/clients/${clientId}/integrations`);
  return { success: locale === "pt" ? "Conta desconectada." : "Account disconnected." };
}

async function ensureDraftForDate(
  supabase: SupabaseServerClient,
  clientId: string,
  ownerId: string,
  strategyId: string,
  dateOnly: string,
  timezone: string,
  personaId: string | null
) {
  const existing = await supabase
    .from("client_schedule_drafts")
    .select("id, timezone, persona_id")
    .eq("client_id", clientId)
    .eq("strategy_id", strategyId)
    .lte("start_date", dateOnly)
    .gte("end_date", dateOnly)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; timezone: string; persona_id: string | null }>();

  if (existing.data?.id) return existing.data;

  const created = await supabase
    .from("client_schedule_drafts")
    .insert({
      client_id: clientId,
      owner_id: ownerId,
      strategy_id: strategyId,
      persona_id: personaId,
      name: null,
      start_date: dateOnly,
      end_date: dateOnly,
      timezone,
      status: "draft",
    })
    .select("id, timezone, persona_id")
    .single<{ id: string; timezone: string; persona_id: string | null }>();

  if (created.error || !created.data) throw new Error(created.error?.message || "Failed to create draft.");
  return created.data;
}

export async function createReferenceGroup(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const parentId = String(formData.get("parent_id") || "").trim();

  if (!name) {
    return { error: t.nameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { data: lastGroup } = await supabase
    .from("client_reference_groups")
    .select("position")
    .eq("client_id", clientId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (lastGroup?.position ?? 0) + 1;

  const { error } = await supabase.from("client_reference_groups").insert({
    client_id: clientId,
    owner_id: user.id,
    name,
    description: description || null,
    parent_id: parentId || null,
    position: nextPosition,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
  return { success: t.referenceGroupCreated };
}

export async function createReferenceItem(
  clientId: string,
  groupId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const title = String(formData.get("title") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const thumbnailUrl = String(formData.get("thumbnail_url") || "").trim();

  if (!title) {
    return { error: t.nameRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase.from("client_reference_items").insert({
    client_id: clientId,
    group_id: groupId,
    owner_id: user.id,
    title,
    url: url || null,
    notes: notes || null,
    type: type || "link",
    thumbnail_url: thumbnailUrl || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
  return { success: t.referenceItemCreated };
}

export async function createReferenceItemComment(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];
  const itemId = String(formData.get("item_id") || "").trim();
  const comment = String(formData.get("comment") || "").trim();

  if (!itemId || !comment) {
    return { error: t.commentRequired };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase.from("client_reference_item_comments").insert({
    client_id: clientId,
    item_id: itemId,
    owner_id: user.id,
    body: comment,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
  return { success: t.commentAdded };
}

export async function moveReferenceItem(
  clientId: string,
  itemId: string,
  targetGroupId: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_reference_items")
    .update({ group_id: targetGroupId })
    .eq("id", itemId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function updateReferenceGroupName(
  clientId: string,
  groupId: string,
  name: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_reference_groups")
    .update({ name })
    .eq("id", groupId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function deleteReferenceGroup(
  clientId: string,
  groupId: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_reference_groups")
    .delete()
    .eq("id", groupId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function updateReferenceItemTitle(
  clientId: string,
  itemId: string,
  title: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_reference_items")
    .update({ title })
    .eq("id", itemId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function deleteReferenceItem(
  clientId: string,
  itemId: string
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("client_reference_items")
    .delete()
    .eq("id", itemId)
    .eq("client_id", clientId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function updateReferenceGroupOrder(
  clientId: string,
  orderedIds: string[]
) {
  const supabase = await createSupabaseServerClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("client_reference_groups")
        .update({ position: index + 1 })
        .eq("id", id)
        .eq("client_id", clientId)
    )
  );

  revalidatePath(`/dashboard/clients/${clientId}/references`);
}

export async function updateClientProfile(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const audience = String(formData.get("audience") || "").trim();
  const tone = String(formData.get("tone") || "").trim();
  const references = String(formData.get("references") || "").trim();
  const goals = String(formData.get("goals") || "").trim();
  const brandValues = String(formData.get("brand_values") || "").trim();
  const locale = getActionLocale(formData);
  const t = ACTION_COPY[locale];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.sessionExpired };
  }

  const { error } = await supabase.from("client_profiles").upsert(
    {
      client_id: clientId,
      owner_id: user.id,
      audience: audience || null,
      tone: tone || null,
      references_text: references || null,
      goals: goals || null,
      brand_values: brandValues || null,
    },
    { onConflict: "client_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { success: t.profileUpdated };
}
