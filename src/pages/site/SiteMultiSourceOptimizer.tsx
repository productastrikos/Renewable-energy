import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoZap, IcoSun, IcoWind, IcoBattery, IcoDollar, IcoSparkle } from "../../components/shared/Icons";

const dispatch24h = Array.from({ length: 48 }, (_, i) => {
  const h = i / 2;
  const solar  = Math.max(0, Math.round(site_solar(h)));
  const wind   = Math.max(0, Math.round(50 + Math.sin(i * 0.35) * 20 + (Math.random() - 0.5) * 8));
  const bess   = h >= 17 && h <= 21 ? -Math.round(30 + Math.random() * 8) : h >= 9 && h <= 13 ? Math.round(18 + Math.random() * 6) : 0;
  const grid   = Math.max(0, 200 - solar - wind + bess);
  const price  = h >= 17 && h <= 21 ? 46 + h : h >= 7 && h <= 9 ? 38 + h : 16 + h * 0.4;
  return {
    time: `${String(Math.floor(h)).padStart(2,"0")}:${i % 2 === 0 ? "00" : "30"}`,
    solar, wind, bess: Math.abs(bess), bessMode: bess < 0 ? -bess : 0,
    grid: Math.round(grid), price: +price.toFixed(1),
    total: solar + wind,
  };
});

function site_solar(h: number) {
  return Math.max(0, 120 * Math.sin(Math.PI * (h - 5) / 14) + (Math.random() - 0.5) * 10);
}

const energyMix = [
  { source: "Solar PV", pct: 42, mwh: 3840, color: CHART_COLORS.amber },
  { source: "Wind",     pct: 31, mwh: 2835, color: CHART_COLORS.blue  },
  { source: "BESS",     pct: 18, mwh: 1647, color: CHART_COLORS.violet },
  { source: "Grid",     pct: 9,  mwh: 823,  color: "#6b7280" },
];

const OPTIM_SCENARIOS = [
  { name: "Current (AI Optimized)", revenue: 18420, co2: 4.2,  lcoe: 38, highlight: true },
  { name: "Solar Only",             revenue: 12100, co2: 2.8,  lcoe: 44, highlight: false },
  { name: "Wind + Solar",           revenue: 14800, co2: 3.6,  lcoe: 41, highlight: false },
  { name: "No BESS",                revenue: 15200, co2: 3.9,  lcoe: 42, highlight: false },
];

export default function SiteMultiSourceOptimizer() {
  const { site } = useOutletContext<SiteWorkspaceContext>();

  const totalGen = Math.round(dispatch24h.reduce((s, d) => s + d.solar + d.wind, 0) / 2);
  const revenueEst = 18420;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <KpiCard label="Total Generation"  value={`${(totalGen / 1000).toFixed(1)}`} unit="GWh"  icon={<IcoZap     width={14} height={14} />} rag="success" trend="+4%" trendDir="up" />
        <KpiCard label="Solar Contribution" value="42"                                unit="%"     icon={<IcoSun     width={14} height={14} />} rag={rag(42, 35, 25)} trend="Peak 11:00" trendDir="up" />
        <KpiCard label="Wind Contribution"  value="31"                                unit="%"     icon={<IcoWind    width={14} height={14} />} rag="info"   trend="8.4 m/s avg" trendDir="up" />
        <KpiCard label="BESS Contribution"  value="18"                                unit="%"     icon={<IcoBattery width={14} height={14} />} rag="info"   trend="SOC 76%" trendDir="up" />
        <KpiCard label="Daily Revenue"      value={`$${(revenueEst / 1000).toFixed(1)}K`} unit={undefined} icon={<IcoDollar width={14} height={14} />} rag="success" trend="+$1.2K vs baseline" trendDir="up" />
      </div>

      {/* Stacked dispatch chart */}
      <ChartCard title="Multi-Source Dispatch (24H) — AI Optimized" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={{
        description: "AI-optimised real-time dispatch showing contribution from Solar PV, Wind, and BESS charge/discharge in MW. The AI maximises revenue by co-optimising all sources against grid prices.",
        stats: [
          { label: "Solar Peak",    value: "~120 MW (11:00)", highlight: true },
          { label: "Wind Average",  value: "~50 MW (steady)" },
          { label: "BESS Discharge",value: "30–38 MW (17–21h)", highlight: true },
          { label: "Revenue Uplift",value: "+$1.2K vs no-BESS" },
        ],
        source: "Astrikos Multi-Source Optimizer v3.0 — MILP + MPC",
        note:   "BESS is charged from solar surplus (09–13h) and discharged during evening peak (17–21h) for maximum arbitrage value.",
      }}>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={dispatch24h.filter((_, i) => i % 2 === 0)} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" {...axisProps} interval={3} />
            <YAxis yAxisId="mw"    {...axisProps} label={{ value: "MW", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <YAxis yAxisId="price" orientation="right" {...axisProps} domain={[0, 70]} label={{ value: "$/MWh", angle: 90, position: "insideRight", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            <Bar yAxisId="mw" dataKey="solar"    fill={CHART_COLORS.amber}  opacity={0.85} name="Solar MW"    radius={[0, 0, 0, 0]} stackId="gen" />
            <Bar yAxisId="mw" dataKey="wind"     fill={CHART_COLORS.blue}   opacity={0.85} name="Wind MW"     radius={[0, 0, 0, 0]} stackId="gen" />
            <Bar yAxisId="mw" dataKey="bessMode" fill={CHART_COLORS.violet} opacity={0.75} name="BESS Discharge" radius={[2, 2, 0, 0]} stackId="gen" />
            <Line yAxisId="price" type="monotone" dataKey="price" stroke={CHART_COLORS.sky} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Grid Price $/MWh" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Energy mix */}
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Energy Mix (Today)</span></div>
          <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {energyMix.map(s => (
              <div key={s.source}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                    <span style={{ fontWeight: 600, color: "var(--ds-text)" }}>{s.source}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                    <span style={{ color: "var(--ds-text-faint)" }}>{s.mwh.toLocaleString()} MWh</span>
                    <span style={{ fontWeight: 700, color: s.color }}>{s.pct}%</span>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 10 }}>
                  <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 4, background: s.color }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 6, padding: "8px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 6, fontSize: 11 }}>
              <span style={{ color: "var(--ds-text-faint)" }}>Renewable fraction: </span>
              <span style={{ fontWeight: 700, color: "#22c55e" }}>91%</span>
              <span style={{ color: "var(--ds-text-faint)", marginLeft: 12 }}>Carbon intensity: </span>
              <span style={{ fontWeight: 700, color: CHART_COLORS.teal }}>42 gCO₂/MWh</span>
            </div>
          </div>
        </div>

        {/* Scenario comparison */}
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Optimization Scenario Comparison</span></div>
          <table className="ae-table" style={{ width: "100%", fontSize: 11 }}>
            <thead><tr><th>Scenario</th><th>Revenue/Day</th><th>LCOE</th><th>CO₂ Saved</th></tr></thead>
            <tbody>
              {OPTIM_SCENARIOS.map(s => (
                <tr key={s.name} style={{ background: s.highlight ? "rgba(56,189,248,0.06)" : undefined }}>
                  <td style={{ fontWeight: s.highlight ? 700 : 400, color: s.highlight ? CHART_COLORS.blue : "var(--ds-text)" }}>
                    {s.highlight && "★ "}{s.name}
                  </td>
                  <td style={{ color: s.highlight ? "#22c55e" : "var(--ds-text)", fontWeight: s.highlight ? 700 : 400 }}>${s.revenue.toLocaleString()}</td>
                  <td>${s.lcoe}/MWh</td>
                  <td style={{ color: CHART_COLORS.teal }}>{s.co2}K tCO₂</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--ds-text-faint)", borderTop: "1px solid var(--ds-border)" }}>
            AI optimization delivers +${(revenueEst - 15200).toLocaleString()}/day vs no-BESS baseline
          </div>
        </div>
      </div>

      {/* AI insights */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title"><IcoSparkle width={11} height={11} /> Multi-Source AI Intelligence — {site.name}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            { title: "Solar-Wind Correlation", type: "info" as const, insight: "Today's solar-wind negative correlation score: 0.34. Wind compensates during morning cloud cover (06–08h), reducing BESS cycling by 18%. Optimal co-location configuration." },
            { title: "BESS Pre-Charge Alert",  type: "success" as const, insight: "Wind generation surplus forecast for 13:00–15:00 (est. +22 MW vs load). AI scheduling additional BESS charge cycle to capture surplus before evening peak discharge." },
            { title: "Grid Congestion Alert",  type: "warning" as const, insight: "Grid operator issued 31% curtailment probability for tomorrow 11:00–14:00 (transmission constraint). AI has shifted BESS charge window to 09:00–11:00 to reduce curtailment exposure." },
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
