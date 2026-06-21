export type GeoJSONGeometry = GeoJSON.Geometry;
export type GeoJSONFeature = GeoJSON.Feature;
export type GeoJSONFeatureCollection = GeoJSON.FeatureCollection;

export interface SetbacksValue {
  wetlands_m: number;
  flood_zone_m: number;
  transmission_lines_m: number;
  buildings_m: number;
}

export interface BreakdownItem {
  layer: string;
  area_acres: number;
  color: string;
}

export interface AnalyzeResponse {
  parcel_geojson: GeoJSONGeometry;
  buildable_geojson: GeoJSONGeometry | null;
  excluded_geojson: GeoJSONGeometry | null;
  breakdown: BreakdownItem[];
  total_parcel_acres: number;
  buildable_acres: number;
  buildable_acres_geodesic_reference: number;
  effective_setbacks: SetbacksValue;
}

export interface ParcelProperties {
  parcel_id: string;
  owner: string;
  county: string;
  situs_address: string;
  land_use: string;
}

export type DrawMode = "exclude" | "restore" | null;
