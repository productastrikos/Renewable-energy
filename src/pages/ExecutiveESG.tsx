import { useState, useMemo, useCallback } from "react";
import { ChartCard } from "../components/shared/ChartCard";
import { FilterBar, FilterGroup } from "../components/shared/FilterBar";
import { KpiDrilldownModal, KpiModalConfig } from "../components/shared/KpiDrilldownModal";
import { ProgressBar } from "../components/shared/ProgressBar";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../utils/chartHelpers";
import { generate30d, generate7d, rag } from "../utils/ragHelpers";
import { IcoDollar, IcoActivity, IcoCpu, IcoLeaf, IcoWrench, IcoZap, IcoSparkle, IcoAlertTriangle, IcoCheckCircle } from "../components/shared/Icons";
import { SITES } from "../data/mockData";
import { fetchSites } from "../api/endpoints";
import { useApi } from "../hooks/useApi";

// ─── Static data ──────────────────────────────────────────────────────────────
const carbon30 = generate30d(1200).map((d, i) => ({ day: d.day, offset: d.value, target: 1100 + i * 5 }));
const PERIOD_MULT: Record<string, number> = { MTD: 1, QTD: 3, YTD: 6 };
const TECH_FRAC: Record<string, number> = { All: 1, Solar: 0.52, Wind: 0.3, BESS: 0.1, Hydro: 0.08 };
const REGION_FRAC: Record<string, number> = { All: 1, UAE: 0.45, "Saudi Arabia": 0.35, Oman: 0.2 };

const FILTER_GROUPS: FilterGroup[] = [
  { label: "Period",     key: "period", options: ["MTD", "QTD", "YTD"] },
  { label: "Technology", key: "tech",   options: ["All", "Solar", "Wind", "BESS", "Hydro"] },
  { label: "Region",     key: "region", options: ["All", "UAE", "Saudi Arabia", "Oman"] },
];

const RISK_SITES = [
  { site: "Al Dhafra Solar", financial: "low", operational: "medium", weather: "high", grid: "low", cyber: "low", esg: "low" },
  { site: "MBR Solar Park", financial: "low", operational: "low", weather: "medium", grid: "low", cyber: "medium", esg: "low" },
  { site: "NEOM Wind Farm", financial: "medium", operational: "medium", weather: "medium", grid: "high", cyber: "low", esg: "low" },
  { site: "Jubail BESS", financial: "high", operational: "high", weather: "low", grid: "medium", cyber: "medium", esg: "medium" },
  { site: "Duqm Renewable", financial: "low", operational: "low", weather: "low", grid: "low", cyber: "low", esg: "low" },
  { site: "Ibri Solar", financial: "low", operational: "medium", weather: "medium", grid: "medium", cyber: "low", esg: "low" },
];

const INVESTMENTS = [
  { name: "New Solar Expansion — Phase 3", type: "Solar", irr: 16.4, payback: 4.8, npv: 12.1, status: "recommended", confidence: 92 },
  { name: "Battery Storage Expansion", type: "BESS", irr: 14.1, payback: 3.2, npv: 8.1, status: "under-review", confidence: 78 },
  { name: "Wind Farm Repowering", type: "Wind", irr: 15.8, payback: 5.1, npv: 9.4, status: "recommended", confidence: 85 },
  { name: "Hydro Capacity Upgrade", type: "Hydro", irr: 11.2, payback: 7.4, npv: 5.2, status: "feasibility", confidence: 62 },
];

const BENCHMARKS = [
  { metric: "Availability",      portfolio: 98.2, industry: 96.5, target: 97.0, unit: "%",          note: "vs GCC Solar avg" },
  { metric: "Performance Ratio", portfolio: 84.1, industry: 80.0, target: 82.0, unit: "%",          note: "vs MENA benchmark" },
  { metric: "OPEX/MWh",          portfolio: 8.2,  industry: 11.4, target: 10.0, unit: "$/MWh",     note: "vs GCC peers", lowerBetter: true },
  { metric: "MTTR",              portfolio: 3.2,  industry: 5.8,  target: 4.5,  unit: "hrs",        note: "vs regional avg",  lowerBetter: true },
  { metric: "Carbon Intensity",  portfolio: 42,   industry: 58,   target: 50,   unit: "gCO₂/MWh",  note: "vs GCC grid mix",  lowerBetter: true },
  { metric: "Fleet Health",      portfolio: 97,   industry: 88,   target: 90,   unit: "/100",       note: "vs IRENA target" },
];

const ESG_METRICS = [
  { label: "Carbon Avoided", value: "1.8M", unit: "tCO₂", target: "2.0M", pct: 90, status: "success" },
  { label: "Renewable Generation", value: "8.2", unit: "TWh", target: "9.0 TWh", pct: 91, status: "success" },
  { label: "Water Saved", value: "12M", unit: "m³", target: "14M m³", pct: 86, status: "success" },
  { label: "ESG Score", value: "92", unit: "/100", target: "90/100", pct: 92, status: "success" },
  { label: "Land Efficiency", value: "4.2", unit: "MW/km²", target: "4.0", pct: 105, status: "success" },
  { label: "Community Projects", value: "14", unit: "active", target: "12", pct: 116, status: "success" },
];

const RISK_COLOR: Record<string, string> = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
const RISK_BG: Record<string, string> = { low: "#22c55e18", medium: "#f59e0b18", high: "#ef444418" };

const INV_STATUS_COLOR: Record<string, string> = {
  recommended: "#22c55e",
  "under-review": "#f59e0b",
  feasibility: "#38bdf8",
};

// ─── Scenario data ────────────────────────────────────────────────────────────
function calcScenario(priceChange: number, batteryChange: number, offlineRisk: number) {
  const priceImpact = 11.2 * (priceChange / 100);
  const batteryImpact = 0.42 * (batteryChange / 100) * 2;
  const offlineImpact = -(offlineRisk / 100) * 4.2;
  const revenueImpact = +(priceImpact + batteryImpact + offlineImpact).toFixed(2);
  const ebitdaImpact = +(revenueImpact * 0.65).toFixed(2);
  const carbonImpact = +((offlineRisk / 100) * -12 + (batteryChange / 100) * 2).toFixed(1);
  const roiImpact = +((revenueImpact / 284) * 100).toFixed(2);
  return { revenueImpact, ebitdaImpact, carbonImpact, roiImpact };
}

// ─── Report modal ─────────────────────────────────────────────────────────────
function BoardReportModal({ onClose, kpis }: { onClose: () => void; kpis: Record<string, number> }) {
  const [generating, setGenerating] = useState(true);
  const [done, setDone] = useState(false);

  useState(() => {
    const t1 = setTimeout(() => setGenerating(false), 1600);
    const t2 = setTimeout(() => setDone(true), 1601);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-frame" style={{ maxWidth: 620, maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 2 }}>AI Generated · Jun 2026</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Board Intelligence Report</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {generating ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ds-text-faint)" }}>
            <div className="aaa-spinner-wrap" style={{ margin: "0 auto 16px" }}>
              <svg className="aaa-spinner-ring" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="34" stroke="rgba(139,92,246,0.15)" strokeWidth="4" />
                <circle cx="40" cy="40" r="34" stroke="#a78bfa" strokeWidth="4" strokeDasharray="60 154" strokeLinecap="round" />
              </svg>
              <div className="aaa-spinner-brain" style={{ fontSize: 24 }}>
                ✦
              </div>
            </div>
            <div style={{ fontSize: 14, color: "var(--ds-text)" }}>Generating board report...</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>Compiling financials, risks, ESG, and recommendations</div>
          </div>
        ) : (
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                title: "Executive Summary",
                content: `Portfolio performance for Jun 2026 is strong. Revenue of $${kpis.revenue}M is $${(kpis.revenue * 0.04).toFixed(1)}M above plan. EBITDA margin stands at ${((kpis.ebitda / kpis.revenue) * 100).toFixed(1)}%, exceeding the target of 28%. Fleet availability of ${kpis.avail}% is the highest in portfolio history.`,
              },
              {
                title: "Financial Performance",
                content: `Revenue: $${kpis.revenue}M (+4% vs plan). OPEX: $${kpis.opex}M (−3% vs budget). EBITDA: $${kpis.ebitda}M. CAPEX: $${kpis.capex}M (on plan). Battery dispatch optimisation contributed +$420K in arbitrage revenue this period.`,
              },
              {
                title: "Operational Risks",
                content:
                  "3 critical risks identified. Jubail BESS site shows elevated financial and operational risk requiring board attention. GCC grid code compliance deadline approaching for Saudi Arabia assets — action required. NEOM Wind Farm experiencing weather-related generation variability.",
              },
              {
                title: "ESG Summary",
                content: `Carbon avoided: 1.8M tCO₂ (90% of annual target). Renewable generation: 8.2 TWh. ESG score 92/100, exceeding the 90/100 target. 14 active community projects across all regions. Land efficiency at 4.2 MW/km² exceeds industry benchmark.`,
              },
              {
                title: "Investment Recommendations",
                content:
                  "Board approval requested for: (1) New Solar Expansion Phase 3 — IRR 16.4%, NPV $12.1M; (2) Battery Storage Expansion — IRR 14.1%, Payback 3.2 years; (3) Wind Farm Repowering — IRR 15.8%, NPV $9.4M. Total investment requirement: $240M over 36 months.",
              },
              {
                title: "Strategic Outlook",
                content:
                  "Portfolio is well-positioned for Q3 2026. Revenue forecast $12.1M (+8% vs current month). Technology diversification through planned BESS expansion will improve revenue resilience. Grid ancillary service revenue expected to increase 22% following SEC approval in Saudi Arabia and DEWA framework update in UAE.",
              },
            ].map((s, i) => (
              <div key={i} style={{ borderLeft: "3px solid rgba(139,92,246,0.4)", paddingLeft: 12 }}>
                <div
                  style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}
                >
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--ds-text-muted)", lineHeight: 1.7 }}>{s.content}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn-primary" style={{ flex: 1, height: 34, fontSize: 12 }}>
                Export PDF
              </button>
              <button className="btn-control" style={{ flex: 1, height: 34, fontSize: 12 }}>
                Export PPT
              </button>
              <button className="btn-control" style={{ flex: 1, height: 34, fontSize: 12 }}>
                Send to Board
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExecutiveESG() {
  const { data: apiSites } = useApi(() => fetchSites(), []);
  const sites = apiSites ?? SITES;

  const [filters, setFilters] = useState<Record<string, string>>({ period: "MTD", tech: "All", region: "All" });
  const [activeModal, setActiveModal] = useState<KpiModalConfig | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [priceChange, setPriceChange] = useState(0);
  const [batteryChange, setBatteryChange] = useState(0);
  const [offlineRisk, setOfflineRisk] = useState(0);

  const handleFilterChange = useCallback((key: string, val: string) => setFilters((p) => ({ ...p, [key]: val })), []);
  const pf = useMemo(() => (PERIOD_MULT[filters.period] ?? 1) * (TECH_FRAC[filters.tech] ?? 1) * (REGION_FRAC[filters.region] ?? 1), [filters]);

  const kpis = useMemo(
    () => ({
      ebitda: +(8.4 * pf).toFixed(1),
      revenue: +(11.2 * pf).toFixed(1),
      opex: +(2.8 * pf).toFixed(1),
      capex: +(1.2 * (PERIOD_MULT[filters.period] ?? 1)).toFixed(1),
      carbon: Math.round(41 * pf),
      avail: +(98.2 * Math.min(1, (REGION_FRAC[filters.region] ?? 1) + 0.02)).toFixed(1),
      health: Math.round(97 * (TECH_FRAC[filters.tech] + 0.1)),
      roi: +(14.8 * (TECH_FRAC[filters.tech] ?? 1)).toFixed(1),
      margin: +(31.4 * (TECH_FRAC[filters.tech] ?? 1)).toFixed(1),
      budgetVar: +(4.2 * (TECH_FRAC[filters.tech] ?? 1)).toFixed(1),
    }),
    [pf, filters],
  );

  const scenario = useMemo(() => calcScenario(priceChange, batteryChange, offlineRisk), [priceChange, batteryChange, offlineRisk]);

  // ── Dynamic briefing content ─────────────────────────────────────────────
  const briefing = useMemo(() => {
    const { period, tech, region } = filters;
    const periodLabel = period === "MTD" ? "month-to-date" : period === "QTD" ? "quarter-to-date" : "year-to-date";
    const periodShort = period === "MTD" ? "this month" : period === "QTD" ? "this quarter" : "this year";

    // ── Highlights ──────────────────────────────────────────────────────────
    const highlights: string[] = [];

    // Revenue highlight — always present, varies by period + tech + region
    if (tech === "All" || tech === "Solar") {
      highlights.push(`Revenue ${periodLabel} of $${kpis.revenue}M is $${kpis.budgetVar}M above plan — ${tech === "Solar" ? "Solar PR averaging 84.1%, above industry benchmark" : "wind portfolio outperforming by 8%"}`);
    } else if (tech === "Wind") {
      highlights.push(`Wind portfolio revenue $${kpis.revenue}M — capacity factor 38.2%, up 5pp vs ${periodShort} last year`);
    } else if (tech === "BESS") {
      highlights.push(`BESS revenue $${kpis.revenue}M — arbitrage strategy outperforming by $${kpis.budgetVar}M vs plan through AI dispatch`);
    } else if (tech === "Hydro") {
      highlights.push(`Hydro revenue $${kpis.revenue}M — inflow above seasonal average by 12%, generation ${periodLabel} +9% vs forecast`);
    }

    // Availability highlight
    highlights.push(`Fleet availability ${kpis.avail}% ${periodShort} — ${region !== "All" ? `${region} region ` : ""}${period === "YTD" ? "best annual result in 5 years" : "highest result this year, +1.7pp vs prior month"}`);

    // Tech-specific 3rd highlight
    if (tech === "BESS" || tech === "All") {
      highlights.push(`Battery dispatch optimisation saved $${Math.round(420 * (TECH_FRAC[tech] ?? 1))}K in arbitrage revenue ${periodShort}`);
    } else if (tech === "Solar") {
      highlights.push(`Soiling management programme prevented $${Math.round(280 * (PERIOD_MULT[period] ?? 1))}K in PR losses ${periodShort} — 14 cleaning events completed`);
    } else if (tech === "Wind") {
      highlights.push(`Predictive maintenance avoided 3 unplanned turbine trips ${periodShort}, saving est. $${Math.round(190 * (PERIOD_MULT[period] ?? 1))}K in lost generation`);
    } else if (tech === "Hydro") {
      highlights.push(`Reservoir management optimisation increased head by 2.1m, contributing +${Math.round(8 * (PERIOD_MULT[period] ?? 1))} GWh additional generation ${periodShort}`);
    }

    // Region-specific 4th highlight
    if (region === "Saudi Arabia") {
      highlights.push(`Saudi Arabia portfolio EBITDA margin 33.8% — NEOM Wind PPA premium contributing +$${Math.round(1.4 * (PERIOD_MULT[period] ?? 1))}M above base tariff ${periodShort}`);
    } else if (region === "UAE") {
      highlights.push(`UAE region leading portfolio: Al Dhafra averaging 854 W/m² peak irradiance — generation ${Math.round(6 * (PERIOD_MULT[period] ?? 1))}% above P50 forecast ${periodShort}`);
    } else if (region === "Oman") {
      highlights.push(`Oman sites benefiting from Duqm SEZ incentives — OPEX savings $${Math.round(0.8 * (PERIOD_MULT[period] ?? 1))}M ${periodShort} vs non-SEZ benchmark`);
    } else {
      highlights.push(`ESG score 92/100 — carbon avoidance ${period === "YTD" ? "1.8M tCO₂, on track for GCC annual 2.0M target" : "on track at 90% of " + periodLabel + " GCC target"}`);
    }

    // ── Risks ───────────────────────────────────────────────────────────────
    const risks: string[] = [];

    if (tech === "All" || tech === "BESS") {
      risks.push(`Jubail BESS: ${period === "YTD" ? "degradation rate 0.8%/yr ahead of expected — replacement planning required" : `financial & operational risk elevated — transformer inspection overdue (${period === "QTD" ? "60+" : "14+"} days)`}`);
    }
    if (tech === "All" || tech === "Wind") {
      risks.push(`NEOM Wind Farm: grid congestion risk ${region === "All" || region === "USA" ? "HIGH" : "MEDIUM"} — potential curtailment impact $${Math.round(180 * (PERIOD_MULT[period] ?? 1))}K ${periodShort}`);
    }
    if (region === "Saudi Arabia" || region === "All") {
      risks.push(`NEOM Wind Farm (Saudi Arabia): ${period === "YTD" ? "GCAM grid interconnection capacity risk — early engagement with SEC required for 2027 expansion" : "GCC grid code compliance update deadline in 45 days — action required"}`);
    } else if (region === "UAE") {
      risks.push(`UAE region: DEWA interconnection review pending — Al Dhafra Phase 4 PPA extension approval delayed, revenue risk $${Math.round(2.4 * (PERIOD_MULT[period] ?? 1))}M`);
    } else if (region === "Oman") {
      risks.push(`Oman region: OETC transmission tariff revision effective Q3 — potential grid access cost increase of $${Math.round(1.8 * (PERIOD_MULT[period] ?? 1))}M annually`);
    }
    if (tech === "Solar" || tech === "All") {
      if (risks.length < 3) risks.push(`${tech === "Solar" ? "MBR Solar Park" : "Al Dhafra Solar"}: soiling index 4.2% on Block C — PR loss est. $${Math.round(12 * (PERIOD_MULT[period] ?? 1))}K ${periodShort}, cleaning overdue`);
    }
    if (tech === "Hydro" && risks.length < 3) {
      risks.push(`Hydro reservoir level trending 8% below seasonal norm — inflow forecast downside risk for ${period === "YTD" ? "Q4" : "next 30 days"}, generation at risk`);
    }

    // ── Actions ─────────────────────────────────────────────────────────────
    const actions: string[] = [];

    if (tech === "All" || tech === "BESS") {
      actions.push(`Schedule transformer inspection at Jubail BESS ${period === "YTD" ? "and initiate degradation-based replacement planning" : "— estimated payback < 6 months"}`);
    }
    if (tech === "All" || tech === "Wind") {
      actions.push(`Increase battery FCR participation to offset curtailment revenue loss at NEOM Wind Farm`);
    }
    if (region === "Saudi Arabia" || region === "All") {
      actions.push(`Initiate ${period === "YTD" ? "SEC interconnection capacity pre-booking for 2027 expansion at NEOM" : "GCC grid code compliance review and submit SEC documentation before deadline"}`);
    } else if (region === "UAE") {
      actions.push(`Engage DEWA to expedite Al Dhafra PPA extension approval — escalate to VP Commercial before month-end`);
    } else if (region === "Oman") {
      actions.push(`Engage OETC on transmission tariff revision — model financial impact and prepare board submission for mitigation strategy`);
    }
    if (actions.length < 3) {
      if (tech === "Solar" || tech === "All") {
        actions.push(`Deploy drone inspection and dry cleaning for Block C strings at MBR Solar to recover ${Math.round(1.2 * (PERIOD_MULT[period] ?? 1))}% PR loss`);
      } else if (tech === "Hydro") {
        actions.push(`Activate reservoir demand-response protocol — reduce turbine output by 8% for 14 days to build storage buffer`);
      } else {
        actions.push(`Review ${period === "YTD" ? "annual" : periodShort} CAPEX allocation — ${period === "YTD" ? "$1.8M unspent budget can be redeployed to high-ROI maintenance" : "2 capex items at risk of underspend vs plan"}`);
      }
    }

    const isHealthy = risks.filter(r => r.toLowerCase().includes("high") || r.toLowerCase().includes("overdue")).length < 2;

    return { highlights: highlights.slice(0, 4), risks: risks.slice(0, 3), actions: actions.slice(0, 3), isHealthy };
  }, [filters, kpis]);

  const forecastData = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        day: `Day ${i + 1}`,
        revenue: +(kpis.revenue + i * 0.04 + (Math.random() - 0.5) * 0.3).toFixed(2),
        generation: +(8.2 + i * 0.02 + (Math.random() - 0.5) * 0.15).toFixed(2),
        availability: +(98.2 + (Math.random() - 0.5) * 0.8).toFixed(1),
        carbon: Math.round(kpis.carbon + i * 1.2 + (Math.random() - 0.5) * 5),
      })),
    [kpis],
  );

  const d30 = useMemo(
    () => generate30d(1000).map((d) => ({ time: String(d.day), v: +(d.value * TECH_FRAC[filters.tech] * REGION_FRAC[filters.region]).toFixed(1) })),
    [filters],
  );

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = new Date().getMonth(); // 0-indexed, June = 5
      // MTD/YTD: show all months up to today; QTD: show only current quarter's months
      const qStart = Math.floor(currentMonth / 3) * 3;
      const monthsToShow = filters.period === "QTD"
        ? ALL_MONTHS.slice(qStart, currentMonth + 1)
        : ALL_MONTHS.slice(0, currentMonth + 1);
      const monthly = monthsToShow.map((m) => ({
        time: m,
        v: +(800 * (TECH_FRAC[filters.tech] ?? 1) * (REGION_FRAC[filters.region] ?? 1) * (0.85 + Math.random() * 0.3)).toFixed(0),
      }));
      const configs: Record<string, KpiModalConfig> = {
        "Revenue": {
          label: "Revenue",
          value: `$${kpis.revenue}M`,
          rag: rag(kpis.revenue, 8, 5),
          description: "Total revenue from energy sales and ancillary services.",
          timeframeOptions: ["30D"],
          chartType: "bar",
          chartData: { "30D": monthly.map((d) => ({ time: d.time, revenue: +(d.v * 0.0112).toFixed(2) })) },
          series: [{ key: "revenue", name: "Revenue ($M)", color: CHART_COLORS.blue }],
          xKey: "time",
          contextCards: [
            {
              title: "vs Plan",
              type: "success",
              rows: [
                { label: "Plan", value: `$${(kpis.revenue * 0.96).toFixed(1)}M` },
                { label: "Variance", value: `+$${(kpis.revenue * 0.04).toFixed(1)}M` },
              ],
            },
          ],
        },
        "EBITDA": {
          label: "EBITDA",
          value: `$${kpis.ebitda}M`,
          rag: rag(kpis.ebitda, 5, 3),
          description: "Earnings before interest, tax, depreciation and amortisation.",
          timeframeOptions: ["30D"],
          chartType: "bar",
          chartData: { "30D": monthly.map((d) => ({ time: d.time, ebitda: +(d.v * 0.0084).toFixed(2) })) },
          series: [{ key: "ebitda", name: "EBITDA ($M)", color: CHART_COLORS.success }],
          xKey: "time",
          contextCards: [
            {
              title: "EBITDA Margin",
              type: "success",
              rows: [
                { label: "Margin", value: `${kpis.margin}%` },
                { label: "Target", value: "28%" },
              ],
            },
          ],
        },
        "Availability": {
          label: "Availability",
          value: kpis.avail,
          unit: "%",
          rag: rag(kpis.avail, 97, 92),
          description: "Fleet-level technical availability.",
          timeframeOptions: ["30D"],
          chartType: "line",
          chartData: { "30D": d30.map((d) => ({ time: d.time, avail: +(kpis.avail * (0.96 + Math.random() * 0.05)).toFixed(1) })) },
          series: [{ key: "avail", name: "Availability %", color: CHART_COLORS.teal }],
          xKey: "time",
          contextCards: [
            {
              title: "vs Target",
              type: "success",
              rows: [
                { label: "Target", value: "97.0%" },
                { label: "Margin", value: `+${(kpis.avail - 97).toFixed(1)}%` },
              ],
            },
          ],
        },
      };
      return configs[label] ?? configs["Revenue"];
    },
    [kpis, d30, filters],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 32 }}>
      <FilterBar groups={FILTER_GROUPS} active={filters} onChange={handleFilterChange} />

      {/* ── Section 1: Executive Situation Room ─────────────────────────── */}
      <div>
        <div className="exec-section-label">Executive Situation Room</div>
        <div className="exec-situation-grid">
          {/* Financial Health */}
          <div className="exec-card">
            <div className="exec-card-hdr">
              <IcoDollar width={13} height={13} style={{ color: CHART_COLORS.amber }} />
              <span className="exec-card-title">Financial Health</span>
              <span className={`chip ${rag(kpis.revenue, 8, 5)}`} style={{ fontSize: 9, marginLeft: "auto" }}>
                {rag(kpis.revenue, 8, 5).toUpperCase()}
              </span>
            </div>
            <div className="exec-card-metrics">
              {[
                { label: "Revenue YTD", value: `$${(kpis.revenue * 12.8).toFixed(0)}M`, delta: "+$4.2M", up: true },
                { label: "Budget Variance", value: `+$${kpis.budgetVar}M`, delta: "vs plan", up: true },
                { label: "EBITDA Margin", value: `${kpis.margin}%`, delta: "+2.1pp", up: true },
                { label: "Portfolio ROI", value: `${kpis.roi}%`, delta: "+1.4pp", up: true },
              ].map((m) => (
                <div
                  key={m.label}
                  className="exec-metric"
                  onClick={() =>
                    setActiveModal(getModalConfig(m.label.includes("Revenue") ? "Revenue" : m.label.includes("EBITDA") ? "EBITDA" : "Revenue"))
                  }
                >
                  <span className="exec-metric-label">{m.label}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="exec-metric-value">{m.value}</span>
                    <span className={`exec-metric-delta ${m.up ? "up" : "down"}`}>{m.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Health */}
          <div className="exec-card">
            <div className="exec-card-hdr">
              <IcoActivity width={13} height={13} style={{ color: CHART_COLORS.teal }} />
              <span className="exec-card-title">Portfolio Health</span>
              <span className="chip success" style={{ fontSize: 9, marginLeft: "auto" }}>
                HEALTHY
              </span>
            </div>
            <div className="exec-card-metrics">
              {[
                { label: "Availability", value: `${kpis.avail}%`, delta: "+1.7%", up: true },
                { label: "Fleet Health", value: `${kpis.health}/100`, delta: "+3", up: true },
                { label: "Active Critical Risks", value: "3", delta: "↓1 vs last month", up: true },
                { label: "Sites Underperforming", value: "2", delta: "of 6", up: false },
              ].map((m) => (
                <div key={m.label} className="exec-metric" onClick={() => setActiveModal(getModalConfig("Availability"))}>
                  <span className="exec-metric-label">{m.label}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="exec-metric-value">{m.value}</span>
                    <span className={`exec-metric-delta ${m.up ? "up" : "down"}`}>{m.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ESG Health */}
          <div className="exec-card">
            <div className="exec-card-hdr">
              <IcoLeaf width={13} height={13} style={{ color: "#22c55e" }} />
              <span className="exec-card-title">ESG Health</span>
              <span className="chip success" style={{ fontSize: 9, marginLeft: "auto" }}>
                ON TRACK
              </span>
            </div>
            <div className="exec-card-metrics">
              {[
                { label: "Carbon Avoided", value: "1.8M tCO₂", delta: "90% of target", up: true },
                { label: "Renewable Energy", value: "8.2 TWh", delta: "+0.4 TWh vs Q2", up: true },
                { label: "Water Saved", value: "12M m³", delta: "86% of target", up: true },
                { label: "ESG Score", value: "92/100", delta: "+2 vs last yr", up: true },
              ].map((m) => (
                <div key={m.label} className="exec-metric">
                  <span className="exec-metric-label">{m.label}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="exec-metric-value">{m.value}</span>
                    <span className="exec-metric-delta up">{m.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: AI Board Briefing + Risk Map ──────────────────────── */}
      <div className="exec-two-col">
        {/* AI Board Briefing */}
        <div className="exec-briefing-card">
          <div className="exec-briefing-hdr">
            <span className="exec-briefing-badge">✦ AI BOARD BRIEFING</span>
            <span className={`exec-briefing-status ${briefing.isHealthy ? "success" : "danger"}`}>
              Portfolio Status: {briefing.isHealthy ? "Healthy" : "At Risk"}
            </span>
            <span style={{ fontSize: 10, color: "var(--ds-text-faint)", marginLeft: "auto" }}>
              {filters.period}{filters.tech !== "All" ? ` · ${filters.tech}` : ""}{filters.region !== "All" ? ` · ${filters.region}` : ""} · Jun 2026
            </span>
          </div>
          <div className="exec-briefing-body">
            <div className="exec-briefing-group">
              <div className="exec-briefing-group-title highlights">Key Highlights</div>
              {briefing.highlights.map((h, i) => (
                <div key={i} className="exec-briefing-item highlight">
                  <span className="exec-bi-dot success" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
            <div className="exec-briefing-group">
              <div className="exec-briefing-group-title risks">Key Risks</div>
              {briefing.risks.map((r, i) => (
                <div key={i} className="exec-briefing-item risk">
                  <span className="exec-bi-dot danger" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
            <div className="exec-briefing-group">
              <div className="exec-briefing-group-title actions">Recommended Actions</div>
              {briefing.actions.map((a, i) => (
                <div key={i} className="exec-briefing-item action">
                  <span className="exec-bi-num">{i + 1}</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Risk Map */}
        <div className="chart-card" style={{ flex: 1 }}>
          <div className="chart-card-header">
            <IcoAlertTriangle width={12} height={12} style={{ color: "var(--ds-warning)" }} />
            <span className="chart-card-title">Portfolio Risk Map</span>
            <span style={{ fontSize: 10, color: "var(--ds-text-faint)", marginLeft: "auto" }}>6 risk dimensions</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      color: "var(--ds-text-faint)",
                      fontWeight: 600,
                      borderBottom: "1px solid var(--ds-border)",
                    }}
                  >
                    Site
                  </th>
                  {["Financial", "Operational", "Weather", "Grid", "Cyber", "ESG"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "6px 8px",
                        textAlign: "center",
                        color: "var(--ds-text-faint)",
                        fontWeight: 600,
                        borderBottom: "1px solid var(--ds-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RISK_SITES.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--ds-text)", fontSize: 11 }}>{s.site}</td>
                    {([s.financial, s.operational, s.weather, s.grid, s.cyber, s.esg] as string[]).map((r, j) => (
                      <td key={j} style={{ padding: "4px 6px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 700,
                            background: RISK_BG[r],
                            color: RISK_COLOR[r],
                            border: `1px solid ${RISK_COLOR[r]}44`,
                            textTransform: "uppercase",
                          }}
                        >
                          {r}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 10px", display: "flex", gap: 12, fontSize: 10, borderTop: "1px solid var(--ds-border)" }}>
            {(["low", "medium", "high"] as const).map((r) => (
              <span key={r} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: RISK_COLOR[r], display: "inline-block" }} />
                <span style={{ color: "var(--ds-text-faint)", textTransform: "capitalize" }}>{r}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Forecast Center ───────────────────────────────────── */}
      <div>
        <div className="exec-section-label">Forecast Center — Next 30 Days</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            {
              title: "Revenue Forecast",
              current: `$${kpis.revenue}M`,
              forecast: `$${(kpis.revenue * 1.081).toFixed(1)}M`,
              delta: "+8.1%",
              color: CHART_COLORS.blue,
              key: "revenue",
            },
            { title: "Generation Forecast", current: "8.2 TWh", forecast: "8.6 TWh", delta: "+4.9%", color: CHART_COLORS.amber, key: "generation" },
            {
              title: "Availability Forecast",
              current: `${kpis.avail}%`,
              forecast: `${(kpis.avail + 0.3).toFixed(1)}%`,
              delta: "+0.3pp",
              color: CHART_COLORS.teal,
              key: "availability",
            },
            {
              title: "Carbon Forecast",
              current: `${kpis.carbon}K tCO₂`,
              forecast: `${Math.round(kpis.carbon * 1.09)}K tCO₂`,
              delta: "+9%",
              color: "#22c55e",
              key: "carbon",
            },
          ].map((fc) => (
            <div key={fc.title} className="chart-card" style={{ padding: "12px 14px" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ds-text-faint)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: 10,
                }}
              >
                {fc.title}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>Current</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-text)" }}>{fc.current}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>Forecast</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: fc.color }}>{fc.forecast}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 8 }}>↑ {fc.delta} expected</div>
              <ResponsiveContainer width="100%" height={60}>
                <ComposedChart data={forecastData.slice(0, 15)} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
                  <Area type="monotone" dataKey={fc.key} stroke={fc.color} fill={fc.color} fillOpacity={0.12} strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 4: Investment Intelligence ──────────────────────────── */}
      <div className="exec-two-col">
        <div style={{ flex: 1.2 }}>
          <div className="exec-section-label">Investment Intelligence</div>
          <div className="chart-card">
            <div className="chart-card-header">
              <IcoZap width={12} height={12} style={{ color: CHART_COLORS.amber }} />
              <span className="chart-card-title">Investment Opportunities</span>
              <span className="chip info" style={{ fontSize: 9, marginLeft: "auto" }}>
                AI Ranked
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {INVESTMENTS.map((inv, i) => (
                <div
                  key={i}
                  style={{ padding: "12px 14px", borderBottom: "1px solid var(--ds-border)", display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: `${INV_STATUS_COLOR[inv.status]}15`,
                      border: `1px solid ${INV_STATUS_COLOR[inv.status]}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 14,
                    }}
                  >
                    {inv.type === "Solar" ? "☀" : inv.type === "BESS" ? "⚡" : inv.type === "Wind" ? "💨" : "💧"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)", marginBottom: 2 }}>{inv.name}</div>
                    <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>
                      <span style={{ color: INV_STATUS_COLOR[inv.status], fontWeight: 600, textTransform: "uppercase" }}>{inv.status}</span>
                      {" · "}AI Confidence: {inv.confidence}%
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                    {[
                      { label: "IRR", value: `${inv.irr}%`, color: CHART_COLORS.teal },
                      { label: "Payback", value: `${inv.payback}yr`, color: CHART_COLORS.amber },
                      { label: "NPV", value: `$${inv.npv}M`, color: CHART_COLORS.blue },
                    ].map((m) => (
                      <div key={m.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "var(--ds-text-faint)", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 5: Portfolio Benchmarking ── */}
        <div style={{ flex: 1 }}>
          <div className="exec-section-label">Portfolio Benchmarking</div>
          <div className="chart-card" style={{ height: "calc(100% - 28px)" }}>
            <div className="chart-card-header">
              <IcoCpu width={12} height={12} />
              <span className="chart-card-title">vs Industry · Competitor · Target</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 14px" }}>
              {BENCHMARKS.map((b) => {
                const isGood = b.lowerBetter ? b.portfolio <= b.industry : b.portfolio >= b.industry;
                return (
                  <div key={b.metric}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                      <span style={{ color: "var(--ds-text-muted)", fontWeight: 600 }}>{b.metric}</span>
                      <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
                        <span style={{ color: isGood ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                          Portfolio: {b.portfolio}
                          {b.unit}
                        </span>
                        <span style={{ color: "var(--ds-text-faint)" }}>
                          Industry: {b.industry}
                          {b.unit}
                        </span>
                        <span style={{ color: "#a78bfa" }}>
                          Target: {b.target}
                          {b.unit}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          borderRadius: 4,
                          background: isGood ? "#22c55e" : "#ef4444",
                          width: `${b.lowerBetter ? Math.max(5, 100 - (b.portfolio / (b.industry * 1.3)) * 100) : Math.min(100, (b.portfolio / (b.industry * 1.1)) * 100)}%`,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: -2,
                          height: 12,
                          width: 2,
                          background: "#a78bfa",
                          borderRadius: 1,
                          left: `${b.lowerBetter ? Math.max(5, 100 - (b.target / (b.industry * 1.3)) * 100) : Math.min(100, (b.target / (b.industry * 1.1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--ds-border)" }}>
                Purple bar = target threshold · Green/Red bar = portfolio vs industry
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 6: ESG Command Center ───────────────────────────────── */}
      <div>
        <div className="exec-section-label">ESG Command Center</div>
        <div className="chart-card">
          <div className="chart-card-header">
            <IcoLeaf width={12} height={12} style={{ color: "#22c55e" }} />
            <span className="chart-card-title">ESG Scorecard — {filters.period} · Jun 2026</span>
            <span className="chip success" style={{ fontSize: 9, marginLeft: "auto" }}>
              Score: 92/100
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "12px 14px" }}>
            {ESG_METRICS.map((m) => (
              <div
                key={m.label}
                style={{ padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.15)", background: "rgba(34,197,94,0.04)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--ds-text-faint)", fontWeight: 600 }}>{m.label}</span>
                  <IcoCheckCircle width={12} height={12} style={{ color: "#22c55e" }} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e", marginBottom: 2 }}>
                  {m.value} <span style={{ fontSize: 12, fontWeight: 400 }}>{m.unit}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 8 }}>Target: {m.target}</div>
                <ProgressBar value={Math.min(100, m.pct)} status="success" />
                <div style={{ fontSize: 10, color: m.pct >= 100 ? "#22c55e" : "var(--ds-text-faint)", marginTop: 4, textAlign: "right" }}>
                  {m.pct >= 100 ? `✓ ${m.pct}% — Exceeded` : `${m.pct}% of target`}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--ds-border)" }}>
            <ChartCard title="Carbon Reduction Trend (30D)" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}}>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart
                  data={carbon30.map((d) => ({
                    ...d,
                    offset: +((d.offset * pf) / (PERIOD_MULT[filters.period] ?? 1)).toFixed(0),
                    target: +((d.target * pf) / (PERIOD_MULT[filters.period] ?? 1)).toFixed(0),
                  }))}
                >
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...chartTooltipProps} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                  <Line type="monotone" dataKey="offset" stroke={CHART_COLORS.teal} strokeWidth={2} dot={false} name="CO₂ Offset (t)" />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke={CHART_COLORS.violet}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    name="Target (predicted)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>

      {/* ── Section 7: Scenario Simulator ───────────────────────────────── */}
      {/* <div>
        <div className="exec-section-label">Scenario Simulator</div>
        <div className="chart-card">
          <div className="chart-card-header">
            <IcoSparkle width={12} height={12} style={{ color: "#a78bfa" }} />
            <span className="chart-card-title">What-If Analysis — AI Scenario Engine</span>
            <button className="ae-filter-btn" style={{ fontSize: 10, marginLeft: "auto" }} onClick={() => { setPriceChange(0); setBatteryChange(0); setOfflineRisk(0); }}>Reset</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "14px 16px" }}>

          
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { label: "Energy Price Change", value: priceChange,   setter: setPriceChange,   min: -30, max: 30, unit: "%",    icon: "💹", color: CHART_COLORS.amber },
                { label: "Battery Capacity Δ",  value: batteryChange, setter: setBatteryChange, min: -20, max: 50, unit: "%",    icon: "⚡", color: CHART_COLORS.violet },
                { label: "Major Wind Farm Offline Risk", value: offlineRisk, setter: setOfflineRisk, min: 0, max: 100, unit: "% prob", icon: "⚠", color: CHART_COLORS.danger },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: "var(--ds-text-muted)", fontWeight: 600 }}>{s.icon} {s.label}</span>
                    <span style={{ color: s.color, fontWeight: 700 }}>{s.value > 0 ? "+" : ""}{s.value}{s.unit}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={s.value}
                    onChange={e => s.setter(Number(e.target.value))}
                    style={{ width: "100%", accentColor: s.color, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--ds-text-faint)", marginTop: 2 }}>
                    <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>

          
            <div>
              <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Projected Impact</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Revenue Impact",  value: scenario.revenueImpact, unit: "$M",       color: scenario.revenueImpact >= 0 ? "#22c55e" : "#ef4444" },
                  { label: "EBITDA Impact",   value: scenario.ebitdaImpact,  unit: "$M",       color: scenario.ebitdaImpact >= 0  ? "#22c55e" : "#ef4444" },
                  { label: "Carbon Impact",   value: scenario.carbonImpact,  unit: "K tCO₂",   color: scenario.carbonImpact >= 0  ? "#22c55e" : "#ef4444" },
                  { label: "ROI Impact",      value: scenario.roiImpact,     unit: "pp",       color: scenario.roiImpact >= 0     ? "#22c55e" : "#ef4444" },
                ].map(r => (
                  <div key={r.label} style={{ padding: "12px 14px", borderRadius: 6, border: `1px solid ${r.color}33`, background: `${r.color}0d`, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: r.color }}>
                      {r.value >= 0 ? "+" : ""}{r.value}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{r.unit}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(139,92,246,0.08)", borderRadius: 6, border: "1px solid rgba(139,92,246,0.2)", fontSize: 11, color: "#c4b5fd", lineHeight: 1.6 }}>
                <strong>AI Insight:</strong>{" "}
                {scenario.revenueImpact > 0.5
                  ? `Positive scenario: portfolio benefits from ${priceChange > 0 ? "higher energy prices" : batteryChange > 0 ? "increased battery capacity" : "favourable conditions"}.`
                  : scenario.revenueImpact < -0.5
                  ? `Risk scenario: revenue exposure of $${Math.abs(scenario.revenueImpact).toFixed(1)}M. Consider hedging strategies.`
                  : "Current scenario shows minimal portfolio impact. Adjust sliders to explore risk/opportunity scenarios."}
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {/* <div>
        <div className="exec-section-label">Board Presentation</div>
        <div className="chart-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ds-text)", marginBottom: 4 }}>✦ Generate Board Report</div>
              <div style={{ fontSize: 12, color: "var(--ds-text-faint)", lineHeight: 1.6 }}>
                AI automatically generates a comprehensive board-ready report including executive summary, financial performance, ESG scorecard, risk assessment, investment recommendations, and strategic outlook.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <button className="btn-primary" style={{ width: 180, height: 36, fontSize: 13 }} onClick={() => setShowReport(true)}>
                ✦ Generate AI Report
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-control" style={{ flex: 1, height: 28, fontSize: 11 }}>Board Deck</button>
                <button className="btn-control" style={{ flex: 1, height: 28, fontSize: 11 }}>Export PDF</button>
                <button className="btn-control" style={{ flex: 1, height: 28, fontSize: 11 }}>Schedule</button>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginTop: 14 }}>
            {["Executive Summary","Financial Analysis","ESG Summary","Risk Assessment","Investment Plan","Strategic Outlook"].map(section => (
              <div key={section} style={{ padding: "8px 10px", borderRadius: 5, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", textAlign: "center", fontSize: 10, color: "#c4b5fd", lineHeight: 1.4 }}>
                <IcoCheckCircle width={10} height={10} style={{ color: "#22c55e", marginBottom: 4 }} /><br/>
                {section}
              </div>
            ))}
          </div>
        </div>
      </div> */}

      {showReport && <BoardReportModal onClose={() => setShowReport(false)} kpis={kpis} />}
      <KpiDrilldownModal config={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
