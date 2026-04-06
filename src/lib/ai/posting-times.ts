/**
 * Posting times optimization based on industry best practices and client historical data
 */

type Platform = "instagram" | "tiktok" | "facebook" | "linkedin" | "x" | "youtube" | "blog";

type PostingSlot = {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  score: number; // 0-1, higher is better
};

type OptimalSlots = {
  platform: Platform;
  slots: PostingSlot[];
};

/**
 * Industry-standard optimal posting times by platform
 * Based on multiple studies and best practices
 */
const INDUSTRY_OPTIMAL_TIMES: Record<Platform, PostingSlot[]> = {
  instagram: [
    // Monday-Friday: 9-11am, 1-3pm, 5-7pm
    { dayOfWeek: 1, hour: 9, score: 0.9 },
    { dayOfWeek: 1, hour: 10, score: 0.95 },
    { dayOfWeek: 1, hour: 11, score: 0.9 },
    { dayOfWeek: 1, hour: 13, score: 0.85 },
    { dayOfWeek: 1, hour: 14, score: 0.9 },
    { dayOfWeek: 1, hour: 15, score: 0.85 },
    { dayOfWeek: 1, hour: 17, score: 0.9 },
    { dayOfWeek: 1, hour: 18, score: 0.95 },
    { dayOfWeek: 1, hour: 19, score: 0.9 },
    { dayOfWeek: 2, hour: 9, score: 0.9 },
    { dayOfWeek: 2, hour: 10, score: 0.95 },
    { dayOfWeek: 2, hour: 11, score: 0.9 },
    { dayOfWeek: 2, hour: 13, score: 0.85 },
    { dayOfWeek: 2, hour: 14, score: 0.9 },
    { dayOfWeek: 2, hour: 15, score: 0.85 },
    { dayOfWeek: 2, hour: 17, score: 0.9 },
    { dayOfWeek: 2, hour: 18, score: 0.95 },
    { dayOfWeek: 2, hour: 19, score: 0.9 },
    { dayOfWeek: 3, hour: 9, score: 0.9 },
    { dayOfWeek: 3, hour: 10, score: 0.95 },
    { dayOfWeek: 3, hour: 11, score: 0.9 },
    { dayOfWeek: 3, hour: 13, score: 0.85 },
    { dayOfWeek: 3, hour: 14, score: 0.9 },
    { dayOfWeek: 3, hour: 15, score: 0.85 },
    { dayOfWeek: 3, hour: 17, score: 0.9 },
    { dayOfWeek: 3, hour: 18, score: 0.95 },
    { dayOfWeek: 3, hour: 19, score: 0.9 },
    { dayOfWeek: 4, hour: 9, score: 0.9 },
    { dayOfWeek: 4, hour: 10, score: 0.95 },
    { dayOfWeek: 4, hour: 11, score: 0.9 },
    { dayOfWeek: 4, hour: 13, score: 0.85 },
    { dayOfWeek: 4, hour: 14, score: 0.9 },
    { dayOfWeek: 4, hour: 15, score: 0.85 },
    { dayOfWeek: 4, hour: 17, score: 0.9 },
    { dayOfWeek: 4, hour: 18, score: 0.95 },
    { dayOfWeek: 4, hour: 19, score: 0.9 },
    { dayOfWeek: 5, hour: 9, score: 0.85 },
    { dayOfWeek: 5, hour: 10, score: 0.9 },
    { dayOfWeek: 5, hour: 11, score: 0.85 },
    { dayOfWeek: 5, hour: 13, score: 0.8 },
    { dayOfWeek: 5, hour: 14, score: 0.85 },
    { dayOfWeek: 5, hour: 15, score: 0.8 },
    { dayOfWeek: 5, hour: 17, score: 0.85 },
    { dayOfWeek: 5, hour: 18, score: 0.9 },
    { dayOfWeek: 5, hour: 19, score: 0.85 },
    // Weekend: 10am-2pm
    { dayOfWeek: 6, hour: 10, score: 0.8 },
    { dayOfWeek: 6, hour: 11, score: 0.85 },
    { dayOfWeek: 6, hour: 12, score: 0.85 },
    { dayOfWeek: 6, hour: 13, score: 0.8 },
    { dayOfWeek: 0, hour: 10, score: 0.75 },
    { dayOfWeek: 0, hour: 11, score: 0.8 },
    { dayOfWeek: 0, hour: 12, score: 0.8 },
    { dayOfWeek: 0, hour: 13, score: 0.75 },
  ],
  tiktok: [
    // TikTok: Evenings and late night perform best
    { dayOfWeek: 1, hour: 19, score: 0.95 },
    { dayOfWeek: 1, hour: 20, score: 0.98 },
    { dayOfWeek: 1, hour: 21, score: 0.95 },
    { dayOfWeek: 2, hour: 19, score: 0.95 },
    { dayOfWeek: 2, hour: 20, score: 0.98 },
    { dayOfWeek: 2, hour: 21, score: 0.95 },
    { dayOfWeek: 3, hour: 19, score: 0.95 },
    { dayOfWeek: 3, hour: 20, score: 0.98 },
    { dayOfWeek: 3, hour: 21, score: 0.95 },
    { dayOfWeek: 4, hour: 19, score: 0.95 },
    { dayOfWeek: 4, hour: 20, score: 0.98 },
    { dayOfWeek: 4, hour: 21, score: 0.95 },
    { dayOfWeek: 5, hour: 19, score: 0.9 },
    { dayOfWeek: 5, hour: 20, score: 0.95 },
    { dayOfWeek: 5, hour: 21, score: 0.9 },
    { dayOfWeek: 6, hour: 18, score: 0.85 },
    { dayOfWeek: 6, hour: 19, score: 0.9 },
    { dayOfWeek: 6, hour: 20, score: 0.95 },
    { dayOfWeek: 6, hour: 21, score: 0.9 },
    { dayOfWeek: 0, hour: 18, score: 0.8 },
    { dayOfWeek: 0, hour: 19, score: 0.85 },
    { dayOfWeek: 0, hour: 20, score: 0.9 },
    { dayOfWeek: 0, hour: 21, score: 0.85 },
  ],
  facebook: [
    // Facebook: Mid-morning and early afternoon
    { dayOfWeek: 1, hour: 9, score: 0.85 },
    { dayOfWeek: 1, hour: 10, score: 0.9 },
    { dayOfWeek: 1, hour: 11, score: 0.85 },
    { dayOfWeek: 1, hour: 13, score: 0.9 },
    { dayOfWeek: 1, hour: 14, score: 0.95 },
    { dayOfWeek: 1, hour: 15, score: 0.9 },
    { dayOfWeek: 2, hour: 9, score: 0.85 },
    { dayOfWeek: 2, hour: 10, score: 0.9 },
    { dayOfWeek: 2, hour: 11, score: 0.85 },
    { dayOfWeek: 2, hour: 13, score: 0.9 },
    { dayOfWeek: 2, hour: 14, score: 0.95 },
    { dayOfWeek: 2, hour: 15, score: 0.9 },
    { dayOfWeek: 3, hour: 9, score: 0.85 },
    { dayOfWeek: 3, hour: 10, score: 0.9 },
    { dayOfWeek: 3, hour: 11, score: 0.85 },
    { dayOfWeek: 3, hour: 13, score: 0.9 },
    { dayOfWeek: 3, hour: 14, score: 0.95 },
    { dayOfWeek: 3, hour: 15, score: 0.9 },
    { dayOfWeek: 4, hour: 9, score: 0.85 },
    { dayOfWeek: 4, hour: 10, score: 0.9 },
    { dayOfWeek: 4, hour: 11, score: 0.85 },
    { dayOfWeek: 4, hour: 13, score: 0.9 },
    { dayOfWeek: 4, hour: 14, score: 0.95 },
    { dayOfWeek: 4, hour: 15, score: 0.9 },
    { dayOfWeek: 5, hour: 9, score: 0.8 },
    { dayOfWeek: 5, hour: 10, score: 0.85 },
    { dayOfWeek: 5, hour: 11, score: 0.8 },
    { dayOfWeek: 5, hour: 13, score: 0.85 },
    { dayOfWeek: 5, hour: 14, score: 0.9 },
    { dayOfWeek: 5, hour: 15, score: 0.85 },
  ],
  linkedin: [
    // LinkedIn: Business hours, Tuesday-Thursday best
    { dayOfWeek: 1, hour: 8, score: 0.85 },
    { dayOfWeek: 1, hour: 9, score: 0.9 },
    { dayOfWeek: 1, hour: 10, score: 0.85 },
    { dayOfWeek: 1, hour: 12, score: 0.9 },
    { dayOfWeek: 1, hour: 13, score: 0.95 },
    { dayOfWeek: 1, hour: 14, score: 0.9 },
    { dayOfWeek: 2, hour: 8, score: 0.9 },
    { dayOfWeek: 2, hour: 9, score: 0.95 },
    { dayOfWeek: 2, hour: 10, score: 0.9 },
    { dayOfWeek: 2, hour: 12, score: 0.95 },
    { dayOfWeek: 2, hour: 13, score: 0.98 },
    { dayOfWeek: 2, hour: 14, score: 0.95 },
    { dayOfWeek: 3, hour: 8, score: 0.9 },
    { dayOfWeek: 3, hour: 9, score: 0.95 },
    { dayOfWeek: 3, hour: 10, score: 0.9 },
    { dayOfWeek: 3, hour: 12, score: 0.95 },
    { dayOfWeek: 3, hour: 13, score: 0.98 },
    { dayOfWeek: 3, hour: 14, score: 0.95 },
    { dayOfWeek: 4, hour: 8, score: 0.85 },
    { dayOfWeek: 4, hour: 9, score: 0.9 },
    { dayOfWeek: 4, hour: 10, score: 0.85 },
    { dayOfWeek: 4, hour: 12, score: 0.9 },
    { dayOfWeek: 4, hour: 13, score: 0.95 },
    { dayOfWeek: 4, hour: 14, score: 0.9 },
  ],
  x: [
    // X/Twitter: Multiple times throughout the day
    { dayOfWeek: 1, hour: 8, score: 0.85 },
    { dayOfWeek: 1, hour: 9, score: 0.9 },
    { dayOfWeek: 1, hour: 12, score: 0.9 },
    { dayOfWeek: 1, hour: 13, score: 0.95 },
    { dayOfWeek: 1, hour: 17, score: 0.9 },
    { dayOfWeek: 1, hour: 18, score: 0.95 },
    { dayOfWeek: 2, hour: 8, score: 0.85 },
    { dayOfWeek: 2, hour: 9, score: 0.9 },
    { dayOfWeek: 2, hour: 12, score: 0.9 },
    { dayOfWeek: 2, hour: 13, score: 0.95 },
    { dayOfWeek: 2, hour: 17, score: 0.9 },
    { dayOfWeek: 2, hour: 18, score: 0.95 },
    { dayOfWeek: 3, hour: 8, score: 0.85 },
    { dayOfWeek: 3, hour: 9, score: 0.9 },
    { dayOfWeek: 3, hour: 12, score: 0.9 },
    { dayOfWeek: 3, hour: 13, score: 0.95 },
    { dayOfWeek: 3, hour: 17, score: 0.9 },
    { dayOfWeek: 3, hour: 18, score: 0.95 },
    { dayOfWeek: 4, hour: 8, score: 0.85 },
    { dayOfWeek: 4, hour: 9, score: 0.9 },
    { dayOfWeek: 4, hour: 12, score: 0.9 },
    { dayOfWeek: 4, hour: 13, score: 0.95 },
    { dayOfWeek: 4, hour: 17, score: 0.9 },
    { dayOfWeek: 4, hour: 18, score: 0.95 },
    { dayOfWeek: 5, hour: 8, score: 0.8 },
    { dayOfWeek: 5, hour: 9, score: 0.85 },
    { dayOfWeek: 5, hour: 12, score: 0.85 },
    { dayOfWeek: 5, hour: 13, score: 0.9 },
    { dayOfWeek: 5, hour: 17, score: 0.85 },
    { dayOfWeek: 5, hour: 18, score: 0.9 },
  ],
  youtube: [
    // YouTube: Afternoons and evenings
    { dayOfWeek: 1, hour: 14, score: 0.85 },
    { dayOfWeek: 1, hour: 15, score: 0.9 },
    { dayOfWeek: 1, hour: 16, score: 0.9 },
    { dayOfWeek: 1, hour: 17, score: 0.95 },
    { dayOfWeek: 1, hour: 18, score: 0.95 },
    { dayOfWeek: 1, hour: 19, score: 0.9 },
    { dayOfWeek: 2, hour: 14, score: 0.85 },
    { dayOfWeek: 2, hour: 15, score: 0.9 },
    { dayOfWeek: 2, hour: 16, score: 0.9 },
    { dayOfWeek: 2, hour: 17, score: 0.95 },
    { dayOfWeek: 2, hour: 18, score: 0.95 },
    { dayOfWeek: 2, hour: 19, score: 0.9 },
    { dayOfWeek: 3, hour: 14, score: 0.85 },
    { dayOfWeek: 3, hour: 15, score: 0.9 },
    { dayOfWeek: 3, hour: 16, score: 0.9 },
    { dayOfWeek: 3, hour: 17, score: 0.95 },
    { dayOfWeek: 3, hour: 18, score: 0.95 },
    { dayOfWeek: 3, hour: 19, score: 0.9 },
    { dayOfWeek: 4, hour: 14, score: 0.85 },
    { dayOfWeek: 4, hour: 15, score: 0.9 },
    { dayOfWeek: 4, hour: 16, score: 0.9 },
    { dayOfWeek: 4, hour: 17, score: 0.95 },
    { dayOfWeek: 4, hour: 18, score: 0.95 },
    { dayOfWeek: 4, hour: 19, score: 0.9 },
    { dayOfWeek: 5, hour: 14, score: 0.8 },
    { dayOfWeek: 5, hour: 15, score: 0.85 },
    { dayOfWeek: 5, hour: 16, score: 0.85 },
    { dayOfWeek: 5, hour: 17, score: 0.9 },
    { dayOfWeek: 5, hour: 18, score: 0.9 },
    { dayOfWeek: 5, hour: 19, score: 0.85 },
    { dayOfWeek: 6, hour: 10, score: 0.75 },
    { dayOfWeek: 6, hour: 11, score: 0.8 },
    { dayOfWeek: 6, hour: 12, score: 0.8 },
    { dayOfWeek: 6, hour: 13, score: 0.85 },
    { dayOfWeek: 6, hour: 14, score: 0.85 },
    { dayOfWeek: 0, hour: 10, score: 0.7 },
    { dayOfWeek: 0, hour: 11, score: 0.75 },
    { dayOfWeek: 0, hour: 12, score: 0.75 },
    { dayOfWeek: 0, hour: 13, score: 0.8 },
    { dayOfWeek: 0, hour: 14, score: 0.8 },
  ],
  blog: [
    // Blog: Morning reading hours
    { dayOfWeek: 1, hour: 7, score: 0.8 },
    { dayOfWeek: 1, hour: 8, score: 0.9 },
    { dayOfWeek: 1, hour: 9, score: 0.95 },
    { dayOfWeek: 1, hour: 10, score: 0.9 },
    { dayOfWeek: 2, hour: 7, score: 0.8 },
    { dayOfWeek: 2, hour: 8, score: 0.9 },
    { dayOfWeek: 2, hour: 9, score: 0.95 },
    { dayOfWeek: 2, hour: 10, score: 0.9 },
    { dayOfWeek: 3, hour: 7, score: 0.8 },
    { dayOfWeek: 3, hour: 8, score: 0.9 },
    { dayOfWeek: 3, hour: 9, score: 0.95 },
    { dayOfWeek: 3, hour: 10, score: 0.9 },
    { dayOfWeek: 4, hour: 7, score: 0.8 },
    { dayOfWeek: 4, hour: 8, score: 0.9 },
    { dayOfWeek: 4, hour: 9, score: 0.95 },
    { dayOfWeek: 4, hour: 10, score: 0.9 },
    { dayOfWeek: 5, hour: 7, score: 0.75 },
    { dayOfWeek: 5, hour: 8, score: 0.85 },
    { dayOfWeek: 5, hour: 9, score: 0.9 },
    { dayOfWeek: 5, hour: 10, score: 0.85 },
  ],
};

/**
 * Analyze client's historical posting patterns and update posting_patterns table
 * This should be called periodically (e.g., after posts are accepted/published)
 */
export async function analyzeClientPostingPatterns(
  clientId: string,
  supabase: any
): Promise<void> {
  // Get accepted/published posts from last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: posts } = await supabase
    .from("client_schedule_items")
    .select("scheduled_at, platform, status")
    .eq("client_id", clientId)
    .in("status", ["accepted", "published"]) // Only count posts that were actually used
    .gte("scheduled_at", since);

  if (!posts || posts.length < 5) {
    // Not enough data to learn patterns
    return;
  }

  // Group by platform, day of week, and hour
  const patterns: Map<string, { count: number; totalScore: number }> = new Map();

  for (const post of posts) {
    const scheduledAt = new Date(post.scheduled_at);
    const dayOfWeek = scheduledAt.getUTCDay();
    const hour = scheduledAt.getUTCHours();
    const platform = post.platform;

    // Simple scoring: accepted posts get base score, can be enhanced with engagement data later
    const baseScore = 0.7; // Base score for accepted posts

    const key = `${platform}-${dayOfWeek}-${hour}`;
    const existing = patterns.get(key) || { count: 0, totalScore: 0 };
    
    patterns.set(key, {
      count: existing.count + 1,
      totalScore: existing.totalScore + baseScore,
    });
  }

  // Upsert patterns into database
  for (const [key, data] of patterns.entries()) {
    const [platform, dayOfWeekStr, hourStr] = key.split("-");
    const dayOfWeek = parseInt(dayOfWeekStr, 10);
    const hour = parseInt(hourStr, 10);
    const engagementScore = data.totalScore / data.count; // Average score

    await supabase
      .from("client_posting_patterns")
      .upsert(
        {
          client_id: clientId,
          platform,
          day_of_week: dayOfWeek,
          hour,
          engagement_score: engagementScore,
          post_count: data.count,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "client_id,platform,day_of_week,hour",
        }
      );
  }
}

/**
 * Get optimal posting slots combining industry standards and client historical data
 */
export async function getOptimalPostingSlots(
  clientId: string,
  platforms: Platform[],
  supabase: any
): Promise<OptimalSlots[]> {
  const results: OptimalSlots[] = [];

  for (const platform of platforms) {
    // Get industry defaults
    const industrySlots = INDUSTRY_OPTIMAL_TIMES[platform] || [];

    // Try to get client historical patterns
    const { data: patterns } = await supabase
      .from("client_posting_patterns")
      .select("day_of_week, hour, engagement_score, post_count")
      .eq("client_id", clientId)
      .eq("platform", platform)
      .order("engagement_score", { ascending: false })
      .limit(20);

    // Combine industry defaults with client patterns
    const combinedSlots: Map<string, PostingSlot> = new Map();

    // Start with industry defaults
    for (const slot of industrySlots) {
      const key = `${slot.dayOfWeek}-${slot.hour}`;
      combinedSlots.set(key, { ...slot });
    }

    // Override with client patterns if they exist and have enough data
    if (patterns && patterns.length > 0) {
      const totalPosts = patterns.reduce((sum: number, p: any) => sum + (p.post_count || 0), 0);
      
      // Only use client patterns if we have at least 10 posts
      if (totalPosts >= 10) {
        for (const pattern of patterns) {
          const key = `${pattern.day_of_week}-${pattern.hour}`;
          const existing = combinedSlots.get(key);
          
          // Boost score based on client's historical performance
          // If engagement_score exists, use it; otherwise boost by 0.1
          const clientScore = pattern.engagement_score 
            ? Math.min(1.0, Number(pattern.engagement_score) + 0.1)
            : (existing?.score || 0.5) + 0.15;
          
          combinedSlots.set(key, {
            dayOfWeek: pattern.day_of_week,
            hour: pattern.hour,
            score: Math.max(existing?.score || 0.5, clientScore),
          });
        }
      }
    }

    // Convert to array and sort by score
    const slots = Array.from(combinedSlots.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 30); // Top 30 slots per platform

    results.push({
      platform,
      slots,
    });
  }

  return results;
}

/**
 * Format optimal slots for AI prompt
 */
export function formatOptimalSlotsForPrompt(slots: OptimalSlots[], locale: "pt" | "en"): string {
  const dayNames = locale === "pt" 
    ? ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const lines: string[] = [];
  
  for (const { platform, slots: platformSlots } of slots) {
    lines.push(`\n${platform.toUpperCase()}:`);
    
    // Group by day for readability
    const byDay: Record<number, number[]> = {};
    for (const slot of platformSlots.slice(0, 15)) {
      if (!byDay[slot.dayOfWeek]) {
        byDay[slot.dayOfWeek] = [];
      }
      byDay[slot.dayOfWeek].push(slot.hour);
    }

    for (const [dayNum, hours] of Object.entries(byDay)) {
      const dayName = dayNames[Number(dayNum)];
      const hoursStr = hours.sort((a, b) => a - b).join("h, ") + "h";
      lines.push(`  ${dayName}: ${hoursStr}`);
    }
  }

  return lines.join("\n");
}
