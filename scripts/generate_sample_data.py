"""
Generates realistic SAMPLE GeoJSON data standing in for real TNRIS / USFWS / FEMA
downloads, so the app runs out-of-the-box on a clean checkout.

To use REAL data instead, see README.md -> "Using real county data" for the
exact ogr2ogr / geopandas commands to swap these files for an actual TNRIS
parcel layer, USFWS NWI wetlands layer, and FEMA NFHL flood layer.

We model a slice of Llano County, TX (Texas Hill Country -- real mix of rural
parcels, riparian wetlands along the Llano River, and FEMA flood zones along
the river corridor, which is exactly the kind of overlap that makes for an
interesting buildable-area demo).

Coordinates are illustrative (hand-built to be topologically realistic -
irregular parcel boundaries, a meandering "river" wetland corridor, a flood
zone that hugs the river and pokes into two of the five parcels) rather than
surveyed -- this is sample/demo data, not a real legal description.
"""
import json
import os
import random

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data")
random.seed(42)

# Rough center near Llano, TX
CENTER_LON, CENTER_LAT = -98.6841, 30.7563

# All coordinates below are authored as offsets from CENTER_LON/CENTER_LAT at
# a convenient large scale, then uniformly shrunk by SCALE around the center.
# This keeps every relative shape/overlap (which parcels touch the river
# corridor, etc.) intact while landing parcels near a realistic ~90-105 acre
# size instead of the ~650-900 acres the original unscaled offsets produced.
SCALE = 0.38


def scaled(lon, lat):
    return (CENTER_LON + (lon - CENTER_LON) * SCALE, CENTER_LAT + (lat - CENTER_LAT) * SCALE)


def jitter_ring(points, amount=0.0006):
    """Add small irregularity to a ring so parcels don't look like perfect
    rectangles (real cadastral data never is)."""
    out = []
    for x, y in points:
        out.append([x + random.uniform(-amount, amount), y + random.uniform(-amount, amount)])
    return out


def make_parcel(id_, owner, cx, cy, w, h, acres_hint):
    cx, cy = scaled(cx, cy)
    w, h = w * SCALE, h * SCALE
    ring = [
        (cx - w / 2, cy - h / 2),
        (cx + w / 2, cy - h / 2),
        (cx + w / 2, cy + h / 2),
        (cx - w / 2, cy + h / 2),
        (cx - w / 2, cy - h / 2),
    ]
    ring = jitter_ring(ring, amount=0.0006 * SCALE)
    ring[-1] = ring[0]  # keep ring closed after jitter
    return {
        "type": "Feature",
        "properties": {
            "parcel_id": id_,
            "owner": owner,
            "county": "Llano",
            "situs_address": f"{1000 + int(id_[-3:])} County Rd, Llano County, TX",
            "land_use": "Rural / Agricultural",
            "source": "SAMPLE DATA - replace with TNRIS county parcel layer",
            "acres_hint": acres_hint,
        },
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


def make_wetland(id_, points, wetland_type):
    ring = points + [points[0]]
    return {
        "type": "Feature",
        "properties": {
            "id": id_,
            "wetland_type": wetland_type,
            "source": "SAMPLE DATA - replace with USFWS NWI layer",
        },
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


def make_flood_zone(id_, points, zone):
    ring = points + [points[0]]
    return {
        "type": "Feature",
        "properties": {
            "id": id_,
            "FLD_ZONE": zone,
            "source": "SAMPLE DATA - replace with FEMA NFHL layer",
        },
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


# ---- Parcels: five neighboring rural tracts ----
parcels = [
    make_parcel("LLANO-0001", "Hartwell Family Trust", CENTER_LON - 0.020, CENTER_LAT + 0.012, 0.018, 0.014, 100),
    make_parcel("LLANO-0002", "J. & M. Castellano", CENTER_LON + 0.000, CENTER_LAT + 0.012, 0.018, 0.014, 95),
    make_parcel("LLANO-0003", "Pedernales Ranch LLC", CENTER_LON + 0.020, CENTER_LAT + 0.012, 0.018, 0.014, 102),
    make_parcel("LLANO-0004", "R. Okafor", CENTER_LON - 0.010, CENTER_LAT - 0.006, 0.018, 0.014, 88),
    make_parcel("LLANO-0005", "Cedar Crossing Holdings", CENTER_LON + 0.010, CENTER_LAT - 0.006, 0.018, 0.014, 91),
]

# ---- Wetlands: a meandering river/riparian corridor crossing parcels 1, 2, 4 ----
river_corridor = [scaled(lon, lat) for lon, lat in [
    (CENTER_LON - 0.034, CENTER_LAT + 0.020),
    (CENTER_LON - 0.022, CENTER_LAT + 0.015),
    (CENTER_LON - 0.014, CENTER_LAT + 0.009),
    (CENTER_LON - 0.006, CENTER_LAT + 0.006),
    (CENTER_LON + 0.001, CENTER_LAT + 0.001),
    (CENTER_LON - 0.002, CENTER_LAT - 0.006),
    (CENTER_LON - 0.008, CENTER_LAT - 0.013),
    (CENTER_LON - 0.005, CENTER_LAT - 0.014),
    (CENTER_LON + 0.002, CENTER_LAT - 0.007),
    (CENTER_LON + 0.006, CENTER_LAT + 0.000),
    (CENTER_LON - 0.001, CENTER_LAT + 0.006),
    (CENTER_LON - 0.009, CENTER_LAT + 0.010),
    (CENTER_LON - 0.017, CENTER_LAT + 0.016),
    (CENTER_LON - 0.026, CENTER_LAT + 0.021),
]]

# A second, smaller isolated pond wetland fully inside parcel 3 (no flood overlap)
pond = [scaled(lon, lat) for lon, lat in [
    (CENTER_LON + 0.024, CENTER_LAT + 0.014),
    (CENTER_LON + 0.028, CENTER_LAT + 0.015),
    (CENTER_LON + 0.029, CENTER_LAT + 0.011),
    (CENTER_LON + 0.025, CENTER_LAT + 0.010),
]]

wetlands = [
    make_wetland("WET-001", river_corridor, "Riverine / Freshwater Forested"),
    make_wetland("WET-002", pond, "Freshwater Pond"),
]

# ---- FEMA Flood Zone AE: hugs the river corridor, narrower than the wetland ----
flood_ae = [scaled(lon, lat) for lon, lat in [
    (CENTER_LON - 0.030, CENTER_LAT + 0.018),
    (CENTER_LON - 0.020, CENTER_LAT + 0.013),
    (CENTER_LON - 0.010, CENTER_LAT + 0.007),
    (CENTER_LON - 0.003, CENTER_LAT + 0.003),
    (CENTER_LON - 0.004, CENTER_LAT - 0.002),
    (CENTER_LON - 0.010, CENTER_LAT - 0.008),
    (CENTER_LON - 0.008, CENTER_LAT - 0.010),
    (CENTER_LON - 0.002, CENTER_LAT - 0.004),
    (CENTER_LON - 0.001, CENTER_LAT + 0.001),
    (CENTER_LON - 0.008, CENTER_LAT + 0.006),
    (CENTER_LON - 0.015, CENTER_LAT + 0.011),
    (CENTER_LON - 0.024, CENTER_LAT + 0.020),
]]

flood_zones = [
    make_flood_zone("FEMA-AE-01", flood_ae, "AE"),
]

# ---- Transmission line easement (optional bonus layer): clips corner of parcel 5 ----
transmission_line = {
    "type": "Feature",
    "properties": {
        "id": "TLINE-001",
        "voltage_kv": 138,
        "source": "SAMPLE DATA - replace with EIA / utility ROW layer",
    },
    "geometry": {
        "type": "LineString",
        "coordinates": [list(scaled(lon, lat)) for lon, lat in [
            (CENTER_LON + 0.001, CENTER_LAT - 0.020),
            (CENTER_LON + 0.009, CENTER_LAT - 0.010),
            (CENTER_LON + 0.018, CENTER_LAT - 0.003),
        ]],
    },
}

os.makedirs(OUT_DIR, exist_ok=True)

with open(os.path.join(OUT_DIR, "parcels.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": parcels}, f, indent=2)

with open(os.path.join(OUT_DIR, "wetlands.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": wetlands}, f, indent=2)

with open(os.path.join(OUT_DIR, "flood_zones.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": flood_zones}, f, indent=2)

with open(os.path.join(OUT_DIR, "transmission_lines.geojson"), "w") as f:
    json.dump({"type": "FeatureCollection", "features": [transmission_line]}, f, indent=2)

print("Sample data written to", os.path.abspath(OUT_DIR))
for fname in ["parcels.geojson", "wetlands.geojson", "flood_zones.geojson", "transmission_lines.geojson"]:
    print(" -", fname)
