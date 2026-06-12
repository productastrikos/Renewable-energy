import { useState, useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { SITE_ASSET_HIERARCHY, WORK_ORDERS } from "../../data/mockData";
import { fetchHierarchy, fetchSiteWorkOrders } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";

// ─── Voltage-level palette (IEC-inspired) ────────────────────────────────
const VL = {
  hv:   { stroke: "#3b82f6", fill: "rgba(59,130,246,0.10)",  label: "132kV" },
  mv:   { stroke: "#eab308", fill: "rgba(234,179,8,0.10)",   label: "33kV"  },
  lv:   { stroke: "#22c55e", fill: "rgba(34,197,94,0.10)",   label: "0.4kV" },
  dc:   { stroke: "#f97316", fill: "rgba(249,115,22,0.10)",  label: "DC"    },
  comm: { stroke: "#94a3b8", fill: "rgba(148,163,184,0.08)", label: "Comm"  },
};

function sc(s: "success" | "warning" | "danger" | "normal") {
  return s === "success" || s === "normal" ? "#22c55e" : s === "warning" ? "#f59e0b" : "#ef4444";
}

// ─── Reusable SVG primitives ──────────────────────────────────────────────

// Circuit Breaker: filled square = closed, outlined = open
function CB({ x, y, closed = true, status = "success" as "success"|"warning"|"danger", id, label, selected, onClick }: {
  x:number; y:number; closed?:boolean; status?:"success"|"warning"|"danger";
  id:string; label?:string; selected?:boolean; onClick?:(id:string)=>void
}) {
  const color = sc(status);
  const sz = 12;
  return (
    <g onClick={() => onClick?.(id)} style={{ cursor: "pointer" }}>
      {selected && <rect x={x-sz} y={y-sz} width={sz*2} height={sz*2} rx={3} fill="rgba(91,141,224,0.2)" stroke="#5b8de0" strokeWidth={1.5}/>}
      <rect x={x-sz/2} y={y-sz/2} width={sz} height={sz} rx={2}
        fill={closed ? color : "transparent"} stroke={color} strokeWidth={closed ? 1 : 2}
        fillOpacity={closed ? 0.85 : 0}/>
      {!closed && <line x1={x-sz/2+2} y1={y-sz/2+2} x2={x+sz/2-2} y2={y+sz/2-2} stroke={color} strokeWidth={1.5}/>}
      {label && <text x={x} y={y+sz+9} textAnchor="middle" fontSize={8} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{label}</text>}
    </g>
  );
}

// Disconnector switch
function DS({ x1, y1, x2, y2, open=false, status="success" as "success"|"warning"|"danger" }: {
  x1:number; y1:number; x2:number; y2:number; open?:boolean; status?:"success"|"warning"|"danger"
}) {
  const color = sc(status);
  if (!open) return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2}/>;
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const angle = open ? -25 : 0;
  return (
    <g>
      <line x1={x1} y1={y1} x2={mx} y2={my} stroke={color} strokeWidth={2}/>
      <line x1={mx} y1={my} x2={x2} y2={y2} stroke={color} strokeWidth={2}
        transform={`rotate(${angle},${mx},${my})`} strokeDasharray="4 2"/>
    </g>
  );
}

// Transformer symbol: two circles
function TX({ x, y, label, sub, status="success" as "success"|"warning"|"danger", id, selected, onClick, alarm }: {
  x:number; y:number; label:string; sub?:string; status?:"success"|"warning"|"danger";
  id:string; selected?:boolean; onClick?:(id:string)=>void; alarm?:boolean
}) {
  const color = sc(status);
  const r = 16;
  return (
    <g onClick={() => onClick?.(id)} style={{ cursor: "pointer" }}>
      {selected && <rect x={x-r-6} y={y-r-4} width={r*2+12} height={r*2+8} rx={5} fill="rgba(91,141,224,0.15)" stroke="#5b8de0" strokeWidth={1.5}/>}
      {alarm && (
        <g>
          <circle cx={x+r-2} cy={y-r+2} r={6} fill="#ef4444"/>
          <text x={x+r-2} y={y-r+2} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="#fff" fontWeight={800} fontFamily="Inter,sans-serif">!</text>
        </g>
      )}
      <circle cx={x-6} cy={y} r={r} fill="var(--dt-node-fill)" stroke={color} strokeWidth={1.5}/>
      <circle cx={x+6} cy={y} r={r} fill="var(--dt-node-fill)" stroke={color} strokeWidth={1.5}/>
      <text x={x} y={y+r+11} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--dt-text-primary)" fontFamily="Inter,sans-serif">{label}</text>
      {sub && <text x={x} y={y+r+21} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{sub}</text>}
    </g>
  );
}

// Busbar: horizontal thick line with label + telemetry
function Busbar({ x1, y1, x2, vl, label, telemetry }: {
  x1:number; y1:number; x2:number; vl:keyof typeof VL; label:string; telemetry?:string
}) {
  const v = VL[vl];
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y1} stroke={v.stroke} strokeWidth={5} strokeLinecap="round"/>
      <text x={x1+6} y={y1-7} fontSize={8.5} fontWeight={700} fill={v.stroke} fontFamily="Inter,sans-serif">{label}</text>
      {telemetry && <text x={x1+6} y={y1+14} fontSize={8} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{telemetry}</text>}
    </g>
  );
}

// Inverter symbol: rectangle with "≈"
function Inverter({ x, y, label, power, status="success" as "success"|"warning"|"danger", id, selected, onClick, alarm }: {
  x:number; y:number; label:string; power:string; status?:"success"|"warning"|"danger";
  id:string; selected?:boolean; onClick?:(id:string)=>void; alarm?:boolean
}) {
  const color = sc(status);
  const w = 52, h = 32;
  return (
    <g onClick={() => onClick?.(id)} style={{ cursor: "pointer" }}>
      {selected && <rect x={x-w/2-4} y={y-h/2-4} width={w+8} height={h+8} rx={6} fill="rgba(91,141,224,0.15)" stroke="#5b8de0" strokeWidth={1.5}/>}
      <rect x={x-w/2} y={y-h/2} width={w} height={h} rx={4}
        fill={status === "danger" ? "rgba(220,38,38,0.15)" : status === "warning" ? "rgba(217,119,6,0.12)" : "var(--dt-node-fill)"}
        stroke={color} strokeWidth={1.5}/>
      <text x={x} y={y-3}  textAnchor="middle" fontSize={10} fill={color} fontFamily="Inter,sans-serif" fontWeight={700}>≈</text>
      <text x={x} y={y+9}  textAnchor="middle" fontSize={7.5} fill="var(--dt-text-secondary)" fontFamily="Inter,sans-serif">{power}</text>
      <text x={x} y={y+h/2+10} textAnchor="middle" fontSize={8} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{label}</text>
      {alarm && (
        <g>
          <circle cx={x+w/2-3} cy={y-h/2+3} r={5} fill="#ef4444"/>
          <text x={x+w/2-3} y={y-h/2+3} textAnchor="middle" dominantBaseline="middle" fontSize={6} fill="#fff" fontWeight={800} fontFamily="Inter,sans-serif">!</text>
        </g>
      )}
    </g>
  );
}

// PV Array symbol: rectangle with grid pattern
function PVArray({ x, y, strings, label }: { x:number; y:number; strings:number; label:string }) {
  const w = 48, h = 28;
  return (
    <g>
      <rect x={x-w/2} y={y-h/2} width={w} height={h} rx={2} fill={VL.dc.fill} stroke={VL.dc.stroke} strokeWidth={1}/>
      {/* grid lines for PV visual */}
      <line x1={x-w/2+16} y1={y-h/2} x2={x-w/2+16} y2={y+h/2} stroke={VL.dc.stroke} strokeWidth={0.5} opacity={0.5}/>
      <line x1={x-w/2+32} y1={y-h/2} x2={x-w/2+32} y2={y+h/2} stroke={VL.dc.stroke} strokeWidth={0.5} opacity={0.5}/>
      <line x1={x-w/2} y1={y}    x2={x+w/2} y2={y}    stroke={VL.dc.stroke} strokeWidth={0.5} opacity={0.5}/>
      <text x={x} y={y+2}  textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fill={VL.dc.stroke} fontFamily="Inter,sans-serif" fontWeight={600}>{strings}×str</text>
      <text x={x} y={y+h/2+9} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{label}</text>
    </g>
  );
}

// Meter/PQM
function Meter({ x, y, label }: { x:number; y:number; label:string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={8} fill="var(--dt-node-fill)" stroke="#94a3b8" strokeWidth={1.2}/>
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={6.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif" fontWeight={700}>M</text>
      <text x={x} y={y+16} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{label}</text>
    </g>
  );
}

// Grid connection symbol
function GridPoint({ x, y, label, kv, mw }: { x:number; y:number; label:string; kv:string; mw:string }) {
  return (
    <g>
      <rect x={x-40} y={y-18} width={80} height={36} rx={5} fill={VL.hv.fill} stroke={VL.hv.stroke} strokeWidth={2}/>
      <text x={x} y={y-5}  textAnchor="middle" fontSize={9.5}  fontWeight={700} fill={VL.hv.stroke} fontFamily="Inter,sans-serif">{label}</text>
      <text x={x} y={y+8}  textAnchor="middle" fontSize={8}    fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{kv} · {mw}</text>
    </g>
  );
}

// Wire segment
function Wire({ x1,y1,x2,y2, vl="mv" as keyof typeof VL, animated=false }:{
  x1:number;y1:number;x2:number;y2:number; vl?:keyof typeof VL; animated?:boolean
}) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={VL[vl].stroke} strokeWidth={animated?2:1.5}
      strokeDasharray={animated?"8 5":undefined}
      style={animated?{animation:"dtFlow 0.8s linear infinite"}:undefined}/>
  );
}

// Alarm badge chip
function AlarmChip({ x, y, msg, type }: { x:number; y:number; msg:string; type:"alarm"|"warning" }) {
  const color = type === "alarm" ? "#ef4444" : "#f59e0b";
  return (
    <g>
      <rect x={x} y={y} width={180} height={22} rx={4} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1}/>
      <text x={x+6} y={y+14} fontSize={8.5} fill={color} fontFamily="Inter,sans-serif">⚠ {msg}</text>
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function SiteSLD() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAlarmPanel, setShowAlarmPanel] = useState(true);

  const { data: apiH } = useApi(() => fetchHierarchy(site.id), [site.id]);
  const { data: apiWO } = useApi(() => fetchSiteWorkOrders(site.id), [site.id]);
  const h = apiH ?? SITE_ASSET_HIERARCHY[site.id];
  const wos = apiWO ?? WORK_ORDERS.filter(w => w.siteId === site.id);

  const select = useCallback((id: string) => setSelectedId(p => p === id ? null : id), []);

  // ── Alarm list ────────────────────────────────────────────────────────
  const alarmList = useMemo(() => {
    if (!h) return [];
    const alarms: { id:string; name:string; msg:string; type:"alarm"|"warning" }[] = [];
    h.blocks.forEach(b => b.inverters.forEach(inv => {
      if (inv.status === "danger")  alarms.push({ id: inv.id, name: inv.name, msg: `Over-temp ${inv.temp}°C – output ${inv.output}%`, type: "alarm" });
      if (inv.status === "warning") alarms.push({ id: inv.id, name: inv.name, msg: `Degraded output ${inv.output}% · ${inv.temp}°C`, type: "warning" });
    }));
    h.transformers.forEach(tx => {
      if (tx.status === "warning") alarms.push({ id: tx.id, name: tx.name, msg: `Cooling degraded – ${tx.temp}°C, ${tx.load}% load`, type: "warning" });
    });
    return alarms;
  }, [h]);

  // ── Selected component details ─────────────────────────────────────────
  const selectedInfo = useMemo(() => {
    if (!selectedId || !h) return null;
    for (const b of h.blocks) {
      const inv = b.inverters.find(i => i.id === selectedId);
      if (inv) return { id: inv.id, name: inv.name, type: "Inverter", stats: [
        { l: "Status",       v: inv.status === "success" ? "Normal" : inv.status === "warning" ? "Warning" : "Alarm" },
        { l: "Health",       v: `${inv.health}%` },
        { l: "Output",       v: `${inv.output}%` },
        { l: "Temperature",  v: `${inv.temp}°C` },
        { l: "Strings",      v: String(inv.strings) },
        { l: "Active Alarms",v: String(inv.alarms) },
        { l: "Block",        v: b.name },
        { l: "Protocol",     v: "Modbus TCP" },
        { l: "SCADA Tag",    v: `${site.id.toUpperCase()}.${inv.id}.DC_POWER` },
      ]};
    }
    const tx = h.transformers.find(t => t.id === selectedId);
    if (tx) return { id: tx.id, name: tx.name, type: "Transformer", stats: [
      { l: "Status",       v: tx.status === "success" ? "Normal" : "Warning" },
      { l: "Health",       v: `${tx.health}%` },
      { l: "Load",         v: `${tx.load}%` },
      { l: "Temperature",  v: `${tx.temp}°C` },
      { l: "Active Alarms",v: String(tx.alarms) },
      { l: "Rating",       v: "33/0.4kV 85 MVA" },
      { l: "Protocol",     v: "IEC 61850" },
    ]};
    return null;
  }, [selectedId, h, site.id]);

  if (!h) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--ds-text-faint)" }}>
      Single Line Diagram not available for {site.name}
    </div>
  );

  // ── SVG Layout parameters ──────────────────────────────────────────────
  const nBlocks = h.blocks.length;
  const BLOCK_W = Math.max(200, Math.min(260, 900 / nBlocks));
  const SVG_W   = Math.max(900, nBlocks * BLOCK_W + 200);
  const BLOCK_STARTS = h.blocks.map((_, i) => 60 + i * BLOCK_W + BLOCK_W / 2);

  // Vertical positions
  const Y = {
    grid:     50,
    hvBus:    90,
    mainTx:   145,
    mvBus:    215,
    blockTx:  285,
    lvBus:    350,
    invRow:   415,
    dcBus:    480,
    pvArr:    540,
    aux:      620,
  };

  const SVG_H = Y.aux + 80;
  const MV_X1 = BLOCK_STARTS[0] - BLOCK_W * 0.35;
  const MV_X2 = BLOCK_STARTS[nBlocks - 1] + BLOCK_W * 0.35;
  const CENTER_X = SVG_W / 2;

  return (
    <div className="sld-page">

      {/* ── Top status bar ─────────────────────────────────────────── */}
      <div className="sld-topbar">
        <div className="sld-breadcrumb">
          <span style={{ color: "var(--ds-text-faint)" }}>Dashboard</span>
          <span style={{ color: "var(--ds-text-faint)", margin: "0 4px" }}>›</span>
          <span style={{ color: "var(--ds-text-faint)" }}>{site.name}</span>
          <span style={{ color: "var(--ds-text-faint)", margin: "0 4px" }}>›</span>
          <span style={{ color: "var(--ds-text)" }}>Single Line Diagram</span>
        </div>
        <div className="sld-status-chips">
          {alarmList.filter(a => a.type === "alarm").length > 0 && (
            <span className="sld-chip alarm">⚠ {alarmList.filter(a=>a.type==="alarm").length} Fault{alarmList.filter(a=>a.type==="alarm").length>1?"s":""}</span>
          )}
          {alarmList.filter(a => a.type === "warning").length > 0 && (
            <span className="sld-chip warning">⚠ {alarmList.filter(a=>a.type==="warning").length} Warning{alarmList.filter(a=>a.type==="warning").length>1?"s":""}</span>
          )}
          <span className="sld-chip online">◎ {site.status}</span>
          <span className="sld-chip live">● LIVE</span>
        </div>
        <div className="sld-zoom-controls">
          <button className="sld-zoom-btn" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>+</button>
          <span className="sld-zoom-val">{Math.round(zoom * 100)}%</span>
          <button className="sld-zoom-btn" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>−</button>
          <button className="sld-zoom-btn" onClick={() => setZoom(1)}>⟲</button>
        </div>
      </div>

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div className="sld-layout">

        {/* Left: Asset Hierarchy */}
        <div className="sld-hierarchy">
          <div className="sld-hier-title">ASSET HIERARCHY</div>
          <div className="sld-hier-search"><input placeholder="Search assets…" className="sld-hier-input"/></div>
          <div className="sld-hier-legend">
            <span><span className="sld-dot normal"/> normal</span>
            <span><span className="sld-dot warning"/> warning</span>
            <span><span className="sld-dot alarm"/> alarm</span>
          </div>
          <div className="sld-hier-tree">
            {/* Site root */}
            <div className="sld-tree-site">{site.name}</div>
            {h.blocks.map(b => {
              const bStatus = b.inverters.some(i=>i.status==="danger") ? "alarm" : b.inverters.some(i=>i.status==="warning") ? "warning" : "normal";
              return (
                <div key={b.id}>
                  <div className="sld-tree-block">
                    <span className={`sld-dot ${bStatus}`}/>
                    {b.name}
                  </div>
                  {b.inverters.map(inv => (
                    <div key={inv.id}
                      className={`sld-tree-inv${selectedId===inv.id?" selected":""}`}
                      onClick={() => select(inv.id)}>
                      <span className={`sld-dot ${inv.status==="danger"?"alarm":inv.status==="warning"?"warning":"normal"}`}/>
                      <span>{inv.name}</span>
                      <span className="sld-tree-mw">{(inv.output * 0.01 * 8.5).toFixed(1)} MW</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="sld-tree-section">MV Substation {VL.mv.label}</div>
            {h.transformers.map(tx => (
              <div key={tx.id}
                className={`sld-tree-inv${selectedId===tx.id?" selected":""}`}
                onClick={() => select(tx.id)}>
                <span className={`sld-dot ${tx.status==="warning"?"warning":"normal"}`}/>
                <span>{tx.name}</span>
                <span className="sld-tree-mw">{tx.load}% load</span>
              </div>
            ))}
            {h.bess && (
              <>
                <div className="sld-tree-section">BESS</div>
                <div className="sld-tree-inv">
                  <span className="sld-dot normal"/>
                  <span>{h.bess.name}</span>
                  <span className="sld-tree-mw">{(h.bess as {soc?:number}).soc ?? 76}% SOC</span>
                </div>
              </>
            )}
            {h.weatherStation && (
              <>
                <div className="sld-tree-section">Ancillary</div>
                <div className="sld-tree-inv"><span className="sld-dot normal"/>{h.weatherStation.name}</div>
              </>
            )}
            <div className="sld-tree-inv"><span className="sld-dot normal"/>{h.scada.name}</div>
          </div>
        </div>

        {/* Center: SVG Canvas */}
        <div className="sld-canvas-wrap" onWheel={(e) => {
          e.preventDefault();
          setZoom(z => Math.max(0.4, Math.min(2, z - e.deltaY * 0.001)));
        }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.1s" }}>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={SVG_W} height={SVG_H}
              style={{ display: "block" }}>

              {/* ── Grid Connection ── */}
              <GridPoint x={CENTER_X} y={Y.grid} label="UTILITY GRID" kv="132 kV" mw={`${site.generation} MW`}/>
              <Wire x1={CENTER_X} y1={Y.grid+18} x2={CENTER_X} y2={Y.hvBus} vl="hv" animated/>

              {/* ── 132kV HV Busbar ── */}
              <Busbar x1={60} y1={Y.hvBus} x2={SVG_W-60} vl="hv" label={`HV BUS — ${VL.hv.label}`}
                telemetry={`${(site.generation*1.0).toFixed(0)} MW · ${(site.generation*0.15).toFixed(1)} MVAR · PF 0.99`}/>

              {/* CB on HV side */}
              <CB x={CENTER_X-30} y={Y.hvBus} closed status="success" id="CB-HV-1" label="CB-1" selected={selectedId==="CB-HV-1"} onClick={select}/>
              <CB x={CENTER_X+30} y={Y.hvBus} closed status="success" id="CB-HV-2" label="CB-2" selected={selectedId==="CB-HV-2"} onClick={select}/>

              {/* Main Transformer 132/33kV */}
              <Wire x1={CENTER_X} y1={Y.hvBus+3} x2={CENTER_X} y2={Y.mainTx-22} vl="hv"/>
              <TX x={CENTER_X} y={Y.mainTx} label="T-MAIN" sub="132/33kV · 280MVA" status="success" id="TX-MAIN" selected={selectedId==="TX-MAIN"} onClick={select}/>
              <Meter x={CENTER_X+50} y={Y.mainTx} label="PQM-1"/>

              {/* ── 33kV MV Busbar ── */}
              <Wire x1={CENTER_X} y1={Y.mainTx+22} x2={CENTER_X} y2={Y.mvBus} vl="mv"/>
              <Busbar x1={MV_X1-20} y1={Y.mvBus} x2={MV_X2+20} vl="mv" label={`MV BUS — ${VL.mv.label}`}
                telemetry={`${(site.generation*0.985).toFixed(0)} MW · ${(site.generation*0.12).toFixed(1)} MVAR`}/>

              {/* ── Per-block layout ── */}
              {h.blocks.map((block, bi) => {
                const bx   = BLOCK_STARTS[bi];
                const tx   = h.transformers[bi];
                const invs = block.inverters;
                const nInv = invs.length;
                const invSpacing = Math.min(BLOCK_W * 0.85, nInv * 58) / nInv;
                const invStart   = bx - (nInv - 1) * invSpacing / 2;
                const bAgg = {
                  mw:     +(invs.reduce((s,i) => s + i.output * 0.01 * 8.5, 0)).toFixed(1),
                  status: (invs.some(i=>i.status==="danger") ? "danger" : invs.some(i=>i.status==="warning") ? "warning" : "success") as "success"|"warning"|"danger",
                };
                const txStatus = tx ? (tx.status === "success" ? "success" : "warning") as "success"|"warning"|"danger" : "success";

                return (
                  <g key={block.id}>
                    {/* MV Bus → CB → TX */}
                    <Wire x1={bx} y1={Y.mvBus+3} x2={bx} y2={Y.mvBus+20} vl="mv"/>
                    <CB x={bx} y={Y.mvBus+28} closed status={bAgg.status} id={`CB-MV-${bi}`} label={`CB-MV${bi+1}`} selected={selectedId===`CB-MV-${bi}`} onClick={select}/>
                    <Wire x1={bx} y1={Y.mvBus+40} x2={bx} y2={Y.blockTx-22} vl="mv"/>
                    {tx ? (
                      <>
                        <TX x={bx} y={Y.blockTx} label={tx.name.replace("Transformer ","")}
                          sub={`33/0.4kV · ${tx.load}% load`} status={txStatus}
                          id={tx.id} selected={selectedId===tx.id} onClick={select}
                          alarm={tx.alarms>0}/>
                        <Meter x={bx+30} y={Y.blockTx-10} label="M"/>
                      </>
                    ) : (
                      <text x={bx} y={Y.blockTx} textAnchor="middle" fontSize={9} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">No TX</text>
                    )}

                    {/* TX → LV Bus */}
                    <Wire x1={bx} y1={Y.blockTx+22} x2={bx} y2={Y.lvBus} vl="lv"/>
                    <Busbar x1={bx - invSpacing*(nInv-1)/2 - 20} y1={Y.lvBus} x2={bx + invSpacing*(nInv-1)/2 + 20} vl="lv"
                      label={`LV ${VL.lv.label} · ${block.name}`}
                      telemetry={`${bAgg.mw} MW`}/>
                    <CB x={bx-invSpacing*(nInv-1)/2-10} y={Y.lvBus} closed status={bAgg.status} id={`CB-LV-${bi}`} label="" selected={selectedId===`CB-LV-${bi}`} onClick={select}/>

                    {/* Inverters */}
                    {invs.map((inv, ii) => {
                      const ix = invStart + ii * invSpacing;
                      const invSt = (inv.status === "success" ? "success" : inv.status === "warning" ? "warning" : "danger") as "success"|"warning"|"danger";
                      const pwStr = `${(inv.output * 0.01 * 8.5).toFixed(1)}MW`;
                      return (
                        <g key={inv.id}>
                          {/* LV Bus → CB → Inverter */}
                          <Wire x1={ix} y1={Y.lvBus+3} x2={ix} y2={Y.lvBus+18} vl="lv"/>
                          <CB x={ix} y={Y.lvBus+24} closed={inv.status!=="danger"} status={invSt}
                            id={`CB-INV-${inv.id}`} label="" selected={selectedId===`CB-INV-${inv.id}`} onClick={select}/>
                          <Wire x1={ix} y1={Y.lvBus+34} x2={ix} y2={Y.invRow-16} vl="lv"/>
                          <Inverter x={ix} y={Y.invRow} label={inv.name} power={pwStr} status={invSt}
                            id={inv.id} selected={selectedId===inv.id} onClick={select} alarm={inv.alarms>0}/>
                          {/* Inverter → DC Bus */}
                          <Wire x1={ix} y1={Y.invRow+17} x2={ix} y2={Y.dcBus-3} vl="dc"/>
                          {/* DC bus segment */}
                          {ii === 0 && (
                            <Busbar x1={invStart-16} y1={Y.dcBus} x2={invStart+invSpacing*(nInv-1)+16} vl="dc"
                              label={`DC BUS · ${block.name}`} telemetry={`${(bAgg.mw*1.03).toFixed(1)} MW DC`}/>
                          )}
                          {/* DC Bus → PV Array */}
                          <Wire x1={ix} y1={Y.dcBus+4} x2={ix} y2={Y.pvArr-14} vl="dc"/>
                          <PVArray x={ix} y={Y.pvArr} strings={inv.strings} label={`PV-${bi+1}${ii+1}`}/>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* ── BESS (if present) ── */}
              {h.bess && (() => {
                const bx = SVG_W - 80;
                const soc = (h.bess as {soc?:number}).soc ?? 76;
                return (
                  <g>
                    <Wire x1={bx} y1={Y.mvBus+3} x2={bx} y2={Y.mvBus+30} vl="mv"/>
                    <CB x={bx} y={Y.mvBus+38} closed status="success" id="CB-BESS" label="CB-BESS" selected={selectedId==="CB-BESS"} onClick={select}/>
                    <Wire x1={bx} y1={Y.mvBus+50} x2={bx} y2={Y.blockTx-22} vl="mv"/>
                    <TX x={bx} y={Y.blockTx} label="TX-BESS" sub={`33/0.4kV`} status="success" id="TX-BESS" selected={selectedId==="TX-BESS"} onClick={select}/>
                    <Wire x1={bx} y1={Y.blockTx+22} x2={bx} y2={Y.invRow-20} vl="lv"/>
                    {/* Battery symbol */}
                    <rect x={bx-30} y={Y.invRow-16} width={60} height={48} rx={5} fill="rgba(129,140,248,0.12)" stroke="#818cf8" strokeWidth={1.5}/>
                    <text x={bx} y={Y.invRow+4}  textAnchor="middle" fontSize={9}  fontWeight={700} fill="#818cf8" fontFamily="Inter,sans-serif">BESS</text>
                    <text x={bx} y={Y.invRow+17} textAnchor="middle" fontSize={8}  fill="var(--dt-text-secondary)" fontFamily="Inter,sans-serif">{soc}% SOC</text>
                    <text x={bx} y={Y.invRow+28} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">{h.bess.name}</text>
                  </g>
                );
              })()}

              {/* ── Switchyard ── */}
              {(() => {
                const sx = SVG_W - 30;
                return (
                  <g>
                    <Wire x1={MV_X2+20} y1={Y.mvBus} x2={sx-18} y2={Y.mvBus} vl="mv"/>
                    <rect x={sx-18} y={Y.mvBus-20} width={46} height={40} rx={5}
                      fill="rgba(91,141,224,0.1)" stroke="#5b8de0" strokeWidth={1.5}/>
                    <text x={sx+5} y={Y.mvBus-7} textAnchor="middle" fontSize={8} fontWeight={700} fill="#5b8de0" fontFamily="Inter,sans-serif">SY</text>
                    <text x={sx+5} y={Y.mvBus+6} textAnchor="middle" fontSize={7} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">SW-001</text>
                  </g>
                );
              })()}

              {/* ── SCADA / Comms lines ── */}
              {h.scada && (
                <g>
                  <line x1={60} y1={Y.aux} x2={SVG_W-60} y2={Y.aux} stroke={VL.comm.stroke} strokeWidth={1} strokeDasharray="6 4" opacity={0.4}/>
                  <text x={70} y={Y.aux-5} fontSize={8} fill={VL.comm.stroke} fontFamily="Inter,sans-serif" opacity={0.7}>SCADA / Comm Bus — OPC-UA · IEC 61850 · Modbus TCP</text>
                  <rect x={SVG_W/2-35} y={Y.aux-8} width={70} height={20} rx={4} fill="var(--dt-node-fill)" stroke={VL.comm.stroke} strokeWidth={1} opacity={0.7}/>
                  <text x={SVG_W/2} y={Y.aux+5} textAnchor="middle" fontSize={8} fill={VL.comm.stroke} fontFamily="Inter,sans-serif">SCADA Server</text>
                </g>
              )}

              {/* Alarm annotations on diagram */}
              {alarmList.slice(0,2).map((a, i) => (
                <AlarmChip key={a.id} x={SVG_W - 200} y={Y.mvBus + 40 + i*28} msg={`${a.name}: ${a.msg}`} type={a.type}/>
              ))}

            </svg>
          </div>
        </div>

        {/* Right: Alarm panel + selected detail */}
        {showAlarmPanel && (
          <div className="sld-right-panel">
            {/* Selected component detail */}
            {selectedInfo ? (
              <div className="sld-detail-panel">
                <div className="sld-detail-header">
                  <span className="sld-detail-type">{selectedInfo.type}</span>
                  <button className="sld-close-btn" onClick={() => setSelectedId(null)}>✕</button>
                </div>
                <div className="sld-detail-name">{selectedInfo.name}</div>
                <div className="sld-detail-stats">
                  {selectedInfo.stats.map(s => (
                    <div key={s.l} className="sld-detail-row">
                      <span className="sld-detail-label">{s.l}</span>
                      <span className="sld-detail-value">{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sld-detail-panel sld-detail-empty">
                <div style={{ opacity: 0.4, fontSize: 12, textAlign: "center" }}>Click any component to view details</div>
              </div>
            )}

            {/* Alarm list */}
            <div className="sld-alarm-list">
              <div className="sld-alarm-title">
                Active Events ({alarmList.length})
              </div>
              {alarmList.length === 0 ? (
                <div className="sld-no-alarm">✓ No active alarms</div>
              ) : alarmList.map((a, i) => (
                <div key={i} className={`sld-alarm-row sld-alarm-${a.type}`} onClick={() => select(a.id)}>
                  <div className="sld-alarm-icon">{a.type==="alarm"?"⚠":"⚡"}</div>
                  <div>
                    <div className="sld-alarm-name">{a.name}</div>
                    <div className="sld-alarm-msg">{a.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom legend ─────────────────────────────────────────── */}
      <div className="sld-legend">
        {(Object.entries(VL) as [string, {stroke:string;label:string}][]).map(([k,v]) => (
          <span key={k} className="sld-leg-item">
            <span className="sld-leg-line" style={{ background: v.stroke }}/>
            {v.label}
          </span>
        ))}
        <span className="sld-leg-sep"/>
        <span className="sld-leg-item"><span className="sld-cb-closed"/>Closed CB</span>
        <span className="sld-leg-item"><span className="sld-cb-open"/>Open CB</span>
        <span className="sld-leg-item"><span className="sld-sym-tx"/>TX</span>
        <span className="sld-leg-item"><span className="sld-sym-inv"/>Inverter</span>
        <span className="sld-leg-item"><span className="sld-sym-pv"/>PV Array</span>
        <span className="sld-leg-sep"/>
        <span className="sld-leg-item" style={{ color: "#ef4444" }}>⚠ Alarm</span>
        <span className="sld-leg-item" style={{ color: "#f59e0b" }}>⚡ Warning</span>
        <span className="sld-leg-item" style={{ color: "#22c55e" }}>◎ Normal</span>
        <span className="sld-leg-note">Scroll=Zoom · Drag=Pan</span>
      </div>
    </div>
  );
}
