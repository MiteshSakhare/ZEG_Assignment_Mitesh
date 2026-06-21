import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { Settings2, ChevronDown } from "lucide-react";
import type { SetbacksValue } from "../types";

const FIELDS: { key: keyof SetbacksValue; label: string; min: number; max: number; step: number; hint: string; colorClass: string }[] = [
  { key: "wetlands_m", label: "Wetland buffer", min: 0, max: 100, step: 5, hint: "EPA 401 guidance / standard riparian buffer", colorClass: "text-survey" },
  { key: "flood_zone_m", label: "Flood zone buffer", min: 0, max: 50, step: 5, hint: "NFIP: zone boundary is the regulatory line", colorClass: "text-[#ffb2ba]" },
  { key: "transmission_lines_m", label: "Transmission easement", min: 0, max: 100, step: 5, hint: "100ft (~30m) each side, typical 138kV ROW", colorClass: "text-[#849585]" },
];

export default function SetbackControls() {
  const { setbacks, setSetbacks } = useStore();
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-col h-full bg-ink/50">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left border-b border-ink-line hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="w-4 h-4 text-buildable" />
          <span className="font-mono text-xs uppercase tracking-widest text-paper">Constraint Parameters</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="w-4 h-4 text-paperDim" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="overflow-y-auto flex-1 custom-scrollbar"
          >
            <div className="px-6 py-6 space-y-6">
              {FIELDS.map((f) => (
                <div key={f.key} className="group">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-sm font-medium text-paper group-hover:text-paper transition-colors">{f.label}</label>
                    <span className={`font-mono text-sm font-bold ${f.colorClass}`}>{setbacks[f.key]}m</span>
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={setbacks[f.key]}
                    onChange={(e) => setSetbacks({ ...setbacks, [f.key]: Number(e.target.value) })}
                    className="w-full h-1 bg-ink-line rounded-lg appearance-none cursor-pointer glow-slider"
                  />
                  <p className="text-[11px] text-paperDim mt-2 font-body leading-relaxed">{f.hint}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
