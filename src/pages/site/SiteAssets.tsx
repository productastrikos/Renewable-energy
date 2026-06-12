import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { AssetDigitalTwin } from "../../components/digital-twin/AssetDigitalTwin";
import { AssetHierarchyPanel } from "../../components/shared/AssetHierarchyPanel";
import { KpiCard } from "../../components/shared/KpiCard";
import { ProgressBar } from "../../components/shared/ProgressBar";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { generate24hLive, generate7d, generate30d, rag, clipToNow } from "../../utils/ragHelpers";
import { SITE_ASSET_HIERARCHY, WORK_ORDERS } from "../../data/mockData";
import { getStoredWOs } from "../../utils/woStore";
import { fetchHierarchy, fetchSiteWorkOrders } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import {
  IcoCpu, IcoAlertTriangle, IcoWrench, IcoActivity, IcoZap, IcoSparkle,
  IcoCheckCircle, IcoBell,
} from "../../components/shared/Icons";
import { SiteWorkspaceContext } from "./SiteWorkspace";

// ─── Static baseline data (recalculated per asset in the detail panel) ────────
const BASE_HEALTH30 = generate30d(88);
const FAIL_7D = generate7d(2, 0.4).map((d) => ({ time: d.day, failures: Math.max(0, Math.round(d.actual)) }));

// ─── Derive "asset type" from id to decide which DT model to show ─────────────
function assetLabel(id: string): string {
  if (id.startsWith("INV")) return "Inverter";
  if (id.startsWith("TX")) return "Transformer";
  if (id.startsWith("BESS")) return "Battery";
  if (id.startsWith("SY")) return "Switchgear";
  return "—";
}

// ─── Dynamic alarm generator from asset status & type ─────────────────────────
const ALARM_BANK = {
  WTG: {
    danger:  [
      { msg: "Gearbox oil temperature high (89°C)", ts: "11:04" },
      { msg: "Pitch motor overload — Blade B",       ts: "10:32" },
    ],
    warning: [
      { msg: "Generator bearing vibration elevated (8.2 mm/s)", ts: "09:31" },
      { msg: "Yaw misalignment > 8° for > 5 min",              ts: "08:45" },
      { msg: "Nacelle temperature high (72°C)",                 ts: "07:18" },
    ],
  },
  INV: {
    danger:  [
      { msg: "Over-temperature threshold exceeded (88°C)", ts: "11:04" },
      { msg: "DC Bus Overvoltage — protection trip",       ts: "10:22" },
    ],
    warning: [
      { msg: "String current deviation > 15%",     ts: "09:31" },
      { msg: "MPPT efficiency dropped below 96%",  ts: "08:45" },
      { msg: "Cooling fan speed reduced",           ts: "07:18" },
    ],
  },
  TX: {
    danger:  [{ msg: "Winding temperature high (95°C) — critical", ts: "10:50" }],
    warning: [
      { msg: "Oil cooling efficiency degraded",     ts: "09:50" },
      { msg: "Load factor approaching thermal limit", ts: "08:30" },
    ],
  },
  BESS: {
    danger:  [{ msg: "Cell over-voltage detected — Module 3", ts: "11:22" }],
    warning: [
      { msg: "State of Charge below 25%",  ts: "09:15" },
      { msg: "BMS cell temperature high",  ts: "08:00" },
    ],
  },
  DEFAULT: {
    danger:  [{ msg: "Critical fault detected — immediate inspection required", ts: "10:00" }],
    warning: [{ msg: "Performance degraded — investigation recommended", ts: "09:00" }],
  },
};

function getAlarms(asset: SelectedAsset): { sev: "Critical" | "Major" | "Minor"; msg: string; ts: string }[] {
  if (asset.status === "success" || asset.alarms === 0) return [];
  const prefix = asset.id.startsWith("WTG") ? "WTG"
    : asset.id.startsWith("INV") ? "INV"
    : asset.id.startsWith("TX")  ? "TX"
    : asset.id.startsWith("BESS") ? "BESS"
    : "DEFAULT";
  const bank = ALARM_BANK[prefix as keyof typeof ALARM_BANK] ?? ALARM_BANK.DEFAULT;
  if (asset.status === "danger") {
    return [
      ...bank.danger.map(a => ({ ...a, sev: "Critical" as const })),
      ...(bank.warning.slice(0, 1).map(a => ({ ...a, sev: "Major" as const }))),
    ];
  }
  return bank.warning.slice(0, asset.alarms).map((a, i) => ({
    ...a,
    sev: i === 0 ? "Major" as const : "Minor" as const,
  }));
}

const SEV_COLOR: Record<string, string> = {
  Critical: "var(--ds-danger)",
  Major:    "var(--ds-warning)",
  Minor:    "var(--ds-info)",
};
const SEV_BG: Record<string, string> = {
  Critical: "var(--ds-danger-bg)",
  Major:    "var(--ds-warning-bg)",
  Minor:    "var(--ds-info-bg)",
};

// ─── Asset Detail Panel ────────────────────────────────────────────────────────
interface SelectedAsset {
  id: string;
  name: string;
  health: number;
  status: "success" | "warning" | "danger";
  alarms: number;
  temp?: number;
  output?: number;
  strings?: number;
  load?: number;
  soc?: number;
  capacity?: number;
  block?: string;
  type: string;
}

function AssetDetailPanel({ asset, siteWOs }: { asset: SelectedAsset | null; siteWOs: typeof WORK_ORDERS }) {
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "alarms" | "workorders">("overview");

  // Tick every 60s so the current-minute tip of the trend line advances
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Stable numeric seed from asset ID — keeps historical hour values consistent across re-renders
  const assetSeed = useMemo(() => {
    if (!asset?.id) return 0;
    let h = 0;
    for (let i = 0; i < asset.id.length; i++) h = (h * 31 + asset.id.charCodeAt(i)) >>> 0;
    return h;
  }, [asset?.id]);

  // All hooks must run unconditionally — guard with nullish fallback
  const outputTrend = useMemo(() => {
    if (!asset) return [];
    const base = asset.output ?? asset.load ?? asset.health;
    return generate24hLive(assetSeed, base, 0.05).map((d) => ({ time: d.time, value: Math.min(100, Math.max(0, d.actual)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id, asset?.output, asset?.load, asset?.health, assetSeed, tick]);

  const tempTrend = useMemo(() => {
    if (!asset) return [];
    const base = asset.temp ?? 45;
    return generate24hLive(assetSeed + 999, base, 0.06).map((d) => ({ time: d.time, value: +Math.max(15, d.actual).toFixed(1) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id, asset?.temp, assetSeed, tick]);

  const healthTrend = useMemo(
    () => !asset ? [] : BASE_HEALTH30.map((d) => ({ time: String(d.day), value: Math.min(100, Math.round(d.value * (asset.health / 88))) })),
    [asset?.id, asset?.health],
  );

  if (!asset) {
    return (
      <div className="asset-detail-panel adp-empty">
        <IcoCpu width={32} height={32} style={{ opacity: 0.25 }} />
        <p>Select an asset from the hierarchy to view details</p>
      </div>
    );
  }

  const alarms = getAlarms(asset);
  // Exact asset ID match OR WO title/description contains the asset ID
  const relatedWOs = asset.status === "success" && asset.alarms === 0
    ? []
    : siteWOs.filter((w) =>
        w.asset === asset.id ||
        w.asset === asset.name ||
        w.title.includes(asset.id) ||
        w.title.includes(asset.name) ||
        (w.description ?? "").includes(asset.id)
      );

  const healthColor = asset.health >= 85 ? CHART_COLORS.success : asset.health >= 70 ? CHART_COLORS.warning : CHART_COLORS.danger;
  const statusLabel = asset.status === "danger" ? "Critical" : asset.status === "warning" ? "Warning" : "Normal";

  const metrics = [
    { label: "Health Score",   value: `${asset.health}%`,          color: healthColor,         sub: rag(asset.health, 85, 70) },
    ...(asset.temp   != null ? [{ label: "Temperature",  value: `${asset.temp}°C`,    color: asset.temp > 80 ? CHART_COLORS.danger : asset.temp > 65 ? CHART_COLORS.warning : CHART_COLORS.success, sub: null }] : []),
    ...(asset.output != null ? [{ label: "Output",       value: `${asset.output}%`,   color: asset.output >= 90 ? CHART_COLORS.success : asset.output >= 75 ? CHART_COLORS.warning : CHART_COLORS.danger, sub: null }] : []),
    ...(asset.load   != null ? [{ label: "Load Factor",  value: `${asset.load}%`,     color: CHART_COLORS.blue, sub: null }] : []),
    ...(asset.strings != null ? [{ label: "Strings",     value: `${asset.strings}`,   color: CHART_COLORS.sky,  sub: null }] : []),
    ...(asset.soc    != null ? [{ label: "State of Charge", value: `${asset.soc}%`,   color: CHART_COLORS.teal, sub: null }] : []),
    ...(asset.capacity != null ? [{ label: "Capacity",   value: `${asset.capacity} MWh`, color: CHART_COLORS.indigo, sub: null }] : []),
    { label: "Active Alarms",  value: String(asset.alarms),        color: asset.alarms > 0 ? CHART_COLORS.warning : CHART_COLORS.success, sub: null },
  ];

  const specs = [
    { label: "Asset ID",        value: asset.id },
    { label: "Type",            value: asset.type },
    ...(asset.block ? [{ label: "Block", value: asset.block }] : []),
    { label: "Manufacturer",    value: "SunPower Systems" },
    { label: "Rated Power",     value: asset.type === "Inverter" ? "500 kW" : asset.type === "Transformer" ? "1.8 MVA" : "—" },
    { label: "Serial No.",      value: `SP-${asset.id}-2020` },
    { label: "Installed",       value: "Mar 2020" },
    { label: "Last Service",    value: "Jan 2026" },
    { label: "Next PM",         value: "Sep 2026" },
  ];

  return (
    <div className="asset-detail-panel">
      {/* Header */}
      <div className="adp-header">
        <div className="adp-header-left">
          <div className="adp-asset-name">{asset.name}</div>
          <div className="adp-asset-sub">{asset.type}{asset.block ? ` · ${asset.block}` : ""}</div>
        </div>
        <div className="adp-header-right">
          <span className={`chip ${asset.status}`} style={{ fontSize: 10 }}>{statusLabel}</span>
          <div className="adp-health-badge" style={{ color: healthColor }}>
            <span className="adp-health-num">{asset.health}</span>
            <span className="adp-health-unit">/100</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="adp-tabs">
        {(["overview", "trends", "alarms", "workorders"] as const).map((t) => (
          <button key={t} className={`adp-tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "overview" ? "Overview" : t === "trends" ? "Trends" : t === "alarms" ? `Alarms${alarms.length ? ` (${alarms.length})` : ""}` : `Work Orders${relatedWOs.length ? ` (${relatedWOs.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="adp-body">
        {/* ── Overview ── */}
        {activeTab === "overview" && (
          <div className="adp-overview">
            {/* Metrics grid */}
            <div className="adp-metrics-grid">
              {metrics.map((m) => (
                <div key={m.label} className="adp-metric-cell">
                  <div className="adp-mc-label">{m.label}</div>
                  <div className="adp-mc-value" style={{ color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Health bar */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 4 }}>
                <span>Overall Health</span><span style={{ fontWeight: 600, color: healthColor }}>{asset.health}%</span>
              </div>
              <ProgressBar value={asset.health} status={asset.health >= 85 ? "success" : asset.health >= 70 ? "warning" : "danger"} />
            </div>

            {/* Specs */}
            <div className="adp-specs">
              <div className="adp-specs-title">Asset Specifications</div>
              {specs.map((s) => (
                <div key={s.label} className="adp-spec-row">
                  <span className="adp-spec-label">{s.label}</span>
                  <span className="adp-spec-value">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Trends ── */}
        {activeTab === "trends" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(asset.output != null || asset.load != null) && (
              <div>
                <div className="adp-chart-label">{asset.output != null ? "Output % (24H)" : "Load Factor % (24H)"}</div>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={outputTrend}>
                    <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
                    <YAxis domain={[0, 110]} {...axisProps} />
                    <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v.toFixed(1)}%`, ""]} />
                    <Area type="monotone" dataKey="value" stroke={CHART_COLORS.blue} fill={CHART_COLORS.blue} fillOpacity={0.12} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {asset.temp != null && (
              <div>
                <div className="adp-chart-label">Temperature °C (24H)</div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={tempTrend}>
                    <XAxis dataKey="time" {...axisProps} interval="preserveStartEnd" />
                    <YAxis {...axisProps} />
                    <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}°C`, ""]} />
                    <Line type="monotone" dataKey="value" stroke={asset.temp > 80 ? CHART_COLORS.danger : CHART_COLORS.amber} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div>
              <div className="adp-chart-label">Health Score (30D)</div>
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={healthTrend}>
                  <XAxis dataKey="time" {...axisProps} />
                  <YAxis domain={[50, 100]} {...axisProps} />
                  <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v}%`, "Health"]} />
                  <Area type="monotone" dataKey="value" stroke={healthColor} fill={healthColor} fillOpacity={0.1} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Alarms ── */}
        {activeTab === "alarms" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {alarms.length === 0 ? (
              <div className="adp-empty-state">
                <IcoCheckCircle width={22} height={22} style={{ color: "var(--ds-success)", opacity: 0.7 }} />
                <span>No active alarms for {asset.name}</span>
              </div>
            ) : alarms.map((a, i) => (
              <div key={i} className="adp-alarm-row" style={{ background: SEV_BG[a.sev], borderColor: SEV_COLOR[a.sev] }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <IcoBell width={11} height={11} style={{ color: SEV_COLOR[a.sev], flexShrink: 0 }} />
                  <span className="adp-alarm-sev" style={{ color: SEV_COLOR[a.sev] }}>{a.sev}</span>
                  <span className="adp-alarm-ts">{a.ts}</span>
                </div>
                <div className="adp-alarm-msg">{a.msg}</div>
                <button className="btn-ghost" style={{ fontSize: 10, marginTop: 3 }}>Acknowledge →</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Work Orders ── */}
        {activeTab === "workorders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {relatedWOs.length === 0 ? (
              <div className="adp-empty-state">
                <IcoCheckCircle width={22} height={22} style={{ color: "var(--ds-success)", opacity: 0.7 }} />
                <span>No work orders for {asset.name}</span>
              </div>
            ) : relatedWOs.map((wo) => (
              <div key={wo.id} className="adp-wo-row">
                <div className="adp-wo-top">
                  <span className="adp-wo-id">{wo.id}</span>
                  <span className={`chip ${wo.status === "Overdue" ? "danger" : wo.status === "InProgress" ? "advisory" : wo.status === "Closed" ? "success" : "info"}`} style={{ fontSize: 8, height: 18 }}>{wo.status}</span>
                </div>
                <div className="adp-wo-title">{wo.title}</div>
                <div className="adp-wo-meta">
                  <span style={{ color: wo.priority === "High" ? "var(--ds-danger)" : wo.priority === "Medium" ? "var(--ds-warning)" : "var(--ds-info)", fontSize: 10, fontWeight: 600 }}>{wo.priority}</span>
                  <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>Assigned: {wo.assignee}</span>
                  <span style={{ fontSize: 10, color: wo.status === "Overdue" ? "var(--ds-danger)" : "var(--ds-text-faint)" }}>Due: {wo.dueDate.slice(5)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type ColorEntry = { name: string; value: number; fill: string };
type FailEntry  = { time: string; failures: number };

// ─── Portfolio-level analytics when site root is selected ─────────────────────
function SiteOverviewDetail({ healthDist, alarmDist, fail7d }: {
  healthDist: ColorEntry[];
  alarmDist: ColorEntry[];
  fail7d: FailEntry[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="chart-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Health Distribution</span></div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={healthDist} cx="50%" cy="50%" outerRadius={50} innerRadius={28} dataKey="value">
                {healthDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9, color: "var(--ds-text-muted)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Failure Trend (7D)</span></div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={fail7d}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} allowDecimals={false} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="failures" fill={CHART_COLORS.danger} radius={[3, 3, 0, 0]} name="Failures" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {alarmDist.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-header"><span className="chart-card-title">Alarm Distribution by Asset</span></div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={alarmDist} layout="vertical">
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axisProps} width={80} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                {alarmDist.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SiteAssets() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [selectedAssetId, setSelectedAssetId] = useState("INV-001");

  const { data: apiHierarchy }  = useApi(() => fetchHierarchy(site.id), [site.id]);
  const { data: apiWorkOrders } = useApi(() => fetchSiteWorkOrders(site.id), [site.id]);
  const [storedWOs, setStoredWOs] = useState(() => getStoredWOs().filter(w => w.siteId === site.id));

  useEffect(() => {
    const load = () => setStoredWOs(getStoredWOs().filter(w => w.siteId === site.id));
    window.addEventListener("wo-store-updated", load);
    window.addEventListener("focus", load);
    return () => { window.removeEventListener("wo-store-updated", load); window.removeEventListener("focus", load); };
  }, [site.id]);

  const hierarchy = apiHierarchy ?? SITE_ASSET_HIERARCHY[site.id];
  const baseMockWOs = apiWorkOrders ?? WORK_ORDERS.filter((w) => w.siteId === site.id);
  const baseIds = new Set(baseMockWOs.map(w => w.id));
  const siteWOs = [...storedWOs.filter(w => !baseIds.has(w.id)), ...baseMockWOs];
  const openWOs = siteWOs.filter((w) => w.status === "Open" || w.status === "InProgress").length;
  const overdueWOs = siteWOs.filter((w) => w.status === "Overdue").length;

  const allInverters = useMemo(() => {
    if (!hierarchy) return [];
    return hierarchy.blocks.flatMap((b) => b.inverters.map((inv) => ({ ...inv, block: b.name })));
  }, [hierarchy]);

  const criticalCount = useMemo(() => {
    if (!hierarchy) return 0;
    return allInverters.filter((i) => i.status === "danger").length +
      hierarchy.transformers.filter((t) => t.status === "danger").length;
  }, [hierarchy, allInverters]);

  const avgHealth = useMemo(() => {
    if (!hierarchy) return 0;
    const fixed = [hierarchy.switchyard, hierarchy.scada,
      ...(hierarchy.weatherStation ? [hierarchy.weatherStation] : []),
      ...(hierarchy.bess           ? [hierarchy.bess]            : []),
    ];
    const all = [...allInverters, ...hierarchy.transformers, ...fixed];
    return Math.round(all.reduce((s, a) => s + a.health, 0) / all.length);
  }, [hierarchy, allInverters]);

  const healthDist = useMemo(() => {
    if (!hierarchy) return [];
    const all = [...allInverters, ...hierarchy.transformers];
    return [
      { name: "Healthy (>85)", value: all.filter((a) => a.health > 85).length, fill: CHART_COLORS.success },
      { name: "Warning (70–85)", value: all.filter((a) => a.health >= 70 && a.health <= 85).length, fill: CHART_COLORS.warning },
      { name: "Critical (<70)", value: all.filter((a) => a.health < 70).length, fill: CHART_COLORS.danger },
    ];
  }, [hierarchy, allInverters]);

  const alarmDist = useMemo(() => {
    if (!hierarchy) return [];
    const all = [...allInverters, ...hierarchy.transformers];
    const groups: Record<string, number> = {};
    all.forEach((a) => { if (a.alarms > 0) groups[a.name] = (groups[a.name] ?? 0) + a.alarms; });
    return Object.entries(groups).map(([name, value], i) => ({ name, value, fill: [CHART_COLORS.danger, CHART_COLORS.warning, CHART_COLORS.sky][i % 3] }));
  }, [hierarchy, allInverters]);

  // Resolve the selected asset into a normalised object
  const selectedAsset = useMemo((): SelectedAsset | null => {
    if (!hierarchy) return null;
    if (selectedAssetId === site.id) return null; // site root → show portfolio summary

    const inv = allInverters.find((i) => i.id === selectedAssetId);
    if (inv) return { id: inv.id, name: inv.name, health: inv.health, status: inv.status, alarms: inv.alarms, temp: inv.temp, output: inv.output, strings: inv.strings, block: inv.block, type: "Inverter" };

    const tx = hierarchy.transformers.find((t) => t.id === selectedAssetId);
    if (tx) return { id: tx.id, name: tx.name, health: tx.health, status: tx.status, alarms: tx.alarms, temp: tx.temp, load: tx.load, type: "Transformer" };

    if (hierarchy.bess && selectedAssetId === hierarchy.bess.id) {
      const b = hierarchy.bess;
      return { id: b.id, name: b.name, health: b.health, status: b.status, alarms: b.alarms, type: "Battery", capacity: b.capacity, soc: b.soc };
    }

    const fixedAssets = [hierarchy.switchyard, hierarchy.scada,
      ...(hierarchy.weatherStation ? [hierarchy.weatherStation] : []),
    ];
    const fixed = fixedAssets.find((a) => a.id === selectedAssetId);
    if (fixed) return { id: fixed.id, name: fixed.name, health: fixed.health, status: fixed.status, alarms: fixed.alarms, type: assetLabel(fixed.id) };

    // Block selected → show block summary (no detail view, handled as null → site summary)
    return null;
  }, [hierarchy, selectedAssetId, allInverters, site.id]);

  if (!hierarchy) {
    return <div style={{ padding: 24, color: "var(--ds-text-faint)", fontSize: 13 }}>Asset hierarchy not available for {site.name}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <KpiCard label="Asset Health Score" value={avgHealth} unit="/100" icon={<IcoCpu width={14} height={14} />} rag={rag(avgHealth, 85, 70)} trend="+1" trendDir="up" />
        <KpiCard label="Critical Assets" value={criticalCount} icon={<IcoAlertTriangle width={14} height={14} />} rag={criticalCount > 0 ? "danger" : "success"} trend={criticalCount > 0 ? "+1" : "0"} trendDir={criticalCount > 0 ? "down" : "up"} />
        <KpiCard label="Open Work Orders" value={openWOs + overdueWOs} icon={<IcoWrench width={14} height={14} />} rag={overdueWOs > 0 ? "warning" : "info"} trend={`${overdueWOs} overdue`} trendDir="down" />
        <KpiCard label="MTBF" value="412" unit="h" icon={<IcoActivity width={14} height={14} />} rag="success" trend="+18h" trendDir="up" />
        <KpiCard label="MTTR" value="3.2" unit="h" icon={<IcoZap width={14} height={14} />} rag={rag(100 - 3.2, 95, 90)} trend="-0.4h" trendDir="up" />
      </div>

      {/* Hierarchy | Detail Panel | Digital Twin */}
      <div className="assets-detail-row">
        <AssetHierarchyPanel
          siteId={site.id}
          siteName={site.name}
          siteHealth={site.health}
          siteAlarms={site.alarms}
          selectedId={selectedAssetId}
          onSelect={setSelectedAssetId}
        />
        {/* Asset Detail or Site Summary */}
        {selectedAsset ? (
          <AssetDetailPanel asset={selectedAsset} siteWOs={siteWOs} />
        ) : (
          <SiteOverviewDetail
            healthDist={healthDist}
            alarmDist={alarmDist}
            fail7d={FAIL_7D}
          />
        )}

        {/* Right: Digital Twin */}
        <div className="dt-panel" style={{ minHeight: 420 }}>
          <div className="dt-header">
            <span className="chart-card-title">Digital Twin</span>
            <span className="chip info" style={{ fontSize: 9 }}>{selectedAsset?.type ?? "Site"}</span>
          </div>
          <div className="dt-body">
            <AssetDigitalTwin />
          </div>
        </div>
      </div>

      {/* AI Predictive Maintenance */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title"><IcoSparkle width={11} height={11} /> AI Predictive Maintenance</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            { title: "Next Predicted Failure", type: "danger" as const, asset: "INV-006", risk: "87%", timeframe: "3–5 days", reason: "Thermal stress + string degradation", action: "Schedule immediate inspection" },
            { title: "Maintenance Recommendation", type: "warning" as const, asset: "TX-002", risk: "52%", timeframe: "7–14 days", reason: "Cooling system efficiency dropping", action: "Schedule cooling inspection" },
            { title: "Optimization Opportunity", type: "info" as const, asset: "Block 2", risk: "—", timeframe: "This week", reason: "Panel soiling detected (−2.1% PR)", action: "Schedule cleaning crew" },
          ].map((item) => (
            <div key={item.title} className={`ai-finding-card modal-${item.type}`} style={{ padding: "10px 12px" }}>
              <div className="ai-finding-site">{item.title}</div>
              <div className="ai-finding-metric">{item.asset}</div>
              <div className="ai-finding-row"><span className="ai-finding-label">Risk</span><span className="ai-finding-value">{item.risk}</span></div>
              <div className="ai-finding-row"><span className="ai-finding-label">Timeframe</span><span className="ai-finding-value">{item.timeframe}</span></div>
              <div className="ai-finding-row"><span className="ai-finding-label">Reason</span><span className="ai-finding-value">{item.reason}</span></div>
              <div style={{ marginTop: 6, padding: "4px 8px", background: "rgba(255,255,255,0.06)", borderRadius: 5, fontSize: 10, color: "#e9d5ff" }}>{item.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
