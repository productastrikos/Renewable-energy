import { useEffect, useState } from "react";
import { AIFinding, AIFindingStep } from "../../data/mockData";
import { WorkOrderModal, WOPreset } from "./WorkOrderModal";

interface Props {
  finding: AIFinding | null;
  onClose: () => void;
}

const URGENCY_LABEL: Record<string, string> = {
  immediate: "IMMEDIATE",
  urgent: "URGENT",
  monitor: "MONITOR",
};
const URGENCY_COLOR: Record<string, string> = {
  immediate: "var(--ds-danger)",
  urgent: "var(--ds-warning)",
  monitor: "var(--ds-info)",
};
const URGENCY_BG: Record<string, string> = {
  immediate: "var(--ds-danger-bg)",
  urgent: "var(--ds-warning-bg)",
  monitor: "var(--ds-info-bg)",
};

const PRIORITY_LABEL: Record<string, string> = {
  danger: "CRITICAL",
  warning: "WARNING",
  success: "IMPROVED",
  info: "INSIGHT",
};
const PRIORITY_COLOR: Record<string, string> = {
  danger: "var(--ds-danger)",
  warning: "var(--ds-warning)",
  success: "var(--ds-success)",
  info: "var(--ds-info)",
};

const STATUS_COLOR: Record<string, string> = {
  danger: "var(--ds-danger)",
  warning: "var(--ds-warning)",
  success: "var(--ds-success)",
};

const SEV_COLOR: Record<string, string> = {
  danger: "var(--ds-danger)",
  warning: "var(--ds-warning)",
  info: "var(--ds-info)",
};

const URGENCY_TO_PRIORITY: Record<string, WOPreset["priority"]> = {
  immediate: "Critical",
  urgent:    "High",
  monitor:   "Medium",
};

function buildPreset(finding: AIFinding, step: AIFindingStep): WOPreset {
  const firstAsset = finding.drilldown.affectedAssets[0]?.name ?? finding.site;
  return {
    title:       step.action,
    asset:       firstAsset,
    priority:    URGENCY_TO_PRIORITY[step.urgency] ?? "High",
    type:        step.urgency === "immediate" ? "Emergency" : "Corrective",
    description: `${finding.metric} at ${finding.site} — Root Cause: ${finding.rootCause}`,
    steps:       [step.action, `ETA: ${step.eta}`, `Revenue Impact: ${finding.loss}`],
  };
}

export function AIFindingDrilldownModal({ finding, onClose }: Props) {
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!finding) return null;

  const d = finding.drilldown;
  if (!d) return null;   // guard: API findings without drilldown adapted upstream; belt-and-suspenders

  const priorityColor = PRIORITY_COLOR[finding.priority] ?? "var(--ds-info)";

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="presentation" />
      <div className="ai-drill-frame" role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="ai-drill-header">
          <div className="ai-drill-header-left">
            <div className="ai-drill-badge-row">
              <span className="ai-drill-ai-label">✦ AI DETECTED</span>
              <span className="ai-drill-priority-badge" style={{ color: priorityColor, borderColor: priorityColor + "44", background: priorityColor + "14" }}>
                {PRIORITY_LABEL[finding.priority]}
              </span>
              <span className="ai-drill-urgency-badge" style={{ color: URGENCY_COLOR[d.urgency], background: URGENCY_BG[d.urgency], borderColor: URGENCY_COLOR[d.urgency] + "44" }}>
                {d.urgency === "opportunity" ? "OPPORTUNITY" : URGENCY_LABEL[d.urgency]}
              </span>
            </div>
            <div className="ai-drill-site">{finding.site}</div>
            <div className="ai-drill-metric">{finding.metric}</div>
            <div className="ai-drill-detected">Detected {d.detectedAt}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="ai-drill-body">

          {/* Impact row */}
          {(d.expected || d.actual) && (
            <div className="ai-drill-impact-row">
              {d.expected && (
                <div className="ai-drill-impact-card">
                  <div className="ai-drill-ic-label">Expected</div>
                  <div className="ai-drill-ic-value">{d.expected.value}</div>
                  <div className="ai-drill-ic-unit">{d.expected.unit}</div>
                </div>
              )}
              {d.actual && (
                <div className="ai-drill-impact-card">
                  <div className="ai-drill-ic-label">Actual</div>
                  <div className="ai-drill-ic-value" style={{ color: finding.priority === "success" || finding.priority === "info" ? "var(--ds-success)" : "var(--ds-danger)" }}>
                    {d.actual.value}
                  </div>
                  <div className="ai-drill-ic-unit">{d.actual.unit}</div>
                </div>
              )}
              {d.delta && (
                <div className="ai-drill-impact-card ai-drill-ic-delta">
                  <div className="ai-drill-ic-label">Δ Delta</div>
                  <div className="ai-drill-ic-value" style={{ color: d.delta.startsWith("+") ? "var(--ds-success)" : "var(--ds-danger)" }}>
                    {d.delta}
                  </div>
                  <div className="ai-drill-ic-unit">vs forecast</div>
                </div>
              )}
              <div className="ai-drill-impact-card ai-drill-ic-revenue">
                <div className="ai-drill-ic-label">{finding.loss.startsWith("+") ? "Revenue Gain" : "Revenue Impact"}</div>
                <div className="ai-drill-ic-value" style={{ color: finding.loss.startsWith("+") ? "var(--ds-success)" : "var(--ds-danger)" }}>
                  {finding.loss}
                </div>
                <div className="ai-drill-ic-unit">today</div>
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="ai-drill-summary-box">
            <div className="ai-drill-section-label">AI Analysis</div>
            <p className="ai-drill-summary-text">{d.summary}</p>
            {d.context && <p className="ai-drill-context-text">{d.context}</p>}
          </div>

          {/* Causes + Assets two-column */}
          <div className="ai-drill-two-col">

            {/* Probable Causes */}
            <div className="ai-drill-panel">
              <div className="ai-drill-section-label">Probable Causes</div>
              <div className="ai-drill-causes">
                {d.causes.map((c, i) => (
                  <div key={i} className="ai-drill-cause-row">
                    <div className="ai-drill-cause-top">
                      <span className="ai-drill-cause-label">{c.label}</span>
                      <span className="ai-drill-cause-pct" style={{ color: SEV_COLOR[c.severity] }}>{c.probability}%</span>
                    </div>
                    <div className="ai-drill-cause-bar-bg">
                      <div className="ai-drill-cause-bar-fill"
                        style={{ width: `${c.probability}%`, background: SEV_COLOR[c.severity] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Assets */}
            <div className="ai-drill-panel">
              <div className="ai-drill-section-label">Affected Assets</div>
              <div className="ai-drill-assets">
                {d.affectedAssets.map((a, i) => (
                  <div key={i} className="ai-drill-asset-row" style={{ borderLeftColor: STATUS_COLOR[a.status] }}>
                    <div className="ai-drill-asset-top">
                      <span className="ai-drill-asset-dot" style={{ background: STATUS_COLOR[a.status] }} />
                      <span className="ai-drill-asset-id">{a.name}</span>
                      <span className="ai-drill-asset-status" style={{ color: STATUS_COLOR[a.status] }}>
                        {a.status === "danger" ? "Critical" : a.status === "warning" ? "Warning" : "Normal"}
                      </span>
                    </div>
                    <div className="ai-drill-asset-detail">{a.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="ai-drill-panel">
            <div className="ai-drill-section-label">Recommended Actions</div>
            <div className="ai-drill-steps">
              {d.nextSteps.map((s, i) => (
                <div key={i} className="ai-drill-step-row">
                  <div className="ai-drill-step-num">{i + 1}</div>
                  <div className="ai-drill-step-body">
                    <div className="ai-drill-step-top">
                      <span className="ai-drill-step-urgency"
                        style={{ color: URGENCY_COLOR[s.urgency], background: URGENCY_BG[s.urgency], borderColor: URGENCY_COLOR[s.urgency] + "44" }}>
                        {URGENCY_LABEL[s.urgency]}
                      </span>
                      <span className="ai-drill-step-action">{s.action}</span>
                    </div>
                    <div className="ai-drill-step-meta">
                      <span>ETA: <strong>{s.eta}</strong></span>
                    </div>
                  </div>
                  <button className="ai-drill-step-btn" onClick={() => setWoPreset(buildPreset(finding, s))}>Assign →</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <WorkOrderModal
        open={!!woPreset}
        preset={woPreset}
        onClose={() => setWoPreset(null)}
      />
    </>
  );
}
