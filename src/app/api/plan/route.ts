import { NextRequest, NextResponse } from "next/server";

type PlanRequest = {
  cityName?: string;
  score?: number;
  aqiLabel?: string;
  temp?: number;
  greenCover?: number;
  carbonPerCapita?: number;
  population?: number;
  fork?: {
    commute?: string;
    cooling?: string;
    diet?: string;
    fabric?: string;
  };
};

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const fallbackPlan = {
  summary: "Start with one transport change, one home energy change, and one food change this week for compounding local impact.",
  actions: [
    "Replace two short car trips this week with walking, cycling, or transit.",
    "Raise AC by 1-2 C and switch one frequently used bulb to LED.",
    "Swap one high-emission meal with a plant-based option.",
  ],
  challenge: "Invite 5 neighbors/friends to copy your 3-action plan and share results in 7 days.",
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PlanRequest;
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ source: "fallback", ...fallbackPlan });
  }

  const fork = body.fork;
  const forkLine = fork
    ? `Lifestyle fork (user-selected, not inferred): commute=${fork.commute ?? "?"}, cooling=${fork.cooling ?? "?"}, diet=${fork.diet ?? "?"}, block fabric=${fork.fabric ?? "?"}.`
    : "Lifestyle fork: not provided — assume a mixed urban profile.";

  const prompt = `
You are an environmental action planner. Return strict JSON only.
All text MUST be in clear English (US) only — never Arabic or other scripts.

Create a compact, practical climate action plan for the location below.

Location profile:
- City/Area: ${body.cityName ?? "Unknown"}
- Planet health score: ${body.score ?? "N/A"} / 100
- Air quality: ${body.aqiLabel ?? "N/A"}
- Temperature: ${body.temp ?? "N/A"} C
- Green cover: ${body.greenCover ?? "N/A"} %
- Carbon per capita: ${body.carbonPerCapita ?? "N/A"} t/year
- Population: ${body.population ?? "N/A"}
- ${forkLine}

Output JSON schema:
{
  "summary": "1 sentence",
  "actions": ["3 concise actions tailored to this profile"],
  "challenge": "1 community challenge sentence"
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 350,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini request failed");
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof rawText === "string" ? JSON.parse(rawText) : null;

    if (!parsed?.summary || !Array.isArray(parsed?.actions) || !parsed?.challenge) {
      throw new Error("Unexpected Gemini output");
    }

    return NextResponse.json({ source: "gemini", ...parsed });
  } catch {
    return NextResponse.json({ source: "fallback", ...fallbackPlan });
  }
}
