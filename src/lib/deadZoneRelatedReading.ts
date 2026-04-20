import type { DeadZone } from "./deadZoneTypes";

export interface RelatedArticle {
  title: string;
  url: string;
  /** Short attribution for the link row */
  source: string;
}

/** Minimum fields needed for Wikipedia / news search fallbacks. */
export type DeadZoneReadingContext = Pick<DeadZone, "id" | "name" | "country" | "yearOfDamage">;

/** Primary Wikipedia `wiki/` paths — editorial starting points for each pin. */
const WIKI_ARTICLE: Partial<Record<string, string>> = {
  "aral-sea": "Aral_Sea",
  chernobyl: "Chernobyl_disaster",
  "rondonia-deforestation": "Deforestation_in_Brazil",
  "deepwater-horizon": "Deepwater_Horizon_oil_spill",
  "bikini-atoll": "Bikini_Atoll",
  "three-gorges-dam": "Three_Gorges_Dam",
  "salton-sea": "Salton_Sea",
  "athabasca-oil-sands": "Athabasca_oil_sands",
  "nauru-phosphate": "Nauru",
  "borneo-deforestation": "Deforestation_in_Borneo",
  fukushima: "Fukushima_nuclear_accident",
  agbogbloshie: "Agbogbloshie",
  "citarum-river": "Citarum",
  bhopal: "Bhopal_disaster",
  dzerzhinsk: "Dzerzhinsk,_Russia",
  "lake-karachay": "Lake_Karachay",
  kabwe: "Kabwe",
  norilsk: "Norilsk",
  cubatao: "Cubatão",
  "great-barrier-reef-bleaching": "Coral_bleaching",
  "owens-lake": "Owens_Lake",
  linfen: "Linfen",
  guiyu: "Guiyu",
  "niger-delta": "Niger_Delta",
  "lake-chad": "Lake_Chad",
  "zhengzhou-haze-corridor": "Zhengzhou",
  "horn-africa-drought": "2011_East_Africa_drought",
  "marshall-islands-sea-rise": "Marshall_Islands",
  "amazon-southern-fire-arc": "2019_Amazon_rainforest_wildfires",
  "papua-plantation-front": "Merauke",
  "aleppo-siege": "Siege_of_Aleppo",
  "mariupol-2022": "Siege_of_Mariupol",
  "kharkiv-frontline": "Kharkiv",
  "gaza-strip-2023": "Gaza_Strip",
  "yemen-hudaydah": "Hudaydah",
  "mosul-2016": "Battle_of_Mosul",
  "rohingya-cox-bazar": "Rohingya_genocide",
  "grozny-1999": "Second_Chechen_War",
  "sudan-khartoum-2023": "2023_Sudan_conflict",
  "tigray-2020": "Tigray_war",
  "western-us-megadrought": "South_West_North_America_megadrought",
  "central-chile-megadrought": "Megadrought",
  "caspian-sea-level": "Caspian_Sea",
  "svalbard-thaw": "Svalbard",
  "antarctic-peninsula-ice": "Antarctic_Peninsula",
  "siberian-wildfire-blowtorch": "2021_Siberia_wildfires",
  "pakistan-2022-floods": "2022_Pakistan_floods",
  "vanuatu-cyclone-pam": "Cyclone_Pam",
  "philippines-haiyan": "Typhoon_Haiyan",
  "beirut-port-blast": "2020_Beirut_explosion",
  "east-africa-locust-2020": "2019–2021_East_Africa_locust_infestation",
  "kyiv-suburbs-2022": "Battle_of_Kyiv_(2022)",
  "bakhmuth-2023": "Battle_of_Bakhmut",
  "somaliland-hargeisa-war": "Somaliland_War_of_Independence",
  "shijiazhuang-haze": "Shijiazhuang",
  "taiyuan-haze": "Taiyuan",
  "jinan-haze": "Jinan",
  "hefei-haze": "Hefei",
  "nanchang-haze": "Nanchang",
  "changsha-haze": "Changsha",
  "wuhan-haze": "Wuhan",
  "xian-haze": "Xi%27an",
  "tianjin-haze": "Tianjin",
  "amazon-mato-grosso-arc": "Mato_Grosso",
  "athabasca-second-look": "Athabasca_oil_sands",
  "cw-sahel-mali": "Sahel",
  "cw-niger-inland": "Inland_Niger_Delta",
  "cw-kazakh-steppe-dry": "Climate_change_in_Kazakhstan",
  "cw-uzbek-cotton-belt": "Environmental_impact_of_cotton",
  "cw-turkmen-karakum-canal": "Karakum_Canal",
  "cw-colorado-river-delta": "Colorado_River_Delta",
  "cw-mojave-aquifer": "Mojave_Desert",
  "cw-baja-peninsula": "Baja_California_peninsula",
  "cw-mato-grosso-savanna": "Cerrado",
  "cw-bolivia-chiquitano": "Chiquitano_Dry_Forests",
  "cw-paraguay-chaco": "Gran_Chaco",
  "cw-coral-triangle-heat": "Coral_Triangle",
  "cw-queensland-reef-front": "Great_Barrier_Reef",
  "cw-solomon-warm-pool": "Solomon_Islands",
  "cw-canada-boreal-strip": "Athabasca_oil_sands",
  "cw-scandinavia-peat": "Peat",
  "cw-yangtze-reservoir-arc": "Three_Gorges_Dam",
  "cw-mekong-tonle-sap": "Tonlé_Sap",
  "cw-sumatra-peat-smoke": "2015_Southeast_Asian_haze",
  "cw-sarawak-peat-domes": "Sarawak",
  "cw-north-china-haze-index": "Smog_in_China",
  "cw-yangtze-monsoon-plume": "East_Asian_monsoon",
  "cw-indus-monsoon-extreme": "2022_Pakistan_floods",
  "cw-bangladesh-brahmaputra": "Brahmaputra_River",
  "cw-madagascar-cyclone-climate": "Cyclone_Freddy",
  "cw-mozambique-channel-heat": "Mozambique_Channel",
  "cw-hudson-bay-ice-season": "Hudson_Bay",
  "cw-scotia-sea-plankton": "Scotia_Sea",
  "cw-mediterranean-upwelling": "Mediterranean_Sea",
};

function wikiUrl(slug: string): string {
  return `https://en.wikipedia.org/wiki/${slug}`;
}

/**
 * Editorial + search links so every pin has real places to read next.
 * Order: one encyclopedia article when we have a slug, then major news / NASA search.
 */
export function getRelatedReadingForDeadZone(ctx: DeadZoneReadingContext): RelatedArticle[] {
  const out: RelatedArticle[] = [];
  const seen = new Set<string>();
  const add = (a: RelatedArticle) => {
    if (seen.has(a.url)) return;
    seen.add(a.url);
    out.push(a);
  };

  const slug = WIKI_ARTICLE[ctx.id];
  if (slug) {
    add({
      title: ctx.name,
      url: wikiUrl(slug),
      source: "Wikipedia",
    });
  }

  const searchNameCountry = encodeURIComponent(`${ctx.name} ${ctx.country}`);
  const searchWithYear = encodeURIComponent(`${ctx.name} ${ctx.country} ${ctx.yearOfDamage}`);

  add({
    title: "Wikipedia search",
    url: `https://en.wikipedia.org/w/index.php?search=${searchNameCountry}`,
    source: "Wikipedia",
  });
  add({
    title: "NASA Earth Observatory",
    url: `https://earthobservatory.nasa.gov/search?q=${encodeURIComponent(ctx.name)}`,
    source: "NASA",
  });
  add({
    title: "Reuters archive",
    url: `https://www.reuters.com/site-search/?query=${searchWithYear}`,
    source: "Reuters",
  });
  add({
    title: "BBC News",
    url: `https://www.bbc.co.uk/search?q=${searchNameCountry}`,
    source: "BBC",
  });
  add({
    title: "AP News",
    url: `https://apnews.com/search?q=${searchWithYear}`,
    source: "AP",
  });

  return out.slice(0, 6);
}
