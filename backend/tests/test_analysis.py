from pathlib import Path

import pytest
from shapely.geometry import shape

from config import load_default_setbacks
from services.constraints import run_analysis
from services.data_loader import DataStore

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@pytest.fixture(scope="module")
def store():
    return DataStore(DATA_DIR)


@pytest.fixture(scope="module")
def default_setbacks():
    return load_default_setbacks()


def test_sample_data_loads(store):
    assert len(store.parcels) == 5
    assert len(store.wetlands) >= 1
    assert len(store.flood_zones) >= 1


@pytest.mark.parametrize("parcel_id", ["LLANO-0001", "LLANO-0002", "LLANO-0003", "LLANO-0004", "LLANO-0005"])
def test_buildable_never_exceeds_total(store, default_setbacks, parcel_id):
    feature = store.get_parcel(parcel_id)
    geom = shape(feature["geometry"])
    result = run_analysis(store, geom, default_setbacks)
    assert result.buildable_acres <= result.total_parcel_acres
    assert result.total_parcel_acres > 0
    # Sample parcels are sized to be realistic rural tracts, not postage stamps
    assert 50 <= result.total_parcel_acres <= 300


def test_parcel_with_flood_and_wetland_overlap_has_both_in_breakdown(store, default_setbacks):
    feature = store.get_parcel("LLANO-0001")
    geom = shape(feature["geometry"])
    result = run_analysis(store, geom, default_setbacks)
    labels = [b["layer"] for b in result.breakdown]
    assert any("Wetlands" in l for l in labels)
    assert any("Flood" in l for l in labels)


def test_larger_setback_never_increases_buildable_area(store, default_setbacks):
    feature = store.get_parcel("LLANO-0001")
    geom = shape(feature["geometry"])

    baseline = run_analysis(store, geom, default_setbacks)

    bigger = default_setbacks.model_copy()
    bigger.wetlands_m = default_setbacks.wetlands_m + 30
    widened = run_analysis(store, geom, bigger)

    assert widened.buildable_acres <= baseline.buildable_acres


def test_user_exclusion_reduces_buildable_area(store, default_setbacks):
    feature = store.get_parcel("LLANO-0003")
    geom = shape(feature["geometry"])
    baseline = run_analysis(store, geom, default_setbacks)

    minx, miny, maxx, maxy = geom.bounds
    carve_out = {
        "type": "Polygon",
        "coordinates": [[
            [minx + 0.0003, miny + 0.0003],
            [minx + 0.0015, miny + 0.0003],
            [minx + 0.0015, miny + 0.0015],
            [minx + 0.0003, miny + 0.0015],
            [minx + 0.0003, miny + 0.0003],
        ]],
    }
    with_exclusion = run_analysis(store, geom, default_setbacks, user_exclusions=[carve_out])

    assert with_exclusion.buildable_acres <= baseline.buildable_acres
    assert any(b["layer"] == "User Carve-out" for b in with_exclusion.breakdown)


def test_user_restoration_increases_buildable_area(store, default_setbacks):
    feature = store.get_parcel("LLANO-0003")
    geom = shape(feature["geometry"])
    baseline = run_analysis(store, geom, default_setbacks)

    pond_geom = shape(store.wetlands.features[1]["geometry"])
    px, py = pond_geom.centroid.x, pond_geom.centroid.y
    restore_patch = {
        "type": "Polygon",
        "coordinates": [[
            [px - 0.0008, py - 0.0008],
            [px + 0.0008, py - 0.0008],
            [px + 0.0008, py + 0.0008],
            [px - 0.0008, py + 0.0008],
            [px - 0.0008, py - 0.0008],
        ]],
    }
    with_restoration = run_analysis(store, geom, default_setbacks, user_restorations=[restore_patch])

    assert with_restoration.buildable_acres >= baseline.buildable_acres


def test_unknown_parcel_returns_none(store):
    assert store.get_parcel("DOES-NOT-EXIST") is None
