import { NextRequest, NextResponse } from "next/server";
import type { PlaceResearchPayload } from "@/lib/placeResearchTypes";

type Body = {
  name?: string;
  lat?: number;
  lon?: number;
  score?: number;
  aqiLabel?: string;
  greenCover?: number;
  population?: number;
  concretePercent?: number;
  contextThreadId?: string;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const OPENAI_RESEARCH_MODEL = process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4o";
const BACKBOARD_BASE_URL = "https://app.backboard.io/api";
const BACKBOARD_PLACE_ASSISTANT_ID = process.env.BACKBOARD_PLACE_ASSISTANT_ID?.trim();
let backboardAssistantCache: string | null = null;

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

/** Walk OpenAI Responses API `output` for the assistant message text. */
function extractResponsesOutputText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const out = (data as { output?: unknown }).output;
  if (!Array.isArray(out)) return null;
  for (const item of out) {
    if (!item || typeof item !== "object") continue;
    const o = item as { type?: string; content?: unknown; role?: string };
    if (o.type !== "message" || o.role === "user") continue;
    const content = o.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      const p = c as { type?: string; text?: string };
      if (typeof p.text === "string" && p.text.trim()) {
        if (!p.type || p.type === "output_text") return p.text;
      }
    }
  }
  return null;
}

type NewsSnip = { title: string; url: string };

/** Citations from web_search — use when model JSON omits newsSnippets. */
function extractUrlCitations(data: unknown): NewsSnip[] {
  const acc: NewsSnip[] = [];
  if (!data || typeof data !== "object") return acc;
  const out = (data as { output?: unknown }).output;
  if (!Array.isArray(out)) return acc;
  for (const item of out) {
    if (!item || typeof item !== "object") continue;
    const o = item as { type?: string; content?: unknown };
    if (o.type !== "message") continue;
    const content = o.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      const anns = (c as { annotations?: unknown }).annotations;
      if (!Array.isArray(anns)) continue;
      for (const a of anns) {
        if (!a || typeof a !== "object") continue;
        const t = (a as { type?: string }).type;
        if (t !== "url_citation") continue;
        const url = String((a as { url?: string }).url ?? "");
        const title = String((a as { title?: string }).title ?? "Source");
        if (url.startsWith("http")) acc.push({ title, url });
      }
    }
  }
  return acc;
}

function coercePayload(
  parsed: Record<string, unknown>,
  source: "backboard" | "openai" | "gemini",
  contextThreadId?: string
): PlaceResearchPayload | null {
  const shortTerm = Array.isArray(parsed.shortTerm) ? parsed.shortTerm.map(String).filter(Boolean).slice(0, 3) : [];
  const longTerm = Array.isArray(parsed.longTerm) ? parsed.longTerm.map(String).filter(Boolean).slice(0, 3) : [];
  const products = Array.isArray(parsed.productIdeas)
    ? parsed.productIdeas.slice(0, 2).map((p: Record<string, unknown>) => ({
        name: String(p.name ?? ""),
        why: String(p.why ?? ""),
      }))
    : [];
  const foundations = Array.isArray(parsed.foundations)
    ? parsed.foundations.slice(0, 2).map((f: Record<string, unknown>) => ({
        name: String(f.name ?? ""),
        why: String(f.why ?? ""),
        url: String(f.url ?? "https://www.google.com"),
      }))
    : [];
  const newsSnippets = Array.isArray(parsed.newsSnippets)
    ? parsed.newsSnippets
        .slice(0, 4)
        .map((n: Record<string, unknown>) => ({
          title: String(n.title ?? "Source"),
          url: String(n.url ?? ""),
        }))
        .filter((n) => n.url.startsWith("http"))
    : undefined;
  if (!parsed.localProblem || !parsed.problemContext) return null;
  if (shortTerm.length === 0 || longTerm.length === 0) return null;
  if (products.length < 1 || foundations.length < 1) return null;
  return {
    source,
    localProblem: String(parsed.localProblem),
    problemContext: String(parsed.problemContext),
    shortTerm,
    longTerm,
    productIdeas: products,
    foundations,
    disclaimer: String(parsed.disclaimer ?? ""),
    ...(contextThreadId ? { contextThreadId } : {}),
    ...(newsSnippets?.length ? { newsSnippets } : {}),
  };
}

type BackboardHeaders = {
  "Content-Type": string;
  "X-API-Key": string;
};

function buildBackboardHeaders(apiKey: string, contentType = "application/json"): BackboardHeaders {
  return {
    "Content-Type": contentType,
    "X-API-Key": apiKey,
  };
}

async function ensureBackboardAssistantId(apiKey: string): Promise<string | null> {
  if (BACKBOARD_PLACE_ASSISTANT_ID) return BACKBOARD_PLACE_ASSISTANT_ID;
  if (backboardAssistantCache) return backboardAssistantCache;

  try {
    const res = await fetch(`${BACKBOARD_BASE_URL}/assistants`, {
      method: "POST",
      headers: buildBackboardHeaders(apiKey),
      body: JSON.stringify({
        name: "EarthPulse Place Research",
        system_prompt:
          "You are EarthPulse's persistent local climate research assistant. Respond in concise US English. Return strict JSON when requested.",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { assistant_id?: string };
    const id = typeof data.assistant_id === "string" ? data.assistant_id : null;
    if (!id) return null;
    backboardAssistantCache = id;
    return id;
  } catch {
    return null;
  }
}

function extractBackboardText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const top = data as { content?: unknown; messages?: unknown };
  if (typeof top.content === "string" && top.content.trim()) return top.content;
  if (Array.isArray(top.messages)) {
    for (const m of top.messages) {
      if (!m || typeof m !== "object") continue;
      const msg = m as { role?: unknown; content?: unknown };
      if (msg.role === "assistant" && typeof msg.content === "string" && msg.content.trim()) return msg.content;
    }
  }
  return null;
}

function extractBackboardNewsSnippets(text: string): NewsSnip[] {
  const urls = Array.from(text.matchAll(/https?:\/\/[^\s)"\]}>,]+/g)).map((m) => m[0]);
  const seen = new Set<string>();
  const out: NewsSnip[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    let title = "Source";
    try {
      const host = new URL(u).hostname.replace(/^www\./, "");
      title = host;
    } catch {
      title = "Source";
    }
    out.push({ title, url: u });
    if (out.length >= 4) break;
  }
  return out;
}

async function createBackboardThread(apiKey: string, assistantId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKBOARD_BASE_URL}/assistants/${assistantId}/threads`, {
      method: "POST",
      headers: buildBackboardHeaders(apiKey),
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thread_id?: string };
    return typeof data.thread_id === "string" ? data.thread_id : null;
  } catch {
    return null;
  }
}

async function tryBackboardResearch(body: Body): Promise<PlaceResearchPayload | null> {
  const apiKey = process.env.BACKBOARD_API_KEY?.trim();
  if (!apiKey) return null;

  const assistantId = await ensureBackboardAssistantId(apiKey);
  if (!assistantId) return null;

  const threadId = body.contextThreadId?.trim() || (await createBackboardThread(apiKey, assistantId));
  if (!threadId) return null;

  const place = body.name ?? "Unknown place";
  const metrics = `Known local signals: health score ${body.score ?? "n/a"}/100, AQI ${body.aqiLabel ?? "n/a"}, green cover ${body.greenCover ?? "n/a"}%, concrete ${body.concretePercent ?? "n/a"}%, population ${body.population ?? "n/a"}, coordinates lat ${body.lat ?? "?"}, lon ${body.lon ?? "?"}.`;
  const prompt = `EarthPulse place research request for: ${place}. ${metrics}

Return STRICT JSON only (no markdown fences):
{
  "localProblem": "max 12 words",
  "problemContext": "max 2 short sentences",
  "shortTerm": ["exactly 3 short actions for this month"],
  "longTerm": ["exactly 3 short actions for 6-24 months"],
  "productIdeas": [{"name":"short","why":"max 14 words"}],
  "foundations": [{"name":"short","why":"max 16 words","url":"https://..."}],
  "newsSnippets": [{"title":"short","url":"https://..."}],
  "disclaimer": "one sentence reminding to verify local conditions"
}

Rules:
- Use clear US English only.
- Keep advice practical and local.
- Use web search when useful for recency.
- Prefer trustworthy organizations and real https links.
- No extra keys, no prose outside JSON.`;

  const params = new URLSearchParams();
  params.set("content", prompt);
  params.set("stream", "false");
  params.set("memory", "Auto");
  params.set("web_search", "Auto");

  try {
    const response = await fetch(`${BACKBOARD_BASE_URL}/threads/${threadId}/messages`, {
      method: "POST",
      headers: buildBackboardHeaders(apiKey, "application/x-www-form-urlencoded"),
      body: params.toString(),
    });
    if (!response.ok) return null;
    const raw = await response.json();
    const text = extractBackboardText(raw);
    if (!text) return null;
    const parsed = parseJsonFromText(text);
    if (!parsed) return null;
    const coerced = coercePayload(parsed, "backboard", threadId);
    if (!coerced) return null;
    if ((!coerced.newsSnippets || coerced.newsSnippets.length === 0) && text.includes("http")) {
      const newsSnippets = extractBackboardNewsSnippets(text);
      if (newsSnippets.length > 0) return { ...coerced, newsSnippets };
    }
    return coerced;
  } catch {
    return null;
  }
}

async function tryOpenAiResearch(body: Body): Promise<PlaceResearchPayload | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const place = body.name ?? "Unknown place";
  const metrics = `Satellite-style signals we already have: health score ${body.score ?? "n/a"}/100, AQI ${body.aqiLabel ?? "n/a"}, tree/green cover ~${body.greenCover ?? "n/a"}%, concrete-heavy estimate ~${body.concretePercent ?? "n/a"}%, population ~${body.population ?? "n/a"}. Coordinates lat ${body.lat}, lon ${body.lon}.`;

  const instruction = `You are EarthPulse's field researcher. Use the web_search tool to pull RECENT credible reporting (roughly last 12–18 months when possible) about environment and climate pressures for: ${place}. ${metrics}

Rules:
- ALL output in clear English (US) only — no Arabic or other scripts.
- Be concise: citizens want to know the problem, then what they can do.
- After searching, reply with ONE JSON object only (no markdown fences), keys:
  "localProblem": string max 14 words,
  "problemContext": string max 3 short sentences tying web findings + metrics to daily life,
  "shortTerm": array of 3 strings (this month, max 20 words each),
  "longTerm": array of 3 strings (6–24 months, max 22 words each),
  "productIdeas": exactly 2 objects {"name","why"} — ethical everyday buys with no medical claims,
  "foundations": exactly 2 objects {"name","why","url"} — real https links (NGOs, funds, or reputable portals),
  "newsSnippets": up to 4 objects {"title","url"} from sources you actually used in search,
  "disclaimer": one sentence that news moves fast and people should verify before donating.

Do not invent URLs: only newsSnippets and foundations URLs you believe are real from search.`;

  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 110_000);
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_RESEARCH_MODEL,
        tools: [{ type: "web_search", search_context_size: "medium" }],
        input: instruction,
      }),
      signal: ac.signal,
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const data = await res.json();
    const text = extractResponsesOutputText(data);
    if (!text) return null;
    const parsed = parseJsonFromText(text);
    if (!parsed) return null;
    const coerced = coercePayload(parsed, "openai");
    if (!coerced) return null;
    const cites = extractUrlCitations(data);
    if ((!coerced.newsSnippets || coerced.newsSnippets.length === 0) && cites.length > 0) {
      const seen = new Set<string>();
      const merged: NewsSnip[] = [];
      for (const c of cites) {
        if (seen.has(c.url)) continue;
        seen.add(c.url);
        merged.push(c);
        if (merged.length >= 4) break;
      }
      return { ...coerced, newsSnippets: merged };
    }
    return coerced;
  } catch {
    return null;
  }
}

async function tryGeminiResearch(body: Body): Promise<PlaceResearchPayload | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You help citizens understand ONE environmental pressure near a place and what small contributions do.

CRITICAL LANGUAGE RULE: Every string value in the JSON MUST be written in clear English (US). Never use Arabic, Hebrew, Hindi, Chinese, or any non-Latin script — even if coordinates or place names suggest another region. Keep Latin script only.

CRITICAL TONE: Short, plain, encouraging. No jargon walls. No fake URLs.

Place: ${body.name ?? "Unknown"} | lat ${body.lat ?? "?"} lon ${body.lon ?? "?"}
Signals: health score ${body.score ?? "n/a"}/100, AQI ${body.aqiLabel ?? "n/a"}, green cover ${body.greenCover ?? "n/a"}%, concrete ${body.concretePercent ?? "n/a"}%, population ${body.population ?? "n/a"}.

Pick ONE primary local-scale problem people should care about (examples: forest loss / fragmentation, sprawl on farmland, air pollution episodes, drought & water, flooding, waste). Name it in everyday language.

Return STRICT JSON only:
{
  "localProblem": "max 12 words, headline",
  "problemContext": "max 2 short sentences: what is going wrong and why it matters to residents",
  "shortTerm": ["2-3 bullets, each max 18 words — things this month"],
  "longTerm": ["2-3 bullets, each max 18 words — habits or civic moves over 6-24 months"],
  "productIdeas": [{"name":"short","why":"max 14 words"}],
  "foundations": [{"name":"short","why":"max 16 words","url":"https://..."}],
  "disclaimer": "one short sentence: themes are indicative; verify locally"
}

Exactly 2 productIdeas and 2 foundations. https URLs only.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.22,
            maxOutputTokens: 720,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!response.ok) return null;
    const raw = await response.json();
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof text === "string" ? JSON.parse(text) : null;
    if (!parsed || typeof parsed !== "object") return null;
    return coercePayload(parsed as Record<string, unknown>, "gemini");
  } catch {
    return null;
  }
}

function fallbackResearch(body: Body): PlaceResearchPayload {
  const place = body.name?.trim() || "This area";
  const short = place.split(",")[0]?.trim() ?? place;
  const gc = body.greenCover ?? 22;
  const conc = body.concretePercent ?? 35;
  const aqi = (body.aqiLabel ?? "").toLowerCase();

  const forestAngle = gc < 20 || (gc < 28 && conc > 42);

  if (forestAngle) {
    return {
      source: "fallback",
      localProblem: "Green space and tree cover are stretched thin",
      problemContext: `In and around ${short}, similar regions often see patchy forests and hedgerows replaced by roads and buildings — not always dramatic “clear cuts,” but steady loss that adds heat, runoff, and weaker habitat. Regional reporting on land use and forest fragmentation often flags this pattern. Verify what is happening locally with your town or conservation group.`,
      shortTerm: [
        "Join one weekend tree-planting or invasive-species pull if a group posts it nearby.",
        "Shift one routine trip under 3 km from car to walk, bike, or bus — less pressure on roads at the edge of green belts.",
        "Donate to a vetted local land trust that buys or easements small parcels before they flip to sprawl.",
      ],
      longTerm: [
        "Show up for public hearings on zoning that touches forest edges or floodplains — steady voices change outcomes.",
        "Elect and fund leaders who protect buffers around parks and rivers; fragmentation is a policy problem as much as a personal one.",
        "If you own land, leave a corner wild or plant native species that feed pollinators year after year.",
      ],
      productIdeas: [
        { name: "Native seed mix (local ecotype)", why: "Restores pockets of habitat even in small yards." },
        { name: "Reusable water bottle + filter", why: "Cuts plastic waste that often ends up in watersheds near forests." },
      ],
      foundations: [
        { name: "One Tree Planted", why: "Funds replanting projects you can match to region.", url: "https://onetreeplanted.org/" },
        {
          name: `Conservation near ${short}`,
          why: "Search for a land trust or friends-of-park group tied to your watershed.",
          url: `https://www.google.com/search?q=land+trust+${encodeURIComponent(short)}`,
        },
      ],
      disclaimer:
        "Offline brief — add OPENAI_API_KEY for live web search + latest headlines, or verify with local news.",
    };
  }

  if (aqi.includes("poor") || aqi.includes("very")) {
    return {
      source: "fallback",
      localProblem: "Breathable air is the urgent stress here",
      problemContext: `Air quality reads as ${body.aqiLabel ?? "elevated"} for ${short}. Many cities see winter inversions or summer ozone that hit children and elders first. Small cuts to combustion near you — traffic, wood smoke, idling — stack up when neighbors do them together.`,
      shortTerm: [
        "Skip two short car trips this week; combine errands into one loop.",
        "On hazy days, close windows during rush hour and run a cheap HEPA in one bedroom.",
        "Report chronic idling or illegal burning if your city has a non-emergency line.",
      ],
      longTerm: [
        "Back transit and school-bus electrification — those budgets move on public pressure.",
        "Plant street trees or lobby for shade on sidewalks; heat and smog both get worse without canopy.",
        "Choose landlords or employers who maintain HVAC filters — indoor air matters on bad days.",
      ],
      productIdeas: [
        { name: "Portable HEPA air cleaner", why: "One room with clean air on smoke or ozone days." },
        { name: "Bike lights + visible jacket", why: "Makes leaving the car behind feel safer." },
      ],
      foundations: [
        { name: "Clean Air Task Force", why: "Pushes power-sector rules that clean air for millions.", url: "https://www.catf.us/" },
        {
          name: "Local air-quality nonprofit",
          why: "Search your city for groups that monitor PM2.5 and lobby locally.",
          url: `https://www.google.com/search?q=air+quality+nonprofit+${encodeURIComponent(short)}`,
        },
      ],
      disclaimer: "Offline brief — add OPENAI_API_KEY for live web search. Check official AQI for your area.",
    };
  }

  return {
    source: "fallback",
    localProblem: "Everyday choices add up where you live",
    problemContext: `${short} sits in a mixed urban footprint: energy, food, and how we move still drive most local footprint. The point is not guilt — it is that many small shifts, repeated, bend the curve when a whole block tries them.`,
    shortTerm: [
      "Try one car-free day a week for errands under 5 km.",
      "Raise cooling setpoint 1–2 °C and use fans first.",
      "Cook one more plant-forward meal than last week.",
    ],
    longTerm: [
      "Retrofit insulation when you can — it locks in comfort with less energy for years.",
      "Vote and budget for clean power, transit, and parks; infrastructure beats one-off heroics.",
      "Keep learning one issue deeply (water, waste, or transport) and advocate with neighbors.",
    ],
    productIdeas: [
      { name: "LED bulbs + smart plug", why: "Cheap wins on phantom load and lighting." },
      { name: "Sturdy grocery pannier", why: "Makes walking or biking for food realistic." },
    ],
    foundations: [
      { name: "Climate Justice Alliance", why: "Grassroots hubs linking equity and environment.", url: "https://climatejusticealliance.org/" },
      {
        name: "Community fridge / mutual aid",
        why: "Search your neighbourhood — resilience is local.",
        url: `https://www.google.com/search?q=community+fridge+${encodeURIComponent(short)}`,
      },
    ],
    disclaimer: "Offline brief — add OPENAI_API_KEY for web-grounded research.",
  };
}

function placeResearchUsesGeminiFallback(): boolean {
  const v = process.env.PLACE_RESEARCH_USE_GEMINI?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;

  const backboard = await tryBackboardResearch(body);
  if (backboard) return NextResponse.json(backboard);

  const openai = await tryOpenAiResearch(body);
  if (openai) return NextResponse.json(openai);

  if (placeResearchUsesGeminiFallback()) {
    const gemini = await tryGeminiResearch(body);
    if (gemini) return NextResponse.json(gemini);
  }

  return NextResponse.json(fallbackResearch(body));
}
