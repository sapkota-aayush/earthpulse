import type { DeadZone } from "./deadZoneTypes";

/** NASA Earth Observatory / Science — trusted pairs reused as regional climate exemplars (same sensors, different map pins). */
const ARAL = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/woc/images/aral/aralsea_tmo_2000238.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/woc/images/aral/aralsea_tmo_2018233.jpg",
] as const;
const CHAD = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/91000/91291/lakechad_ms1_1973_lrg.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/91000/91291/lakechad_oli_2017_lrg.jpg",
] as const;
const SALTON = [
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/86000/86746/saltonsea_tm5_1984152_lrg.jpg",
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/86000/86746/saltonsea_ast_2015165_lrg.jpg",
] as const;
const RONDONIA = [
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/7000/7548/rondonia_ast_2000222_lrg.jpg",
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/7000/7548/rondonia_ast_2006238_lrg.jpg",
] as const;
const GBR = [
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/149000/149666/gbr_oli_2020235_lrg.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/149000/149666/gbrssta_mur_202273_lrg.jpg",
] as const;
const ATHABASCA = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/woc/images/athabasca/athabasca_tm5_19840723.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/woc/images/athabasca/athabasca_oli_20160715.jpg",
] as const;
const THREE_GORGES = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/7000/7769/threegorges_tm5_1987107_lrg.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/38000/38879/ISS019-E-07720_lrg.jpg",
] as const;
const BORNEO = [
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/40000/40139/malayasia_iko_2002169_lrg.jpg",
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/40000/40139/malayasia_etm_2003147_lrg.jpg",
] as const;
const CN_SMOG = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/80000/80152/china_tmo_2013003.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/80000/80152/china_tmo_2013014.jpg",
] as const;
const PK_FLOOD = [
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/150000/150279/pakistan_oli_2022216_lrg.jpg",
  "https://assets.science.nasa.gov/dynamicimage/assets/science/esd/eo/images/imagerecords/150000/150279/pakistan_oli2_2022240_lrg.jpg",
] as const;

/** Extra pins emphasising climate, hydrology, land-cover, and heat — before/after from NASA pairs above. */
export const DEAD_ZONES_CLIMATE_WATCH: DeadZone[] = [
  { id: "cw-sahel-mali", name: "Sahel rainfall margin — Mali", lat: 14.5, lng: -4.2, country: "Mali", category: "climate", culprit: "Warming + variable monsoon + land-use pressure on pastoral margins", yearOfDamage: 1990, severity: 2, tagline: "Long dry phases widen the gap between rain-fed crops and population growth.", beforeImage: CHAD[0], afterImage: CHAD[1], beforeYear: 1973, afterYear: 2017, areaKm2: 1200000 },
  { id: "cw-niger-inland", name: "Niger inland delta stress", lat: 16.8, lng: 2.5, country: "Niger", category: "climate", culprit: "Upstream dams + rainfall volatility + higher evaporation", yearOfDamage: 2005, severity: 2, tagline: "Seasonal wetlands shrink when both rain and river inflows miss their appointment.", beforeImage: CHAD[0], afterImage: CHAD[1], beforeYear: 1973, afterYear: 2017, areaKm2: 400000 },
  { id: "cw-kazakh-steppe-dry", name: "Kazakh steppe dry spells", lat: 48.2, lng: 66.5, country: "Kazakhstan", category: "climate", culprit: "Heatwaves + irrigation demand on shared rivers", yearOfDamage: 2010, severity: 2, tagline: "Continental interiors warm faster — grasslands brown earlier each spring.", beforeImage: ARAL[0], afterImage: ARAL[1], beforeYear: 2000, afterYear: 2018, areaKm2: 800000 },
  { id: "cw-uzbek-cotton-belt", name: "Uzbek cotton belt hydrology", lat: 40.8, lng: 63.5, country: "Uzbekistan", category: "climate", culprit: "Irrigation + warming evaporation on closed basins", yearOfDamage: 2000, severity: 2, tagline: "Every extra degree steals depth from canals before it reaches the field.", beforeImage: ARAL[0], afterImage: ARAL[1], beforeYear: 2000, afterYear: 2018, areaKm2: 450000 },
  { id: "cw-turkmen-karakum-canal", name: "Karakum canal evaporation arc", lat: 39.5, lng: 59.8, country: "Turkmenistan", category: "climate", culprit: "Desert heat + open-channel losses under warming summers", yearOfDamage: 1995, severity: 2, tagline: "Sun and wind bill the water budget before crops ever see a drop.", beforeImage: ARAL[0], afterImage: ARAL[1], beforeYear: 2000, afterYear: 2018, areaKm2: 350000 },
  { id: "cw-colorado-river-delta", name: "Colorado River delta remnant", lat: 31.8, lng: -114.9, country: "Mexico", category: "climate", culprit: "Upstream allocation + hotter deltas + tidal squeeze", yearOfDamage: 2014, severity: 2, tagline: "A river that stopped reaching the sea left mud flats to bake in new heat records.", beforeImage: SALTON[0], afterImage: SALTON[1], beforeYear: 1984, afterYear: 2015, areaKm2: 15000 },
  { id: "cw-mojave-aquifer", name: "Mojave groundwater decline", lat: 35.2, lng: -116.1, country: "United States", category: "climate", culprit: "Groundwater mining + longer warm seasons", yearOfDamage: 2008, severity: 2, tagline: "Basin-fill aquifers drop metres per decade while summer lengthens.", beforeImage: SALTON[0], afterImage: SALTON[1], beforeYear: 1984, afterYear: 2015, areaKm2: 120000 },
  { id: "cw-baja-peninsula", name: "Baja California aridity trend", lat: 27.5, lng: -113.3, country: "Mexico", category: "climate", culprit: "Eastern Pacific SST shifts + coastal fog decline", yearOfDamage: 2016, severity: 1, tagline: "Fog drip forests notice warming before thermometers do.", beforeImage: SALTON[0], afterImage: SALTON[1], beforeYear: 1984, afterYear: 2015, areaKm2: 143000 },
  { id: "cw-mato-grosso-savanna", name: "Cerrado–Amazon transition fires", lat: -13.2, lng: -56.8, country: "Brazil", category: "deforestation", culprit: "Frontier expansion + longer dry seasons", yearOfDamage: 2017, severity: 3, tagline: "Savanna ignition windows widen as rains shorten at the biome edge.", beforeImage: RONDONIA[0], afterImage: RONDONIA[1], beforeYear: 2000, afterYear: 2006, areaKm2: 600000 },
  { id: "cw-bolivia-chiquitano", name: "Chiquitano dry forest edge", lat: -17.4, lng: -60.5, country: "Bolivia", category: "deforestation", culprit: "Soy frontier + fire management under hotter springs", yearOfDamage: 2019, severity: 2, tagline: "Dry forests burn differently when humidity drops year on year.", beforeImage: RONDONIA[0], afterImage: RONDONIA[1], beforeYear: 2000, afterYear: 2006, areaKm2: 95000 },
  { id: "cw-paraguay-chaco", name: "Gran Chaco dryland conversion", lat: -22.5, lng: -59.8, country: "Paraguay", category: "deforestation", culprit: "Cattle expansion + drought coupling", yearOfDamage: 2015, severity: 2, tagline: "Carbon-rich scrub converts fastest when capital chases grass.", beforeImage: RONDONIA[0], afterImage: RONDONIA[1], beforeYear: 2000, afterYear: 2006, areaKm2: 250000 },
  { id: "cw-coral-triangle-heat", name: "Coral Triangle thermal budget", lat: -3.5, lng: 130.5, country: "Indonesia", category: "climate", culprit: "Ocean heat content rise + marine heatwaves", yearOfDamage: 2016, severity: 3, tagline: "Warm pools that power typhoons also bleach reefs when they linger.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 5000000 },
  { id: "cw-queensland-reef-front", name: "Queensland reef front stress", lat: -16.8, lng: 146.2, country: "Australia", category: "climate", culprit: "Marine heatwaves + river sediment pulses", yearOfDamage: 2020, severity: 2, tagline: "Bleaching returns faster when background temperatures ratchet upward.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 230000 },
  { id: "cw-solomon-warm-pool", name: "Solomon Sea warm pool edge", lat: -8.2, lng: 157.5, country: "Solomon Islands", category: "climate", culprit: "Western Pacific SST rise + cyclone intensity", yearOfDamage: 2021, severity: 2, tagline: "Island states sit where a tenth of a degree buys stronger fetch.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 900000 },
  { id: "cw-canada-boreal-strip", name: "Canadian boreal strip mines", lat: 56.5, lng: -111.8, country: "Canada", category: "extraction", culprit: "Oil sands expansion + permafrost thaw infrastructure", yearOfDamage: 2005, severity: 2, tagline: "Peat and permafrost carbon unlocks when boreal soil is rearranged.", beforeImage: ATHABASCA[0], afterImage: ATHABASCA[1], beforeYear: 1984, afterYear: 2016, areaKm2: 92000 },
  { id: "cw-scandinavia-peat", name: "Fennoscandian peat extraction", lat: 62.4, lng: 25.7, country: "Finland", category: "extraction", culprit: "Peat fuel markets + drained wetland emissions", yearOfDamage: 2018, severity: 1, tagline: "Drained peat switches from sink to source in a single management decision.", beforeImage: ATHABASCA[0], afterImage: ATHABASCA[1], beforeYear: 1984, afterYear: 2016, areaKm2: 12000 },
  { id: "cw-yangtze-reservoir-arc", name: "Yangtze reservoir arc", lat: 30.4, lng: 108.8, country: "China", category: "industrial", culprit: "Dam cascades + altered thermal structure of lakes", yearOfDamage: 2010, severity: 2, tagline: "Largest inland water rearrangement on Earth shifts local climates downstream.", beforeImage: THREE_GORGES[0], afterImage: THREE_GORGES[1], beforeYear: 1987, afterYear: 2009, areaKm2: 66000 },
  { id: "cw-mekong-tonle-sap", name: "Tonlé Sap monsoon pulse", lat: 12.9, lng: 104.1, country: "Cambodia", category: "climate", culprit: "Upstream dams + irregular monsoon + warmer lake surface", yearOfDamage: 2019, severity: 2, tagline: "Flood-pulse fisheries need timing precision climate change erodes.", beforeImage: THREE_GORGES[0], afterImage: THREE_GORGES[1], beforeYear: 1987, afterYear: 2009, areaKm2: 14000 },
  { id: "cw-sumatra-peat-smoke", name: "Sumatra peat smoke seasons", lat: -0.2, lng: 101.5, country: "Indonesia", category: "climate", culprit: "El Niño + drained peat + fire weather", yearOfDamage: 2015, severity: 3, tagline: "Carbon-dense peat becomes a hemisphere-scale haze switch.", beforeImage: BORNEO[0], afterImage: BORNEO[1], beforeYear: 2002, afterYear: 2003, areaKm2: 470000 },
  { id: "cw-sarawak-peat-domes", name: "Sarawak peat dome drainage", lat: 2.8, lng: 112.9, country: "Malaysia", category: "deforestation", culprit: "Plantation drainage + oxidation of tropical peat", yearOfDamage: 2012, severity: 2, tagline: "Domed peat collapses metres per decade once canals cut the water table.", beforeImage: BORNEO[0], afterImage: BORNEO[1], beforeYear: 2002, afterYear: 2003, areaKm2: 78000 },
  { id: "cw-north-china-haze-index", name: "North China aerosol index", lat: 38.9, lng: 116.4, country: "China", category: "pollution", culprit: "Coal-heavy heating + stagnant winter highs under warming", yearOfDamage: 2013, severity: 2, tagline: "A warmer lower troposphere can hold more haze between cold fronts.", beforeImage: CN_SMOG[0], afterImage: CN_SMOG[1], beforeYear: 2013, afterYear: 2013, areaKm2: 250000 },
  { id: "cw-yangtze-monsoon-plume", name: "Yangtze basin monsoon plume", lat: 31.2, lng: 121.5, country: "China", category: "climate", culprit: "Meiyu shifts + urban heat island + aerosol interactions", yearOfDamage: 2020, severity: 1, tagline: "East Asia’s rain belt wiggles northward in some warming scenarios.", beforeImage: CN_SMOG[0], afterImage: CN_SMOG[1], beforeYear: 2013, afterYear: 2013, areaKm2: 700000 },
  { id: "cw-indus-monsoon-extreme", name: "Indus monsoon extremes", lat: 27.7, lng: 68.9, country: "Pakistan", category: "climate", culprit: "Warmer air column + amplified monsoon bursts", yearOfDamage: 2022, severity: 3, tagline: "A warmed atmosphere can carry more water per storm than old flood maps assumed.", beforeImage: PK_FLOOD[0], afterImage: PK_FLOOD[1], beforeYear: 2022, afterYear: 2022, areaKm2: 160000 },
  { id: "cw-bangladesh-brahmaputra", name: "Brahmaputra braided belt", lat: 24.9, lng: 89.8, country: "Bangladesh", category: "climate", culprit: "Himalayan melt variability + sea-level pressure on delta", yearOfDamage: 2020, severity: 2, tagline: "More rain upstream and saltwater below squeeze the same delta.", beforeImage: PK_FLOOD[0], afterImage: PK_FLOOD[1], beforeYear: 2022, afterYear: 2022, areaKm2: 100000 },
  { id: "cw-madagascar-cyclone-climate", name: "Madagascar cyclone climate", lat: -18.9, lng: 47.5, country: "Madagascar", category: "climate", culprit: "Southwest Indian Ocean warming + land degradation", yearOfDamage: 2022, severity: 2, tagline: "Warmer seas spin storms that chew already thinned highland forests.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 587000 },
  { id: "cw-mozambique-channel-heat", name: "Mozambique Channel heat pool", lat: -18.0, lng: 38.2, country: "Mozambique", category: "climate", culprit: "Indian Ocean dipole + cyclone rapid intensification", yearOfDamage: 2019, severity: 2, tagline: "Coastal cities inherit risk baked in offshore days before landfall.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 800000 },
  { id: "cw-hudson-bay-ice-season", name: "Hudson Bay ice season shrink", lat: 60.5, lng: -86.3, country: "Canada", category: "climate", culprit: "Arctic amplification + earlier spring break-up", yearOfDamage: 2015, severity: 2, tagline: "Sea ice duration charts shorten faster than policy cycles refresh.", beforeImage: ATHABASCA[0], afterImage: ATHABASCA[1], beforeYear: 1984, afterYear: 2016, areaKm2: 1200000 },
  { id: "cw-scotia-sea-plankton", name: "Scotia Sea productivity shift", lat: -54.0, lng: -40.0, country: "International waters", category: "climate", culprit: "Southern Ocean circulation + stratification", yearOfDamage: 2018, severity: 1, tagline: "Nutrient light reaches surface layers differently when mixing weakens.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 3000000 },
  { id: "cw-mediterranean-upwelling", name: "Western Mediterranean upwelling", lat: 37.2, lng: -0.7, country: "Spain", category: "climate", culprit: "Surface warming + stratification + fisheries stress", yearOfDamage: 2023, severity: 1, tagline: "Shallow shelves telegraph ocean heat to coastal economies first.", beforeImage: GBR[0], afterImage: GBR[1], beforeYear: 2020, afterYear: 2022, areaKm2: 800000 },
];
