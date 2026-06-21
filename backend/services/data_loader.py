"""
Loads each GeoJSON layer once at startup, keeps it in memory, and builds a
shapely STRtree spatial index per layer so bbox/intersection queries are
O(log n) instead of scanning every feature.

Deliberately uses plain shapely + the stdlib json module rather than
geopandas/Fiona/GDAL: for a single-county, file-based dataset of a few
thousand features, a GeoDataFrame buys us nothing we need (no SQL-style
joins, no multi-format I/O) and GDAL is the single heaviest, most fragile
part of the geospatial Python stack to get installed consistently in a
Docker image. Shapely's STRtree gives the same O(log n) query performance
geopandas would (it uses the same R-tree underneath). See APPROACH.md.
"""
import json
from pathlib import Path
from typing import Optional

from shapely.geometry import box, shape
from shapely.geometry.base import BaseGeometry
from shapely.strtree import STRtree


class Layer:
    """One constraint or parcel layer: raw features + geometries + a
    spatial index for fast candidate filtering."""

    def __init__(self, name: str, features: list[dict]):
        self.name = name
        self.features = features
        self.geometries: list[BaseGeometry] = []
        for f in features:
            geom = shape(f["geometry"])
            if not geom.is_valid:
                # Real parcel/NWI/NFHL exports are frequently self-intersecting
                # or have ring-order issues; buffer(0) is the standard repair.
                geom = geom.buffer(0)
            self.geometries.append(geom)
        self._tree = STRtree(self.geometries) if self.geometries else None

    def __len__(self):
        return len(self.features)

    def query_bbox(self, minx: float, miny: float, maxx: float, maxy: float) -> list[dict]:
        if self._tree is None:
            return []
        bbox_geom = box(minx, miny, maxx, maxy)
        idxs = self._tree.query(bbox_geom)
        return [self.features[i] for i in idxs if self.geometries[i].intersects(bbox_geom)]

    def candidates_near(self, geom: BaseGeometry) -> list[BaseGeometry]:
        """Fast pre-filter: geometries whose bounding box overlaps `geom`'s
        bounding box. Caller still does the precise .intersection() check."""
        if self._tree is None:
            return []
        idxs = self._tree.query(geom)
        return [self.geometries[i] for i in idxs]

    def get_feature_by_id(self, id_field: str, value: str) -> Optional[dict]:
        for f in self.features:
            if f["properties"].get(id_field) == value:
                return f
        return None

    def to_feature_collection(self) -> dict:
        return {"type": "FeatureCollection", "features": self.features}


def _load_geojson(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path) as f:
        data = json.load(f)
    return data.get("features", [])


class DataStore:
    """Holds every layer for the app's lifetime. Built once in main.py's
    startup hook and shared via FastAPI dependency injection."""

    def __init__(self, data_dir: Path):
        self.parcels = Layer("parcels", _load_geojson(data_dir / "parcels.geojson"))
        self.wetlands = Layer("wetlands", _load_geojson(data_dir / "wetlands.geojson"))
        self.flood_zones = Layer("flood_zones", _load_geojson(data_dir / "flood_zones.geojson"))
        self.transmission_lines = Layer(
            "transmission_lines", _load_geojson(data_dir / "transmission_lines.geojson")
        )

    def get_parcel(self, parcel_id: str) -> Optional[dict]:
        return self.parcels.get_feature_by_id("parcel_id", parcel_id)

    def summary(self) -> dict:
        return {
            "parcels": len(self.parcels),
            "wetlands": len(self.wetlands),
            "flood_zones": len(self.flood_zones),
            "transmission_lines": len(self.transmission_lines),
        }
