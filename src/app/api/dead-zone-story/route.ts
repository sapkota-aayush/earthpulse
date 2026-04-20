import { NextRequest, NextResponse } from "next/server";

// ── Types ────────────────────────────────────────────────────────────────────

type DeadZoneBody = {
  id: string;
  name: string;
  country: string;
  category: string;
  culprit: string;
  yearOfDamage: number;
  tagline: string;
  casualties?: number;
  areaKm2?: number;
};

type StoryResponse = {
  story: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest";

// Support both the project-standard key name and the one specified in the task.
const GEMINI_API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(z: DeadZoneBody): string {
  const area = z.areaKm2 != null ? `${z.areaKm2.toLocaleString()} km²` : null;
  const casualties = z.casualties != null ? z.casualties.toLocaleString() : null;

  return `You are an investigative journalist who covers environmental crime. Your prose is precise, cold, and specific — in the tradition of long-form true crime. You name names. You use exact locations. You do not moralize or end with calls to action.

Write a 200–300 word narrative about the following environmental dead zone. Use three paragraphs separated by a single blank line. No markdown, no headers, no bullet points — plain prose only.

Paragraph 1 — WHAT HAPPENED: The visceral, specific facts. When, where, what collapsed or died, how fast. Draw the scene so the reader can picture the ground under their feet.

Paragraph 2 — WHO DID IT AND WHY: Name the culprit and their motive — money, ideology, negligence, regulatory capture, or some combination. Be specific about the mechanism of destruction.

Paragraph 3 — WHAT IT LOOKS LIKE TODAY: Describe what satellite imagery and boots-on-ground observers would see right now. Use present tense. What remains. What is absent. Whether anything is trying to come back.

Dead zone details:
- Name: ${z.name}
- Country: ${z.country}
- Category: ${z.category}
- Primary culprit: ${z.culprit}
- Year damage peaked or began: ${z.yearOfDamage}
- Tagline: ${z.tagline}${area ? `\n- Affected area: ${area}` : ""}${casualties ? `\n- Casualties / deaths: ${casualties}` : ""}

Tone rules:
- Investigative journalist, not textbook author, not charity appeal.
- No platitudes. No "we must do better." No "the world watched in horror."
- Specific nouns over vague abstractions. Real company names, government agencies, river names, species.
- Present tense for current state. Past tense for events.
- Output only the three paragraphs. Nothing else.`;
}

// ── Fallback story (no API key) ──────────────────────────────────────────────

function buildFallbackStory(z: DeadZoneBody): string {
  const area = z.areaKm2 != null ? ` — an area of ${z.areaKm2.toLocaleString()} km²` : "";
  const casualties =
    z.casualties != null
      ? ` The human cost was counted in the thousands: ${z.casualties.toLocaleString()} lives cut short or displaced.`
      : "";

  const p1 = `In ${z.yearOfDamage}, ${z.name} in ${z.country} crossed a threshold it has not recovered from. ${z.tagline}.${casualties} The damage unfolded not as a single explosion but as a slow, compounding erasure — the kind that only becomes visible from orbit, when the colors that should be there simply are not${area}.`;

  const p2 = `The culprit is ${z.culprit}. The category of harm is ${z.category.toLowerCase()}, and the mechanism was neither accident nor mystery — it was the predictable output of decisions made in offices far from the site. Regulatory frameworks existed. Enforcement did not. The economics made destruction cheaper than compliance, and so destruction is what happened.`;

  const p3 = `Satellite imagery of ${z.name} today shows a landscape in arrested decay. The markers of former life — tree canopy, water clarity, soil structure, species range — are diminished or absent. Some boundary zones show faint signals of recovery; most do not. What remains is a record of what ${z.country}'s institutions chose to permit, written into the earth at a scale that cannot be redacted.`;

  return [p1, p2, p3].join("\n\n");
}

// ── Gemini call ──────────────────────────────────────────────────────────────

async function fetchStoryFromGemini(z: DeadZoneBody): Promise<string> {
  const prompt = buildPrompt(z);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 600,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();
  const text: string | undefined =
    raw?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || !text.trim()) {
    throw new Error("Gemini returned an empty response");
  }

  // Strip any markdown the model may have slipped in despite instructions.
  return text
    .replace(/^#{1,6}\s.*$/gm, "")   // headings
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")      // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // inline / block code
    .trim();
}

function sanitizeModelText(text: string): string {
  return text
    .replace(/^#{1,6}\s.*$/gm, "") // headings
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // inline / block code
    .trim();
}

async function fetchStoryFromAnthropic(z: DeadZoneBody): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key missing");
  }

  const prompt = buildPrompt(z);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 700,
      temperature: 0.85,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const raw = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = raw?.content?.find((p) => p?.type === "text")?.text;
  if (!text || !text.trim()) {
    throw new Error("Anthropic returned an empty response");
  }

  return sanitizeModelText(text);
}

function shouldUseAnthropicFallback(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("Gemini API error 429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate limit") ||
    msg.includes("quota")
  );
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<StoryResponse>> {
  const body = (await req.json()) as DeadZoneBody;

  if (!GEMINI_API_KEY && !ANTHROPIC_API_KEY) {
    return NextResponse.json({ story: buildFallbackStory(body) });
  }

  if (GEMINI_API_KEY) {
    try {
      const story = await fetchStoryFromGemini(body);
      return NextResponse.json({ story });
    } catch (err) {
      console.error("[dead-zone-story] Gemini call failed:", err);
      if (ANTHROPIC_API_KEY && shouldUseAnthropicFallback(err)) {
        try {
          const story = await fetchStoryFromAnthropic(body);
          return NextResponse.json({ story });
        } catch (anthropicErr) {
          console.error("[dead-zone-story] Anthropic fallback failed:", anthropicErr);
        }
      }
    }
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const story = await fetchStoryFromAnthropic(body);
      return NextResponse.json({ story });
    } catch (err) {
      console.error("[dead-zone-story] Anthropic call failed:", err);
    }
  }

  // Gracefully fall back rather than sending a 500 to the client.
  return NextResponse.json({ story: buildFallbackStory(body) });
}
