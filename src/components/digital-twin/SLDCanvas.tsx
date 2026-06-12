/**
 * SLDCanvas — embeddable Single Line Diagram.
 * Renders the full electrical SLD SVG with zoom, alarm badges and layer toggle.
 * Designed to drop inside any panel — no page chrome.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SiteData, SITE_ASSET_HIERARCHY, WORK_ORDERS } from "../../data/mockData";
import { fetchHierarchy, fetchSiteWorkOrders } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useNavigate } from "react-router-dom";

// ─── Voltage palette ─────────────────────────────────────────────────────────
const VL = {
  hv: { s: "#3b82f6", f: "rgba(59,130,246,0.10)", lbl: "132kV" },
  mv: { s: "#eab308", f: "rgba(234,179,8,0.10)", lbl: "33kV" },
  lv: { s: "#22c55e", f: "rgba(34,197,94,0.10)", lbl: "0.4kV" },
  dc: { s: "#f97316", f: "rgba(249,115,22,0.10)", lbl: "DC" },
  com: { s: "#94a3b8", f: "rgba(148,163,184,0.06)", lbl: "Comm" },
};

function sc(s: "success" | "warning" | "danger" | "normal") {
  return s === "success" || s === "normal" ? "#22c55e" : s === "warning" ? "#f59e0b" : "#ef4444";
}

// ─── SVG symbols ─────────────────────────────────────────────────────────────
function CB({
  x,
  y,
  closed = true,
  status = "success" as "success" | "warning" | "danger",
  id,
  sel,
  onSel,
}: {
  x: number;
  y: number;
  closed?: boolean;
  status?: "success" | "warning" | "danger";
  id: string;
  sel?: boolean;
  onSel: (id: string) => void;
}) {
  const c = sc(status);
  const sz = 11;
  return (
    <g onClick={() => onSel(id)} style={{ cursor: "pointer" }}>
      {sel && <rect x={x - sz} y={y - sz} width={sz * 2} height={sz * 2} rx={3} fill="rgba(91,141,224,0.18)" stroke="#5b8de0" strokeWidth={1.5} />}
      <rect
        x={x - sz / 2}
        y={y - sz / 2}
        width={sz}
        height={sz}
        rx={2}
        fill={closed ? c + "cc" : "transparent"}
        stroke={c}
        strokeWidth={closed ? 1.5 : 2}
      />
      {!closed && <line x1={x - sz / 2 + 2} y1={y - sz / 2 + 2} x2={x + sz / 2 - 2} y2={y + sz / 2 - 2} stroke={c} strokeWidth={1.5} />}
    </g>
  );
}

function TX({
  x,
  y,
  label,
  sub,
  status = "success" as "success" | "warning" | "danger",
  id,
  sel,
  onSel,
  alarm,
}: {
  x: number;
  y: number;
  label: string;
  sub?: string;
  status?: "success" | "warning" | "danger";
  id: string;
  sel?: boolean;
  onSel: (id: string) => void;
  alarm?: boolean;
}) {
  const c = sc(status);
  const r = 15;
  return (
    <g onClick={() => onSel(id)} style={{ cursor: "pointer" }}>
      {sel && (
        <rect
          x={x - r - 8}
          y={y - r - 4}
          width={r * 2 + 16}
          height={r * 2 + 8}
          rx={5}
          fill="rgba(91,141,224,0.15)"
          stroke="#5b8de0"
          strokeWidth={1.5}
        />
      )}
      {alarm && (
        <>
          <circle cx={x + r} cy={y - r} r={6} fill="#ef4444" />
          <text
            x={x + r}
            y={y - r}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill="#fff"
            fontWeight={800}
            fontFamily="Inter,sans-serif"
          >
            !
          </text>
        </>
      )}
      <circle cx={x - 5} cy={y} r={r} fill="var(--dt-node-fill)" stroke={c} strokeWidth={1.5} />
      <circle cx={x + 5} cy={y} r={r} fill="var(--dt-node-fill)" stroke={c} strokeWidth={1.5} />
      <text x={x} y={y + r + 10} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--dt-text-primary)" fontFamily="Inter,sans-serif">
        {label}
      </text>
      {sub && (
        <text x={x} y={y + r + 20} textAnchor="middle" fontSize={7} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
          {sub}
        </text>
      )}
    </g>
  );
}

function Bus({ x1, y, x2, vl, label, tel }: { x1: number; y: number; x2: number; vl: keyof typeof VL; label: string; tel?: string }) {
  const v = VL[vl];
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={v.s} strokeWidth={5} strokeLinecap="round" />
      <text x={x1 + 5} y={y - 7} fontSize={8} fontWeight={700} fill={v.s} fontFamily="Inter,sans-serif">
        {label}
      </text>
      {tel && (
        <text x={x1 + 5} y={y + 13} fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
          {tel}
        </text>
      )}
    </g>
  );
}

function Inv({
  x,
  y,
  label,
  pwr,
  status = "success" as "success" | "warning" | "danger",
  id,
  sel,
  onSel,
  alarm,
}: {
  x: number;
  y: number;
  label: string;
  pwr: string;
  status?: "success" | "warning" | "danger";
  id: string;
  sel?: boolean;
  onSel: (id: string) => void;
  alarm?: boolean;
}) {
  const c = sc(status);
  const w = 46,
    h = 28;
  return (
    <g onClick={() => onSel(id)} style={{ cursor: "pointer" }}>
      {sel && (
        <rect
          x={x - w / 2 - 4}
          y={y - h / 2 - 4}
          width={w + 8}
          height={h + 8}
          rx={5}
          fill="rgba(91,141,224,0.15)"
          stroke="#5b8de0"
          strokeWidth={1.5}
        />
      )}
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={3}
        fill={status === "danger" ? "rgba(220,38,38,0.14)" : status === "warning" ? "rgba(217,119,6,0.1)" : "var(--dt-node-fill)"}
        stroke={c}
        strokeWidth={1.5}
      />
      <text x={x} y={y - 2} textAnchor="middle" fontSize={9} fill={c} fontFamily="Inter,sans-serif" fontWeight={700}>
        ≈
      </text>
      <text x={x} y={y + 9} textAnchor="middle" fontSize={7} fill="var(--dt-text-secondary)" fontFamily="Inter,sans-serif">
        {pwr}
      </text>
      <text x={x} y={y + h / 2 + 9} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
        {label}
      </text>
      {alarm && (
        <>
          <circle cx={x + w / 2 - 2} cy={y - h / 2 + 2} r={5} fill="#ef4444" />
          <text
            x={x + w / 2 - 2}
            y={y - h / 2 + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={6}
            fill="#fff"
            fontWeight={800}
            fontFamily="Inter,sans-serif"
          >
            !
          </text>
        </>
      )}
    </g>
  );
}

function PVArr({ x, y, str, label }: { x: number; y: number; str: number; label: string }) {
  const w = 42,
    h = 24;
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={2} fill={VL.dc.f} stroke={VL.dc.s} strokeWidth={1} />
      <line x1={x - w / 2 + 14} y1={y - h / 2} x2={x - w / 2 + 14} y2={y + h / 2} stroke={VL.dc.s} strokeWidth={0.5} opacity={0.5} />
      <line x1={x - w / 2 + 28} y1={y - h / 2} x2={x - w / 2 + 28} y2={y + h / 2} stroke={VL.dc.s} strokeWidth={0.5} opacity={0.5} />
      <line x1={x - w / 2} y1={y} x2={x + w / 2} y2={y} stroke={VL.dc.s} strokeWidth={0.5} opacity={0.5} />
      <text x={x} y={y + 2} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill={VL.dc.s} fontFamily="Inter,sans-serif">
        {str}×str
      </text>
      <text x={x} y={y + h / 2 + 9} textAnchor="middle" fontSize={7} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
        {label}
      </text>
    </g>
  );
}

function Wire({
  x1,
  y1,
  x2,
  y2,
  vl = "mv" as keyof typeof VL,
  anim = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  vl?: keyof typeof VL;
  anim?: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={VL[vl].s}
      strokeWidth={anim ? 2 : 1.5}
      strokeDasharray={anim ? "8 5" : undefined}
      style={anim ? { animation: "dtFlow 0.8s linear infinite" } : undefined}
    />
  );
}

// ─── Selected component info (exported so parent can use it) ─────────────────
export interface SLDSelectedInfo {
  id: string;
  name: string;
  type: string;
  status: "success" | "warning" | "danger";
  stats: { label: string; value: string; warn?: boolean }[];
}

// ─── Main embeddable component ────────────────────────────────────────────────
interface Props {
  siteId: string;
  site: SiteData;
  onSelect?: (info: SLDSelectedInfo | null) => void;
}

export function SLDCanvas({ siteId, site, onSelect }: Props) {
  const nav = useNavigate();
  const [selId, setSelId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const { data: apiH } = useApi(() => fetchHierarchy(siteId), [siteId]);
  const { data: apiWO } = useApi(() => fetchSiteWorkOrders(siteId), [siteId]);
  const h = apiH ?? SITE_ASSET_HIERARCHY[siteId];
  const _wos = apiWO ?? WORK_ORDERS.filter((w) => w.siteId === siteId);

  const sel = useCallback((id: string) => setSelId((p) => (p === id ? null : id)), []);

  // ── Compute info for the selected component ──────────────────────────────
  const selectedInfo = useMemo((): SLDSelectedInfo | null => {
    if (!selId || !h) return null;
    for (const b of h.blocks) {
      const inv = b.inverters.find(i => i.id === selId);
      if (inv) return {
        id: inv.id, name: inv.name, type: "Inverter",
        status: inv.status as "success" | "warning" | "danger",
        stats: [
          { label: "Status",      value: inv.status === "success" ? "Normal" : inv.status === "warning" ? "Warning" : "Alarm", warn: inv.status !== "success" },
          { label: "Output",      value: `${inv.output}%`,   warn: inv.output < 80 },
          { label: "Temperature", value: `${inv.temp}°C`,    warn: inv.temp > 70 },
          { label: "Strings",     value: String(inv.strings) },
          { label: "Alarms",      value: String(inv.alarms), warn: inv.alarms > 0 },
          { label: "Block",       value: b.name },
          { label: "Protocol",    value: "Modbus TCP" },
        ],
      };
    }
    const tx = h.transformers.find(t => t.id === selId);
    if (tx) return {
      id: tx.id, name: tx.name, type: "Transformer",
      status: tx.status as "success" | "warning" | "danger",
      stats: [
        { label: "Status",      value: tx.status === "success" ? "Normal" : "Warning", warn: tx.status !== "success" },
        { label: "Load",        value: `${tx.load}%`,  warn: tx.load > 85 },
        { label: "Temperature", value: `${tx.temp}°C`, warn: tx.temp > 70 },
        { label: "Rating",      value: "33/0.4kV · 85 MVA" },
        { label: "Alarms",      value: String(tx.alarms), warn: tx.alarms > 0 },
        { label: "Protocol",    value: "IEC 61850" },
      ],
    };
    if (selId === "TX-MAIN") return {
      id: "TX-MAIN", name: "T-MAIN", type: "Main Transformer",
      status: "success",
      stats: [
        { label: "Rating",  value: "132/33kV · 280 MVA" },
        { label: "Status",  value: "Normal" },
        { label: "Output",  value: `${site.generation} MW` },
        { label: "PF",      value: "0.99" },
      ],
    };
    if (selId.startsWith("CB-")) return {
      id: selId, name: selId.replace("CB-", "CB "), type: "Circuit Breaker",
      status: "success",
      stats: [
        { label: "State",    value: "Closed" },
        { label: "Voltage",  value: selId.includes("HV") ? "132 kV" : selId.includes("MV") ? "33 kV" : "0.4 kV" },
        { label: "Protocol", value: "IED / IEC 61850" },
      ],
    };
    if (selId === "CB-BESS" && h.bess) return {
      id: "CB-BESS", name: "CB-BESS", type: "BESS Circuit Breaker",
      status: "success",
      stats: [
        { label: "State",   value: "Closed" },
        { label: "BESS SOC",value: `${(h.bess as { soc?: number }).soc ?? 76}%` },
      ],
    };
    return null;
  }, [selId, h, site.generation]);

  // Fire onSelect whenever selection changes
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  useEffect(() => { onSelectRef.current?.(selectedInfo); }, [selectedInfo]);

  const alarmCount = useMemo(() => {
    if (!h) return 0;
    return (
      h.blocks.flatMap((b) => b.inverters).filter((i) => i.status !== "success").length + h.transformers.filter((t) => t.status !== "success").length
    );
  }, [h]);

  if (!h)
    return <div style={{ padding: 24, textAlign: "center", color: "var(--ds-text-faint)", fontSize: 12 }}>SLD not available for {site.name}</div>;

  // ── Layout ─────────────────────────────────────────────────────────────────
  const nB = h.blocks.length;
  const BLK_W = Math.max(180, Math.min(240, 780 / nB));
  const SVG_W = Math.max(780, nB * BLK_W + 120);
  const CX = SVG_W / 2;
  const BX = h.blocks.map((_, i) => 60 + i * BLK_W + BLK_W / 2);
  const MV_X1 = BX[0] - BLK_W * 0.4;
  const MV_X2 = BX[nB - 1] + BLK_W * 0.4;

  const Y = { grid: 45, hvBus: 88, mainTx: 140, mvBus: 200, txB: 260, lvBus: 315, invRow: 375, dcBus: 430, pvArr: 482, aux: 548 };
  const SVG_H = Y.aux + 60;

  return (
    <div className="sldc-wrap">
      {/* Toolbar */}
      <div className="sldc-toolbar">
        <div className="sldc-toolbar-left">
          {alarmCount > 0 && (
            <span className="sldc-alarm-badge">
              {alarmCount} alarm{alarmCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="sldc-live-dot" />
          <span style={{ fontSize: 9, color: "var(--ds-text-faint)" }}>LIVE · IEC 61850</span>
        </div>
        <div className="sldc-zoom">
          <button className="sldc-zbtn" onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}>
            +
          </button>
          <span className="sldc-zpct">{Math.round(zoom * 100)}%</span>
          <button className="sldc-zbtn" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}>
            −
          </button>
          <button className="sldc-zbtn" onClick={() => setZoom(1)}>
            ⟲
          </button>
        </div>
        <button className="sldc-full-btn" onClick={() => nav(`/site/${siteId}/sld`)} title="Open full Single Line Diagram">
          ⤢ Full SLD
        </button>
      </div>

      {/* Canvas */}
      <div
        className="sldc-canvas"
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.max(0.4, Math.min(1.8, z - e.deltaY * 0.001)));
        }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", transition: "transform 0.1s" }}>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={SVG_W} height={SVG_H} style={{ display: "block" }}>
            {/* Grid connection */}
            <rect x={CX - 44} y={Y.grid - 18} width={88} height={36} rx={5} fill={VL.hv.f} stroke={VL.hv.s} strokeWidth={2} />
            <text x={CX} y={Y.grid - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill={VL.hv.s} fontFamily="Inter,sans-serif">
              UTILITY GRID
            </text>
            <text x={CX} y={Y.grid + 8} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
              132kV · {site.generation} MW
            </text>
            <Wire x1={CX} y1={Y.grid + 18} x2={CX} y2={Y.hvBus} vl="hv" anim />

            {/* HV Bus */}
            <Bus
              x1={60}
              y={Y.hvBus}
              x2={SVG_W - 60}
              vl="hv"
              label={`HV BUS — ${VL.hv.lbl}`}
              tel={`${site.generation} MW · PF 0.99 · ${(site.generation * 0.14).toFixed(0)} MVAR`}
            />
            <CB x={CX - 26} y={Y.hvBus} closed status="success" id="CB-HV1" sel={selId === "CB-HV1"} onSel={sel} />
            <CB x={CX + 26} y={Y.hvBus} closed status="success" id="CB-HV2" sel={selId === "CB-HV2"} onSel={sel} />

            {/* Main TX */}
            <Wire x1={CX} y1={Y.hvBus + 4} x2={CX} y2={Y.mainTx - 20} vl="hv" />
            <TX x={CX} y={Y.mainTx} label="T-MAIN" sub="132/33kV · 280MVA" status="success" id="TX-MAIN" sel={selId === "TX-MAIN"} onSel={sel} />
            {/* meter */}
            <circle cx={CX + 44} cy={Y.mainTx} r={7} fill="var(--dt-node-fill)" stroke="#94a3b8" strokeWidth={1} />
            <text
              x={CX + 44}
              y={Y.mainTx}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={5.5}
              fill="var(--dt-text-faint)"
              fontFamily="Inter,sans-serif"
            >
              PQM
            </text>

            {/* MV Bus */}
            <Wire x1={CX} y1={Y.mainTx + 20} x2={CX} y2={Y.mvBus} vl="mv" />
            <Bus
              x1={MV_X1 - 16}
              y={Y.mvBus}
              x2={MV_X2 + 16}
              vl="mv"
              label={`MV BUS — ${VL.mv.lbl}`}
              tel={`${(site.generation * 0.987).toFixed(0)} MW · ${(site.generation * 0.11).toFixed(0)} MVAR`}
            />

            {/* Per-block */}
            {h.blocks.map((blk, bi) => {
              const bx = BX[bi];
              const tx = h.transformers[bi];
              const invs = blk.inverters;
              const nInv = invs.length;
              const iSp = Math.min(BLK_W * 0.82, nInv * 52) / nInv;
              const iX0 = bx - ((nInv - 1) * iSp) / 2;
              const bSt = (invs.some((i) => i.status === "danger") ? "danger" : invs.some((i) => i.status === "warning") ? "warning" : "success") as
                | "success"
                | "warning"
                | "danger";

              return (
                <g key={blk.id}>
                  {/* MV Bus → CB → TX */}
                  <Wire x1={bx} y1={Y.mvBus + 4} x2={bx} y2={Y.mvBus + 18} vl="mv" />
                  <CB x={bx} y={Y.mvBus + 25} closed status={bSt} id={`CB-MV-${bi}`} sel={selId === `CB-MV-${bi}`} onSel={sel} />
                  <Wire x1={bx} y1={Y.mvBus + 34} x2={bx} y2={Y.txB - 20} vl="mv" />
                  {tx ? (
                    <TX
                      x={bx}
                      y={Y.txB}
                      label={tx.name.replace("Transformer ", "")}
                      sub={`${tx.load}% load`}
                      status={(tx.status === "success" ? "success" : "warning") as "success" | "warning" | "danger"}
                      id={tx.id}
                      sel={selId === tx.id}
                      onSel={sel}
                      alarm={tx.alarms > 0}
                    />
                  ) : (
                    <text x={bx} y={Y.txB} textAnchor="middle" fontSize={9} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
                      —
                    </text>
                  )}

                  {/* TX → LV Bus */}
                  <Wire x1={bx} y1={Y.txB + 20} x2={bx} y2={Y.lvBus} vl="lv" />
                  <Bus
                    x1={bx - (iSp * (nInv - 1)) / 2 - 16}
                    y={Y.lvBus}
                    x2={bx + (iSp * (nInv - 1)) / 2 + 16}
                    vl="lv"
                    label={`LV ${VL.lv.lbl} · ${blk.name}`}
                  />

                  {/* Inverters */}
                  {invs.map((inv, ii) => {
                    const ix = iX0 + ii * iSp;
                    const ist = (inv.status === "success" ? "success" : inv.status === "warning" ? "warning" : "danger") as
                      | "success"
                      | "warning"
                      | "danger";
                    const pw = `${(inv.output * 0.01 * 8.5).toFixed(1)}MW`;
                    return (
                      <g key={inv.id}>
                        <Wire x1={ix} y1={Y.lvBus + 4} x2={ix} y2={Y.lvBus + 16} vl="lv" />
                        <CB
                          x={ix}
                          y={Y.lvBus + 22}
                          closed={inv.status !== "danger"}
                          status={ist}
                          id={`CB-${inv.id}`}
                          sel={selId === `CB-${inv.id}`}
                          onSel={sel}
                        />
                        <Wire x1={ix} y1={Y.lvBus + 30} x2={ix} y2={Y.invRow - 14} vl="lv" />
                        <Inv
                          x={ix}
                          y={Y.invRow}
                          label={inv.name}
                          pwr={pw}
                          status={ist}
                          id={inv.id}
                          sel={selId === inv.id}
                          onSel={sel}
                          alarm={inv.alarms > 0}
                        />
                        <Wire x1={ix} y1={Y.invRow + 15} x2={ix} y2={Y.dcBus - 3} vl="dc" />
                        {ii === 0 && <Bus x1={iX0 - 14} y={Y.dcBus} x2={iX0 + iSp * (nInv - 1) + 14} vl="dc" label={`DC BUS · ${blk.name}`} />}
                        <Wire x1={ix} y1={Y.dcBus + 4} x2={ix} y2={Y.pvArr - 12} vl="dc" />
                        <PVArr x={ix} y={Y.pvArr} str={inv.strings} label={`PV-${bi + 1}${ii + 1}`} />
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* BESS if present */}
            {h.bess &&
              (() => {
                const bx = SVG_W - 68;
                const soc = (h.bess as { soc?: number }).soc ?? 76;
                return (
                  <g>
                    <Wire x1={bx} y1={Y.mvBus + 4} x2={bx} y2={Y.txB - 20} vl="mv" />
                    <CB x={bx} y={Y.mvBus + 25} closed status="success" id="CB-BESS" sel={selId === "CB-BESS"} onSel={sel} />
                    <rect x={bx - 26} y={Y.txB - 18} width={52} height={42} rx={5} fill="rgba(129,140,248,0.12)" stroke="#818cf8" strokeWidth={1.5} />
                    <text x={bx} y={Y.txB - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="#818cf8" fontFamily="Inter,sans-serif">
                      BESS
                    </text>
                    <text x={bx} y={Y.txB + 11} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-secondary)" fontFamily="Inter,sans-serif">
                      {soc}% SOC
                    </text>
                  </g>
                );
              })()}

            {/* Switchyard → Grid */}
            <Wire x1={CX} y1={Y.mvBus + 4} x2={CX} y2={Y.mvBus + 16} vl="mv" />
            <rect x={CX - 48} y={Y.mvBus + 18} width={96} height={32} rx={5} fill="rgba(91,141,224,0.08)" stroke="#5b8de0" strokeWidth={1.5} />
            <text x={CX} y={Y.mvBus + 30} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#5b8de0" fontFamily="Inter,sans-serif">
              Switchyard
            </text>
            <text x={CX} y={Y.mvBus + 42} textAnchor="middle" fontSize={7.5} fill="var(--dt-text-faint)" fontFamily="Inter,sans-serif">
              {site.generation} MW
            </text>

            <Wire x1={CX} y1={Y.mvBus + 50} x2={CX} y2={Y.aux - 20} vl="lv" anim />
            <rect x={CX - 52} y={Y.aux - 20} width={104} height={38} rx={6} fill="rgba(22,163,74,0.1)" stroke="#16a34a" strokeWidth={2} />
            <text x={CX} y={Y.aux - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4ade80" fontFamily="Inter,sans-serif">
              GRID EXPORT
            </text>
            <text x={CX} y={Y.aux + 9} textAnchor="middle" fontSize={8.5} fill="rgba(74,222,128,0.7)" fontFamily="Inter,sans-serif">
              {site.generation} MW
            </text>

            {/* SCADA comm bus */}
            <line x1={50} y1={Y.aux + 50} x2={SVG_W - 50} y2={Y.aux + 50} stroke={VL.com.s} strokeWidth={1} strokeDasharray="6 4" opacity={0.35} />
            <text x={56} y={Y.aux + 44} fontSize={7.5} fill={VL.com.s} fontFamily="Inter,sans-serif" opacity={0.6}>
              SCADA · OPC-UA · IEC 61850 · Modbus TCP
            </text>
          </svg>
        </div>
      </div>

      {/* Legend strip */}
      <div className="sldc-legend">
        {(["hv", "mv", "lv", "dc"] as const).map((k) => (
          <span key={k} className="sldc-leg">
            <span className="sldc-leg-line" style={{ background: VL[k].s }} />
            {VL[k].lbl}
          </span>
        ))}
        <span className="sldc-leg-sep" />
        <span className="sldc-leg">
          <span className="sldc-cb-c" />
          Closed CB
        </span>
        <span className="sldc-leg">
          <span className="sldc-cb-o" />
          Open CB
        </span>
        <span className="sldc-leg">
          <span className="sldc-sym-tx" />
          TX
        </span>
        <span className="sldc-leg">
          <span className="sldc-sym-inv" />
          INV
        </span>
        <span className="sldc-leg">
          <span className="sldc-sym-pv" />
          PV
        </span>
        <span className="sldc-leg-sep" />
        <span className="sldc-leg" style={{ color: "#ef4444" }}>
          ● Alarm
        </span>
        <span className="sldc-leg" style={{ color: "#f59e0b" }}>
          ● Warning
        </span>
        <span className="sldc-leg" style={{ color: "#22c55e" }}>
          ● Normal
        </span>
      </div>
    </div>
  );
}
