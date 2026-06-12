import { useOutletContext } from "react-router-dom";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../../utils/chartHelpers";
import { generate7d, rag } from "../../utils/ragHelpers";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { IcoDollar, IcoZap, IcoActivity, IcoWind, IcoSparkle } from "../../components/shared/Icons";

const rev7d = generate7d(42, 0.12);

const tariffData = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, "0")}:00`,
  price: h >= 7 && h <= 9 ? 38 + Math.random() * 8 : h >= 17 && h <= 20 ? 42 + Math.random() * 10 : 18 + Math.random() * 8,
  generation: Math.max(0, Math.round(180 * Math.sin(((h - 6) / 12) * Math.PI) + (Math.random() - 0.5) * 20)),
}));

const lossWaterfallData = [
  { name: "Theoretical", value: 225, type: "base" },
  { name: "Soiling", value: -4.7, type: "loss" },
  { name: "Shading", value: -2.9, type: "loss" },
  { name: "Temperature", value: -1.8, type: "loss" },
  { name: "Inverter", value: -3.4, type: "loss" },
  { name: "Wiring", value: -0.9, type: "loss" },
  { name: "Clipping", value: -1.1, type: "loss" },
  { name: "Other", value: -1.4, type: "loss" },
  { name: "Actual", value: 209, type: "actual" },
];

const benchmarkData = [
  { site: site_label("Solar Farm A"), pr: 84.1, fill: CHART_COLORS.amber },
  { site: site_label("Solar Farm B"), pr: 82.3, fill: CHART_COLORS.sky },
  { site: site_label("Hybrid Plant A"), pr: 86.5, fill: CHART_COLORS.teal },
  { site: site_label("Industry P50"), pr: 80.0, fill: CHART_COLORS.violet },
  { site: site_label("Best in Class"), pr: 89.0, fill: CHART_COLORS.success },
];

function site_label(s: string) {
  return s.length > 14 ? s.slice(0, 14) + "…" : s;
}

const energySoldData = [
  { name: "Grid Export", value: 85, fill: CHART_COLORS.blue },
  { name: "PPA Offtake", value: 12, fill: CHART_COLORS.amber },
  { name: "Self-Consumption", value: 3, fill: CHART_COLORS.teal },
];

export default function SiteEnergy() {
  const { site } = useOutletContext<SiteWorkspaceContext>();

  const revToday = site.revenueToday;
  const ppaRate = 22.5;
  const energySold = Math.round(((site.generation * 8 * 0.97) / 1000) * 10) / 10;
  const gridExport = Math.round(site.generation * 0.97);

  const revTrendData = rev7d.map((d) => ({ time: d.day, revenue: +(d.actual * (revToday / 42)).toFixed(0) }));

  const lossChartData = lossWaterfallData.map((d, i, arr) => {
    if (d.type === "base") return { ...d, start: 0, end: d.value, bar: d.value };
    if (d.type === "actual") return { ...d, start: 0, end: d.value, bar: d.value };
    const prev = arr
      .slice(0, i)
      .filter((x) => x.type !== "actual")
      .reduce((s, x) => s + (x.type === "base" ? x.value : x.value), 0);
    const running = prev + d.value;
    return { ...d, start: running - d.value, end: running, bar: Math.abs(d.value) };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard
          label="Revenue Today"
          value={`$${(revToday / 1000).toFixed(1)}K`}
          unit={undefined}
          icon={<IcoDollar width={14} height={14} />}
          rag="success"
          trend="+8%"
          trendDir="up"
        />
        <KpiCard label="PPA Rate" value={ppaRate} unit="$/MWh" icon={<IcoZap width={14} height={14} />} rag="info" trend="Fixed" trendDir="up" />
        <KpiCard
          label="Energy Sold"
          value={energySold}
          unit="GWh"
          icon={<IcoActivity width={14} height={14} />}
          rag={rag(energySold, 1.5, 1.0)}
          trend="+0.2 GWh"
          trendDir="up"
        />
        <KpiCard
          label="Grid Export"
          value={gridExport}
          unit="MW"
          icon={<IcoWind width={14} height={14} />}
          rag="success"
          trend="+3 MW"
          trendDir="up"
        />
      </div>

      {/* Charts 2x2 */}
      <div className="chart-grid-2" style={{ gap: 12 }}>
        {/* Revenue Trend */}
        <ChartCard
          title="Revenue Trend"
          timeframeOptions={["7D", "30D"]}
          timeframe="7D"
          onTimeframeChange={() => {}}
          info={{
            description:
              "Daily revenue from energy sold at the applicable PPA/tariff rate over the past 7 days. The dashed reference line shows the daily budget target. Reconciled at day-end with the billing system.",
            stats: [
              { label: "Today's Revenue", value: `$${(revToday / 1000).toFixed(1)}K`, highlight: true },
              { label: "PPA Rate", value: `$${ppaRate}/MWh` },
              { label: "Energy Sold", value: `${energySold} GWh`, highlight: true },
              { label: "Grid Export", value: `${gridExport} MW` },
            ],
            source: "Billing & Trading System — PPA Rate × Metered Generation",
            standard: "Hourly settlement · Reconciled at 00:00",
            note: "Revenue above the budget line indicates above-forecast generation or favourable price deviation.",
          }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revTrendData}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `$${v}K`} />
              <Tooltip {...chartTooltipProps} formatter={(v: number) => [`$${v}K`, "Revenue"]} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.amber}
                fill={CHART_COLORS.amber}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
                name="Revenue $K"
              />
              <ReferenceLine
                y={Math.round(revToday / 1000)}
                stroke={CHART_COLORS.violet}
                strokeDasharray="4 3"
                label={{ value: "Budget", fontSize: 9, fill: "var(--ds-text-faint)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tariff vs Generation */}
        <ChartCard
          title="Tariff vs Generation (24H)"
          timeframeOptions={["24H"]}
          timeframe="24H"
          onTimeframeChange={() => {}}
          info={{
            description:
              "Overlay of grid spot/tariff prices ($/MWh) against AC generation output (MW) across 24 hours. Peak generation overlapping with high-tariff windows maximises revenue capture.",
            stats: [
              { label: "Peak Tariff", value: "~$44–52/MWh", highlight: true },
              { label: "Off-Peak", value: "~$18–26/MWh" },
              { label: "Peak Window", value: "07:00–09:00, 17:00–20:00" },
              { label: "PPA Rate", value: `$${ppaRate}/MWh (fixed)` },
            ],
            source: "Grid Operator API (spot price) + SCADA (generation)",
            note: "High generation during high-tariff windows (morning/evening peak) maximises daily revenue.",
          }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={tariffData}>
              <XAxis dataKey="hour" {...axisProps} interval={3} />
              <YAxis
                yAxisId="price"
                {...axisProps}
                label={{ value: "$/MWh", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }}
              />
              <YAxis yAxisId="gen" orientation="right" {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
              <Bar yAxisId="gen" dataKey="generation" fill={CHART_COLORS.blue} fillOpacity={0.5} name="Gen MW" radius={[2, 2, 0, 0]} />
              <Line yAxisId="price" type="monotone" dataKey="price" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} name="Price $/MWh" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Energy Mix / Sold breakdown */}
        <ChartCard
          title="Energy Disposition"
          timeframeOptions={["24H"]}
          timeframe="24H"
          onTimeframeChange={() => {}}
          info={{
            description:
              "Breakdown of total energy generated into grid export, PPA offtake, and on-site self-consumption. Maximising grid export during high-tariff periods improves revenue.",
            stats: [
              { label: "Grid Export", value: "85%", highlight: true },
              { label: "PPA Offtake", value: "12%" },
              { label: "Self-Consumption", value: "3%" },
              { label: "YTD vs Budget", value: "+12.3%", highlight: true },
            ],
            source: "Billing & Metering System — daily settlement data",
            note: "Self-consumption reduces grid import costs. PPA offtake is contractually fixed volume.",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={energySoldData} layout="vertical">
                <XAxis type="number" {...axisProps} unit="%" />
                <YAxis type="category" dataKey="name" {...axisProps} width={100} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}%`, ""]} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {energySoldData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "YTD Revenue", value: `$${Math.round((revToday * 150) / 1000)}K` },
                { label: "vs Budget", value: "+12.3%" },
                { label: "Avg Price", value: `$${ppaRate}/MWh` },
                { label: "Peak Price", value: "$44.80/MWh" },
              ].map((r) => (
                <div key={r.label} className="stat-row">
                  <span style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Benchmarking */}
        <ChartCard
          title="PR Benchmarking"
          timeframeOptions={["30D"]}
          timeframe="30D"
          onTimeframeChange={() => {}}
          info={{
            description:
              "Performance Ratio comparison of this site against fleet peers, the industry P50 median, and best-in-class benchmark. PR = actual yield ÷ theoretical yield based on irradiance.",
            stats: [
              { label: "Best in Class", value: "89.0%", highlight: true },
              { label: "Industry P50", value: "80.0%" },
              { label: "Target PR", value: "≥ 82%" },
              { label: "Improvement Gap (vs BIC)", value: "up to 4.9pp" },
            ],
            source: "Fleet SCADA data — 30-day rolling average",
            standard: "IEC 61724-1:2021 — Performance Ratio definition",
            note: "Gap between this site and best-in-class indicates potential for soiling, shading or inverter tuning improvements.",
          }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={benchmarkData} layout="vertical">
              <XAxis type="number" domain={[75, 95]} {...axisProps} unit="%" />
              <YAxis type="category" dataKey="site" {...axisProps} width={100} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
              <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}%`, "PR"]} />
              <Bar dataKey="pr" radius={[0, 3, 3, 0]}>
                {benchmarkData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Loss Waterfall */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">Energy Loss Waterfall — Theoretical to Actual Generation (MW)</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={lossChartData} barSize={36}>
            <XAxis dataKey="name" {...axisProps} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
            <YAxis {...axisProps} domain={[190, 230]} />
            <Tooltip
              {...chartTooltipProps}
              formatter={(v: number, name: string, props: { payload?: { type?: string; name?: string } }) => {
                const type = props.payload?.type;
                if (type === "base" || type === "actual") return [`${v} MW`, props.payload?.name ?? name];
                return [`−${v} MW`, props.payload?.name ?? name];
              }}
            />
            <ReferenceLine y={0} stroke="var(--ds-border)" />
            {lossChartData.map((d, i) => (
              <Bar
                key={i}
                dataKey="bar"
                fill={d.type === "base" ? CHART_COLORS.blue : d.type === "actual" ? CHART_COLORS.success : CHART_COLORS.danger}
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── P50 / P90 / P10 Generation Forecast ─────────────────────── */}
      {/* {(() => {
        const { generate7d: g7 } = { generate7d: (b: number, v: number) =>
          Array.from({ length: 7 }, (_, i) => {
            const base = b * Math.max(0.5, Math.sin(Math.PI * (i + 1) / 8));
            return {
              day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
              p50:  Math.round(base),
              p10:  Math.round(base * 1.12),
              p90:  Math.round(base * 0.88),
              actual: i < 3 ? Math.round(base * (0.94 + Math.random() * 0.1)) : undefined,
            };
          })
        };
        const fcData = g7(site.generation, 0.1);
        return (
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Generation Forecast — P10 / P50 / P90 (7-Day)</span>
              <span className="chip info" style={{ fontSize: 9 }}>AI v3.1 · LSTM + NWP</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--ds-text-faint)", padding: "0 12px 6px" }}>
              P50 = median forecast · P10 = optimistic (10th percentile exceedance) · P90 = conservative (90th percentile exceedance)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={fcData} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                <XAxis dataKey="day" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Area type="monotone" dataKey="p10" stroke="transparent" fill={CHART_COLORS.blue} fillOpacity={0.08} name="P10 (optimistic)" />
                <Area type="monotone" dataKey="p90" stroke="transparent" fill="#fff" fillOpacity={1} name="P90 band" legendType="none" />
                <Line type="monotone" dataKey="p10"    stroke={CHART_COLORS.teal}    strokeWidth={1} strokeDasharray="4 3" dot={false} name="P10" />
                <Line type="monotone" dataKey="p50"    stroke={CHART_COLORS.blue}    strokeWidth={2} dot={false} name="P50 (median)" />
                <Line type="monotone" dataKey="p90"    stroke={CHART_COLORS.warning} strokeWidth={1} strokeDasharray="4 3" dot={false} name="P90 (conservative)" />
                <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.success }} name="Actual" connectNulls={false} />
                <ReferenceLine x="Thu" stroke="var(--ds-border)" strokeDasharray="3 3" label={{ value: "Today", fontSize: 8, fill: "var(--ds-text-faint)" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 20, padding: "8px 14px", borderTop: "1px solid var(--ds-border)", flexWrap: "wrap" }}>
              {[
                { label: "Forecast Accuracy (7D MAPE)", value: "3.8%", status: "success" },
                { label: "AI Model",                    value: "LSTM + NWP ensemble", status: "info" },
                { label: "Last Updated",                value: "Today 00:00",         status: "info" },
                { label: "Next Update",                 value: "Tomorrow 00:00",      status: "info" },
                { label: "P50 Tomorrow",                value: `${Math.round(site.generation * 0.97)} MW`, status: "info" },
                { label: "P90 Tomorrow",                value: `${Math.round(site.generation * 0.85)} MW`, status: "warning" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span style={{ fontSize: 9, color: "var(--ds-text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.status === "success" ? "var(--ds-success)" : r.status === "warning" ? "var(--ds-warning)" : "var(--ds-text)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()} */}

      {/* AI Energy Intelligence */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title">
            <IcoSparkle width={11} height={11} /> AI Energy Intelligence
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            {
              title: "Revenue Optimization",
              type: "success" as const,
              insight: `Shifting BESS discharge to 17:00–19:00 peak window could add $${Math.round((revToday * 0.04) / 100) * 100} in daily revenue at current grid prices.`,
            },
            {
              title: "Curtailment Alert",
              type: "warning" as const,
              insight: "Grid curtailment forecast for tomorrow 11:00–14:00 (31% probability). Consider pre-charging BESS before 10:30.",
            },
            {
              title: "PPA Optimization",
              type: "info" as const,
              insight: "Current PPA contract underperforming by $1.2K/day vs spot market average. Review contract terms at next renewal.",
            },
          ].map((item) => (
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
