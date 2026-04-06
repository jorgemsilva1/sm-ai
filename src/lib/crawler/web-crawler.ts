export type CrawlPage = {
  url: string;
  finalUrl: string;
  status: number | null;
  ok: boolean;
  contentType: string | null;
  title: string | null;
  description: string | null;
  text: string | null;
  links: string[];
  images: string[];
  error: string | null;
};

export type CrawlSnapshot = {
  startedAtISO: string;
  finishedAtISO: string;
  pages: CrawlPage[];
};

type CrawlOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxTextChars?: number;
  userAgent?: string;
  onPageCrawled?: (info: { done: number; total: number; page: CrawlPage }) => void | Promise<void>;
};

function uniqueStrings(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = String(v || "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function normalizeToHttpUrl(raw: string) {
  const v = String(raw || "").trim();
  if (!v) return null;
  try {
    const u = new URL(v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function splitUrls(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((p) => normalizeToHttpUrl(p)).filter(Boolean) as string[];
}

function decodeHtmlEntities(input: string) {
  // Minimal decode (good enough for crawling summaries without extra deps)
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const withBreaks = withoutScripts
    .replace(/<(br|br\/)\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, "\n");

  const noTags = withBreaks.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(noTags);
  return decoded.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function extractTitle(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const t = stripHtmlToText(m[1]);
  return t ? t.slice(0, 200) : null;
}

function extractMetaDescription(html: string) {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(String(m[1]).trim()).slice(0, 400);
  }
  return null;
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = String(m[1] || "").trim();
    if (!href) continue;
    if (href.startsWith("#")) continue;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const u = new URL(href, baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      links.push(u.toString());
    } catch {
      // ignore
    }
  }
  return uniqueStrings(links).slice(0, 200);
}

function extractImages(html: string, baseUrl: string) {
  const images: string[] = [];

  const metaPatterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
  ];
  for (const re of metaPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      const raw = String(m[1] || "").trim();
      if (!raw) continue;
      try {
        const u = new URL(raw, baseUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") continue;
        images.push(u.toString());
      } catch {
        // ignore
      }
    }
  }

  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;
    if (raw.startsWith("data:")) continue;
    try {
      const u = new URL(raw, baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      images.push(u.toString());
    } catch {
      // ignore
    }
  }

  return uniqueStrings(images).slice(0, 60);
}

async function fetchWithTimeout(url: string, timeoutMs: number, userAgent: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlUrl(inputUrl: string, options: CrawlOptions = {}): Promise<CrawlPage> {
  const url = normalizeToHttpUrl(inputUrl);
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxBytes = options.maxBytes ?? 1_500_000;
  const maxTextChars = options.maxTextChars ?? 20_000;
  const userAgent = options.userAgent ?? "sm-ai-crawler/1.0 (+https://example.invalid)";

  if (!url) {
    return {
      url: String(inputUrl),
      finalUrl: String(inputUrl),
      status: null,
      ok: false,
      contentType: null,
      title: null,
      description: null,
      text: null,
      links: [],
      images: [],
      error: "Invalid URL",
    };
  }

  try {
    const res = await fetchWithTimeout(url, timeoutMs, userAgent);
    const contentType = res.headers.get("content-type");

    // limit bytes
    const buf = await res.arrayBuffer();
    const limited = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
    const text = new TextDecoder("utf-8", { fatal: false }).decode(limited);

    const isHtml = (contentType || "").toLowerCase().includes("text/html") || /<\/html>/i.test(text);

    const title = isHtml ? extractTitle(text) : null;
    const description = isHtml ? extractMetaDescription(text) : null;
    const links = isHtml ? extractLinks(text, res.url || url) : [];
    const images = isHtml ? extractImages(text, res.url || url) : [];
    const plain = isHtml ? stripHtmlToText(text) : text.trim();

    return {
      url,
      finalUrl: res.url || url,
      status: res.status,
      ok: res.ok,
      contentType,
      title,
      description,
      text: plain ? plain.slice(0, maxTextChars) : null,
      links,
      images,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      url,
      finalUrl: url,
      status: null,
      ok: false,
      contentType: null,
      title: null,
      description: null,
      text: null,
      links: [],
      images: [],
      error: msg,
    };
  }
}

export async function crawlManyUrls(urls: string[], options: CrawlOptions = {}): Promise<CrawlSnapshot> {
  const startedAtISO = new Date().toISOString();
  const unique = uniqueStrings(urls.map((u) => normalizeToHttpUrl(u)).filter(Boolean) as string[]);

  // small concurrency without deps
  const concurrency = 4;
  const pages: CrawlPage[] = [];
  let idx = 0;
  let done = 0;
  const total = unique.length;

  async function worker() {
    while (idx < unique.length) {
      const my = unique[idx];
      idx += 1;
      const page = await crawlUrl(my, options);
      pages.push(page);
      done += 1;
      if (options.onPageCrawled) {
        await options.onPageCrawled({ done, total, page });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  const finishedAtISO = new Date().toISOString();
  return { startedAtISO, finishedAtISO, pages };
}

export function collectCompetitorUrls(competitor: {
  website?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  x?: string | null;
}) {
  const urls = [
    ...splitUrls(competitor.website),
    ...splitUrls(competitor.instagram),
    ...splitUrls(competitor.tiktok),
    ...splitUrls(competitor.facebook),
    ...splitUrls(competitor.youtube),
    ...splitUrls(competitor.linkedin),
    ...splitUrls(competitor.x),
  ];
  return uniqueStrings(urls);
}

