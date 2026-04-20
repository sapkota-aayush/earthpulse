import { NextRequest, NextResponse } from "next/server";
import {
  getRelatedReadingForDeadZone,
  type DeadZoneReadingContext,
  type RelatedArticle,
} from "@/lib/deadZoneRelatedReading";

type ReadingBody = DeadZoneReadingContext & {
  category?: string;
  culprit?: string;
  tagline?: string;
};

type ReadingResponse = {
  source: "gemini" | "anthropic" | "offline";
  links: RelatedArticle[];
};

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const GEMINI_API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

function hostnameSource(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return "Web";
  }
}

/** Pull real page URLs from Gemini + Google Search grounding metadata. */
function linksFromGrounding(raw: unknown): RelatedArticle[] {
  const candidates = (raw as { candidates?: unknown[] })?.candidates;
  const first = candidates?.[0] as Record<string, unknown> | undefined;
  const meta = (first?.groundingMetadata ?? first?.grounding_metadata) as Record<string, unknown> | undefined;
  const chunks = (meta?.groundingChunks ?? meta?.grounding_chunks) as unknown[] | undefined;
  if (!Array.isArray(chunks)) return [];

  const out: RelatedArticle[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const web = (chunk as { web?: { uri?: string; title?: string } })?.web;
    const uri = web?.uri?.trim();
    if (!uri || !uri.startsWith("https://")) continue;
    if (seen.has(uri)) continue;
    seen.add(uri);
    const title = (web?.title ?? hostnameSource(uri)).trim().slice(0, 220) || hostnameSource(uri);
    out.push({
      title,
      url: uri,
      source: hostnameSource(uri),
    });
  }

  return out.slice(0, 10);
}

function buildSearchPrompt(z: ReadingBody): string {
  return `You are helping readers find trustworthy follow-up reading about a mapped environmental or humanitarian stress site.

Use Google Search. In 3–5 short sentences (plain text, no markdown), summarize what reputable English-language sources report about this case: what happened, where, roughly when, and who or what is implicated. Lean on major wires and newspapers, UN or relief agencies, NASA Earth Observatory where relevant, and encyclopedia pages when they help.

Incident card:
- Name: ${z.name}
- Country / region: ${z.country}
- Category: ${z.category ?? "unknown"}
- Peak / anchor year: ${z.yearOfDamage}
- Mechanism / culprit line: ${z.culprit ?? "n/a"}
- Tagline: ${z.tagline ?? "n/a"}

Your sentences should cite themes that match the search results you receive (the interface will attach source links for the user). Do not invent URLs in the prose; the UI lists sources separately from search grounding.`;
}

function mergeLinks(grounded: RelatedArticle[], offline: RelatedArticle[]): RelatedArticle[] {
  const seen = new Set<string>();
  const out: RelatedArticle[] = [];
  for (const a of grounded) {
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
  }
  for (const a of offline) {
    if (out.length >= 8) break;
    if (seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
  }
  return out;
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const inner = fence ? fence[1].trim() : t;
  try {
    return JSON.parse(inner) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildAnthropicPrompt(z: ReadingBody): string {
  return `You are helping readers find trustworthy follow-up links for an environmental incident.

Return strict JSON only:
{
  "links": [
    { "title": "string", "url": "https://...", "source": "domain or publisher name" }
  ]
}

Rules:
- Return 3 to 6 links only.
- Use only https URLs.
- Prefer reputable sources (Reuters, AP, BBC, major newspapers, UN/WHO/NASA, encyclopedias).
- If unsure, return fewer links rather than guessing.

Incident:
- Name: ${z.name}
- Country / region: ${z.country}
- Category: ${z.category ?? "unknown"}
- Anchor year: ${z.yearOfDamage}
- Culprit/mechanism line: ${z.culprit ?? "n/a"}
- Tagline: ${z.tagline ?? "n/a"}`;
}

async function linksFromAnthropic(z: ReadingBody): Promise<RelatedArticle[]> {
  if (!ANTHROPIC_API_KEY) return [];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 900,
      temperature: 0.2,
      messages: [{ role: "user", content: buildAnthropicPrompt(z) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const raw = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = raw?.content?.find((c) => c?.type === "text")?.text;
  if (!text) return [];
  const parsed = parseJsonFromText(text);
  if (!parsed) return [];

  const list = Array.isArray(parsed.links) ? parsed.links : [];
  const seen = new Set<string>();
  const out: RelatedArticle[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as { title?: unknown; url?: unknown; source?: unknown };
    const url = String(row.url ?? "").trim();
    if (!url.startsWith("https://") || seen.has(url)) continue;
    seen.add(url);
    out.push({
      title: String(row.title ?? hostnameSource(url)).slice(0, 220) || hostnameSource(url),
      url,
      source: String(row.source ?? hostnameSource(url)).slice(0, 120) || hostnameSource(url),
    });
    if (out.length >= 8) break;
  }

  return out;
}

export async function POST(req: NextRequest): Promise<NextResponse<ReadingResponse>> {
  const body = (await req.json()) as ReadingBody;
  const ctx: DeadZoneReadingContext = {
    id: body.id,
    name: body.name,
    country: body.country,
    yearOfDamage: body.yearOfDamage,
  };
  const offline = getRelatedReadingForDeadZone(ctx);

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ source: "offline", links: offline });
  }

  const prompt = buildSearchPrompt(body);
  const baseBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 900,
    },
  };
  const toolVariants: unknown[] = [[{ googleSearch: {} }], [{ google_search: {} }]];

  try {
    let response: Response | null = null;
    for (const tools of toolVariants) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...baseBody, tools }),
        }
      );
      if (r.ok) {
        response = r;
        break;
      }
      const errText = await r.text().catch(() => r.statusText);
      console.warn("[dead-zone-reading] Gemini attempt failed:", r.status, errText.slice(0, 280));
    }

    if (!response?.ok) {
      if (ANTHROPIC_API_KEY) {
        try {
          const anthropicLinks = await linksFromAnthropic(body);
          if (anthropicLinks.length > 0) {
            return NextResponse.json({
              source: "anthropic",
              links: mergeLinks(anthropicLinks, offline),
            });
          }
        } catch (anthropicErr) {
          console.error("[dead-zone-reading] Anthropic fallback failed:", anthropicErr);
        }
      }
      return NextResponse.json({ source: "offline", links: offline });
    }

    const raw = await response.json();
    const grounded = linksFromGrounding(raw);

    if (grounded.length >= 1) {
      return NextResponse.json({
        source: "gemini",
        links: mergeLinks(grounded, offline),
      });
    }

    if (ANTHROPIC_API_KEY) {
      try {
        const anthropicLinks = await linksFromAnthropic(body);
        if (anthropicLinks.length > 0) {
          return NextResponse.json({
            source: "anthropic",
            links: mergeLinks(anthropicLinks, offline),
          });
        }
      } catch (anthropicErr) {
        console.error("[dead-zone-reading] Anthropic fallback failed:", anthropicErr);
      }
    }
    return NextResponse.json({ source: "offline", links: offline });
  } catch (e) {
    console.error("[dead-zone-reading]", e);
    if (ANTHROPIC_API_KEY) {
      try {
        const anthropicLinks = await linksFromAnthropic(body);
        if (anthropicLinks.length > 0) {
          return NextResponse.json({
            source: "anthropic",
            links: mergeLinks(anthropicLinks, offline),
          });
        }
      } catch (anthropicErr) {
        console.error("[dead-zone-reading] Anthropic fallback failed:", anthropicErr);
      }
    }
    return NextResponse.json({ source: "offline", links: offline });
  }
}
