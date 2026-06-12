import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import { WorkOrderModal, WOPreset } from "../../components/shared/WorkOrderModal";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { IcoSun, IcoLeaf, IcoDollar, IcoWrench, IcoSparkle } from "../../components/shared/Icons";

const soilingTrend = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  soilingIndex: +(2.1 + i * 0.18 - (i === 11 ? 2.5 : 0) - (i === 24 ? 3.1 : 0) + (Math.random() - 0.5) * 0.2).toFixed(2),
  prLoss: +(1.8 + i * 0.12 + (Math.random() - 0.5) * 0.1).toFixed(2),
})).map(d => ({ ...d, soilingIndex: Math.max(0.1, d.soilingIndex), prLoss: Math.max(0.1, d.prLoss) }));

const CLEANING_EVENTS = [
  { day: 12, label: "Clean A" },
  { day: 25, label: "Clean B" },
];

const STRING_DATA = [
  { block: "Block A", string: "A-01", soiling: 1.2, status: "good",    lastClean: "12 days ago" },
  { block: "Block A", string: "A-02", soiling: 1.8, status: "good",    lastClean: "12 days ago" },
  { block: "Block A", string: "A-03", soiling: 3.4, status: "warning", lastClean: "28 days ago" },
  { block: "Block B", string: "B-01", soiling: 4.2, status: "warning", lastClean: "31 days ago" },
  { block: "Block B", string: "B-02", soiling: 5.8, status: "danger",  lastClean: "38 days ago" },
  { block: "Block B", string: "B-03", soiling: 2.1, status: "good",    lastClean: "14 days ago" },
  { block: "Block C", string: "C-01", soiling: 6.7, status: "danger",  lastClean: "45 days ago" },
  { block: "Block C", string: "C-02", soiling: 3.9, status: "warning", lastClean: "29 days ago" },
  { block: "Block C", string: "C-03", soiling: 1.4, status: "good",    lastClean: "10 days ago" },
];

const STATUS_COLOR = { good: "#22c55e", warning: "#f59e0b", danger: "#ef4444" };

interface StringRow { block: string; string: string; soiling: number; status: string; lastClean: string; }

export default function SiteSoilingDetection() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [filter, setFilter] = useState<"all" | "warning" | "danger">("all");
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);
  const [scheduled, setScheduled] = useState<Set<string>>(new Set());

  const avgSoiling = +(STRING_DATA.reduce((s, r) => s + r.soiling, 0) / STRING_DATA.length).toFixed(1);
  const prLoss     = +(avgSoiling * 0.48).toFixed(1);
  const revLoss    = Math.round(prLoss / 100 * site.generation * 8 * 55);
  const cleanROI   = Math.round(revLoss * 5.2);
  const dirty      = STRING_DATA.filter(r => r.status !== "good").length;

  const filtered = STRING_DATA.filter(r => filter === "all" || r.status === filter);

  function scheduleClean(r: StringRow) {
    const revRecovery = Math.round(r.soiling * 0.4 * site.generation * 8 * 55 / 100);
    setWoPreset({
      title:       `Panel Cleaning — ${r.string} (${r.block})`,
      asset:       `${r.block} / ${r.string}`,
      priority:    r.status === "danger" ? "High" : "Medium",
      type:        "Preventive",
      description: `Solar panel cleaning required for string ${r.string} in ${r.block}. Soiling index: ${r.soiling}%. Last cleaned: ${r.lastClean}. Estimated PR loss: ${(r.soiling * 0.48).toFixed(1)}%. Estimated daily revenue loss: $${revRecovery}.`,
      steps: [
        `Pre-clean inspection of ${r.string} — check for physical damage before cleaning`,
        `Dry brush clean panels — use approved microfiber equipment`,
        `Water rinse if dry clean insufficient — use demineralised water only`,
        `Post-clean IV curve measurement to confirm soiling removal`,
        `Record cleaning in maintenance log and update soiling index`,
      ],
      siteId: site.id,
    });
  }

  function handleWOSubmit() {
    if (woPreset) {
      const stringId = woPreset.asset.split(" / ")[1];
      setScheduled(prev => new Set(prev).add(stringId));
    }
    setWoPreset(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Avg Soiling Index" value={avgSoiling} unit="%" icon={<IcoSun width={14} height={14} />} rag={rag(100 - avgSoiling, 97, 94)} trend="+0.3%" trendDir="down" />
        <KpiCard label="Estimated PR Loss" value={prLoss} unit="%" icon={<IcoLeaf width={14} height={14} />} rag={rag(100 - prLoss, 98, 96)} trend="+0.2pp" trendDir="down" />
        <KpiCard label="Revenue Loss/Day" value={`$${(revLoss / 1000).toFixed(1)}K`} unit={undefined} icon={<IcoDollar width={14} height={14} />} rag="danger" trend="+$0.3K" trendDir="down" />
        <KpiCard label="Strings Requiring Clean" value={dirty} unit={`/ ${STRING_DATA.length}`} icon={<IcoWrench width={14} height={14} />} rag={dirty > 4 ? "danger" : dirty > 1 ? "warning" : "success"} trend={`${dirty} dirty`} trendDir="down" />
      </div>

      {/* Soiling trend chart */}
      <ChartCard title="Soiling Index Trend (30 Days)" timeframeOptions={["30D"]} timeframe="30D" onTimeframeChange={() => {}} info={{
        description: "Daily soiling index (%) across all strings vs estimated PR loss. Cleaning events are shown as dashed reference lines. Target soiling < 2% before cleaning trigger.",
        stats: [
          { label: "Current Avg",   value: `${avgSoiling}%`, highlight: true },
          { label: "Cleaning ROI",  value: `$${(cleanROI / 1000).toFixed(0)}K/event` },
          { label: "Clean Trigger", value: "> 3% soiling" },
        ],
        source:   "String-level IV curve analysis + pyranometer",
        standard: "IEC 60904-1 — Soiling measurement",
        note:     "Cleaning should be triggered when soiling exceeds 3% or PR loss > 2%.",
      }}>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={soilingTrend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <XAxis dataKey="day" {...axisProps} label={{ value: "Day of Month", position: "insideBottom", offset: -2, fontSize: 9, fill: "var(--ds-text-faint)" }} />
            <YAxis yAxisId="si"  {...axisProps} label={{ value: "Soiling %", angle: -90, position: "insideLeft", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <YAxis yAxisId="pr" orientation="right" {...axisProps} label={{ value: "PR Loss %", angle: 90, position: "insideRight", fontSize: 8, fill: "var(--ds-text-faint)" }} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            {CLEANING_EVENTS.map(ev => (
              <ReferenceLine key={ev.day} yAxisId="si" x={String(ev.day)} stroke={CHART_COLORS.teal} strokeDasharray="4 3"
                label={{ value: ev.label, fontSize: 8, fill: CHART_COLORS.teal, position: "top" }} />
            ))}
            <ReferenceLine yAxisId="si" y={3} stroke={CHART_COLORS.warning} strokeDasharray="3 3" label={{ value: "Clean trigger", fontSize: 8, fill: CHART_COLORS.warning, position: "right" }} />
            <Bar yAxisId="si" dataKey="soilingIndex" fill={CHART_COLORS.amber} fillOpacity={0.6} name="Soiling Index %" radius={[2, 2, 0, 0]} />
            <Line yAxisId="pr" type="monotone" dataKey="prLoss" stroke={CHART_COLORS.danger} strokeWidth={2} dot={false} name="PR Loss %" />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* String-level table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">String-Level Soiling Analysis</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {(["all", "warning", "danger"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`ae-filter-btn${filter === f ? " active" : ""}`}
                style={{ textTransform: "capitalize", fontSize: 11 }}>
                {f === "all" ? "All" : f === "warning" ? "Warning" : "Critical"}
              </button>
            ))}
          </div>
        </div>
        <table className="ae-table" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              <th>Block</th><th>String</th><th>Soiling Index</th><th>Soiling Bar</th><th>Status</th><th>Last Cleaned</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.block}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.string}</td>
                <td style={{ color: STATUS_COLOR[r.status as keyof typeof STATUS_COLOR], fontWeight: 700 }}>{r.soiling}%</td>
                <td style={{ width: 120 }}>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 8 }}>
                    <div style={{ width: `${Math.min(100, r.soiling / 8 * 100)}%`, height: "100%", borderRadius: 3, background: STATUS_COLOR[r.status as keyof typeof STATUS_COLOR] }} />
                  </div>
                </td>
                <td><span className={`chip ${r.status}`} style={{ fontSize: 10 }}>{r.status.toUpperCase()}</span></td>
                <td style={{ color: "var(--ds-text-faint)", fontSize: 11 }}>{r.lastClean}</td>
                <td>
                  {r.status !== "good" && (
                    scheduled.has(r.string) ? (
                      <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>✓ Scheduled</span>
                    ) : (
                      <button
                        className="ae-action-btn"
                        style={{ fontSize: 10, height: 22, padding: "0 8px" }}
                        onClick={() => scheduleClean(r)}
                      >
                        Schedule Clean
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Recommendation */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title"><IcoSparkle width={11} height={11} /> AI Cleaning Recommendations — {site.name}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            { title: "Immediate: Block C Priority", type: "danger" as const, insight: `Block C strings C-01 (6.7%) and B-02 (5.8%) exceed critical soiling threshold. Estimated daily revenue loss: $${(revLoss * 0.4 / 1000).toFixed(1)}K. Schedule cleaning within 48 hours.` },
            { title: "Optimal Cleaning Window", type: "info" as const, insight: "Weather forecast shows low-wind, low-humidity conditions Tuesday 06:00–10:00. Optimal window for dry cleaning. Estimated cleaning time: 3.5 hours for Block C." },
            { title: "ROI Analysis", type: "success" as const, insight: `Cleaning all flagged strings (5 of 9) has estimated ROI of $${(cleanROI / 1000).toFixed(0)}K over 30 days vs ~$800 cleaning cost. Payback period: < 2 days.` },
          ].map(item => (
            <div key={item.title} className={`ai-finding-card modal-${item.type}`} style={{ padding: "10px 12px" }}>
              <div className="ai-finding-site">{item.title}</div>
              <div style={{ fontSize: 11.5, color: "#e9d5ff", lineHeight: 1.5, marginTop: 4 }}>{item.insight}</div>
            </div>
          ))}
        </div>
      </div>

      <WorkOrderModal
        open={!!woPreset}
        preset={woPreset}
        onClose={() => setWoPreset(null)}
        onSubmit={handleWOSubmit}
      />
    </div>
  );
}
