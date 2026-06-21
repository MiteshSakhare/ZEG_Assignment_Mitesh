import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { useStore } from "../store/useStore";
import type { GeoJSONFeatureCollection, GeoJSONGeometry } from "../types";

const EMPTY_FC: GeoJSONFeatureCollection = { type: "FeatureCollection", features: [] };

const BLANK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    }
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 22,
    }
  ],
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
};

export default function Map({ parcels, constraints }: { parcels: GeoJSONFeatureCollection | null; constraints: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  
  const {
    parcelId: selectedParcelId,
    setParcelId: onSelectParcel,
    result: analysisResult,
    drawMode,
    addExclusion,
    addRestoration,
    showConstraints,
  } = useStore();

  const drawModeRef = useRef(drawMode);
  const [isLoaded, setIsLoaded] = useState(false);
  const onSelectParcelRef = useRef(onSelectParcel);

  onSelectParcelRef.current = onSelectParcel;
  drawModeRef.current = drawMode;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BLANK_STYLE,
      center: [-98.6841, 30.7563],
      zoom: 14.2,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left");

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
    });
    drawRef.current = draw;
    map.addControl(draw as unknown as maplibregl.IControl);

    map.on("draw.create", (e: { features: GeoJSON.Feature[] }) => {
      const feature = e.features[0];
      if (feature?.geometry) {
        if (drawModeRef.current === "exclude") addExclusion(feature.geometry as GeoJSONGeometry);
        if (drawModeRef.current === "restore") addRestoration(feature.geometry as GeoJSONGeometry);
      }
      draw.deleteAll();
      draw.changeMode("simple_select");
    });

    map.on("load", () => {
      setIsLoaded(true);

      // Constraints
      map.addSource("wetlands", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "wetlands-fill", type: "fill", source: "wetlands",
        paint: { "fill-color": "#00d1ff", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "wetlands-outline", type: "line", source: "wetlands",
        paint: { "line-color": "#00d1ff", "line-width": 1.5, "line-opacity": 0.8 },
      });

      map.addSource("flood-zones", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "flood-fill", type: "fill", source: "flood-zones",
        paint: { "fill-color": "#ffb2ba", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "flood-outline", type: "line", source: "flood-zones",
        paint: { "line-color": "#ffb2ba", "line-width": 1.5, "line-opacity": 0.8, "line-dasharray": [2, 1] },
      });

      map.addSource("transmission-lines", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "transmission-line", type: "line", source: "transmission-lines",
        paint: { "line-color": "#849585", "line-width": 3, "line-dasharray": [1, 2] },
      });

      // Parcels
      map.addSource("parcels", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "parcels-fill", type: "fill", source: "parcels",
        paint: { "fill-color": "#ffffff", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "parcels-outline", type: "line", source: "parcels",
        paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0.8 },
      });

      map.addSource("parcel-selected", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "parcel-selected-outline", type: "line", source: "parcel-selected",
        paint: { "line-color": "#00d1ff", "line-width": 3 },
      });

      // Analysis result
      map.addSource("buildable", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "buildable-fill", type: "fill", source: "buildable",
        paint: { "fill-color": "#00ff88", "fill-opacity": 0.45 },
      });
      map.addLayer({
        id: "buildable-outline", type: "line", source: "buildable",
        paint: { "line-color": "#00ff88", "line-width": 2.5 },
      });

      map.addSource("excluded", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "excluded-fill", type: "fill", source: "excluded",
        paint: { "fill-color": "#ff3366", "fill-opacity": 0.45 },
      });
      map.addLayer({
        id: "excluded-outline", type: "line", source: "excluded",
        paint: { "line-color": "#ff3366", "line-width": 2, "line-opacity": 0.9 },
      });

      map.on("click", "parcels-fill", (e) => {
        if (drawModeRef.current) return;
        const id = e.features?.[0]?.properties?.parcel_id;
        if (id) onSelectParcelRef.current(id);
      });
      map.on("mouseenter", "parcels-fill", () => {
        if (!drawModeRef.current) map.getCanvas().style.cursor = "crosshair";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      pushAllData();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushAllData() {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (parcels) (map.getSource("parcels") as maplibregl.GeoJSONSource)?.setData(parcels);

    if (constraints) {
      (map.getSource("wetlands") as maplibregl.GeoJSONSource)?.setData(constraints.wetlands);
      (map.getSource("flood-zones") as maplibregl.GeoJSONSource)?.setData(constraints.flood_zones);
      (map.getSource("transmission-lines") as maplibregl.GeoJSONSource)?.setData(constraints.transmission_lines);
    }

    if (selectedParcelId && parcels) {
      const feature = parcels.features.find((f) => f.properties?.parcel_id === selectedParcelId);
      (map.getSource("parcel-selected") as maplibregl.GeoJSONSource)?.setData(
        feature ? { type: "FeatureCollection", features: [feature] } : EMPTY_FC
      );
    } else {
      (map.getSource("parcel-selected") as maplibregl.GeoJSONSource)?.setData(EMPTY_FC);
    }

    if (analysisResult) {
      if (analysisResult.buildable_geojson) {
        (map.getSource("buildable") as maplibregl.GeoJSONSource)?.setData({
          type: "Feature", properties: {}, geometry: analysisResult.buildable_geojson,
        } as unknown as GeoJSON.Feature);
      } else {
        (map.getSource("buildable") as maplibregl.GeoJSONSource)?.setData(EMPTY_FC);
      }
      if (analysisResult.excluded_geojson) {
        (map.getSource("excluded") as maplibregl.GeoJSONSource)?.setData({
          type: "Feature", properties: {}, geometry: analysisResult.excluded_geojson,
        } as unknown as GeoJSON.Feature);
      } else {
        (map.getSource("excluded") as maplibregl.GeoJSONSource)?.setData(EMPTY_FC);
      }
    } else {
        (map.getSource("buildable") as maplibregl.GeoJSONSource)?.setData(EMPTY_FC);
        (map.getSource("excluded") as maplibregl.GeoJSONSource)?.setData(EMPTY_FC);
    }
  }

  useEffect(() => {
    pushAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcels, constraints, selectedParcelId, analysisResult, isLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const vis = showConstraints ? "visible" : "none";
    for (const id of ["wetlands-fill", "wetlands-outline", "flood-fill", "flood-outline", "transmission-line"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [showConstraints]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !isLoaded) return;
    if (drawMode === "exclude" || drawMode === "restore") {
      draw.changeMode("draw_polygon");
    } else {
      draw.deleteAll();
      draw.changeMode("simple_select");
    }
  }, [drawMode]);

  return (
    <div className="relative w-full h-full bg-ink/30">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
