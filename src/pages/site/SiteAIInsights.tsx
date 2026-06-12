import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { WorkOrderModal, WOPreset } from "../../components/shared/WorkOrderModal";
import { fetchSiteAiFindings } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";

// ─── Types & data ─────────────────────────────────────────────────────────────
type InsightType = "ROOT CAUSE" | "PREDICTION" | "OPTIMIZATION" | "ANOMALY" | "COMPLIANCE";
type InsightSev  = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const TYPE_COLOR: Record<InsightType, string> = {
  "ROOT CAUSE":   "#a78bfa",
  "PREDICTION":   "#f59e0b",
  "OPTIMIZATION": "#22c55e",
  "ANOMALY":      "#f97316",
  "COMPLIANCE":   "#38bdf8",
};
const SEV_COLOR: Record<InsightSev, string> = {
  CRITICAL:"#ef4444", HIGH:"#f97316", MEDIUM:"#eab308", LOW:"#22c55e",
};

interface Insight {
  id: string; type: InsightType; sev: InsightSev;
  title: string; asset: string; site: string; detected: string; conf: number;
  analysis: string; rootCause: string; recommendation: string;
  steps: string[]; impact: string;
}

// INSIGHTS array is now fetched from the API (see component below)

const FILTER_TABS = ["All", "Anomaly", "Predict", "Optimize", "Root Cause"] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const TAB_TYPE_MAP: Record<FilterTab, InsightType | null> = {
  "All": null,
  "Anomaly": "ANOMALY",
  "Predict": "PREDICTION",
  "Optimize": "OPTIMIZATION",
  "Root Cause": "ROOT CAUSE",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SiteAIInsights() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const { data: apiInsights, loading } = useApi(() => fetchSiteAiFindings(site.id), [site.id]);
  const INSIGHTS: Insight[] = (apiInsights as unknown as Insight[]) ?? [];

  const [selId, setSelId]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<FilterTab>("All");
  const [woOpen, setWoOpen]     = useState(false);
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);
  const [acked, setAcked]       = useState<Set<string>>(new Set());

  const typeFilter = TAB_TYPE_MAP[filter];
  const visible = typeFilter ? INSIGHTS.filter(i => i.type === typeFilter) : INSIGHTS;
  const activeId = selId ?? INSIGHTS[0]?.id ?? null;
  const insight = INSIGHTS.find(i => i.id === activeId) ?? INSIGHTS[0] ?? null;

  function openWO(ins: Insight) {
    setWoPreset({
      title: `[AI] ${ins.title}`,
      asset: ins.asset,
      priority: ins.sev === "CRITICAL" ? "Critical" : ins.sev === "HIGH" ? "High" : "Medium",
      description: ins.recommendation,
      steps: ins.steps,
      type: ins.type === "PREDICTION" || ins.type === "OPTIMIZATION" ? "Preventive" : "Corrective",
    });
    setWoOpen(true);
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"var(--ds-text-faint)", fontSize:13 }}>
      Analysing site data…
    </div>
  );

  return (
    <div className="ai-page">
      {/* ── Left panel ── */}
      <div className="ai-left-panel">
        <div className="ai-left-hdr">
          <span className="ai-left-title">🧠 AI INSIGHTS</span>
          <span style={{ fontSize:10, color:"var(--ds-text-faint)", marginLeft:"auto" }}>
            {INSIGHTS.length} finding{INSIGHTS.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="ai-filter-tabs">
          {FILTER_TABS.map(t => (
            <button key={t} className={`ai-filter-tab${filter === t ? " active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>
        <div className="ai-insight-list">
          {visible.map(ins => (
            <div
              key={ins.id}
              className={`ai-insight-item${selId === ins.id ? " selected" : ""}`}
              onClick={() => setSelId(ins.id)}
            >
              <div className="ai-insight-item-hdr">
                <span className="ai-insight-type-chip" style={{ color: TYPE_COLOR[ins.type], background: TYPE_COLOR[ins.type] + "20" }}>
                  {ins.type}
                </span>
                <span className="ai-insight-sev" style={{ color: SEV_COLOR[ins.sev] }}>{ins.sev}</span>
              </div>
              <div className="ai-insight-item-title">{ins.title}</div>
              <div className="ai-insight-item-footer">
                <span className="ai-alarm-asset">{ins.asset}</span>
                <span className="ai-insight-conf">{ins.conf} conf.</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div className="ai-detail-panel">
        {!insight && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, color:"var(--ds-text-faint)", fontSize:13 }}>
            Select an insight from the list
          </div>
        )}
        {insight && <>
          {/* Header */}
          <div className="ai-detail-hdr">
            <div className="ai-detail-hdr-top">
              <span className="ai-insight-type-chip lg" style={{ color: TYPE_COLOR[insight.type], background: TYPE_COLOR[insight.type] + "20" }}>
                {insight.type === "PREDICTION" ? "📈" : insight.type === "OPTIMIZATION" ? "📊" : insight.type === "ANOMALY" ? "⚠" : insight.type === "COMPLIANCE" ? "☑" : "🧠"} {insight.type}
              </span>
              <span className="ai-sev-badge" style={{ background: SEV_COLOR[insight.sev] + "33", color: SEV_COLOR[insight.sev], border: `1px solid ${SEV_COLOR[insight.sev]}55` }}>
                {insight.sev}
              </span>
              <span className="ai-conf-badge">{insight.conf}% confidence</span>
              <div style={{ flex:1 }} />
              {!acked.has(insight.id) && (
                <button className="ai-ack-btn" onClick={() => setAcked(s => new Set([...s, insight.id]))}>
                  ✓ Acknowledge
                </button>
              )}
              {acked.has(insight.id) && (
                <span className="ai-acked-badge">✓ Acknowledged</span>
              )}
              <button className="ai-wo-btn" onClick={() => openWO(insight)}>Create WO</button>
            </div>
            <div className="ai-detail-title">{insight.title}</div>
            <div className="ai-detail-meta">
              <span>⚡ {insight.asset}</span>
              <span className="ai-meta-sep">•</span>
              <span>{insight.site}</span>
              <span className="ai-meta-sep">•</span>
              <span>⏱ Detected: {insight.detected}</span>
            </div>
          </div>

          <div className="ai-detail-body">
            <div className="ai-section-card">
              <div className="ai-section-title">AI ANALYSIS</div>
              <p className="ai-section-text">{insight.analysis}</p>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-title">🧠 ROOT CAUSE</div>
              <p className="ai-section-text">{insight.rootCause}</p>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-title">💡 RECOMMENDATION</div>
              <p className="ai-section-text">{insight.recommendation}</p>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-title">ACTIONABLE STEPS</div>
              <div className="ai-steps-list">
                {insight.steps.map((step, i) => (
                  <div key={i} className="ai-step-row">
                    <span className="ai-step-num">{i + 1}</span>
                    <span className="ai-step-text">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="ai-section-card ai-impact-card">
              <div className="ai-section-title ai-title-amber">📉 BUSINESS IMPACT</div>
              <p className="ai-section-text">{insight.impact}</p>
            </div>
          </div>
        </>}
      </div>

      <WorkOrderModal open={woOpen} preset={woPreset} onClose={() => setWoOpen(false)} />
    </div>
  );
}
