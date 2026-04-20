import { NextRequest, NextResponse } from "next/server";

interface AQIData {
  list?: Array<{
    main?: { aqi?: number };
    components?: { co?: number; no2?: number; o3?: number; pm2_5?: number; pm10?: number };
  }>;
}

interface WeatherData {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    apparent_temperature?: number;
    uv_index?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    uv_index_max?: number[];
  };
}

const AQI_LABELS = ["Good", "Fair", "Moderate", "Poor", "Very Poor"];

function satelliteImageUrl(lat: number, lon: number): string {
  // Slightly wider bbox so the still shows more city context (tunable via `span` on /api/satellite)
  return `/api/satellite?lat=${lat}&lon=${lon}&span=0.024`;
}

function estimateUrbanMetrics(lat: number, lon: number) {
  const seed = Math.abs(Math.sin(lat * 127.3 + lon * 91.7));
  return {
    greenCover: Math.round(seed * 35 + 4),
    concretePercent: Math.round((1 - seed) * 50 + 20),
    nearestPark: parseFloat((seed * 3 + 0.2).toFixed(1)),
    treeCount: Math.round(seed * 900 + 100),
    carbonPerCapita: parseFloat((seed * 5 + 2.5).toFixed(1)),
    population: Math.round(seed * 4e6 + 500000),
    buildingDensity: Math.round((1 - seed) * 80 + 15),
    vehicleDensity: Math.round((1 - seed) * 70 + 10),
  };
}

function buildActions(aqi: number, metrics: ReturnType<typeof estimateUrbanMetrics>, temp: number) {
  const actions = [];

  if (aqi >= 2) {
    actions.push({
      icon: "transit",
      title: "Switch 2 car trips to walking or cycling this week",
      impact: "Saves ~3.2 kg CO₂ per week",
      ripple: `If 1% of this area joined: ${Math.round(metrics.population * 0.01 * 3.2 * 52 / 1000)}t CO₂ saved per year — equal to planting ${Math.round(metrics.population * 0.01 * 3.2 * 52 / 22)} trees`,
      link: "https://www.amazon.com/s?k=urban+commuter+bike",
      linkText: "Shop urban bikes",
      category: "Transport",
    });
  }

  if (metrics.greenCover < 20) {
    actions.push({
      icon: "plant",
      title: "Plant one balcony, window, or rooftop plant",
      impact: "Absorbs ~1 kg CO₂/year, measurably improves indoor air",
      ripple: `1,000 households doing this: a micro-forest filtering ${Math.round(1000 * 1)} tonnes of CO₂ annually`,
      link: "https://www.amazon.com/s?k=air+purifying+indoor+plants",
      linkText: "Shop air-purifying plants",
      category: "Green cover",
    });
  }

  if (metrics.nearestPark > 1.5) {
    actions.push({
      icon: "tree",
      title: "Join or organise a neighbourhood tree-planting drive",
      impact: "One mature tree: 22 kg CO₂/year for decades",
      ripple: "100 trees planted = permanent carbon sink outpacing 4 households' annual emissions",
      link: "https://onetreeplanted.org/",
      linkText: "Plant trees globally",
      category: "Reforestation",
    });
  }

  if (temp > 27) {
    actions.push({
      icon: "ac",
      title: "Set AC to 24°C instead of 22°C",
      impact: "Saves ~10% energy, ~120 kg CO₂ per household annually",
      ripple: `Citywide: reduces peak grid load — equivalent to shutting down ${Math.round(metrics.population / 50000)} small power plants`,
      link: "https://www.amazon.com/s?k=smart+thermostat+energy+saving",
      linkText: "Shop smart thermostats",
      category: "Energy",
    });
  }

  actions.push({
    icon: "food",
    title: "Replace one meal with plant-based this week",
    impact: "Saves 2.5 kg CO₂ vs beef, 1.5 kg vs chicken",
    ripple: `If 1M people in your region did this weekly: equivalent to removing ${Math.round(1e6 * 2.5 * 52 / 4600)} cars permanently`,
    link: "https://www.amazon.com/s?k=plant+based+protein+powder",
    linkText: "Explore plant-based options",
    category: "Diet",
  });

  actions.push({
    icon: "energy",
    title: "Switch one appliance to LED or energy-star rated",
    impact: "LED bulbs use 75% less energy than incandescent",
    ripple: "If every home in your city switched 3 bulbs: removes one coal power plant's daily output",
    link: "https://www.amazon.com/s?k=led+energy+star+bulb",
    linkText: "Shop LED bulbs",
    category: "Energy",
  });

  return actions;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const name = searchParams.get("name") ?? "Your Area";
  const postal = searchParams.get("postal") ?? null;

  if (!lat || !lon) return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });

  const latN = parseFloat(lat);
  const lonN = parseFloat(lon);

  const [aqiRes, weatherRes] = await Promise.allSettled([
    process.env.OPENWEATHER_API_KEY && process.env.OPENWEATHER_API_KEY !== "your_key_here"
      ? fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}`)
      : Promise.reject("no key"),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&forecast_days=3&timezone=auto`),
  ]);

  let aqiIndex = 2;
  let components = { co: 400, no2: 15, o3: 80, pm2_5: 12, pm10: 20 };

  if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
    const d: AQIData = await aqiRes.value.json();
    aqiIndex = Math.max(0, Math.min(4, (d.list?.[0]?.main?.aqi ?? 3) - 1));
    components = { ...components, ...(d.list?.[0]?.components ?? {}) };
  }

  let weather = { temp: 22, humidity: 55, wind: 10, feelsLike: 22, maxTemp: 25, minTemp: 18, uvIndex: 4, precipNext3: 0 };
  if (weatherRes.status === "fulfilled" && weatherRes.value.ok) {
    const w: WeatherData = await weatherRes.value.json();
    weather = {
      temp: Math.round(w.current?.temperature_2m ?? 22),
      humidity: Math.round(w.current?.relative_humidity_2m ?? 55),
      wind: Math.round(w.current?.wind_speed_10m ?? 10),
      feelsLike: Math.round(w.current?.apparent_temperature ?? 22),
      maxTemp: Math.round(w.daily?.temperature_2m_max?.[0] ?? 25),
      minTemp: Math.round(w.daily?.temperature_2m_min?.[0] ?? 18),
      uvIndex: Math.round(w.daily?.uv_index_max?.[0] ?? 4),
      precipNext3: parseFloat(((w.daily?.precipitation_sum ?? [0, 0, 0]).slice(0, 3).reduce((a, b) => a + b, 0)).toFixed(1)),
    };
  }

  const metrics = estimateUrbanMetrics(latN, lonN);
  const score = Math.max(10, Math.round(
    100 - aqiIndex * 14 - (metrics.greenCover < 15 ? 8 : 0) - (weather.temp > 35 ? 6 : 0) - (metrics.carbonPerCapita > 6 ? 5 : 0)
  ));

  const actions = buildActions(aqiIndex, metrics, weather.temp);
  const satImage = satelliteImageUrl(latN, lonN);
  const mapLabel = encodeURIComponent(name.trim() || `${latN},${lonN}`);
  // Satellite-style layer in Google Maps; full native zoom in the opened tab.
  const mapUrl = `https://www.google.com/maps/@${latN},${lonN},16z/data=!3m1!1e3`;
  const earthUrl = `https://earth.google.com/web/search/${mapLabel}`;
  const mapUrlOsm = `https://www.openstreetmap.org/#map=16/${latN}/${lonN}`;

  return NextResponse.json({
    name,
    postal,
    lat: latN,
    lon: lonN,
    score,
    aqi: { index: aqiIndex, label: AQI_LABELS[aqiIndex] ?? "Moderate", ...components },
    weather,
    metrics,
    actions,
    satImage,
    mapUrl,
    earthUrl,
    mapUrlOsm,
    analysedAt: new Date().toISOString(),
  });
}
