import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoWind, IcoZap, IcoActivity, IcoTrendUp } from "../../components/shared/Icons";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEATHER_WX = ["Partly cloudy", "Sunny", "Windy", "Overcast", "Strong winds", "Clear", "Moderate"];

const WIND_ROSE = [
  { dir: "N",  speed: 8.2, pct: 14 },
  { dir: "NE", speed: 6.1, pct: 8  },
  { dir: "E",  speed: 4.8, pct: 6  },
  { dir: "SE", speed: 5.5, pct: 9  },
  { dir: "S",  speed: 9.4, pct: 18 },
  { dir: "SW", speed: 11.2,pct: 22 },
  { dir: "W",  speed: 10.1,pct: 16 },
  { dir: "NW", speed: 7.3, pct: 7  },
];

export default function SiteWindForecast() {
  const { site } = useOutletContext<SiteWorkspaceContext>();

  // ── Derive everything from the real current date ──────────────────────────
  const { sevenDays, todayAbbr, todayLabel, forecast7d, windSpeedData } = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // 7-day window starting from today
    const sevenDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      return DAY_ABBR[d.getDay()];
    });
    const todayAbbr  = sevenDays[0];
    const todayLabel = `${todayAbbr} ${now.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

    // 7-day forecast data (84 × 2-hour slots)
    const forecast7d = Array.from({ length: 84 }, (_, i) => {
      const dayIdx = Math.floor(i / 12);
      const hour   = (i % 12) * 2;
      const baseWind = 7 + Math.sin(dayIdx * 1.2) * 3 + (Math.random() - 0.5) * 1.5;
      const wind  = Math.max(2, +baseWind.toFixed(1));
      const cubeWind = Math.pow(wind, 3);
      const p50   = Math.round(cubeWind * 0.45);
      const p10   = Math.round(p50 * 1.15);
      const p90   = Math.round(p50 * 0.85);
      // Show actual only for past/present hours today
      const actual = dayIdx === 0 && hour <= currentHour
        ? Math.round(p50 * (0.93 + Math.random() * 0.12))
        : undefined;
      return {
        time: `${sevenDays[dayIdx]} ${String(hour).padStart(2, "0")}:00`,
        windSpeed: wind, p50, p10, p90, actual,
      };
    });

    // 24H wind speed (half-hourly)
    const windSpeedData = Array.from({ length: 48 }, (_, i) => ({
      time: `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
      speed: +(7.5 + Math.sin(i * 0.4) * 3 + (Math.random() - 0.5) * 1.2).toFixed(1),
      gust:  +(9.8 + Math.sin(i * 0.4) * 3 + Math.random() * 2).toFixed(1),
    }));

    return { sevenDays, todayAbbr, todayLabel, forecast7d, windSpeedData };
  }, []); // stable — computed once on mount

  const avgWind = +(forecast7d.slice(0, 12).reduce((s, d) => s + d.windSpeed, 0) / 12).toFixed(1);
  const p50Gen  = Math.round(forecast7d.slice(0, 12).reduce((s, d) => s + d.p50, 0) / 12);
  const mape    = 3.8;

  // Key tick for the "Today" reference line — first slot of today
  const todayTick = `${todayAbbr} 00:00`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Avg Wind Speed (24H)" value={avgWind}  unit="m/s"    icon={<IcoWind     width={14} height={14} />} rag={rag(avgWind, 7, 4)} trend="+0.8 m/s" trendDir="up" />
        <KpiCard label="P50 Generation"       value={p50Gen}   unit="MWh"    icon={<IcoZap      width={14} height={14} />} rag="info"    trend="Next 24H"     trendDir="up" />
        <KpiCard label="Forecast Accuracy"    value={mape}     unit="% MAPE" icon={<IcoActivity width={14} height={14} />} rag={rag(100 - mape, 96, 92)} trend="7D avg" trendDir="up" />
        <KpiCard label="Capacity Factor"       value={+(site.generation / site.capacity * 100).toFixed(1)} unit="%" icon={<IcoTrendUp width={14} height={14} />} rag={rag(site.generation / site.capacity * 100, 35, 25)} trend="vs P50 forecast" trendDir="up" />
      </div>

      {/* 7-day P10/P50/P90 forecast */}
      <ChartCard title="7-Day Wind Power Forecast — P10 / P50 / P90" timeframeOptions={["7D"]} timeframe="7D" onTimeframeChange={() => {}} info={{
        description: "AI-generated 7-day wind power forecast with probabilistic confidence bands. P50 = median, P10 = optimistic (10th percentile exceedance), P90 = conservative. Actual shown for today's past hours.",
        stats: [
          { label: "Forecast MAPE",  value: `${mape}%`,                      highlight: true },
          { label: "Model",          value: "LSTM + NWP ensemble" },
          { label: "P50 Tomorrow",   value: `${Math.round(p50Gen * 0.98)} MWh`, highlight: true },
          { label: "P90 Tomorrow",   value: `${Math.round(p50Gen * 0.84)} MWh` },
        ],
        source:   "Astrikos AI Forecasting Engine + NWP (ERA5 reanalysis)",
        standard: "NERC BAL-001 — Forecast accuracy reporting",
        note:     "MAPE < 5% = excellent. P10/P90 band width indicates forecast uncertainty.",
      }}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={forecast7d.filter((_, i) => i % 2 === 0)} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" {...axisProps} interval={6} />
            <YAxis {...axisProps} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            <ReferenceLine
              x={todayTick}
              stroke="var(--ds-border)"
              strokeDasharray="3 3"
              label={{ value: `Today (${todayLabel})`, fontSize: 8, fill: "var(--ds-text-faint)" }}
            />
            <Area type="monotone" dataKey="p10"    stroke="transparent" fill={CHART_COLORS.blue} fillOpacity={0.1} name="P10 band" legendType="none" />
            <Area type="monotone" dataKey="p90"    stroke="transparent" fill="#000"              fillOpacity={1}   name="P90 mask" legendType="none" />
            <Line type="monotone" dataKey="p10"    stroke={CHART_COLORS.teal}    strokeWidth={1} strokeDasharray="4 3" dot={false} name="P10 (optimistic)" />
            <Line type="monotone" dataKey="p50"    stroke={CHART_COLORS.blue}    strokeWidth={2} dot={false}           name="P50 (median)" />
            <Line type="monotone" dataKey="p90"    stroke={CHART_COLORS.warning} strokeWidth={1} strokeDasharray="4 3" dot={false} name="P90 (conservative)" />
            <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3, fill: CHART_COLORS.success }} name="Actual" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Wind speed 24H */}
        <ChartCard title="Wind Speed & Gusts (24H)" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={windSpeedData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="time" {...axisProps} interval={5} />
              <YAxis {...axisProps} label={{ value: "m/s", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
              <ReferenceLine y={site.type === "Wind" ? 3.5 : 3} stroke={CHART_COLORS.warning} strokeDasharray="3 3" label={{ value: "Cut-in",  fontSize: 8, fill: CHART_COLORS.warning }} />
              <ReferenceLine y={25}                              stroke={CHART_COLORS.danger}  strokeDasharray="3 3" label={{ value: "Cut-out", fontSize: 8, fill: CHART_COLORS.danger  }} />
              <Area type="monotone" dataKey="gust"  stroke={CHART_COLORS.sky}  fill={CHART_COLORS.sky}  fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 3" dot={false} name="Gust m/s" />
              <Line type="monotone" dataKey="speed" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Wind Speed m/s" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Wind rose */}
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Wind Direction Distribution (30D)</span></div>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {WIND_ROSE.map(r => (
              <div key={r.dir} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, fontSize: 11, fontWeight: 700, color: "var(--ds-text-muted)", textAlign: "right" }}>{r.dir}</span>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 10 }}>
                  <div style={{ width: `${r.pct * 3}%`, height: "100%", borderRadius: 3, background: CHART_COLORS.blue, opacity: 0.8 }} />
                </div>
                <span style={{ width: 32, fontSize: 10, color: "var(--ds-text-faint)", textAlign: "right" }}>{r.pct}%</span>
                <span style={{ width: 48, fontSize: 10, color: "var(--ds-text-muted)" }}>{r.speed} m/s</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginTop: 4, borderTop: "1px solid var(--ds-border)", paddingTop: 6 }}>
              Prevailing: SW (22%) · Avg 11.2 m/s — Most productive direction
            </div>
          </div>
        </div>
      </div>

      {/* Forecast summary table */}
      <div className="chart-card">
        <div className="chart-card-header"><span className="chart-card-title">7-Day Forecast Summary</span></div>
        <table className="ae-table" style={{ width: "100%", fontSize: 12 }}>
          <thead><tr><th>Day</th><th>Date</th><th>Avg Wind</th><th>P90 Gen</th><th>P50 Gen</th><th>P10 Gen</th><th>Confidence</th><th>Weather</th></tr></thead>
          <tbody>
            {sevenDays.map((day, i) => {
              const rows   = forecast7d.filter((_, idx) => Math.floor(idx / 12) === i);
              const avgW   = +(rows.reduce((s, r) => s + r.windSpeed, 0) / rows.length).toFixed(1);
              const p50    = Math.round(rows.reduce((s, r) => s + r.p50, 0));
              const conf   = Math.max(55, 92 - i * 5 + (Math.random() - 0.5) * 4);
              const wx     = WEATHER_WX[i % WEATHER_WX.length];
              const isToday = i === 0;
              // Compute actual date for each row
              const d = new Date(); d.setDate(d.getDate() + i);
              const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              return (
                <tr key={day} style={{ background: isToday ? "rgba(255,255,255,0.03)" : undefined }}>
                  <td style={{ fontWeight: isToday ? 700 : 400, color: isToday ? "var(--ds-accent)" : undefined }}>
                    {day}{isToday ? " ← Today" : i === 1 ? " (Tomorrow)" : ""}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>{dateStr}</td>
                  <td>{avgW} m/s</td>
                  <td style={{ color: CHART_COLORS.warning }}>{Math.round(p50 * 0.85)} MWh</td>
                  <td style={{ color: CHART_COLORS.blue, fontWeight: 600 }}>{p50} MWh</td>
                  <td style={{ color: CHART_COLORS.teal }}>{Math.round(p50 * 1.15)} MWh</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 6 }}>
                        <div style={{ width: `${conf}%`, height: "100%", borderRadius: 3, background: conf > 80 ? "#22c55e" : conf > 70 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{Math.round(conf)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>{wx}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
