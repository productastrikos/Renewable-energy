import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { IcoDroplets, IcoBell, IcoAlertTriangle, IcoCheckCircle } from "../../components/shared/Icons";

interface WaterAlert {
  id: string; parameter: string; location: string;
  current: string; threshold: string; deviation: string;
  severity: "critical" | "warning" | "info";
  triggered: string; status: "active" | "acknowledged" | "resolved";
  note: string;
}

const ALERTS: WaterAlert[] = [
  { id:"WA01", parameter:"Spillway Overflow Risk",  location:"Spillway Gate 1",   current:"EL 84.2m",   threshold:"EL 85.0m",   deviation:"+0.8m to limit",    severity:"warning",  triggered:"Today 09:45",    status:"active",       note:"Inflow exceeding design envelope. Monitor gate 2 opening." },
  { id:"WA02", parameter:"Minimum Operating Level", location:"Forebay Sensor",    current:"EL 82.4m",   threshold:"EL 80.0m",   deviation:"2.4m above min",    severity:"info",     triggered:"Today 06:00",    status:"acknowledged", note:"Level healthy. Trend shows gradual draw-down over next 7 days." },
  { id:"WA03", parameter:"High Turbidity",          location:"Intake Screen A",   current:"142 NTU",    threshold:"100 NTU",    deviation:"+42 NTU",           severity:"warning",  triggered:"Today 08:22",    status:"active",       note:"Turbidity elevated post-rainfall. Increased screen cleaning required." },
  { id:"WA04", parameter:"DO Level Low",            location:"Tailrace Monitor",  current:"5.1 mg/L",   threshold:"6.0 mg/L",   deviation:"−0.9 mg/L",         severity:"warning",  triggered:"Yesterday 22:10",status:"acknowledged", note:"Dissolved oxygen below ecological threshold. Aeration in progress." },
  { id:"WA05", parameter:"Flood Warning",           location:"Upstream Gauge",    current:"145% normal",threshold:"120% normal", deviation:"+25% normal flow",   severity:"critical", triggered:"Today 07:30",    status:"active",       note:"Upstream catchment recorded 85mm rain in 12h. Peak inflow expected in ~3h." },
  { id:"WA06", parameter:"Sedimentation Rate High", location:"Settling Basin",    current:"18 cm/month",threshold:"10 cm/month","deviation":"+8 cm/month",     severity:"info",     triggered:"2 days ago",     status:"acknowledged", note:"Seasonal sediment increase. Basin desilting scheduled for Q3." },
  { id:"WA07", parameter:"Ice Formation Risk",      location:"Penstock Inlet",    current:"2.1°C",      threshold:"3.0°C",      deviation:"−0.9°C to limit",   severity:"info",     triggered:"Yesterday 04:00",status:"resolved",     note:"Temperature recovered. Heating elements functioning normally." },
  { id:"WA08", parameter:"Tailwater Level High",    location:"Tailrace Exit",     current:"EL 38.6m",   threshold:"EL 40.0m",   deviation:"1.4m headroom",     severity:"info",     triggered:"Today 11:00",    status:"active",       note:"Tailwater elevation rising with downstream discharge. Reducing output." },
];

const SEV_COLOR = { critical: "#ef4444", warning: "#f59e0b", info: "#38bdf8" };
const SEV_BG    = { critical: "#ef444422", warning: "#f59e0b22", info: "#38bdf822" };
const ST_COLOR  = { active: "#ef4444", acknowledged: "#f59e0b", resolved: "#22c55e" };

export default function SiteWaterAlerts() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [sevFilter, setSevFilter]    = useState<"all" | "critical" | "warning" | "info">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "acknowledged" | "resolved">("all");

  const critical = ALERTS.filter(a => a.severity === "critical").length;
  const active   = ALERTS.filter(a => a.status === "active").length;
  const resolved = ALERTS.filter(a => a.status === "resolved").length;

  const filtered = useMemo(() => ALERTS.filter(a => {
    if (sevFilter !== "all" && a.severity !== sevFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  }), [sevFilter, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Active Alerts"    value={active}   unit={undefined} icon={<IcoBell width={14} height={14} />}          rag={active > 3 ? "danger" : active > 0 ? "warning" : "success"} trend={`${critical} critical`} trendDir="down" />
        <KpiCard label="Critical"         value={critical} unit={undefined} icon={<IcoAlertTriangle width={14} height={14} />} rag={critical > 0 ? "danger" : "success"} trend="Requires action" trendDir="down" />
        <KpiCard label="Resolved (24H)"   value={resolved} unit={undefined} icon={<IcoCheckCircle width={14} height={14} />}   rag="success" trend="Last 24h" trendDir="up" />
        <KpiCard label="Monitored Points" value={ALERTS.length} unit="sensors" icon={<IcoDroplets width={14} height={14} />}   rag="info" trend="All online" trendDir="up" />
      </div>

      {/* Flood warning banner */}
      {ALERTS.some(a => a.severity === "critical" && a.status === "active") && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#ef444415", border: "1px solid #ef444444", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <IcoAlertTriangle width={18} height={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>FLOOD WARNING ACTIVE — {site.name}</div>
            <div style={{ fontSize: 12, color: "var(--ds-text-muted)", lineHeight: 1.5 }}>
              Upstream gauge recording 145% of normal flow. Peak inflow wave expected in approximately 3 hours.
              Spillway Gate 1 operating at 35% — consider opening Gate 2 to manage reservoir level.
              Downstream communities have been notified per emergency protocol.
            </div>
          </div>
        </div>
      )}

      {/* Alerts table */}
      <div className="chart-card">
        <div className="chart-card-header">
          <span className="chart-card-title">Water Level & Environmental Alerts</span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {(["all","critical","warning","info"] as const).map(s => (
              <button key={s} onClick={() => setSevFilter(s)} className={`ae-filter-btn${sevFilter === s ? " active" : ""}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{s === "all" ? "All Sev." : s}</button>
            ))}
            {(["all","active","acknowledged","resolved"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`ae-filter-btn${statusFilter === s ? " active" : ""}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{s === "all" ? "All Status" : s}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filtered.map((a, i) => (
            <div key={a.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--ds-border)", background: i % 2 === 0 ? undefined : "rgba(255,255,255,0.01)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEV_COLOR[a.severity], flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ds-text)" }}>{a.parameter}</span>
                    <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: SEV_BG[a.severity], color: SEV_COLOR[a.severity], border: `1px solid ${SEV_COLOR[a.severity]}44` }}>
                      {a.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: ST_COLOR[a.status], fontWeight: 600, textTransform: "capitalize" }}>● {a.status}</span>
                    <span style={{ fontSize: 10, color: "var(--ds-text-faint)", marginLeft: "auto" }}>{a.triggered}</span>
                  </div>
                  <div style={{ display: "flex", gap: 20, marginBottom: 6, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11 }}><span style={{ color: "var(--ds-text-faint)" }}>Location: </span><span style={{ color: "var(--ds-text-muted)" }}>{a.location}</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "var(--ds-text-faint)" }}>Current: </span><span style={{ fontWeight: 700, color: SEV_COLOR[a.severity] }}>{a.current}</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "var(--ds-text-faint)" }}>Threshold: </span><span style={{ color: "var(--ds-text-muted)" }}>{a.threshold}</span></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: "var(--ds-text-faint)" }}>Deviation: </span><span style={{ color: SEV_COLOR[a.severity] }}>{a.deviation}</span></div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ds-text-faint)", lineHeight: 1.5, fontStyle: "italic" }}>{a.note}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {a.status === "active" && (
                    <button className="ae-action-btn" style={{ fontSize: 10, height: 24, padding: "0 8px" }}>Acknowledge</button>
                  )}
                  <button className="ae-action-btn" style={{ fontSize: 10, height: 24, padding: "0 8px" }}>Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px", fontSize: 10, color: "var(--ds-text-faint)", borderTop: "1px solid var(--ds-border)" }}>
          Showing {filtered.length} of {ALERTS.length} alerts · Data: Hydro SCADA + Environmental sensors · Refresh: 30s
        </div>
      </div>
    </div>
  );
}
