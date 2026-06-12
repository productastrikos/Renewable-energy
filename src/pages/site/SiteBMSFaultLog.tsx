import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { KpiCard } from "../../components/shared/KpiCard";
import { ChartCard } from "../../components/shared/ChartCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, chartTooltipProps, axisProps, CHART_COLORS,
} from "../../utils/chartHelpers";
import { IcoBattery, IcoBell, IcoAlertTriangle, IcoActivity } from "../../components/shared/Icons";

interface BMSFault {
  id: string; module: string; cell?: string; rack: string;
  code: string; description: string;
  severity: "critical" | "warning" | "info";
  timestamp: string; duration: string;
  value: string; threshold: string;
  status: "active" | "acknowledged" | "resolved";
}

const FAULTS: BMSFault[] = [
  { id:"B01", rack:"Rack-3", module:"M-3-07", cell:"Cell 14", code:"OVP-001", description:"Cell over-voltage",            severity:"critical", timestamp:"Today 14:55", duration:"23m",  value:"4.22V",   threshold:"4.20V",  status:"active" },
  { id:"B02", rack:"Rack-1", module:"M-1-12", cell:undefined, code:"OTP-003", description:"Module over-temperature",       severity:"critical", timestamp:"Today 13:40", duration:"1h 38m",value:"46.2°C", threshold:"45°C",   status:"active" },
  { id:"B03", rack:"Rack-5", module:"M-5-03", cell:"Cell 7",  code:"UVP-002", description:"Cell under-voltage warning",   severity:"warning",  timestamp:"Today 12:10", duration:"3h 08m",value:"2.91V",  threshold:"3.00V",  status:"acknowledged" },
  { id:"B04", rack:"Rack-2", module:"M-2-09", cell:undefined, code:"SOH-010", description:"SOH degradation > 10% limit",  severity:"warning",  timestamp:"Today 09:30", duration:"5h 48m",value:"88.2%", threshold:"90%",    status:"acknowledged" },
  { id:"B05", rack:"Rack-4", module:"M-4-01", cell:"Cell 22", code:"ISL-004", description:"Cell internal short circuit (impedance)", severity:"warning", timestamp:"Today 08:15", duration:"7h 03m", value:"1.82mΩ", threshold:"2.0mΩ", status:"acknowledged" },
  { id:"B06", rack:"Rack-6", module:"M-6-11", cell:undefined, code:"IMB-007", description:"String current imbalance > 5%", severity:"info",    timestamp:"Today 07:00", duration:"8h 18m",value:"5.8%", threshold:"5.0%",   status:"active" },
  { id:"B07", rack:"Rack-1", module:"M-1-04", cell:undefined, code:"COM-100", description:"CAN bus communication loss",    severity:"info",    timestamp:"Yesterday 22:30", duration:"15h 48m", value:"Timeout", threshold:"N/A", status:"resolved" },
  { id:"B08", rack:"Rack-3", module:"M-3-14", cell:"Cell 3",  code:"OCP-005", description:"Cell over-current protection", severity:"critical", timestamp:"Yesterday 18:45", duration:"19h 33m", value:"48A",  threshold:"45A",  status:"resolved" },
];

const faultsByCategory = [
  { category: "Over-voltage",   count: 2, fill: CHART_COLORS.danger },
  { category: "Over-temp",      count: 3, fill: CHART_COLORS.warning },
  { category: "Under-voltage",  count: 1, fill: CHART_COLORS.sky },
  { category: "SOH Degr.",      count: 2, fill: CHART_COLORS.amber },
  { category: "Imbalance",      count: 4, fill: CHART_COLORS.violet },
  { category: "Comms",          count: 1, fill: CHART_COLORS.teal },
  { category: "Over-current",   count: 2, fill: CHART_COLORS.blue },
];

const SEV_COLOR = { critical: "#ef4444", warning: "#f59e0b", info: "#38bdf8" };
const SEV_BG    = { critical: "#ef444422", warning: "#f59e0b22", info: "#38bdf822" };
const ST_COLOR  = { active: "#ef4444", acknowledged: "#f59e0b", resolved: "#22c55e" };

export default function SiteBMSFaultLog() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const critical = FAULTS.filter(f => f.severity === "critical").length;
  const active   = FAULTS.filter(f => f.status === "active").length;

  const filtered = useMemo(() => FAULTS.filter(f => {
    if (sevFilter !== "all" && f.severity !== sevFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return f.module.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || f.rack.toLowerCase().includes(q);
    }
    return true;
  }), [search, sevFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard label="Active Faults"   value={active}                    unit={undefined} icon={<IcoBell width={14} height={14} />}          rag={active > 2 ? "danger" : active > 0 ? "warning" : "success"} trend={`${critical} critical`} trendDir="down" />
        <KpiCard label="Critical Faults" value={critical}                  unit={undefined} icon={<IcoAlertTriangle width={14} height={14} />} rag={critical > 0 ? "danger" : "success"} trend="Requires action" trendDir="down" />
        <KpiCard label="Racks Affected"  value={new Set(FAULTS.filter(f => f.status !== "resolved").map(f => f.rack)).size} unit={`/ 6 racks`} icon={<IcoBattery width={14} height={14} />} rag="warning" trend="3 impacted" trendDir="down" />
        <KpiCard label="Total Faults (7D)" value={FAULTS.length + 7}      unit={undefined} icon={<IcoActivity width={14} height={14} />}       rag="info" trend="+3 vs last week" trendDir="down" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        {/* Main fault table */}
        <div className="chart-card">
          <div className="chart-card-header">
            <span className="chart-card-title">BMS Fault Log — {site.name}</span>
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
              <div className="ae-search-wrap" style={{ width: 160 }}>
                <span className="ae-search-ico">⌕</span>
                <input className="ae-search" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {(["all","critical","warning","info"] as const).map(s => (
                <button key={s} onClick={() => setSevFilter(s)} className={`ae-filter-btn${sevFilter === s ? " active" : ""}`} style={{ fontSize: 10, textTransform: "capitalize" }}>{s === "all" ? "All" : s}</button>
              ))}
            </div>
          </div>
          <table className="ae-table" style={{ width: "100%", fontSize: 11 }}>
            <thead>
              <tr><th>Rack</th><th>Module</th><th>Cell</th><th>Code</th><th>Description</th><th>Value</th><th>Threshold</th><th>Severity</th><th>Since</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.rack}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 10 }}>{f.module}</td>
                  <td style={{ color: "var(--ds-text-faint)", fontSize: 10 }}>{f.cell ?? "—"}</td>
                  <td><code style={{ fontSize: 9, background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: 3 }}>{f.code}</code></td>
                  <td style={{ maxWidth: 200, fontSize: 11 }}>{f.description}</td>
                  <td style={{ color: SEV_COLOR[f.severity], fontWeight: 700 }}>{f.value}</td>
                  <td style={{ color: "var(--ds-text-faint)" }}>{f.threshold}</td>
                  <td>
                    <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: SEV_BG[f.severity], color: SEV_COLOR[f.severity] }}>
                      {f.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{f.timestamp}</td>
                  <td style={{ fontSize: 10, color: ST_COLOR[f.status], fontWeight: 600, textTransform: "capitalize" }}>● {f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fault breakdown chart */}
        <ChartCard title="Fault Categories (7D)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={faultsByCategory} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey="category" {...axisProps} width={85} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]} name="Faults">
                {faultsByCategory.map((d, i) => (
                  <rect key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Rack health grid */}
      <div className="chart-card">
        <div className="chart-card-header"><span className="chart-card-title">Rack Health Overview</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, padding: "10px 12px" }}>
          {["Rack-1","Rack-2","Rack-3","Rack-4","Rack-5","Rack-6"].map(rack => {
            const rackFaults = FAULTS.filter(f => f.rack === rack && f.status !== "resolved");
            const maxSev = rackFaults.some(f => f.severity === "critical") ? "critical" : rackFaults.some(f => f.severity === "warning") ? "warning" : rackFaults.length > 0 ? "info" : null;
            const color = maxSev ? SEV_COLOR[maxSev] : "#22c55e";
            return (
              <div key={rack} style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${color}44`, background: `${color}0d`, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ds-text)", marginBottom: 4 }}>{rack}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 2 }}>{rackFaults.length}</div>
                <div style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>
                  {rackFaults.length === 0 ? "Healthy" : `${rackFaults.length} fault${rackFaults.length > 1 ? "s" : ""}`}
                </div>
                <div style={{ width: "100%", background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 4, marginTop: 6 }}>
                  <div style={{ width: `${100 - rackFaults.length * 12}%`, height: "100%", borderRadius: 3, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
