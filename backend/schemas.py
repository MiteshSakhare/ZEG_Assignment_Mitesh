from typing import Any, Optional

from pydantic import BaseModel, Field


class SetbacksOverride(BaseModel):
    wetlands_m: Optional[float] = None
    flood_zone_m: Optional[float] = None
    transmission_lines_m: Optional[float] = None
    buildings_m: Optional[float] = None


class AnalyzeRequest(BaseModel):
    parcel_id: str
    setbacks: Optional[SetbacksOverride] = None
    user_exclusions: list[dict[str, Any]] = Field(default_factory=list)   # GeoJSON geometries
    user_restorations: list[dict[str, Any]] = Field(default_factory=list)  # GeoJSON geometries


class BreakdownItem(BaseModel):
    layer: str
    area_acres: int
    color: str


class AnalyzeResponse(BaseModel):
    parcel_geojson: dict[str, Any]
    buildable_geojson: Optional[dict[str, Any]]
    excluded_geojson: Optional[dict[str, Any]]
    breakdown: list[BreakdownItem]
    total_parcel_acres: int
    buildable_acres: int
    buildable_acres_geodesic_reference: float
    effective_setbacks: SetbacksOverride
