import math

import pytest
from shapely.geometry import Polygon

from services import geometry


def square_around(lon, lat, half_side_deg=0.005):
    """A simple square polygon in WGS84 for testing, away from any pole/
    antimeridian edge case."""
    return Polygon([
        (lon - half_side_deg, lat - half_side_deg),
        (lon + half_side_deg, lat - half_side_deg),
        (lon + half_side_deg, lat + half_side_deg),
        (lon - half_side_deg, lat + half_side_deg),
    ])


class TestCalculateBuildableArea:
    def test_empty_and_none_return_zero(self):
        assert geometry.calculate_buildable_area(None) == 0
        empty = Polygon()
        assert geometry.calculate_buildable_area(empty) == 0

    def test_rounds_up_not_to_nearest(self):
        # A geometry whose true planar acreage is just over a whole number
        # must round UP to the next whole acre, never down or to-nearest.
        geom = square_around(-98.6841, 30.7563, half_side_deg=0.00382)
        acres = geometry.calculate_buildable_area(geom)
        sq_m = geometry.transform(geometry._to_3857, geom).area
        raw = sq_m / geometry.SQM_PER_ACRE
        assert acres == math.ceil(raw)
        assert acres >= raw  # never rounds down

    def test_larger_geometry_yields_more_acres(self):
        small = square_around(-98.6841, 30.7563, half_side_deg=0.002)
        large = square_around(-98.6841, 30.7563, half_side_deg=0.006)
        assert geometry.calculate_buildable_area(large) > geometry.calculate_buildable_area(small)


class TestSetbackBuffering:
    def test_zero_setback_is_noop(self):
        geom = square_around(-98.6841, 30.7563)
        buffered = geometry.apply_setback_meters(geom, 0)
        assert buffered.equals(geom) or buffered.equals_exact(geom, 1e-9)

    def test_positive_setback_grows_area(self):
        geom = square_around(-98.6841, 30.7563)
        buffered = geometry.apply_setback_meters(geom, 30)
        assert buffered.area > geom.area

    def test_buffer_distance_is_accurate_in_meters(self):
        # A 100m buffer on a point should produce a circle whose planar
        # area (in the accurate UTM CRS) is close to pi*r^2 -- this is the
        # regression test for "buffering must use true meters, not degrees
        # or Web Mercator's latitude-distorted meters".
        from shapely.geometry import Point
        from shapely.ops import transform

        pt = Point(-98.6841, 30.7563)
        buffered_wgs84 = geometry.apply_setback_meters(pt, 100)
        buffered_utm = transform(geometry._to_utm, buffered_wgs84)
        expected = math.pi * 100 ** 2
        assert abs(buffered_utm.area - expected) / expected < 0.02  # within 2%


class TestGeodesicReference:
    def test_geodesic_smaller_than_planar_3857_at_this_latitude(self):
        # Web Mercator inflates area away from the equator, so the spec's
        # planar EPSG:3857 figure should always exceed the true geodesic
        # figure at a mid-latitude site like Llano County, TX.
        geom = square_around(-98.6841, 30.7563)
        planar_acres = geometry.calculate_buildable_area(geom)
        geodesic_acres = geometry.calculate_area_acres_geodesic(geom)
        assert planar_acres > geodesic_acres


class TestValidityRepair:
    def test_make_valid_repairs_self_intersecting_bowtie(self):
        bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1), (0, 0)])
        assert not bowtie.is_valid
        repaired = geometry.make_valid(bowtie)
        assert repaired.is_valid

    def test_make_valid_passes_through_none(self):
        assert geometry.make_valid(None) is None
