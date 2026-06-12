import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import { ProgressBar } from "../../components/shared/ProgressBar";
import {
  LineChart, Line, BarChart, Bar, ComposedChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceLine,
  chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { generate24h, generate7d, rag, clipToNow } from "../../utils/ragHelpers";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { IcoZap, IcoActivity, IcoCpu, IcoWind, IcoSun, IcoCloud, IcoBell, IcoSparkle } from "../../components/shared/Icons";
import { SiteDigitalTwin } from "../../components/digital-twin/SiteDigitalTwin";
import { useTimeframe } from "../../components/shared/ChartTimeframeControl";

const gen24 = generate24h(195, 0.1);
const gen7d = generate7d(1350, 0.09);

const curtailData = Array.from({ length: 8 }, (_, i) => ({
  time: `${String(i * 3).padStart(2, "0")}:00`,
  generation: Math.round(160 + Math.random() * 40),
  curtailed: Math.round(Math.random() * 12),
  available: Math.round(185 + Math.random() * 20),
}));

// Grid events log
const GRID_EVENTS = [
  { ts: "14:22:05", type: "info",    msg: "Frequency deviation +0.08 Hz — auto-corrected" },
  { ts: "13:45:11", type: "warning", msg: "Curtailment command: −18 MW for 4 min (grid congestion)" },
  { ts: "12:30:48", type: "success", msg: "Reactive power setpoint updated: Q = +12 MVAR" },
  { ts: "11:15:22", type: "info",    msg: "Ramp rate limit applied: 5 MW/min during cloud-front" },
  { ts: "09:02:37", type: "warning", msg: "Voltage deviation 0.94 pu — STATCOM compensating" },
];

// BESS SOC schedule (24h)
const bessSchedule = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}:00`,
  soc:  h < 6 ? 45 + h * 2 : h < 10 ? 55 + h * 4 : h < 14 ? 90 - (h - 10) * 2 : h < 18 ? 80 + (h - 14) * 1.5 : 85 - (h - 18) * 8,
  price: h >= 7 && h <= 9 ? 38 + h : h >= 17 && h <= 20 ? 44 + h * 0.5 : 16 + h * 0.3,
  mode:  h >= 17 && h <= 20 ? "discharge" : h >= 9 && h <= 14 ? "charge" : "idle",
}));

const lossData = [
  { name: "Soiling", value: 2.1, fill: CHART_COLORS.amber },
  { name: "Shading", value: 1.3, fill: CHART_COLORS.sky },
  { name: "Temperature", value: 0.8, fill: CHART_COLORS.danger },
  { name: "Inverter", value: 1.5, fill: CHART_COLORS.warning },
  { name: "Wiring", value: 0.4, fill: CHART_COLORS.violet },
  { name: "Other", value: 0.6, fill: CHART_COLORS.teal },
];

const weatherScatter = Array.from({ length: 20 }, (_, i) => ({
  irradiance: Math.round(200 + i * 35 + (Math.random() - 0.5) * 50),
  generation: Math.round(50 + i * 8.5 + (Math.random() - 0.5) * 20),
  temp: Math.round(25 + Math.random() * 20),
}));


export default function SiteOperations() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const { tf: genTf, setTf: setGenTf } = useTimeframe("24H");
  const [showDT, setShowDT] = useState(false);

  const genData = genTf === "7D"
    ? gen7d.map((d) => ({ time: d.day, actual: d.actual, forecast: d.forecast }))
    : clipToNow(gen24).map((d) => ({ time: d.time, actual: d.actual, forecast: d.forecast }));

  const exportPower = Math.round(site.generation * 0.97);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <KpiCard label="Current Generation" value={site.generation} unit="MW" icon={<IcoSun width={14} height={14} />} rag={rag(site.generation / site.capacity * 100, 70, 50)} trend="+4 MW" trendDir="up" />
        <KpiCard label="Daily Energy" value={`${Math.round(site.generation * 8 / 1000 * 10) / 10}`} unit="GWh" icon={<IcoZap width={14} height={14} />} rag="success" trend="+0.3 GWh" trendDir="up" />
        <KpiCard label="Performance Ratio" value={site.pr} unit="%" icon={<IcoCpu width={14} height={14} />} rag={rag(site.pr, 82, 76)} trend="+0.8%" trendDir="up" />
        <KpiCard label="CUF" value={site.cuf} unit="%" icon={<IcoActivity width={14} height={14} />} rag={rag(site.cuf, 75, 65)} trend="+1%" trendDir="up" />
        <KpiCard label="Export Power" value={exportPower} unit="MW" icon={<IcoWind width={14} height={14} />} rag="success" trend="+3 MW" trendDir="up" />
      </div>

      {/* Main content: Charts left, DT right */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Actual vs Forecast */}
          <ChartCard title="Actual vs Forecast Generation" timeframeOptions={["24H", "7D"]} timeframe={genTf} onTimeframeChange={setGenTf} info={{
            description: "Real-time AC output (solid) vs Astrikos AI forecast (dashed) for the selected timeframe. Divergence from forecast can indicate weather impact, equipment faults, or curtailment.",
            stats: [
              { label: "Current Output",  value: `${site.generation} MW`, highlight: true },
              { label: "Capacity",        value: `${site.capacity} MW` },
              { label: "Utilisation",     value: `${Math.round(site.generation / site.capacity * 100)}%`, highlight: true },
              { label: "Forecast Model",  value: "Astrikos AI v3.1 (LSTM)" },
            ],
            source:   `${site.name} SCADA — Tag: ${site.id.toUpperCase()}.AC_POWER_KW`,
            standard: "IEC 61724-1 — AC power measurement",
            note:     "Sustained under-forecast generation warrants investigation of equipment condition or weather-related derating.",
          }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={genData}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual MW" />
                <Line type="monotone" dataKey="forecast" stroke={CHART_COLORS.violet} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Forecast MW" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Curtailment + Loss Analysis side by side */}
          <div className="chart-grid-2" style={{ gap: 12 }}>
            <ChartCard title="Curtailment Analysis (24H)" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={{
              description: "Comparison of generated power, available (uncurtailed) capacity, and curtailed energy lost to grid operator commands over 24 hours.",
              stats: [
                { label: "Curtailment Today", value: site.type === "Solar" ? "3.2 MWh" : "0 MWh", highlight: true },
                { label: "Available Capacity", value: `${site.capacity} MW` },
                { label: "Curtail Trigger",   value: "Grid congestion / APC command" },
              ],
              source: "PPC (Power Plant Controller) — IEC 61850 curtailment signals",
              note:   "Curtailment reduces revenue and is typically grid-operator-driven. High frequency may indicate grid infrastructure constraints.",
            }}>
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={curtailData}>
                  <XAxis dataKey="time" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 9, color: "var(--ds-text-muted)" }} />
                  <Bar dataKey="generation" fill={CHART_COLORS.blue} opacity={0.85} name="Generated" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="curtailed" fill={CHART_COLORS.danger} opacity={0.85} name="Curtailed" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="available" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} name="Available" />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Loss Analysis (% PR Impact)" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={{
              description: "Breakdown of Performance Ratio losses by category. Each bar shows the percentage-point PR reduction attributed to that loss mechanism.",
              stats: [
                { label: "Soiling",     value: "2.1%", highlight: true },
                { label: "Inverter",    value: "1.5%" },
                { label: "Shading",     value: "1.3%" },
                { label: "Temperature", value: "0.8%" },
                { label: "Wiring",      value: "0.4%" },
                { label: "Other",       value: "0.6%" },
              ],
              standard: "IEC 61724-1:2021 — Loss categorisation",
              note:     "Soiling and inverter losses are typically the most actionable. Schedule cleaning when soiling loss exceeds 2%.",
            }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={lossData} layout="vertical">
                  <XAxis type="number" {...axisProps} unit="%" />
                  <YAxis type="category" dataKey="name" {...axisProps} width={80} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
                  <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}%`, "PR Loss"]} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {lossData.map((d, i) => <Bar key={i} dataKey="value" fill={d.fill} />)}
                    {lossData.map((d, i) => (
                      <rect key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Weather Impact */}
          <ChartCard title="Weather Impact on Generation" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={{
            description: "Scatter plot showing the correlation between plane-of-array irradiance (W/m²) and AC generation output (MW). A tight linear relationship indicates healthy system performance; scatter or low-slope points indicate losses.",
            stats: [
              { label: "Irradiance",   value: "824 W/m²", highlight: true },
              { label: "Temperature",  value: "34°C" },
              { label: "Wind Speed",   value: "3.2 m/s" },
              { label: "Cloud Cover",  value: "12%" },
              { label: "Humidity",     value: "28%" },
            ],
            source:   "Pyranometer (Class A) + SCADA · 5-min resolution",
            standard: "IEC 60904-3 — Irradiance measurement reference",
            note:     "Points below the expected generation line during high irradiance indicate soiling, shading, or thermal derating.",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 6 }}>Irradiance vs Generation</div>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart data={weatherScatter}>
                    <XAxis dataKey="irradiance" {...axisProps} label={{ value: "W/m²", position: "insideBottom", offset: -2, fontSize: 9, fill: "var(--ds-text-faint)" }} />
                    <YAxis dataKey="generation" {...axisProps} />
                    <Tooltip {...chartTooltipProps} />
                    <CartesianGrid stroke="var(--ds-chart-grid)" />
                    <Line type="monotone" dataKey="generation" stroke={CHART_COLORS.amber} dot={{ r: 3, fill: CHART_COLORS.amber }} name="Gen MW" strokeWidth={0} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 6 }}>Weather Conditions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                  {[
                    { label: "Irradiance", value: "824 W/m²", icon: <IcoSun width={12} height={12} /> },
                    { label: "Temperature", value: "34°C", icon: <IcoZap width={12} height={12} /> },
                    { label: "Wind Speed", value: "3.2 m/s", icon: <IcoWind width={12} height={12} /> },
                    { label: "Cloud Cover", value: "12%", icon: <IcoCloud width={12} height={12} /> },
                    { label: "Humidity", value: "28%", icon: <IcoActivity width={12} height={12} /> },
                  ].map((w) => (
                    <div key={w.label} className="stat-row" style={{ fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ds-text-muted)" }}>{w.icon} {w.label}</span>
                      <strong style={{ color: "var(--ds-text)" }}>{w.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Production Overlay Digital Twin */}
        <div style={{ width: 260 }}>
          <div className="dt-panel">
            <div className="dt-header" style={{ cursor: "pointer" }} onClick={() => setShowDT((p) => !p)}>
              <span className="chart-card-title">Production Overlay DT</span>
              <span className="chip info" style={{ fontSize: 9 }}>LIVE</span>
            </div>
            {showDT ? (
              <div className="dt-body">
                <SiteDigitalTwin siteId={site.id} site={site} />
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 12 }}>Production overlay showing real-time generation per block</div>
                <button className="btn-primary" style={{ fontSize: 12, height: 30 }} onClick={() => setShowDT(true)}>Launch DT</button>
              </div>
            )}
            {showDT && (
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--ds-border)" }}>
                {[
                  { label: "Block 1", value: "48.2 MW", pct: 96 },
                  { label: "Block 2", value: "45.6 MW", pct: 91 },
                  { label: "Block 3", value: "50.1 MW", pct: 100 },
                ].map((b) => (
                  <div key={b.label} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2 }}>
                      <span style={{ color: "var(--ds-text-muted)" }}>{b.label}</span>
                      <span style={{ color: "var(--ds-text)" }}>{b.value}</span>
                    </div>
                    <div className="at-health-bar"><div className="at-health-fill" style={{ width: `${b.pct}%`, background: CHART_COLORS.blue }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Grid Compliance / PPC ─────────────────────────────────────── */}
      <div className="ops-grid-panel">
        <div className="ops-grid-header">
          <IcoZap width={12} height={12} style={{ color: "var(--ds-accent)" }} />
          <span>Grid Compliance &amp; Active Power Control (PPC)</span>
          <span className="chip success" style={{ fontSize: 9, marginLeft: "auto" }}>Grid-Synced</span>
          <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>IEC 61850 · IEC 60870-5-104</span>
        </div>

        <div className="ops-grid-body">
          {/* Live telemetry grid */}
          <div className="ops-grid-metrics">
            {[
              { label: "Active Power",      value: `${exportPower} MW`,          target: `${site.capacity} MW`,  pct: Math.round(exportPower / site.capacity * 100), unit: "MW",    color: CHART_COLORS.blue },
              { label: "Reactive Power",    value: "+12.4 MVAR",                 target: "±20 MVAR",              pct: 62,                                            unit: "MVAR",  color: CHART_COLORS.teal },
              { label: "Power Factor",      value: "0.994",                       target: "≥ 0.95",                pct: 99,                                            unit: "PF",    color: CHART_COLORS.success },
              { label: "Grid Frequency",    value: "50.02 Hz",                   target: "50.00 Hz",              pct: 98,                                            unit: "Hz",    color: CHART_COLORS.amber },
              { label: "Voltage (HV Bus)",  value: "132.4 kV",                   target: "132 kV ±5%",            pct: 96,                                            unit: "kV",    color: CHART_COLORS.violet },
              { label: "Ramp Rate",         value: "4.8 MW/min",                 target: "≤ 5 MW/min",            pct: 96,                                            unit: "MW/min",color: CHART_COLORS.sky },
              { label: "Curtailment Today", value: site.type === "Solar" ? "3.2 MWh" : "0 MWh", target: "< 10 MWh", pct: site.type === "Solar" ? 68 : 100,         unit: "MWh",   color: CHART_COLORS.warning },
              { label: "APC Setpoint",      value: `${site.capacity} MW`,        target: "Grid Operator",         pct: 100,                                           unit: "MW",    color: CHART_COLORS.success },
            ].map((m) => (
              <div key={m.label} className="ops-gm-cell">
                <div className="ops-gm-label">{m.label}</div>
                <div className="ops-gm-value" style={{ color: m.color }}>{m.value}</div>
                <div className="ops-gm-target">{m.target}</div>
                <ProgressBar value={m.pct} status={m.pct >= 90 ? "success" : m.pct >= 75 ? "warning" : "danger"} />
              </div>
            ))}
          </div>

          {/* Grid events log */}
          <div className="ops-grid-events">
            <div className="ops-ge-title"><IcoBell width={10} height={10} /> Grid Event Log</div>
            {GRID_EVENTS.map((e, i) => (
              <div key={i} className={`ops-ge-row ops-ge-${e.type}`}>
                <span className="ops-ge-ts">{e.ts}</span>
                <span className="ops-ge-msg">{e.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BESS Optimization (shown for BESS / Hybrid sites) ────────── */}
      {(site.type === "BESS" || site.type === "Hybrid") && (
        <div className="ops-bess-panel">
          <div className="ops-grid-header">
            <IcoSparkle width={12} height={12} style={{ color: "#818cf8" }} />
            <span>BESS Energy Management &amp; Dispatch Optimization</span>
            <span className="chip info" style={{ fontSize: 9, marginLeft: "auto" }}>AI-Optimized</span>
          </div>

          <div className="ops-bess-body">
            {/* SOC + dispatch chart */}
            <div style={{ flex: 2, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 6 }}>
                State of Charge &amp; Dispatch Schedule (24H) — AI arbitrage optimization
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={bessSchedule}>
                  <XAxis dataKey="hour" {...axisProps} interval={3} />
                  <YAxis yAxisId="soc"   {...axisProps} domain={[0, 100]} label={{ value: "SOC %", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
                  <YAxis yAxisId="price" orientation="right" {...axisProps} label={{ value: "$/MWh", angle: 90, position: "insideRight", fontSize: 8, fill: "var(--ds-text-faint)" }} />
                  <Tooltip {...chartTooltipProps} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                  <ReferenceLine yAxisId="soc" y={20} stroke={CHART_COLORS.danger} strokeDasharray="3 3" label={{ value: "Min SOC", fontSize: 8, fill: "var(--ds-text-faint)" }} />
                  <ReferenceLine yAxisId="soc" y={90} stroke={CHART_COLORS.warning} strokeDasharray="3 3" label={{ value: "Max SOC", fontSize: 8, fill: "var(--ds-text-faint)" }} />
                  <Area yAxisId="soc" type="monotone" dataKey="soc" stroke={CHART_COLORS.indigo} fill={CHART_COLORS.indigo} fillOpacity={0.15} strokeWidth={2} dot={false} name="SOC %" />
                  <Line yAxisId="price" type="monotone" dataKey="price" stroke={CHART_COLORS.amber} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Grid Price $/MWh" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* BESS KPI column */}
            <div className="ops-bess-kpis">
              {[
                { label: "Current SOC",       value: "76%",      color: CHART_COLORS.indigo,  sub: "Target: 80–85%" },
                { label: "Charge Power",       value: "0 MW",     color: CHART_COLORS.teal,    sub: "Idle" },
                { label: "Discharge Power",    value: "0 MW",     color: CHART_COLORS.blue,    sub: "Idle" },
                { label: "Today's Cycles",     value: "1.2",      color: CHART_COLORS.slate,   sub: "of 1.5 limit" },
                { label: "Arbitrage Revenue",  value: "+$4,200",  color: CHART_COLORS.success, sub: "Today" },
                { label: "Grid Services",      value: "FCR: ON",  color: CHART_COLORS.amber,   sub: "Frequency Ctrl" },
                { label: "Next Discharge",     value: "17:30",    color: CHART_COLORS.violet,  sub: "40 MW · 2.5h" },
                { label: "Roundtrip Eff.",     value: "92.4%",    color: CHART_COLORS.teal,    sub: "LFP chemistry" },
              ].map((k) => (
                <div key={k.label} className="ops-bess-kpi">
                  <div className="ops-bess-kpi-label">{k.label}</div>
                  <div className="ops-bess-kpi-value" style={{ color: k.color }}>{k.value}</div>
                  <div className="ops-bess-kpi-sub">{k.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
