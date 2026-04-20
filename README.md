# EarthPulse

EarthPulse is a local climate intelligence web app built for the "Build for the Planet" hackathon challenge.

The product angle is intentionally narrow: **a neighbourhood stress fork + optional duel** — not a generic “planet health dashboard”. Users pin a microclimate, fork how their block actually runs (commute, cooling, diet, fabric), optionally contrast another place, then run city-scale sliders while Gemini rewrites a 7-day plan against that forked reality.

It turns a location search (or a globe click) into:
- a live environmental snapshot,
- a personalized impact score,
- a ranked action list,
- a simulation of neighborhood-level climate outcomes,
- and a Gemini-powered short action plan.

## Why this project matters

Most people care about climate, but generic advice does not change behavior.  
EarthPulse translates global climate signals into local, actionable decisions for a specific area.

## Core Features

- **Cinematic Earth scan experience** with satellite-oriented transition flow.
- **Location-based analysis** using weather and air quality inputs.
- **Planet Health Score** with supporting metrics (AQI, temperature, green cover, carbon proxy).
- **Impact Simulator** for EV adoption, green cover growth, and renewable transitions.
- **Personalized actions** with individual and ripple-effect framing.
- **Gemini climate copilot endpoint** to generate a 7-day compact action plan.

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **UI/Animation:** Tailwind CSS, Framer Motion
- **3D/Visualization:** globe.gl, three.js
- **Data sources:** Open-Meteo, OpenWeather (optional API key), Nominatim, ArcGIS imagery
- **AI:** Google Gemini API (optional API key)

## Architecture at a glance

- `src/app/page.tsx`: landing page and globe-first onboarding
- `src/app/analyze/page.tsx`: result dashboard, simulation, AI action plan
- `src/app/api/analyze/route.ts`: environmental aggregation + scoring + recommendations
- `src/app/api/satellite/route.ts`: satellite imagery proxy/fallback
- `src/app/api/plan/route.ts`: Gemini-backed action-plan generation with safe fallback

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env.local` in project root:

```bash
# Optional: improves AQI quality
OPENWEATHER_API_KEY=your_openweather_key

# Optional: enables Gemini action plan
GOOGLE_GEMINI_API_KEY=your_gemini_key

# Optional: override model
GEMINI_MODEL=gemini-2.0-flash
```

If no API keys are configured, EarthPulse still works with safe fallbacks.

See also committed [`.env.example`](./.env.example) and [`env.local.example`](./env.local.example) for the full commented template.

## Deploy on Vercel

1. Push this repo to GitHub (root of the repo should be this Next.js app folder).
2. In [Vercel](https://vercel.com/new), **Import** the repository; framework preset **Next.js** is detected automatically.
3. Under **Settings → Environment Variables**, add any keys you use locally (at minimum nothing is required — the app builds and runs with fallbacks). Recommended for full features:
   - `GOOGLE_GEMINI_API_KEY` — action plan, dead-zone story, grounded “read further” links
   - `OPENAI_API_KEY` — place research with web search
   - `OPENWEATHER_API_KEY` — live AQI in analyze
   - Optional: `GEMINI_MODEL`, `OPENAI_RESEARCH_MODEL`
4. Redeploy after changing env vars.

Production URL: use the domain Vercel assigns or attach a custom domain under **Settings → Domains**.

## Demo flow for judging

1. Enter a real neighborhood/city and run scan.
2. Review the Planet Health Score and metric cards.
3. Use simulator sliders to show compounding impact.
4. Show AI Climate Copilot 7-day plan.
5. Share the generated report URL.

## Current limitations and next steps

- Some urban metrics use heuristic estimation and should be replaced with denser open geospatial datasets.
- Add explicit confidence indicators per metric and source-level transparency panel.
- Add authenticated progress tracking and neighborhood challenges for sustained behavior change.
