"""
Combines constraint layers + setbacks + user-drawn edits into:
  - a single "excluded" geometry
  - a per-layer acreage breakdown for the UI panel
  - the resulting buildable geometry and its acreage

This is intentionally the only file that knows about the *order of
operations* (intersect-with-parcel -> buffer -> union -> subtract -> restore).
geometry.py stays pure math; data_loader.py stays pure storage.
"""
from dataclasses import dataclass, field
from typing import Optional

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry

from config import Setbacks
from services import geometry
from services.data_loader import DataStore

LAYER_COLORS = {
    "wetlands": "#2196F3",
    "flood_zones": "#FF9800",
    "transmission_lines": "#795548",
    "user_exclusion": "#9C27B0",
}


@dataclass
class ConstraintLayerSpec:
    key: str
    label: str
    setback_m: float
    color: str
    is_line: bool = False  # transmission lines are linework, not polygons


@dataclass
class AnalysisResult:
    parcel_geom: BaseGeometry
    buildable_geom: Optional[BaseGeometry]
    excluded_geom: Optional[BaseGeometry]
    breakdown: list[dict] = field(default_factory=list)
    total_parcel_acres: int = 0
    buildable_acres: int = 0
    buildable_acres_geodesic_reference: float = 0.0


def _layer_candidates(store: DataStore, key: str, parcel_geom: BaseGeometry) -> list[BaseGeometry]:
    layer = getattr(store, key)
    return layer.candidates_near(parcel_geom)


def run_analysis(
    store: DataStore,
    parcel_geom: BaseGeometry,
    setbacks: Setbacks,
    user_exclusions: Optional[list[dict]] = None,
    user_restorations: Optional[list[dict]] = None,
) -> AnalysisResult:
    specs = [
        ConstraintLayerSpec("wetlands", "Wetlands", setbacks.wetlands_m, LAYER_COLORS["wetlands"]),
        ConstraintLayerSpec("flood_zones", "FEMA 100-yr Flood Zone", setbacks.flood_zone_m, LAYER_COLORS["flood_zones"]),
        ConstraintLayerSpec(
            "transmission_lines",
            "Transmission Easement",
            setbacks.transmission_lines_m,
            LAYER_COLORS["transmission_lines"],
            is_line=True,
        ),
    ]

    exclusion_parts: list[BaseGeometry] = []
    breakdown: list[dict] = []

    for spec in specs:
        candidates = _layer_candidates(store, spec.key, parcel_geom)
        if not candidates:
            continue

        # Lines (transmission) need the setback as their *entire* footprint,
        # since a line has zero width on its own. Polygons get buffered
        # outward from their true edge.
        buffered = [geometry.apply_setback_meters(g, max(spec.setback_m, 0.01) if spec.is_line else spec.setback_m) for g in candidates]
        layer_union = geometry.union_all(buffered)
        clipped = geometry.safe_intersection(layer_union, parcel_geom)

        if clipped is None:
            continue

        # Area attributable to this layer alone (clipped, before union with
        # other layers, so overlapping layers are still individually
        # reported even though the final buildable total de-duplicates).
        layer_acres = geometry.calculate_buildable_area(clipped)
        if layer_acres > 0:
            breakdown.append({
                "layer": f"{spec.label} ({spec.setback_m:g}m buffer)" if spec.setback_m else spec.label,
                "area_acres": layer_acres,
                "color": spec.color,
            })
            exclusion_parts.append(clipped)

    # User-drawn carve-outs (manual exclusions)
    if user_exclusions:
        user_geoms = [shape(g) for g in user_exclusions]
        user_union = geometry.safe_intersection(geometry.union_all(user_geoms), parcel_geom)
        if user_union is not None:
            acres = geometry.calculate_buildable_area(user_union)
            if acres > 0:
                breakdown.append({"layer": "User Carve-out", "area_acres": acres, "color": LAYER_COLORS["user_exclusion"]})
                exclusion_parts.append(user_union)

    total_exclusion = geometry.union_all(exclusion_parts)

    # User-drawn restorations subtract from the exclusion set (add land back)
    restored_acres = 0
    if user_restorations and total_exclusion is not None:
        restore_geoms = [shape(g) for g in user_restorations]
        restore_union = geometry.safe_intersection(geometry.union_all(restore_geoms), total_exclusion)
        if restore_union is not None:
            restored_acres = geometry.calculate_buildable_area(restore_union)
            total_exclusion = geometry.safe_difference(total_exclusion, restore_union)

    buildable_geom = geometry.safe_difference(parcel_geom, total_exclusion)

    if restored_acres > 0:
        breakdown.append({"layer": "User Restoration (added back)", "area_acres": restored_acres, "color": "#00BCD4"})

    total_parcel_acres = geometry.calculate_buildable_area(parcel_geom)
    buildable_acres = geometry.calculate_buildable_area(buildable_geom)
    buildable_acres_geodesic = geometry.calculate_area_acres_geodesic(buildable_geom)

    return AnalysisResult(
        parcel_geom=parcel_geom,
        buildable_geom=buildable_geom,
        excluded_geom=total_exclusion,
        breakdown=breakdown,
        total_parcel_acres=total_parcel_acres,
        buildable_acres=buildable_acres,
        buildable_acres_geodesic_reference=round(buildable_acres_geodesic, 2),
    )
