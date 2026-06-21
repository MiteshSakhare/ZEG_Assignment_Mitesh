"""
Quick, honest performance benchmark -- not a rigorous load test, just enough
to back up the numbers quoted in APPROACH.md with something reproducible.

Generates a synthetic county-scale dataset (N parcels, a denser wetland
layer) entirely in memory, builds the DataStore (which includes STRtree
construction), then times /api/analyze-equivalent calls.

Run: python3 scripts/benchmark.py [num_parcels]
"""
import random
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from shapely.geometry import shape

from config import load_default_setbacks
from services.constraints import run_analysis
from services.data_loader import DataStore, Layer

random.seed(7)

N_PARCELS = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
N_WETLAND_BLOBS = max(50, N_PARCELS // 10)

CENTER_LON, CENTER_LAT = -98.6841, 30.7563
GRID = int(N_PARCELS ** 0.5) + 1
SPACING = 0.01


def make_parcel_grid(n):
    features = []
    i = 0
    for row in range(GRID):
        for col in range(GRID):
            if i >= n:
                return features
            cx = CENTER_LON + col * SPACING
            cy = CENTER_LAT + row * SPACING
            w = h = SPACING * 0.42
            ring = [
                (cx - w, cy - h), (cx + w, cy - h),
                (cx + w, cy + h), (cx - w, cy + h), (cx - w, cy - h),
            ]
            features.append({
                "type": "Feature",
                "properties": {"parcel_id": f"BENCH-{i:05d}"},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            })
            i += 1
    return features


def make_wetland_blobs(n):
    features = []
    span = GRID * SPACING
    for i in range(n):
        cx = CENTER_LON + random.uniform(0, span)
        cy = CENTER_LAT + random.uniform(0, span)
        r = random.uniform(0.001, 0.004)
        ring = [
            (cx + r * 1.0, cy), (cx, cy + r * 0.8), (cx - r * 1.1, cy + r * 0.2),
            (cx - r * 0.6, cy - r), (cx + r * 0.4, cy - r * 0.9), (cx + r, cy),
        ]
        features.append({
            "type": "Feature",
            "properties": {"id": f"WBENCH-{i}"},
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })
    return features


def main():
    print(f"Benchmarking with {N_PARCELS} parcels, {N_WETLAND_BLOBS} wetland features...")

    t0 = time.perf_counter()
    store = DataStore.__new__(DataStore)
    store.parcels = Layer("parcels", make_parcel_grid(N_PARCELS))
    store.wetlands = Layer("wetlands", make_wetland_blobs(N_WETLAND_BLOBS))
    store.flood_zones = Layer("flood_zones", [])
    store.transmission_lines = Layer("transmission_lines", [])
    t_index = time.perf_counter() - t0
    print(f"Load + STRtree index build: {t_index*1000:.1f} ms for {len(store.parcels)} parcels")

    setbacks = load_default_setbacks()
    sample_ids = random.sample(range(len(store.parcels.features)), min(200, len(store.parcels.features)))

    timings = []
    for idx in sample_ids:
        feature = store.parcels.features[idx]
        geom = shape(feature["geometry"])
        t0 = time.perf_counter()
        run_analysis(store, geom, setbacks)
        timings.append(time.perf_counter() - t0)

    timings.sort()
    n = len(timings)
    print(f"\nPer-parcel analyze() timing over {n} sampled parcels:")
    print(f"  p50: {timings[n // 2] * 1000:.2f} ms")
    print(f"  p90: {timings[int(n * 0.9)] * 1000:.2f} ms")
    print(f"  p99: {timings[int(n * 0.99) if n > 100 else -1] * 1000:.2f} ms")
    print(f"  max: {timings[-1] * 1000:.2f} ms")


if __name__ == "__main__":
    main()
