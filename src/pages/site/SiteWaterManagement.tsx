import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoDroplets, IcoZap, IcoActivity, IcoAlertTriangle } from "../../components/shared/Icons";
import { ProgressBar } from "../../components/shared/ProgressBar";

const reservoirTrend = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  level: +(82 - i * 0.3 + Math.sin(i * 0.8) * 2 + (Math.random() - 0.5) * 0.5).toFixed(1),
  inflow: +(45 + Math.sin(i * 0.6) * 15 + (Math.random() - 0.5) * 5).toFixed(1),
  outflow: +(52 + (Math.random() - 0.5) * 8).toFixed(1),
}));

const flow24h = Array.from({ length: 48 }, (_, i) => ({
  time: `${String(Math.floor(i / 2)).padStart(2,"0")}:${i % 2 === 0 ? "00" : "30"}`,
  turbineFlow: +(48 + Math.sin(i * 0.3) * 8 + (Math.random() - 0.5) * 3).toFixed(1),
  spillwayFlow: i > 20 && i < 32 ? +(5 + Math.random() * 4).toFixed(1) : 0,
  generation: +(site_gen(i)).toFixed(1),
}));

function site_gen(i: number) {
  return Math.max(0, 85 + Math.sin(i * 0.3) * 25 + (Math.random() - 0.5) * 8);
}

const GATES = [
  { name: "Main Intake Gate A", status: "open",   position: 100, flow: 28.4 },
  { name: "Main Intake Gate B", status: "open",   position: 100, flow: 22.1 },
  { name: "Spillway Gate 1",    status: "partial", position: 35,  flow: 5.8 },
  { name: "Spillway Gate 2",    status: "closed",  position: 0,   flow: 0 },
  { name: "Bypass Valve",       status: "closed",  position: 0,   flow: 0 },
  { name: "Emergency Penstock", status: "standby", position: 0,   flow: 0 },
];

const GATE_COLOR: Record<string, string> = { open: "#22c55e", partial: "#f59e0b", closed: "#9ca3af", standby: "#38bdf8" };

export default function SiteWaterManagement() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const reservoirPct = 74;
  const currentLevel = 82.4;
  const inflowRate   = 48.2;
  const outflowRate  = 51.8;
  const netChange    = +(inflowRate - outflowRate).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Reservoir Level"  value={currentLevel} unit="m"     icon={<IcoDroplets width={14} height={14} />} rag={rag(reservoirPct, 60, 30)} trend={`${netChange > 0 ? "+" : ""}${netChange} m³/s net`} trendDir={netChange >= 0 ? "up" : "down"} />
        <KpiCard label="Inflow Rate"      value={inflowRate}   unit="m³/s"  icon={<IcoActivity width={14} height={14} />} rag="info"    trend="+3.2 m³/s" trendDir="up" />
        <KpiCard label="Turbine Discharge" value={outflowRate}  unit="m³/s"  icon={<IcoZap width={14} height={14} />}     rag="success" trend="Optimal"     trendDir="up" />
        <KpiCard label="Spillway Active"  value="Gate 1"       unit={undefined} icon={<IcoAlertTriangle width={14} height={14} />} rag="warning" trend="5.8 m³/s" trendDir="down" />
      </div>

      {/* Reservoir status */}
      <div className="chart-card" style={{ padding: "14px 16px" }}>
        <div className="chart-card-header" style={{ marginBottom: 12 }}>
          <span className="chart-card-title">Reservoir Status — {site.name}</span>
          <span className="chip info" style={{ fontSize: 9, marginLeft: "auto" }}>Live · Updated 30s ago</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {/* Level gauge */}
          <div>
            <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 6 }}>Current Level vs Capacity</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: CHART_COLORS.blue }}>{currentLevel}m</span>
              <div>
                <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>of 110m max</div>
                <div style={{ fontSize: 10, color: "#22c55e" }}>Min op: 30m ✓</div>
              </div>
            </div>
            <ProgressBar value={reservoirPct} status="success" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ds-text-faint)", marginTop: 4 }}>
              <span>Min (30m)</span><span>{reservoirPct}% full</span><span>Max (110m)</span>
            </div>
          </div>
          {/* Flow balance */}
          <div>
            <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 6 }}>Water Balance</div>
            {[
              { label: "Total Inflow",    value: `${inflowRate} m³/s`,  color: CHART_COLORS.blue },
              { label: "Turbine Outflow", value: `${outflowRate} m³/s`, color: CHART_COLORS.teal },
              { label: "Spillway",        value: "5.8 m³/s",            color: CHART_COLORS.warning },
              { label: "Net Change",      value: `${netChange > 0 ? "+" : ""}${netChange} m³/s`, color: netChange >= 0 ? "#22c55e" : "#ef4444" },
              { label: "Head (Net)",      value: "52.4 m",              color: "var(--ds-text)" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--ds-border)", fontSize: 12 }}>
                <span style={{ color: "var(--ds-text-faint)" }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
          {/* Generation */}
          <div>
            <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 6 }}>Generation Status</div>
            {[
              { label: "Current Output",   value: `${site.generation} MW`,    color: CHART_COLORS.blue },
              { label: "Capacity",         value: `${site.capacity} MW`,      color: "var(--ds-text)" },
              { label: "Hydraulic Eff.",   value: "91.2%",                    color: "#22c55e" },
              { label: "Water-to-Energy",  value: "3.42 MWh/ML",             color: "var(--ds-text-muted)" },
              { label: "Turbines Online",  value: "2 / 3",                   color: CHART_COLORS.teal },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--ds-border)", fontSize: 12 }}>
                <span style={{ color: "var(--ds-text-faint)" }}>{r.label}</span>
                <span style={{ color: r.color, fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Reservoir level trend */}
        <ChartCard title="Reservoir Level Trend (30D)" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={reservoirTrend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="day" {...axisProps} />
              <YAxis yAxisId="lvl" {...axisProps} domain={[70, 95]} label={{ value: "Level m", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <YAxis yAxisId="flow" orientation="right" {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
              <ReferenceLine yAxisId="lvl" y={30} stroke={CHART_COLORS.danger} strokeDasharray="3 3" label={{ value: "Min", fontSize: 8, fill: CHART_COLORS.danger }} />
              <Area yAxisId="lvl" type="monotone" dataKey="level" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.12} strokeWidth={2} dot={false} name="Level m" />
              <Line yAxisId="flow" type="monotone" dataKey="inflow" stroke={CHART_COLORS.teal} strokeWidth={1.5} dot={false} name="Inflow m³/s" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Flow 24H */}
        <ChartCard title="Turbine Flow & Generation (24H)" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={flow24h} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="time" {...axisProps} interval={5} />
              <YAxis yAxisId="flow" {...axisProps} label={{ value: "m³/s", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <YAxis yAxisId="gen" orientation="right" {...axisProps} label={{ value: "MW", angle: 90, position: "insideRight", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
              <Bar yAxisId="flow" dataKey="spillwayFlow" fill={CHART_COLORS.warning} opacity={0.7} name="Spillway m³/s" radius={[2, 2, 0, 0]} />
              <Line yAxisId="flow" type="monotone" dataKey="turbineFlow" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Turbine Flow m³/s" />
              <Line yAxisId="gen"  type="monotone" dataKey="generation"  stroke={CHART_COLORS.teal} strokeWidth={2} strokeDasharray="5 4" dot={false} name="Generation MW" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Gate status */}
      <div className="chart-card">
        <div className="chart-card-header"><span className="chart-card-title">Gate & Valve Status</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {GATES.map(g => (
            <div key={g.name} style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${GATE_COLOR[g.status]}33`, background: `${GATE_COLOR[g.status]}0d` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ds-text)" }}>{g.name}</span>
                <span style={{ fontSize: 10, color: GATE_COLOR[g.status], textTransform: "uppercase", fontWeight: 700 }}>{g.status}</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <ProgressBar value={g.position} status={g.status === "open" ? "success" : g.status === "partial" ? "warning" : "danger"} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ds-text-faint)" }}>
                <span>Position: {g.position}%</span>
                <span>{g.flow > 0 ? `${g.flow} m³/s` : "No flow"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
