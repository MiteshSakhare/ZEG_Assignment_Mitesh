import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../store/useStore";
import { Activity, MapPin } from "lucide-react";

export default function BreakdownPanel() {
  const { result, loading, error, parcelId } = useStore();

  if (!parcelId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-paperDim text-sm font-mono p-8 text-center bg-ink/50 border border-ink-line rounded-xl">
        <MapPin className="w-8 h-8 mb-4 opacity-50" />
        <p>Select a parcel on the map to initialize spatial analysis.</p>
      </div>
    );
  }

  const breakdown = result?.breakdown ?? [];
  const excludedTotal = breakdown.reduce(
    (sum, b) => sum + (b.layer.startsWith("User Restoration") ? 0 : b.area_acres),
    0
  );
  const buildableAcres = result?.buildable_acres ?? 0;

  const chartData = [
    { name: "Buildable", value: buildableAcres, color: "#00ff88" },
    ...breakdown
      .filter((b) => !b.layer.startsWith("User Restoration"))
      .map((b) => ({ name: b.layer, value: b.area_acres, color: b.layer.includes("Transmission") ? "#849585" : b.layer.includes("Wetland") ? "#00d1ff" : "#ffb2ba" })),
  ].filter((d) => d.value > 0);

  return (
    <div className="h-full flex flex-col bg-ink/50 backdrop-blur-md border border-ink-line rounded-xl overflow-hidden relative">
      <div className="px-6 py-4 border-b border-ink-line flex items-center justify-between bg-black/5 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-survey" />
          <div>
            <h2 className="font-display text-sm tracking-wide text-paper uppercase">Analysis Breakdown</h2>
            <p className="font-mono text-[10px] text-survey tracking-widest">{parcelId}</p>
          </div>
        </div>
        {loading && (
          <span className="font-mono text-[10px] text-buildable animate-pulse uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-buildable" />
            Computing
          </span>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-6 mt-4 px-4 py-3 bg-excluded/20 border border-excluded rounded-lg text-xs text-excluded font-mono shadow-[0_0_15px_rgba(255,51,102,0.2)]">
          {error}
        </motion.div>
      )}

      <div className="px-5 py-3 border-b border-ink-line">
        <Row label="Total Parcel Area" value={`${result?.total_parcel_acres ?? "—"} ac`} emphasis />
      </div>

      <div className="px-5 py-3 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paperDim mb-3">Constraints Excluded</p>
          <div className="space-y-2">
            {breakdown.length === 0 && !loading && (
              <p className="text-xs text-paperDim italic font-body">No constraints detected within this parcel.</p>
            )}
            <AnimatePresence>
              {breakdown.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-paper font-medium">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: b.color, boxShadow: `0 0 8px ${b.color}` }}
                    />
                    {b.layer}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      b.layer.startsWith("User Restoration") ? "text-restore" : "text-excluded"
                    }`}
                  >
                    {b.layer.startsWith("User Restoration") ? "+" : "−"}
                    {b.area_acres} ac
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="h-32 mt-4 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={2} stroke="none" cornerRadius={4}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}40)` }} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} ac`, name]}
                  contentStyle={{ background: "rgba(19,19,24,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, backdropFilter: "blur(10px)", padding: "4px 8px" }}
                  itemStyle={{ color: "#fff", fontFamily: "'Space Mono', monospace" }}
                  labelStyle={{ display: "none" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      <div className="px-5 py-4 bg-ink-deep border-t border-ink-line">
        <Row label="Total Removed" value={`− ${excludedTotal} ac`} muted />
        <div className="mt-4 flex items-baseline justify-between pt-4 border-t border-black/5 dark:border-white/5">
          <span className="font-display text-sm text-paper tracking-widest uppercase font-bold">Net Buildable</span>
          <span className="font-mono text-3xl text-buildable font-bold neon-text-green">{buildableAcres} <span className="text-xl">ac</span></span>
        </div>
        {result && (
          <p className="font-mono text-[9px] text-paperDim/50 mt-4 leading-relaxed uppercase tracking-widest">
            Geodesic Ref: {result.buildable_acres_geodesic_reference} ac // EPSG:3857 Planar Applied
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, emphasis, muted }: { label: string; value: string; emphasis?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-paperDim">{label}</span>
      <span
        className={`font-mono ${emphasis ? "text-xl text-paper drop-shadow-md" : "text-sm"} ${muted ? "text-paperDim" : "text-paper"}`}
      >
        {value}
      </span>
    </div>
  );
}
