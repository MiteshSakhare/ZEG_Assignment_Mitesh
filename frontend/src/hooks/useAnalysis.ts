import { useCallback, useEffect, useRef, useState } from "react";
import { analyze } from "../api/client";
import type { AnalyzeResponse, GeoJSONGeometry, SetbacksValue } from "../types";

const DEFAULT_SETBACKS: SetbacksValue = {
  wetlands_m: 30,
  flood_zone_m: 0,
  transmission_lines_m: 30,
  buildings_m: 5,
};

const DEBOUNCE_MS = 300;

export function useAnalysis() {
  const [parcelId, setParcelId] = useState<string | null>(null);
  const [setbacks, setSetbacks] = useState<SetbacksValue>(DEFAULT_SETBACKS);
  const [userExclusions, setUserExclusions] = useState<GeoJSONGeometry[]>([]);
  const [userRestorations, setUserRestorations] = useState<GeoJSONGeometry[]>([]);

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  const runAnalysis = useCallback(
    (immediate = false) => {
      if (!parcelId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const fire = async () => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError(null);
        try {
          const data = await analyze({
            parcel_id: parcelId,
            setbacks,
            user_exclusions: userExclusions,
            user_restorations: userRestorations,
          });
          // Ignore stale responses if a newer request has since been fired
          if (seq === requestSeq.current) setResult(data);
        } catch (e) {
          if (seq === requestSeq.current) setError(e instanceof Error ? e.message : String(e));
        } finally {
          if (seq === requestSeq.current) setLoading(false);
        }
      };

      if (immediate) fire();
      else debounceRef.current = setTimeout(fire, DEBOUNCE_MS);
    },
    [parcelId, setbacks, userExclusions, userRestorations]
  );

  useEffect(() => {
    runAnalysis();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelId, setbacks, userExclusions, userRestorations]);

  const addExclusion = useCallback((geom: GeoJSONGeometry) => {
    setUserExclusions((prev) => [...prev, geom]);
  }, []);

  const addRestoration = useCallback((geom: GeoJSONGeometry) => {
    setUserRestorations((prev) => [...prev, geom]);
  }, []);

  const clearUserEdits = useCallback(() => {
    setUserExclusions([]);
    setUserRestorations([]);
  }, []);

  return {
    parcelId,
    setParcelId,
    setbacks,
    setSetbacks,
    userExclusions,
    userRestorations,
    addExclusion,
    addRestoration,
    clearUserEdits,
    result,
    loading,
    error,
  };
}
