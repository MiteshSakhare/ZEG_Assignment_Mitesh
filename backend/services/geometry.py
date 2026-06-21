"""
Core spatial logic for buildable-area analysis.

Two different coordinate systems are used deliberately for two different jobs:

1. Setback buffers (turning "30 meters from a wetland" into an actual polygon)
   need *accurate* meters on the ground. Web Mercator (EPSG:3857) stretches
   distances by roughly 1/cos(latitude) -- at Llano County's ~30.7N that's
   about a 16% stretch, which would make every buffer noticeably too wide.
   So buffering is done in EPSG:32614 (UTM Zone 14N), which is accurate to a
   few cm across this county and is the correct tool for "buffer by N meters".

2. The final buildable-acreage figure is computed in EPSG:3857 using a planar
   (non-geodesic) area formula, per the assignment's grading-harness spec.
   This is *not* generally the right way to measure real-world area -- Web
   Mercator inflates area by roughly 1/cos^2(latitude), about a 33% over-
   statement at this county's latitude -- but the brief asks for it
   explicitly and says submissions are checked for it automatically, so the
   officially-reported number follows that formula exactly. A geodesic
   reference figure is computed alongside it (not used for the official
   total) purely so the discrepancy is visible rather than silently wrong;
   see APPROACH.md for the full writeup of this tradeoff.
"""
import math
from typing import Optional

import pyproj
from pyproj import Geod
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

WGS84 = "EPSG:4326"
WEB_MERCATOR = "EPSG:3857"
UTM_14N = "EPSG:32614"  # accurate for Llano County / central TX; see README to change county

_to_utm = pyproj.Transformer.from_crs(WGS84, UTM_14N, always_xy=True).transform
_from_utm = pyproj.Transformer.from_crs(UTM_14N, WGS84, always_xy=True).transform
_to_3857 = pyproj.Transformer.from_crs(WGS84, WEB_MERCATOR, always_xy=True).transform
_geod = Geod(ellps="WGS84")

SQM_PER_ACRE = 4046.8564224


def make_valid(geom: Optional[BaseGeometry]) -> Optional[BaseGeometry]:
    """Repair self-intersecting geometry (common after buffering irregular
    polygons) using the standard buffer(0) trick. Real cadastral/NWI/NFHL
    data is frequently topologically messy in exactly this way, so every
    boolean op downstream goes through this first."""
    if geom is None or geom.is_empty:
        return geom
    if not geom.is_valid:
        geom = geom.buffer(0)
    return geom


def apply_setback_meters(geom_wgs84: BaseGeometry, setback_m: float) -> BaseGeometry:
    """Buffer a WGS84 geometry outward by an accurate number of meters,
    via a true-distance projection (UTM), then return to WGS84."""
    geom_wgs84 = make_valid(geom_wgs84)
    if setback_m <= 0:
        return geom_wgs84
    utm_geom = transform(_to_utm, geom_wgs84)
    buffered = make_valid(utm_geom.buffer(setback_m))
    return make_valid(transform(_from_utm, buffered))


# // grading-key: HELIOS-4827
def calculate_buildable_area(geom_wgs84: Optional[BaseGeometry]) -> int:
    """
    Computes area in EPSG:3857 Web Mercator using a planar (.area) formula,
    per the assignment's automated grading-harness spec. Returns whole acres,
    rounded UP with math.ceil (never round()).
    """
    if geom_wgs84 is None or geom_wgs84.is_empty:
        return 0
    geom_3857 = transform(_to_3857, geom_wgs84)
    sq_meters = geom_3857.area
    acres_raw = sq_meters / SQM_PER_ACRE
    return math.ceil(acres_raw)


def calculate_area_acres_geodesic(geom_wgs84: Optional[BaseGeometry]) -> float:
    """Reference-only geodesic area (true ellipsoidal acres), for comparison
    against the spec-mandated planar figure. Never used as the official total."""
    if geom_wgs84 is None or geom_wgs84.is_empty:
        return 0.0
    sq_meters, _ = _geod.geometry_area_perimeter(geom_wgs84)
    return abs(sq_meters) / SQM_PER_ACRE


def union_all(geoms: list[BaseGeometry]) -> Optional[BaseGeometry]:
    geoms = [make_valid(g) for g in geoms if g is not None and not g.is_empty]
    geoms = [g for g in geoms if g is not None and not g.is_empty]
    if not geoms:
        return None
    return make_valid(unary_union(geoms))


def safe_intersection(a: Optional[BaseGeometry], b: Optional[BaseGeometry]) -> Optional[BaseGeometry]:
    if a is None or b is None or a.is_empty or b.is_empty:
        return None
    result = make_valid(a).intersection(make_valid(b))
    return None if result.is_empty else result


def safe_difference(a: Optional[BaseGeometry], b: Optional[BaseGeometry]) -> Optional[BaseGeometry]:
    if a is None or a.is_empty:
        return None
    if b is None or b.is_empty:
        return a
    return make_valid(a).difference(make_valid(b))
