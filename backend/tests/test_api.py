from fastapi.testclient import TestClient

from main import app


def get_client():
    # TestClient triggers the startup event (data load) on context entry
    with TestClient(app) as client:
        yield client


def test_health():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


def test_get_parcels():
    with TestClient(app) as client:
        res = client.get("/api/parcels")
        assert res.status_code == 200
        body = res.json()
        assert body["type"] == "FeatureCollection"
        assert len(body["features"]) == 5


def test_get_parcels_bbox_filter():
    with TestClient(app) as client:
        all_parcels = client.get("/api/parcels").json()
        filtered = client.get("/api/parcels?bbox=-98.690,30.755,-98.680,30.760").json()
        assert len(filtered["features"]) <= len(all_parcels["features"])


def test_get_constraints():
    with TestClient(app) as client:
        res = client.get("/api/constraints")
        assert res.status_code == 200
        body = res.json()
        assert set(body.keys()) == {"wetlands", "flood_zones", "transmission_lines"}


def test_analyze_known_parcel():
    with TestClient(app) as client:
        res = client.post("/api/analyze", json={"parcel_id": "LLANO-0001"})
        assert res.status_code == 200
        body = res.json()
        assert body["buildable_acres"] <= body["total_parcel_acres"]
        assert body["effective_setbacks"]["wetlands_m"] == 30


def test_analyze_unknown_parcel_404():
    with TestClient(app) as client:
        res = client.post("/api/analyze", json={"parcel_id": "NOPE"})
        assert res.status_code == 404


def test_analyze_setback_override_changes_result():
    with TestClient(app) as client:
        default = client.post("/api/analyze", json={"parcel_id": "LLANO-0001"}).json()
        wider = client.post(
            "/api/analyze",
            json={"parcel_id": "LLANO-0001", "setbacks": {"wetlands_m": 90}},
        ).json()
        assert wider["effective_setbacks"]["wetlands_m"] == 90
        assert wider["buildable_acres"] <= default["buildable_acres"]


def test_analyze_invalid_bbox_400():
    with TestClient(app) as client:
        res = client.get("/api/parcels?bbox=not,a,valid,bbox")
        assert res.status_code == 400
