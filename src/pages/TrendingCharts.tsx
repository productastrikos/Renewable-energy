import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { SITES, SITE_ASSET_HIERARCHY } from "../data/mockData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TagDef {
  id: string;
  label: string;
  unit: string;
  baseVal: number;
  variance: number;
  wave: "bell" | "flat" | "slow";
  siteId: string;
}

interface PinnedTag { id: string; def: TagDef; color: string; }

interface TreeNode {
  id: string;
  label: string;
  status: "success" | "warning" | "danger";
  kind: string;
  meta?: string;
  siteId: string;
  children?: TreeNode[];
}

type ChartPoint = Record<string, string | number>;

// ─── Constants ────────────────────────────────────────────────────────────────
const PALETTE = [
  "#f59e0b", "#38bdf8", "#ef4444", "#a78bfa",
  "#14b8a6", "#ec4899", "#a3e635", "#5b8de0",
];

const TF_LIST = ["15m", "1h", "6h", "24h"] as const;
type TF = (typeof TF_LIST)[number];
const TF_POINTS: Record<TF, number> = { "15m": 90, "1h": 120, "6h": 144, "24h": 288 };
const TF_SEC:   Record<TF, number>  = { "15m": 10, "1h": 30,  "6h": 150, "24h": 300 };

// ─── Simulation helpers ───────────────────────────────────────────────────────
function bell(h: number) { return Math.max(0, Math.exp(-Math.pow(h - 12.5, 2) / 32)); }

function tagValue(def: TagDef, d: Date): number {
  const h = d.getHours() + d.getMinutes() / 60;
  const noise = (Math.random() - 0.5) * def.variance;
  let v: number;
  if      (def.wave === "bell") v = def.baseVal * bell(h) + noise;
  else if (def.wave === "slow") v = def.baseVal + Math.sin(h / 3) * def.variance * 0.4 + noise * 0.3;
  else                          v = def.baseVal + noise * 0.4;
  return Math.max(0, +v.toFixed(2));
}

function buildDates(tf: TF): Date[] {
  const n = TF_POINTS[tf], step = TF_SEC[tf] * 1000, now = Date.now();
  return Array.from({ length: n }, (_, i) => new Date(now - (n - 1 - i) * step));
}

function fmtTime(d: Date, tf: TF) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return tf === "24h" ? `${hh}:00` : `${hh}:${mm}`;
}

// ─── Extended tag registry ────────────────────────────────────────────────────
function buildTagRegistry(): Map<string, TagDef[]> {
  const map = new Map<string, TagDef[]>();

  SITES.forEach(site => {
    const h = SITE_ASSET_HIERARCHY[site.id];
    const isWind = site.type === "Wind";
    const isHydro = site.type === "Hydro";

    // ── Site-level tags
    map.set(site.id, [
      { id: `${site.id}.generation`,    label: `${site.name} Generation`,    unit: "MW",  baseVal: site.generation,        variance: site.generation * 0.08, wave: "bell", siteId: site.id },
      { id: `${site.id}.grid_export`,   label: `${site.name} Grid Export`,   unit: "MW",  baseVal: site.generation * 0.98, variance: site.generation * 0.06, wave: "bell", siteId: site.id },
      { id: `${site.id}.availability`,  label: `${site.name} Availability`,  unit: "%",   baseVal: site.availability,      variance: 0.4,                    wave: "flat", siteId: site.id },
      { id: `${site.id}.aux_load`,      label: `${site.name} Aux Load`,      unit: "kW",  baseVal: site.generation * 5,    variance: site.generation * 0.3,  wave: "slow", siteId: site.id },
      { id: `${site.id}.pf`,            label: `${site.name} Power Factor`,  unit: "pu",  baseVal: 0.99,                   variance: 0.01,                   wave: "flat", siteId: site.id },
    ]);

    if (!h) return;

    const invTotal = h.blocks.reduce((a, bl) => a + bl.inverters.length, 0);

    // ── Block + Inverter / SMB tags
    h.blocks.forEach((b, bi) => {
      const smbId = `${site.id}.${b.id}.smb`;
      map.set(b.id, []); // block itself has no direct tags (subtree traversal handles it)

      b.inverters.forEach(inv => {
        const pwr = inv.output * 0.01 * (site.capacity / Math.max(invTotal, 1)) * 1000;

        if (isWind) {
          // Wind turbine tags
          map.set(inv.id, [
            { id: `${inv.id}.active_power`,   label: `${inv.name} Active Power`,    unit: "kW",   baseVal: pwr,          variance: pwr * 0.1,  wave: "bell", siteId: site.id },
            { id: `${inv.id}.wind_speed`,     label: `${inv.name} Wind Speed`,      unit: "m/s",  baseVal: 11.5,         variance: 3,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.rotor_rpm`,      label: `${inv.name} Rotor RPM`,       unit: "rpm",  baseVal: 14.2,         variance: 1.5,        wave: "slow", siteId: site.id },
            { id: `${inv.id}.pitch_angle`,    label: `${inv.name} Blade Pitch`,     unit: "°",    baseVal: 4.5,          variance: 1,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.nacelle_temp`,   label: `${inv.name} Nacelle Temp`,    unit: "°C",   baseVal: inv.temp,     variance: 3,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.gearbox_temp`,   label: `${inv.name} Gearbox Temp`,    unit: "°C",   baseVal: inv.temp + 8, variance: 4,          wave: "slow", siteId: site.id },
          ]);
        } else if (isHydro) {
          // Hydro turbine tags
          map.set(inv.id, [
            { id: `${inv.id}.active_power`,   label: `${inv.name} Active Power`,    unit: "kW",   baseVal: pwr,          variance: pwr * 0.04, wave: "flat", siteId: site.id },
            { id: `${inv.id}.flow_rate`,      label: `${inv.name} Flow Rate`,       unit: "m³/s", baseVal: 42,           variance: 3,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.head_pressure`,  label: `${inv.name} Head Pressure`,   unit: "m",    baseVal: 85,           variance: 2,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.turbine_rpm`,    label: `${inv.name} Turbine RPM`,     unit: "rpm",  baseVal: 375,          variance: 5,          wave: "flat", siteId: site.id },
            { id: `${inv.id}.efficiency`,     label: `${inv.name} Efficiency`,      unit: "%",    baseVal: 93,           variance: 1,          wave: "flat", siteId: site.id },
          ]);
        } else {
          // Solar inverter tags
          map.set(inv.id, [
            { id: `${inv.id}.ac_power`,       label: `${inv.name} AC Power`,        unit: "kW",  baseVal: pwr,          variance: pwr * 0.07, wave: "bell", siteId: site.id },
            { id: `${inv.id}.dc_voltage`,     label: `${inv.name} DC Bus Voltage`,  unit: "V",   baseVal: 820,          variance: 25,         wave: "flat", siteId: site.id },
            { id: `${inv.id}.dc_current`,     label: `${inv.name} DC Current`,      unit: "A",   baseVal: pwr / 820,    variance: 2,          wave: "bell", siteId: site.id },
            { id: `${inv.id}.temperature`,    label: `${inv.name} Temperature`,     unit: "°C",  baseVal: inv.temp,     variance: 4,          wave: "slow", siteId: site.id },
            { id: `${inv.id}.output_pct`,     label: `${inv.name} Output`,          unit: "%",   baseVal: inv.output,   variance: 3,          wave: "bell", siteId: site.id },
          ]);
        }
      });

      // ── SMB (String Monitor Box) — one per block for solar
      if (!isWind && !isHydro) {
        const nStrings = b.inverters.reduce((a, i) => a + i.strings, 0);
        map.set(smbId, [
          { id: `${smbId}.string_current`,   label: `SMB-B${bi+1} String Current`,  unit: "A",    baseVal: 8.5,          variance: 0.8, wave: "bell", siteId: site.id },
          { id: `${smbId}.dc_power`,         label: `SMB-B${bi+1} DC Power`,        unit: "kW",   baseVal: nStrings * 6, variance: nStrings * 0.4, wave: "bell", siteId: site.id },
          { id: `${smbId}.string_imbalance`, label: `SMB-B${bi+1} String Imbalance`,unit: "%",    baseVal: 1.2,          variance: 0.5, wave: "slow", siteId: site.id },
          { id: `${smbId}.irradiance_poa`,   label: `SMB-B${bi+1} Irradiance POA`,  unit: "W/m²", baseVal: 820,          variance: 70,  wave: "bell", siteId: site.id },
        ]);
      }
    });

    // ── MV Substation: Transformers + CB + PQM
    const cbIncomerId = `${site.id}.cb-incomer`;
    const cbFeederId  = `${site.id}.cb-feeder`;
    const pqmId       = `${site.id}.pqm-1`;

    h.transformers.forEach(tx => {
      const pwr = tx.load * (site.capacity / h.transformers.length) * 10;
      map.set(tx.id, [
        { id: `${tx.id}.active_power`, label: `${tx.name} Active Power`, unit: "kW",  baseVal: pwr,    variance: pwr * 0.05, wave: "bell", siteId: site.id },
        { id: `${tx.id}.load_pct`,     label: `${tx.name} Load`,         unit: "%",   baseVal: tx.load,variance: 3,          wave: "bell", siteId: site.id },
        { id: `${tx.id}.temperature`,  label: `${tx.name} Temperature`,  unit: "°C",  baseVal: tx.temp,variance: 2,          wave: "slow", siteId: site.id },
        { id: `${tx.id}.hv_voltage`,   label: `${tx.name} HV Voltage`,   unit: "kV",  baseVal: 33.2,   variance: 0.3,        wave: "flat", siteId: site.id },
        { id: `${tx.id}.lv_voltage`,   label: `${tx.name} LV Voltage`,   unit: "V",   baseVal: 415,    variance: 4,          wave: "flat", siteId: site.id },
      ]);
    });

    // Circuit Breaker — Incomer
    map.set(cbIncomerId, [
      { id: `${cbIncomerId}.current`,   label: "CB-Incomer Current Phase A", unit: "A",   baseVal: 820,  variance: 40,  wave: "bell", siteId: site.id },
      { id: `${cbIncomerId}.current_b`, label: "CB-Incomer Current Phase B", unit: "A",   baseVal: 818,  variance: 42,  wave: "bell", siteId: site.id },
      { id: `${cbIncomerId}.current_c`, label: "CB-Incomer Current Phase C", unit: "A",   baseVal: 821,  variance: 38,  wave: "bell", siteId: site.id },
      { id: `${cbIncomerId}.voltage`,   label: "CB-Incomer Voltage L-L",     unit: "V",   baseVal: 415,  variance: 5,   wave: "flat", siteId: site.id },
    ]);

    // Circuit Breaker — Feeder
    map.set(cbFeederId, [
      { id: `${cbFeederId}.current`,    label: "CB-Feeder Current",           unit: "A",   baseVal: 405,  variance: 30,  wave: "bell", siteId: site.id },
      { id: `${cbFeederId}.power`,      label: "CB-Feeder Active Power",      unit: "kW",  baseVal: site.generation * 250, variance: site.generation * 15, wave: "bell", siteId: site.id },
    ]);

    // Power Quality Meter
    map.set(pqmId, [
      { id: `${pqmId}.thd_voltage`,    label: "PQM-1 THD Voltage",          unit: "%",   baseVal: 3.1,  variance: 0.3, wave: "slow", siteId: site.id },
      { id: `${pqmId}.thd_current`,    label: "PQM-1 THD Current",          unit: "%",   baseVal: 4.8,  variance: 0.5, wave: "slow", siteId: site.id },
      { id: `${pqmId}.grid_freq`,      label: "PQM-1 Grid Frequency",       unit: "Hz",  baseVal: 50.0, variance: 0.04,wave: "flat", siteId: site.id },
      { id: `${pqmId}.power_factor`,   label: "PQM-1 Power Factor",         unit: "pu",  baseVal: 0.98, variance: 0.01,wave: "flat", siteId: site.id },
      { id: `${pqmId}.active_power`,   label: "PQM-1 Active Power",         unit: "kW",  baseVal: site.generation * 900, variance: site.generation * 50, wave: "bell", siteId: site.id },
      { id: `${pqmId}.reactive_power`, label: "PQM-1 Reactive Power",       unit: "kVAR",baseVal: site.generation * 120, variance: 80, wave: "slow", siteId: site.id },
    ]);

    // BESS tags
    if (h.bess) {
      const bess = h.bess as typeof h.bess & { soc?: number; capacity?: number };
      map.set(h.bess.id, [
        { id: `${h.bess.id}.soc`,       label: `${h.bess.name} SOC`,          unit: "%",  baseVal: bess.soc ?? 76, variance: 1.5, wave: "slow", siteId: site.id },
        { id: `${h.bess.id}.power`,     label: `${h.bess.name} Power`,        unit: "kW", baseVal: (bess.capacity ?? 50) * 200, variance: 500, wave: "slow", siteId: site.id },
        { id: `${h.bess.id}.voltage`,   label: `${h.bess.name} DC Voltage`,   unit: "V",  baseVal: 780, variance: 12, wave: "flat", siteId: site.id },
        { id: `${h.bess.id}.current`,   label: `${h.bess.name} Current`,      unit: "A",  baseVal: 420, variance: 30, wave: "slow", siteId: site.id },
        { id: `${h.bess.id}.temp`,      label: `${h.bess.name} Cell Temp`,    unit: "°C", baseVal: 28,  variance: 3,  wave: "slow", siteId: site.id },
      ]);
    }

    // Weather station
    if (h.weatherStation) {
      map.set(h.weatherStation.id, [
        { id: `${h.weatherStation.id}.irradiance_ghi`, label: "Irradiance GHI",  unit: "W/m²", baseVal: 820, variance: 80,  wave: "bell", siteId: site.id },
        { id: `${h.weatherStation.id}.irradiance_poa`, label: "Irradiance POA",  unit: "W/m²", baseVal: 850, variance: 75,  wave: "bell", siteId: site.id },
        { id: `${h.weatherStation.id}.temp_amb`,       label: "Ambient Temp",    unit: "°C",   baseVal: 32,  variance: 4,   wave: "slow", siteId: site.id },
        { id: `${h.weatherStation.id}.wind_speed`,     label: "Wind Speed",      unit: "m/s",  baseVal: 4.2, variance: 1.5, wave: "slow", siteId: site.id },
        { id: `${h.weatherStation.id}.wind_dir`,       label: "Wind Direction",  unit: "°",    baseVal: 220, variance: 15,  wave: "slow", siteId: site.id },
        { id: `${h.weatherStation.id}.humidity`,       label: "Humidity",        unit: "%",    baseVal: 45,  variance: 8,   wave: "slow", siteId: site.id },
        { id: `${h.weatherStation.id}.module_temp`,    label: "Module Temp",     unit: "°C",   baseVal: 52,  variance: 5,   wave: "bell", siteId: site.id },
      ]);
    }
  });

  return map;
}

// ─── Extended asset tree ──────────────────────────────────────────────────────
function buildTree(): TreeNode[] {
  return SITES.map(site => {
    const h = SITE_ASSET_HIERARCHY[site.id];
    const sStatus = site.status === "Critical" ? "danger" : site.status === "Warning" ? "warning" : "success";
    const isWind = site.type === "Wind";
    const isHydro = site.type === "Hydro";
    const children: TreeNode[] = [];

    if (h) {
      // ── Blocks → inverters/WTGs + SMB
      h.blocks.forEach((b, bi) => {
        const bStatus: "success" | "warning" | "danger" =
          b.inverters.some(i => i.status === "danger") ? "danger" :
          b.inverters.some(i => i.status === "warning") ? "warning" : "success";
        const smbId = `${site.id}.${b.id}.smb`;

        const blockLabel = isWind
          ? b.name.replace("Block", "Bay")
          : isHydro ? b.name.replace("Block", "Unit Bay")
          : b.name;

        const invChildren: TreeNode[] = b.inverters.map(inv => ({
          id: inv.id,
          label: isWind ? inv.name.replace("INV", "WTG") : inv.name,
          status: inv.status as "success" | "warning" | "danger",
          kind: isWind ? "wtg" : isHydro ? "turbine" : "inverter",
          siteId: site.id,
          meta: isWind
            ? `${(inv.output * 0.01 * site.capacity / Math.max(h.blocks.reduce((a,bl)=>a+bl.inverters.length,0),1)).toFixed(1)} MW`
            : `${inv.output}%`,
        }));

        // Add SMB after inverters for solar
        if (!isWind && !isHydro) {
          invChildren.push({
            id: smbId, label: `SMB-B${bi + 1}`,
            status: "success", kind: "smb", siteId: site.id,
            meta: `${b.inverters.reduce((a, i) => a + i.strings, 0)} strings`,
          });
        }

        children.push({
          id: b.id, label: blockLabel, status: bStatus,
          kind: "block", siteId: site.id,
          children: invChildren,
        });
      });

      // ── MV Substation (transformers + CB + PQM)
      if (h.transformers.length) {
        const txStatus: "success" | "warning" | "danger" =
          h.transformers.some(t => t.status === "danger") ? "danger" :
          h.transformers.some(t => t.status === "warning") ? "warning" : "success";
        const mvChildren: TreeNode[] = [
          ...h.transformers.map(tx => ({
            id: tx.id,
            label: tx.name.replace("Transformer ", "").replace("TX-0", "T1 – ") + (tx.name.includes("001") ? "33/0.69kV 4MVA" : "33/0.4kV"),
            status: tx.status as "success" | "warning" | "danger",
            kind: "transformer", siteId: site.id, meta: `${tx.load}% load`,
          })),
          { id: `${site.id}.cb-incomer`, label: "CB-1 (Incomer)",  status: "success", kind: "cb", siteId: site.id },
          { id: `${site.id}.cb-feeder`,  label: "CB-2 (Feeder 1)", status: "success", kind: "cb", siteId: site.id },
          { id: `${site.id}.pqm-1`,      label: "PQM-1 (Revenue Meter)", status: "success", kind: "pqm", siteId: site.id },
        ];
        children.push({
          id: `${site.id}__mv`, label: "MV Substation 33kV",
          status: txStatus, kind: "substation", siteId: site.id,
          children: mvChildren,
        });
      }

      // ── BESS
      if (h.bess) {
        const bess = h.bess as typeof h.bess & { soc?: number };
        children.push({
          id: h.bess.id, label: h.bess.name,
          status: h.bess.status as "success" | "warning" | "danger",
          kind: "bess", siteId: site.id, meta: `${bess.soc ?? 76}% SOC`,
        });
      }

      // ── Met Station
      if (h.weatherStation) {
        children.push({
          id: h.weatherStation.id, label: "Met Station 1",
          status: "success", kind: "weather", siteId: site.id,
        });
      }

      // ── PPC Controller
      children.push({
        id: h.scada.id, label: "PPC Controller",
        status: "success", kind: "scada", siteId: site.id,
      });
    }

    return {
      id: site.id, label: `Site: ${site.name}`,
      status: sStatus, kind: "site",
      siteId: site.id, meta: `${site.capacity} MW`,
      children,
    };
  });
}

// ─── Collect all tags from a node's subtree ───────────────────────────────────
function collectSubtreeTags(nodeId: string, tree: TreeNode[], tagRegistry: Map<string, TagDef[]>): TagDef[] {
  const tags: TagDef[] = [];

  function gatherAll(node: TreeNode) {
    const own = tagRegistry.get(node.id) ?? [];
    tags.push(...own);
    node.children?.forEach(gatherAll);
  }

  function findNode(nodes: TreeNode[]): boolean {
    for (const n of nodes) {
      if (n.id === nodeId) { gatherAll(n); return true; }
      if (n.children && findNode(n.children)) return true;
    }
    return false;
  }

  findNode(tree);
  return tags;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; color: string; value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#12121e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "8px 12px", fontSize: 11, maxWidth: 260 }}>
      <div style={{ color: "var(--ds-text-faint)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "var(--ds-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          <span style={{ color: p.color, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TrendingCharts() {
  const [tf, setTf]             = useState<TF>("1h");
  const [live, setLive]         = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(SITES.map(s => s.id)));
  const [selNode, setSelNode]   = useState<string | null>(SITES[0]?.id ?? null);
  const [tagSearch, setTagSearch]       = useState("");
  const [treeSearch, setTreeSearch]     = useState("");
  const [pinnedTags, setPinnedTags]     = useState<PinnedTag[]>([]);
  const [dates, setDates]   = useState<Date[]>(() => buildDates("1h"));
  const [labels, setLabels] = useState<string[]>(() => buildDates("1h").map(d => fmtTime(d, "1h")));
  const [seriesStore, setSeriesStore] = useState<Map<string, number[]>>(new Map());

  const tagRegistry = useMemo(() => buildTagRegistry(), []);
  const tree        = useMemo(() => buildTree(), []);
  const pinnedRef   = useRef(pinnedTags);
  pinnedRef.current = pinnedTags;
  const tfRef       = useRef(tf);
  tfRef.current     = tf;

  // Total tag count for display
  const totalTags = useMemo(() => { let n = 0; tagRegistry.forEach(t => { n += t.length; }); return n; }, [tagRegistry]);

  // Tags visible in the middle panel (entire subtree of selected node)
  const visibleTags = useMemo(() => {
    if (!selNode) return [];
    const subtree = collectSubtreeTags(selNode, tree, tagRegistry);
    if (!tagSearch) return subtree;
    const q = tagSearch.toLowerCase();
    return subtree.filter(t => t.label.toLowerCase().includes(q) || t.unit.toLowerCase().includes(q));
  }, [selNode, tagSearch, tagRegistry, tree]);

  // Group visible tags by their asset prefix for section headers
  const groupedTags = useMemo(() => {
    const groups: { label: string; tags: TagDef[] }[] = [];
    const seen = new Map<string, TagDef[]>();
    visibleTags.forEach(t => {
      // Extract asset prefix from tag id (before the last dot-segment)
      const parts = t.label.split(" ");
      const key = parts.slice(0, parts.length > 2 ? 2 : 1).join(" ");
      if (!seen.has(key)) { seen.set(key, []); }
      seen.get(key)!.push(t);
    });
    seen.forEach((tags, label) => groups.push({ label, tags }));
    return groups;
  }, [visibleTags]);

  // Pin / unpin a tag
  const toggleTag = useCallback((def: TagDef) => {
    setPinnedTags(prev => {
      if (prev.find(p => p.id === def.id)) {
        setSeriesStore(ss => { const n = new Map(ss); n.delete(def.id); return n; });
        return prev.filter(p => p.id !== def.id);
      }
      const color = PALETTE[prev.length % PALETTE.length];
      setSeriesStore(ss => new Map(ss).set(def.id, dates.map(d => tagValue(def, d))));
      return [...prev, { id: def.id, def, color }];
    });
  }, [dates]);

  const removeTag = useCallback((id: string) => {
    setPinnedTags(prev => prev.filter(p => p.id !== id));
    setSeriesStore(ss => { const n = new Map(ss); n.delete(id); return n; });
  }, []);

  // Timeframe change — rebuild dates and regenerate series
  const changeTf = useCallback((newTf: TF) => {
    setTf(newTf);
    const newDates = buildDates(newTf);
    setDates(newDates);
    setLabels(newDates.map(d => fmtTime(d, newTf)));
    setSeriesStore(_ => {
      const n = new Map<string, number[]>();
      pinnedRef.current.forEach(({ id, def }) => { n.set(id, newDates.map(d => tagValue(def, d))); });
      return n;
    });
  }, []);

  // Live tick every 2 s
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const now = new Date();
      setLabels(prev => [...prev.slice(1), fmtTime(now, tfRef.current)]);
      setDates(prev => [...prev.slice(1), now]);
      setSeriesStore(ss => {
        const n = new Map<string, number[]>();
        pinnedRef.current.forEach(({ id: tid, def }) => {
          n.set(tid, [...(ss.get(tid) ?? []).slice(1), tagValue(def, now)]);
        });
        ss.forEach((v, k) => { if (!n.has(k)) n.set(k, v); });
        return n;
      });
    }, 2000);
    return () => clearInterval(id);
  }, [live]);

  // Chart data
  const chartData = useMemo<ChartPoint[]>(() => {
    return labels.map((t, i) => {
      const pt: ChartPoint = { time: t };
      pinnedTags.forEach(({ id }) => {
        const s = seriesStore.get(id);
        if (s?.[i] !== undefined) pt[id] = s[i];
      });
      return pt;
    });
  }, [labels, pinnedTags, seriesStore]);

  // Per-tag stats
  const stats = useMemo(() => {
    return pinnedTags.map(({ id, def, color }) => {
      const s = seriesStore.get(id) ?? [];
      const curr = s[s.length - 1] ?? 0;
      const min  = s.length ? +Math.min(...s).toFixed(2) : 0;
      const max  = s.length ? +Math.max(...s).toFixed(2) : 0;
      const avg  = s.length ? +(s.reduce((a, v) => a + v, 0) / s.length).toFixed(2) : 0;
      return { id, label: def.label, unit: def.unit, color, curr, min, max, avg };
    });
  }, [pinnedTags, seriesStore]);

  // Tree expand toggle
  const toggleNode = useCallback((id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  // CSV export
  const exportCsv = useCallback(() => {
    if (pinnedTags.length === 0) return;

    // Header row: Time, then one column per tag (label + unit)
    const headers = ["Time", ...pinnedTags.map(pt => `${pt.def.label} (${pt.def.unit})`)];

    // Data rows
    const rows = chartData.map(pt => [
      pt.time as string,
      ...pinnedTags.map(({ id }) => {
        const v = pt[id];
        return v !== undefined ? String(v) : "";
      }),
    ]);

    // Stats footer
    const blank = Array(pinnedTags.length).fill("");
    const statRows = [
      ["", ...blank],
      ["Stats", ...pinnedTags.map(pt => pt.def.label)],
      ["Current", ...stats.map(s => String(s.curr))],
      ["Min",     ...stats.map(s => String(s.min))],
      ["Max",     ...stats.map(s => String(s.max))],
      ["Avg",     ...stats.map(s => String(s.avg))],
      ["Unit",    ...stats.map(s => s.unit)],
    ];

    const csv = [headers, ...rows, ...statRows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `trending_export_${tf}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pinnedTags, chartData, stats, tf]);

  // Tab scroll refs
  const tabsRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (dir: "left" | "right") =>
    tabsRef.current?.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });

  // X-axis tick density
  const xInterval = Math.max(1, Math.floor(TF_POINTS[tf] / 12));

  // Filter tree by search
  function treeMatches(node: TreeNode, q: string): boolean {
    if (!q) return true;
    if (node.label.toLowerCase().includes(q)) return true;
    return (node.children ?? []).some(c => treeMatches(c, q));
  }

  function renderTree(nodes: TreeNode[], depth = 0): React.ReactNode {
    const q = treeSearch.toLowerCase();
    return nodes
      .filter(n => treeMatches(n, q))
      .map(node => {
        const hasKids = (node.children?.length ?? 0) > 0;
        const isOpen  = expanded.has(node.id);
        const isSel   = selNode === node.id;
        const dotColor = node.status === "danger" ? "#ef4444" : node.status === "warning" ? "#f59e0b" : "#22c55e";
        const hasTags  = collectSubtreeTags(node.id, tree, tagRegistry).length > 0;

        return (
          <div key={node.id}>
            <div
              className={`tc-tree-row${isSel ? " selected" : ""}${hasTags ? " has-tags" : ""}`}
              style={{ paddingLeft: 8 + depth * 13 }}
              onClick={() => {
                setSelNode(node.id);
                setTagSearch("");
                if (hasKids) toggleNode(node.id);
              }}
            >
              <span className="tc-tree-arrow">{hasKids ? (isOpen ? "▾" : "▸") : " "}</span>
              <span className="tc-tree-dot" style={{ background: dotColor }} />
              <span className="tc-tree-label">{node.label}</span>
              {node.meta && <span className="tc-tree-meta">{node.meta}</span>}
            </div>
            {hasKids && isOpen && renderTree(node.children!, depth + 1)}
          </div>
        );
      });
  }

  // Custom dot: only render on last data point (live value label)
  const makeDot = (ptColor: string, tagId: string, lastIdx: number) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dotProps: any) => {
      const { cx, cy, index, payload } = dotProps;
      if (index !== lastIdx) return <g key={dotProps.key} />;
      const val = payload[tagId];
      if (val === undefined || typeof val !== "number") return <g key={dotProps.key} />;
      return (
        <g key={dotProps.key}>
          <circle cx={cx} cy={cy} r={4} fill={ptColor} stroke="var(--ds-bg)" strokeWidth={2} />
          <rect x={cx + 7} y={cy - 10} width={58} height={18} rx={3}
            fill={ptColor + "22"} stroke={ptColor + "55"} strokeWidth={1} />
          <text x={cx + 9} y={cy + 4} fill={ptColor} fontSize={10} fontWeight={700}
            fontFamily="Inter,sans-serif">{val.toFixed(1)}</text>
        </g>
      );
    };

  return (
    <div className="tc-page">

      {/* ── Left: Asset Hierarchy ─────────────────────────────────────── */}
      <div className="tc-tree-panel">
        <div className="tc-panel-hdr">
          <span className="tc-panel-title">Asset Hierarchy</span>
        </div>
        <div className="tc-tree-search-wrap">
          <span className="tc-search-ico">⌕</span>
          <input
            className="tc-search-input"
            placeholder="Search assets..."
            value={treeSearch}
            onChange={e => setTreeSearch(e.target.value)}
          />
        </div>
        <div className="tc-tree-legend">
          <span><span className="tc-leg-dot" style={{ background: "#22c55e" }} />normal</span>
          <span><span className="tc-leg-dot" style={{ background: "#f59e0b" }} />warning</span>
          <span><span className="tc-leg-dot" style={{ background: "#ef4444" }} />alarm</span>
        </div>
        <div className="tc-scroll">{renderTree(tree)}</div>
      </div>

      {/* ── Middle: Tag Browser ──────────────────────────────────────── */}
      <div className="tc-tags-panel">
        <div className="tc-tag-search-wrap">
          <span className="tc-search-ico">⌕</span>
          <input
            className="tc-search-input"
            placeholder="Search tags..."
            value={tagSearch}
            onChange={e => setTagSearch(e.target.value)}
          />
        </div>

        {!selNode ? (
          <div className="tc-empty-hint">Select an asset to browse tags</div>
        ) : visibleTags.length === 0 ? (
          <div className="tc-empty-hint">{tagSearch ? "No matching tags" : "No tags for this node"}</div>
        ) : (
          <div className="tc-scroll">
            {groupedTags.map(({ label: grpLabel, tags }) => (
              <div key={grpLabel}>
                {groupedTags.length > 1 && <div className="tc-tag-group-hdr">{grpLabel}</div>}
                {tags.map(tag => {
                  const pin = pinnedTags.find(p => p.id === tag.id);
                  return (
                    <div
                      key={tag.id}
                      className={`tc-tag-row${pin ? " pinned" : ""}`}
                      style={pin ? { borderLeft: `3px solid ${pin.color}` } : undefined}
                      onClick={() => toggleTag(tag)}
                    >
                      {pin
                        ? <span className="tc-tag-pin" style={{ background: pin.color }} />
                        : <span className="tc-tag-add">+</span>}
                      <span className="tc-tag-name">{tag.label}</span>
                      <span className="tc-tag-unit">{tag.unit}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            <div style={{ height: 16 }} />
            <div className="tc-tag-footer">
              {totalTags.toLocaleString()} tags total · Historian connected
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Chart + Stats ─────────────────────────────────────── */}
      <div className="tc-chart-panel">

        {/* Toolbar */}
        <div className="tc-toolbar">
          <button className={`tc-live-btn${live ? " active" : ""}`} onClick={() => setLive(l => !l)}>
            <span className={`tc-live-dot${live ? " on" : ""}`} />
            {live ? "Live" : "Paused"}
          </button>

          <div className="tc-tf-group">
            {TF_LIST.map(t => (
              <button key={t} className={`tc-tf-btn${tf === t ? " active" : ""}`} onClick={() => changeTf(t)}>{t}</button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {pinnedTags.length > 0 && (
            <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>
              {pinnedTags.length} tag{pinnedTags.length !== 1 ? "s" : ""} · {TF_POINTS[tf]} pts
            </span>
          )}
          <button
            className="tc-export-btn"
            onClick={exportCsv}
            disabled={pinnedTags.length === 0}
            title={pinnedTags.length === 0 ? "Select tags to export" : `Export ${pinnedTags.length} tag${pinnedTags.length !== 1 ? "s" : ""} as CSV`}
            style={pinnedTags.length === 0 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            ↓ Export
          </button>
        </div>

        {/* Tag tabs with scroll arrows */}
        <div className="tc-tabs-row">
          {pinnedTags.length > 0 && (
            <button className="tc-tabs-arrow" onClick={() => scrollTabs("left")}>‹</button>
          )}
          <div className="tc-tag-tabs" ref={tabsRef}>
            {pinnedTags.map(pt => (
              <div key={pt.id} className="tc-tag-tab" style={{ borderBottomColor: pt.color }}>
                <span className="tc-tab-dot" style={{ background: pt.color }} />
                <span className="tc-tab-label">{pt.def.label}</span>
                <button className="tc-tab-close" onClick={() => removeTag(pt.id)}>×</button>
              </div>
            ))}
            {pinnedTags.length === 0 && (
              <span style={{ fontSize: 11, color: "var(--ds-text-faint)", paddingLeft: 12, alignSelf: "center" }}>
                No tags selected — click tags in the browser to add them
              </span>
            )}
          </div>
          {pinnedTags.length > 0 && (
            <button className="tc-tabs-arrow" onClick={() => scrollTabs("right")}>›</button>
          )}
        </div>

        {/* Chart */}
        <div className="tc-chart-area">
          {pinnedTags.length === 0 ? (
            <div className="tc-chart-empty">
              <div className="tc-chart-empty-icon">⋯</div>
              <div style={{ fontSize: 13, color: "var(--ds-text-faint)" }}>Select an asset, then click tags to plot</div>
              <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginTop: 4, opacity: 0.55 }}>Up to 8 tags simultaneously</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 80, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "var(--ds-text-faint)", fontSize: 10, fontFamily: "Inter,sans-serif" }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                  interval={xInterval}
                />
                <YAxis
                  tick={{ fill: "var(--ds-text-faint)", fontSize: 10, fontFamily: "Inter,sans-serif" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                {pinnedTags.map(pt => (
                  <Line
                    key={pt.id}
                    type="monotone"
                    dataKey={pt.id}
                    name={pt.def.label}
                    stroke={pt.color}
                    strokeWidth={1.5}
                    dot={makeDot(pt.color, pt.id, chartData.length - 1)}
                    activeDot={{ r: 4, fill: pt.color }}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Stats table */}
        {stats.length > 0 && (
          <div className="tc-stats">
            <table className="tc-stats-table">
              <thead>
                <tr>
                  <th>TAG</th>
                  <th>CURRENT</th>
                  <th>MIN</th>
                  <th>MAX</th>
                  <th>AVG</th>
                  <th>UNIT</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.id} style={{ borderLeft: `3px solid ${s.color}` }}>
                    <td>
                      <span className="tc-stat-dot" style={{ background: s.color }} />
                      <span className="tc-stat-name">{s.label}</span>
                    </td>
                    <td style={{ color: s.color, fontWeight: 700 }}>{s.curr}</td>
                    <td>{s.min}</td>
                    <td>{s.max}</td>
                    <td>{s.avg}</td>
                    <td className="tc-stat-unit">{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
