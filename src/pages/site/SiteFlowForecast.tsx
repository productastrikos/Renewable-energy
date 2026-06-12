import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoDroplets, IcoZap, IcoActivity, IcoCpu } from "../../components/shared/Icons";

const inflow7d = Array.from({ length: 84 }, (_, i) => {
  const day = Math.floor(i / 12);
  const base = 48 + Math.sin(day * 0.9) * 14 + (Math.random() - 0.5) * 4;
  const p50 = +base.toFixed(1);
  const p10 = +(p50 * 1.22).toFixed(1);
  const p90 = +(p50 * 0.78).toFixed(1);
  const actual = i < 40 ? +(p50 + (Math.random() - 0.5) * 6).toFixed(1) : undefined;
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return { time: `${days[day]} ${String((i % 12) * 2).padStart(2,"0")}:00`, p50, p10, p90, actual };
});

const reservoirProjection = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  level: +(82.4 - i * 0.28 + Math.sin(i * 0.5) * 1.5 + (Math.random() - 0.5) * 0.3).toFixed(1),
  minLevel: 30,
  targetLevel: 75,
}));

const CATCHMENT = [
  { zone: "Upper Catchment A", area: "420 km²", rainfall: "68 mm", contribution: "38%", lag: "6–8h" },
  { zone: "Upper Catchment B", area: "310 km²", rainfall: "82 mm", contribution: "31%", lag: "4–6h" },
  { zone: "Mid Catchment",     area: "540 km²", rainfall: "45 mm", contribution: "21%", lag: "10–14h" },
  { zone: "Direct Reservoir",  area: "85 km²",  rainfall: "71 mm", contribution: "10%", lag: "0–2h" },
];

export default function SiteFlowForecast() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const peakInflow = 78.4;
  const currentLevel = 82.4;
  const mape = 6.2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Current Inflow"     value="48.2"        unit="m³/s"   icon={<IcoDroplets width={14} height={14} />} rag={rag(75, 60, 30)} trend="+3.2 vs avg" trendDir="up" />
        <KpiCard label="Forecast Peak (7D)" value={peakInflow}  unit="m³/s"   icon={<IcoActivity width={14} height={14} />} rag="warning" trend="Thursday 14:00" trendDir="up" />
        <KpiCard label="Reservoir Forecast" value={currentLevel} unit="m (now)" icon={<IcoZap width={14} height={14} />}     rag="success" trend="→ 79.2m (7D)" trendDir="down" />
        <KpiCard label="Forecast MAPE"      value={mape}        unit="%"       icon={<IcoCpu width={14} height={14} />}     rag={rag(100 - mape, 95, 90)} trend="7D avg" trendDir="up" />
      </div>

      {/* 7-day inflow forecast */}
      <ChartCard title="7-Day Inflow Forecast — P10 / P50 / P90" timeframeOptions={["7D"]} timeframe="7D" onTimeframeChange={() => {}} info={{
        description: "AI-generated 7-day inflow forecast using rainfall-runoff modelling and catchment analysis. Probabilistic bands reflect uncertainty in upstream rainfall and snowmelt timing.",
        stats: [
          { label: "Forecast MAPE", value: `${mape}%`, highlight: true },
          { label: "Peak Inflow",   value: `${peakInflow} m³/s (Thu)`, highlight: true },
          { label: "Model",         value: "GR4J + LSTM ensemble" },
          { label: "Catchment Area",value: "1,355 km²" },
        ],
        source:   "Rain gauge network (42 stations) + NWP + LSTM",
        standard: "WMO-HY.2 — Hydrological forecasting guidelines",
        note:     "P90 conservative estimate used for flood risk planning. Spillway pre-opening recommended when P50 > 70 m³/s.",
      }}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={inflow7d.filter((_,i) => i % 2 === 0)} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" {...axisProps} interval={6} />
            <YAxis {...axisProps} label={{ value: "m³/s", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            <ReferenceLine y={70} stroke={CHART_COLORS.warning} strokeDasharray="3 3" label={{ value: "Spillway trigger", fontSize: 8, fill: CHART_COLORS.warning, position: "right" }} />
            <Area type="monotone" dataKey="p10" stroke="transparent" fill={CHART_COLORS.blue}  fillOpacity={0.1} name="P10 band" legendType="none" />
            <Area type="monotone" dataKey="p90" stroke="transparent" fill="#000"               fillOpacity={1}   name="P90 mask" legendType="none" />
            <Line type="monotone" dataKey="p10"    stroke={CHART_COLORS.teal}    strokeWidth={1} strokeDasharray="4 3" dot={false} name="P10 (high flow)" />
            <Line type="monotone" dataKey="p50"    stroke={CHART_COLORS.blue}    strokeWidth={2} dot={false}           name="P50 (median)" />
            <Line type="monotone" dataKey="p90"    stroke={CHART_COLORS.sky}     strokeWidth={1} strokeDasharray="4 3" dot={false} name="P90 (low flow)" />
            <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.success }} name="Actual" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Reservoir level projection */}
        <ChartCard title="30-Day Reservoir Level Projection" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={reservoirProjection} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="day" {...axisProps} interval={4} />
              <YAxis domain={[25, 90]} {...axisProps} label={{ value: "Level m", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <Tooltip {...chartTooltipProps} />
              <ReferenceLine y={30} stroke={CHART_COLORS.danger}  strokeDasharray="3 3" label={{ value: "Min op", fontSize: 8, fill: CHART_COLORS.danger }} />
              <ReferenceLine y={75} stroke={CHART_COLORS.success} strokeDasharray="3 3" label={{ value: "Target", fontSize: 8, fill: CHART_COLORS.success }} />
              <Area type="monotone" dataKey="level" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.15} strokeWidth={2} dot={false} name="Projected Level m" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Catchment contribution */}
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Catchment Contribution Analysis</span></div>
          <table className="ae-table" style={{ width: "100%", fontSize: 11 }}>
            <thead><tr><th>Zone</th><th>Area</th><th>Rainfall (24H)</th><th>Contribution</th><th>Lag Time</th></tr></thead>
            <tbody>
              {CATCHMENT.map(c => (
                <tr key={c.zone}>
                  <td style={{ fontWeight: 600 }}>{c.zone}</td>
                  <td style={{ color: "var(--ds-text-faint)" }}>{c.area}</td>
                  <td style={{ color: parseInt(c.rainfall) > 70 ? CHART_COLORS.warning : CHART_COLORS.teal }}>{c.rainfall}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 50, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 6 }}>
                        <div style={{ width: c.contribution, height: "100%", borderRadius: 3, background: CHART_COLORS.blue }} />
                      </div>
                      <span>{c.contribution}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--ds-text-faint)" }}>{c.lag}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--ds-text-faint)", borderTop: "1px solid var(--ds-border)" }}>
            Total catchment: 1,355 km² · 42 rain gauges · Data: 15-min resolution
          </div>
        </div>
      </div>
    </div>
  );
}
