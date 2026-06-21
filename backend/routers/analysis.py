from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from shapely.geometry import mapping, shape

from config import Setbacks
from schemas import AnalyzeRequest, AnalyzeResponse, SetbacksOverride
from services.constraints import run_analysis

router = APIRouter(prefix="/api", tags=["analysis"])


def _parse_bbox(bbox: Optional[str]) -> Optional[tuple[float, float, float, float]]:
    if not bbox:
        return None
    try:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) != 4:
            raise ValueError
        return tuple(parts)  # minx, miny, maxx, maxy
    except ValueError:
        raise HTTPException(status_code=400, detail="bbox must be 'minx,miny,maxx,maxy'")


@router.get("/parcels")
def get_parcels(request: Request, bbox: Optional[str] = Query(None, description="minx,miny,maxx,maxy in EPSG:4326")):
    store = request.app.state.store
    if bbox:
        minx, miny, maxx, maxy = _parse_bbox(bbox)
        features = store.parcels.query_bbox(minx, miny, maxx, maxy)
        return {"type": "FeatureCollection", "features": features}
    return store.parcels.to_feature_collection()


@router.get("/constraints")
def get_constraints(request: Request):
    store = request.app.state.store
    return {
        "wetlands": store.wetlands.to_feature_collection(),
        "flood_zones": store.flood_zones.to_feature_collection(),
        "transmission_lines": store.transmission_lines.to_feature_collection(),
    }


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: Request, body: AnalyzeRequest):
    store = request.app.state.store
    default_setbacks: Setbacks = request.app.state.settings.default_setbacks

    feature = store.get_parcel(body.parcel_id)
    if feature is None:
        raise HTTPException(status_code=404, detail=f"Parcel '{body.parcel_id}' not found")

    parcel_geom = shape(feature["geometry"])

    effective = default_setbacks.model_copy()
    if body.setbacks:
        for field_name, value in body.setbacks.model_dump(exclude_none=True).items():
            setattr(effective, field_name, value)

    result = run_analysis(
        store=store,
        parcel_geom=parcel_geom,
        setbacks=effective,
        user_exclusions=body.user_exclusions,
        user_restorations=body.user_restorations,
    )

    return AnalyzeResponse(
        parcel_geojson=mapping(parcel_geom),
        buildable_geojson=mapping(result.buildable_geom) if result.buildable_geom else None,
        excluded_geojson=mapping(result.excluded_geom) if result.excluded_geom else None,
        breakdown=result.breakdown,
        total_parcel_acres=result.total_parcel_acres,
        buildable_acres=result.buildable_acres,
        buildable_acres_geodesic_reference=result.buildable_acres_geodesic_reference,
        effective_setbacks=SetbacksOverride(**effective.model_dump()),
    )
