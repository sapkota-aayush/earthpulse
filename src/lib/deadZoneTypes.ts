export type DeadZoneCategory =
  | "nuclear"
  | "industrial"
  | "deforestation"
  | "climate"
  | "pollution"
  | "war"
  | "extraction";

export interface DeadZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  category: DeadZoneCategory;
  culprit: string;
  yearOfDamage: number;
  severity: 1 | 2 | 3;
  tagline: string;
  beforeImage: string;
  afterImage: string;
  beforeYear: number;
  afterYear: number;
  areaKm2?: number;
  casualties?: number;
}
