import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Map from "./components/Map";
import DrawingToolbar from "./components/DrawingToolbar";
import BreakdownPanel from "./components/BreakdownPanel";
import SetbackControls from "./components/SetbackControls";
import ParcelSearch from "./components/ParcelSearch";
import { useStore } from "./store/useStore";
import { Layers, Menu, X, Settings2, BarChart2, Sun, Moon, Hexagon } from "lucide-react";

export default function App() {
  const {
    parcels,
    constraints,
    loadError,
    fetchInitialData,
    showConstraints,
    setShowConstraints,
    theme,
    toggleTheme,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "setbacks" | "analytics">("map");

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return (
    <div className={`h-[100dvh] w-screen bg-ink-deep text-paper overflow-hidden font-body relative ${theme}`}>
      {/* Background Map Layer (Always Full Screen) */}
      <div className="absolute inset-0 z-0">
        <Map parcels={parcels} constraints={constraints} />
      </div>

      {/* Floating Header */}
      <header className="absolute top-0 inset-x-0 z-30 pointer-events-none p-4 md:p-6 perspective-1000">
        <div className="flex items-center justify-between pointer-events-auto max-w-7xl mx-auto">
          {/* Logo / Title */}
          <motion.div 
            whileHover={{ y: -2, boxShadow: "0 15px 35px rgba(0,255,136,0.15)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="glass-panel px-4 py-3 lg:px-6 lg:py-4 rounded-xl flex items-center gap-4 backdrop-blur-md border border-white/10 transition-colors cursor-default"
          >
            <div className="bg-buildable/10 p-2 rounded-lg border border-buildable/30 shadow-[0_0_15px_rgba(0,255,136,0.2)]">
              <Hexagon className="w-6 h-6 lg:w-8 lg:h-8 text-buildable" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display text-lg lg:text-2xl font-bold tracking-tight text-paper drop-shadow-md">
                Buildable<span className="text-buildable">Land</span>
              </h1>
              <span className="font-mono text-[10px] lg:text-xs text-survey tracking-[0.1em] uppercase opacity-80">
                Spatial Intel Platform
              </span>
            </div>
          </motion.div>

          {/* Desktop Search & Layers */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="w-80 glass-panel rounded-xl backdrop-blur-md shadow-2xl pointer-events-auto">
              <ParcelSearch />
            </div>
            
            <button
              onClick={toggleTheme}
              className="glass-panel p-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all backdrop-blur-md shadow-2xl border border-black/10 dark:border-white/10 pointer-events-auto text-paper"
              title="Toggle Light/Dark Mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-survey" /> : <Moon className="w-4 h-4 text-survey" />}
            </button>

            <label className="flex items-center gap-2 font-mono text-xs text-paper cursor-pointer glass-panel px-5 py-3.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all backdrop-blur-md shadow-2xl border border-black/10 dark:border-white/10 pointer-events-auto">
              <input
                type="checkbox"
                checked={showConstraints}
                onChange={(e) => setShowConstraints(e.target.checked)}
                className="accent-survey w-4 h-4"
              />
              <Layers className="w-4 h-4 text-survey" />
              <span className="uppercase tracking-wider font-bold">Layers</span>
            </label>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 bg-white/10 dark:bg-black/10 rounded-lg">
              {mobileMenuOpen ? <X className="w-6 h-6 text-paper" /> : <Menu className="w-6 h-6 text-paper" />}
            </button>
          </div>
        </div>

        {/* Mobile Search & Layers (Dropdown) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden mt-4 flex flex-col gap-3 pointer-events-auto"
            >
              <div className="glass-panel rounded-xl backdrop-blur-md shadow-2xl">
                <ParcelSearch />
              </div>
              <label className="flex items-center justify-between font-mono text-xs text-paper cursor-pointer glass-panel px-5 py-4 rounded-xl backdrop-blur-md shadow-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-survey" />
                  <span className="uppercase tracking-wider font-bold">Constraint Layers</span>
                </div>
                <input
                  type="checkbox"
                  checked={showConstraints}
                  onChange={(e) => setShowConstraints(e.target.checked)}
                  className="accent-survey w-5 h-5"
                />
              </label>
            </motion.div>
          )}
        </AnimatePresence>

        {loadError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 px-4 py-3 bg-excluded/20 border border-excluded neon-text-red rounded-lg font-mono text-sm shadow-[0_0_15px_rgba(255,51,102,0.2)] pointer-events-auto max-w-lg mx-auto"
          >
            System Error: {loadError}
          </motion.div>
        )}
      </header>

      {/* Main Content Overlays (Desktop: Sides, Mobile: Bottom Tabs) */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        
        {/* Desktop Left Sidebar - Setbacks */}
        <motion.aside
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.01, zIndex: 30 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="hidden lg:flex absolute top-32 left-6 bottom-6 w-80 flex-col glass-panel rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md border border-white/10 pointer-events-auto overflow-hidden"
        >
          <SetbackControls />
        </motion.aside>

        {/* Desktop Right Sidebar - Analytics */}
        <motion.aside
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          whileHover={{ scale: 1.01, zIndex: 30 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="hidden lg:flex absolute top-32 right-6 bottom-6 w-[26rem] flex-col glass-panel rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md border border-white/10 pointer-events-auto overflow-hidden"
        >
          <BreakdownPanel />
        </motion.aside>

        {/* Floating Toolbar & Legend */}
        <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-4 pointer-events-auto">
          <DrawingToolbar />
          <Legend />
        </div>

      </div>

      {/* Mobile Bottom Navigation & Sheets */}
      <div className="lg:hidden absolute bottom-0 inset-x-0 z-40 pointer-events-auto">
        <AnimatePresence>
          {activeTab === "setbacks" && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-16 inset-x-0 h-[60vh] glass-panel rounded-t-3xl backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <SetbackControls />
              </div>
            </motion.div>
          )}
          {activeTab === "analytics" && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-16 inset-x-0 h-[70vh] glass-panel rounded-t-3xl backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 shrink-0" />
              <div className="flex-1 overflow-hidden">
                <BreakdownPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Tab Bar */}
        <div className="glass-panel backdrop-blur-lg border-t border-white/10 p-2 flex justify-around items-center h-16">
          <TabButton
            active={activeTab === "setbacks"}
            onClick={() => setActiveTab(activeTab === "setbacks" ? "map" : "setbacks")}
            icon={<Settings2 className="w-5 h-5" />}
            label="Setbacks"
          />
          <TabButton
            active={activeTab === "map"}
            onClick={() => setActiveTab("map")}
            icon={<Layers className="w-5 h-5" />}
            label="Map"
            primary
          />
          <TabButton
            active={activeTab === "analytics"}
            onClick={() => setActiveTab(activeTab === "analytics" ? "map" : "analytics")}
            icon={<BarChart2 className="w-5 h-5" />}
            label="Analytics"
          />
        </div>
      </div>
      
      {/* Mobile Floating Tools */}
      <div className="lg:hidden absolute top-24 left-4 z-30 pointer-events-auto">
        {activeTab === "map" && <DrawingToolbar />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, primary }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
        primary
          ? active
            ? "bg-buildable text-paper shadow-[0_0_15px_rgba(0,255,136,0.4)]"
            : "bg-survey/20 text-survey border border-survey"
          : active
          ? "text-paper bg-black/10 dark:bg-white/10"
          : "text-paper hover:text-paper"
      }`}
    >
      {icon}
      <span className="text-[10px] font-mono mt-1 font-bold">{label}</span>
    </button>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["#00ff88", "Buildable"],
    ["#ff3366", "Excluded"],
    ["#00d1ff", "Wetlands"],
    ["#ffb2ba", "Flood zone"],
    ["#849585", "Transmission"],
  ];
  return (
    <div className="glass-panel rounded-full px-6 py-3 flex gap-6 backdrop-blur-md shadow-2xl border border-white/5">
      {items.map(([color, label]) => (
        <span key={label} className="flex items-center gap-2 font-mono text-[11px] text-paper uppercase tracking-wider font-bold">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}
