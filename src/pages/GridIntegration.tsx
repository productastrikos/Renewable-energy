import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
} from "recharts";
import { useLiveValue } from "../hooks/useLiveData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FreqPoint { time: string; freq: number; }
interface RampPoint { time: string; ramp: number; }
interface CurtailEvent {
  id: string; datetime: string; site: string;
  type: "Scheduled" | "Forced" | "Frequency" | "Congestion";
  duration_min: number; mw: number; mwh: number; revenue: number;
  reason: string; status: "Closed" | "Active";
}
interface FaultEvent {
  id: string; datetime: string; site: string;
  type: "Voltage Dip" | "LVRT" | "Over-frequency" | "Under-frequency" | "Phase Imbalance";
  severity: "Critical" | "Major" | "Minor";
  value: string; duration_ms: number; recovery_ms: number;
  lvrt_success?: boolean; status: "Recovered" | "Investigating" | "Active";
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RAMP_LIMIT = 10;   // MW/min
const PF_LIMIT   = 0.95;

// ─── Static data ──────────────────────────────────────────────────────────────
const SITE_Q = [
  { shortName: "Al Dhafra",   q: 18.2, pf: 0.973, compliant: true  },
  { shortName: "MBR Solar",   q: 12.1, pf: 0.951, compliant: true  },
  { shortName: "NEOM Wind",   q: 28.5, pf: 0.921, compliant: false },
  { shortName: "Jubail BESS", q:  8.4, pf: 0.988, compliant: true  },
  { shortName: "Duqm",        q: 22.7, pf: 0.947, compliant: false },
  { shortName: "Ibri Solar",  q: 11.2, pf: 0.969, compliant: true  },
];

const CURTAILMENT: CurtailEvent[] = [
  { id:"CUR-001", datetime:"2026-06-12 06:30", site:"Al Dhafra Solar Park",  type:"Scheduled",  duration_min:60,  mw:45,  mwh:45.0,  revenue:9900,  reason:"TSO maintenance window 06:00–07:00",   status:"Closed" },
  { id:"CUR-002", datetime:"2026-06-12 09:15", site:"NEOM Wind Farm",        type:"Forced",     duration_min:25,  mw:120, mwh:50.0,  revenue:11000, reason:"Grid congestion N-1 event",             status:"Closed" },
  { id:"CUR-003", datetime:"2026-06-12 11:42", site:"MBR Solar Park",        type:"Frequency",  duration_min:8,   mw:60,  mwh:8.0,   revenue:1760,  reason:"Over-frequency 50.32 Hz — auto curtail",status:"Closed" },
  { id:"CUR-004", datetime:"2026-06-11 14:00", site:"Duqm Renewable Park",   type:"Scheduled",  duration_min:120, mw:80,  mwh:160.0, revenue:35200, reason:"Transmission line maintenance",          status:"Closed" },
  { id:"CUR-005", datetime:"2026-06-11 17:30", site:"NEOM Wind Farm",        type:"Congestion", duration_min:40,  mw:200, mwh:133.3, revenue:29333, reason:"400 kV interconnect at 98% capacity",    status:"Closed" },
  { id:"CUR-006", datetime:"2026-06-10 08:00", site:"Al Dhafra Solar Park",  type:"Forced",     duration_min:15,  mw:90,  mwh:22.5,  revenue:4950,  reason:"Emergency frequency response",           status:"Closed" },
  { id:"CUR-007", datetime:"2026-06-10 13:20", site:"Ibri Solar Station",    type:"Scheduled",  duration_min:30,  mw:40,  mwh:20.0,  revenue:4400,  reason:"Grid code reactive power test window",   status:"Closed" },
  { id:"CUR-008", datetime:"2026-06-09 10:00", site:"NEOM Wind Farm",        type:"Forced",     duration_min:55,  mw:150, mwh:137.5, revenue:30250, reason:"Transmission fault — N-2 contingency",  status:"Closed" },
];

const FAULTS: FaultEvent[] = [
  { id:"GFR-001", datetime:"2026-06-12 08:42:11", site:"MBR Solar Park",        type:"Voltage Dip",     severity:"Major",    value:"0.72 pu",  duration_ms:340,   recovery_ms:820,  lvrt_success:true,  status:"Recovered"     },
  { id:"GFR-002", datetime:"2026-06-12 11:38:55", site:"Al Dhafra Solar Park",  type:"Over-frequency",  severity:"Minor",    value:"50.32 Hz", duration_ms:8200,  recovery_ms:1200, status:"Recovered"     },
  { id:"GFR-003", datetime:"2026-06-11 17:22:04", site:"NEOM Wind Farm",        type:"LVRT",            severity:"Critical", value:"0.45 pu",  duration_ms:625,   recovery_ms:1450, lvrt_success:true,  status:"Recovered"     },
  { id:"GFR-004", datetime:"2026-06-11 14:05:33", site:"Duqm Renewable Park",   type:"Under-frequency", severity:"Major",    value:"49.74 Hz", duration_ms:15000, recovery_ms:2000, status:"Recovered"     },
  { id:"GFR-005", datetime:"2026-06-11 09:17:48", site:"MBR Solar Park",        type:"Phase Imbalance", severity:"Minor",    value:"3.8 %",    duration_ms:0,     recovery_ms:0,    status:"Investigating" },
  { id:"GFR-006", datetime:"2026-06-10 16:44:22", site:"Al Dhafra Solar Park",  type:"Voltage Dip",     severity:"Major",    value:"0.81 pu",  duration_ms:180,   recovery_ms:520,  lvrt_success:true,  status:"Recovered"     },
  { id:"GFR-007", datetime:"2026-06-10 07:55:01", site:"Jubail Battery Storage",type:"Under-frequency", severity:"Minor",    value:"49.83 Hz", duration_ms:3200,  recovery_ms:800,  status:"Recovered"     },
  { id:"GFR-008", datetime:"2026-06-09 13:30:19", site:"NEOM Wind Farm",        type:"LVRT",            severity:"Major",    value:"0.61 pu",  duration_ms:410,   recovery_ms:960,  lvrt_success:false, status:"Investigating" },
  { id:"GFR-009", datetime:"2026-06-09 10:12:44", site:"Ibri Solar Station",    type:"Voltage Dip",     severity:"Minor",    value:"0.88 pu",  duration_ms:95,    recovery_ms:310,  lvrt_success:true,  status:"Recovered"     },
  { id:"GFR-010", datetime:"2026-06-08 19:03:27", site:"Duqm Renewable Park",   type:"Phase Imbalance", severity:"Major",    value:"5.1 %",    duration_ms:0,     recovery_ms:0,    status:"Recovered"     },
];

// ─── Color maps ───────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = { Critical:"#ef4444", Major:"#f59e0b", Minor:"#facc15" };
const CURT_COLOR: Record<string, string> = { Scheduled:"#3b82f6", Forced:"#ef4444", Frequency:"#f59e0b", Congestion:"#a78bfa" };
const STAT_COLOR: Record<string, string> = { Recovered:"#22c55e", Closed:"#22c55e", Investigating:"#f59e0b", Active:"#ef4444" };

// ─── Data generators ──────────────────────────────────────────────────────────
function buildFreqSeries(): FreqPoint[] {
  const n = 144, now = Date.now(), step = (24 * 3_600_000) / n;
  let freq = 50.0;
  return Array.from({ length: n }, (_, i) => {
    const t  = new Date(now - (n - 1 - i) * step);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    freq = freq * 0.85 + (50.0 + (Math.random() - 0.5) * 0.1) * 0.15;
    if (Math.random() < 0.025) freq += (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.15);
    freq = Math.max(49.4, Math.min(50.6, freq));
    return { time: `${hh}:${mm}`, freq: +freq.toFixed(3) };
  });
}

function buildRampSeries(): RampPoint[] {
  const n = 96, now = Date.now(), step = (24 * 3_600_000) / n;
  return Array.from({ length: n }, (_, i) => {
    const t  = new Date(now - (n - 1 - i) * step);
    const hh = String(t.getHours()).padStart(2, "0");
    const mm = String(t.getMinutes()).padStart(2, "0");
    const h  = t.getHours();
    const solar = h >= 6 && h <= 18 ? Math.sin(Math.PI * (h - 6) / 12) : 0.05;
    const sign  = Math.random() > 0.5 ? 1 : -1;
    const ramp  = +(sign * (solar * 8 + Math.abs((Math.random() - 0.5) * 10))).toFixed(1);
    return { time: `${hh}:${mm}`, ramp };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Panel({ title, badge, badgeColor, children, action }: {
  title: string; badge?: string; badgeColor?: string;
  children: ReactNode; action?: ReactNode;
}) {
  return (
    <div style={{ background:"var(--ds-panel)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", flexWrap:"wrap" }}>
        <span style={{ fontSize:12, fontWeight:600, color:"var(--ds-text-muted)", textTransform:"uppercase", letterSpacing:"0.5px", flex:1, whiteSpace:"nowrap" }}>{title}</span>
        {badge && (
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, whiteSpace:"nowrap",
            background:(badgeColor ?? "#3b82f6") + "22", color:badgeColor ?? "#3b82f6",
            border:`1px solid ${(badgeColor ?? "#3b82f6")}44` }}>{badge}</span>
        )}
        {action}
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, unit, sub, color }: {
  label: string; value: string | number; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ background:"var(--ds-surface)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontSize:11, color:"var(--ds-text-faint)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
        <span style={{ fontSize:22, fontWeight:700, color:color ?? "var(--ds-text)", lineHeight:1 }}>{value}</span>
        {unit && <span style={{ fontSize:12, color:"var(--ds-text-faint)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:11, color:"var(--ds-text-faint)", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function FilterBar({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
            border:"1px solid rgba(255,255,255,0.1)",
            background: value === o ? "rgba(91,141,224,0.2)" : "transparent",
            color: value === o ? "#5b8de0" : "var(--ds-text-faint)" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

const TT: React.CSSProperties = { background:"#12121e", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"8px 12px", fontSize:11 };

// ─── Main page ────────────────────────────────────────────────────────────────
export default function GridIntegration() {
  const [qView,   setQView]   = useState<"pf" | "q">("pf");
  const [cFilter, setCFilter] = useState("All");
  const [fFilter, setFFilter] = useState("All");
  const [freqData, setFreqData] = useState<FreqPoint[]>(() => buildFreqSeries());
  const [rampData]             = useState<RampPoint[]>(() => buildRampSeries());

  const liveFreq = useLiveValue(50.0, 0.003, 3000, 3);

  // Tick frequency series every 3 s
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const ts  = now.toLocaleTimeString("en-GB", { hour12: false });
      setFreqData(prev => {
        const last = prev[prev.length - 1].freq;
        const next = Math.max(49.4, Math.min(50.6, last * 0.9 + (50.0 + (Math.random() - 0.5) * 0.08) * 0.1));
        return [...prev.slice(1), { time: ts, freq: +next.toFixed(3) }];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Derived KPIs
  const freqOk      = liveFreq >= 49.8 && liveFreq <= 50.2;
  const freqWarn    = !freqOk && liveFreq >= 49.5 && liveFreq <= 50.5;
  const freqColor   = freqOk ? "#22c55e" : freqWarn ? "#f59e0b" : "#ef4444";

  const curtToday   = CURTAILMENT.filter(e => e.datetime.startsWith("2026-06-12"));
  const mwhToday    = curtToday.reduce((a, e) => a + e.mwh, 0);
  const revToday    = curtToday.reduce((a, e) => a + e.revenue, 0);

  const rampViolations = useMemo(() => rampData.filter(d => Math.abs(d.ramp) > RAMP_LIMIT).length, [rampData]);

  const lvrtEvents  = FAULTS.filter(f => f.type === "LVRT" || f.type === "Voltage Dip");
  const lvrtSuccess = lvrtEvents.filter(f => f.lvrt_success === true).length;
  const lvrtRate    = lvrtEvents.length ? Math.round((lvrtSuccess / lvrtEvents.length) * 100) : 100;
  const lvrtColor   = lvrtRate === 100 ? "#22c55e" : lvrtRate >= 80 ? "#f59e0b" : "#ef4444";

  const filteredCurt   = cFilter === "All" ? CURTAILMENT : CURTAILMENT.filter(e => e.type === cFilter);
  const filteredFaults = fFilter === "All" ? FAULTS      : FAULTS.filter(e => e.type === fFilter);

  const curtBySite = useMemo(() => {
    const map: Record<string, { name: string; Scheduled: number; Forced: number; Frequency: number; Congestion: number }> = {};
    CURTAILMENT.forEach(e => {
      const key = e.site.split(" ").slice(0, 2).join(" ");
      if (!map[key]) map[key] = { name: key, Scheduled:0, Forced:0, Frequency:0, Congestion:0 };
      map[key][e.type as "Scheduled" | "Forced" | "Frequency" | "Congestion"] += e.mwh;
    });
    return Object.values(map);
  }, []);

  const xInterval = Math.floor(freqData.length / 8);

  return (
    <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:16, overflowY:"auto" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:700, color:"var(--ds-text)", margin:0 }}>Grid Integration & Power Quality</h1>
          <p style={{ fontSize:12, color:"var(--ds-text-faint)", margin:"2px 0 0" }}>
            Real-time grid compliance · 6 sites · GCC grid code
          </p>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#22c55e" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block" }} />
          Live
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KpiCard label="Grid Frequency" value={liveFreq.toFixed(3)} unit="Hz"
          sub={freqOk ? "Within normal band (49.8–50.2)" : "⚠ Outside normal band"}
          color={freqColor} />
        <KpiCard label="Curtailment Today" value={mwhToday.toFixed(1)} unit="MWh"
          sub={`Revenue lost: $${revToday.toLocaleString()}`} color="#f59e0b" />
        <KpiCard label="LVRT Compliance" value={`${lvrtRate}%`}
          sub={`${lvrtSuccess} of ${lvrtEvents.length} events rode through`}
          color={lvrtColor} />
        <KpiCard label="Ramp Violations (24h)" value={rampViolations} unit="events"
          sub={`Grid code limit: ±${RAMP_LIMIT} MW/min`}
          color={rampViolations === 0 ? "#22c55e" : rampViolations <= 3 ? "#f59e0b" : "#ef4444"} />
      </div>

      {/* Row 1: Frequency chart + Reactive power */}
      <div style={{ display:"grid", gridTemplateColumns:"60fr 40fr", gap:16 }}>

        <Panel title="Grid Frequency — Live 24h" badge={`${liveFreq.toFixed(3)} Hz`} badgeColor={freqColor}>
          <div style={{ height:240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={freqData} margin={{ top:4, right:12, bottom:0, left:-10 }}>
                <ReferenceArea y1={49.8}  y2={50.2}  fill="rgba(34,197,94,0.07)"   />
                <ReferenceArea y1={49.5}  y2={49.8}  fill="rgba(245,158,11,0.07)"  />
                <ReferenceArea y1={50.2}  y2={50.5}  fill="rgba(245,158,11,0.07)"  />
                <ReferenceArea y1={49.4}  y2={49.5}  fill="rgba(239,68,68,0.10)"   />
                <ReferenceArea y1={50.5}  y2={50.6}  fill="rgba(239,68,68,0.10)"   />
                <ReferenceLine y={50.0} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 4"
                  label={{ value:"50.0 Hz", fill:"rgba(255,255,255,0.28)", fontSize:9, position:"insideTopRight" }} />
                <ReferenceLine y={49.8} stroke="rgba(245,158,11,0.3)" strokeDasharray="3 3" />
                <ReferenceLine y={50.2} stroke="rgba(245,158,11,0.3)" strokeDasharray="3 3" />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill:"var(--ds-text-faint)", fontSize:9 }}
                  tickLine={false} axisLine={false} interval={xInterval} />
                <YAxis domain={[49.4, 50.6]} tick={{ fill:"var(--ds-text-faint)", fontSize:9 }}
                  tickLine={false} axisLine={false} width={40} tickFormatter={v => v.toFixed(1)} />
                <Tooltip contentStyle={TT} labelStyle={{ color:"var(--ds-text-faint)" }}
                  formatter={(v: number) => [`${v.toFixed(3)} Hz`, "Frequency"]} />
                <Line type="monotone" dataKey="freq" stroke="#38bdf8" strokeWidth={1.5}
                  dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", gap:14, marginTop:8, fontSize:10, color:"var(--ds-text-faint)", flexWrap:"wrap" }}>
            {[["rgba(34,197,94,0.35)","49.8–50.2 Normal"],["rgba(245,158,11,0.35)","49.5–49.8 / 50.2–50.5 Warning"],["rgba(239,68,68,0.4)","<49.5 / >50.5 Critical"]].map(([bg, lbl]) => (
              <span key={lbl} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:10, height:4, background:bg, display:"inline-block", borderRadius:2 }} />{lbl}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Reactive Power & Power Factor"
          action={
            <div style={{ display:"flex", gap:4 }}>
              {(["pf","q"] as const).map(v => (
                <button key={v} onClick={() => setQView(v)}
                  style={{ fontSize:10, padding:"2px 8px", borderRadius:4, cursor:"pointer",
                    border:"1px solid rgba(255,255,255,0.1)",
                    background: qView === v ? "rgba(91,141,224,0.2)" : "transparent",
                    color: qView === v ? "#5b8de0" : "var(--ds-text-faint)" }}>
                  {v === "pf" ? "Power Factor" : "Q (MVAr)"}
                </button>
              ))}
            </div>
          }>
          <div style={{ height:200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SITE_Q} margin={{ top:4, right:12, bottom:0, left:-20 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="shortName" tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false}
                  domain={qView === "pf" ? [0.85, 1.0] : [0, 35]}
                  tickFormatter={v => qView === "pf" ? v.toFixed(2) : String(v)} />
                <Tooltip contentStyle={TT}
                  formatter={(v: number) => [qView === "pf" ? v.toFixed(3) : `${v} MVAr`, qView === "pf" ? "Power Factor" : "Q"]} />
                <ReferenceLine y={qView === "pf" ? PF_LIMIT : 15} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value: qView === "pf" ? "Limit 0.95" : "Limit 15 MVAr", fill:"#f59e0b", fontSize:9, position:"insideTopRight" }} />
                <Bar dataKey={qView === "pf" ? "pf" : "q"} radius={[3,3,0,0]}>
                  {SITE_Q.map((s, i) => <Cell key={i} fill={s.compliant ? "#22c55e" : "#ef4444"} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:5, marginTop:10 }}>
            {SITE_Q.map(s => (
              <div key={s.shortName} style={{ display:"flex", justifyContent:"space-between", padding:"4px 8px",
                borderRadius:4, background:"rgba(255,255,255,0.03)", fontSize:10 }}>
                <span style={{ color:"var(--ds-text-muted)" }}>{s.shortName}</span>
                <span style={{ color:s.compliant ? "#22c55e" : "#ef4444", fontWeight:600 }}>
                  {s.pf.toFixed(3)} {s.compliant ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 2: Ramp rate + Curtailment by site */}
      <div style={{ display:"grid", gridTemplateColumns:"55fr 45fr", gap:16 }}>

        <Panel title="Ramp Rate Compliance — 24h"
          badge={`${rampViolations} violation${rampViolations !== 1 ? "s" : ""}`}
          badgeColor={rampViolations === 0 ? "#22c55e" : "#ef4444"}>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rampData} margin={{ top:4, right:12, bottom:0, left:-10 }}>
                <ReferenceArea y1={0}            y2={RAMP_LIMIT}  fill="rgba(34,197,94,0.05)"  />
                <ReferenceArea y1={-RAMP_LIMIT}  y2={0}           fill="rgba(34,197,94,0.05)"  />
                <ReferenceArea y1={RAMP_LIMIT}   y2={22}          fill="rgba(239,68,68,0.06)"  />
                <ReferenceArea y1={-22}          y2={-RAMP_LIMIT} fill="rgba(239,68,68,0.06)"  />
                <ReferenceLine y={RAMP_LIMIT}  stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1}
                  label={{ value:`+${RAMP_LIMIT} MW/min`, fill:"#ef4444", fontSize:9, position:"insideTopRight" }} />
                <ReferenceLine y={-RAMP_LIMIT} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1}
                  label={{ value:`−${RAMP_LIMIT} MW/min`, fill:"#ef4444", fontSize:9, position:"insideBottomRight" }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false} interval={11} />
                <YAxis tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false}
                  domain={[-22, 22]} width={32} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${v} MW/min`, "Ramp Rate"]} />
                <Bar dataKey="ramp" maxBarSize={8} radius={[2,2,0,0]}>
                  {rampData.map((d, i) => (
                    <Cell key={i} fill={Math.abs(d.ramp) > RAMP_LIMIT ? "#ef4444" : "#22c55e"} fillOpacity={0.75} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", gap:12, marginTop:8, fontSize:10, color:"var(--ds-text-faint)" }}>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:4, background:"rgba(34,197,94,0.5)", display:"inline-block", borderRadius:2 }} />Compliant</span>
            <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:4, background:"rgba(239,68,68,0.5)", display:"inline-block", borderRadius:2 }} />Violation &gt;±{RAMP_LIMIT} MW/min</span>
          </div>
        </Panel>

        <Panel title="Curtailment by Site — 7 Days">
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={curtBySite} margin={{ top:4, right:12, bottom:0, left:-20 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill:"var(--ds-text-faint)", fontSize:9 }} tickLine={false} axisLine={false}
                  tickFormatter={v => String(v)} width={35} />
                <Tooltip contentStyle={TT} formatter={(v: number, name: string) => [`${(+v).toFixed(1)} MWh`, name]} />
                <Bar dataKey="Scheduled"  stackId="a" fill="#3b82f6" fillOpacity={0.85} />
                <Bar dataKey="Forced"     stackId="a" fill="#ef4444" fillOpacity={0.85} />
                <Bar dataKey="Frequency"  stackId="a" fill="#f59e0b" fillOpacity={0.85} />
                <Bar dataKey="Congestion" stackId="a" fill="#a78bfa" fillOpacity={0.85} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:8, flexWrap:"wrap" }}>
            {(["Scheduled","Forced","Frequency","Congestion"] as const).map(t => (
              <span key={t} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"var(--ds-text-faint)" }}>
                <span style={{ width:8, height:8, borderRadius:2, background:CURT_COLOR[t], display:"inline-block" }} />{t}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* Row 3: Curtailment event log */}
      <Panel title="Curtailment Event Log"
        badge={`${mwhToday.toFixed(0)} MWh lost today · $${revToday.toLocaleString()}`} badgeColor="#f59e0b"
        action={<FilterBar options={["All","Scheduled","Forced","Frequency","Congestion"]} value={cFilter} onChange={setCFilter} />}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {["ID","Date / Time","Site","Type","MW","MWh Lost","Revenue Lost","Duration","Reason","Status"].map(h => (
                  <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, color:"var(--ds-text-faint)", fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCurt.map((e, i) => (
                <tr key={e.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", background: i%2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-faint)", fontFamily:"monospace", fontSize:11 }}>{e.id}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)", whiteSpace:"nowrap" }}>{e.datetime}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text)" }}>{e.site}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600,
                      background:CURT_COLOR[e.type]+"22", color:CURT_COLOR[e.type], border:`1px solid ${CURT_COLOR[e.type]}44` }}>{e.type}</span>
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)" }}>{e.mw}</td>
                  <td style={{ padding:"7px 10px", color:"#f59e0b", fontWeight:600 }}>{e.mwh.toFixed(1)}</td>
                  <td style={{ padding:"7px 10px", color:"#ef4444", fontWeight:600 }}>${e.revenue.toLocaleString()}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)" }}>{e.duration_min} min</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-faint)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.reason}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600,
                      background:STAT_COLOR[e.status]+"22", color:STAT_COLOR[e.status] }}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:10, fontSize:11, color:"var(--ds-text-faint)" }}>
          Total 7 days: {CURTAILMENT.reduce((a,e)=>a+e.mwh,0).toFixed(1)} MWh ·
          Revenue impact: ${CURTAILMENT.reduce((a,e)=>a+e.revenue,0).toLocaleString()} ·
          Forced events: {CURTAILMENT.filter(e=>e.type==="Forced").length}
        </div>
      </Panel>

      {/* Row 4: Grid fault recorder */}
      <Panel title="Grid Fault Recorder"
        badge={`LVRT compliance: ${lvrtRate}%`} badgeColor={lvrtColor}
        action={<FilterBar options={["All","Voltage Dip","LVRT","Over-frequency","Under-frequency","Phase Imbalance"]} value={fFilter} onChange={setFFilter} />}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {["ID","Date / Time","Site","Event Type","Severity","Measured","Duration","Recovery","LVRT","Status"].map(h => (
                  <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, color:"var(--ds-text-faint)", fontWeight:600, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFaults.map((e, i) => (
                <tr key={e.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)",
                  background: i%2 ? "rgba(255,255,255,0.01)" : "transparent",
                  borderLeft:`3px solid ${e.severity==="Critical" ? "#ef4444" : e.severity==="Major" ? "#f59e0b" : "transparent"}` }}>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-faint)", fontFamily:"monospace", fontSize:11 }}>{e.id}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)", whiteSpace:"nowrap" }}>{e.datetime}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text)" }}>{e.site}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)" }}>{e.type}</td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600,
                      background:SEV_COLOR[e.severity]+"22", color:SEV_COLOR[e.severity],
                      border:`1px solid ${SEV_COLOR[e.severity]}44` }}>{e.severity}</span>
                  </td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text)", fontWeight:600, fontFamily:"monospace" }}>{e.value}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)" }}>{e.duration_ms > 0 ? `${e.duration_ms} ms` : "—"}</td>
                  <td style={{ padding:"7px 10px", color:"var(--ds-text-muted)" }}>{e.recovery_ms > 0 ? `${e.recovery_ms} ms` : "—"}</td>
                  <td style={{ padding:"7px 10px" }}>
                    {(e.type === "LVRT" || e.type === "Voltage Dip") ? (
                      <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600,
                        background: e.lvrt_success ? "#22c55e22" : "#ef444422",
                        color: e.lvrt_success ? "#22c55e" : "#ef4444" }}>
                        {e.lvrt_success ? "✓ Pass" : "✗ Trip"}
                      </span>
                    ) : <span style={{ color:"var(--ds-text-faint)" }}>—</span>}
                  </td>
                  <td style={{ padding:"7px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:600,
                      background:STAT_COLOR[e.status]+"22", color:STAT_COLOR[e.status] }}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop:10, fontSize:11, color:"var(--ds-text-faint)" }}>
          Last 30 days: {FAULTS.length} events · Critical: {FAULTS.filter(f=>f.severity==="Critical").length} ·
          Major: {FAULTS.filter(f=>f.severity==="Major").length} ·
          LVRT success rate: {lvrtRate}% ({lvrtSuccess}/{lvrtEvents.length})
        </div>
      </Panel>

      {/* ── Grid Code Compliance ─────────────────────────────────────────── */}
      <GridCodeCompliance
        lvrtRate={lvrtRate}
        freqOk={freqOk}
        freqWarn={freqWarn}
        rampViolations={rampViolations}
        pfNonCompliant={SITE_Q.filter(s => !s.compliant).length}
        totalSites={SITE_Q.length}
        criticalFaults={FAULTS.filter(f => f.severity === "Critical" && f.status !== "Recovered").length}
      />

    </div>
  );
}

// ─── Types for compliance panel ───────────────────────────────────────────────
type CompStatus = "COMPLIANT" | "WARNING" | "DEVIATION" | "N/A";

interface SiteRow {
  name: string; siteType: string; region: string;
  status: CompStatus; score: number | null;
  metric: string; note: string;
}

interface CodeEntry {
  code: string; name: string; region: string; scope: string; description: string;
  status: Exclude<CompStatus, "N/A">; score: number | null; scoreLabel: string;
  metric: string; detail: string; siteRows: SiteRow[];
}

// ─── Drilldown modal ──────────────────────────────────────────────────────────
function ComplianceDrilldownModal({ code, onClose }: { code: CodeEntry; onClose: () => void }) {
  const sc = (s: CompStatus) =>
    s === "COMPLIANT" ? "var(--ds-success)" : s === "WARNING" ? "var(--ds-warning)" : s === "DEVIATION" ? "var(--ds-danger)" : "var(--ds-text-faint)";
  const sb = (s: CompStatus): React.CSSProperties => ({
    fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
    padding: "2px 8px", borderRadius: 4, color: sc(s),
    background: s === "N/A" ? "rgba(255,255,255,0.05)" : sc(s) + "22",
    border: `1px solid ${sc(s)}44`,
  });
  const applicable = code.siteRows.filter(r => r.status !== "N/A");
  const comp = applicable.filter(r => r.status === "COMPLIANT").length;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1900 }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(820px,94vw)", maxHeight:"88vh", overflowY:"auto",
        background:"var(--ds-panel)", borderRadius:16, zIndex:1950,
        boxShadow:"0 8px 30px rgba(0,0,0,0.24)", display:"flex", flexDirection:"column",
      }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                <span style={{ fontSize:16, fontWeight:700, color:"var(--ds-text)" }}>{code.code}</span>
                <span style={sb(code.status)}>{code.status}</span>
                <span style={{ fontSize:22, fontWeight:700, color: sc(code.status), marginLeft:"auto" }}>
                  {code.scoreLabel}
                </span>
              </div>
              <div style={{ fontSize:12, color:"var(--ds-text-muted)", marginBottom:6 }}>{code.name}</div>
              <div style={{ fontSize:11, color:"var(--ds-text-faint)", lineHeight:1.55 }}>{code.description}</div>
            </div>
            <button onClick={onClose} style={{
              background:"transparent", border:"1px solid rgba(255,255,255,0.12)", color:"var(--ds-text-muted)",
              borderRadius:8, width:28, height:28, cursor:"pointer", fontSize:16, lineHeight:1,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>×</button>
          </div>
          {/* Overall progress bar */}
          {code.score !== null && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--ds-text-faint)", marginBottom:4 }}>
                <span>Portfolio compliance score</span>
                <span>{applicable.length > 0 ? `${comp}/${applicable.length} applicable sites compliant` : "All sites applicable"}</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, width:`${code.score}%`, background:sc(code.status), transition:"width 0.3s" }} />
              </div>
            </div>
          )}
        </div>

        {/* Per-site table */}
        <div style={{ padding:"16px 20px" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--ds-text-muted)", marginBottom:10 }}>
            Site-by-Site Compliance
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"var(--ds-surface-soft)" }}>
                  {["Site","Type","Region","Status","Score","Key Metric","Notes"].map(h => (
                    <th key={h} style={{ padding:"7px 10px", textAlign:"left", fontSize:10, fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.04em", color:"var(--ds-text-muted)",
                      whiteSpace:"nowrap", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {code.siteRows.map((row, i) => (
                  <tr key={row.name} style={{
                    borderBottom:"1px solid rgba(255,255,255,0.03)",
                    background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent",
                    opacity: row.status === "N/A" ? 0.45 : 1,
                  }}>
                    <td style={{ padding:"8px 10px", fontWeight:600, color:"var(--ds-text)", whiteSpace:"nowrap" }}>{row.name}</td>
                    <td style={{ padding:"8px 10px", color:"var(--ds-text-faint)" }}>{row.siteType}</td>
                    <td style={{ padding:"8px 10px", color:"var(--ds-text-faint)" }}>{row.region}</td>
                    <td style={{ padding:"8px 10px" }}><span style={sb(row.status)}>{row.status}</span></td>
                    <td style={{ padding:"8px 10px" }}>
                      {row.score !== null ? (
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:60, height:4, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:4, width:`${row.score}%`, background:sc(row.status) }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:700, color:sc(row.status) }}>{row.score}%</span>
                        </div>
                      ) : <span style={{ color:"var(--ds-text-faint)", fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:"8px 10px", color:"var(--ds-text)", fontWeight:500 }}>{row.metric}</td>
                    <td style={{ padding:"8px 10px", color:"var(--ds-text-faint)", fontSize:11 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Grid Code Compliance Panel ───────────────────────────────────────────────
function GridCodeCompliance({
  lvrtRate, freqOk, freqWarn, rampViolations, pfNonCompliant, totalSites, criticalFaults,
}: {
  lvrtRate: number; freqOk: boolean; freqWarn: boolean;
  rampViolations: number; pfNonCompliant: number; totalSites: number; criticalFaults: number;
}) {

  const [activeCode, setActiveCode] = useState<CodeEntry | null>(null);

  // Derive live portfolio scores
  const dewaScore     = Math.round(lvrtRate * 0.6 + (freqOk ? 100 : freqWarn ? 70 : 40) * 0.4);
  const secScore      = Math.max(0, 100 - rampViolations * 5);
  const ieee1547Score = criticalFaults === 0 ? 100 : Math.max(65, 100 - criticalFaults * 12);
  const nercScore     = freqOk ? 100 : freqWarn ? 75 : 45;

  const sc = (s: CompStatus) =>
    s === "COMPLIANT" ? "var(--ds-success)" : s === "WARNING" ? "var(--ds-warning)" : s === "DEVIATION" ? "var(--ds-danger)" : "var(--ds-text-faint)";
  const ss = (s: CompStatus): React.CSSProperties => ({
    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "2px 7px", borderRadius: 4, color: sc(s),
    background: s === "N/A" ? "rgba(255,255,255,0.05)" : sc(s) + "22",
    border: `1px solid ${s === "N/A" ? "rgba(255,255,255,0.1)" : sc(s) + "44"}`,
  });

  // Per-site base attributes (aligned with SITE_Q)
  const SITES_6 = [
    { name: "Al Dhafra Solar", siteType: "Solar",  region: "UAE",  pf: 0.973, pfOk: true,  lvrtOk: true,  windComm: false, bms: false, pvMon: true  },
    { name: "MBR Solar Park",  siteType: "Solar",  region: "UAE",  pf: 0.951, pfOk: true,  lvrtOk: true,  windComm: false, bms: false, pvMon: true  },
    { name: "NEOM Wind Farm",  siteType: "Wind",   region: "KSA",  pf: 0.921, pfOk: false, lvrtOk: false, windComm: true,  bms: false, pvMon: false },
    { name: "Jubail BESS",     siteType: "BESS",   region: "KSA",  pf: 0.988, pfOk: true,  lvrtOk: true,  windComm: false, bms: true,  pvMon: false },
    { name: "Duqm Hybrid",     siteType: "Hybrid", region: "Oman", pf: 0.947, pfOk: false, lvrtOk: true,  windComm: false, bms: true,  pvMon: true  },
    { name: "Ibri Solar",      siteType: "Solar",  region: "Oman", pf: 0.969, pfOk: true,  lvrtOk: true,  windComm: false, bms: false, pvMon: true  },
  ];

  // Helper: status from boolean
  const bSt = (ok: boolean, na = false): CompStatus => na ? "N/A" : ok ? "COMPLIANT" : "DEVIATION";
  const pfSt = (s: typeof SITES_6[0]): CompStatus => s.pfOk ? "COMPLIANT" : s.pf >= 0.93 ? "WARNING" : "DEVIATION";

  const codes: CodeEntry[] = [
    {
      code: "DEWA", name: "Dubai Electricity & Water Authority Grid Code",
      region: "UAE", scope: "Frequency · LVRT · Reactive Power",
      description: "Requirements issued by DEWA for renewable energy plants connecting to Dubai's grid. Covers frequency ride-through, LVRT, reactive power dispatch, and ramp rate limits.",
      status: dewaScore >= 95 ? "COMPLIANT" : dewaScore >= 80 ? "WARNING" : "DEVIATION",
      score: dewaScore, scoreLabel: `${dewaScore}%`,
      metric: `LVRT ${lvrtRate}%`,
      detail: freqOk ? "Frequency within 49.8–50.2 Hz" : "Frequency outside normal band",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: (s.region === "UAE") ? (s.lvrtOk && s.pfOk ? "COMPLIANT" : "WARNING") : "N/A" as CompStatus,
        score:  s.region === "UAE" ? (s.pfOk ? 96 : 78) : null,
        metric: s.region === "UAE" ? `PF ${s.pf} · LVRT ${s.lvrtOk ? "✓" : "✗"}` : "Not in DEWA jurisdiction",
        note:   s.region === "UAE" ? (s.pfOk ? "PF compliant · LVRT ride-through passed" : "PF below 0.95 limit") : "—",
      })),
    },
    {
      code: "EWEC", name: "Emirates Water & Electricity Co Grid Code",
      region: "UAE", scope: "Power Factor · Voltage · Ramp Rate",
      description: "Grid code issued by EWEC for power plants in Abu Dhabi and the UAE interconnected grid. Covers PF capability (0.95 lead/lag), voltage band, and ramp-rate management.",
      status: SITES_6.filter(s=>s.region==="UAE" && !s.pfOk).length === 0 ? "COMPLIANT" : "WARNING",
      score: Math.round((SITES_6.filter(s=>s.region==="UAE"&&s.pfOk).length / SITES_6.filter(s=>s.region==="UAE").length)*100),
      scoreLabel: `${Math.round((SITES_6.filter(s=>s.region==="UAE"&&s.pfOk).length / SITES_6.filter(s=>s.region==="UAE").length)*100)}%`,
      metric: `${SITES_6.filter(s=>s.region==="UAE"&&s.pfOk).length}/${SITES_6.filter(s=>s.region==="UAE").length} UAE sites PF ≥ 0.95`,
      detail: "Power factor & voltage band requirements",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: s.region === "UAE" ? pfSt(s) : "N/A" as CompStatus,
        score:  s.region === "UAE" ? Math.round(s.pf * 100) : null,
        metric: s.region === "UAE" ? `PF ${s.pf}` : "Not in EWEC jurisdiction",
        note:   s.region === "UAE" ? (s.pfOk ? "PF within 0.95 lead/lag" : `PF ${s.pf} — below 0.95 requirement`) : "—",
      })),
    },
    {
      code: "SEC", name: "Saudi Electricity Company Grid Code",
      region: "KSA", scope: "Ramp Rate · Frequency · Protection",
      description: "Grid connection requirements for plants in the Saudi national grid. Covers ramp rate limits (10 MW/min), frequency ride-through bands, and generator protection relay settings.",
      status: secScore >= 95 ? "COMPLIANT" : secScore >= 80 ? "WARNING" : "DEVIATION",
      score: secScore, scoreLabel: `${secScore}%`,
      metric: `${rampViolations} ramp violation(s) in 24h`,
      detail: "Limit ±10 MW/min · 24-hour window",
      siteRows: SITES_6.map(s => {
        const ksaViol = s.name === "NEOM Wind Farm" ? Math.round(rampViolations * 0.55) : s.name === "Jubail BESS" ? Math.round(rampViolations * 0.15) : 0;
        return {
          name: s.name, siteType: s.siteType, region: s.region,
          status: s.region === "KSA" ? (ksaViol === 0 ? "COMPLIANT" : ksaViol <= 2 ? "WARNING" : "DEVIATION") : "N/A" as CompStatus,
          score:  s.region === "KSA" ? Math.max(0, 100 - ksaViol * 6) : null,
          metric: s.region === "KSA" ? `${ksaViol} ramp violation(s)` : "Not in SEC jurisdiction",
          note:   s.region === "KSA" ? (ksaViol === 0 ? "Within ±10 MW/min limit" : `${ksaViol} events exceeded ramp limit`) : "—",
        };
      }),
    },
    {
      code: "IEEE 1547", name: "Interconnection of Distributed Resources",
      region: "International", scope: "Voltage · Frequency · Anti-islanding",
      description: "IEEE standard for connecting distributed energy resources to utility grids. Covers voltage and frequency trip settings, anti-islanding protection, and ride-through requirements for all DER types.",
      status: ieee1547Score >= 95 ? "COMPLIANT" : ieee1547Score >= 80 ? "WARNING" : "DEVIATION",
      score: ieee1547Score, scoreLabel: `${ieee1547Score}%`,
      metric: criticalFaults === 0 ? "No active deviations" : `${criticalFaults} unresolved fault(s)`,
      detail: "Voltage & frequency trip settings verified",
      siteRows: SITES_6.map((s, i) => {
        const faultCount = [1, 2, 2, 1, 2, 1][i]; // GFR events per site from FAULTS data
        const ok = faultCount <= 1;
        return {
          name: s.name, siteType: s.siteType, region: s.region,
          status: ok ? "COMPLIANT" : "WARNING" as CompStatus,
          score: ok ? 100 : 82,
          metric: `${faultCount} fault event(s) in 30d`,
          note: ok ? "Trip settings within IEEE 1547 range" : "Events under investigation — relay review triggered",
        };
      }),
    },
    {
      code: "NERC PRC-024", name: "Generator Frequency Protection Coordination",
      region: "NERC / Int'l ref.", scope: "Relay Settings · Trip Avoidance",
      description: "NERC standard ensuring generator protection relays do not trip during frequency disturbances within allowable ride-through bands. Referenced by GCC TSOs for relay coordination.",
      status: nercScore >= 95 ? "COMPLIANT" : nercScore >= 80 ? "WARNING" : "DEVIATION",
      score: nercScore, scoreLabel: `${nercScore}%`,
      metric: freqOk ? "All relays in normal zone" : "Relay band under review",
      detail: "No spurious trips in 30-day window",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: freqOk ? "COMPLIANT" : freqWarn ? "WARNING" : "DEVIATION" as CompStatus,
        score:  nercScore,
        metric: "Relay band: 47.5–51.5 Hz",
        note:   freqOk ? "Frequency relay within PRC-024 no-trip zone" : "Marginal — relay band review recommended",
      })),
    },
    {
      code: "IEC 61850", name: "Power Utility Automation Communication",
      region: "International", scope: "SCADA · Data Exchange · GOOSE",
      description: "Communication standard for substations, protection relays, and SCADA. Enables interoperability between devices from different vendors via standardised data models and GOOSE messaging.",
      status: "COMPLIANT", score: 98, scoreLabel: "98%",
      metric: "Astrikos SCADA v4.2 · All 6 sites",
      detail: "IEC 61850 / Modbus TCP active on all sites",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: "COMPLIANT" as CompStatus, score: 98,
        metric: "IEC 61850 / Modbus TCP",
        note: "SCADA data exchange active · GOOSE messaging enabled",
      })),
    },
    {
      code: "IEC 61724", name: "PV System Performance Monitoring",
      region: "International", scope: "PR · Yield · Irradiance",
      description: "Specifies measurement and analysis methods for PV system performance, including Performance Ratio, final yield, reference yield, and irradiance monitoring requirements.",
      status: "COMPLIANT", score: 100, scoreLabel: "PASS",
      metric: "15-min monitoring on all PV sites",
      detail: "PR & yield tracking per solar site",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: s.pvMon ? "COMPLIANT" : "N/A" as CompStatus,
        score:  s.pvMon ? 100 : null,
        metric: s.pvMon ? "PR tracked · 15-min irradiance" : "Not a PV plant",
        note:   s.pvMon ? "Performance Ratio, GHI, and POA irradiance monitored" : "Standard not applicable to this plant type",
      })),
    },
    {
      code: "IEC 61400-25", name: "Wind Turbine Communication Standard",
      region: "International", scope: "Data Models · SCADA Protocol",
      description: "Defines communication protocols and data models for wind power plant monitoring and control, enabling standardised wind turbine data exchange with SCADA and EMS systems.",
      status: "COMPLIANT", score: 100, scoreLabel: "PASS",
      metric: "NEOM Wind — full telemetry active",
      detail: "Turbine data models mapped per standard",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: s.windComm ? "COMPLIANT" : "N/A" as CompStatus,
        score:  s.windComm ? 100 : null,
        metric: s.windComm ? "Wind turbine comms active" : "Not a wind plant",
        note:   s.windComm ? "IEC 61400-25 data models mapped · All turbines reporting" : "Standard applies to wind plants only",
      })),
    },
    {
      code: "IEC 62619", name: "BESS Lithium-ion Safety Requirements",
      region: "International", scope: "Thermal · SOC Limits · Fault Protection",
      description: "Safety requirements for secondary lithium-ion cells used in BESS. Covers thermal management, SOC/SOH limits, fault isolation, and BMS performance requirements.",
      status: "COMPLIANT", score: 100, scoreLabel: "PASS",
      metric: "Jubail BESS & Duqm Hybrid — BMS active",
      detail: "Cell temp, SOC & isolation monitoring active",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: s.bms ? "COMPLIANT" : "N/A" as CompStatus,
        score:  s.bms ? 100 : null,
        metric: s.bms ? "BMS active · Cell monitoring enabled" : "No BESS at this site",
        note:   s.bms ? "Thermal, SOC 10–90%, isolation relay all verified" : "IEC 62619 not applicable — no battery storage",
      })),
    },
    {
      code: "IEC 61853", name: "PV Module Performance & Energy Rating",
      region: "International", scope: "Module Testing · Temp. Correction",
      description: "Defines performance testing and energy rating methods for PV modules across a range of irradiance and temperature conditions. Ensures modules meet declared power output and degradation specifications.",
      status: "COMPLIANT", score: 100, scoreLabel: "PASS",
      metric: "IEC 61853-1/2 certified on all PV sites",
      detail: "All PV modules carry valid certification",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: s.pvMon ? "COMPLIANT" : "N/A" as CompStatus,
        score:  s.pvMon ? 100 : null,
        metric: s.pvMon ? "IEC 61853-1/2 certified" : "No PV modules",
        note:   s.pvMon ? "Module datasheets certified · Temperature correction verified" : "Not applicable — no PV modules",
      })),
    },
    {
      code: "EN 50549", name: "Requirements for Generating Plants",
      region: "Europe / GCC ref.", scope: "Grid Connection · Protection",
      description: "European standard for connecting generators and storage to public distribution networks. Referenced by GCC TSOs as benchmark for Q capability, voltage band, and protection coordination.",
      status: SITES_6.filter(s=>!s.pfOk).length <= 1 ? "COMPLIANT" : "WARNING",
      score: SITES_6.filter(s=>!s.pfOk).length <= 1 ? 97 : 82,
      scoreLabel: SITES_6.filter(s=>!s.pfOk).length <= 1 ? "97%" : "82%",
      metric: "Q capability curve verified",
      detail: "Reactive envelope within EN 50549 limits",
      siteRows: SITES_6.map(s => ({
        name: s.name, siteType: s.siteType, region: s.region,
        status: pfSt(s),
        score:  s.pfOk ? 97 : 80,
        metric: `PF ${s.pf} · Q capability verified`,
        note:   s.pfOk ? "Within EN 50549 reactive envelope" : "Q dispatch may require adjustment for full EN 50549 compliance",
      })),
    },
    {
      code: "VDE-AR-N 4120", name: "HV Power Plant Connection Requirements",
      region: "GCC reference", scope: "HV Interconnect · Power Quality",
      description: "German technical guideline for HV power plant grid connection, referenced by GCC TSOs as a benchmark standard for large renewables. Covers power quality, protection, and HV interconnection requirements.",
      status: rampViolations <= 2 ? "COMPLIANT" : "WARNING",
      score: rampViolations <= 2 ? 96 : 85,
      scoreLabel: rampViolations <= 2 ? "96%" : "85%",
      metric: "HV coupling compliance verified",
      detail: "Mapped against equivalent GCC clause",
      siteRows: SITES_6.map((s, i) => {
        const siteViol = [2, 1, 4, 1, 1, 1][i];
        return {
          name: s.name, siteType: s.siteType, region: s.region,
          status: siteViol <= 1 ? "COMPLIANT" : siteViol <= 3 ? "WARNING" : "DEVIATION" as CompStatus,
          score:  Math.max(0, 100 - siteViol * 4),
          metric: `${siteViol} power quality event(s)`,
          note:   siteViol <= 1 ? "HV interconnect within VDE limits" : `${siteViol} events exceed VDE-AR-N 4120 ramp envelope`,
        };
      }),
    },
  ];

  const compliant  = codes.filter(c => c.status === "COMPLIANT").length;
  const warning    = codes.filter(c => c.status === "WARNING").length;
  const deviation  = codes.filter(c => c.status === "DEVIATION").length;
  const overallPct = Math.round(codes.reduce((a, c) => a + (c.score ?? 100), 0) / codes.length);

  const dotColor = (s: CompStatus) =>
    s === "COMPLIANT" ? "#22c55e" : s === "WARNING" ? "#f59e0b" : s === "DEVIATION" ? "#ef4444" : "rgba(255,255,255,0.18)";

  return (
    <>
      {activeCode && <ComplianceDrilldownModal code={activeCode} onClose={() => setActiveCode(null)} />}

      <Panel
        title="Applicable Standards & Grid Code Compliance"
        badge={`Overall ${overallPct}%`}
        badgeColor={overallPct >= 95 ? "#22c55e" : overallPct >= 80 ? "#f59e0b" : "#ef4444"}
      >
        {/* Summary row */}
        <div style={{ display:"flex", gap:24, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize:28, fontWeight:700, color: overallPct >= 95 ? "var(--ds-success)" : "var(--ds-warning)", lineHeight:1 }}>
              {overallPct}<span style={{ fontSize:14, fontWeight:500 }}>%</span>
            </span>
            <span style={{ fontSize:10, color:"var(--ds-text-faint)" }}>Portfolio Compliance Score</span>
          </div>
          <div style={{ width:1, height:40, background:"rgba(255,255,255,0.07)" }} />
          {[
            { label:"Compliant", count:compliant, color:"var(--ds-success)" },
            { label:"Warning",   count:warning,   color:"var(--ds-warning)" },
            { label:"Deviation", count:deviation, color:"var(--ds-danger)"  },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:700, color, lineHeight:1 }}>{count}</div>
              <div style={{ fontSize:10, color:"var(--ds-text-faint)", marginTop:2 }}>{label}</div>
            </div>
          ))}
          {/* Site legend */}
          <div style={{ marginLeft:"auto", display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
            <div style={{ display:"flex", gap:8 }}>
              {SITES_6.map(s => (
                <div key={s.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--ds-accent)" }} />
                  <span style={{ fontSize:8, color:"var(--ds-text-faint)", whiteSpace:"nowrap", maxWidth:52, textAlign:"center", lineHeight:1.2 }}>{s.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize:9, color:"var(--ds-text-faint)" }}>Dots on each card = per-site status · Click card to drill down</span>
          </div>
        </div>

        {/* Code cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(272px, 1fr))", gap:10 }}>
          {codes.map(c => {
            const barColor = sc(c.status);
            return (
              <div key={c.code}
                onClick={() => setActiveCode(c)}
                style={{
                  background: "var(--ds-surface)",
                  borderLeft: `3px solid ${barColor}`,
                  borderRadius: "0 8px 8px 0",
                  padding: "10px 12px",
                  display: "flex", flexDirection: "column", gap: 5,
                  cursor: "pointer",
                  transition: "transform 0.14s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"var(--ds-text)", flex:1 }}>{c.code}</span>
                  <span style={{ fontSize:14, fontWeight:700, color: barColor }}>{c.scoreLabel}</span>
                  <span style={ss(c.status)}>{c.status}</span>
                </div>

                {/* Progress bar */}
                {c.score !== null && (
                  <div style={{ height:4, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4, width:`${c.score}%`, background:barColor, transition:"width 0.3s" }} />
                  </div>
                )}

                <div style={{ fontSize:11, color:"var(--ds-text-muted)", lineHeight:1.35 }}>{c.name}</div>

                {/* 6 site dots */}
                <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:1 }}>
                  {c.siteRows.map(row => (
                    <div key={row.name} title={`${row.name}: ${row.status}`}
                      style={{ width:9, height:9, borderRadius:"50%", background:dotColor(row.status), flexShrink:0 }} />
                  ))}
                  <span style={{ fontSize:9, color:"var(--ds-text-faint)", marginLeft:2 }}>
                    {c.siteRows.filter(r=>r.status==="COMPLIANT").length}/{c.siteRows.filter(r=>r.status!=="N/A").length} applicable
                  </span>
                </div>

                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9, color:"var(--ds-text-faint)", background:"var(--ds-surface-soft)", padding:"1px 6px", borderRadius:3 }}>{c.region}</span>
                  {c.scope.split(" · ").map(s => (
                    <span key={s} style={{ fontSize:9, color:"var(--ds-text-faint)", background:"var(--ds-surface-soft)", padding:"1px 6px", borderRadius:3 }}>{s}</span>
                  ))}
                </div>
                <div style={{ fontSize:10, fontWeight:600, color:"var(--ds-text)" }}>{c.metric}</div>
                <div style={{ fontSize:10, color:"var(--ds-text-faint)" }}>{c.detail}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
