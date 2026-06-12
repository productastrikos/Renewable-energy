import { useState, useMemo, useCallback } from "react";
import { KpiCard } from "../components/shared/KpiCard";
import { ChartCard } from "../components/shared/ChartCard";
import { FilterBar, FilterGroup } from "../components/shared/FilterBar";
import { KpiDrilldownModal, KpiModalConfig } from "../components/shared/KpiDrilldownModal";
import { useTimeframe } from "../components/shared/ChartTimeframeControl";
import { SiteDigitalTwin } from "../components/digital-twin/SiteDigitalTwin";
import { SITES } from "../data/mockData";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { fetchSites } from "../api/endpoints";
import { useApi } from "../hooks/useApi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../utils/chartHelpers";
import { generate24h, generate7d, generate30d, rag, clipToNow } from "../utils/ragHelpers";
import { IcoZap, IcoActivity, IcoCpu, IcoDollar, IcoSun, IcoBell, IcoRefresh } from "../components/shared/Icons";

const gen24 = generate24h(200, 0.12);
const siteGen7d = generate7d(1400, 0.12);
const siteGen30d = generate30d(1400);

const irrad = gen24.map((d, i) => ({
  time: d.time,
  actual: d.actual,
  irradiance: +(800 * Math.sin((Math.PI * i) / 12) + Math.random() * 50).toFixed(0),
}));

const ALL_INVERTERS = Array.from({ length: 10 }, (_, i) => ({
  name: `INV-${i + 1}`,
  group: i < 5 ? "A" : "B",
  output: Math.max(60, 100 - i * 4 + (Math.random() - 0.5) * 8),
}));

const FILTER_GROUPS: FilterGroup[] = [
  { label: "Period", key: "period", options: ["Today", "7D", "30D"] },
  { label: "Inverter Group", key: "invGroup", options: ["All", "A", "B"] },
  { label: "Component", key: "component", options: ["All", "Inverters", "Transformers", "BESS"] },
];

const PERIOD_FACTOR: Record<string, number> = { Today: 1, "7D": 0.95, "30D": 0.92 };

export default function SiteCommand() {
  const { data: apiSites } = useApi(() => fetchSites(), []);
  const defaultSite = (apiSites ?? SITES)[0];
  const { tf: genTf, setTf: setGenTf } = useTimeframe("24H");
  const [inputVal, setInputVal] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ period: "Today", invGroup: "All", component: "All" });
  const [activeModal, setActiveModal] = useState<KpiModalConfig | null>(null);

  const handleFilterChange = useCallback((key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const pf = PERIOD_FACTOR[filters.period] ?? 1;

  const filteredInverters = useMemo(
    () => ALL_INVERTERS.filter((inv) => filters.invGroup === "All" || inv.group === filters.invGroup),
    [filters.invGroup],
  );

  const kpis = useMemo(
    () => ({
      currentMW: +(195 * pf).toFixed(1),
      dailyMWh: Math.round(1420 * pf),
      pr: +(84.1 * pf).toFixed(1),
      cuf: +(22.4 * pf).toFixed(1),
      revenue: Math.round(41 * pf),
      avail: +(98.2 * Math.min(1, pf + 0.02)).toFixed(1),
      health: Math.round(92 * pf),
    }),
    [pf],
  );

  const genData = useMemo(
    () =>
      genTf === "24H"
        ? clipToNow(gen24).map((d) => ({ time: d.time, actual: +(d.actual * pf).toFixed(1), forecast: +(d.forecast * pf).toFixed(1) }))
        : siteGen7d.map((d) => ({ time: d.day, actual: +(d.actual * pf).toFixed(1), forecast: +(d.forecast * pf).toFixed(1) })),
    [genTf, pf],
  );

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const d24 = clipToNow(gen24).map((d) => ({ time: d.time, actual: +(d.actual * pf).toFixed(1), forecast: +(d.forecast * pf).toFixed(1) }));
      const d7 = siteGen7d.map((d) => ({ time: d.day, actual: +(d.actual * pf).toFixed(1) }));
      const d30 = siteGen30d.map((d) => ({ time: String(d.day), actual: +(d.value * pf).toFixed(1) }));

      const map: Record<string, KpiModalConfig> = {
        "Site Capacity": {
          label: "Site Capacity",
          value: 250,
          unit: "MW",
          rag: "info",
          description: "Total installed nameplate capacity of the site.",
          timeframeOptions: ["24H"],
          chartType: "bar",
          chartData: { "24H": d24.filter((_, i) => i % 2 === 0).map((d) => ({ time: d.time, output: d.actual })) },
          series: [{ key: "output", name: "Generation (MW)", color: CHART_COLORS.blue }],
          xKey: "time",
          contextCards: [
            {
              title: "Capacity Breakdown",
              type: "info",
              rows: [
                { label: "Solar PV", value: "180 MW" },
                { label: "Inverters", value: "10 × 25 MW" },
              ],
            },
            {
              title: "DC/AC Ratio",
              type: "info",
              rows: [
                { label: "DC Installed", value: "262 MWp" },
                { label: "AC Export", value: "250 MW" },
              ],
            },
            {
              title: "Utilisation",
              type: "success",
              rows: [
                { label: "Current Use", value: `${((kpis.currentMW / 250) * 100).toFixed(1)}%` },
                { label: "Peak Today", value: "98.4%" },
              ],
            },
          ],
        },
        "Current MW": {
          label: "Current MW",
          value: kpis.currentMW,
          unit: "MW",
          rag: rag(kpis.currentMW, 180, 120),
          description: "Real-time generation output of the site.",
          timeframeOptions: ["24H"],
          chartType: "area",
          chartData: { "24H": d24 },
          series: [
            { key: "actual", name: "Actual MW", color: CHART_COLORS.blue },
            { key: "forecast", name: "Forecast", color: CHART_COLORS.violet, dashed: true },
          ],
          xKey: "time",
          contextCards: [
            {
              title: "Inverters",
              type: "success",
              rows: [
                { label: "Online", value: "9 / 10" },
                { label: "Offline", value: "INV-14" },
              ],
            },
            {
              title: "Irradiance",
              type: "info",
              rows: [
                { label: "Current", value: "782 W/m²" },
                { label: "POA", value: "801 W/m²" },
              ],
            },
            {
              title: "Active Losses",
              type: "warning",
              rows: [
                { label: "Clipping", value: "1.2%" },
                { label: "Soiling", value: "2.3%" },
              ],
            },
          ],
        },
        "Daily MWh": {
          label: "Daily MWh",
          value: kpis.dailyMWh.toLocaleString(),
          rag: rag(kpis.dailyMWh, 1200, 1000),
          description: "Total energy generated in the selected period.",
          timeframeOptions: ["24H", "7D", "30D"],
          chartType: "area",
          chartData: {
            "24H": d24.map((d) => ({ time: d.time, energy: d.actual })),
            "7D": d7.map((d) => ({ time: d.time, energy: d.actual })),
            "30D": d30.map((d) => ({ time: d.time, energy: d.actual })),
          },
          series: [{ key: "energy", name: "MWh", color: CHART_COLORS.blue }],
          xKey: "time",
          contextCards: [
            {
              title: "vs Budget",
              type: "success",
              rows: [
                { label: "Target", value: "1,380 MWh" },
                { label: "Variance", value: `+${kpis.dailyMWh - 1380} MWh` },
              ],
            },
            {
              title: "Peak Hour",
              type: "info",
              rows: [
                { label: "Time", value: "12:00 – 13:00" },
                { label: "Output", value: "248 MW" },
              ],
            },
            {
              title: "Night Losses",
              type: "warning",
              rows: [
                { label: "Standby", value: "0.8 MWh" },
                { label: "Reactive", value: "0.3 MWh" },
              ],
            },
          ],
        },
        "PR": {
          label: "PR",
          value: kpis.pr,
          unit: "%",
          rag: rag(kpis.pr, 80, 72),
          description: "Performance Ratio — actual vs theoretical generation.",
          timeframeOptions: ["24H", "7D"],
          chartType: "line",
          chartData: {
            "24H": d24.map((d) => ({ time: d.time, pr: +(kpis.pr * (0.95 + Math.random() * 0.1)).toFixed(1) })),
            "7D": d7.map((d) => ({ time: d.time, pr: +(kpis.pr * (0.94 + Math.random() * 0.1)).toFixed(1) })),
          },
          series: [{ key: "pr", name: "PR %", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "PR Components",
              type: "success",
              rows: [
                { label: "Soiling Loss", value: "2.3%" },
                { label: "Inverter Eff", value: "97.8%" },
              ],
            },
            {
              title: "Temperature",
              type: "warning",
              rows: [
                { label: "Module Temp", value: "52 °C" },
                { label: "Temp Loss", value: "3.1%" },
              ],
            },
            {
              title: "Benchmark",
              type: "info",
              rows: [
                { label: "P50", value: "82.0%" },
                { label: "Site Record", value: "87.4%" },
              ],
            },
          ],
        },
        "CUF": {
          label: "CUF",
          value: kpis.cuf,
          unit: "%",
          rag: rag(kpis.cuf, 20, 15),
          description: "Capacity Utilisation Factor over the selected period.",
          timeframeOptions: ["24H", "7D"],
          chartType: "line",
          chartData: {
            "24H": d24.map((d) => ({ time: d.time, cuf: +(kpis.cuf * (0.95 + Math.random() * 0.1)).toFixed(1) })),
            "7D": d7.map((d) => ({ time: d.time, cuf: +(kpis.cuf * (0.94 + Math.random() * 0.1)).toFixed(1) })),
          },
          series: [{ key: "cuf", name: "CUF %", color: CHART_COLORS.amber }],
          xKey: "time",
          contextCards: [
            {
              title: "CUF Breakdown",
              type: "success",
              rows: [
                { label: "Peak Hours", value: "5.4 h" },
                { label: "Effective Hrs", value: "5.1 h" },
              ],
            },
            {
              title: "Seasonal Norm",
              type: "info",
              rows: [
                { label: "June P50", value: "22.0%" },
                { label: "YTD Avg", value: "21.8%" },
              ],
            },
            {
              title: "Grid Curtailment",
              type: "success",
              rows: [
                { label: "Curtailed", value: "0.3 MWh" },
                { label: "Revenue Loss", value: "$64" },
              ],
            },
          ],
        },
        "Revenue": {
          label: "Revenue",
          value: `$${kpis.revenue}K`,
          rag: rag(kpis.revenue, 35, 25),
          description: "Estimated revenue for the selected period.",
          timeframeOptions: ["24H", "7D"],
          chartType: "bar",
          chartData: {
            "24H": d24.map((d) => ({ time: d.time, revenue: +(d.actual * 0.21).toFixed(0) })),
            "7D": d7.map((d) => ({ time: d.time, revenue: +(d.actual * 0.21 * 24).toFixed(0) })),
          },
          series: [{ key: "revenue", name: "Revenue ($)", color: CHART_COLORS.success }],
          xKey: "time",
          contextCards: [
            {
              title: "Revenue Split",
              type: "success",
              rows: [
                { label: "Energy", value: `$${Math.round(kpis.revenue * 0.82)}K` },
                { label: "Ancillary", value: `$${Math.round(kpis.revenue * 0.18)}K` },
              ],
            },
            {
              title: "Price Achieved",
              type: "info",
              rows: [
                { label: "Avg $/MWh", value: "$28.9" },
                { label: "Contract", value: "$30.0" },
              ],
            },
            {
              title: "Month to Date",
              type: "success",
              rows: [
                { label: "MTD", value: `$${Math.round(kpis.revenue * 15)}K` },
                { label: "Target", value: `$${Math.round(kpis.revenue * 14)}K` },
              ],
            },
          ],
        },
        "Availability": {
          label: "Availability",
          value: kpis.avail,
          unit: "%",
          rag: rag(kpis.avail, 97, 92),
          description: "Technical availability excluding planned maintenance.",
          timeframeOptions: ["24H", "7D"],
          chartType: "line",
          chartData: {
            "24H": d24.map((d) => ({ time: d.time, avail: +(kpis.avail * (0.99 + Math.random() * 0.02)).toFixed(1) })),
            "7D": d7.map((d) => ({ time: d.time, avail: +(kpis.avail * (0.98 + Math.random() * 0.03)).toFixed(1) })),
          },
          series: [{ key: "avail", name: "Availability %", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "Downtime Causes",
              type: "warning",
              rows: [
                { label: "Inverter Faults", value: "0.8%" },
                { label: "Grid Events", value: "0.6%" },
              ],
            },
            {
              title: "This Period",
              type: "success",
              rows: [
                { label: "Outages", value: "3" },
                { label: "Total Downtime", value: "4.2 h" },
              ],
            },
            {
              title: "SLA",
              type: "success",
              rows: [
                { label: "Required", value: "97.0%" },
                { label: "Margin", value: `+${(kpis.avail - 97).toFixed(1)}%` },
              ],
            },
          ],
        },
        "Health Score": {
          label: "Health Score",
          value: `${kpis.health}/100`,
          rag: rag(kpis.health, 85, 70),
          description: "Composite asset health score for this site.",
          timeframeOptions: ["7D", "30D"],
          chartType: "line",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, health: +(kpis.health * (0.97 + Math.random() * 0.05)).toFixed(1) })),
            "30D": d30.map((d) => ({ time: d.time, health: +(kpis.health * (0.94 + Math.random() * 0.08)).toFixed(1) })),
          },
          series: [{ key: "health", name: "Health Score", color: CHART_COLORS.success }],
          xKey: "time",
          contextCards: [
            {
              title: "Component Health",
              type: "success",
              rows: [
                { label: "Inverters", value: "94" },
                { label: "Trackers", value: "89" },
                { label: "Transformers", value: "96" },
              ],
            },
            {
              title: "Risk Items",
              type: "warning",
              rows: [
                { label: "INV-14 Offline", value: "High" },
                { label: "Soiling Alert", value: "Medium" },
              ],
            },
            {
              title: "Next Service",
              type: "info",
              rows: [
                { label: "Date", value: "2026-06-18" },
                { label: "Type", value: "Preventive" },
              ],
            },
          ],
        },
      };
      return map[label] ?? map["Current MW"];
    },
    [pf, kpis],
  );

  return (
    <div>
      <FilterBar groups={FILTER_GROUPS} active={filters} onChange={handleFilterChange} />

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", marginBottom: 16 }}>
        <KpiCard
          label="Site Capacity"
          value={250}
          unit="MW"
          icon={<IcoZap width={16} height={16} />}
          rag="info"
          onClick={() => setActiveModal(getModalConfig("Site Capacity"))}
        />
        <KpiCard
          label="Current MW"
          value={kpis.currentMW}
          unit="MW"
          icon={<IcoSun width={16} height={16} />}
          rag={rag(kpis.currentMW, 180, 120)}
          trend="+5MW"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Current MW"))}
        />
        <KpiCard
          label="Daily MWh"
          value={kpis.dailyMWh.toLocaleString()}
          icon={<IcoActivity width={16} height={16} />}
          rag={rag(kpis.dailyMWh, 1200, 1000)}
          trend="+4%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Daily MWh"))}
        />
        <KpiCard
          label="PR"
          value={kpis.pr}
          unit="%"
          icon={<IcoCpu width={16} height={16} />}
          rag={rag(kpis.pr, 80, 72)}
          trend="+0.8%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("PR"))}
        />
        <KpiCard
          label="CUF"
          value={kpis.cuf}
          unit="%"
          icon={<IcoZap width={16} height={16} />}
          rag={rag(kpis.cuf, 20, 15)}
          trend="+0.3%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("CUF"))}
        />
        <KpiCard
          label="Revenue"
          value={`$${kpis.revenue}K`}
          icon={<IcoDollar width={16} height={16} />}
          rag={rag(kpis.revenue, 35, 25)}
          trend="+$2K"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Revenue"))}
        />
        <KpiCard
          label="Availability"
          value={kpis.avail}
          unit="%"
          icon={<IcoActivity width={16} height={16} />}
          rag={rag(kpis.avail, 97, 92)}
          trend="+0.4%"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Availability"))}
        />
        <KpiCard
          label="Health Score"
          value={kpis.health}
          unit="/100"
          icon={<IcoBell width={16} height={16} />}
          rag={rag(kpis.health, 85, 70)}
          onClick={() => setActiveModal(getModalConfig("Health Score"))}
        />
      </div>

      <div className="main-3col">
        {/* ── Blueprint + Geographic Intelligence ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SiteDigitalTwin siteId={defaultSite.id} site={defaultSite} />

          {/* Blueprint Intelligence Map */}
          <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="chart-card-header" style={{ padding: "8px 14px" }}>
              <span className="chart-card-title">Blueprint Intelligence — Site Location</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ds-text-faint)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
                {defaultSite.lat.toFixed(5)}°N &nbsp;·&nbsp; {defaultSite.lng.toFixed(5)}°E
              </span>
            </div>
            <MapContainer
              center={[defaultSite.lat, defaultSite.lng]}
              zoom={9}
              style={{ height: 210, width: "100%" }}
              scrollWheelZoom={false}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                maxZoom={19}
              />
              <Marker
                position={[defaultSite.lat, defaultSite.lng]}
                icon={L.divIcon({
                  className: "",
                  html: `<div style="width:16px;height:16px;background:#f59e0b;border-radius:50%;border:2.5px solid rgba(255,255,255,0.88);box-shadow:0 0 12px #f59e0b99,0 2px 8px rgba(0,0,0,0.55)"></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8],
                  popupAnchor: [0, -12],
                })}
              >
                <Popup maxWidth={210} className="enhanced-popup">
                  <div style={{ fontFamily: "Inter, sans-serif", padding: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{defaultSite.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{defaultSite.type} · {defaultSite.capacity} MW</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{defaultSite.state}, {defaultSite.country}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b" }}>
                      {defaultSite.lat.toFixed(6)}°N &nbsp; {defaultSite.lng.toFixed(6)}°E
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
            <div style={{
              padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", gap: 16, fontSize: 10, color: "var(--ds-text-faint)",
            }}>
              <span>{defaultSite.state}, {defaultSite.country}</span>
              <span>COD {defaultSite.codYear}</span>
              <span style={{ marginLeft: "auto", fontFamily: "monospace" }}>
                {defaultSite.lat.toFixed(4)}°N, {defaultSite.lng.toFixed(4)}°E
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ChartCard title="Generation vs Forecast" timeframeOptions={["24H", "7D"]} timeframe={genTf} onTimeframeChange={setGenTf}>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={genData}>
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
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Irradiance vs Production" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}}>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={irrad}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis yAxisId="left" {...axisProps} />
                <YAxis yAxisId="right" orientation="right" {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                <Line yAxisId="left" type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Production (MW)" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="irradiance"
                  stroke={CHART_COLORS.teal}
                  strokeWidth={2}
                  dot={false}
                  name="Irradiance (W/m²)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={`Inverter Performance — Group ${filters.invGroup}`}
            timeframeOptions={["24H"]}
            timeframe="24H"
            onTimeframeChange={() => {}}
          >
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={filteredInverters} layout="vertical">
                <XAxis type="number" domain={[0, 100]} {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={40} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
                <Tooltip {...chartTooltipProps} formatter={(v: number) => [v.toFixed(1) + "%", "Output"]} />
                <Bar dataKey="output" radius={[0, 3, 3, 0]}>
                  {filteredInverters.map((inv, i) => (
                    <Cell key={i} fill={inv.output >= 90 ? CHART_COLORS.success : inv.output >= 75 ? CHART_COLORS.warning : CHART_COLORS.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="ai-panel" style={{ minHeight: 500 }}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">AI Intelligence</span>
            <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Refresh">
              <IcoRefresh width={12} height={12} />
            </button>
          </div>
          <div className="ai-panel-body" style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#c4b5fd", padding: "4px 0", marginBottom: 6 }}>Why is generation down?</div>
            <div className="ai-finding-card modal-warning">
              <div className="ai-finding-site">Root Causes</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Cloud Cover</span>
                <span className="ai-finding-value">24%</span>
              </div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">INV-14 Status</span>
                <span className="ai-finding-value" style={{ color: "var(--ds-danger)" }}>
                  Offline
                </span>
              </div>
            </div>
            <div className="ai-finding-card modal-info">
              <div className="ai-finding-site">Recovery Forecast</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Predicted Recovery</span>
                <span className="ai-finding-value">14:20</span>
              </div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Confidence</span>
                <span className="ai-finding-value">91%</span>
              </div>
            </div>
            <div className="ai-finding-card modal-advisory">
              <div className="ai-finding-site">Recommended Action</div>
              <div style={{ fontSize: 12, color: "#e9d5ff", margin: "4px 0" }}>Skip afternoon peak charge. Discharge window 16:00–18:00.</div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Est. savings</span>
                <span className="ai-finding-value">$4,200</span>
              </div>
            </div>
            <div style={{ marginTop: "auto", paddingTop: 12 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask the AI copilot…"
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    color: "#e9d5ff",
                    fontSize: 12,
                    padding: "0 10px",
                    fontFamily: "Inter, sans-serif",
                  }}
                />
                <button className="btn-primary" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <KpiDrilldownModal config={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
