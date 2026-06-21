# APPROACH.md

## Approach

The backend is FastAPI + Shapely + pyproj, deliberately without geopandas
or GDAL/Fiona. For a single county's worth of file-based GeoJSON, a
GeoDataFrame doesn't buy anything a Python list of Shapely geometries plus
a `shapely.strtree.STRtree` doesn't already give — both wrap the same
R-tree library underneath, and GDAL is the single heaviest, most
platform-fragile dependency in the geospatial Python stack to containerize
reliably. Less surface area, faster image builds, same algorithmic
complexity.

The frontend is React/TypeScript/Vite with MapLibre GL JS rather than the
ArcGIS Maps SDK — no API key, no usage limits, and `mapbox-gl-draw` covers
the carve-out/restore interaction directly. I chose Llano County, TX as
the (sample) area: a river corridor running diagonally through a handful
of rural tracts gives wetland and flood-zone overlap on some parcels but
not others, which is a more interesting demo than a single tidy polygon.

One note on data: this was built in an environment without network access
to TNRIS/USFWS/FEMA, so `backend/data/*.geojson` is synthetic — built to
be topologically realistic (irregular boundaries, a meandering corridor,
partial overlaps) rather than a perfect tutorial shape. `scripts/
generate_sample_data.py` documents exactly how it's constructed, and the
README has the exact `ogr2ogr`/download steps to swap in a real county.

## Data sources & setback choices

| Layer | Default setback | Source / rationale |
|---|---|---|
| Wetlands | 30 m | EPA Section 401/404 guidance; a commonly used state riparian buffer distance |
| FEMA 100-yr flood zone | 0 m | The mapped SFHA boundary *is* the regulatory line under NFIP — no additional buffer |
| Transmission easement | 30 m | ~100 ft each side of centerline, typical for a 138kV right-of-way |
| Buildings (modeled, layer not populated) | 5 m | Generic fire-access/structure setback; left as a config default for when a footprints layer is added |

All four are in `config/setbacks.yaml`, overridable per-request via the API
body or the UI sliders — no code change or restart required to test a
different distance.

## Tradeoffs

**Area projection.** The assignment's automated grading harness requires
the *official* buildable-acreage figure to use a planar `.area` formula in
EPSG:3857 (Web Mercator), rounded up with `math.ceil`, with an exact
comment marking the function — and explicitly forbids reprojecting to an
equal-area or geodesic CRS for that calculation. I implemented it exactly
as specified, because it's stated as a literal, automatically-checked
requirement. I want to flag, though, that this isn't how I'd compute area
in production: Web Mercator inflates area by roughly `1/cos²(latitude)` —
about 33% at Llano County's ~30.7°N — so the reported acreage is
systematically too high relative to ground truth. I kept that distortion
out of the *setback buffers* (those reproject to EPSG:32614, UTM Zone 14N,
so "30 meters" is an accurate 30 meters on the ground, not a
latitude-stretched approximation), and the API also returns a secondary
`buildable_acres_geodesic_reference` field — true ellipsoidal area, never
used for the official total — purely so the gap is visible rather than
silently wrong. `backend/tests/test_geometry.py` has a regression test
asserting the planar figure is always ≥ the geodesic one at this latitude.

**In-memory GeoJSON vs. PostGIS.** Fine at county scale (the benchmark
below); a multi-county or statewide deployment would want PostGIS +
`pg_tileserv` so constraint unions and spatial joins happen in the
database rather than getting re-loaded into process memory.

**Debounced re-analysis.** Drawing triggers a 300ms-debounced POST so
rapid edits don't hammer the API while the user is still mid-drawing.

## Performance

`scripts/benchmark.py` builds a synthetic county-scale dataset in memory
and times the analysis pipeline directly (no network overhead). On this
machine:

| Parcels | Wetland features | Index build | p50 / p90 / p99 per-parcel analyze |
|---|---|---|---|
| 2,000 | 200 | 105 ms | 0.25 / 1.26 / 2.22 ms |
| 8,000 | 800 | 377 ms | 0.26 / 1.25 / 2.61 ms |

Per-parcel latency stays essentially flat as the dataset grows 4x — exactly
what an STRtree should buy: each analysis only touches the small set of
constraint features whose bounding box overlaps the parcel, not the whole
layer. Startup index-build time grows roughly linearly with feature count,
which only matters once at process start.

**Where it would start to strain:** a single parcel that's enormous (a
multi-thousand-acre ranch) intersecting a dense wetland layer would still
do one `unary_union` over every locally-overlapping wetland polygon, which
is the one super-linear step in the pipeline — fine at the scale tested
here, but the thing I'd profile first at real statewide scale. The fix is
the same STRtree-narrowing trick applied one level deeper: pre-merge and
cache constraint unions per spatial tile at startup, intersect against the
cache instead of raw features.

## What I'd do next

Add a building-footprints layer (the `buildings_m` setback already exists
in config, just unused); add TIGER/Line road setbacks; persist a user's
exclusion/restoration polygons per parcel (currently in-memory client
state, lost on refresh); export the breakdown to a PDF site report; and
move to PostGIS + vector tiles for anything beyond single-county scale.
