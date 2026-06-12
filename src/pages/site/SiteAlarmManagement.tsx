import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { WorkOrderModal, WOPreset } from "../../components/shared/WorkOrderModal";

// ─── Mock data ────────────────────────────────────────────────────────────────
interface Alarm {
  id: string; time: string;
  sev: "CRITICAL" | "MAJOR" | "MINOR";
  asset: string; desc: string;
  baseSec: number; hasAI: boolean; hasWO: boolean;
}

const MOCK_ALARMS: Alarm[] = [
  { id:"A001", time:"17:14:22", sev:"CRITICAL", asset:"INV-B01",      desc:"DC Bus Overvoltage",               baseSec:495,  hasAI:true,  hasWO:true  },
  { id:"A002", time:"17:11:05", sev:"MAJOR",    asset:"SMB-A02",       desc:"String Current Deviation > 15%",  baseSec:692,  hasAI:false, hasWO:false },
  { id:"A003", time:"17:08:47", sev:"CRITICAL", asset:"SEWA-MG-BESS", desc:"State of Charge Below 20%",        baseSec:840,  hasAI:true,  hasWO:false },
  { id:"A004", time:"16:15:44", sev:"MAJOR",    asset:"132KV-CB-01",  desc:"Trip Coil Supervision Alarm",      baseSec:3978, hasAI:false, hasWO:true  },
  { id:"A005", time:"15:58:22", sev:"MINOR",    asset:"DNP3-RTU-3",   desc:"DNP3 Communication Timeout",       baseSec:4915, hasAI:false, hasWO:false },
];

// Pre-built AI analysis per alarm
const AI_ANALYSIS: Record<string, { summary: string; confidence: number; immediate: string[]; preventive: string[] }> = {
  A001: {
    summary: "DC Bus Overvoltage on INV-B01 indicates the DC bus voltage has exceeded the inverter's maximum threshold (~1000 Vdc). This likely follows a rapid irradiance increase or MPPT failure. Hardware protection has engaged, disconnecting the inverter from the AC grid. IGBT desaturation may have occurred — do not reset without investigation.",
    confidence: 96,
    immediate: ["Isolate INV-B01 from both AC and DC sides before inspection", "Check DC string voltage at combiner box to confirm overvoltage level", "Inspect combiner fuses and disconnect switches in Bay 2", "Review SCADA data for sudden irradiance spike or MPPT fault codes", "Do not re-energise until root cause is confirmed"],
    preventive: ["Configure DC overvoltage alarm thresholds at 5% below trip point", "Install DC surge protection devices (SPD Type 2) on string combiner inputs", "Schedule quarterly MPPT algorithm validation and firmware updates"],
  },
  A003: {
    summary: "BESS State of Charge has dropped below the 20% minimum operational threshold on SEWA-MG-BESS. This indicates the battery was discharged beyond its planned schedule without adequate recharge time, likely due to extended grid frequency support event earlier today. Continued discharge risks accelerating capacity degradation.",
    confidence: 91,
    immediate: ["Halt all discharge operations immediately via BMS command", "Switch BESS to grid-charging mode at maximum safe charge rate", "Check grid frequency — if still deviating, engage alternative frequency support asset", "Monitor cell temperatures during charging — abort if >45°C", "Notify grid operator of reduced BESS availability"],
    preventive: ["Set automatic discharge cutoff at 25% SOC (5% above current trip)", "Review dispatch schedule — peak discharge periods overlapping without recharge windows", "Implement AI-based predictive SOC management to prevent recurrence"],
  },
};

const SEV_COLOR = { CRITICAL:"#ef4444", MAJOR:"#f97316", MINOR:"#eab308" };
const SEV_BG    = { CRITICAL:"rgba(239,68,68,0.12)", MAJOR:"rgba(249,115,22,0.12)", MINOR:"rgba(234,179,8,0.12)" };

function fmtDur(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

// ─── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(alarms: Alarm[], siteName: string, tick: number) {
  const rows = [
    "ID,Time,Severity,Asset,Description,Duration,State",
    ...alarms.map(a =>
      `${a.id},${a.time},${a.sev},"${a.asset}","${a.desc}",${fmtDur(a.baseSec + tick)},ACTIVE`
    ),
  ].join("\n");
  const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const el   = document.createElement("a");
  el.href     = url;
  el.download = `alarms-${siteName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0,10)}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

// Maps each alarm code to the SOP that covers it in the Documents library
const ALARM_SOP_MAP: Record<string, { id: string; title: string; category: string }> = {
  A001: { id: "sop-007", title: "Inverter DC Bus Overvoltage Response",  category: "Corrective Maintenance" },
  A003: { id: "sop-008", title: "BESS Low State of Charge Response",     category: "Corrective Maintenance" },
  A004: { id: "sop-001", title: "Emergency Inverter Shutdown",            category: "Emergency"              },
  A005: { id: "sop-010", title: "SCADA / RTU Communication Fault Response", category: "Corrective Maintenance" },
};

// ─── AI Analysis Modal ────────────────────────────────────────────────────────
function AIAnalysisModal({ alarm, onClose, onCreateWO }: {
  alarm: Alarm;
  onClose: () => void;
  onCreateWO: () => void;
}) {
  const nav = useNavigate();
  const [analyzing, setAnalyzing] = useState(true);
  const analysis = AI_ANALYSIS[alarm.id];
  const relatedSop = ALARM_SOP_MAP[alarm.id] ?? null;

  useEffect(() => {
    const t = setTimeout(() => setAnalyzing(false), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="presentation" />
      <div className="modal-frame" style={{ maxWidth: 640 }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 11, color: SEV_COLOR[alarm.sev], fontWeight: 700, marginBottom: 2 }}>
              ⚠ {alarm.sev} · {alarm.asset}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{alarm.desc}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {analyzing ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ds-text-faint)" }}>
            <div className="aaa-spinner-wrap" style={{ margin: "0 auto 16px" }}>
              <svg className="aaa-spinner-ring" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="34" stroke="rgba(139,92,246,0.15)" strokeWidth="4" />
                <circle cx="40" cy="40" r="34" stroke="#a78bfa" strokeWidth="4" strokeDasharray="60 154" strokeLinecap="round" />
              </svg>
              <div className="aaa-spinner-brain" style={{ fontSize: 20 }}>✦</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--ds-text)" }}>Analyzing alarm context...</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Querying asset history, SCADA data and engineering knowledge base</div>
          </div>
        ) : analysis ? (
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(139,92,246,0.08)", borderRadius: 6, border: "1px solid rgba(139,92,246,0.2)" }}>
              <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>✦ AI Confidence: {analysis.confidence}%</span>
              <span style={{ fontSize: 11, color: "var(--ds-text-faint)", marginLeft: "auto" }}>{alarm.time} · {alarm.asset}</span>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>AI Root Cause Analysis</div>
              <p style={{ fontSize: 12, color: "var(--ds-text-muted)", lineHeight: 1.7, margin: 0 }}>{analysis.summary}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>⚡ Immediate Actions</div>
                <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                  {analysis.immediate.map((s, i) => <li key={i} style={{ fontSize: 11.5, color: "var(--ds-text-muted)", lineHeight: 1.5 }}>{s}</li>)}
                </ol>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>✓ Preventive Actions</div>
                <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 5 }}>
                  {analysis.preventive.map((s, i) => <li key={i} style={{ fontSize: 11.5, color: "var(--ds-text-muted)", lineHeight: 1.5 }}>{s}</li>)}
                </ol>
              </div>
            </div>

            {/* Related SOP from library */}
            {relatedSop && (
              <div
                onClick={() => nav("/documents")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.22)",
                  borderRadius: 6, cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.14)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(167,139,250,0.07)")}
              >
                <span style={{ fontSize: 14 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Related SOP in Library
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)", marginTop: 1 }}>
                    {relatedSop.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{relatedSop.category}</div>
                </div>
                <span style={{ fontSize: 11, color: "#a78bfa", whiteSpace: "nowrap" }}>View SOP →</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="ai-ack-btn" onClick={onClose}>✓ Acknowledge</button>
              <button className="ai-wo-btn" onClick={() => { onClose(); onCreateWO(); }}>🔧 Create Work Order</button>
              <button
                onClick={() => nav("/documents")}
                style={{ marginLeft: "auto", fontSize: 11, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "0 12px", cursor: "pointer", fontWeight: 600 }}
              >
                SOP Library →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px", fontSize: 12, color: "var(--ds-text-faint)", textAlign: "center" }}>
            No AI analysis available for this alarm type. Use Create Work Order to assign manually.
            <div style={{ marginTop: 12 }}>
              <button className="ai-wo-btn" onClick={() => { onClose(); onCreateWO(); }}>🔧 Create Work Order</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SiteAlarmManagement() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [tick, setTick]         = useState(0);
  const [search, setSearch]     = useState("");
  const [sevFilter, setSev]     = useState("All Severities");
  const [stateFilter, setSt]    = useState("Active");
  const [ackSet, setAckSet]     = useState<Set<string>>(new Set());
  const [sound, setSound]       = useState(true);
  const [aiAlarm, setAiAlarm]   = useState<Alarm | null>(null);
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);
  const [woCreated, setWoCreated] = useState<Set<string>>(new Set());

  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const alarms = useMemo(() => {
    return MOCK_ALARMS.filter(a => {
      if (stateFilter === "Active" && ackSet.has(a.id)) return false;
      if (stateFilter === "Acknowledged" && !ackSet.has(a.id)) return false;
      if (sevFilter !== "All Severities" && a.sev !== sevFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.asset.toLowerCase().includes(q) && !a.desc.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [search, sevFilter, stateFilter, ackSet]);

  const critical = MOCK_ALARMS.filter(a => a.sev === "CRITICAL" && !ackSet.has(a.id)).length;
  const major    = MOCK_ALARMS.filter(a => a.sev === "MAJOR"    && !ackSet.has(a.id)).length;
  const minor    = MOCK_ALARMS.filter(a => a.sev === "MINOR"    && !ackSet.has(a.id)).length;

  function openWO(a: Alarm) {
    setWoPreset({
      title:       `[Alarm] ${a.desc} — ${a.asset}`,
      asset:       a.asset,
      priority:    a.sev === "CRITICAL" ? "Critical" : a.sev === "MAJOR" ? "High" : "Medium",
      type:        a.sev === "CRITICAL" ? "Emergency" : "Corrective",
      description: `Alarm ${a.id}: ${a.desc} on ${a.asset}. Triggered at ${a.time}. Duration: ${fmtDur(a.baseSec + tick)}.`,
      steps:       AI_ANALYSIS[a.id]?.immediate ?? [`Inspect ${a.asset}`, "Review SCADA data", "Document findings and clear alarm"],
      siteId:      site.id,
    });
  }

  return (
    <div className="ae-page">
      {/* ── Header ── */}
      <div className="ae-topbar">
        <div className="ae-sev-chips">
          {critical > 0 && <span className="ae-sev-chip critical">● {critical} CRITICAL</span>}
          {major    > 0 && <span className="ae-sev-chip major">● {major} MAJOR</span>}
          {minor    > 0 && <span className="ae-sev-chip minor">● {minor} WARN</span>}
          {critical + major + minor === 0 && <span className="ae-sev-chip ok">✓ No Active Alarms</span>}
        </div>
        <div style={{ flex:1 }} />
        <button
          className={`ae-icon-btn${sound ? "" : " muted"}`}
          title={sound ? "Mute alarm sound" : "Enable alarm sound"}
          onClick={() => setSound(s => !s)}
        >
          {sound ? "🔔" : "🔕"}
        </button>
        <button
          className="ae-action-btn"
          onClick={() => exportCSV(alarms, site.name, tick)}
          title="Export visible alarms to CSV"
        >
          ↓ Export
        </button>
        <button
          className="ae-ack-all-btn"
          onClick={() => setAckSet(new Set(MOCK_ALARMS.map(a => a.id)))}
          disabled={critical + major + minor === 0}
          style={{ opacity: critical + major + minor === 0 ? 0.4 : 1 }}
        >
          ✓ Ack All
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="ae-filter-row">
        <div className="ae-search-wrap">
          <span className="ae-search-ico">⌕</span>
          <input
            className="ae-search"
            placeholder="Search asset, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="ae-select" value={sevFilter} onChange={e => setSev(e.target.value)}>
          {["All Severities","CRITICAL","MAJOR","MINOR"].map(v => <option key={v}>{v}</option>)}
        </select>
        <select className="ae-select" value={stateFilter} onChange={e => setSt(e.target.value)}>
          {["Active","Acknowledged","All States"].map(v => <option key={v}>{v}</option>)}
        </select>
        <span className="ae-count">{alarms.length} alarm{alarms.length !== 1 ? "s" : ""}</span>
        <span className="ae-site-label">{site.name}</span>
      </div>

      {/* ── Table ── */}
      <div className="ae-table-wrap">
        <table className="ae-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>SEVERITY</th>
              <th>ASSET</th>
              <th>DESCRIPTION</th>
              <th>DURATION</th>
              <th>STATE</th>
              <th>AI / WO</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {alarms.length === 0 ? (
              <tr><td colSpan={8} className="ae-empty">No alarms match the current filters</td></tr>
            ) : alarms.map(a => {
              const isAck = ackSet.has(a.id);
              return (
                <tr key={a.id} className="ae-row" style={{ opacity: isAck ? 0.6 : 1 }}>
                  <td className="ae-ts">{a.time}</td>
                  <td>
                    <span className="ae-sev-label" style={{ color: SEV_COLOR[a.sev], background: SEV_BG[a.sev] }}>
                      {a.sev}
                    </span>
                  </td>
                  <td className="ae-asset">{a.asset}</td>
                  <td className="ae-desc">{a.desc}</td>
                  <td className="ae-duration">{fmtDur(a.baseSec + tick)}</td>
                  <td>
                    <span className={isAck ? "ae-ack-chip" : "ae-active-chip"}>
                      {isAck ? "ACK" : "ACTIVE"}
                    </span>
                  </td>
                  <td>
                    <div className="ae-icons">
                      {a.hasAI && (
                        <button
                          className="ae-ai-btn"
                          title="AI Root Cause Analysis"
                          onClick={() => setAiAlarm(a)}
                        >
                          ⊕
                        </button>
                      )}
                      {(a.hasWO || a.hasAI) && (
                        woCreated.has(a.id) ? (
                          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>✓ WO</span>
                        ) : (
                          <button
                            className="ae-wo-btn-ico"
                            title="Create Work Order"
                            onClick={() => openWO(a)}
                          >
                            🔧
                          </button>
                        )
                      )}
                    </div>
                  </td>
                  <td>
                    {!isAck ? (
                      <button
                        className="ae-action-btn"
                        style={{ fontSize: 10, height: 22, padding: "0 8px" }}
                        onClick={() => setAckSet(prev => new Set([...prev, a.id]))}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <button
                        className="ae-action-btn"
                        style={{ fontSize: 10, height: 22, padding: "0 8px", opacity: 0.6 }}
                        onClick={() => setAckSet(prev => { const n = new Set(prev); n.delete(a.id); return n; })}
                      >
                        Unack
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── AI Analysis Modal ── */}
      {aiAlarm && (
        <AIAnalysisModal
          alarm={aiAlarm}
          onClose={() => setAiAlarm(null)}
          onCreateWO={() => openWO(aiAlarm)}
        />
      )}

      {/* ── Work Order Modal ── */}
      <WorkOrderModal
        open={!!woPreset}
        preset={woPreset}
        onClose={() => setWoPreset(null)}
        onSubmit={() => {
          if (woPreset) {
            const alarm = MOCK_ALARMS.find(a => woPreset.asset === a.asset);
            if (alarm) setWoCreated(prev => new Set([...prev, alarm.id]));
          }
          setWoPreset(null);
        }}
      />
    </div>
  );
}
