import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { WorkOrderModal, WOPreset } from "../../components/shared/WorkOrderModal";
import { IcoBell, IcoAlertTriangle, IcoActivity, IcoWrench } from "../../components/shared/Icons";
import { rag } from "../../utils/ragHelpers";

interface TurbineFault {
  id: string; turbine: string; component: string;
  code: string; description: string;
  severity: "critical" | "warning" | "info";
  startTime: string; duration: string;
  status: "active" | "acknowledged" | "resolved";
}

const FAULTS: TurbineFault[] = [
  { id:"TF01", turbine:"WTG-01", component:"Gearbox",       code:"GBX-4421", description:"Gearbox oil temperature high (89°C)",        severity:"critical", startTime:"Today 14:22", duration:"1h 12m", status:"active" },
  { id:"TF02", turbine:"WTG-03", component:"Pitch System",  code:"PIT-1102", description:"Pitch motor overload — Blade B",              severity:"critical", startTime:"Today 13:45", duration:"1h 49m", status:"active" },
  { id:"TF03", turbine:"WTG-07", component:"Generator",     code:"GEN-2210", description:"Generator bearing vibration elevated (8.2 mm/s)",severity:"warning", startTime:"Today 11:30", duration:"4h 04m", status:"acknowledged" },
  { id:"TF04", turbine:"WTG-02", component:"Converter",     code:"CNV-3301", description:"DC link voltage transient detected",           severity:"warning", startTime:"Today 09:15", duration:"5h 19m", status:"acknowledged" },
  { id:"TF05", turbine:"WTG-05", component:"Yaw System",    code:"YAW-0803", description:"Yaw misalignment > 8° for > 5 min",           severity:"warning", startTime:"Today 08:00", duration:"6h 34m", status:"active" },
  { id:"TF06", turbine:"WTG-09", component:"Anemometer",    code:"MET-0101", description:"Cup anemometer signal lost",                  severity:"info",    startTime:"Today 06:22", duration:"8h 12m", status:"acknowledged" },
  { id:"TF07", turbine:"WTG-04", component:"Nacelle",       code:"NAC-5502", description:"Nacelle temperature high (72°C)",              severity:"warning", startTime:"Yesterday 22:10", duration:"16h 24m", status:"acknowledged" },
  { id:"TF08", turbine:"WTG-06", component:"Tower",         code:"TWR-1001", description:"Tower vibration sensor – signal quality degraded",severity:"info", startTime:"Yesterday 18:30", duration:"20h 04m", status:"resolved" },
  { id:"TF09", turbine:"WTG-01", component:"Transformer",   code:"TRF-2201", description:"Transformer winding temperature (78°C)",       severity:"warning", startTime:"Yesterday 14:00", duration:"24h 34m", status:"resolved" },
  { id:"TF10", turbine:"WTG-08", component:"Brake System",  code:"BRK-0401", description:"Mechanical brake pad wear > 70%",              severity:"info",    startTime:"2 days ago",      duration:"48h",     status:"acknowledged" },
];

const SEV_COLOR = { critical: "#ef4444", warning: "#f59e0b", info: "#38bdf8" };
const SEV_BG    = { critical: "#ef444422", warning: "#f59e0b22", info: "#38bdf822" };
const ST_COLOR  = { active: "#ef4444", acknowledged: "#f59e0b", resolved: "#22c55e" };

export default function SiteTurbineFaultLog() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [faults, setFaults] = useState<TurbineFault[]>(FAULTS);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "acknowledged" | "resolved">("all");
  const [woPreset, setWoPreset] = useState<WOPreset | null>(null);

  function acknowledge(id: string) {
    setFaults(prev => prev.map(f => f.id === id ? { ...f, status: "acknowledged" as const } : f));
  }

  function openWO(f: TurbineFault) {
    setWoPreset({
      title:       `[Fault] ${f.description}`,
      asset:       f.turbine,
      priority:    f.severity === "critical" ? "Critical" : f.severity === "warning" ? "High" : "Medium",
      type:        f.severity === "critical" ? "Emergency" : "Corrective",
      description: `${f.component} fault on ${f.turbine}. Code: ${f.code}. Detected: ${f.startTime}.`,
      steps:       [`Inspect ${f.component} on ${f.turbine}`, `Review fault code ${f.code} in SCADA`, "Document findings and clear fault"],
      siteId:      site.id,
    });
  }

  function handleWOCreated(id: string) {
    setFaults(prev => prev.map(f => f.id === id ? { ...f, status: "resolved" as const } : f));
    setWoPreset(null);
  }

  const critical    = faults.filter(f => f.severity === "critical" && f.status !== "resolved").length;
  const active      = faults.filter(f => f.status === "active").length;
  const mtbf        = 847;
  const availability = +(100 - (active / 12) * 100 * 0.04).toFixed(1);

  const filtered = useMemo(() => faults.filter(f => {
    if (sevFilter !== "all" && f.severity !== sevFilter) return false;
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.turbine.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
    }
    return true;
  }), [faults, search, sevFilter, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Active Faults"    value={active}       unit={undefined}   icon={<IcoAlertTriangle width={14} height={14} />} rag={active > 3 ? "danger" : active > 0 ? "warning" : "success"} trend={`${critical} critical`} trendDir="down" />
        <KpiCard label="Critical Faults"  value={critical}     unit={undefined}   icon={<IcoBell width={14} height={14} />}          rag={critical > 0 ? "danger" : "success"} trend="Requires action" trendDir="down" />
        <KpiCard label="Fleet Availability" value={availability} unit="%"          icon={<IcoActivity width={14} height={14} />}      rag={rag(availability, 97, 94)} trend="-0.4%" trendDir="down" />
        <KpiCard label="MTBF"             value={mtbf}         unit="hrs"         icon={<IcoWrench width={14} height={14} />}        rag="info" trend="+12 hrs" trendDir="up" />
      </div>

      {/* Fault summary chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["WTG-01","WTG-02","WTG-03","WTG-04","WTG-05","WTG-06","WTG-07","WTG-08","WTG-09"].map(t => {
          const activeFaults = faults.filter(f => f.turbine === t && f.status === "active");
          const maxSev = activeFaults.some(f => f.severity === "critical") ? "critical" : activeFaults.some(f => f.severity === "warning") ? "warning" : activeFaults.length > 0 ? "info" : null;
          return (
            <div key={t} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--ds-border)", background: maxSev ? SEV_BG[maxSev] : "var(--ds-surface-2)", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: maxSev ? SEV_COLOR[maxSev] : "#22c55e", flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: "var(--ds-text)" }}>{t}</span>
              {maxSev && <span style={{ color: SEV_COLOR[maxSev], fontSize: 10 }}>{activeFaults.length} fault{activeFaults.length > 1 ? "s" : ""}</span>}
            </div>
          );
        })}
      </div>

      {/* Fault table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">Turbine Fault Log — {site.name}</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
            <div className="ae-search-wrap" style={{ width: 180 }}>
              <span className="ae-search-ico">⌕</span>
              <input className="ae-search" placeholder="Search faults..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {(["all","critical","warning","info"] as const).map(s => (
              <button key={s} onClick={() => setSevFilter(s)} className={`ae-filter-btn${sevFilter === s ? " active" : ""}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{s === "all" ? "All Sev." : s}</button>
            ))}
            {(["all","active","acknowledged","resolved"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`ae-filter-btn${statusFilter === s ? " active" : ""}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{s === "all" ? "All Status" : s}</button>
            ))}
          </div>
        </div>
        <table className="ae-table" style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr><th>Turbine</th><th>Component</th><th>Fault Code</th><th>Description</th><th>Severity</th><th>Since</th><th>Duration</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 700, color: "var(--ds-text)" }}>{f.turbine}</td>
                <td>{f.component}</td>
                <td><code style={{ fontSize: 10, background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3 }}>{f.code}</code></td>
                <td style={{ maxWidth: 260 }}>{f.description}</td>
                <td>
                  <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: SEV_BG[f.severity], color: SEV_COLOR[f.severity], border: `1px solid ${SEV_COLOR[f.severity]}44` }}>
                    {f.severity.toUpperCase()}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>{f.startTime}</td>
                <td style={{ fontSize: 11 }}>{f.duration}</td>
                <td>
                  <span style={{ fontSize: 10, fontWeight: 600, color: ST_COLOR[f.status], textTransform: "capitalize" }}>● {f.status}</span>
                </td>
                <td>
                  {f.status === "active" && (
                    <button className="ae-action-btn" style={{ fontSize: 10, height: 22, padding: "0 8px" }} onClick={() => acknowledge(f.id)}>Acknowledge</button>
                  )}
                  {f.status === "acknowledged" && (
                    <button className="ae-action-btn" style={{ fontSize: 10, height: 22, padding: "0 8px", background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.4)", color: "#c4b5fd" }} onClick={() => openWO(f)}>Create WO</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 20, color: "var(--ds-text-faint)" }}>No faults match the current filter</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--ds-text-faint)", borderTop: "1px solid var(--ds-border)", display: "flex", gap: 16 }}>
          <span>Showing {filtered.length} of {faults.length} faults</span>
          <span style={{ marginLeft: "auto" }}>Data source: WTG SCADA · IEC 61400-25</span>
        </div>
      </div>

      <WorkOrderModal
        open={!!woPreset}
        preset={woPreset}
        onClose={() => setWoPreset(null)}
        onSubmit={() => {
          const fault = faults.find(f =>
            woPreset?.asset === f.turbine && f.status === "acknowledged"
          );
          if (fault) handleWOCreated(fault.id);
        }}
      />
    </div>
  );
}
