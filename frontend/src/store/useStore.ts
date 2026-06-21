import { create } from 'zustand';
import { analyze, getParcels, getConstraints } from '../api/client';
import type { AnalyzeResponse, GeoJSONGeometry, SetbacksValue, GeoJSONFeatureCollection, DrawMode } from '../types';

interface AppState {
  // Map Data
  parcels: GeoJSONFeatureCollection | null;
  constraints: {
    wetlands: GeoJSONFeatureCollection;
    flood_zones: GeoJSONFeatureCollection;
    transmission_lines: GeoJSONFeatureCollection;
  } | null;
  loadError: string | null;
  
  // App State
  parcelId: string | null;
  setbacks: SetbacksValue;
  userExclusions: GeoJSONGeometry[];
  userRestorations: GeoJSONGeometry[];
  drawMode: DrawMode;
  showConstraints: boolean;
  theme: "light" | "dark";
  
  // Analysis State
  result: AnalyzeResponse | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchInitialData: () => Promise<void>;
  setParcelId: (id: string | null) => void;
  setSetbacks: (setbacks: SetbacksValue) => void;
  addExclusion: (geom: GeoJSONGeometry) => void;
  addRestoration: (geom: GeoJSONGeometry) => void;
  clearUserEdits: () => void;
  setDrawMode: (mode: DrawMode) => void;
  setShowConstraints: (show: boolean) => void;
  toggleTheme: () => void;
  runAnalysis: () => Promise<void>;
}

const DEFAULT_SETBACKS: SetbacksValue = {
  wetlands_m: 30,
  flood_zone_m: 0,
  transmission_lines_m: 30,
  buildings_m: 5,
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let requestSeq = 0;

export const useStore = create<AppState>((set, get) => ({
  parcels: null,
  constraints: null,
  loadError: null,
  parcelId: null,
  setbacks: DEFAULT_SETBACKS,
  userExclusions: [],
  userRestorations: [],
  drawMode: null,
  showConstraints: true,
  theme: "dark",
  result: null,
  loading: false,
  error: null,

  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return { theme: nextTheme };
  }),

  fetchInitialData: async () => {
    try {
      const [p, c] = await Promise.all([getParcels(), getConstraints()]);
      set({ parcels: p, constraints: c });
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : String(e) });
    }
  },

  setParcelId: (id) => {
    set({ parcelId: id, drawMode: null, userExclusions: [], userRestorations: [] });
    get().runAnalysis();
  },

  setSetbacks: (setbacks) => {
    set({ setbacks });
    get().runAnalysis();
  },

  addExclusion: (geom) => {
    set((state) => ({ userExclusions: [...state.userExclusions, geom] }));
    get().runAnalysis();
  },

  addRestoration: (geom) => {
    set((state) => ({ userRestorations: [...state.userRestorations, geom] }));
    get().runAnalysis();
  },

  clearUserEdits: () => {
    set({ userExclusions: [], userRestorations: [] });
    get().runAnalysis();
  },

  setDrawMode: (mode) => set({ drawMode: mode }),
  
  setShowConstraints: (show) => set({ showConstraints: show }),

  runAnalysis: async () => {
    const { parcelId, setbacks, userExclusions, userRestorations } = get();
    if (!parcelId) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const seq = ++requestSeq;
      set({ loading: true, error: null });
      try {
        const data = await analyze({
          parcel_id: parcelId,
          setbacks,
          user_exclusions: userExclusions,
          user_restorations: userRestorations,
        });
        if (seq === requestSeq) set({ result: data, loading: false });
      } catch (e) {
        if (seq === requestSeq) set({ error: e instanceof Error ? e.message : String(e), loading: false });
      }
    }, 300);
  },
}));
