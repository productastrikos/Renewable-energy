import { useState, useMemo, useCallback } from "react";
import { KpiCard } from "../components/shared/KpiCard";
import { ChartCard } from "../components/shared/ChartCard";
import { FilterBar, FilterGroup } from "../components/shared/FilterBar";
import { KpiDrilldownModal, KpiModalConfig } from "../components/shared/KpiDrilldownModal";
import { AssetDigitalTwin } from "../components/digital-twin/AssetDigitalTwin";
import { ProgressBar } from "../components/shared/ProgressBar";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
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
import { generate30d, generate7d, rag } from "../utils/ragHelpers";
import { IcoCpu, IcoActivity, IcoBell, IcoWrench, IcoZap, IcoRefresh } from "../components/shared/Icons";
import { ASSETS } from "../data/mockData";
import { fetchAssets, AssetItem } from "../api/endpoints";
import { useApi } from "../hooks/useApi";

const health30 = generate30d(82);
const failProb30 = generate30d(20).map((d, i) => ({ day: d.day, value: Math.min(95, d.value + i * 0.5) }));
const wo30 = generate30d(50).map((d) => ({ day: d.day, open: Math.round(d.value), closed: Math.round(d.value * 0.85) }));
const mainCost = Array.from({ length: 6 }, (_, i) => ({
  month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
  cost: Math.round(40000 + Math.random() * 30000),
}));
const FAILURE_CAUSES = [
  { name: "Thermal", value: 32, color: CHART_COLORS.danger },
  { name: "Mechanical", value: 28, color: CHART_COLORS.warning },
  { name: "Electrical", value: 22, color: CHART_COLORS.blue },
  { name: "Control", value: 11, color: CHART_COLORS.teal },
  { name: "Other", value: 7, color: CHART_COLORS.slate },
];

const TYPE_COUNTS: Record<string, { total: number; healthy: number; warning: number; critical: number }> = {
  All: { total: 248, healthy: 198, warning: 43, critical: 7 },
  Transformer: { total: 45, healthy: 38, warning: 6, critical: 1 },
  Inverter: { total: 80, healthy: 62, warning: 14, critical: 4 },
  Battery: { total: 30, healthy: 26, warning: 3, critical: 1 },
  Turbine: { total: 60, healthy: 48, warning: 11, critical: 1 },
  Switchgear: { total: 33, healthy: 24, warning: 9, critical: 0 },
};

const STATUS_MAP: Record<string, string> = { Healthy: "success", Warning: "warning", Critical: "danger" };

const FILTER_GROUPS: FilterGroup[] = [
  { label: "Asset Type", key: "type", options: ["All", "Transformer", "Inverter", "Battery", "Turbine", "Switchgear"] },
  { label: "Status", key: "status", options: ["All", "Healthy", "Warning", "Critical"] },
];

export default function AssetPerformance() {
  const { data: apiAssets } = useApi(() => fetchAssets(), []);
  const assets = apiAssets ?? ASSETS;

  const [selectedAsset, setSelectedAsset] = useState<AssetItem>(ASSETS[0]);
  const [filters, setFilters] = useState<Record<string, string>>({ type: "All", status: "All" });
  const [activeModal, setActiveModal] = useState<KpiModalConfig | null>(null);

  const handleFilterChange = useCallback((key: string, val: string) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }, []);

  const filteredAssets = useMemo(() => {
    const statusVal = STATUS_MAP[filters.status];
    return assets.filter((a) => (filters.type === "All" || a.type === filters.type) && (filters.status === "All" || a.status === statusVal));
  }, [filters, assets]);

  const effectiveSelected = useMemo(
    () => filteredAssets.find((a) => a.id === selectedAsset.id) ?? filteredAssets[0] ?? assets[0],
    [filteredAssets, selectedAsset.id, assets],
  );

  const typeCounts = useMemo(() => {
    const base = TYPE_COUNTS[filters.type] ?? TYPE_COUNTS.All;
    if (filters.status === "All") return base;
    if (filters.status === "Healthy") return { total: base.healthy, healthy: base.healthy, warning: 0, critical: 0 };
    if (filters.status === "Warning") return { total: base.warning, healthy: 0, warning: base.warning, critical: 0 };
    if (filters.status === "Critical") return { total: base.critical, healthy: 0, warning: 0, critical: base.critical };
    return base;
  }, [filters]);

  const typeFrac = (TYPE_COUNTS[filters.type]?.total ?? TYPE_COUNTS.All.total) / TYPE_COUNTS.All.total;

  const kpis = useMemo(
    () => ({
      mtbf: Math.round(842 * typeFrac),
      mttr: +(3.2 / Math.max(0.5, typeFrac)).toFixed(1),
      openWO: Math.round(38 * typeFrac),
      closedWO: Math.round(94 * typeFrac),
    }),
    [typeFrac],
  );

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const d7 = generate7d(50, 0.1).map((d) => ({ time: d.day, v: Math.round(d.actual * typeFrac) }));
      const d30 = generate30d(50).map((d) => ({ time: String(d.day), v: Math.round(d.value * typeFrac) }));
      const h30 = health30.map((d) => ({ time: String(d.day), health: +(d.value * typeFrac).toFixed(1) }));

      const map: Record<string, KpiModalConfig> = {
        "Asset Count": {
          label: "Asset Count",
          value: typeCounts.total,
          rag: "info",
          description: "Total assets matching the current filter.",
          timeframeOptions: ["30D"],
          chartType: "line",
          chartData: { "30D": h30 },
          series: [{ key: "health", name: "Avg Health", color: CHART_COLORS.blue }],
          xKey: "time",
          contextCards: [
            {
              title: "By Status",
              type: "info",
              rows: [
                { label: "Healthy", value: String(typeCounts.healthy) },
                { label: "Warning", value: String(typeCounts.warning) },
                { label: "Critical", value: String(typeCounts.critical) },
              ],
            },
            {
              title: "Coverage",
              type: "info",
              rows: [
                { label: "Sites Covered", value: "5" },
                { label: "Asset Types", value: "5" },
              ],
            },
            {
              title: "Fleet Scope",
              type: "info",
              rows: [
                { label: "Total Capacity", value: "1,270 MW" },
                { label: "Monitored", value: "100%" },
              ],
            },
          ],
        },
        "Healthy": {
          label: "Healthy",
          value: typeCounts.healthy,
          rag: "success",
          description: "Assets operating within normal parameters.",
          timeframeOptions: ["7D", "30D"],
          chartType: "line",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, count: Math.round(typeCounts.healthy * (0.95 + Math.random() * 0.08)) })),
            "30D": d30.map((d) => ({ time: d.time, count: Math.round(typeCounts.healthy * (0.92 + Math.random() * 0.1)) })),
          },
          series: [{ key: "count", name: "Healthy Assets", color: CHART_COLORS.success }],
          xKey: "time",
          contextCards: [
            {
              title: "Trend",
              type: "success",
              rows: [
                { label: "vs Last Week", value: "+3" },
                { label: "Recovery Rate", value: "94%" },
              ],
            },
            {
              title: "Top Performer",
              type: "success",
              rows: [
                { label: "Asset", value: "Battery B-3" },
                { label: "Health", value: "91" },
              ],
            },
            {
              title: "Maintenance Due",
              type: "info",
              rows: [
                { label: "Within 7 days", value: "4 assets" },
                { label: "Scheduled", value: "12 assets" },
              ],
            },
          ],
        },
        "Warning": {
          label: "Warning",
          value: typeCounts.warning,
          rag: "warning",
          description: "Assets requiring monitoring or near-term action.",
          timeframeOptions: ["7D", "30D"],
          chartType: "bar",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, count: Math.round(typeCounts.warning * (0.9 + Math.random() * 0.2)) })),
            "30D": d30.map((d) => ({ time: d.time, count: Math.round(typeCounts.warning * (0.85 + Math.random() * 0.3)) })),
          },
          series: [{ key: "count", name: "Warning Assets", color: CHART_COLORS.warning }],
          xKey: "time",
          contextCards: [
            {
              title: "Common Causes",
              type: "warning",
              rows: [
                { label: "Temperature", value: "38%" },
                { label: "Vibration", value: "29%" },
                { label: "Load", value: "21%" },
              ],
            },
            {
              title: "Action Items",
              type: "warning",
              rows: [
                { label: "Inspect Within 7d", value: "8 assets" },
                { label: "Parts Ordered", value: "3" },
              ],
            },
            {
              title: "Revenue Risk",
              type: "warning",
              rows: [
                { label: "If Escalated", value: "-$22K/wk" },
                { label: "Avoided", value: "$18K" },
              ],
            },
          ],
        },
        "Critical": {
          label: "Critical",
          value: typeCounts.critical,
          rag: typeCounts.critical > 0 ? "danger" : "success",
          description: "Assets requiring immediate intervention.",
          timeframeOptions: ["7D", "30D"],
          chartType: "bar",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, count: Math.max(0, Math.round(typeCounts.critical * (0.8 + Math.random() * 0.4))) })),
            "30D": d30.map((d) => ({ time: d.time, count: Math.max(0, Math.round(typeCounts.critical * (0.7 + Math.random() * 0.6))) })),
          },
          series: [{ key: "count", name: "Critical Assets", color: CHART_COLORS.danger }],
          xKey: "time",
          contextCards: [
            {
              title: "Top Priority",
              type: "danger",
              rows: [
                { label: "Inverter INV-14", value: "IGBT Thermal" },
                { label: "Action", value: "Replace within 7d" },
              ],
            },
            {
              title: "Revenue Impact",
              type: "danger",
              rows: [
                { label: "Daily Loss", value: "$3,200" },
                { label: "This Week", value: "$22,400" },
              ],
            },
            {
              title: "Escalation Status",
              type: "info",
              rows: [
                { label: "WO Created", value: "Yes" },
                { label: "ETA Parts", value: "Jun 8" },
              ],
            },
          ],
        },
        "MTBF": {
          label: "MTBF",
          value: kpis.mtbf,
          unit: "h",
          rag: rag(kpis.mtbf, 700, 500),
          description: "Mean Time Between Failures — fleet average.",
          timeframeOptions: ["30D"],
          chartType: "line",
          chartData: {
            "30D": d30.map((d) => ({ time: d.time, mtbf: Math.round(kpis.mtbf * (0.9 + Math.random() * 0.2)) })),
          },
          series: [{ key: "mtbf", name: "MTBF (h)", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "By Type",
              type: "success",
              rows: [
                { label: "Inverters", value: "720 h" },
                { label: "Transformers", value: "1,240 h" },
                { label: "Turbines", value: "680 h" },
              ],
            },
            {
              title: "Trend",
              type: "success",
              rows: [
                { label: "vs Last Month", value: "+18 h" },
                { label: "vs P50", value: "+42 h" },
              ],
            },
            {
              title: "Target",
              type: "info",
              rows: [
                { label: "Fleet Target", value: "900 h" },
                { label: "Gap", value: `-${900 - kpis.mtbf} h` },
              ],
            },
          ],
        },
        "MTTR": {
          label: "MTTR",
          value: kpis.mttr,
          unit: "h",
          rag: rag(6 - kpis.mttr, 3, 1),
          description: "Mean Time To Repair — fleet average.",
          timeframeOptions: ["7D", "30D"],
          chartType: "bar",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, mttr: +(kpis.mttr * (0.85 + Math.random() * 0.3)).toFixed(1) })),
            "30D": d30.map((d) => ({ time: d.time, mttr: +(kpis.mttr * (0.8 + Math.random() * 0.4)).toFixed(1) })),
          },
          series: [{ key: "mttr", name: "MTTR (h)", color: CHART_COLORS.amber }],
          xKey: "time",
          contextCards: [
            {
              title: "By Type",
              type: "success",
              rows: [
                { label: "Inverters", value: "2.8 h" },
                { label: "Transformers", value: "5.1 h" },
                { label: "Turbines", value: "4.2 h" },
              ],
            },
            {
              title: "Improvement",
              type: "success",
              rows: [
                { label: "vs Last Month", value: "-0.3 h" },
                { label: "Parts Delay", value: "1.1 h avg" },
              ],
            },
            {
              title: "SLA",
              type: "success",
              rows: [
                { label: "Target", value: "< 4.0 h" },
                { label: "Compliance", value: "92%" },
              ],
            },
          ],
        },
        "Open WO": {
          label: "Open WO",
          value: kpis.openWO,
          rag: rag(80 - kpis.openWO, 40, 20),
          description: "Open work orders pending resolution.",
          timeframeOptions: ["7D", "30D"],
          chartType: "line",
          chartData: {
            "7D": d7.map((d) => ({
              time: d.time,
              open: Math.round(kpis.openWO * (0.9 + Math.random() * 0.2)),
              closed: Math.round(kpis.openWO * 0.85 * (0.9 + Math.random() * 0.2)),
            })),
            "30D": wo30.map((d) => ({ time: String(d.day), open: Math.round(d.open * typeFrac), closed: Math.round(d.closed * typeFrac) })),
          },
          series: [
            { key: "open", name: "Open", color: CHART_COLORS.warning },
            { key: "closed", name: "Closed", color: CHART_COLORS.teal },
          ],
          xKey: "time",
          contextCards: [
            {
              title: "By Priority",
              type: "warning",
              rows: [
                { label: "P1 (24h)", value: "4" },
                { label: "P2 (72h)", value: "12" },
                { label: "P3 (7d)", value: String(kpis.openWO - 16) },
              ],
            },
            {
              title: "Ageing",
              type: "warning",
              rows: [
                { label: "> 7 Days", value: "6" },
                { label: "Blocked", value: "2 (parts)" },
              ],
            },
            {
              title: "Resolution Rate",
              type: "success",
              rows: [
                { label: "This Week", value: "89%" },
                { label: "MTD", value: "91%" },
              ],
            },
          ],
        },
        "Closed WO": {
          label: "Closed WO",
          value: kpis.closedWO,
          rag: "info",
          description: "Work orders closed this month.",
          timeframeOptions: ["7D", "30D"],
          chartType: "bar",
          chartData: {
            "7D": d7.map((d) => ({ time: d.time, closed: Math.round((kpis.closedWO / 4) * (0.8 + Math.random() * 0.4)) })),
            "30D": wo30.map((d) => ({ time: String(d.day), closed: Math.round(d.closed * typeFrac) })),
          },
          series: [{ key: "closed", name: "Closed WOs", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "vs Target",
              type: "success",
              rows: [
                { label: "Target", value: String(Math.round(kpis.closedWO * 0.9)) },
                { label: "Achieved", value: String(kpis.closedWO) },
              ],
            },
            {
              title: "By Type",
              type: "info",
              rows: [
                { label: "Corrective", value: String(Math.round(kpis.closedWO * 0.6)) },
                { label: "Preventive", value: String(Math.round(kpis.closedWO * 0.4)) },
              ],
            },
            {
              title: "Avg Close Time",
              type: "success",
              rows: [
                { label: "This Month", value: "2.9 h" },
                { label: "vs Target", value: "< 4.0 h" },
              ],
            },
          ],
        },
      };
      return map[label] ?? map["Asset Count"];
    },
    [typeFrac, typeCounts, kpis],
  );

  return (
    <div>
      <FilterBar
        groups={FILTER_GROUPS}
        active={filters}
        onChange={handleFilterChange}
        resultCount={filteredAssets.length}
        totalCount={assets.length}
      />

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", marginBottom: 16 }}>
        <KpiCard
          label="Asset Count"
          value={typeCounts.total}
          icon={<IcoCpu width={16} height={16} />}
          rag="info"
          onClick={() => setActiveModal(getModalConfig("Asset Count"))}
        />
        <KpiCard
          label="Healthy"
          value={typeCounts.healthy}
          icon={<IcoActivity width={16} height={16} />}
          rag="success"
          trend="+3"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Healthy"))}
        />
        <KpiCard
          label="Warning"
          value={typeCounts.warning}
          icon={<IcoBell width={16} height={16} />}
          rag="warning"
          trend="+5"
          trendDir="down"
          onClick={() => setActiveModal(getModalConfig("Warning"))}
        />
        <KpiCard
          label="Critical"
          value={typeCounts.critical}
          icon={<IcoBell width={16} height={16} />}
          rag={typeCounts.critical > 0 ? "danger" : "success"}
          trend="+2"
          trendDir="down"
          onClick={() => setActiveModal(getModalConfig("Critical"))}
        />
        <KpiCard
          label="MTBF"
          value={kpis.mtbf}
          unit="h"
          icon={<IcoZap width={16} height={16} />}
          rag={rag(kpis.mtbf, 700, 500)}
          trend="+18h"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("MTBF"))}
        />
        <KpiCard
          label="MTTR"
          value={kpis.mttr}
          unit="h"
          icon={<IcoWrench width={16} height={16} />}
          rag={rag(6 - kpis.mttr, 3, 1)}
          trend="-0.3h"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("MTTR"))}
        />
        <KpiCard
          label="Open WO"
          value={kpis.openWO}
          icon={<IcoWrench width={16} height={16} />}
          rag={rag(80 - kpis.openWO, 40, 20)}
          trend="-12"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Open WO"))}
        />
        <KpiCard
          label="Closed WO"
          value={kpis.closedWO}
          icon={<IcoActivity width={16} height={16} />}
          rag="info"
          trend="+8"
          trendDir="up"
          onClick={() => setActiveModal(getModalConfig("Closed WO"))}
        />
      </div>

      <div className="main-2col-dt" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AssetDigitalTwin assetType={effectiveSelected.type} health={effectiveSelected.health} />

          <div className="panel" style={{ padding: 12 }}>
            <div className="section-label">Assets{filters.type !== "All" ? ` — ${filters.type}` : ""}</div>
            {filteredAssets.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--ds-text-faint)", padding: "8px 0" }}>No assets match this filter.</div>
            )}
            {filteredAssets.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedAsset(a)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: effectiveSelected.id === a.id ? "var(--ds-accent-bg)" : "transparent",
                  border: `1px solid ${effectiveSelected.id === a.id ? "var(--ds-accent-border)" : "transparent"}`,
                  marginBottom: 3,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--ds-text-muted)" }}>{a.name}</span>
                <span className={`chip ${a.status}`} style={{ fontSize: 9 }}>
                  {a.health}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="section-heading">{effectiveSelected.name}</span>
              <span className={`chip ${effectiveSelected.status}`}>{effectiveSelected.status.toUpperCase()}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Health Score", value: effectiveSelected.health, max: 100, unit: "/100", status: rag(effectiveSelected.health, 85, 70) },
                { label: "Temperature", value: effectiveSelected.temp, max: 100, unit: "°C", status: rag(100 - effectiveSelected.temp, 40, 20) },
                { label: "Load", value: effectiveSelected.load, max: 100, unit: "%", status: rag(100 - effectiveSelected.load, 20, 5) },
                {
                  label: "Failure Risk",
                  value: effectiveSelected.failureRisk,
                  max: 100,
                  unit: "%",
                  status: rag(100 - effectiveSelected.failureRisk, 70, 50),
                },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>
                      {m.value}
                      {m.unit}
                    </span>
                  </div>
                  <ProgressBar value={m.value} max={m.max} status={m.status as any} />
                </div>
              ))}
            </div>
            {effectiveSelected.alarm && (
              <div
                style={{
                  marginTop: 10,
                  padding: "6px 10px",
                  background: "var(--ds-danger-bg)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--ds-danger)",
                  border: "1px solid var(--ds-danger-border)",
                }}
              >
                ⚠ {effectiveSelected.alarm}
              </div>
            )}
          </div>

          <div className="chart-grid-2" style={{ gap: 14 }}>
            <ChartCard title="Asset Health Ranking">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={filteredAssets.length > 0 ? filteredAssets : assets} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} {...axisProps} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={70} tick={{ fill: "var(--ds-text-faint)", fontSize: 8 }} />
                  <Tooltip {...chartTooltipProps} />
                  <Bar dataKey="health" radius={[0, 3, 3, 0]}>
                    {(filteredAssets.length > 0 ? filteredAssets : assets).map((a, i) => (
                      <Cell key={i} fill={a.health >= 85 ? CHART_COLORS.success : a.health >= 70 ? CHART_COLORS.warning : CHART_COLORS.danger} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Failure Probability Trend" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}}>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={failProb30}>
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} name="Failure Prob %" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Work Order Trend" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}}>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={wo30}>
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                  <Line type="monotone" dataKey="open" stroke={CHART_COLORS.warning} strokeWidth={2} dot={false} name="Open" />
                  <Line type="monotone" dataKey="closed" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} name="Closed" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Failure Root Cause">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={FAILURE_CAUSES} cx="50%" cy="50%" outerRadius={55} innerRadius={35} dataKey="value">
                    {FAILURE_CAUSES.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}%`, ""]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 9, color: "var(--ds-text-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>

      <div className="ai-panel" style={{ padding: 0 }}>
        <div className="ai-panel-header">
          <span className="ai-panel-title">AI Predictive Maintenance</span>
          <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Refresh AI">
            <IcoRefresh width={12} height={12} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, padding: 12 }}>
          {[
            { asset: "Transformer T-12", risk: 32, cause: "Cooling degradation", rec: "Schedule inspection within 14 days", color: "modal-warning" },
            { asset: "Inverter INV-14", risk: 58, cause: "IGBT thermal stress", rec: "Replace within 7 days", color: "modal-danger" },
            { asset: "Battery B-3", risk: 8, cause: "SOH 91% — nominal", rec: "No action required", color: "modal-success" },
          ].map((f) => (
            <div key={f.asset} className={`ai-finding-card ${f.color}`}>
              <div className="ai-finding-site">{f.asset}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                <span className="ai-finding-label">Failure Risk</span>
                <span className={`chip ${f.risk >= 50 ? "danger" : f.risk >= 25 ? "warning" : "success"}`}>{f.risk}%</span>
              </div>
              <div className="ai-finding-row">
                <span className="ai-finding-label">Likely Cause</span>
                <span className="ai-finding-value">{f.cause}</span>
              </div>
              <div
                style={{ marginTop: 6, fontSize: 11, color: "#e9d5ff", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6 }}
              >
                {f.rec}
              </div>
            </div>
          ))}
        </div>
      </div>

      <KpiDrilldownModal config={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
