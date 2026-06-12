import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoBattery, IcoActivity, IcoCpu, IcoAlertTriangle } from "../../components/shared/Icons";
import { ProgressBar } from "../../components/shared/ProgressBar";

// SOH over 10 years (120 months)
const sohTrend = Array.from({ length: 121 }, (_, m) => {
  const natural  = 100 - m * 0.065 - Math.pow(m, 1.4) * 0.0018;
  const actual   = m <= 28 ? +(natural + (Math.random() - 0.5) * 0.3).toFixed(2) : undefined;
  const p50      = +natural.toFixed(2);
  const p10      = +(natural + 2 - m * 0.005).toFixed(2);
  const p90      = +(natural - 2.5 - m * 0.005).toFixed(2);
  const year = Math.floor(m / 12);
  const mo   = m % 12;
  return { time: `Y${year}M${String(mo).padStart(2,"0")}`, p50, p10, p90, actual, eol: 80 };
}).filter((_, i) => i % 3 === 0);

// Capacity fade per cycle
const capacityFade = Array.from({ length: 50 }, (_, i) => ({
  cycles: i * 100,
  capacity: +(100 - i * 0.042 - Math.pow(i, 1.3) * 0.0008 + (Math.random() - 0.5) * 0.2).toFixed(2),
}));

const CELL_GROUPS = [
  { rack: "Rack-1", soh: 95.2, cycles: 612, temp: 28.4, status: "success" },
  { rack: "Rack-2", soh: 93.8, cycles: 634, temp: 29.1, status: "success" },
  { rack: "Rack-3", soh: 91.4, cycles: 701, temp: 31.2, status: "success" },
  { rack: "Rack-4", soh: 88.2, cycles: 758, temp: 33.8, status: "warning" },
  { rack: "Rack-5", soh: 94.1, cycles: 589, temp: 27.9, status: "success" },
  { rack: "Rack-6", soh: 92.7, cycles: 645, temp: 30.1, status: "success" },
];

export default function SiteDegradationForecast() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const avgSOH   = +(CELL_GROUPS.reduce((s, r) => s + r.soh, 0) / CELL_GROUPS.length).toFixed(1);
  const totalCycles = Math.round(CELL_GROUPS.reduce((s, r) => s + r.cycles, 0) / CELL_GROUPS.length);
  const rul = Math.round((avgSOH - 80) / 0.065 / 12);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Fleet Avg SOH"    value={avgSOH}     unit="%"      icon={<IcoBattery  width={14} height={14} />} rag={rag(avgSOH, 95, 85)} trend="-0.12%/month" trendDir="down" />
        <KpiCard label="Avg Cycle Count"  value={totalCycles} unit="cycles" icon={<IcoActivity width={14} height={14} />} rag="info" trend="+1.8/day" trendDir="down" />
        <KpiCard label="Remaining Life"   value={rul}         unit="yrs"    icon={<IcoCpu      width={14} height={14} />} rag={rul > 7 ? "success" : rul > 4 ? "warning" : "danger"} trend="to EOL (SOH<80%)" trendDir="down" />
        <KpiCard label="Rack Attention"   value={CELL_GROUPS.filter(r => r.status !== "success").length} unit="racks" icon={<IcoAlertTriangle width={14} height={14} />} rag={CELL_GROUPS.filter(r => r.status !== "success").length > 0 ? "warning" : "success"} trend="High temp" trendDir="down" />
      </div>

      {/* SOH projection */}
      <ChartCard title="State of Health Projection (10 Years)" timeframeOptions={["10Y"]} timeframe="10Y" onTimeframeChange={() => {}} info={{
        description: "AI-modelled battery State of Health (SOH) projection over the asset lifecycle. Probabilistic bands (P10/P90) reflect uncertainty in cycling rate, temperature, and chemistry degradation.",
        stats: [
          { label: "Current SOH",    value: `${avgSOH}%`, highlight: true },
          { label: "EOL Threshold",  value: "80% (industry standard)" },
          { label: "Projected EOL",  value: `~${rul} years`, highlight: true },
          { label: "Chemistry",      value: "LFP (LiFePO₄)" },
          { label: "Cycle Life",     value: "≥ 4,000 cycles @ 80% DOD" },
        ],
        source:   "Astrikos AI Degradation Model v1.8 (Physics-Informed LSTM)",
        standard: "IEC 62933-2-1 — Battery energy storage testing",
        note:     "SOH < 80% triggers EOL flag. Replacement cost factored into 10-year LCOE projection.",
      }}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={sohTrend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" {...axisProps} interval={4} />
            <YAxis domain={[70, 102]} {...axisProps} label={{ value: "SOH %", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            <ReferenceLine y={80} stroke={CHART_COLORS.danger} strokeDasharray="4 3" label={{ value: "EOL threshold (80%)", fontSize: 8, fill: CHART_COLORS.danger, position: "right" }} />
            <Area type="monotone" dataKey="p10" stroke="transparent" fill={CHART_COLORS.blue} fillOpacity={0.1} name="P10 band" legendType="none" />
            <Area type="monotone" dataKey="p90" stroke="transparent" fill="#000"              fillOpacity={1}   name="P90 mask" legendType="none" />
            <Line type="monotone" dataKey="p10"    stroke={CHART_COLORS.teal}    strokeWidth={1} strokeDasharray="4 3" dot={false} name="P10 (optimistic)" />
            <Line type="monotone" dataKey="p50"    stroke={CHART_COLORS.blue}    strokeWidth={2} dot={false}           name="P50 (median)" />
            <Line type="monotone" dataKey="p90"    stroke={CHART_COLORS.warning} strokeWidth={1} strokeDasharray="4 3" dot={false} name="P90 (conservative)" />
            <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.success} strokeWidth={2} dot={false}           name="Actual SOH" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Capacity fade */}
        <ChartCard title="Capacity Fade vs Cycle Count">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={capacityFade} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="cycles" {...axisProps} label={{ value: "Cycles", position: "insideBottom", offset: -2, fontSize: 9, fill: "var(--ds-text-faint)" }} />
              <YAxis domain={[75, 101]} {...axisProps} label={{ value: "Capacity %", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <Tooltip {...chartTooltipProps} />
              <ReferenceLine y={80} stroke={CHART_COLORS.danger} strokeDasharray="3 3" label={{ value: "EOL", fontSize: 8, fill: CHART_COLORS.danger }} />
              <Area type="monotone" dataKey="capacity" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.15} strokeWidth={2} dot={false} name="Capacity %" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Per-rack SOH */}
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Per-Rack SOH & Health</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 14px" }}>
            {CELL_GROUPS.map(r => (
              <div key={r.rack}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: "var(--ds-text)" }}>{r.rack}</span>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    <span style={{ color: r.temp > 32 ? CHART_COLORS.warning : "var(--ds-text-faint)" }}>{r.temp}°C</span>
                    <span style={{ color: "var(--ds-text-faint)" }}>{r.cycles} cycles</span>
                    <span style={{ fontWeight: 700, color: r.soh < 90 ? CHART_COLORS.warning : CHART_COLORS.teal }}>{r.soh}%</span>
                  </div>
                </div>
                <ProgressBar value={r.soh} status={r.status as "success" | "warning" | "danger"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LCOE & replacement planning */}
      <div className="chart-card" style={{ padding: "14px 16px" }}>
        <div className="chart-card-header" style={{ marginBottom: 12 }}><span className="chart-card-title">Lifecycle Economics & Replacement Planning</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[
            { label: "Current LCOE",       value: "$42/MWh",          note: "Based on actual performance" },
            { label: "Replacement Cost",   value: `$${Math.round(site.capacity * 0.32)}M`, note: "At $320K/MWh installed (2026 pricing)" },
            { label: "Optimal Replace",    value: `Year ${rul - 1}`,   note: "AI-recommended replacement window" },
            { label: "Augmentation ROI",   value: "8.2 years",         note: "If augmenting capacity +20% in year 5" },
          ].map(item => (
            <div key={item.label} style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--ds-border)" }}>
              <div style={{ fontSize: 10, color: "var(--ds-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: CHART_COLORS.blue, marginBottom: 2 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{item.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
