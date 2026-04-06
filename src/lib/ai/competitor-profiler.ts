import { getOpenAIClient, getOpenAIModel } from "@/lib/ai/openai";
import { CompetitorProfileSchema, type CompetitorProfile } from "@/lib/ai/competitor-profile-schema";
import type { CrawlSnapshot } from "@/lib/crawler/web-crawler";

export async function buildCompetitorProfileWithOpenAI(input: {
  locale: "pt" | "en";
  competitor: { name: string; website?: string | null };
  crawl: CrawlSnapshot;
}): Promise<CompetitorProfile> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();

  const system =
    input.locale === "pt"
      ? "És um analista de marketing e social media. Tens de produzir um perfil de competidor útil e prático, baseado estritamente nas fontes fornecidas."
      : "You are a marketing and social media analyst. Produce a practical competitor profile based strictly on the provided sources.";

  const pages = (input.crawl.pages || []).map((p) => ({
    url: p.finalUrl || p.url,
    ok: p.ok,
    status: p.status,
    title: p.title,
    description: p.description,
    contentType: p.contentType,
    text: p.text ? String(p.text).slice(0, 6000) : null,
  }));

  const user =
    input.locale === "pt"
      ? `Analisa o competidor e devolve um perfil estruturado em JSON (respeita o schema) com detalhe suficiente para suportar a criação de uma estratégia de social media.

Regras:
- Não inventes factos. Se não houver evidência suficiente, diz de forma explícita e mantém o campo mais genérico.
- Usa evidências (com EXCERTOS do conteúdo) para suportar claims importantes.
- Para cada 'sources[]', inclui 'url' + 'page_title' (se existir) + 'excerpt' (uma frase curta COPIADA do texto crawlado).
- Não inventes excertos. O 'excerpt' tem de existir no conteúdo fornecido.
- Escreve em Português (pt-PT).
- Sê específico e útil (não demasiado resumido): pensa em como isto será usado para gerar estratégia, posicionamento e plano editorial.

Competidor:
- Nome: ${input.competitor.name}
- Website: ${input.competitor.website || ""}

Fontes crawladas (texto extraído e metadata):
${JSON.stringify(pages)}`
      : `Analyze the competitor and return a structured JSON profile (follow the schema).

Rules:
- Do not fabricate facts. If evidence is insufficient, be explicit and keep fields generic.
- Use evidence (URLs) to support important claims.
- Write in English.

Competitor:
- Name: ${input.competitor.name}
- Website: ${input.competitor.website || ""}

Crawled sources (extracted text + metadata):
${JSON.stringify(pages)}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    text: {
      format: {
        type: "json_schema",
        name: "competitor_profile",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            overview: { type: "string" },
            overview_evidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["justification", "sources"],
            },
            category: { type: ["string", "null"] },
            business_model: { type: ["string", "null"] },
            positioning: { type: "string" },
            positioning_evidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["justification", "sources"],
            },
            value_proposition: { type: "string" },
            value_proposition_evidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["justification", "sources"],
            },

            offerings: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  description: { type: ["string", "null"] },
                  target: { type: ["string", "null"] },
                  price_hint: { type: ["string", "null"] },
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["name", "description", "target", "price_hint", "justification", "sources"],
              },
            },

            audience_segments: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  segment: { type: "string" },
                  segment_justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                  pains: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        justification: { type: "string" },
                        sources: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              url: { type: "string" },
                              page_title: { type: ["string", "null"] },
                              excerpt: { type: ["string", "null"] },
                            },
                            required: ["url", "page_title", "excerpt"],
                          },
                        },
                      },
                      required: ["text", "justification", "sources"],
                    },
                  },
                  desires: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        justification: { type: "string" },
                        sources: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              url: { type: "string" },
                              page_title: { type: ["string", "null"] },
                              excerpt: { type: ["string", "null"] },
                            },
                            required: ["url", "page_title", "excerpt"],
                          },
                        },
                      },
                      required: ["text", "justification", "sources"],
                    },
                  },
                  objections: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        justification: { type: "string" },
                        sources: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              url: { type: "string" },
                              page_title: { type: ["string", "null"] },
                              excerpt: { type: ["string", "null"] },
                            },
                            required: ["url", "page_title", "excerpt"],
                          },
                        },
                      },
                      required: ["text", "justification", "sources"],
                    },
                  },
                },
                required: [
                  "segment",
                  "segment_justification",
                  "sources",
                  "pains",
                  "desires",
                  "objections",
                ],
              },
            },

            differentiators: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["text", "justification", "sources"],
              },
            },
            proof_points: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  point: { type: "string" },
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["point", "justification", "sources"],
              },
            },

            messaging: {
              type: "object",
              additionalProperties: false,
              properties: {
                keywords: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                pillars: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                tagline_examples: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["keywords", "pillars", "tagline_examples"],
            },

            tone_of_voice: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                summary_evidence: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["justification", "sources"],
                },
                traits: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                do: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                dont: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["summary", "summary_evidence", "traits", "do", "dont"],
            },

            funnel: {
              type: "object",
              additionalProperties: false,
              properties: {
                top: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: { type: "array", items: { type: "string" } },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                middle: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: { type: "array", items: { type: "string" } },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                bottom: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: { type: "array", items: { type: "string" } },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["top", "middle", "bottom"],
            },

            channels: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  platform: { type: "string" },
                  url: { type: ["string", "null"] },
                  role: { type: ["string", "null"] },
                  audience_fit: { type: ["string", "null"] },
                  channel_justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                  content_types: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        justification: { type: "string" },
                        sources: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              url: { type: "string" },
                              page_title: { type: ["string", "null"] },
                              excerpt: { type: ["string", "null"] },
                            },
                            required: ["url", "page_title", "excerpt"],
                          },
                        },
                      },
                      required: ["text", "justification", "sources"],
                    },
                  },
                  cadence_guess: { type: ["string", "null"] },
                  best_practices: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        text: { type: "string" },
                        justification: { type: "string" },
                        sources: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              url: { type: "string" },
                              page_title: { type: ["string", "null"] },
                              excerpt: { type: ["string", "null"] },
                            },
                            required: ["url", "page_title", "excerpt"],
                          },
                        },
                      },
                      required: ["text", "justification", "sources"],
                    },
                  },
                },
                required: [
                  "platform",
                  "url",
                  "role",
                  "audience_fit",
                  "channel_justification",
                  "sources",
                  "content_types",
                  "cadence_guess",
                  "best_practices",
                ],
              },
            },

            content_strategy: {
              type: "object",
              additionalProperties: false,
              properties: {
                themes: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                formats: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                hooks: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                ctas: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                cadence_guess: { type: ["string", "null"] },
                series_ideas: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["themes", "formats", "hooks", "ctas", "cadence_guess", "series_ideas"],
            },

            risks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["text", "justification", "sources"],
              },
            },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["text", "justification", "sources"],
              },
            },

            strategy_implications: {
              type: "object",
              additionalProperties: false,
              properties: {
                emulate: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                avoid: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                whitespace: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                counter_angles: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                experiments: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["emulate", "avoid", "whitespace", "counter_angles", "experiments"],
            },
            evidence: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  claim: { type: "string" },
                  sources: { type: "array", items: { type: "string" } },
                },
                required: ["claim", "sources"],
              },
            },
          },
          required: [
            "overview",
            "overview_evidence",
            "category",
            "business_model",
            "positioning",
            "positioning_evidence",
            "value_proposition",
            "value_proposition_evidence",
            "offerings",
            "audience_segments",
            "differentiators",
            "proof_points",
            "messaging",
            "tone_of_voice",
            "funnel",
            "channels",
            "content_strategy",
            "risks",
            "opportunities",
            "strategy_implications",
            "evidence",
          ],
        },
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("OpenAI returned empty output_text.");
  const parsed = JSON.parse(text);
  return CompetitorProfileSchema.parse(parsed);
}

export type SectionKey =
  | "overview"
  | "positioning"
  | "value_proposition"
  | "offerings"
  | "audience_segments"
  | "tone_of_voice"
  | "messaging"
  | "content_strategy"
  | "channels"
  | "differentiators"
  | "proof_points"
  | "funnel"
  | "strategy_implications"
  | "risks"
  | "opportunities";

const SECTION_LABELS: Record<SectionKey, { pt: string; en: string }> = {
  overview: { pt: "Visão geral", en: "Overview" },
  positioning: { pt: "Posicionamento", en: "Positioning" },
  value_proposition: { pt: "Proposta de valor", en: "Value proposition" },
  offerings: { pt: "Oferta / Produtos", en: "Offerings" },
  audience_segments: { pt: "Segmentos de audiência", en: "Audience segments" },
  tone_of_voice: { pt: "Tom de voz", en: "Tone of voice" },
  messaging: { pt: "Mensagens", en: "Messaging" },
  content_strategy: { pt: "Estratégia de conteúdo", en: "Content strategy" },
  channels: { pt: "Canais", en: "Channels" },
  differentiators: { pt: "Diferenciadores", en: "Differentiators" },
  proof_points: { pt: "Pontos de prova", en: "Proof points" },
  funnel: { pt: "Funil", en: "Funnel" },
  strategy_implications: { pt: "Implicações estratégicas", en: "Strategy implications" },
  risks: { pt: "Riscos", en: "Risks" },
  opportunities: { pt: "Oportunidades", en: "Opportunities" },
};

export async function regenerateCompetitorSectionWithOpenAI(input: {
  locale: "pt" | "en";
  competitor: { name: string; website?: string | null };
  crawl: CrawlSnapshot;
  sectionKey: SectionKey;
  currentProfile: Partial<CompetitorProfile>;
}): Promise<Partial<CompetitorProfile>> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const sectionLabel = SECTION_LABELS[input.sectionKey];

  const system =
    input.locale === "pt"
      ? "És um analista de marketing e social media. Tens de regenerar apenas uma secção específica do perfil de competidor, baseado estritamente nas fontes fornecidas."
      : "You are a marketing and social media analyst. Regenerate only a specific section of the competitor profile, based strictly on the provided sources.";

  const pages = (input.crawl.pages || []).map((p) => ({
    url: p.finalUrl || p.url,
    ok: p.ok,
    status: p.status,
    title: p.title,
    description: p.description,
    contentType: p.contentType,
    text: p.text ? String(p.text).slice(0, 6000) : null,
  }));

  // Build schema for just this section
  const sectionSchema = getSectionSchema(input.sectionKey);

  const user =
    input.locale === "pt"
      ? `Regenera APENAS a secção "${sectionLabel.pt}" do perfil do competidor, baseado nas fontes crawladas.

Regras:
- Não inventes factos. Se não houver evidência suficiente, diz de forma explícita e mantém o campo mais genérico.
- Usa evidências (com EXCERTOS do conteúdo) para suportar claims importantes.
- Para cada 'sources[]', inclui 'url' + 'page_title' (se existir) + 'excerpt' (uma frase curta COPIADA do texto crawlado).
- Não inventes excertos. O 'excerpt' tem de existir no conteúdo fornecido.
- Escreve em Português (pt-PT).
- Sê específico e útil: pensa em como isto será usado para gerar estratégia, posicionamento e plano editorial.
- Devolve APENAS a secção pedida, não o perfil completo.

Competidor:
- Nome: ${input.competitor.name}
- Website: ${input.competitor.website || ""}

Perfil atual (para contexto):
${JSON.stringify(input.currentProfile, null, 2)}

Fontes crawladas (texto extraído e metadata):
${JSON.stringify(pages)}`
      : `Regenerate ONLY the "${sectionLabel.en}" section of the competitor profile, based on crawled sources.

Rules:
- Do not fabricate facts. If evidence is insufficient, be explicit and keep fields generic.
- Use evidence (with EXCERPTS from content) to support important claims.
- For each 'sources[]', include 'url' + 'page_title' (if exists) + 'excerpt' (a short phrase COPIED from crawled text).
- Do not invent excerpts. The 'excerpt' must exist in the provided content.
- Write in English.
- Be specific and useful: think about how this will be used to generate strategy, positioning, and editorial plan.
- Return ONLY the requested section, not the full profile.

Competitor:
- Name: ${input.competitor.name}
- Website: ${input.competitor.website || ""}

Current profile (for context):
${JSON.stringify(input.currentProfile, null, 2)}

Crawled sources (extracted text + metadata):
${JSON.stringify(pages)}`;

  const response = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.4,
    text: {
      format: {
        type: "json_schema",
        name: `competitor_section_${input.sectionKey}`,
        strict: true,
        schema: sectionSchema,
      },
    },
  });

  const text = response.output_text;
  if (!text) throw new Error("OpenAI returned empty output_text.");
  const parsed = JSON.parse(text);
  return parsed;
}

function getSectionSchema(sectionKey: SectionKey): Record<string, unknown> {
  // Return the schema for just this section
  const baseSchema: Record<string, unknown> = {
    type: "object",
    additionalProperties: false,
  };

  switch (sectionKey) {
    case "overview":
      return {
        ...baseSchema,
        properties: {
          overview: { type: "string" },
          overview_evidence: {
            type: "object",
            additionalProperties: false,
            properties: {
              justification: { type: "string" },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    url: { type: "string" },
                    page_title: { type: ["string", "null"] },
                    excerpt: { type: ["string", "null"] },
                  },
                  required: ["url", "page_title", "excerpt"],
                },
              },
            },
            required: ["justification", "sources"],
          },
          category: { type: ["string", "null"] },
          business_model: { type: ["string", "null"] },
        },
        required: ["overview", "overview_evidence"],
      };
    case "positioning":
      return {
        ...baseSchema,
        properties: {
          positioning: { type: "string" },
          positioning_evidence: {
            type: "object",
            additionalProperties: false,
            properties: {
              justification: { type: "string" },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    url: { type: "string" },
                    page_title: { type: ["string", "null"] },
                    excerpt: { type: ["string", "null"] },
                  },
                  required: ["url", "page_title", "excerpt"],
                },
              },
            },
            required: ["justification", "sources"],
          },
        },
        required: ["positioning", "positioning_evidence"],
      };
    case "value_proposition":
      return {
        ...baseSchema,
        properties: {
          value_proposition: { type: "string" },
          value_proposition_evidence: {
            type: "object",
            additionalProperties: false,
            properties: {
              justification: { type: "string" },
              sources: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    url: { type: "string" },
                    page_title: { type: ["string", "null"] },
                    excerpt: { type: ["string", "null"] },
                  },
                  required: ["url", "page_title", "excerpt"],
                },
              },
            },
            required: ["justification", "sources"],
          },
        },
        required: ["value_proposition", "value_proposition_evidence"],
      };
    case "offerings":
      return {
        ...baseSchema,
        properties: {
          offerings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                description: { type: ["string", "null"] },
                target: { type: ["string", "null"] },
                price_hint: { type: ["string", "null"] },
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["name", "justification", "sources"],
            },
          },
        },
        required: ["offerings"],
      };
    case "audience_segments":
      return {
        ...baseSchema,
        properties: {
          audience_segments: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                segment: { type: "string" },
                segment_justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
                pains: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                desires: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                objections: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["segment", "segment_justification", "sources"],
            },
          },
        },
        required: ["audience_segments"],
      };
    case "tone_of_voice":
      return {
        ...baseSchema,
        properties: {
          tone_of_voice: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              summary_evidence: {
                type: "object",
                additionalProperties: false,
                properties: {
                  justification: { type: "string" },
                  sources: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        url: { type: "string" },
                        page_title: { type: ["string", "null"] },
                        excerpt: { type: ["string", "null"] },
                      },
                      required: ["url", "page_title", "excerpt"],
                    },
                  },
                },
                required: ["justification", "sources"],
              },
              traits: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              do: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              dont: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
            },
            required: ["summary", "summary_evidence"],
          },
        },
        required: ["tone_of_voice"],
      };
    case "messaging":
      return {
        ...baseSchema,
        properties: {
          messaging: {
            type: "object",
            additionalProperties: false,
            properties: {
              keywords: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              pillars: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              tagline_examples: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
            },
            required: ["keywords", "pillars", "tagline_examples"],
          },
        },
        required: ["messaging"],
      };
    case "content_strategy":
      return {
        ...baseSchema,
        properties: {
          content_strategy: {
            type: "object",
            additionalProperties: false,
            properties: {
              themes: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              formats: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              hooks: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              ctas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              cadence_guess: { type: ["string", "null"] },
              series_ideas: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
            },
            required: ["themes", "formats", "hooks", "ctas", "series_ideas"],
          },
        },
        required: ["content_strategy"],
      };
    case "channels":
      return {
        ...baseSchema,
        properties: {
          channels: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                platform: { type: "string" },
                url: { type: ["string", "null"] },
                role: { type: ["string", "null"] },
                audience_fit: { type: ["string", "null"] },
                channel_justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
                content_types: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
                cadence_guess: { type: ["string", "null"] },
                best_practices: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      text: { type: "string" },
                      justification: { type: "string" },
                      sources: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            url: { type: "string" },
                            page_title: { type: ["string", "null"] },
                            excerpt: { type: ["string", "null"] },
                          },
                          required: ["url", "page_title", "excerpt"],
                        },
                      },
                    },
                    required: ["text", "justification", "sources"],
                  },
                },
              },
              required: ["platform", "channel_justification", "sources"],
            },
          },
        },
        required: ["channels"],
      };
    case "differentiators":
      return {
        ...baseSchema,
        properties: {
          differentiators: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["text", "justification", "sources"],
            },
          },
        },
        required: ["differentiators"],
      };
    case "proof_points":
      return {
        ...baseSchema,
        properties: {
          proof_points: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                point: { type: "string" },
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["point", "justification", "sources"],
            },
          },
        },
        required: ["proof_points"],
      };
    case "funnel":
      return {
        ...baseSchema,
        properties: {
          funnel: {
            type: "object",
            additionalProperties: false,
            properties: {
              top: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              middle: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              bottom: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
            },
            required: ["top", "middle", "bottom"],
          },
        },
        required: ["funnel"],
      };
    case "strategy_implications":
      return {
        ...baseSchema,
        properties: {
          strategy_implications: {
            type: "object",
            additionalProperties: false,
            properties: {
              emulate: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              avoid: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              whitespace: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              counter_angles: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
              experiments: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    justification: { type: "string" },
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          url: { type: "string" },
                          page_title: { type: ["string", "null"] },
                          excerpt: { type: ["string", "null"] },
                        },
                        required: ["url", "page_title", "excerpt"],
                      },
                    },
                  },
                  required: ["text", "justification", "sources"],
                },
              },
            },
            required: ["emulate", "avoid", "whitespace", "counter_angles", "experiments"],
          },
        },
        required: ["strategy_implications"],
      };
    case "risks":
      return {
        ...baseSchema,
        properties: {
          risks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["text", "justification", "sources"],
            },
          },
        },
        required: ["risks"],
      };
    case "opportunities":
      return {
        ...baseSchema,
        properties: {
          opportunities: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                justification: { type: "string" },
                sources: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      url: { type: "string" },
                      page_title: { type: ["string", "null"] },
                      excerpt: { type: ["string", "null"] },
                    },
                    required: ["url", "page_title", "excerpt"],
                  },
                },
              },
              required: ["text", "justification", "sources"],
            },
          },
        },
        required: ["opportunities"],
      };
    default:
      throw new Error(`Unknown section key: ${sectionKey}`);
  }
}

