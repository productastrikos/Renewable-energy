import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { WorkOrderModal, WOPreset } from "../../components/shared/WorkOrderModal";
import { fetchSiteAiAlarms, type AdvisorAlarm } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";

type Severity = "CRITICAL" | "HIGH" | "WARNING";

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", WARNING: "#eab308",
};

// ─── Spinning brain icon ──────────────────────────────────────────────────────
function BrainSpinner() {
  return (
    <div className="aaa-spinner-wrap">
      <svg className="aaa-spinner-ring" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="34" stroke="rgba(139,92,246,0.15)" strokeWidth="4" />
        <circle cx="40" cy="40" r="34" stroke="#a78bfa" strokeWidth="4"
          strokeDasharray="60 154" strokeLinecap="round" />
      </svg>
      <div className="aaa-spinner-brain">
        <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
          <path d="M9 3C6.24 3 4 5.24 4 8c0 1.1.36 2.12.97 2.94C4.36 11.56 4 12.48 4 13.5c0 1.97 1.25 3.64 3 4.28V19a2 2 0 002 2h6a2 2 0 002-2v-1.22c1.75-.64 3-2.31 3-4.28 0-1.02-.36-1.94-.97-2.56C19.64 10.12 20 9.1 20 8c0-2.76-2.24-5-5-5"
            stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 3v18M9 8h6M9 13h6" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SiteAIAlarmAdvisor() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const { data: rawAlarms, loading } = useApi(() => fetchSiteAiAlarms(site.id), [site.id]);
  const alarms: AdvisorAlarm[] = rawAlarms ?? [];

  const [selId, setSelId]       = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);
  const [woCreated, setWoCreated] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function selectAlarm(id: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelId(id);
    setAnalyzing(true);
    timerRef.current = setTimeout(() => setAnalyzing(false), 1800);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const alarm = alarms.find((a: AdvisorAlarm) => a.id === selId) ?? null;

  function openWO(a: AdvisorAlarm) {
    setWoPreset({
      title:       `[AI] ${a.title} — ${a.asset}`,
      asset:       a.asset,
      priority:    a.sev === "CRITICAL" ? "Critical" : a.sev === "HIGH" ? "High" : "Medium",
      description: a.analysis.slice(0, 300) + "…",
      steps:       a.immediate,
      type:        a.sev === "CRITICAL" ? "Emergency" : "Corrective",
      siteId:      site.id,
    });
  }

  function handleWOSubmit() {
    if (selId) setWoCreated(prev => new Set(prev).add(selId));
    setWoPreset(null);
  }

  return (
    <div className="ai-page">
      {/* ── Left panel ── */}
      <div className="ai-left-panel">
        <div className="ai-left-hdr">
          <span className="ai-left-title">✦ AI Alarm Advisor</span>
          <span className="ai-active-badge">{loading ? "…" : `${alarms.length} Active`}</span>
        </div>
        <div className="ai-left-sub">
          Select an alarm for AI root-cause analysis and work order generation.
        </div>
        <div className="ai-alarm-list">
          {loading && (
            <div style={{ padding: "20px 12px", color: "var(--ds-text-faint)", fontSize: 12 }}>
              Analysing site asset data…
            </div>
          )}
          {!loading && alarms.length === 0 && (
            <div style={{ padding: "20px 12px", color: "var(--ds-text-faint)", fontSize: 12 }}>
              No active alarms detected.
            </div>
          )}
          {alarms.map((a: AdvisorAlarm) => (
            <div
              key={a.id}
              className={`ai-alarm-item${selId === a.id ? " selected" : ""}`}
              onClick={() => selectAlarm(a.id)}
            >
              <div className="ai-alarm-sev" style={{ color: SEV_COLOR[a.sev as Severity] ?? "#94a3b8" }}>
                ⚠ {a.sev}
              </div>
              <div className="ai-alarm-name">{a.title}</div>
              <div className="ai-alarm-meta">
                <span className="ai-alarm-asset">{a.asset}</span>
                {woCreated.has(a.id) && (
                  <span style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, marginLeft: "auto" }}>✓ WO</span>
                )}
                <span className="ai-alarm-time">• {a.time}</span>
              </div>
              {selId === a.id && analyzing && (
                <div style={{ marginTop: 4 }}>
                  <span className="aaa-spinner-dot" />
                  <span className="aaa-spinner-dot" style={{ animationDelay: "0.2s" }} />
                  <span className="aaa-spinner-dot" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div className="ai-detail-panel">

        {/* No selection state */}
        {!selId && (
          <div className="aaa-empty-state">
            <div className="aaa-empty-icon">✦</div>
            <div className="aaa-empty-title">AI Alarm Advisor</div>
            <div className="aaa-empty-sub">Select an alarm from the list to begin AI root-cause analysis</div>
          </div>
        )}

        {/* Analysing animation */}
        {selId && analyzing && (
          <div className="aaa-analyzing-state">
            <BrainSpinner />
            <div className="aaa-analyzing-title">Analyzing alarm context...</div>
            <div className="aaa-analyzing-sub">Querying asset properties, historical events, and engineering knowledge base</div>
          </div>
        )}

        {/* Result */}
        {selId && !analyzing && alarm && (
          <>
            <div className="ai-detail-hdr">
              <div className="ai-detail-hdr-top">
                <span className="ai-detail-icon">⚠</span>
                <span className="ai-detail-title">{alarm.title}</span>
                <span className="ai-sev-badge" style={{
                  background: (SEV_COLOR[alarm.sev as Severity] ?? "#94a3b8") + "33",
                  color: SEV_COLOR[alarm.sev as Severity] ?? "#94a3b8",
                  border: `1px solid ${(SEV_COLOR[alarm.sev as Severity] ?? "#94a3b8")}66`,
                }}>
                  ● {alarm.sev}
                </span>
                <span className="ai-conf-badge">{alarm.confidence}% confidence</span>
              </div>
              <div className="ai-detail-meta">
                <span className="ai-detail-asset">{alarm.asset}</span>
                <span className="ai-meta-sep">•</span>
                <span>{alarm.time}</span>
                <span className="ai-meta-sep">•</span>
                <span>{alarm.protocol}</span>
              </div>
            </div>

            <div className="ai-detail-body">
              <div className="ai-analysis-card">
                <div className="ai-card-title ai-title-purple">✦ AI ROOT CAUSE ANALYSIS</div>
                <p className="ai-analysis-text">{alarm.analysis}</p>
                {alarm.standards.length > 0 && (
                  <div className="ai-standards-row">
                    {alarm.standards.map((s: string, i: number) => (
                      <span key={i} className="ai-std-chip">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ai-actions-row">
                <div className="ai-action-card">
                  <div className="ai-card-title ai-title-amber">⚡ IMMEDIATE ACTIONS</div>
                  <ol className="ai-action-list">
                    {alarm.immediate.map((step: string, i: number) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
                <div className="ai-action-card">
                  <div className="ai-card-title ai-title-teal">✓ PREVENTIVE ACTIONS</div>
                  <ol className="ai-action-list">
                    {alarm.preventive.map((step: string, i: number) => <li key={i}>{step}</li>)}
                  </ol>
                </div>
              </div>

              <div className="ai-footer-btns">
                <button className="ai-ack-btn">✓ Acknowledge Alarm</button>
                {woCreated.has(alarm.id) ? (
                  <button className="ai-wo-btn"
                    style={{ background: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.4)", color: "#22c55e", cursor: "default" }}
                    disabled>
                    ✓ Work Order Created
                  </button>
                ) : (
                  <button className="ai-wo-btn" onClick={() => openWO(alarm)}>🔧 Create Work Order</button>
                )}
              </div>
            </div>
          </>
        )}
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
