import { useState, useCallback, useMemo } from "react";
import { useLiveValue, useLiveClock, useLastSync } from "../../hooks/useLiveData";
import { useOutletContext } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { SLDCanvas, SLDSelectedInfo } from "../../components/digital-twin/SLDCanvas";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard, ChartInfo } from "../../components/shared/ChartCard";
import { KpiDrilldownModal, KpiModalConfig } from "../../components/shared/KpiDrilldownModal";
import { AIFindingDrilldownModal } from "../../components/shared/AIFindingDrilldownModal";
import { useTimeframe } from "../../components/shared/ChartTimeframeControl";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../../utils/chartHelpers";
import { generate24h, generate7d, generate30d, rag, clipToNow } from "../../utils/ragHelpers";
import { AI_FINDINGS, AIFinding, SITE_ASSET_HIERARCHY } from "../../data/mockData";

// ─── Adapter: map rule-engine API findings → AIFinding shape for the modal ────
function adaptApiFinding(raw: Record<string, unknown>): AIFinding {
  const sev = (raw.sev as string) ?? "HIGH";
  const urgency = sev === "CRITICAL" ? "immediate" : sev === "HIGH" ? "urgent" : "monitor";
  const causeStatus = sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : "info";
  const assetStatus = sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : "success";
  const steps = Array.isArray(raw.steps) ? (raw.steps as string[]) : [];
  const impact = (raw.impact as string) ?? "";
  const lossMatch = impact.match(/[−\-]\$[\d,]+(?:\.\d+)?(?:\/\w+)?/);

  return {
    site:      (raw.site      as string) ?? "",
    metric:    (raw.title     as string) ?? "",
    rootCause: (raw.rootCause as string) ?? "",
    loss:      lossMatch ? lossMatch[0] : impact.slice(0, 30) || "—",
    action:    steps[0] ?? (raw.recommendation as string) ?? "—",
    priority:  sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : sev === "LOW" ? "success" : "info",
    drilldown: {
      urgency: urgency as "immediate" | "urgent" | "monitor",
      detectedAt: (raw.detected as string) ?? "Today",
      summary: (raw.analysis     as string) ?? "",
      context: (raw.recommendation as string) ?? undefined,
      causes:  [{ label: (raw.rootCause as string) ?? "Unknown", probability: typeof raw.conf === "number" ? (raw.conf > 1 ? raw.conf : Math.round(raw.conf * 100)) : 85, severity: causeStatus }],
      affectedAssets: [{
        id:     (raw.asset as string) ?? "—",
        name:   (raw.asset as string) ?? "Unknown",
        status: assetStatus,
        detail: `${(raw.type as string) ?? "Finding"} — ${sev}`,
      }],
      nextSteps: steps.length
        ? steps.map((s) => ({ urgency: urgency as "immediate" | "urgent" | "monitor", action: s, eta: "Immediate" }))
        : [{ urgency: urgency as "immediate" | "urgent" | "monitor", action: (raw.recommendation as string) ?? "Review", eta: "Immediate" }],
    },
  };
}
import { fetchSiteAiFindings, fetchGeneration, fetchAvailability, fetchIrradiance } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { ProgressBar } from "../../components/shared/ProgressBar";
import {
  IcoZap,
  IcoActivity,
  IcoCpu,
  IcoDollar,
  IcoLeaf,
  IcoBell,
  IcoSun,
  IcoSparkle,
  IcoRefresh,
  IcoCloud,
  IcoWind,
  IcoThermometer,
  IcoWrench,
  IcoAlertTriangle,
} from "../../components/shared/Icons";

// ─── Site-type marker colours (matches GlobalOps palette) ────────────────────
const _SOV_TYPE_CLR: Record<string, string> = {
  Solar: "#f59e0b",
  Wind: "#38bdf8",
  Hydro: "#34d399",
  BESS: "#818cf8",
  Hybrid: "#a78bfa",
};

export default function SiteOverview() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const { tf: genTf, setTf: setGenTf } = useTimeframe("24H");
  const [modal, setModal] = useState<KpiModalConfig | null>(null);
  const [aiFinding, setAiFinding] = useState<AIFinding | null>(null);
  const [hierSearch, setHierSearch] = useState("");
  const [sldSelection, setSldSelection] = useState<SLDSelectedInfo | null>(null);

  // ── Live data ──────────────────────────────────────────────────────────────
  const liveGen = useLiveValue(site.generation, 0.03, 8000, 1);
  const liveAvail = useLiveValue(site.availability, 0.005, 30000, 1);
  const livePR = useLiveValue(site.pr, 0.008, 20000, 1);
  const clock = useLiveClock();
  const lastSync = useLastSync(10000);

  // ── SLD hierarchy + active events ───────────────────────────────────────────
  const h = SITE_ASSET_HIERARCHY[site.id];
  const totalInvCount = useMemo(() => h?.blocks.reduce((a, b) => a + b.inverters.length, 0) ?? 1, [h]);
  const activeEvents = useMemo(() => {
    if (!h) return [];
    const events: { id: string; name: string; msg: string; kind: string }[] = [];
    h.blocks.forEach((b) =>
      b.inverters.forEach((inv) => {
        if (inv.status !== "success") {
          events.push({ id: inv.id, name: inv.name, kind: inv.status, msg: `Degraded output ${inv.output}% · ${inv.temp}°C` });
        }
      }),
    );
    h.transformers.forEach((tx) => {
      if (tx.status !== "success") {
        events.push({
          id: tx.id,
          name: `Transformer ${tx.name.replace("Transformer ", "")}`,
          kind: tx.status,
          msg: `Cooling degraded – ${tx.temp}°C, ${tx.load}% load`,
        });
      }
    });
    return events;
  }, [h]);

  // ── API data with static fallbacks ──────────────────────────────────────────
  const { data: apiFindings } = useApi(() => fetchSiteAiFindings(site.id), [site.id]);
  const { data: apiGen24 } = useApi(() => fetchGeneration(site.id, "24h"), [site.id]);
  const { data: apiGen7d } = useApi(() => fetchGeneration(site.id, "7d"), [site.id]);
  const { data: apiAvail } = useApi(() => fetchAvailability(site.id), [site.id]);
  const { data: apiIrrad } = useApi(() => fetchIrradiance(site.id), [site.id]);

  const staticGen24 = generate24h(site.generation, 0.12);
  const staticGen7d = generate7d(site.generation * 7.8, 0.1);
  const staticAvail = generate30d(site.availability).map((d) => ({ day: d.day, v: Math.min(100, d.value) }));
  const staticIrrad = staticGen24.map((d, i) => ({
    time: d.time,
    generation: d.actual,
    irradiance: Math.max(0, Math.round(850 * Math.sin((Math.PI * i) / 16) + (Math.random() - 0.5) * 60)),
  }));

  const gen24 = apiGen24 ?? staticGen24;
  // Normalise to { time, actual, forecast } regardless of source
  const gen7d = apiGen7d ? apiGen7d : staticGen7d.map((d) => ({ time: d.day, actual: d.actual, forecast: d.forecast }));
  const avail30 = apiAvail ? apiAvail.map((d) => ({ day: Number(d.time), v: d.value })) : staticAvail;
  const irrad = apiIrrad ?? staticIrrad;

  const allFindings: AIFinding[] = apiFindings
    ? (apiFindings as unknown as Record<string, unknown>[]).map((f) =>
        "drilldown" in f ? (f as unknown as AIFinding) : adaptApiFinding(f)
      )
    : AI_FINDINGS;
  const siteFindings = allFindings
    .filter((f) => f.site.includes(site.name.split(" ")[0]))
    .concat(allFindings.filter((f) => !f.site.includes(site.name.split(" ")[0])).slice(0, 1))
    .slice(0, 3);

  const kpis = [
    {
      label: "Current Generation",
      value: `${liveGen}`,
      unit: "MW",
      icon: <IcoSun width={14} height={14} />,
      rag: rag((liveGen / site.capacity) * 100, 70, 50),
      trend: "+4%",
      trendDir: "up" as const,
    },
    {
      label: "Today's Energy",
      value: `${Math.round(((liveGen * 8) / 1000) * 10) / 10}`,
      unit: "GWh",
      icon: <IcoZap width={14} height={14} />,
      rag: rag(liveGen, 160, 120),
      trend: "+2%",
      trendDir: "up" as const,
    },
    {
      label: "Availability",
      value: `${liveAvail}`,
      unit: "%",
      icon: <IcoActivity width={14} height={14} />,
      rag: rag(liveAvail, 97, 94),
      trend: "+0.3%",
      trendDir: "up" as const,
    },
    {
      label: "Performance Ratio",
      value: `${livePR}`,
      unit: "%",
      icon: <IcoCpu width={14} height={14} />,
      rag: rag(livePR, 82, 76),
      trend: "+0.8%",
      trendDir: "up" as const,
    },
    {
      label: "CUF",
      value: `${site.cuf}`,
      unit: "%",
      icon: <IcoZap width={14} height={14} />,
      rag: rag(site.cuf, 75, 65),
      trend: "+1.2%",
      trendDir: "up" as const,
    },
    {
      label: "Revenue Today",
      value: `$${(site.revenueToday / 1000).toFixed(1)}K`,
      unit: undefined,
      icon: <IcoDollar width={14} height={14} />,
      rag: "success" as const,
      trend: "+5%",
      trendDir: "up" as const,
    },
    {
      label: "Carbon Offset",
      value: `${(site.carbonOffset / 1000).toFixed(1)}K`,
      unit: "tCO₂",
      icon: <IcoLeaf width={14} height={14} />,
      rag: "info" as const,
      trend: "+3%",
      trendDir: "up" as const,
    },
    {
      label: "Site Health",
      value: `${site.health}`,
      unit: "/100",
      icon: <IcoBell width={14} height={14} />,
      rag: rag(site.health, 85, 70),
      trend: "-1",
      trendDir: site.alarms > 2 ? ("down" as const) : ("up" as const),
    },
  ];

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const base: KpiModalConfig = {
        label,
        value: 0,
        unit: undefined,
        rag: "info",
        description: `Historical trend for ${label} — ${site.name}`,
        timeframeOptions: ["24H", "7D", "30D"],
        chartType: "line",
        chartData: {
          "24H": clipToNow(gen24).map((d) => ({ time: d.time, value: d.actual })),
          "7D": gen7d.map((d) => ({ time: d.time, value: d.actual })),
          "30D": avail30.map((d) => ({ time: String(d.day), value: d.v })),
        },
        series: [{ key: "value", name: label, color: CHART_COLORS.blue }],
        xKey: "time",
        contextCards: [],
      };
      const scadaSource = {
        name: `${site.name} SCADA`,
        type: "Energy Meter (Class 0.5S)",
        frequency: "15-min intervals",
        protocol: "Modbus TCP / IEC 61850",
        lastSync: `Today, ${clock}`,
      };
      switch (label) {
        case "Availability":
          return {
            ...base,
            description: `Percentage of scheduled hours the site was available to generate. Planned outages are excluded per IEC 61724-1.`,
            thresholds: {
              warningValue: 97,
              criticalValue: 94,
              maxValue: 100,
              unit: "%",
              rows: [
                { status: "success", label: "Normal", range: "≥ 97%" },
                { status: "warning", label: "Warning", range: "94 – 97%" },
                { status: "danger", label: "Critical", range: "< 94%  (SLA breach risk)" },
              ],
              standard: "IEC 61724-1:2021",
            },
            dataSource: { ...scadaSource, tag: `${site.id.toUpperCase()}.AVAILABILITY_PCT` },
          };
        case "Performance Ratio":
          return {
            ...base,
            description: `Ratio of actual energy yield to the theoretical energy yield based on plane-of-array irradiance (POAI). Target ≥ 82%.`,
            thresholds: {
              warningValue: 82,
              criticalValue: 76,
              maxValue: 100,
              unit: "%",
              rows: [
                { status: "success", label: "Normal", range: "≥ 82%  (industry target)" },
                { status: "warning", label: "Warning", range: "76 – 82%  (losses elevated)" },
                { status: "danger", label: "Critical", range: "< 76%  (investigation required)" },
              ],
              standard: "IEC 61724-1:2021 — Performance Ratio definition",
            },
            dataSource: {
              name: `${site.name} SCADA + Pyranometer`,
              type: "Gen Meter + Irradiance Sensor",
              frequency: "15-min intervals",
              protocol: "Modbus RTU",
              tag: `${site.id.toUpperCase()}.PERFORMANCE_RATIO`,
              lastSync: `Today, ${clock}`,
            },
          };
        case "Current Generation":
          return {
            ...base,
            description: `Real-time AC output power from all inverters at ${site.name}. Value updates every 5 minutes via SCADA polling.`,
            thresholds: {
              warningValue: 70,
              criticalValue: 50,
              maxValue: 100,
              unit: "% of rated",
              rows: [
                { status: "success", label: "Normal", range: "≥ 70% of rated capacity" },
                { status: "warning", label: "Warning", range: "50 – 70% of rated capacity" },
                { status: "danger", label: "Critical", range: "< 50% (weather or fault-driven)" },
              ],
            },
            dataSource: { ...scadaSource, tag: `${site.id.toUpperCase()}.AC_POWER_KW`, frequency: "5-min polling" },
          };
        case "CUF":
          return {
            ...base,
            description: `Capacity Utilisation Factor — ratio of actual energy produced to the maximum possible if the plant ran at full capacity 24/7.`,
            thresholds: {
              warningValue: 75,
              criticalValue: 60,
              maxValue: 100,
              unit: "%",
              rows: [
                { status: "success", label: "Normal", range: "≥ 75%  (solar: good irradiance)" },
                { status: "warning", label: "Warning", range: "60 – 75%" },
                { status: "danger", label: "Critical", range: "< 60%  (review losses)" },
              ],
            },
            dataSource: { ...scadaSource, tag: `${site.id.toUpperCase()}.CUF_PCT` },
          };
        case "Site Health":
          return {
            ...base,
            description: `Composite AI-calculated health score (0–100) incorporating equipment condition, alarm history, performance deviation, and predictive risk factors.`,
            thresholds: {
              warningValue: 85,
              criticalValue: 70,
              maxValue: 100,
              unit: "/100",
              rows: [
                { status: "success", label: "Healthy", range: "≥ 85 — all systems normal" },
                { status: "warning", label: "Warning", range: "70 – 85 — attention required" },
                { status: "danger", label: "Critical", range: "< 70 — immediate action needed" },
              ],
            },
            dataSource: {
              name: "Astrikos AI Engine v3.1",
              type: "ML Model (XGBoost + LSTM)",
              frequency: "Updated every 30 min",
              protocol: "Internal API",
              tag: `${site.id.toUpperCase()}.HEALTH_SCORE`,
              lastSync: "Today, 14:15:00",
            },
          };
        case "Revenue Today":
          return {
            ...base,
            description: `Intraday revenue projection for ${site.name} based on metered generation × applicable PPA/tariff rate. Reconciled at day-end with billing system.`,
            thresholds: {
              warningValue: 90,
              criticalValue: 75,
              maxValue: 120,
              unit: "% of budget",
              rows: [
                { status: "success", label: "On Track", range: "≥ 90% of daily budget" },
                { status: "warning", label: "Below", range: "75 – 90% of daily budget" },
                { status: "danger", label: "Critical", range: "< 75% of daily budget" },
              ],
            },
            dataSource: {
              name: "Billing & Trading System",
              type: "PPA Rate × Metered Gen",
              frequency: "Hourly",
              protocol: "REST API",
              tag: `${site.id.toUpperCase()}.REVENUE_USD`,
              lastSync: "Today, 14:00:00",
            },
          };
        default:
          return base;
      }
    },
    [site.name, site.id],
  );

  // gen7d is already normalised to { time, actual, forecast }
  const genData = genTf === "7D" ? gen7d : clipToNow(gen24).map((d) => ({ time: d.time, actual: d.actual, forecast: d.forecast }));
  const availData = avail30.map((d) => ({ time: String(d.day), value: d.v }));

  // ── Chart info popovers ────────────────────────────────────────────────────
  const chartInfos = useCallback((): Record<string, ChartInfo> => {
    const vals24 = gen24.map((d) => d.actual).filter((v) => v > 0);
    const vals7d = gen7d.map((d) => d.actual);
    const valsAvail = avail30.map((d) => d.v);
    const valsIrrad = (irrad as { irradiance?: number }[]).map((d) => d.irradiance ?? 0).filter((v) => v > 0);
    const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0);
    const peak = (a: number[]) => (a.length ? Math.round(Math.max(...a)) : 0);
    const mn = (a: number[]) => (a.length ? Math.round(Math.min(...a)) : 0);
    const mape =
      gen7d.reduce((s, d) => {
        const f = (d as { forecast?: number }).forecast;
        return f && d.actual ? s + Math.abs((d.actual - f) / d.actual) * 100 : s;
      }, 0) / Math.max(gen7d.length, 1);

    return {
      generation: {
        description: `AC output power from all inverters at ${site.name}. Actual vs AI forecast. Updates every 5 minutes via SCADA polling.`,
        stats: [
          { label: "Current Output", value: `${site.generation} MW`, highlight: true },
          { label: "Today's Peak", value: `${peak(vals24)} MW` },
          { label: "Today's Avg", value: `${avg(vals24)} MW` },
          { label: "Capacity", value: `${site.capacity} MW` },
          { label: "Utilisation", value: `${Math.round((site.generation / site.capacity) * 100)}%`, highlight: true },
          { label: "PR", value: `${site.pr}%` },
        ],
        source: `${site.name} SCADA — Tag: ${site.id.toUpperCase()}.AC_POWER_KW`,
        standard: "IEC 61724-1 — AC power measurement",
        note: "Forecast from Astrikos AI v3.1 using irradiance, temperature and historical PR.",
      },
      irradiance: {
        description:
          "Correlation between plane-of-array irradiance (W/m²) from pyranometer and AC generation output. Divergence indicates soiling, shading or equipment losses.",
        stats: [
          { label: "Peak Irradiance", value: `${peak(valsIrrad)} W/m²`, highlight: true },
          { label: "Avg Irradiance", value: `${avg(valsIrrad)} W/m²` },
          { label: "Current Gen", value: `${site.generation} MW` },
          { label: "Performance Ratio", value: `${site.pr}%`, highlight: true },
        ],
        source: "Pyranometer (Class A) + SCADA · 5-min resolution",
        standard: "IEC 60904-3 — Irradiance measurement reference",
        note: "Low PR during high irradiance = soiling, thermal derating or inverter fault.",
      },
      availability: {
        description: `% of scheduled hours the site was available to generate (30 days). Planned outages excluded per IEC 61724-1. SLA threshold: 97%.`,
        stats: [
          { label: "Current Month", value: `${site.availability.toFixed(1)}%`, highlight: true },
          { label: "30D Average", value: `${avg(valsAvail)}%` },
          { label: "30D Minimum", value: `${mn(valsAvail)}%` },
          { label: "Days ≥ 97%", value: `${valsAvail.filter((v) => v >= 97).length} / 30`, highlight: true },
          { label: "SLA Target", value: "≥ 97%" },
        ],
        source: `${site.name} SCADA — Tag: ${site.id.toUpperCase()}.AVAILABILITY_PCT`,
        standard: "IEC 61724-1:2021 — Availability definition",
        note: "Below 97% may trigger SLA penalties. Planned maintenance is excluded.",
      },
      forecast: {
        description: "7-day comparison of actual vs AI-forecast generation. MAPE = Mean Absolute % Error — lower is better. Target: < 5%.",
        stats: [
          { label: "7D Avg Actual", value: `${avg(vals7d)} MWh/d` },
          { label: "7D Peak Day", value: `${peak(vals7d)} MWh/d`, highlight: true },
          { label: "Forecast MAPE", value: `${mape.toFixed(1)}%`, highlight: mape < 5 },
          { label: "Forecast Model", value: "AI v3.1 (LSTM)" },
          { label: "Updated", value: "Daily at 00:00" },
        ],
        source: "Astrikos AI Forecasting Engine + SCADA",
        standard: "NERC BAL-001 — Forecast accuracy reporting",
        note: "MAPE < 5% = excellent. 5–10% = good. > 10% requires model review.",
      },
    };
  }, [site.id, site.name, site.generation, site.capacity, site.pr, site.availability, gen24, gen7d, avail30, irrad]);

  const ci = chartInfos();

  // ── Energy Yield calculations ───────────────────────────────────────────────
  const todayMWh = Math.round(site.generation * 7.5);
  const todayBudgetMWh = Math.round(site.capacity * (site.pr / 100) * 5.5);
  const todayPct = Math.min(120, Math.round((todayMWh / todayBudgetMWh) * 100));
  const mtdGWh = +((todayMWh * 22) / 1000).toFixed(1);
  const mtdBudgetGWh = +((todayBudgetMWh * 22) / 1000).toFixed(1);
  const mtdPct = Math.min(120, Math.round((mtdGWh / mtdBudgetGWh) * 100));
  const ytdGWh = Math.round((todayMWh * 220) / 1000);
  const ytdBudgetGWh = Math.round((todayBudgetMWh * 250) / 1000);
  const ytdPct = Math.min(120, Math.round((ytdGWh / ytdBudgetGWh) * 100));
  const specEnergy = +(todayMWh / site.capacity).toFixed(2); // MWh/MW = kWh/kWp

  // ── Loss Analysis ──────────────────────────────────────────────────────────
  const availLossMW = +(site.capacity * (1 - liveAvail / 100)).toFixed(1);
  const availMW = +((site.capacity * liveAvail) / 100).toFixed(1);
  const perfLossMW = +(availMW - liveGen).toFixed(1);
  const perfLossPct = +((perfLossMW / site.capacity) * 100).toFixed(1);
  const availLossPct = +((+availLossMW / site.capacity) * 100).toFixed(1);
  const revenuePerMW = site.revenueToday / (liveGen * 8); // $/MWh approx
  const perfLossRev = Math.round(perfLossMW * 8 * revenuePerMW);
  const availLossRev = Math.round(availLossMW * 8 * revenuePerMW);

  // ── Weather context ────────────────────────────────────────────────────────
  const curIrrad = (irrad as { irradiance?: number }[]).find((d) => (d as { irradiance?: number }).irradiance! > 0)?.irradiance ?? 0;
  const peakIrrad = Math.max(...(irrad as { irradiance?: number }[]).map((d) => d.irradiance ?? 0));
  const weatherImpactPct = site.weatherImpact === "None" ? 0 : site.weatherImpact === "Low" ? 8 : site.weatherImpact === "Medium" ? 22 : 45;
  const tempC = site.type === "Solar" ? 34 : site.type === "Wind" ? 18 : 22;
  const windMS = site.type === "Wind" ? 12.4 : 3.1;
  const cloudPct = site.weatherImpact === "None" ? 5 : site.weatherImpact === "Low" ? 20 : site.weatherImpact === "Medium" ? 55 : 80;

  // ── Operational status ─────────────────────────────────────────────────────
  const criticalAlarms = Math.ceil(site.alarms * 0.4);
  const majorAlarms = site.alarms - criticalAlarms;
  const commsOk = site.health > 85;
  const scadaOk = liveAvail > 95;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Energy Yield Summary ─────────────────────────────────────────── */}
      <div className="so-yield-banner">
        <div className="so-yield-header">
          <IcoZap width={12} height={12} />
          <span>Energy Yield</span>
          <span className="so-yield-se">
            Specific Energy: <strong>{specEnergy} kWh/kWp</strong>
          </span>
        </div>
        <div className="so-yield-cols">
          {[
            { label: "Today", actual: `${todayMWh} MWh`, budget: `${todayBudgetMWh} MWh`, pct: todayPct },
            { label: "This Month", actual: `${mtdGWh} GWh`, budget: `${mtdBudgetGWh} GWh`, pct: mtdPct },
            { label: "Year to Date", actual: `${ytdGWh} GWh`, budget: `${ytdBudgetGWh} GWh`, pct: ytdPct },
          ].map((y) => (
            <div key={y.label} className="so-yield-col">
              <div className="so-yield-col-label">{y.label}</div>
              <div className="so-yield-actual">{y.actual}</div>
              <div className="so-yield-budget">Target {y.budget}</div>
              <div className="so-yield-bar-row">
                <div className="so-yield-bar-bg">
                  <div
                    className={`so-yield-bar-fill${y.pct >= 100 ? " over" : y.pct >= 90 ? "" : " under"}`}
                    style={{ width: `${Math.min(100, y.pct)}%` }}
                  />
                </div>
                <span className={`so-yield-pct${y.pct >= 100 ? " over" : y.pct < 90 ? " under" : ""}`}>{y.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="kpi-grid">
        {kpis.map((k) => (
          <KpiCard
            key={k.label}
            label={k.label}
            value={k.value}
            unit={k.unit}
            icon={k.icon}
            rag={k.rag}
            trend={k.trend}
            trendDir={k.trendDir}
            onClick={() => setModal(getModalConfig(k.label))}
          />
        ))}
      </div>

      {/* ── Operational Status Strip ─────────────────────────────────────── */}
      <div className="so-status-strip">
        <div className="so-status-item">
          <span className={`so-status-dot ${scadaOk ? "success" : "warning"}`} />
          <span className="so-status-label">SCADA</span>
          <span className={`so-status-val ${scadaOk ? "ok" : "warn"}`}>{scadaOk ? "Online" : "Degraded"}</span>
        </div>
        <div className="so-status-sep" />
        <div className="so-status-item">
          <span className={`so-status-dot ${commsOk ? "success" : "warning"}`} />
          <span className="so-status-label">Communications</span>
          <span className={`so-status-val ${commsOk ? "ok" : "warn"}`}>{commsOk ? "All Links Up" : "1 Link Down"}</span>
        </div>
        <div className="so-status-sep" />
        <div className="so-status-item">
          <IcoAlertTriangle width={11} height={11} style={{ color: criticalAlarms > 0 ? "var(--ds-danger)" : "var(--ds-text-faint)" }} />
          <span className="so-status-label">Alarms</span>
          <span className="so-status-val">
            {criticalAlarms > 0 && <span style={{ color: "var(--ds-danger)", fontWeight: 700 }}>{criticalAlarms} Critical</span>}
            {majorAlarms > 0 && <span style={{ color: "var(--ds-warning)", marginLeft: criticalAlarms > 0 ? 6 : 0 }}>{majorAlarms} Major</span>}
            {site.alarms === 0 && <span style={{ color: "var(--ds-success)" }}>No Alarms</span>}
          </span>
        </div>
        <div className="so-status-sep" />
        <div className="so-status-item">
          <IcoWrench width={11} height={11} style={{ color: "var(--ds-text-faint)" }} />
          <span className="so-status-label">Work Orders</span>
          <span className="so-status-val">3 Open · 1 Overdue</span>
        </div>
        <div className="so-status-sep" />
        <div className="so-status-item">
          <IcoSun width={11} height={11} style={{ color: "#f59e0b" }} />
          <span className="so-status-label">Weather Impact</span>
          <span className={`so-status-val${site.weatherImpact !== "None" ? " warn" : " ok"}`}>
            {site.weatherImpact} {weatherImpactPct > 0 ? `(−${weatherImpactPct}%)` : "✓"}
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "var(--ds-text-faint)" }}>
          <span className="so-live-dot" />
          <span>LIVE · Last sync {clock}</span>
        </div>
      </div>

      {/* ── SLD: Asset Hierarchy + Diagram + Events ──────────────────────── */}
      <div className="sov-sld-wrap">
        {/* Header bar */}
        <div className="sov-sld-hdr">
          <span className="sov-sld-breadcrumb">
            Dashboard <span className="sov-crumb-sep">›</span> {site.name} <span className="sov-crumb-sep">›</span>{" "}
            <strong>Single Line Diagram</strong>
          </span>
          <div style={{ flex: 1 }} />
          {activeEvents.length > 0 && (
            <span className="sov-warn-badge">
              ⚠ {activeEvents.length} Warning{activeEvents.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className={`sov-status-chip chip ${rag(site.health, 85, 70)}`}>{site.status}</span>
          <span className="sov-live-chip">● LIVE</span>
        </div>

        <div className="sov-sld-body">
          {/* ── Left: Asset Hierarchy ── */}
          <div className="sov-hier-panel">
            <div className="sov-hier-title">ASSET HIERARCHY</div>
            <div className="sov-hier-search-wrap">
              <input className="sov-hier-search" placeholder="Search assets..." value={hierSearch} onChange={(e) => setHierSearch(e.target.value)} />
            </div>
            <div className="sov-hier-legend">
              <span>
                <span className="sov-dot" style={{ background: "#22c55e" }} />
                normal
              </span>
              <span>
                <span className="sov-dot" style={{ background: "#f59e0b" }} />
                warning
              </span>
              <span>
                <span className="sov-dot" style={{ background: "#ef4444" }} />
                alarm
              </span>
            </div>

            <div className="sov-hier-tree">
              {h ? (
                <>
                  {/* Site name */}
                  <div className="sov-tree-site">{site.name}</div>

                  {/* Blocks */}
                  {h.blocks.map((b) => {
                    const bWarn = b.inverters.some((i) => i.status !== "success");
                    const q = hierSearch.toLowerCase();
                    const filteredInv = q ? b.inverters.filter((i) => i.name.toLowerCase().includes(q)) : b.inverters;
                    if (q && filteredInv.length === 0) return null;
                    return (
                      <div key={b.id}>
                        <div className="sov-tree-block">
                          <span className="sov-dot" style={{ background: bWarn ? "#f59e0b" : "#22c55e" }} />
                          {b.name}
                        </div>
                        {filteredInv.map((inv) => {
                          const mw = ((inv.output * 0.01 * site.capacity) / totalInvCount).toFixed(1);
                          const dotColor = inv.status === "danger" ? "#ef4444" : inv.status === "warning" ? "#f59e0b" : "#22c55e";
                          return (
                            <div key={inv.id} className="sov-tree-inv">
                              <span className="sov-dot" style={{ background: dotColor }} />
                              <span className="sov-inv-name">{inv.name}</span>
                              <span className="sov-inv-mw">{mw} MW</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* MV Substation */}
                  {h.transformers.length > 0 && (
                    <>
                      <div className="sov-tree-section">MV SUBSTATION 33KV</div>
                      {h.transformers.map((tx) => {
                        const dotColor = tx.status === "warning" ? "#f59e0b" : "#22c55e";
                        const q = hierSearch.toLowerCase();
                        if (q && !tx.name.toLowerCase().includes(q)) return null;
                        return (
                          <div key={tx.id} className="sov-tree-inv">
                            <span className="sov-dot" style={{ background: dotColor }} />
                            <span className="sov-inv-name">{tx.name.replace("Transformer ", "Transformer ")}</span>
                            <span className="sov-inv-mw" style={{ color: tx.load > 85 ? "#f59e0b" : "var(--ds-text-faint)" }}>
                              {tx.load}% load
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Ancillary */}
                  <div className="sov-tree-section">ANCILLARY</div>
                  {h.weatherStation && (
                    <div className="sov-tree-inv">
                      <span className="sov-dot" style={{ background: "#22c55e" }} />
                      <span className="sov-inv-name">{h.weatherStation.name}</span>
                    </div>
                  )}
                  <div className="sov-tree-inv">
                    <span className="sov-dot" style={{ background: "#22c55e" }} />
                    <span className="sov-inv-name">{h.scada.name}</span>
                  </div>
                </>
              ) : (
                <div style={{ padding: "12px 14px", fontSize: 11, color: "var(--ds-text-faint)" }}>No hierarchy data</div>
              )}
            </div>
          </div>

          {/* ── Center: SLD Canvas ── */}
          <div className="sov-sld-center">
            <SLDCanvas siteId={site.id} site={site} onSelect={setSldSelection} />
          </div>

          {/* ── Right: Component Detail + Active Events ── */}
          <div className="sov-events-panel">
            {sldSelection ? (
              /* ── Component detail view ── */
              <div className="sov-detail">
                <div className="sov-detail-hdr">
                  <span className="sov-detail-type">{sldSelection.type}</span>
                  <button className="sov-detail-close" onClick={() => setSldSelection(null)}>
                    ✕
                  </button>
                </div>
                <div className="sov-detail-name">{sldSelection.name}</div>
                <div className={`sov-detail-status sov-status-${sldSelection.status}`}>
                  {sldSelection.status === "success" ? "● Normal" : sldSelection.status === "warning" ? "⚠ Warning" : "⚠ Alarm"}
                </div>
                <div className="sov-detail-stats">
                  {sldSelection.stats.map((s) => (
                    <div key={s.label} className="sov-detail-row">
                      <span className="sov-detail-label">{s.label}</span>
                      <span className="sov-detail-value" style={{ color: s.warn ? "var(--ds-warning)" : undefined }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Default: hint + active events ── */
              <>
                <div className="sov-events-hint">Click any component to view details</div>
                {activeEvents.length > 0 && (
                  <>
                    <div className="sov-events-title">ACTIVE EVENTS ({activeEvents.length})</div>
                    {activeEvents.map((ev) => (
                      <div key={ev.id} className="sov-event-row">
                        <span className="sov-event-ico" style={{ color: ev.kind === "danger" ? "#ef4444" : "#f59e0b" }}>
                          ⚡
                        </span>
                        <div>
                          <div className="sov-event-name">{ev.name}</div>
                          <div className="sov-event-msg">{ev.msg}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── AI Insights + Weather (below SLD) ────────────────────────────── */}
      <div className="sov-ai-row">
        {/* Weather Intelligence */}
        <div className="so-weather-panel">
          <div className="so-weather-header">
            <IcoSun width={11} height={11} style={{ color: "#f59e0b" }} />
            <span>Weather Intelligence</span>
            <span className="chip info" style={{ fontSize: 8, marginLeft: "auto" }}>
              {site.state}
            </span>
          </div>
          <div className="so-weather-grid">
            <div className="so-weather-cell">
              <IcoSun width={14} height={14} style={{ color: "#f59e0b" }} />
              <div>
                <div className="so-wx-val">
                  {peakIrrad > 0 ? peakIrrad : 854} <span className="so-wx-unit">W/m²</span>
                </div>
                <div className="so-wx-label">Peak Irradiance</div>
              </div>
            </div>
            <div className="so-weather-cell">
              <IcoThermometer width={14} height={14} style={{ color: "#ef4444" }} />
              <div>
                <div className="so-wx-val">
                  {tempC}°<span className="so-wx-unit">C</span>
                </div>
                <div className="so-wx-label">Ambient Temp</div>
              </div>
            </div>
            <div className="so-weather-cell">
              <IcoWind width={14} height={14} style={{ color: "#38bdf8" }} />
              <div>
                <div className="so-wx-val">
                  {windMS} <span className="so-wx-unit">m/s</span>
                </div>
                <div className="so-wx-label">Wind Speed</div>
              </div>
            </div>
            <div className="so-weather-cell">
              <IcoCloud width={14} height={14} style={{ color: "#b0bec5" }} />
              <div>
                <div className="so-wx-val">
                  {cloudPct}
                  <span className="so-wx-unit">%</span>
                </div>
                <div className="so-wx-label">Cloud Cover</div>
              </div>
            </div>
          </div>
          {weatherImpactPct > 0 && (
            <div className="so-wx-impact">
              <IcoAlertTriangle width={10} height={10} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>Weather reducing output by ~{weatherImpactPct}% today</span>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="ai-panel" style={{ flex: 1 }}>
          <div className="ai-panel-header">
            <span className="ai-panel-title">
              <IcoSparkle width={11} height={11} /> AI Insights — {site.name}
            </span>
            <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Refresh">
              <IcoRefresh width={11} height={11} />
            </button>
          </div>
          <div className="ai-panel-body" style={{ gap: 6 }}>
            {siteFindings.length === 0 ? (
              <div style={{ padding: 12, fontSize: 12, color: "var(--ds-text-faint)", textAlign: "center" }}>No AI findings for this site</div>
            ) : (
              siteFindings.map((f, i) => (
                <div key={i} className={`ai-finding-card modal-${f.priority} ai-finding-clickable`} onClick={() => setAiFinding(f)}>
                  <div className="ai-finding-metric">{f.metric}</div>
                  <div className="ai-finding-row">
                    <span className="ai-finding-label">Root Cause</span>
                    <span className="ai-finding-value">{f.rootCause}</span>
                  </div>
                  <div className="ai-finding-row">
                    <span className="ai-finding-label">Impact</span>
                    <span className="ai-finding-value">{f.loss}</span>
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      padding: "3px 7px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 5,
                      fontSize: 10,
                      color: "#e9d5ff",
                    }}
                  >
                    {f.action}
                  </div>
                  <div className="ai-finding-drill-hint">Click to view AI analysis →</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Site Environment Map ─────────────────────────────────────────── */}
      <div className="chart-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="chart-card-header" style={{ padding: "8px 14px" }}>
          <span className="chart-card-title">Site Environment — Geographic Location</span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ds-text-faint)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
            {site.lat.toFixed(5)}° N &nbsp;·&nbsp; {site.lng.toFixed(5)}° E
          </span>
          <span className="chip info" style={{ fontSize: 9 }}>
            {site.state}, {site.country}
          </span>
          <span
            className={`chip ${site.status === "Critical" ? "danger" : site.status === "Warning" ? "warning" : "success"}`}
            style={{ fontSize: 9 }}
          >
            {site.status}
          </span>
        </div>
        <MapContainer center={[site.lat, site.lng]} zoom={10} style={{ height: 240, width: "100%" }} scrollWheelZoom={false} zoomControl>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />
          <Marker
            position={[site.lat, site.lng]}
            icon={L.divIcon({
              className: "",
              html: `<div style="width:18px;height:18px;background:${_SOV_TYPE_CLR[site.type] ?? "#f59e0b"};border-radius:50%;border:2.5px solid rgba(255,255,255,0.88);box-shadow:0 0 12px ${_SOV_TYPE_CLR[site.type] ?? "#f59e0b"}99,0 2px 8px rgba(0,0,0,0.55)"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
              popupAnchor: [0, -14],
            })}
          >
            <Popup maxWidth={220} className="enhanced-popup">
              <div style={{ fontFamily: "Inter, sans-serif", padding: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{site.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>
                  {site.type} · {site.capacity} MW capacity
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                  {site.state}, {site.country} · COD {site.codYear}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#64748b", letterSpacing: "0.04em" }}>
                  {site.lat.toFixed(6)}°N &nbsp; {site.lng.toFixed(6)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
        <div
          style={{
            padding: "6px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            gap: 20,
            fontSize: 10,
            color: "var(--ds-text-faint)",
          }}
        >
          <span>
            Type: <strong style={{ color: _SOV_TYPE_CLR[site.type] }}>{site.type}</strong>
          </span>
          <span>
            Capacity: <strong style={{ color: "var(--ds-text)" }}>{site.capacity} MW</strong>
          </span>
          <span>
            COD: <strong style={{ color: "var(--ds-text)" }}>{site.codYear}</strong>
          </span>
          <span style={{ marginLeft: "auto" }}>
            Coordinates:{" "}
            <strong style={{ color: "var(--ds-text)", fontFamily: "monospace" }}>
              {site.lat.toFixed(4)}°N, {site.lng.toFixed(4)}°E
            </strong>
          </span>
        </div>
      </div>

      {/* Charts — below the digital twin */}
      <div className="chart-grid-2" style={{ gap: 10 }}>
        <ChartCard title="Generation Trend" timeframeOptions={["24H", "7D"]} timeframe={genTf} onTimeframeChange={setGenTf} info={ci.generation}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={genData}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual" />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={CHART_COLORS.violet}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Irradiance vs Generation" timeframeOptions={["24H"]} timeframe="24H" onTimeframeChange={() => {}} info={ci.irradiance}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={irrad}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis yAxisId="gen" {...axisProps} />
              <YAxis yAxisId="irr" orientation="right" {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Line yAxisId="gen" type="monotone" dataKey="generation" stroke={CHART_COLORS.amber} strokeWidth={2} dot={false} name="Gen MW" />
              <Line
                yAxisId="irr"
                type="monotone"
                dataKey="irradiance"
                stroke={CHART_COLORS.sky}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name="Irrad W/m²"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Availability Trend (30D)" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}} info={ci.availability}>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={availData}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis domain={[90, 100]} {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.teal}
                fill={CHART_COLORS.teal}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={false}
                name="Availability %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Forecast vs Actual (7D)" timeframeOptions={["7D"]} timeframe="7D" onTimeframeChange={() => {}} info={ci.forecast}>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={gen7d}>
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...chartTooltipProps} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
              <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual" />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={CHART_COLORS.violet}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                name="Forecast"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Energy Loss Analysis ─────────────────────────────────────────── */}
      <div className="so-loss-panel">
        <div className="so-loss-header">
          <IcoZap width={12} height={12} />
          <span>Energy Loss Analysis — {site.name}</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--ds-text-faint)" }}>Rated capacity basis</span>
        </div>
        <div className="so-loss-flow">
          {/* Rated DC */}
          <div className="so-loss-node rated">
            <div className="so-loss-node-val">{site.capacity} MW</div>
            <div className="so-loss-node-label">Installed Capacity</div>
          </div>

          {/* Availability Loss */}
          <div className="so-loss-segment">
            <div className="so-loss-arrow" />
            <div className="so-loss-loss avail">
              <div className="so-loss-loss-val">−{availLossMW} MW</div>
              <div className="so-loss-loss-label">Availability Loss</div>
              <div className="so-loss-loss-sub">
                {availLossPct}% · ${availLossRev.toLocaleString()}/day
              </div>
            </div>
          </div>

          {/* Available AC */}
          <div className="so-loss-node avail">
            <div className="so-loss-node-val">{availMW} MW</div>
            <div className="so-loss-node-label">Available AC</div>
            <div className="so-loss-node-pct">{liveAvail}% avail.</div>
          </div>

          {/* Performance Loss */}
          <div className="so-loss-segment">
            <div className="so-loss-arrow" />
            <div className="so-loss-loss perf">
              <div className="so-loss-loss-val">−{perfLossMW} MW</div>
              <div className="so-loss-loss-label">Performance Loss</div>
              <div className="so-loss-loss-sub">
                {perfLossPct}% · ${perfLossRev.toLocaleString()}/day
              </div>
            </div>
          </div>

          {/* Net Generation */}
          <div className="so-loss-node net">
            <div className="so-loss-node-val">{liveGen} MW</div>
            <div className="so-loss-node-label">Net Generation</div>
            <div className="so-loss-node-pct">PR {livePR}%</div>
          </div>

          {/* Grid Export */}
          <div className="so-loss-segment">
            <div className="so-loss-arrow green" />
          </div>
          <div className="so-loss-node export">
            <div className="so-loss-node-val">${(site.revenueToday / 1000).toFixed(1)}K</div>
            <div className="so-loss-node-label">Revenue Today</div>
            <div className="so-loss-node-pct">Grid Export</div>
          </div>
        </div>

        {/* Loss summary bar */}
        <div className="so-loss-bar-section">
          <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 5 }}>Generation vs Capacity breakdown</div>
          <div className="so-loss-bar-track">
            <div className="so-loss-bar-seg net" style={{ width: `${(liveGen / site.capacity) * 100}%` }} title={`Net Generation ${liveGen} MW`} />
            <div className="so-loss-bar-seg perf" style={{ width: `${perfLossPct}%` }} title={`Performance Loss ${perfLossMW} MW`} />
            <div className="so-loss-bar-seg avail" style={{ width: `${availLossPct}%` }} title={`Availability Loss ${availLossMW} MW`} />
          </div>
          <div className="so-loss-legend">
            <span>
              <span className="so-loss-dot net" />
              Net Generation ({liveGen} MW)
            </span>
            <span>
              <span className="so-loss-dot perf" />
              Performance Loss ({perfLossMW} MW)
            </span>
            <span>
              <span className="so-loss-dot avail" />
              Availability Loss ({availLossMW} MW)
            </span>
          </div>
        </div>
      </div>

      <KpiDrilldownModal config={modal} onClose={() => setModal(null)} />
      <AIFindingDrilldownModal finding={aiFinding} onClose={() => setAiFinding(null)} />
    </div>
  );
}
