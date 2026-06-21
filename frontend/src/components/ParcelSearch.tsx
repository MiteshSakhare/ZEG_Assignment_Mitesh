import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Search, ChevronDown, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ParcelSearch() {
  const { parcels, parcelId, setParcelId } = useStore();
  const features = parcels?.features ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedFeature = features.find((f) => f.properties?.parcel_id === parcelId);
  const displayValue = selectedFeature
    ? `${selectedFeature.properties?.parcel_id} — ${selectedFeature.properties?.owner}`
    : "Select or click a parcel...";

  return (
    <div className="relative group w-full lg:w-auto lg:min-w-[20rem]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between glass-panel px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-buildable neon-border-green transition-all"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)",
        }}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <Search className={`h-4 w-4 shrink-0 transition-colors ${isOpen ? "text-buildable" : "text-survey group-hover:text-buildable"}`} />
          <span className={`truncate ${!selectedFeature ? "text-paperDim" : "text-paper"}`}>
            {displayValue}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-survey shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-buildable" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 backdrop-blur-xl bg-ink/90"
          >
            <div className="max-h-64 overflow-y-auto custom-scrollbar py-2">
              {features.length === 0 ? (
                <div className="px-4 py-3 text-sm text-paperDim italic">No parcels loaded</div>
              ) : (
                features.map((f) => {
                  const id = f.properties?.parcel_id as string;
                  const owner = f.properties?.owner as string;
                  const isSelected = id === parcelId;

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setParcelId(id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-mono flex items-center gap-3 transition-colors ${
                        isSelected 
                          ? "bg-buildable/10 text-buildable border-l-2 border-buildable" 
                          : "text-paper hover:bg-white/5 border-l-2 border-transparent"
                      }`}
                    >
                      <MapPin className={`w-4 h-4 shrink-0 ${isSelected ? "text-buildable" : "text-paperDim"}`} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-bold">{id}</span>
                        <span className="text-[10px] text-paperDim truncate uppercase tracking-widest">{owner}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
