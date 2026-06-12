import { useState, useMemo } from "react";
import { SiteData, SITE_ASSET_HIERARCHY, WORK_ORDERS, BlockNode } from "../../data/mockData";
import { fetchHierarchy, fetchSiteWorkOrders } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";

// ─── Types ────────────────────────────────────────────────────────────────────
export type DtLayer = "energy" | "health" | "ai" | "revenue" | "maintenance";

interface Props {
  siteId: string;
  site: SiteData;
}

const LAYERS: { key: DtLayer; label: string }[] = [
  { key: "energy", label: "⚡ Energy" },
  { key: "health", label: "◎ Health" },
  { key: "ai", label: "✦ AI" },
  // { key: "weather",     label: "☁ Weather" },
  { key: "revenue", label: "$ Revenue" },
  { key: "maintenance", label: "🔧 Maint." },
];

// ─── Per-block weather data ───────────────────────────────────────────────────
const BLOCK_META: Record<string, { irr: number; wind: number; temp: number }> = {
  B1: { irr: 854, wind: 3.2, temp: 33 },
  B2: { irr: 722, wind: 2.9, temp: 35 },
  B3: { irr: 841, wind: 3.4, temp: 34 },
  "SFB-B1": { irr: 880, wind: 3.0, temp: 36 },
  "SFB-B2": { irr: 760, wind: 2.8, temp: 37 },
  "SFB-B3": { irr: 820, wind: 3.1, temp: 35 },
  "WFA-C1": { irr: 0, wind: 12.4, temp: 38 },
  "WFA-C2": { irr: 0, wind: 11.8, temp: 39 },
  "WFA-C3": { irr: 0, wind: 13.1, temp: 37 },
  "WFA-C4": { irr: 0, wind: 12.6, temp: 38 },
  "BSA-BB1": { irr: 0, wind: 2.1, temp: 31 },
  "BSA-BB2": { irr: 0, wind: 2.0, temp: 30 },
  "HYB-SB1": { irr: 780, wind: 8.2, temp: 24 },
  "HYB-SB2": { irr: 820, wind: 8.5, temp: 24 },
  "HYB-WC1": { irr: 0, wind: 9.1, temp: 23 },
  "HDA-U1": { irr: 0, wind: 2.8, temp: 14 },
  "HDA-U2": { irr: 0, wind: 2.6, temp: 14 },
  "HDA-U3": { irr: 0, wind: 2.9, temp: 14 },
};

// ─── AI anomaly flags ─────────────────────────────────────────────────────────
const AI_FLAGS: Record<string, { loss: number; cause: string; pct: number }> = {
  "INV-006": { loss: 7.2, cause: "String degradation", pct: 87 },
  "INV-002": { loss: 3.1, cause: "Partial shading", pct: 62 },
  "WTG-007": { loss: 8.4, cause: "Blade pitch fault", pct: 91 },
  "TX-002": { loss: 1.8, cause: "Cooling system", pct: 52 },
  "SFB-INV-002": { loss: 4.2, cause: "Soiling", pct: 71 },
  "SFB-INV-004": { loss: 2.8, cause: "String mismatch", pct: 58 },
  "PCS-004": { loss: 1.9, cause: "Thermal derating", pct: 45 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hc(h: number) {
  return h >= 85 ? "#16a34a" : h >= 70 ? "#d97706" : "#dc2626";
}

function blockAgg(b: BlockNode) {
  const invs = b.inverters;
  return {
    health: Math.round(invs.reduce((s, i) => s + i.health, 0) / invs.length),
    status: (invs.some((i) => i.status === "danger") ? "danger" : invs.some((i) => i.status === "warning") ? "warning" : "success") as
      | "success"
      | "warning"
      | "danger",
    alarms: invs.reduce((s, i) => s + i.alarms, 0),
    outputPct: Math.round(invs.reduce((s, i) => s + i.output, 0) / invs.length),
    mw: +((invs.reduce((s, i) => s + i.output, 0) / invs.length) * 0.01 * invs.length * 8.5).toFixed(1),
    aiCount: invs.filter((i) => AI_FLAGS[i.id]).length,
  };
}

// ─── SVG sub-components ───────────────────────────────────────────────────────
function FlowArrow({
  x1,
  y1,
  x2,
  y2,
  active,
  color = "#5b8de0",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  active: boolean;
  color?: string;
}) {
  if (!active) return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dt-flow-inactive)" strokeWidth={1} strokeDasharray="4 4" />;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="7 4"
        style={{ animation: "dtFlow 0.7s linear infinite" }}
      />
      <polygon points={`${x2},${y2} ${x2 - 4},${y2 - 7} ${x2 + 4},${y2 - 7}`} fill={color} />
    </g>
  );
}

function NodeRect({
  x,
  y,
  w,
  h,
  label,
  sub,
  status,
  layer,
  alarms,
  selected,
  onClick,
  aiFlag,
  dimmed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  status: string;
  layer: DtLayer;
  alarms: number;
  selected: boolean;
  onClick: () => void;
  aiFlag?: boolean;
  dimmed?: boolean;
}) {
  const isHealthMode = layer === "health" || layer === "ai";
  const fill = isHealthMode
    ? status === "danger"
      ? "rgba(220,38,38,0.22)"
      : status === "warning"
        ? "rgba(217,119,6,0.18)"
        : "rgba(22,163,74,0.14)"
    : "var(--dt-node-fill)";
  const stroke = selected
    ? "#5b8de0"
    : isHealthMode
      ? status === "danger"
        ? "#dc2626"
        : status === "warning"
          ? "#d97706"
          : "#16a34a"
      : "var(--dt-node-stroke)";
  return (
    <g onClick={onClick} style={{ cursor: "pointer", opacity: dimmed ? 0.45 : 1 }}>
      {aiFlag && layer === "ai" && (
        <rect
          x={x - 3}
          y={y - 3}
          width={w + 6}
          height={h + 6}
          rx={8}
          fill="rgba(220,38,38,0.12)"
          stroke="#dc2626"
          strokeWidth={2}
          style={{ animation: "dtAiPulse 1.6s ease-in-out infinite" }}
        />
      )}
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={selected ? 2 : 1.5} />
      <text
        x={x + w / 2}
        y={y + h / 2 - (sub ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--dt-text-primary)"
        fontSize={10}
        fontWeight={600}
        fontFamily="Inter,sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--dt-text-secondary)"
          fontSize={8.5}
          fontFamily="Inter,sans-serif"
          style={{ pointerEvents: "none" }}
        >
          {sub}
        </text>
      )}
      {alarms > 0 && (
        <g>
          <circle cx={x + w - 7} cy={y + 7} r={6} fill="#d97706" />
          <text
            x={x + w - 7}
            y={y + 7}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontSize={7}
            fontWeight={700}
            fontFamily="Inter,sans-serif"
          >
            {alarms}
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SiteDigitalTwin({ siteId, site }: Props) {
  const [layer, setLayer] = useState<DtLayer>("energy");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const { data: apiHierarchy } = useApi(() => fetchHierarchy(siteId), [siteId]);
  const { data: apiWorkOrders } = useApi(() => fetchSiteWorkOrders(siteId), [siteId]);

  const h = apiHierarchy ?? SITE_ASSET_HIERARCHY[siteId];
  const siteWOs = useMemo(() => (apiWorkOrders ?? WORK_ORDERS).filter((w) => w.siteId === siteId), [apiWorkOrders, siteId]);

  if (!h) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--ds-text-faint)", fontSize: 12 }}>Digital twin not available for {site.name}</div>
    );
  }

  // ─── Layout calc ────────────────────────────────────────────────────────────
  const VW = 540;
  const nb = h.blocks.length;
  const BW = Math.min(150, Math.floor((VW - 40) / nb) - 12);
  const BH = 44;
  const bTW = nb * BW + (nb - 1) * 12;
  const bSX = (VW - bTW) / 2;
  const BY = 30;
  const bPos = h.blocks.map((_, i) => ({ x: bSX + i * (BW + 12), y: BY }));

  const DOT_Y = BY + BH + 22;
  const BUS_Y = DOT_Y + 22;
  const nTx = h.transformers.length;
  const TX_W = Math.min(110, Math.floor((VW - 40) / nTx) - 12);
  const TX_H = 38;
  const tTW = nTx * TX_W + (nTx - 1) * 12;
  const tSX = (VW - tTW) / 2;
  const TX_Y = BUS_Y + 22;
  const BUS2_Y = TX_Y + TX_H + 14;
  const SY_W = 130,
    SY_H = 36;
  const SY_X = (VW - SY_W) / 2;
  const SY_Y = BUS2_Y + 16;
  const GR_W = 130,
    GR_H = 36;
  const GR_X = (VW - GR_W) / 2;
  const GR_Y = SY_Y + SY_H + 24;
  const AUX_H = 32;
  const auxItems = [
    ...(h.bess ? [{ id: h.bess.id, label: "BESS", sub: `${(h.bess as any).soc ?? 76}% SOC`, status: h.bess.status, alarms: h.bess.alarms }] : []),
    ...(h.weatherStation
      ? [{ id: h.weatherStation.id, label: "Weather", sub: "Station", status: h.weatherStation.status, alarms: h.weatherStation.alarms }]
      : []),
    { id: h.scada.id, label: "SCADA", sub: "Online", status: h.scada.status, alarms: h.scada.alarms },
  ];
  const nAux = auxItems.length;
  const AUX_W = Math.min(110, Math.floor((VW - 40) / nAux) - 12);
  const aTW = nAux * AUX_W + (nAux - 1) * 12;
  const aSX = (VW - aTW) / 2;
  const AUX_Y = GR_Y + GR_H + 20;
  const SVG_H = AUX_Y + AUX_H + 12;

  // ─── Layer sub-labels ────────────────────────────────────────────────────────
  function bSub(block: BlockNode): string {
    const agg = blockAgg(block);
    const m = BLOCK_META[block.id];
    switch (layer) {
      case "energy":
        return `${agg.mw} MW  ${agg.outputPct}%`;
      case "health":
        return `Health ${agg.health}%`;
      case "ai":
        return agg.aiCount > 0 ? `⚠ ${agg.aiCount} anomaly` : "✓ OK";
      case "weather":
        return m ? (m.irr > 0 ? `${m.irr} W/m²` : `${m.wind} m/s wind`) : "—";
      case "revenue":
        return `$${((agg.mw * 21.7) / 1000).toFixed(1)}K/hr`;
      case "maintenance": {
        const n = siteWOs.filter((w) => block.inverters.some((i) => w.asset === i.id)).length;
        return n > 0 ? `${n} WO open` : "No WOs";
      }
    }
  }
  function txSub(tx: (typeof h.transformers)[0]): string {
    switch (layer) {
      case "energy":
        return `${tx.load}% load`;
      case "health":
        return `${tx.health}%`;
      case "revenue":
        return `$${(tx.load * 0.9).toFixed(0)}/hr`;
      default:
        return tx.status !== "success" ? "⚠ Check" : "Normal";
    }
  }

  const selBlock = h.blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="sdt-wrap">
      {/* Layer selector */}
      <div className="sdt-layer-bar">
        {LAYERS.map((l) => (
          <button key={l.key} className={`sdt-layer-btn${layer === l.key ? " active" : ""}`} onClick={() => setLayer(l.key as DtLayer)}>
            {l.label}
          </button>
        ))}
      </div>

      {/* SVG Diagram */}
      <div className="sdt-svg-wrap">
        <svg viewBox={`0 0 ${VW} ${SVG_H}`} width="100%" style={{ display: "block" }}>
          {/* Site label */}
          <text
            x={VW / 2}
            y={13}
            textAnchor="middle"
            fill="var(--dt-text-label)"
            fontSize={9}
            fontWeight={700}
            letterSpacing={1.5}
            fontFamily="Inter,sans-serif"
          >
            {site.name.toUpperCase()} · {site.type.toUpperCase()} · {site.capacity} MW
          </text>

          {/* Blocks */}
          {h.blocks.map((block, bi) => {
            const agg = blockAgg(block);
            const pos = bPos[bi];
            const hasAi = block.inverters.some((i) => AI_FLAGS[i.id]);
            const isSelected = selectedBlockId === block.id;
            return (
              <NodeRect
                key={block.id}
                x={pos.x}
                y={pos.y}
                w={BW}
                h={BH}
                label={block.name}
                sub={bSub(block)}
                status={agg.status}
                layer={layer}
                alarms={agg.alarms}
                selected={isSelected}
                aiFlag={hasAi}
                onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
              />
            );
          })}

          {/* Inverter health dots */}
          {h.blocks.map((block, bi) => {
            const pos = bPos[bi];
            const invs = block.inverters;
            const r = Math.min(5.5, (BW - 16) / (invs.length * 2.6));
            const sp = (BW - 16) / (invs.length + 1);
            return (
              <g key={`dots-${block.id}`}>
                <text
                  x={pos.x + BW / 2}
                  y={DOT_Y - r - 4}
                  textAnchor="middle"
                  fill="var(--dt-text-faint)"
                  fontSize={7.5}
                  fontFamily="Inter,sans-serif"
                >
                  {invs.length} {site.type === "Wind" ? "turbines" : site.type === "Hydro" ? "generators" : "inverters"}
                </text>
                {invs.map((inv, ii) => {
                  const cx = pos.x + 8 + (ii + 1) * sp;
                  const isAi = !!AI_FLAGS[inv.id] && layer === "ai";
                  return (
                    <g key={inv.id}>
                      {isAi && (
                        <circle
                          cx={cx}
                          cy={DOT_Y}
                          r={r + 3.5}
                          fill="rgba(220,38,38,0.22)"
                          style={{ animation: "dtAiPulse 1.6s ease-in-out infinite" }}
                        />
                      )}
                      <circle
                        cx={cx}
                        cy={DOT_Y}
                        r={r}
                        fill={layer === "health" || layer === "ai" ? hc(inv.health) : hc(inv.health) + "88"}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={0.5}
                      >
                        <title>
                          {inv.name} — {inv.health}%{AI_FLAGS[inv.id] ? ` | AI: ${AI_FLAGS[inv.id]?.cause}` : ""}
                        </title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Block → Bus arrows */}
          {bPos.map((p, bi) => (
            <FlowArrow key={`fa-b${bi}`} x1={p.x + BW / 2} y1={DOT_Y + 8} x2={p.x + BW / 2} y2={BUS_Y} active={layer === "energy"} />
          ))}

          {/* LV Bus */}
          <line
            x1={40}
            y1={BUS_Y}
            x2={VW - 40}
            y2={BUS_Y}
            stroke={layer === "energy" ? "var(--dt-bus-active)" : "var(--dt-bus-stroke)"}
            strokeWidth={layer === "energy" ? 2 : 1}
            strokeDasharray={layer === "energy" ? "6 3" : undefined}
            style={layer === "energy" ? { animation: "dtFlow 0.7s linear infinite" } : undefined}
          />
          <text x={VW - 34} y={BUS_Y - 4} fill="var(--dt-text-faint)" fontSize={7.5} fontFamily="Inter,sans-serif">
            LV Bus
          </text>

          {/* Transformers */}
          {h.transformers.map((tx, ti) => {
            const tx_x = tSX + ti * (TX_W + 12);
            const tx_cx = tx_x + TX_W / 2;
            return (
              <g key={tx.id}>
                <FlowArrow x1={tx_cx} y1={BUS_Y} x2={tx_cx} y2={TX_Y} active={layer === "energy"} />
                <NodeRect
                  x={tx_x}
                  y={TX_Y}
                  w={TX_W}
                  h={TX_H}
                  label={`TX-${String(ti + 1).padStart(2, "0")}`}
                  sub={txSub(tx)}
                  status={tx.status}
                  layer={layer}
                  alarms={tx.alarms}
                  selected={false}
                  aiFlag={!!AI_FLAGS[tx.id]}
                  onClick={() => {}}
                />
              </g>
            );
          })}

          {/* HV Bus */}
          <line
            x1={tSX}
            y1={BUS2_Y}
            x2={tSX + tTW}
            y2={BUS2_Y}
            stroke={layer === "energy" ? "var(--dt-bus-active)" : "var(--dt-bus-stroke)"}
            strokeWidth={layer === "energy" ? 1.5 : 1}
          />
          <text x={tSX + tTW + 6} y={BUS2_Y - 3} fill="var(--dt-text-faint)" fontSize={7.5} fontFamily="Inter,sans-serif">
            HV Bus
          </text>

          {/* Switchyard */}
          <FlowArrow x1={VW / 2} y1={BUS2_Y} x2={VW / 2} y2={SY_Y} active={layer === "energy"} />
          <NodeRect
            x={SY_X}
            y={SY_Y}
            w={SY_W}
            h={SY_H}
            label="Switchyard"
            sub={layer === "energy" ? `${site.generation} MW` : layer === "health" ? `${h.switchyard.health}%` : ""}
            status={h.switchyard.status}
            layer={layer}
            alarms={h.switchyard.alarms}
            selected={false}
            onClick={() => {}}
          />

          {/* Grid */}
          <FlowArrow x1={VW / 2} y1={SY_Y + SY_H} x2={VW / 2} y2={GR_Y} active={layer === "energy"} color="#16a34a" />
          <g>
            <rect
              x={GR_X}
              y={GR_Y}
              width={GR_W}
              height={GR_H}
              rx={6}
              fill={layer === "revenue" ? "rgba(22,163,74,0.2)" : "rgba(22,163,74,0.1)"}
              stroke={layer === "energy" ? "#16a34a" : "rgba(22,163,74,0.35)"}
              strokeWidth={1.5}
            />
            <text
              x={VW / 2}
              y={GR_Y + 14}
              textAnchor="middle"
              fill="var(--dt-grid-text)"
              fontSize={10}
              fontWeight={700}
              fontFamily="Inter,sans-serif"
            >
              GRID EXPORT
            </text>
            <text x={VW / 2} y={GR_Y + 27} textAnchor="middle" fill="var(--dt-grid-sub)" fontSize={9} fontFamily="Inter,sans-serif">
              {layer === "revenue"
                ? `$${(site.revenueToday / 8000).toFixed(1)}K/hr`
                : layer === "maintenance"
                  ? `${siteWOs.filter((w) => w.status !== "Closed").length} active WOs`
                  : `${site.generation} MW`}
            </text>
          </g>

          {/* Auxiliaries */}
          {auxItems.map((aux, ai) => (
            <g key={aux.id}>
              <line
                x1={aSX + ai * (AUX_W + 12) + AUX_W / 2}
                y1={AUX_Y}
                x2={VW / 2}
                y2={SY_Y + SY_H / 2}
                stroke="var(--dt-aux-line)"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <NodeRect
                x={aSX + ai * (AUX_W + 12)}
                y={AUX_Y}
                w={AUX_W}
                h={AUX_H}
                label={aux.label}
                sub={aux.sub}
                status={aux.status}
                layer={layer}
                alarms={aux.alarms}
                selected={false}
                onClick={() => {}}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Drill-down panel */}
      {selBlock && (
        <div className="sdt-drill-panel">
          <div className="sdt-drill-header">
            <span className="sdt-drill-title">{selBlock.name}</span>
            <span className="sdt-drill-count">{selBlock.inverters.length} assets · click block to collapse</span>
            <button className="sdt-drill-close" onClick={() => setSelectedBlockId(null)}>
              ✕
            </button>
          </div>
          <div className="sdt-drill-grid">
            {selBlock.inverters.map((inv) => {
              const aiF = AI_FLAGS[inv.id];
              const openWO = siteWOs.find((w) => w.asset === inv.id && w.status !== "Closed");
              let meta = "";
              if (layer === "energy") meta = `${inv.output}% output · ${inv.temp}°C`;
              else if (layer === "health") meta = `${inv.health}% · ${inv.strings} strings`;
              else if (layer === "ai") meta = aiF ? `⚠ ${aiF.cause} (${aiF.pct}%)` : "✓ Normal";
              else if (layer === "weather") meta = `${inv.temp}°C operating`;
              else if (layer === "revenue") meta = `$${(inv.output * 0.185).toFixed(0)}/hr`;
              else if (layer === "maintenance") meta = openWO ? `WO: ${openWO.id} (${openWO.status})` : "No open WOs";
              return (
                <div
                  key={inv.id}
                  className={`sdt-inv-card${inv.status === "danger" ? " inv-danger" : inv.status === "warning" ? " inv-warn" : ""}`}
                  style={{ borderLeftColor: hc(inv.health) }}
                >
                  <div className="sdt-inv-name">
                    <span className="sdt-inv-dot" style={{ background: hc(inv.health) }} />
                    <span>{inv.name}</span>
                    {aiF && layer === "ai" && <span className="sdt-ai-badge">AI ⚠</span>}
                  </div>
                  <div className="sdt-inv-meta">{meta}</div>
                  {aiF && layer === "ai" && (
                    <div className="sdt-ai-detail">
                      <span>
                        Loss <strong>{aiF.loss} MW</strong> · {aiF.cause}
                      </span>
                      <div className="sdt-ai-bar-row">
                        <div className="sdt-ai-bar" style={{ width: `${aiF.pct}%` }} />
                        <span>{aiF.pct}%</span>
                      </div>
                    </div>
                  )}
                  {layer === "health" && (
                    <div className="sdt-health-bar-row">
                      <div className="sdt-health-bar" style={{ width: `${inv.health}%`, background: hc(inv.health) }} />
                      <span>{inv.health}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
