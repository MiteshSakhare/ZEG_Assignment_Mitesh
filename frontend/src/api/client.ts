import type { AnalyzeResponse, GeoJSONFeatureCollection, GeoJSONGeometry, SetbacksValue } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getParcels(bbox?: [number, number, number, number]): Promise<GeoJSONFeatureCollection> {
  const qs = bbox ? `?bbox=${bbox.join(",")}` : "";
  return request(`/api/parcels${qs}`);
}

export function getConstraints(): Promise<{
  wetlands: GeoJSONFeatureCollection;
  flood_zones: GeoJSONFeatureCollection;
  transmission_lines: GeoJSONFeatureCollection;
}> {
  return request("/api/constraints");
}

export interface AnalyzeParams {
  parcel_id: string;
  setbacks?: Partial<SetbacksValue>;
  user_exclusions?: GeoJSONGeometry[];
  user_restorations?: GeoJSONGeometry[];
}

export function analyze(params: AnalyzeParams): Promise<AnalyzeResponse> {
  return request("/api/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
