# EarthPulse

Somewhere on this planet, a forest that stood for a thousand years is gone. A sea that fed millions is dead. A city is breathing air that no government dashboard will tell you about.

**EarthPulse** puts you in orbit and lets you see it.

---

## What it does

Spin the globe. Somewhere you'll notice a red dot — maybe over the Aral Sea, maybe over a dead ocean zone, maybe over a place you've never heard of. Tap it. The globe dives in. A before-and-after satellite view loads, showing you exactly what was lost and when. An AI-generated story tells you who did it and why nothing stopped them.

---

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## API keys (all optional)

Create `.env.local` in the project root. The app runs without any keys — keys unlock better data and AI features.

```bash
GOOGLE_GEMINI_API_KEY=   # dead-zone stories, action plans, read-further links
OPENWEATHER_API_KEY=     # live AQI in the stress report
OPENAI_API_KEY=          # place research with web search
```

---

## Stack

Next.js · TypeScript · Tailwind CSS · Framer Motion · globe.gl · three.js · Google Gemini · Open-Meteo · OpenWeather · Nominatim

---

## Deploy

Push to GitHub, import into [Vercel](https://vercel.com/new), add your env vars under Settings → Environment Variables. Done.

---

Built for the **Build for the Planet** hackathon.
