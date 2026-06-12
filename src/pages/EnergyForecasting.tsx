import { useState, useMemo, useCallback } from "react";
import { KpiCard } from "../components/shared/KpiCard";
import { ChartCard } from "../components/shared/ChartCard";
import { FilterBar, FilterGroup } from "../components/shared/FilterBar";
import { KpiDrilldownModal, KpiModalConfig } from "../components/shared/KpiDrilldownModal";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../utils/chartHelpers";
import { generate24h, generate7d, generate30d, rag } from "../utils/ragHelpers";
import { IcoZap, IcoActivity, IcoCpu, IcoDollar, IcoCloud, IcoWind } from "../components/shared/Icons";
import { SITES } from "../data/mockData";
import { fetchSites } from "../api/endpoints";
import { useApi } from "../hooks/useApi";

const forecast24 = generate24h(280, 0.08);
const price24 = generate24h(85, 0.2);
const reserve24 = generate24h(60, 0.15).map((d) => ({
  time: d.time,
  scheduled: d.actual,
  actual: d.actual * (0.9 + Math.random() * 0.2),
  excess: Math.max(0, d.actual * 0.1),
}));
const battery24 = generate24h(100, 0.1).map((d) => ({
  time: d.time,
  charge: Math.max(0, d.actual * 0.4),
  discharge: Math.max(0, d.actual * 0.6),
  soc: Math.min(100, Math.max(20, 60 + Math.sin(parseFloat(d.time) / 4) * 30)),
}));
const scatter7d = Array.from({ length: 40 }, () => ({ x: Math.random() * 1000, y: Math.random() * 250 }));

const WEATHER_LAYERS = ["Cloud Movement", "Wind Direction", "Storm", "Rainfall"];

// Computed inside component from API data; static fallbacks kept here for SSR safety
const STATIC_SITE_OPTIONS = ["All", ...SITES.map((s) => s.name)];
const STATIC_TOTAL_GEN    = SITES.reduce((s, x) => s + x.generation, 0);

const SITE_ACCURACY: Record<string, number> = {
  All: 93.4,
  "Solar Farm A": 93.4,
  "Solar Farm B": 91.2,
  "Wind Farm A": 90.8,
  "BESS Site A": 95.1,
  "Hybrid Plant A": 94.2,
};

const SCENARIO_FACTOR: Record<string, number> = { Actual: 1.0, P50: 0.95, P90: 0.85 };
const SOURCE_FACTOR: Record<string, number> = { All: 1.0, Solar: 0.65, Wind: 0.25, BESS: 0.1 };

const FILTER_GROUPS: FilterGroup[] = [
  { label: "Site", key: "site", options: STATIC_SITE_OPTIONS },
  { label: "Scenario", key: "scenario", options: ["Actual", "P50", "P90"] },
  { label: "Source", key: "source", options: ["All", "Solar", "Wind", "BESS"] },
];

export default function EnergyForecasting() {
  const { data: apiSites } = useApi(() => fetchSites(), []);
  const sites     = apiSites ?? SITES;
  const siteOpts  = useMemo(() => ["All", ...sites.map((s) => s.name)], [sites]);
  const totalGen  = useMemo(() => sites.reduce((s, x) => s + x.generation, 0), [sites]);

  const [activeLayer, setActiveLayer] = useState("Wind Direction");
  const [filters, setFilters] = useState<Record<string, string>>({ site: "All", scenario: "Actual", source: "All" });
  const [activeModal, setActiveModal] = useState<KpiModalConfig | null>(null);

  const handleFilterChange = useCallback((key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const siteFrac = useMemo(() => {
    if (filters.site === "All") return 1;
    const site = sites.find((s) => s.name === filters.site);
    return site ? site.generation / (totalGen || STATIC_TOTAL_GEN) : 1;
  }, [filters.site, sites, totalGen]);

  const pf = useMemo(
    () => siteFrac * (SCENARIO_FACTOR[filters.scenario] ?? 1) * (SOURCE_FACTOR[filters.source] ?? 1),
    [siteFrac, filters.scenario, filters.source],
  );

  const kpis = useMemo(
    () => ({
      accuracy: +(SITE_ACCURACY[filters.site] ?? 93.4).toFixed(1),
      revenue: Math.round(34 * pf),
      reserveCost: Math.round(12 * pf),
      curtailment: +(1.2 / Math.max(0.2, pf)).toFixed(1),
      demand: +(4.1 * pf).toFixed(1),
      gridFreq: 50.01,
    }),
    [pf, filters.site],
  );

  const scaledForecast = useMemo(
    () => forecast24.map((d) => ({ time: d.time, actual: +(d.actual * pf).toFixed(1), forecast: +(d.forecast * pf).toFixed(1) })),
    [pf],
  );

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const d24f = forecast24.map((d) => ({ time: d.time, actual: +(d.actual * pf).toFixed(1), forecast: +(d.forecast * pf).toFixed(1) }));
      const d7f = generate7d(280 * pf, 0.08).map((d) => ({ time: d.day, actual: +d.actual.toFixed(1), forecast: +d.forecast.toFixed(1) }));
      const d30f = generate30d(280 * pf).map((d) => ({ time: String(d.day), energy: +d.value.toFixed(1) }));
      const d24p = price24.map((d) => ({ time: d.time, price: +d.actual.toFixed(1), forecast: +d.forecast.toFixed(1) }));

      const map: Record<string, KpiModalConfig> = {
        "Forecast Accuracy": {
          label: "Forecast Accuracy",
          value: kpis.accuracy,
          unit: "%",
          rag: rag(kpis.accuracy, 90, 82),
          description: "AI forecast accuracy vs actual generation.",
          timeframeOptions: ["24H", "7D"],
          chartType: "line",
          chartData: {
            "24H": d24f.map((d) => ({ time: d.time, accuracy: +(93 + (Math.random() - 0.5) * 4).toFixed(1) })),
            "7D": d7f.map((d) => ({ time: d.time, accuracy: +(92 + (Math.random() - 0.5) * 6).toFixed(1) })),
          },
          series: [{ key: "accuracy", name: "Accuracy %", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "Model Details",
              type: "info",
              rows: [
                { label: "Algorithm", value: "GBM + NWP" },
                { label: "Horizon", value: "24 h ahead" },
              ],
            },
            {
              title: "Error Metrics",
              type: "success",
              rows: [
                { label: "MAE", value: "4.2 MW" },
                { label: "RMSE", value: "6.1 MW" },
              ],
            },
            {
              title: "Improvement",
              type: "success",
              rows: [
                { label: "vs Last Month", value: "+0.8%" },
                { label: "Revenue Gain", value: "+$34K" },
              ],
            },
          ],
        },
        "Revenue Impact": {
          label: "Revenue Impact",
          value: `+$${kpis.revenue}K`,
          rag: rag(kpis.revenue, 20, 10),
          description: "Revenue improvement from AI forecast optimisation.",
          timeframeOptions: ["24H", "7D"],
          chartType: "bar",
          chartData: {
            "24H": d24f.map((d) => ({ time: d.time, rev: +(d.actual * 0.21 * pf).toFixed(0) })),
            "7D": d7f.map((d) => ({ time: d.time, rev: +(d.actual * 0.21 * 24 * pf).toFixed(0) })),
          },
          series: [{ key: "rev", name: "Revenue ($)", color: CHART_COLORS.success }],
          xKey: "time",
          contextCards: [
            {
              title: "Revenue Sources",
              type: "success",
              rows: [
                { label: "Spot Arbitrage", value: `$${Math.round(kpis.revenue * 0.6)}K` },
                { label: "Ancillary", value: `$${Math.round(kpis.revenue * 0.4)}K` },
              ],
            },
            {
              title: "Peak Window",
              type: "info",
              rows: [
                { label: "Optimal Dispatch", value: "16:00 – 20:00" },
                { label: "Price Delta", value: "+$18/MWh" },
              ],
            },
            {
              title: "MTD Impact",
              type: "success",
              rows: [
                { label: "Actual", value: `+$${Math.round(kpis.revenue * 2.1)}K` },
                { label: "Forecast MTD", value: `+$${Math.round(kpis.revenue * 2.5)}K` },
              ],
            },
          ],
        },
        "Reserve Cost": {
          label: "Reserve Cost",
          value: `$${kpis.reserveCost}K`,
          rag: rag(20 - kpis.reserveCost, 8, 2),
          description: "Cost of holding spinning reserve due to forecast uncertainty.",
          timeframeOptions: ["24H", "7D"],
          chartType: "area",
          chartData: {
            "24H": reserve24.map((d) => ({ time: d.time, scheduled: +(d.scheduled * pf).toFixed(1), excess: +(d.excess * pf).toFixed(1) })),
            "7D": d7f.map((d) => ({ time: d.time, scheduled: +(d.actual * 0.3).toFixed(1), excess: +(d.actual * 0.05).toFixed(1) })),
          },
          series: [
            { key: "scheduled", name: "Scheduled Reserve", color: CHART_COLORS.teal },
            { key: "excess", name: "Excess Reserve", color: CHART_COLORS.amber },
          ],
          xKey: "time",
          contextCards: [
            {
              title: "Reserve Breakdown",
              type: "success",
              rows: [
                { label: "Spinning", value: `$${Math.round(kpis.reserveCost * 0.6)}K` },
                { label: "Non-Spinning", value: `$${Math.round(kpis.reserveCost * 0.4)}K` },
              ],
            },
            {
              title: "Forecast Error",
              type: "info",
              rows: [
                { label: "Uncertainty Band", value: "±8%" },
                { label: "Grid Req.", value: "5% of load" },
              ],
            },
            {
              title: "Savings YTD",
              type: "success",
              rows: [
                { label: "AI Reduction", value: "-8%" },
                { label: "Cost Saved", value: "$22K" },
              ],
            },
          ],
        },
        "Curtailment": {
          label: "Curtailment",
          value: kpis.curtailment,
          unit: "%",
          rag: rag(5 - kpis.curtailment, 3, 1),
          description: "Generation curtailed due to grid or site constraints.",
          timeframeOptions: ["24H", "7D", "30D"],
          chartType: "bar",
          chartData: {
            "24H": d24f.map((d) => ({ time: d.time, curtail: +(Math.random() * 2 * pf).toFixed(2) })),
            "7D": d7f.map((d) => ({ time: d.time, curtail: +(Math.random() * 1.5 * pf).toFixed(2) })),
            "30D": d30f.map((d) => ({ time: d.time, curtail: +(Math.random() * 1.8 * pf).toFixed(2) })),
          },
          series: [{ key: "curtail", name: "Curtailment %", color: CHART_COLORS.warning }],
          xKey: "time",
          contextCards: [
            {
              title: "By Site",
              type: "warning",
              rows: [
                { label: "Solar Farm B", value: "2.4%" },
                { label: "Wind Farm A", value: "1.8%" },
              ],
            },
            {
              title: "Causes",
              type: "warning",
              rows: [
                { label: "Grid Congestion", value: "62%" },
                { label: "Voltage Limits", value: "28%" },
              ],
            },
            {
              title: "Revenue Loss",
              type: "danger",
              rows: [
                { label: "Today", value: "$1,840" },
                { label: "This Month", value: "$28K" },
              ],
            },
          ],
        },
        "Demand": {
          label: "Demand",
          value: kpis.demand,
          unit: "GW",
          rag: "info",
          description: "Forecast grid demand for the current period.",
          timeframeOptions: ["24H", "7D"],
          chartType: "area",
          chartData: {
            "24H": d24f.map((d) => ({ time: d.time, demand: +(4.1 * (0.7 + Math.sin(parseFloat(d.time) / 12) * 0.5)).toFixed(2) })),
            "7D": d7f.map((d) => ({ time: d.time, demand: +(4.1 * (0.85 + Math.random() * 0.3)).toFixed(2) })),
          },
          series: [{ key: "demand", name: "Demand (GW)", color: CHART_COLORS.sky }],
          xKey: "time",
          contextCards: [
            {
              title: "Demand Profile",
              type: "info",
              rows: [
                { label: "Morning Peak", value: "4.6 GW" },
                { label: "Evening Peak", value: "4.9 GW" },
              ],
            },
            {
              title: "Renewable Share",
              type: "success",
              rows: [
                { label: "Current", value: "48%" },
                { label: "YoY", value: "+6%" },
              ],
            },
            {
              title: "Grid Frequency",
              type: "success",
              rows: [
                { label: "Current", value: "50.01 Hz" },
                { label: "Band", value: "49.5–50.5 Hz" },
              ],
            },
          ],
        },
        "Grid Frequency": {
          label: "Grid Frequency",
          value: 50.01,
          unit: "Hz",
          rag: rag(50.01 - 49.5, 0.4, 0.2),
          description: "Real-time grid frequency deviation from 50 Hz nominal.",
          timeframeOptions: ["24H"],
          chartType: "line",
          chartData: {
            "24H": d24f.map((d) => ({ time: d.time, freq: +(50 + (Math.random() - 0.5) * 0.08).toFixed(3) })),
          },
          series: [{ key: "freq", name: "Frequency (Hz)", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "Frequency Band",
              type: "success",
              rows: [
                { label: "Nominal", value: "50.00 Hz" },
                { label: "Allowed", value: "±0.5 Hz" },
              ],
            },
            {
              title: "Events Today",
              type: "success",
              rows: [
                { label: "Under-Freq Events", value: "0" },
                { label: "Over-Freq Events", value: "0" },
              ],
            },
            {
              title: "FFR Status",
              type: "info",
              rows: [
                { label: "Response Ready", value: "Yes" },
                { label: "BESS Reserve", value: "22 MW" },
              ],
            },
          ],
        },
      };
      return map[label] ?? map["Forecast Accuracy"];
    },
    [pf, kpis],
  );

  return (
    <div>
      <FilterBar groups={FILTER_GROUPS} active={filters} onChange={handleFilterChange} />

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", marginBottom: 16 }}>
        <KpiCard
          label="Forecast Accuracy"
          value={kpis.accuracy}
          unit="%"
          icon={<IcoZap width={16} height={16} />}
          rag={rag(kpis.accuracy, 90, 82)}
          trend="+0.8%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Forecast Accuracy"))}
        />
        <KpiCard
          label="Revenue Impact"
          value={`+$${kpis.revenue}K`}
          icon={<IcoDollar width={16} height={16} />}
          rag={rag(kpis.revenue, 20, 10)}
          trend="Today"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Revenue Impact"))}
        />
        <KpiCard
          label="Reserve Cost"
          value={`$${kpis.reserveCost}K`}
          icon={<IcoActivity width={16} height={16} />}
          rag={rag(20 - kpis.reserveCost, 8, 2)}
          trend="-8%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Reserve Cost"))}
        />
        <KpiCard
          label="Curtailment"
          value={kpis.curtailment}
          unit="%"
          icon={<IcoCloud width={16} height={16} />}
          rag={rag(5 - kpis.curtailment, 3, 1)}
          trend="-0.3%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Curtailment"))}
        />
        <KpiCard
          label="Demand"
          value={kpis.demand}
          unit="GW"
          icon={<IcoCpu width={16} height={16} />}
          rag="info"
          trend="+0.2 GW"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Demand"))}
        />
        <KpiCard
          label="Grid Frequency"
          value={50.01}
          unit="Hz"
          icon={<IcoWind width={16} height={16} />}
          rag="success"
          trend="±0.01"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Grid Frequency"))}
        />
      </div>

      <div className="main-2col-left" style={{ marginBottom: 16 }}>
        <div className="chart-grid-2" style={{ gap: 14 }}>
          <ChartCard title="Day-Ahead Forecast" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={scaledForecast}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual" />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={CHART_COLORS.violet}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast (predicted)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Reserve Optimisation" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={reserve24.map((d) => ({ ...d, scheduled: +(d.scheduled * pf).toFixed(1), excess: +(d.excess * pf).toFixed(1) }))}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Bar dataKey="scheduled" fill={CHART_COLORS.teal} name="Scheduled" stackId="a" />
                <Bar dataKey="excess" fill={CHART_COLORS.amber} name="Excess" stackId="a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Price Forecast" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={price24}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual ($/MWh)" />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={CHART_COLORS.violet}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast (predicted)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Battery Dispatch Plan" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={battery24.map((d) => ({ ...d, charge: +(d.charge * pf).toFixed(1), discharge: +(d.discharge * pf).toFixed(1) }))}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Area type="monotone" dataKey="charge" stroke={CHART_COLORS.sky} fill={`${CHART_COLORS.sky}18`} strokeWidth={2} name="Charge (MW)" />
                <Area
                  type="monotone"
                  dataKey="discharge"
                  stroke={CHART_COLORS.teal}
                  fill={`${CHART_COLORS.teal}18`}
                  strokeWidth={2}
                  name="Discharge (MW)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Weather Impact — Irradiance vs Production">
            <ResponsiveContainer width="100%" height={150}>
              <ScatterChart>
                <XAxis dataKey="x" name="Irradiance" unit=" W/m²" {...axisProps} />
                <YAxis dataKey="y" name="Production" unit=" MW" {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Scatter
                  data={scatter7d.map((d) => ({ x: d.x, y: +(d.y * pf).toFixed(1) }))}
                  fill={CHART_COLORS.blue}
                  fillOpacity={0.7}
                  name="Sites"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Weather Overlay — Site DT</span>
              <div style={{ display: "flex", gap: 4 }}>
                {WEATHER_LAYERS.map((l) => (
                  <button
                    key={l}
                    className={`timeframe-btn ${activeLayer === l ? "active" : ""}`}
                    onClick={() => setActiveLayer(l)}
                    style={{ fontSize: 9 }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 300 150" width="100%" style={{ display: "block", borderRadius: 6, background: "var(--ds-surface-soft)" }}>
              <defs>
                <pattern id="wgrid" width="15" height="15" patternUnits="userSpaceOnUse">
                  <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="300" height="150" fill="url(#wgrid)" />
              <rect
                x="60"
                y="40"
                width="180"
                height="80"
                rx="4"
                fill="rgba(91,141,224,0.08)"
                stroke={CHART_COLORS.blue}
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              <text x="150" y="82" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
                {filters.site === "All" ? "Solar Farm A" : filters.site}
              </text>
              {activeLayer === "Wind Direction" &&
                Array.from({ length: 8 }, (_, i) => (
                  <g key={i} transform={`translate(${50 + i * 30},${40 + (i % 3) * 30})`}>
                    <line x1="0" y1="0" x2="12" y2="-8" stroke={CHART_COLORS.sky} strokeWidth="1.5" />
                  </g>
                ))}
              {activeLayer === "Cloud Movement" && (
                <ellipse
                  cx="150"
                  cy="75"
                  rx="60"
                  ry="30"
                  fill="rgba(148,163,184,0.15)"
                  stroke="rgba(148,163,184,0.4)"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                />
              )}
              <text x="4" y="148" fill="var(--ds-text-faint)" fontSize="7">
                {activeLayer} overlay active
              </text>
            </svg>
          </div>
        </div>

        <div className="ai-panel">
          <div className="ai-panel-header">
            <span className="ai-panel-title">AI Energy Insights</span>
            <span style={{ fontSize: 10, color: "#c4b5fd" }}>Tomorrow</span>
          </div>
          <div className="ai-panel-body">
            <div className="ai-finding-card modal-success">
              <div className="ai-finding-site">Expected Output</div>
              <div className="ai-finding-metric">{(85 * pf).toFixed(0)} GWh</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Confidence</span>
                <span className="ai-finding-value">{kpis.accuracy}%</span>
              </div>
            </div>
            <div className="ai-finding-card modal-warning">
              <div className="ai-finding-site">High Wind Event</div>
              <div className="ai-finding-metric">14:00 – 18:00</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Peak delta</span>
                <span className="ai-finding-value">+18% above P50</span>
              </div>
            </div>
            <div className="ai-finding-card modal-advisory">
              <div className="ai-finding-site">Recommended Action</div>
              <div style={{ fontSize: 12, color: "#e9d5ff", margin: "4px 0" }}>Reserve battery capacity for evening peak discharge</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Est. additional revenue</span>
                <span className="ai-finding-value">+${kpis.revenue}K</span>
              </div>
            </div>
            <div className="ai-finding-card modal-info">
              <div className="ai-finding-site">Solar Forecast</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Irradiance</span>
                <span className="ai-finding-value">5.8 kWh/m²</span>
              </div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Cloud prob.</span>
                <span className="ai-finding-value">12%</span>
              </div>
            </div>
            <div className="ai-finding-card modal-danger">
              <div className="ai-finding-site">Curtailment Risk</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Site B</span>
                <span className="ai-finding-value" style={{ color: "var(--ds-danger)" }}>
                  6%
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "#e9d5ff" }}>Adjust grid export schedule</div>
            </div>
          </div>
        </div>
      </div>

      <KpiDrilldownModal config={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
