/**
 * Generate trending topics based on business tags and current season/time of year
 */

type TrendingTopic = {
  topic: string;
  reason: string;
  relevance: "high" | "medium" | "low";
};

/**
 * Get trending topics based on business tags and current date
 */
export function getTrendingTopics(
  businessTags: string[],
  locale: "pt" | "en",
  currentDate: Date = new Date()
): TrendingTopic[] {
  const month = currentDate.getMonth() + 1; // 1-12
  const season = getSeason(month);
  const topics: TrendingTopic[] = [];

  // Map business tags to relevant trending topics by season
  const tagToTrends: Record<string, Record<string, string[]>> = {
    fitness: {
      winter: locale === "pt" 
        ? ["Treino em casa", "Motivação de ano novo", "Alimentação saudável", "Desafios de fitness"]
        : ["Home workouts", "New year motivation", "Healthy eating", "Fitness challenges"],
      spring: locale === "pt"
        ? ["Preparação para o verão", "Treino ao ar livre", "Dietas detox", "Corridas e maratonas"]
        : ["Summer prep", "Outdoor workouts", "Detox diets", "Runs and marathons"],
      summer: locale === "pt"
        ? ["Treino na praia", "Hidratação", "Receitas leves", "Atividades aquáticas"]
        : ["Beach workouts", "Hydration", "Light recipes", "Water activities"],
      fall: locale === "pt"
        ? ["Volta à rotina", "Treino de força", "Receitas de outono", "Preparação para o inverno"]
        : ["Back to routine", "Strength training", "Fall recipes", "Winter prep"],
    },
    wellness: {
      winter: locale === "pt"
        ? ["Cuidados com a pele seca", "Meditação e mindfulness", "Rotinas de sono", "Suplementos de vitamina D"]
        : ["Dry skin care", "Meditation and mindfulness", "Sleep routines", "Vitamin D supplements"],
      spring: locale === "pt"
        ? ["Renovação e desintoxicação", "Cuidados com a pele", "Yoga ao ar livre", "Alimentação sazonal"]
        : ["Renewal and detox", "Skincare", "Outdoor yoga", "Seasonal eating"],
      summer: locale === "pt"
        ? ["Proteção solar", "Hidratação", "Atividades relaxantes", "Cuidados com o cabelo"]
        : ["Sun protection", "Hydration", "Relaxing activities", "Hair care"],
      fall: locale === "pt"
        ? ["Preparação para o inverno", "Cuidados com a imunidade", "Rotinas de autocuidado", "Alimentação nutritiva"]
        : ["Winter prep", "Immunity care", "Self-care routines", "Nutritious eating"],
    },
    tech: {
      winter: locale === "pt"
        ? ["Tendências de tecnologia", "Gadgets para presentes", "Resoluções tecnológicas", "Novos lançamentos"]
        : ["Tech trends", "Gift gadgets", "Tech resolutions", "New launches"],
      spring: locale === "pt"
        ? ["Novos produtos", "Tecnologia sustentável", "Inovações", "Gadgets para viagem"]
        : ["New products", "Sustainable tech", "Innovations", "Travel gadgets"],
      summer: locale === "pt"
        ? ["Gadgets para férias", "Tecnologia portátil", "Apps de verão", "Dispositivos à prova de água"]
        : ["Vacation gadgets", "Portable tech", "Summer apps", "Waterproof devices"],
      fall: locale === "pt"
        ? ["Lançamentos de outono", "Tecnologia para produtividade", "Gadgets para casa", "Preparação para o Black Friday"]
        : ["Fall launches", "Productivity tech", "Home gadgets", "Black Friday prep"],
    },
    fashion: {
      winter: locale === "pt"
        ? ["Tendências de inverno", "Moda sustentável", "Peças essenciais", "Estilo de festas"]
        : ["Winter trends", "Sustainable fashion", "Essential pieces", "Party style"],
      spring: locale === "pt"
        ? ["Tendências de primavera", "Moda sustentável", "Peças versáteis", "Estilo casual"]
        : ["Spring trends", "Sustainable fashion", "Versatile pieces", "Casual style"],
      summer: locale === "pt"
        ? ["Moda de verão", "Estilo de praia", "Peças leves", "Acessórios"]
        : ["Summer fashion", "Beach style", "Light pieces", "Accessories"],
      fall: locale === "pt"
        ? ["Tendências de outono", "Layering", "Peças atemporais", "Preparação para o inverno"]
        : ["Fall trends", "Layering", "Timeless pieces", "Winter prep"],
    },
    food: {
      winter: locale === "pt"
        ? ["Receitas de conforto", "Sopas e guisados", "Doces de inverno", "Bebidas quentes"]
        : ["Comfort recipes", "Soups and stews", "Winter sweets", "Hot drinks"],
      spring: locale === "pt"
        ? ["Receitas frescas", "Ingredientes sazonais", "Smoothies", "Saladas"]
        : ["Fresh recipes", "Seasonal ingredients", "Smoothies", "Salads"],
      summer: locale === "pt"
        ? ["Receitas leves", "Churrascos", "Sobremesas frescas", "Bebidas refrescantes"]
        : ["Light recipes", "BBQs", "Fresh desserts", "Refreshing drinks"],
      fall: locale === "pt"
        ? ["Receitas de outono", "Ingredientes sazonais", "Sobremesas quentes", "Bebidas quentes"]
        : ["Fall recipes", "Seasonal ingredients", "Warm desserts", "Hot drinks"],
    },
  };

  // Generate topics based on tags
  for (const tag of businessTags) {
    const tagLower = tag.toLowerCase();
    const trends = tagToTrends[tagLower];
    
    if (trends && trends[season]) {
      for (const topic of trends[season]) {
        topics.push({
          topic,
          reason: locale === "pt"
            ? `Relevante para ${tag} durante ${getSeasonName(season, locale)}`
            : `Relevant for ${tag} during ${getSeasonName(season, locale)}`,
          relevance: "high",
        });
      }
    }
  }

  // Add general seasonal topics if no specific matches
  if (topics.length === 0) {
    const generalTopics: Record<string, string[]> = {
      winter: locale === "pt"
        ? ["Reflexão de fim de ano", "Novos começos", "Metas e objetivos", "Bem-estar pessoal"]
        : ["Year-end reflection", "New beginnings", "Goals and objectives", "Personal wellness"],
      spring: locale === "pt"
        ? ["Renovação", "Crescimento", "Novos projetos", "Energia positiva"]
        : ["Renewal", "Growth", "New projects", "Positive energy"],
      summer: locale === "pt"
        ? ["Férias", "Relaxamento", "Aventuras", "Tempo livre"]
        : ["Vacation", "Relaxation", "Adventures", "Free time"],
      fall: locale === "pt"
        ? ["Volta à rotina", "Organização", "Preparação", "Reflexão"]
        : ["Back to routine", "Organization", "Preparation", "Reflection"],
    };

    for (const topic of generalTopics[season] || []) {
      topics.push({
        topic,
        reason: locale === "pt"
          ? `Tópico sazonal relevante para ${getSeasonName(season, locale)}`
          : `Seasonal topic relevant for ${getSeasonName(season, locale)}`,
        relevance: "medium",
      });
    }
  }

  return topics.slice(0, 12); // Limit to top 12
}

function getSeason(month: number): "winter" | "spring" | "summer" | "fall" {
  if (month >= 12 || month <= 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  return "fall";
}

function getSeasonName(season: string, locale: "pt" | "en"): string {
  const names: Record<string, Record<string, string>> = {
    winter: { pt: "inverno", en: "winter" },
    spring: { pt: "primavera", en: "spring" },
    summer: { pt: "verão", en: "summer" },
    fall: { pt: "outono", en: "fall" },
  };
  return names[season]?.[locale] || season;
}

/**
 * Format trending topics for AI prompt
 */
export function formatTrendingTopicsForPrompt(topics: TrendingTopic[], locale: "pt" | "en"): string {
  if (topics.length === 0) return "";

  const highRelevance = topics.filter((t) => t.relevance === "high");
  const mediumRelevance = topics.filter((t) => t.relevance === "medium");

  const lines: string[] = [];
  
  if (highRelevance.length > 0) {
    lines.push(locale === "pt" ? "Alta relevância:" : "High relevance:");
    highRelevance.slice(0, 8).forEach((t) => {
      lines.push(`  - ${t.topic} (${t.reason})`);
    });
  }

  if (mediumRelevance.length > 0 && highRelevance.length < 8) {
    lines.push(locale === "pt" ? "Média relevância:" : "Medium relevance:");
    mediumRelevance.slice(0, 8 - highRelevance.length).forEach((t) => {
      lines.push(`  - ${t.topic} (${t.reason})`);
    });
  }

  return lines.join("\n");
}
