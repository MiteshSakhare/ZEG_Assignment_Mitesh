import { motion } from "framer-motion";
import { useStore } from "../store/useStore";
import { PenTool, Plus, Trash2, X } from "lucide-react";

export default function DrawingToolbar() {
  const {
    drawMode,
    setDrawMode,
    clearUserEdits,
    userExclusions,
    userRestorations,
    parcelId,
  } = useStore();

  const exclusionCount = userExclusions.length;
  const restorationCount = userRestorations.length;
  const hasParcel = !!parcelId;

  const toggle = (mode: "exclude" | "restore") => setDrawMode(drawMode === mode ? null : mode);

  return (
    <div className="flex items-center gap-2 px-4 py-3 glass-panel rounded-lg shadow-2xl backdrop-blur-md">
      <span className="font-mono text-[10px] uppercase tracking-widest text-paperDim mr-2">Manual Edits</span>

      <button
        disabled={!hasParcel}
        onClick={() => toggle("exclude")}
        className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
          drawMode === "exclude"
            ? "bg-excluded/20 text-excluded border border-excluded neon-border-red"
            : "bg-ink/50 text-paper hover:bg-excluded/10 border border-transparent"
        }`}
        title="Draw a polygon to carve out (exclude) from the buildable area"
      >
        <PenTool className="w-3.5 h-3.5" />
        Carve {exclusionCount > 0 && `(${exclusionCount})`}
      </button>

      <button
        disabled={!hasParcel}
        onClick={() => toggle("restore")}
        className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
          drawMode === "restore"
            ? "bg-survey/20 text-survey border border-survey glow-shadow-cyan"
            : "bg-ink/50 text-paper hover:bg-survey/10 border border-transparent"
        }`}
        title="Draw a polygon to add land back (restore) to the buildable area"
      >
        <Plus className="w-4 h-4" />
        Restore {restorationCount > 0 && `(${restorationCount})`}
      </button>

      <button
        disabled={exclusionCount === 0 && restorationCount === 0}
        onClick={clearUserEdits}
        className="flex items-center gap-2 px-3 py-2 rounded text-paperDim hover:text-paper hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {drawMode && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-mono text-[11px] text-buildable ml-3 flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-buildable animate-ping" />
          Click map to draw
        </motion.div>
      )}
    </div>
  );
}
