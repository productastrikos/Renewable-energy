import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { IcoBattery, IcoDollar, IcoZap, IcoSparkle } from "../../components/shared/Icons";

const schedule24h = Array.from({ length: 24 }, (_, h) => {
  const isPeakMorning = h >= 7 && h <= 9;
  const isPeakEvening = h >= 17 && h <= 21;
  const price = isPeakEvening ? 44 + h * 0.4 : isPeakMorning ? 38 + h * 0.5 : 16 + h * 0.3;
  const soc = h < 6 ? 45 + h * 3
    : h < 10 ? 60 + (h - 6) * 8
    : h < 14 ? 90 - (h - 10) * 3
    : h < 17 ? 78 + (h - 14) * 1.5
    : h < 21 ? 82 - (h - 17) * 12
    : 30 + (h - 21) * 5;
  const mode = isPeakEvening ? "discharge" : h >= 9 && h <= 13 ? "charge" : "idle";
  const power = isPeakEvening ? -(30 + Math.random() * 10) : h >= 9 && h <= 13 ? (20 + Math.random() * 8) : 0;
  return {
    hour: `${String(h).padStart(2,"0")}:00`,
    price: +price.toFixed(1),
    soc: Math.max(15, Math.min(95, +soc.toFixed(1))),
    power: +power.toFixed(1),
    mode,
    revenue: isPeakEvening ? +(Math.abs(power) * price / 1000).toFixed(2) : 0,
  };
});

const DISPATCH_WINDOWS = [
  { label: "Overnight Charge",   start: "00:00", end: "06:00", type: "idle",      note: "Low-price idle. Maintain SOC." },
  { label: "Morning Peak (Sell)", start: "07:00", end: "09:00", type: "discharge", note: "Partial discharge at $38–42/MWh." },
  { label: "Solar Charging",     start: "09:00", end: "13:00", type: "charge",    note: "Charge from surplus solar generation." },
  { label: "Afternoon Idle",     start: "13:00", end: "17:00", type: "idle",      note: "Preserve SOC for evening peak." },
  { label: "Evening Peak (Sell)", start: "17:00", end: "21:00", type: "discharge", note: "Full discharge at $44–52/MWh — highest revenue window." },
  { label: "Overnight Recharge", start: "21:00", end: "23:59", type: "charge",    note: "Grid recharge at off-peak rates." },
];

const WINDOW_COLOR: Record<string, string> = { charge: CHART_COLORS.teal, discharge: CHART_COLORS.amber, idle: "#6b7280" };
const WINDOW_BG:    Record<string, string> = { charge: "#0d9488", discharge: "#d97706", idle: "#37415150" };

export default function SiteDispatchOptimizer() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const dailyRevenue = 4840;
  const arbitrageRev = 3200;
  const freqRev      = 1640;
  const currentSOC   = 76;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Today's Revenue"  value={`$${(dailyRevenue / 1000).toFixed(1)}K`} unit={undefined} icon={<IcoDollar  width={14} height={14} />} rag="success" trend="+$0.4K vs yesterday" trendDir="up" />
        <KpiCard label="Arbitrage"        value={`$${(arbitrageRev / 1000).toFixed(1)}K`} unit={undefined} icon={<IcoZap     width={14} height={14} />} rag="success" trend="Price delta strategy" trendDir="up" />
        <KpiCard label="Grid Services"    value={`$${(freqRev / 1000).toFixed(1)}K`}      unit={undefined} icon={<IcoSparkle width={14} height={14} />} rag="info"    trend="FCR + FFR active"    trendDir="up" />
        <KpiCard label="Current SOC"      value={currentSOC}                              unit="%"         icon={<IcoBattery width={14} height={14} />} rag={currentSOC > 80 ? "success" : currentSOC > 30 ? "info" : "danger"} trend="→ 82% target" trendDir="up" />
      </div>

      {/* Main dispatch chart */}
      <ChartCard title="AI Dispatch Schedule (24H) — SOC · Price · Power" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={{
        description: "AI-optimised BESS dispatch schedule showing State of Charge (%), grid price ($/MWh), and charge/discharge power (MW). The AI maximises revenue by charging during low-price periods and discharging during peak-price windows.",
        stats: [
          { label: "Daily Arbitrage Revenue", value: `$${(arbitrageRev / 1000).toFixed(1)}K`, highlight: true },
          { label: "Peak Discharge Window",   value: "17:00–21:00 @ $44–52/MWh" },
          { label: "Charge Window",           value: "09:00–13:00 (solar surplus)", highlight: true },
          { label: "Grid Services Revenue",   value: `$${(freqRev / 1000).toFixed(1)}K` },
        ],
        source: "Astrikos AI Dispatch Engine v2.4 — MILP optimization",
        note:   "Schedule updates every 15 minutes using real-time grid price forecasts and SOC state.",
      }}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={schedule24h} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
            <XAxis dataKey="hour" {...axisProps} interval={2} />
            <YAxis yAxisId="soc"   {...axisProps} domain={[0, 100]} label={{ value: "SOC %", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <YAxis yAxisId="price" orientation="right" {...axisProps} domain={[0, 60]} label={{ value: "$/MWh", angle: 90, position: "insideRight", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            <ReferenceLine yAxisId="soc" y={20} stroke={CHART_COLORS.danger}  strokeDasharray="3 3" label={{ value: "Min SOC", fontSize: 8, fill: CHART_COLORS.danger  }} />
            <ReferenceLine yAxisId="soc" y={90} stroke={CHART_COLORS.warning} strokeDasharray="3 3" label={{ value: "Max SOC", fontSize: 8, fill: CHART_COLORS.warning }} />
            <Bar yAxisId="soc" dataKey="power" fill={CHART_COLORS.amber} fillOpacity={0.4} name="Dispatch MW (charge+)" radius={[2, 2, 0, 0]} />
            <Area yAxisId="soc"   type="monotone" dataKey="soc"   stroke={CHART_COLORS.blue}  fill={CHART_COLORS.blue}  fillOpacity={0.15} strokeWidth={2} dot={false} name="SOC %" />
            <Line yAxisId="price" type="monotone" dataKey="price" stroke={CHART_COLORS.amber} strokeWidth={2} strokeDasharray="5 4" dot={false} name="Grid Price $/MWh" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Dispatch windows */}
      <div className="chart-card">
        <div className="chart-card-header"><span className="chart-card-title">Dispatch Windows — AI Schedule</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {DISPATCH_WINDOWS.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: "1px solid var(--ds-border)", background: i % 2 === 0 ? undefined : "rgba(255,255,255,0.01)" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: WINDOW_COLOR[w.type], flexShrink: 0 }} />
              <div style={{ minWidth: 80, fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>{w.start} – {w.end}</div>
              <div style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: WINDOW_BG[w.type] + "22", color: WINDOW_COLOR[w.type], border: `1px solid ${WINDOW_COLOR[w.type]}44`, flexShrink: 0 }}>
                {w.type.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>{w.label}</div>
              <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginLeft: "auto" }}>{w.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue summary */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title"><IcoSparkle width={11} height={11} /> AI Dispatch Intelligence — {site.name}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            { title: "Evening Peak Opportunity", type: "success" as const, insight: `Grid price forecast shows $48–54/MWh from 18:00–20:00 tonight. AI has pre-charged to 90% SOC to maximise discharge revenue of ~$${Math.round(arbitrageRev * 0.6 / 100) * 100}.` },
            { title: "FCR Frequency Response", type: "info" as const, insight: "Currently providing 8 MW of Frequency Containment Reserve (FCR). Grid event at 14:22 triggered 4 MW response — successfully maintained grid frequency within ±50 mHz." },
            { title: "Tomorrow's Forecast", type: "info" as const, insight: `P50 arbitrage revenue forecast: $${(dailyRevenue * 1.05 / 1000).toFixed(1)}K. High wind tomorrow (12 m/s avg) expected to reduce grid prices — shifting strategy to FCR focus.` },
          ].map(item => (
            <div key={item.title} className={`ai-finding-card modal-${item.type}`} style={{ padding: "10px 12px" }}>
              <div className="ai-finding-site">{item.title}</div>
              <div style={{ fontSize: 11.5, color: "#e9d5ff", lineHeight: 1.5, marginTop: 4 }}>{item.insight}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
