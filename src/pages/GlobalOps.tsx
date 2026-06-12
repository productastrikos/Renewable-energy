import React, { useState, useMemo, useCallback } from "react";
import { useLiveValue, useLiveClock, useLastSync, useLiveSites, useLiveEvents, LiveEvent } from "../hooks/useLiveData";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { KpiDrilldownModal, KpiModalConfig } from "../components/shared/KpiDrilldownModal";
import { AIFindingDrilldownModal } from "../components/shared/AIFindingDrilldownModal";
import { AIFinding, SITES, AI_FINDINGS, PORTFOLIO_KPI, SiteData } from "../data/mockData";
import { fetchSites, fetchAiFindings, fetchPortfolioKpi } from "../api/endpoints";
import { useApi } from "../hooks/useApi";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../utils/chartHelpers";
import { generate24h, generate7d, generate30d, rag, clipToNow } from "../utils/ragHelpers";
import {
  IcoZap,
  IcoActivity,
  IcoCpu,
  IcoDollar,
  IcoLeaf,
  IcoBell,
  IcoRefresh,
  IcoSun,
  IcoCloud,
  IcoFilter,
  IcoChevronDown,
  IcoWind,
  IcoDroplets,
  IcoSparkle,
} from "../components/shared/Icons";
import { useTimeframe } from "../components/shared/ChartTimeframeControl";

// ─── Static chart data ────────────────────────────────────────────────────────
const BASE_GEN_24 = generate24h(1100, 0.1);
const BASE_GEN_7D = generate7d(7000, 0.08);
const AVAIL_30 = generate30d(98).map((d) => ({ day: d.day, value: Math.min(100, d.value) }));
const REV_7D = generate7d(250, 0.12);
const CARBON_30 = generate30d(1600);

// ─── Map: weather overlay data ────────────────────────────────────────────────
const WEATHER_OV = {
  cloud: [
    { lat: 23.1, lng: 53.7, r: 200000, op: 0.18 },
    { lat: 24.7, lng: 55.3, r: 160000, op: 0.14 },
    { lat: 28.4, lng: 36.5, r: 180000, op: 0.1 },
    { lat: 27.0, lng: 49.7, r: 150000, op: 0.08 },
    { lat: 19.7, lng: 57.7, r: 160000, op: 0.12 },
    { lat: 23.2, lng: 56.5, r: 140000, op: 0.1 },
  ],
  wind: [
    { lat: 28.4, lng: 36.5, r: 230000, op: 0.44 },
    { lat: 27.0, lng: 49.7, r: 190000, op: 0.32 },
    { lat: 19.7, lng: 57.7, r: 200000, op: 0.38 },
    { lat: 23.1, lng: 53.7, r: 175000, op: 0.22 },
    { lat: 24.7, lng: 55.3, r: 160000, op: 0.2 },
  ],
  irradiance: [
    { lat: 23.1, lng: 53.7, r: 210000, op: 0.55 },
    { lat: 24.7, lng: 55.3, r: 180000, op: 0.52 },
    { lat: 23.2, lng: 56.5, r: 175000, op: 0.5 },
    { lat: 19.7, lng: 57.7, r: 190000, op: 0.48 },
    { lat: 27.0, lng: 49.7, r: 165000, op: 0.44 },
    { lat: 28.4, lng: 36.5, r: 170000, op: 0.4 },
  ],
  temp: [
    { lat: 23.1, lng: 53.7, r: 210000, op: 0.5 },
    { lat: 24.7, lng: 55.3, r: 185000, op: 0.48 },
    { lat: 28.4, lng: 36.5, r: 200000, op: 0.45 },
    { lat: 27.0, lng: 49.7, r: 175000, op: 0.42 },
    { lat: 19.7, lng: 57.7, r: 180000, op: 0.38 },
    { lat: 23.2, lng: 56.5, r: 160000, op: 0.4 },
  ],
  rain: [
    { lat: 19.7, lng: 57.7, r: 180000, op: 0.14 },
    { lat: 28.4, lng: 36.5, r: 160000, op: 0.1 },
  ],
};

const WEATHER_COLORS: Record<string, string> = {
  cloud: "#b0bec5",
  wind: "#38bdf8",
  irradiance: "#f59e0b",
  temp: "#ef4444",
  rain: "#60a5fa",
};

// ─── Base tile layers ─────────────────────────────────────────────────────────
type BaseTile = "dark" | "satellite" | "terrain" | "light";

const BASE_TILES: Record<BaseTile, { label: string; url: string; attribution: string; maxZoom: number }> = {
  dark: {
    label: "🌑 Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    label: "🛰 Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 18,
  },
  terrain: {
    label: "⛰ Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
  },
  light: {
    label: "🌤 Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
};

// ─── AI Risk zones ────────────────────────────────────────────────────────────
const AI_RISK_ZONES = [
  { lat: 23.1, lng: 53.7, r: 220000, label: "High Soiling Risk", color: "#d97706" },
  { lat: 28.4, lng: 36.5, r: 260000, label: "Grid Instability Zone", color: "#dc2626" },
  { lat: 19.7, lng: 57.7, r: 230000, label: "Dust Storm Risk Zone", color: "#38bdf8" },
  { lat: 27.0, lng: 49.7, r: 200000, label: "High Irradiance Region", color: "#f59e0b" },
  { lat: 23.2, lng: 56.5, r: 170000, label: "Curtailment Forecast", color: "#a78bfa" },
];

// ─── Power flow connections (sites → regional grid hubs) ─────────────────────
const GRID_HUBS: Record<string, [number, number]> = {
  uaeGrid: [24.2, 54.4],
  ksaGrid: [26.3, 43.5],
  omanGrid: [23.6, 58.6],
};

const FLOW_CONNECTIONS: { from: [number, number]; to: [number, number]; color: string; weight: number }[] = [
  { from: [23.1, 53.7], to: GRID_HUBS.uaeGrid, color: "#f59e0b", weight: 2.0 },
  { from: [24.7, 55.3], to: GRID_HUBS.uaeGrid, color: "#fbbf24", weight: 1.5 },
  { from: [28.4, 36.5], to: GRID_HUBS.ksaGrid, color: "#38bdf8", weight: 2.0 },
  { from: [27.0, 49.7], to: GRID_HUBS.ksaGrid, color: "#818cf8", weight: 1.5 },
  { from: [19.7, 57.7], to: GRID_HUBS.omanGrid, color: "#a78bfa", weight: 2.0 },
  { from: [23.2, 56.5], to: GRID_HUBS.omanGrid, color: "#34d399", weight: 1.5 },
];

const WEATHER_LAYER_KEYS = ["cloud", "wind", "irradiance", "temp", "rain"];
const OPS_LAYER_KEYS = ["pulse", "flow", "aiRisk"];

const LAYER_LABELS: Record<string, string> = {
  cloud: "☁ Cloud",
  wind: "〰 Wind",
  irradiance: "☀ Irradiance",
  temp: "🌡 Temp",
  rain: "🌧 Rain",
  pulse: "⚡ Energy Pulse",
  flow: "⟶ Power Flow",
  aiRisk: "✦ AI Risk",
};

// ─── Map: custom DivIcon markers ──────────────────────────────────────────────
const TECH_FILL: Record<string, string> = {
  Solar: "#f59e0b",
  Wind: "#38bdf8",
  Hydro: "#34d399",
  BESS: "#818cf8",
  Hybrid: "#a78bfa",
};

function buildSVG(type: string, fill: string, sz: number): string {
  const h = sz,
    cx = sz / 2;
  const w = `fill="${fill}" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"`;
  const shapes: Record<string, string> = {
    Solar: `<polygon points="${cx},3 ${h - 3},${h - 3} 3,${h - 3}" ${w} stroke-linejoin="round"/>
             <circle cx="${cx}" cy="${h * 0.66}" r="${h * 0.1}" fill="rgba(255,255,255,0.65)"/>`,
    Wind: `<circle cx="${cx}" cy="${cx}" r="${cx - 3}" ${w}/>
             <line x1="${cx}" y1="4" x2="${cx}" y2="${cx - 2}" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
             <line x1="${h - 5}" y1="6" x2="${cx + 2}" y2="${cx + 2}" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
             <line x1="5" y1="6" x2="${cx - 2}" y2="${cx + 2}" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
             <circle cx="${cx}" cy="${cx}" r="${h * 0.1}" fill="rgba(255,255,255,0.65)"/>`,
    Hydro: `<polygon points="${cx},3 ${h - 3},${cx} ${cx},${h - 3} 3,${cx}" ${w} stroke-linejoin="round"/>
             <polygon points="${cx},${cx * 0.5} ${cx * 1.5},${cx} ${cx},${cx * 1.5} ${cx * 0.5},${cx}" fill="rgba(255,255,255,0.65)"/>`,
    BESS: `<rect x="3" y="${h * 0.18}" width="${h - 6}" height="${h * 0.64}" rx="3" ${w}/>
             <rect x="${h * 0.34}" y="${h * 0.08}" width="${h * 0.32}" height="${h * 0.14}" rx="2" fill="${fill}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
             <path d="M${cx - h * 0.06},${h * 0.36} L${cx},${h * 0.28} L${cx + h * 0.02},${cx - h * 0.02} L${cx + h * 0.1},${cx - h * 0.02} L${cx},${h * 0.72} L${cx - h * 0.02},${cx + h * 0.06} L${cx - h * 0.08},${cx + h * 0.06} Z" fill="rgba(255,255,255,0.7)"/>`,
    Hybrid: `<polygon points="${cx},3 ${h - 4},${cx - h * 0.16} ${h - 4},${cx + h * 0.16} ${cx},${h - 3} 4,${cx + h * 0.16} 4,${cx - h * 0.16}" ${w} stroke-linejoin="round"/>
             <circle cx="${cx}" cy="${cx}" r="${h * 0.12}" fill="rgba(255,255,255,0.65)"/>`,
  };
  return `<svg width="${h}" height="${h}" viewBox="0 0 ${h} ${h}" xmlns="http://www.w3.org/2000/svg">${shapes[type] ?? shapes.Solar}</svg>`;
}

function createSiteIcon(site: SiteData): L.DivIcon {
  const sz = Math.round(28 + Math.min(1, (site.capacity - 80) / 370) * 20);
  const fill = TECH_FILL[site.type] ?? "#f59e0b";
  const ring = site.status === "Critical" ? "#dc2626" : site.status === "Warning" ? "#d97706" : "rgba(255,255,255,0.22)";
  const glow = site.status === "Critical" ? "#dc2626" : site.status === "Warning" ? "#d97706" : fill;
  const cls = site.status === "Critical" ? "mmw pulse-marker" : site.status === "Warning" ? "mmw warn-marker" : "mmw";
  const lbl = site.capacity >= 1000 ? `${(site.capacity / 1000).toFixed(1)}GW` : `${site.capacity}MW`;
  const genPct = Math.round((site.generation / site.capacity) * 100);
  const genCol = genPct >= 70 ? "#16a34a" : genPct >= 50 ? "#d97706" : "#dc2626";
  const html = `<div class="${cls}" style="width:${sz}px;height:${sz}px">
    <div style="position:absolute;inset:-6px;border-radius:50%;border:1px solid ${genCol}55;pointer-events:none"></div>
    <div style="position:absolute;inset:-3px;border-radius:50%;box-shadow:0 0 0 2px ${ring},0 0 16px ${glow}66,0 2px 8px rgba(0,0,0,0.55)"></div>
    ${buildSVG(site.type, fill, sz)}
    <div class="mm-label">${lbl}</div>
  </div>`;
  return L.divIcon({ html, iconSize: [sz, sz + 14], iconAnchor: [sz / 2, sz / 2], popupAnchor: [0, -(sz / 2 + 4)], className: "" });
}

// ─── Animated energy-pulse ring marker (rendered behind main icons) ───────────
function PulseRingMarker({ site }: { site: SiteData }) {
  const fill = TECH_FILL[site.type] ?? "#f59e0b";
  const color = site.status === "Critical" ? "#dc2626" : site.status === "Warning" ? "#d97706" : fill;
  const base = Math.round(56 + Math.min(1, site.generation / site.capacity) * 56);
  const html = `<div class="pulse-ring-host" style="width:${base}px;height:${base}px">
    <div class="pr pr1" style="--rc:${color}44"></div>
    <div class="pr pr2" style="--rc:${color}66"></div>
    <div class="pr pr3" style="--rc:${color}33"></div>
  </div>`;
  const icon = L.divIcon({ html, iconSize: [base, base], iconAnchor: [base / 2, base / 2], className: "" });
  return <Marker position={[site.lat, site.lng]} icon={icon} interactive={false} zIndexOffset={-200} />;
}

// ─── Filter state ─────────────────────────────────────────────────────────────
interface FilterState {
  region: string[];
  country: string[];
  technology: string[];
  status: string[];
  codYear: string[];
}
const INITIAL_FILTERS: FilterState = { region: [], country: [], technology: [], status: [], codYear: [] };

// ─── Map fly-to helper ────────────────────────────────────────────────────────
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  map.flyTo([lat, lng], 8, { duration: 1 });
  return null;
}

function MapResizer() {
  const map = useMap();
  // Force Leaflet to recalculate tile grid after the container resizes
  // (e.g. when layout columns change width)
  React.useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// ─── Horizontal Filter Bar ────────────────────────────────────────────────────
function FilterPanel({ filters, onChange, sites }: { filters: FilterState; onChange: (f: FilterState) => void; sites: SiteData[] }) {
  const [openKey, setOpenKey] = useState<keyof FilterState | null>(null);

  const toggleVal = (key: keyof FilterState, val: string) => {
    const cur = filters[key];
    onChange({ ...filters, [key]: cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val] });
  };

  const sections: { key: keyof FilterState; label: string; options: string[] }[] = [
    { key: "region", label: "Region", options: [...new Set(sites.map((s) => s.region))] },
    { key: "technology", label: "Technology", options: [...new Set(sites.map((s) => s.type))] },
    { key: "status", label: "Status", options: ["Normal", "Warning", "Critical"] },
    { key: "country", label: "Country", options: [...new Set(sites.map((s) => s.country))] },
    { key: "codYear", label: "COD Year", options: [...new Set(sites.map((s) => String(s.codYear)))].sort() },
  ];

  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="go-filter-bar">
      {/* Backdrop — closes dropdown on outside click */}
      {openKey && <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setOpenKey(null)} />}

      <span className="filter-bar-label">
        <IcoFilter width={11} height={11} /> Filters
      </span>

      {sections.map((sec) => {
        const active = filters[sec.key];
        const isOpen = openKey === sec.key;
        return (
          <div key={sec.key} className="fdd-wrap" style={{ zIndex: isOpen ? 200 : undefined }}>
            <button
              className={`fdd-btn${active.length > 0 ? " fdd-active" : ""}${isOpen ? " fdd-open" : ""}`}
              onClick={() => setOpenKey(isOpen ? null : sec.key)}
            >
              {sec.label}
              {active.length > 0 && <span className="fdd-badge">{active.length}</span>}
              <IcoChevronDown
                width={10}
                height={10}
                style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", opacity: 0.6 }}
              />
            </button>

            {isOpen && (
              <div className="fdd-menu">
                {sec.options.map((opt) => {
                  const count = sites.filter((s) => {
                    if (sec.key === "region") return s.region === opt;
                    if (sec.key === "country") return s.country === opt;
                    if (sec.key === "technology") return s.type === opt;
                    if (sec.key === "status") return s.status === opt;
                    if (sec.key === "codYear") return String(s.codYear) === opt;
                    return false;
                  }).length;
                  return (
                    <label key={opt} className="fdd-opt">
                      <input type="checkbox" checked={active.includes(opt)} onChange={() => toggleVal(sec.key, opt)} />
                      <span className="fdd-opt-label">{opt}</span>
                      <span className="fdd-opt-count">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {activeCount > 0 && (
        <button className="fdd-clear" onClick={() => onChange(INITIAL_FILTERS)}>
          Clear {activeCount}
        </button>
      )}
    </div>
  );
}

// ─── Site Card ────────────────────────────────────────────────────────────────
const TYPE_GRAD: Record<string, string> = {
  Solar: "linear-gradient(135deg,#f59e0b,#d97706)",
  Wind: "linear-gradient(135deg,#38bdf8,#0284c7)",
  Hydro: "linear-gradient(135deg,#34d399,#059669)",
  BESS: "linear-gradient(135deg,#818cf8,#4f46e5)",
  Hybrid: "linear-gradient(135deg,#a78bfa,#7c3aed)",
};
const TYPE_ICON: Record<string, string> = { Solar: "☀", Wind: "〰", Hydro: "💧", BESS: "⚡", Hybrid: "🔋" };
const WI_CLASS: Record<string, string> = { None: "wi-none", Low: "wi-low", Medium: "wi-med", High: "wi-high" };

function SiteCard({ site, onOpen }: { site: SiteData; onOpen: () => void }) {
  const grad = TYPE_GRAD[site.type] ?? TYPE_GRAD.Solar;
  const sc = site.status === "Critical" ? "danger" : site.status === "Warning" ? "warning" : "success";
  const pct = Math.round((site.generation / site.capacity) * 100);
  return (
    <div className="site-card">
      <div className="site-card-thumb" style={{ background: grad }}>
        <div className="sct-info">
          <span className="sct-icon">{TYPE_ICON[site.type]}</span>
          <div>
            <div className="sct-name">{site.name}</div>
            <div className="sct-loc">
              {site.state}, {site.country}
            </div>
          </div>
        </div>
        <span className={`chip ${sc}`} style={{ fontSize: 9 }}>
          {site.status}
        </span>
      </div>
      <div className="site-card-body">
        <div className="sc-cap-row">
          <span className="sc-cap-label">{site.capacity} MW capacity</span>
          <span className="sc-pct">{pct}%</span>
        </div>
        <div className="sc-gen-bar">
          <div className="sc-gen-fill" style={{ width: `${pct}%`, background: grad }} />
        </div>
        <div className="sc-metrics">
          <div className="sc-metric">
            <span className="sc-ml">Gen</span>
            <span className="sc-mv">{site.generation} MW</span>
          </div>
          <div className="sc-metric">
            <span className="sc-ml">PR</span>
            <span className="sc-mv">{site.pr}%</span>
          </div>
          <div className="sc-metric">
            <span className="sc-ml">Alarms</span>
            <span className={`sc-mv ${site.alarms > 3 ? "text-danger" : site.alarms > 0 ? "text-warning" : ""}`}>{site.alarms}</span>
          </div>
        </div>
        <div className="sc-footer">
          <span className={`wi-badge ${WI_CLASS[site.weatherImpact]}`}>
            <IcoCloud width={9} height={9} /> {site.weatherImpact}
          </span>
          <span className="ai-score-badge">AI {site.aiScore}%</span>
        </div>
        <button className="sc-open-btn" onClick={onOpen}>
          Open Site →
        </button>
      </div>
    </div>
  );
}

// ─── AI Copilot Panel ─────────────────────────────────────────────────────────
const QUERY_CHIPS = [
  "Which sites underperformed today?",
  "Any critical alarms?",
  "Weather impact on portfolio?",
  "Best performing sites?",
  "Revenue summary",
  "Sites at risk",
];

interface ChatMsg {
  role: "user" | "ai";
  text: string;
  ts: string;
}

function buildAIResponse(query: string, findings: AIFinding[], sites: SiteData[]): string {
  const q = query.toLowerCase();
  const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (q.includes("underperform") || q.includes("poor") || q.includes("worst")) {
    const under = [...sites].sort((a, b) => a.generation / a.capacity - b.generation / b.capacity).slice(0, 3);
    return `**Underperforming Sites (by utilisation):**\n${under
      .map(
        (s, i) =>
          `${i + 1}. **${s.name}** — ${Math.round((s.generation / s.capacity) * 100)}% utilisation · PR ${s.pr}% · ${s.alarms} alarm${s.alarms !== 1 ? "s" : ""}`,
      )
      .join("\n")}\n\nRecommendation: Dispatch field team to ${under[0].name} — lowest utilisation in portfolio.`;
  }

  if (q.includes("critical") || q.includes("alarm") || q.includes("fault")) {
    const critical = sites.filter((s) => s.status === "Critical");
    const warn = sites.filter((s) => s.status === "Warning");
    const totalAlarms = sites.reduce((s, x) => s + x.alarms, 0);
    return `**Active Alarm Summary (${now}):**\n• ${critical.length} site${critical.length !== 1 ? "s" : ""} CRITICAL: ${critical.map((s) => s.name).join(", ") || "None"}\n• ${warn.length} site${warn.length !== 1 ? "s" : ""} WARNING: ${warn.map((s) => s.name).join(", ") || "None"}\n• Total unacknowledged alarms: **${totalAlarms}**\n\nAI recommends prioritising ${critical[0]?.name ?? warn[0]?.name ?? "no sites"} for immediate inspection.`;
  }

  if (q.includes("weather") || q.includes("wind") || q.includes("cloud") || q.includes("irradiance")) {
    const impacted = sites.filter((s) => s.weatherImpact !== "None");
    const high = impacted.filter((s) => s.weatherImpact === "High");
    return `**Weather Impact Assessment:**\n• ${high.length} site${high.length !== 1 ? "s" : ""} with HIGH weather impact: ${high.map((s) => s.name).join(", ") || "None"}\n• ${impacted.length} site${impacted.length !== 1 ? "s" : ""} total affected\n• Estimated generation loss: ~${Math.round(high.length * 8.4 + impacted.length * 3.2)} MW\n\nHigh irradiance forecast across UAE tomorrow — expect +4% generation vs today.`;
  }

  if (q.includes("best") || q.includes("top") || q.includes("perform")) {
    const top = [...sites].sort((a, b) => b.pr - a.pr).slice(0, 3);
    return `**Top Performing Sites (by PR):**\n${top
      .map((s, i) => `${i + 1}. **${s.name}** — PR ${s.pr}% · Availability ${s.availability}% · Health ${s.health}/100`)
      .join("\n")}\n\n${top[0].name} is the portfolio leader with PR ${top[0].pr}% — above industry benchmark of 82%.`;
  }

  if (q.includes("revenue") || q.includes("income") || q.includes("earning")) {
    const total = sites.reduce((s, x) => s + x.revenueToday, 0);
    const topRev = [...sites].sort((a, b) => b.revenueToday - a.revenueToday)[0];
    return `**Revenue Summary (Today):**\n• Portfolio total: **$${(total / 1000).toFixed(1)}K**\n• Top earner: **${topRev.name}** — $${(topRev.revenueToday / 1000).toFixed(1)}K\n• Avg per site: $${(total / sites.length / 1000).toFixed(1)}K\n\nPortfolio revenue is tracking +4.2% above plan for this month.`;
  }

  if (q.includes("risk") || q.includes("danger") || q.includes("concern") || q.includes("issue")) {
    const risky = findings.filter((f) => f.priority === "danger").slice(0, 3);
    return `**Portfolio Risk Summary:**\n${risky
      .map((f, i) => `${i + 1}. **${f.site}** — ${f.metric}\n   Root cause: ${f.rootCause} · Impact: ${f.loss}`)
      .join("\n\n")}\n\nAI confidence: 3 high-priority risks require action within 48 hours to prevent SLA breach.`;
  }

  if (q.includes("availab")) {
    const avg = (sites.reduce((s, x) => s + x.availability, 0) / sites.length).toFixed(1);
    const low = sites.filter((s) => s.availability < 97);
    return `**Fleet Availability (${now}):**\n• Portfolio average: **${avg}%** (target ≥ 97%)\n• Sites below SLA: ${low.length === 0 ? "None ✓" : low.map((s) => `${s.name} (${s.availability}%)`).join(", ")}\n\nAvailability improved +1.7pp vs prior month. NEOM Wind Farm leading at 99.1%.`;
  }

  if (q.includes("summar") || q.includes("overview") || q.includes("status")) {
    const totalCap = sites.reduce((s, x) => s + x.capacity, 0);
    const totalGen = sites.reduce((s, x) => s + x.generation, 0);
    return `**Portfolio Status (${now}):**\n• ${sites.length} sites online · ${Math.round((totalGen / totalCap) * 100)}% fleet utilisation\n• Capacity: ${(totalCap / 1000).toFixed(1)} GW · Generation: ${totalGen} MW live\n• Critical: ${sites.filter((s) => s.status === "Critical").length} · Warning: ${sites.filter((s) => s.status === "Warning").length} · Normal: ${sites.filter((s) => s.status === "Normal").length}\n• AI findings active: ${findings.length}`;
  }

  // Fallback
  return `I found ${findings.length} active AI findings across ${sites.length} portfolio sites. The most critical issue is: **${findings[0]?.metric ?? "No findings"}** at ${findings[0]?.site ?? "Unknown"} (${findings[0]?.loss ?? "—"} impact).\n\nTry asking about: critical alarms, weather impact, revenue, best performing sites, or risks.`;
}

function AICopilotPanel({
  findings,
  sites,
  onSelect,
  onRefresh,
}: {
  findings: AIFinding[];
  sites: SiteData[];
  onSelect: (f: AIFinding) => void;
  onRefresh: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"findings" | "chat">("findings");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text, ts }]);
    setInput("");
    setMode("chat");
    setLoading(true);
    setTimeout(() => {
      const reply = buildAIResponse(text, findings, sites);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: reply, ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
      ]);
      setLoading(false);
    }, 900);
  }

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="go-ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-title">
          <IcoSparkle width={11} height={11} /> AI Intelligence
        </span>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          <button
            className={`icon-btn${mode === "findings" ? "" : ""}`}
            style={{ width: 22, height: 22, fontSize: 9, color: mode === "findings" ? "var(--ds-accent)" : "var(--ds-text-faint)" }}
            onClick={() => setMode("findings")}
            title="Findings"
          >
            ⚡
          </button>
          <button
            className={`icon-btn`}
            style={{ width: 22, height: 22, fontSize: 9, color: mode === "chat" ? "var(--ds-accent)" : "var(--ds-text-faint)" }}
            onClick={() => setMode("chat")}
            title="Chat"
          >
            💬
          </button>
          <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="Refresh" onClick={onRefresh} title="Refresh findings">
            <IcoRefresh width={11} height={11} />
          </button>
        </div>
      </div>

      {/* Query chip suggestions */}
      <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(139,92,246,0.15)", display: "flex", flexWrap: "wrap", gap: 4 }}>
        {QUERY_CHIPS.map((q) => (
          <button key={q} className="ai-query-chip" onClick={() => sendMessage(q)}>
            {q}
          </button>
        ))}
      </div>

      {/* Body */}
      {mode === "findings" ? (
        <div className="ai-panel-body" style={{ flex: 1, minHeight: 0 }}>
          {findings.length === 0 && (
            <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--ds-text-faint)", fontSize: 11 }}>No active AI findings</div>
          )}
          {findings.map((f, i) => {
            const raw = f as unknown as Record<string, unknown>;
            const sev   = (raw._type as string) ? String(raw._type) : "";
            const asset = (raw._asset as string) || "";
            const conf  = typeof raw._conf === "number" ? raw._conf : null;
            const detected = (raw._detected as string) || "";
            const analysis = (raw._analysis as string) || "";
            const sevColor = f.priority === "danger" ? "#ef4444" : f.priority === "warning" ? "#f97316" : f.priority === "success" ? "#22c55e" : "#38bdf8";
            const sevLabel = f.priority === "danger" ? "CRITICAL" : f.priority === "warning" ? "HIGH" : f.priority === "success" ? "LOW" : "MEDIUM";
            return (
              <div key={i} className={`ai-finding-card modal-${f.priority} ai-finding-clickable`} onClick={() => onSelect(f)}
                style={{ display: "flex", flexDirection: "column", gap: 5 }}>

                {/* Top row: severity + type + confidence */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: sevColor + "22", color: sevColor, border: `1px solid ${sevColor}44`, letterSpacing: "0.04em" }}>
                    ● {sevLabel}
                  </span>
                  {sev && (
                    <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(167,139,250,0.15)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.25)" }}>
                      {sev}
                    </span>
                  )}
                  {conf !== null && (
                    <span style={{ fontSize: 9, color: "var(--ds-text-faint)", marginLeft: "auto" }}>
                      {conf}% conf.
                    </span>
                  )}
                </div>

                {/* Site + asset */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ds-text)" }}>{f.site}</span>
                  {asset && <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>· {asset}</span>}
                  {detected && <span style={{ fontSize: 9, color: "var(--ds-text-faint)", marginLeft: "auto" }}>{detected}</span>}
                </div>

                {/* Title/Metric */}
                <div style={{ fontSize: 12, fontWeight: 600, color: sevColor, lineHeight: 1.3 }}>{f.metric}</div>

                {/* Analysis snippet */}
                {analysis && (
                  <div style={{ fontSize: 10.5, color: "var(--ds-text-muted)", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {analysis}
                  </div>
                )}

                {/* Root cause + impact row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 2 }}>
                  <div style={{ padding: "5px 7px", background: "rgba(255,255,255,0.04)", borderRadius: 5 }}>
                    <div style={{ fontSize: 9, color: "var(--ds-text-faint)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Root Cause</div>
                    <div style={{ fontSize: 10.5, color: "var(--ds-text-muted)", lineHeight: 1.4 }}>{f.rootCause}</div>
                  </div>
                  <div style={{ padding: "5px 7px", background: "rgba(255,255,255,0.04)", borderRadius: 5 }}>
                    <div style={{ fontSize: 9, color: "var(--ds-text-faint)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Revenue Impact</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: f.loss?.startsWith("+") ? "#22c55e" : "#f87171" }}>{f.loss || "—"}</div>
                  </div>
                </div>

                {/* Recommended action */}
                {f.action && f.action !== "—" && (
                  <div style={{ padding: "4px 7px", background: "rgba(139,92,246,0.08)", borderRadius: 5,
                    fontSize: 10, color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.18)", lineHeight: 1.4 }}>
                    ✦ {f.action}
                  </div>
                )}

                <div className="ai-finding-drill-hint">Click to view full AI analysis →</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ai-chat-messages">
          {messages.length === 0 && (
            <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--ds-text-faint)", fontSize: 11 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>✦</div>
              Ask me anything about your portfolio
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`ai-chat-msg ai-chat-msg-${m.role}`}>
              {m.role === "ai" && <div className="ai-chat-avatar">✦</div>}
              <div className="ai-chat-bubble">
                {m.text.split("\n").map((line, j) => {
                  const bold = line.replace(/\*\*(.+?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
                  return <div key={j} dangerouslySetInnerHTML={{ __html: bold || "&nbsp;" }} style={{ marginBottom: 2 }} />;
                })}
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4, textAlign: "right" }}>{m.ts}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="ai-chat-msg ai-chat-msg-ai">
              <div className="ai-chat-avatar">✦</div>
              <div className="ai-chat-bubble ai-chat-typing">
                <span className="aaa-spinner-dot" />
                <span className="aaa-spinner-dot" style={{ animationDelay: "0.2s" }} />
                <span className="aaa-spinner-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="ai-chat-input-row">
        <input
          className="ai-chat-input"
          placeholder="Ask AI about your portfolio…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(input);
          }}
        />
        <button className="ai-chat-send" aria-label="Send" onClick={() => sendMessage(input)}>
          →
        </button>
      </div>
    </div>
  );
}

// ─── Live Events Ticker ───────────────────────────────────────────────────────
const _LEVEL_CLR: Record<string, string> = {
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#38bdf8",
};

function LiveEventsTicker({ events }: { events: LiveEvent[] }) {
  const items = events.slice(0, 20);
  const doubled = [...items, ...items]; // duplicate for seamless marquee loop
  return (
    <div className="evt-ticker-wrap">
      <div className="evt-ticker-label">
        <span className="live-dot" />
        <span>Live Events</span>
      </div>
      <div className="evt-ticker-sep" />
      <div className="evt-ticker-rail">
        <div className="evt-ticker-track" style={{ animationDuration: `${Math.max(30, items.length * 4)}s` }}>
          {doubled.map((ev, i) => (
            <span key={i} className="evt-ticker-item">
              <span className="eti-ts">{ev.ts}</span>
              <span className="eti-site">{ev.site}</span>
              <span className="eti-arr">›</span>
              <span className="eti-msg" style={{ color: _LEVEL_CLR[ev.level] }}>
                {ev.msg}
              </span>
              <span className="eti-dot">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GlobalOps() {
  const nav = useNavigate();
  const { tf: genTf, setTf: setGenTf } = useTimeframe("24H");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [activeModal, setActiveModal] = useState<KpiModalConfig | null>(null);
  const [aiFinding, setAiFinding] = useState<AIFinding | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);

  // Poll sites + KPI from the API every 10 s so values stay fresh
  const { data: apiSites } = useApi(() => fetchSites(), [], 10000);
  const { data: apiFindings } = useApi(() => fetchAiFindings(), []);
  const { data: apiKpi } = useApi(() => fetchPortfolioKpi(), [], 10000);

  const allSites = (apiSites ?? SITES) as SiteData[];

  // Adapt rule-engine API findings (new shape) → AIFinding shape expected by cards + modal
  const allFindings: AIFinding[] = useMemo(() => {
    const raw = apiFindings ?? AI_FINDINGS;
    return (raw as unknown as Record<string, unknown>[]).map((f) => {
      if ("drilldown" in f) return f as unknown as AIFinding; // already old shape
      const sev = (f.sev as string) ?? "HIGH";
      const urgency = sev === "CRITICAL" ? "immediate" : sev === "HIGH" ? "urgent" : "monitor";
      const steps = Array.isArray(f.steps) ? (f.steps as string[]) : [];
      const impact = (f.impact as string) ?? "";
      const lossMatch = impact.match(/\$[\d,]+(?:\/\w+)?/);
      const loss = lossMatch ? (sev === "CRITICAL" || sev === "HIGH" ? "−" : "") + lossMatch[0] : impact.slice(0, 40) || "—";
      return {
        site:      (f.site      as string) ?? "",
        metric:    (f.title     as string) ?? "",
        rootCause: (f.rootCause as string) ?? "",
        loss,
        action:    steps[0] ?? (f.recommendation as string)?.split(".")[0] ?? "—",
        priority:  sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : sev === "LOW" ? "success" : "info",
        _type:     (f.type as string) ?? "",
        _asset:    (f.asset as string) ?? "",
        _detected: (f.detected as string) ?? "",
        _conf:     typeof f.conf === "number" ? f.conf : 85,
        _analysis: (f.analysis as string) ?? "",
        _recommendation: (f.recommendation as string) ?? "",
        _steps:    steps,
        _impact:   impact,
        drilldown: {
          urgency: urgency as "immediate" | "urgent" | "monitor",
          detectedAt: (f.detected as string) ?? "Today",
          summary: (f.analysis as string) ?? "",
          context: (f.recommendation as string) ?? undefined,
          causes: [{ label: (f.rootCause as string) ?? "Unknown", probability: typeof f.conf === "number" ? f.conf : 85, severity: sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : "info" as "danger" | "warning" | "info" }],
          affectedAssets: [{ id: (f.asset as string) ?? "—", name: (f.asset as string) ?? "Unknown", status: (sev === "CRITICAL" ? "danger" : sev === "HIGH" ? "warning" : "success") as "danger" | "warning" | "success", detail: `${(f.type as string) ?? ""} — ${sev}` }],
          nextSteps: steps.length
            ? steps.map((s) => ({ urgency: urgency as "immediate" | "urgent" | "monitor", action: s, eta: "Immediate" }))
            : [{ urgency: urgency as "immediate" | "urgent" | "monitor", action: (f.recommendation as string) ?? "Review", eta: "Immediate" }],
        },
      } as unknown as AIFinding;
    });
  }, [apiFindings]);

  const portfolioKpi = apiKpi ?? PORTFOLIO_KPI;

  // Live-updating event stream (new event every 6 s)
  const liveEvents = useLiveEvents(6000, 12);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    cloud: false,
    wind: false,
    irradiance: false,
    temp: false,
    rain: false,
    pulse: true,
    flow: true,
    aiRisk: false,
  });
  const toggleLayer = (key: string) => setActiveLayers((p) => ({ ...p, [key]: !p[key] }));
  const [baseTile, setBaseTile] = useState<BaseTile>("dark");

  const filteredSites = useMemo(
    () =>
      allSites.filter((s) => {
        if (filters.region.length && !filters.region.includes(s.region)) return false;
        if (filters.country.length && !filters.country.includes(s.country)) return false;
        if (filters.technology.length && !filters.technology.includes(s.type)) return false;
        if (filters.status.length && !filters.status.includes(s.status)) return false;
        if (filters.codYear.length && !filters.codYear.includes(String(s.codYear))) return false;
        return true;
      }),
    [filters, allSites],
  );

  const totalCap = useMemo(() => filteredSites.reduce((a, s) => a + s.capacity, 0), [filteredSites]);
  const baseGen = useMemo(() => filteredSites.reduce((a, s) => a + s.generation, 0), [filteredSites]);
  const baseAvail = useMemo(
    () => (filteredSites.length ? filteredSites.reduce((a, s) => a + s.availability, 0) / filteredSites.length : 0),
    [filteredSites],
  );
  const baseRev = useMemo(() => filteredSites.reduce((a, s) => a + s.revenueToday, 0), [filteredSites]);
  const totalCarbon = useMemo(() => filteredSites.reduce((a, s) => a + s.carbonOffset, 0), [filteredSites]);
  const totalAlarms = useMemo(() => filteredSites.reduce((a, s) => a + s.alarms, 0), [filteredSites]);

  // Live-updating KPI values (tick every 8–15s with small noise)
  const totalGen = useLiveValue(baseGen, 0.025, 8000, 0);
  const avgAvail = useLiveValue(baseAvail, 0.003, 25000, 1);
  const totalRev = useLiveValue(baseRev, 0.015, 12000, 0);
  const clock = useLiveClock();
  const lastSync = useLastSync(8000);

  const TECH_DIST = useMemo(() => {
    const b: Record<string, number> = {};
    filteredSites.forEach((s) => {
      b[s.type] = (b[s.type] ?? 0) + s.capacity;
    });
    const cols: Record<string, string> = {
      Solar: CHART_COLORS.amber,
      Wind: CHART_COLORS.sky,
      Hydro: CHART_COLORS.teal,
      BESS: CHART_COLORS.indigo,
      Hybrid: CHART_COLORS.violet,
    };
    return Object.entries(b).map(([name, value]) => ({ name, value, color: cols[name] ?? CHART_COLORS.blue }));
  }, [filteredSites]);

  // Live-updating copies of site arrays (generation/availability/pr tick every ~9 s)
  const liveAllSites = useLiveSites(allSites, 9000);
  const liveFilteredSites = useLiveSites(filteredSites, 9000);

  const scale = SITES.length > 0 ? filteredSites.length / SITES.length : 1;

  // 24H chart: last point is the live current generation so the chart always shows "now"
  const genData = useMemo(() => {
    if (genTf === "7D") {
      return BASE_GEN_7D.map((d) => ({ time: d.day, actual: +(d.actual * scale).toFixed(0), forecast: +(d.forecast * scale).toFixed(0) }));
    }
    const clip = clipToNow(BASE_GEN_24);
    const historical = clip.map((d) => ({ time: d.time, actual: +(d.actual * scale).toFixed(0), forecast: +(d.forecast * scale).toFixed(0) }));
    if (historical.length === 0) return historical;
    const nowLabel = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return [...historical.slice(0, -1), { time: nowLabel, actual: totalGen, forecast: historical[historical.length - 1].forecast }];
  }, [genTf, scale, totalGen]);

  const availData = useMemo(() => AVAIL_30.map((d) => ({ time: String(d.day), value: d.value })), []);
  const revData = useMemo(() => REV_7D.map((d) => ({ time: d.day, value: +(d.actual * scale).toFixed(0) })), [scale]);
  const carbonData = useMemo(() => CARBON_30.map((d) => ({ time: String(d.day), value: Math.round(d.value * scale) })), [scale]);

  // Region chart — derived from live filtered sites so bars update as generation ticks
  const REGION_FILL: Record<string, string> = {
    "UAE": CHART_COLORS.amber,
    "Saudi Arabia": CHART_COLORS.sky,
    "Oman": CHART_COLORS.teal,
  };
  const regionData = useMemo(() => {
    const sums: Record<string, number> = {};
    liveFilteredSites.forEach((s) => {
      sums[s.region] = (sums[s.region] ?? 0) + s.generation;
    });
    return Object.entries(sums)
      .filter(([, v]) => v > 0)
      .map(([region, value]) => ({ region, value, fill: REGION_FILL[region] ?? CHART_COLORS.blue }))
      .sort((a, b) => b.value - a.value);
  }, [liveFilteredSites]);

  const getModalConfig = useCallback(
    (label: string): KpiModalConfig => {
      const base: KpiModalConfig = {
        label,
        value: 0,
        unit: undefined,
        rag: "info",
        description: `Historical trend for ${label}`,
        timeframeOptions: ["24H", "7D"],
        chartType: "line",
        chartData: {
          "24H": clipToNow(BASE_GEN_24).map((d) => ({ time: d.time, value: d.actual })),
          "7D": BASE_GEN_7D.map((d) => ({ time: d.day, value: d.actual })),
        },
        series: [{ key: "value", name: label, color: CHART_COLORS.blue }],
        xKey: "time",
        contextCards: [],
      };
      if (label === "Portfolio Capacity")
        return {
          ...base,
          value: `${(totalCap / 1000).toFixed(2)}`,
          unit: "GW",
          rag: "info",
          description: "Total installed DC capacity across all sites in the selected filter scope.",
          dataSource: {
            name: "GIS Asset Registry",
            type: "Static / Manual",
            frequency: "Updated on commissioning",
            protocol: "REST API",
            tag: "PORTFOLIO.INSTALLED_CAP_MW",
            lastSync: "Today, 00:00:00",
          },
        };
      if (label === "Today's Generation")
        return {
          ...base,
          value: Math.round((totalGen * 8) / 1000),
          unit: "GWh",
          rag: rag((totalGen / Math.max(totalCap, 1)) * 100, 70, 50),
          description: "Cumulative energy generated today (00:00 to now) across the filtered portfolio. Calculated from 15-min SCADA interval data.",
          thresholds: {
            warningValue: 70,
            criticalValue: 50,
            maxValue: 100,
            unit: "% CUF",
            rows: [
              { status: "success", label: "Normal", range: "≥ 70% capacity factor" },
              { status: "warning", label: "Warning", range: "50 – 70% capacity factor" },
              { status: "danger", label: "Critical", range: "< 50% capacity factor" },
            ],
            standard: "IEC 61724-1:2021 — Photovoltaic monitoring",
          },
          dataSource: {
            name: "Astrikos SCADA v4.2",
            type: "Energy Meter (Class 0.5S)",
            frequency: "15-min intervals",
            protocol: "IEC 61850 / Modbus TCP",
            tag: "PORTFOLIO.DAILY_ENERGY_GWH",
            lastSync: `Today, ${clock}`,
          },
        };
      if (label === "Availability")
        return {
          ...base,
          value: avgAvail.toFixed(1),
          unit: "%",
          rag: rag(avgAvail, 97, 94),
          description: "Percentage of scheduled generation hours across which all assets were available to produce power. Excludes planned outages.",
          chartData: { "24H": availData.slice(-12), "7D": availData },
          thresholds: {
            warningValue: 97,
            criticalValue: 94,
            maxValue: 100,
            unit: "%",
            rows: [
              { status: "success", label: "Normal", range: "≥ 97%  (industry best practice)" },
              { status: "warning", label: "Warning", range: "94 – 97%  (review recommended)" },
              { status: "danger", label: "Critical", range: "< 94%  (contract SLA breach risk)" },
            ],
            standard: "IEC 61724-1:2021 — System availability definition",
          },
          dataSource: {
            name: "Astrikos SCADA v4.2",
            type: "Availability Logger",
            frequency: "Real-time / 5 min",
            protocol: "OPC-UA",
            tag: "PORTFOLIO.AVAIL_PCT",
            lastSync: `Today, ${clock}`,
          },
        };
      if (label === "Revenue Today")
        return {
          ...base,
          value: `$${(totalRev / 1000).toFixed(0)}K`,
          unit: undefined,
          rag: "success",
          description:
            "Intraday revenue projection based on metered generation and applicable tariff/PPA rates. Reconciled against billing system at day-end.",
          thresholds: {
            warningValue: 90,
            criticalValue: 75,
            maxValue: 120,
            unit: "% of daily budget",
            rows: [
              { status: "success", label: "On Track", range: "≥ 90% of daily revenue budget" },
              { status: "warning", label: "Warning", range: "75 – 90% of daily budget" },
              { status: "danger", label: "Critical", range: "< 75% of daily budget" },
            ],
          },
          dataSource: {
            name: "Trading & Billing System",
            type: "PPA / Spot Price Feed",
            frequency: "Hourly settlement",
            protocol: "SFTP + REST API",
            tag: "PORTFOLIO.REV_TODAY_USD",
            lastSync: "Today, 14:00:00",
          },
        };
      if (label === "Carbon Avoided")
        return {
          ...base,
          value: `${Math.round(totalCarbon / 1000)}K`,
          unit: "tCO₂",
          rag: "info",
          description: "CO₂ displaced relative to the regional grid average carbon intensity (0.44 kgCO₂/kWh). Scope 2 market-based accounting.",
          dataSource: {
            name: "Generation Meter + Carbon Registry",
            type: "Derived — Gen × Grid Intensity",
            frequency: "Daily calculation",
            protocol: "Internal API",
            tag: "PORTFOLIO.CARBON_OFFSET_T",
            lastSync: "Today, 00:05:00",
          },
        };
      if (label === "Active Alerts")
        return {
          ...base,
          value: totalAlarms,
          rag: totalAlarms > 15 ? "danger" : totalAlarms > 5 ? "warning" : "success",
          description:
            "Total unacknowledged alarms across the filtered scope, including inverter faults, communication losses, and performance deviations.",
          thresholds: {
            warningValue: 6,
            criticalValue: 15,
            maxValue: 30,
            direction: "low-good",
            unit: " alarms",
            rows: [
              { status: "success", label: "Normal", range: "0 – 5 alarms" },
              { status: "warning", label: "Warning", range: "6 – 15 alarms" },
              { status: "danger", label: "Critical", range: "> 15 alarms" },
            ],
          },
          dataSource: {
            name: "Alarm Management System",
            type: "Real-time Event Stream",
            frequency: "Real-time (push)",
            protocol: "MQTT / AMQP",
            tag: "PORTFOLIO.ACTIVE_ALARMS",
            lastSync: "Live",
          },
        };
      return base;
    },
    [totalCap, totalGen, avgAvail, totalRev, totalCarbon, totalAlarms, availData],
  );

  const filteredFindings = useMemo(
    () => allFindings.filter((f) => filters.technology.length === 0 || filteredSites.some((s) => f.site.includes(s.name.split(" ")[0]))),
    [filteredSites, filters.technology, allFindings],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ─── Horizontal Filter Bar ───────────────────────────────────────── */}
      <FilterPanel filters={filters} onChange={setFilters} sites={allSites} />

      {/* ─── KPI Top Bar ─────────────────────────────────────────────────── */}
      <div className="go-kpi-bar">
        {[
          { label: "Portfolio Capacity", value: `${(totalCap / 1000).toFixed(2)} GW`, icon: <IcoZap width={13} height={13} />, cls: "success" },
          {
            label: "Today's Generation",
            value: `${Math.round((totalGen * 8) / 1000)} GWh`,
            icon: <IcoSun width={13} height={13} />,
            cls: rag((totalGen / Math.max(totalCap, 1)) * 100, 70, 50),
          },
          { label: "Availability", value: `${avgAvail.toFixed(1)}%`, icon: <IcoActivity width={13} height={13} />, cls: rag(avgAvail, 97, 94) },
          { label: "Revenue Today", value: `$${(totalRev / 1000).toFixed(0)}K`, icon: <IcoDollar width={13} height={13} />, cls: "success" },
          { label: "Carbon Avoided", value: `${Math.round(totalCarbon / 1000)}K tCO₂`, icon: <IcoLeaf width={13} height={13} />, cls: "success" },
          {
            label: "Active Alerts",
            value: totalAlarms,
            icon: <IcoBell width={13} height={13} />,
            cls: totalAlarms > 15 ? "danger" : totalAlarms > 5 ? "warning" : "success",
          },
        ].map((kpi) => (
          <button key={kpi.label} className={`go-kpi-chip go-kpi-${kpi.cls}`} onClick={() => setActiveModal(getModalConfig(kpi.label))}>
            <span className="go-kpi-icon">{kpi.icon}</span>
            <span className="go-kpi-val">{kpi.value}</span>
            <span className="go-kpi-lbl">{kpi.label}</span>
          </button>
        ))}
      </div>

      {/* ─── Live Events Ticker ──────────────────────────────────────────── */}
      <LiveEventsTicker events={liveEvents} />

      {/* ─── Main 2-column layout ─────────────────────────────────────────── */}
      <div className="go-main">
        {/* Center: Map + Site Cards */}
        <div className="go-center">
          {/* ── Enhanced GIS Map ── */}
          <div className="ops-map-card">
            {/* Header + layer toggles */}
            <div className="ops-map-header">
              <span className="chart-card-title">Global Renewable Asset Portfolio</span>
              <span className="chip info">
                {filteredSites.length} site{filteredSites.length !== 1 ? "s" : ""}
              </span>
              <span className="chip success">● LIVE</span>
              <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>Updated {lastSync}</span>

              {/* Base tile switcher */}
              <div className="map-base-switcher">
                {(Object.keys(BASE_TILES) as BaseTile[]).map((k) => (
                  <button key={k} className={`map-base-btn${baseTile === k ? " active" : ""}`} onClick={() => setBaseTile(k)}>
                    {BASE_TILES[k].label}
                  </button>
                ))}
              </div>

              <span className="map-layer-sep" />

              {/* Overlay layer toggles */}
              <div className="map-layer-controls">
                <span className="map-layer-group-label">Layers</span>
                {OPS_LAYER_KEYS.map((key) => (
                  <button key={key} className={`map-layer-btn${activeLayers[key] ? " active" : ""}`} onClick={() => toggleLayer(key)}>
                    {LAYER_LABELS[key]}
                  </button>
                ))}
                <span className="map-layer-sep" />
                {/* <span className="map-layer-group-label">Weather</span> */}
                {/* {WEATHER_LAYER_KEYS.map((key) => (
                  <button key={key} className={`map-layer-btn${activeLayers[key] ? " active" : ""}`} onClick={() => toggleLayer(key)}>
                    {LAYER_LABELS[key]}
                  </button>
                ))} */}
              </div>
            </div>

            {/* Map container */}
            <div style={{ position: "relative", width: "100%" }}>
              <MapContainer center={[24, 50]} zoom={5} style={{ height: 430, width: "100%" }} zoomControl>
                <MapResizer />
                {/* Dynamic base tile layer */}
                <TileLayer
                  key={baseTile}
                  attribution={BASE_TILES[baseTile].attribution}
                  url={BASE_TILES[baseTile].url}
                  maxZoom={BASE_TILES[baseTile].maxZoom}
                />

                {/* ── Power flow connections ── */}
                {activeLayers.flow &&
                  FLOW_CONNECTIONS.map((fc, i) => (
                    <Polyline
                      key={`flow-${i}`}
                      positions={[fc.from, fc.to]}
                      pathOptions={{ color: fc.color, weight: fc.weight, dashArray: "9 6", opacity: 0.7, className: "flow-line" }}
                    />
                  ))}

                {/* ── Energy pulse rings (behind markers) ── */}
                {activeLayers.pulse && filteredSites.map((site) => <PulseRingMarker key={`pulse-${site.id}`} site={site} />)}

                {/* ── AI risk zones ── */}
                {activeLayers.aiRisk &&
                  AI_RISK_ZONES.map((z, i) => (
                    <Circle
                      key={`airisk-${i}`}
                      center={[z.lat, z.lng]}
                      radius={z.r}
                      pathOptions={{
                        color: z.color,
                        fillColor: z.color,
                        fillOpacity: 0.07,
                        weight: 1.5,
                        dashArray: "7 4",
                        opacity: 0.75,
                        className: "ai-risk-zone",
                      }}
                    />
                  ))}

                {/* ── Weather layer overlays ── */}
                {(Object.entries(WEATHER_OV) as [string, { lat: number; lng: number; r: number; op: number }[]][]).map(([key, pts]) =>
                  activeLayers[key]
                    ? pts.map((p, i) => (
                        <Circle
                          key={`${key}-${i}`}
                          center={[p.lat, p.lng]}
                          radius={p.r}
                          pathOptions={{ color: "transparent", fillColor: WEATHER_COLORS[key], fillOpacity: p.op, weight: 0 }}
                        />
                      ))
                    : null,
                )}

                {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} />}

                {/* Site markers */}
                {filteredSites.map((site) => {
                  const sRag = rag(site.health, 85, 70);
                  const genPct = Math.round((site.generation / site.capacity) * 100);
                  const tCol = TECH_FILL[site.type] ?? "#f59e0b";
                  return (
                    <Marker
                      key={site.id}
                      position={[site.lat, site.lng]}
                      icon={createSiteIcon(site)}
                      eventHandlers={{ click: () => setFlyTo({ lat: site.lat, lng: site.lng }) }}
                    >
                      <Popup maxWidth={248} className="enhanced-popup">
                        <div className="ep-wrap">
                          <div
                            className="ep-header"
                            style={{ background: `linear-gradient(135deg,${tCol}28,${tCol}0d)`, borderBottom: `2px solid ${tCol}44` }}
                          >
                            <div>
                              <div className="ep-name">{site.name}</div>
                              <div className="ep-loc">
                                {site.state}, {site.country}
                              </div>
                            </div>
                            <span className={`chip ${sRag}`} style={{ fontSize: 9 }}>
                              {site.status}
                            </span>
                          </div>

                          <div className="ep-gen-section">
                            <div className="ep-gen-row">
                              <span>Generation</span>
                              <strong>
                                {site.generation}
                                <span style={{ fontWeight: 400, color: "var(--ds-text-faint)" }}> / {site.capacity} MW</span>
                              </strong>
                            </div>
                            <div className="ep-gen-bar">
                              <div className="ep-gen-fill" style={{ width: `${genPct}%`, background: `linear-gradient(90deg,${tCol},${tCol}99)` }} />
                              <span className="ep-gen-pct">{genPct}%</span>
                            </div>
                          </div>

                          <div className="ep-metrics">
                            {[
                              { label: "Availability", value: `${site.availability}%`, hi: rag(site.availability, 97, 94) === "success" },
                              { label: "Perf. Ratio", value: `${site.pr}%`, hi: false },
                              { label: "Health", value: `${site.health}/100`, hi: site.health >= 85 },
                              { label: "Alarms", value: String(site.alarms), hi: false, warn: site.alarms > 0 },
                              { label: "Revenue", value: `$${(site.revenueToday / 1000).toFixed(1)}K`, hi: false },
                              { label: "AI Score", value: `${site.aiScore}%`, hi: true },
                            ].map((m) => (
                              <div key={m.label} className="ep-metric">
                                <span className="ep-ml">{m.label}</span>
                                <span
                                  className="ep-mv"
                                  style={{ color: m.warn ? "var(--ds-warning)" : m.hi ? "var(--ds-success)" : "var(--ds-text)" }}
                                >
                                  {m.value}
                                </span>
                              </div>
                            ))}
                          </div>

                          <button
                            className="ep-open-btn"
                            style={{ background: `${tCol}1a`, borderColor: `${tCol}44`, color: tCol }}
                            onClick={() => nav(`/site/${site.id}`)}
                          >
                            Open Site →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Floating legend */}
              <div className="map-legend-overlay">
                <div className="mlo-title">Shapes</div>
                {(["Solar", "Wind", "Hydro", "BESS", "Hybrid"] as const).map((t) => (
                  <div key={t} className="mlo-row">
                    <span className="mlo-icon" dangerouslySetInnerHTML={{ __html: buildSVG(t, TECH_FILL[t], 14) }} />
                    <span>{t}</span>
                  </div>
                ))}
                <div className="mlo-sep" />
                <div className="mlo-title">Status</div>
                {[
                  ["var(--ds-success)", "Normal"],
                  ["var(--ds-warning)", "Warning"],
                  ["var(--ds-danger)", "Critical"],
                ].map(([c, l]) => (
                  <div key={l} className="mlo-row">
                    <span className="mlo-dot" style={{ background: c }} />
                    <span>{l}</span>
                  </div>
                ))}
                <div className="mlo-sep" />
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>Size = Capacity</div>
              </div>
            </div>
          </div>

          {/* Site Cards */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="section-label">Site Portfolio ({filteredSites.length})</span>
            </div>
            {filteredSites.length === 0 ? (
              <div className="chart-card" style={{ textAlign: "center", padding: 24, color: "var(--ds-text-faint)", fontSize: 12 }}>
                No sites match current filters
              </div>
            ) : (
              <div className="site-cards-scroll">
                {filteredSites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onOpen={() => {
                      setFlyTo({ lat: site.lat, lng: site.lng });
                      nav(`/site/${site.id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Copilot */}
        <AICopilotPanel findings={filteredFindings} sites={filteredSites} onSelect={setAiFinding} onRefresh={() => window.location.reload()} />
      </div>

      {/* ─── Portfolio Analytics ─────────────────────────────────────────── */}
      <div>
        <div className="section-label" style={{ marginBottom: 10 }}>
          Portfolio Analytics
        </div>
        <div className="chart-grid-2" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {/* Generation by Region */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Generation by Region (MW)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={regionData} layout="vertical">
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="region" {...axisProps} width={100} tick={{ fill: "var(--ds-text-faint)", fontSize: 9 }} />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {regionData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Capacity Mix */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Capacity Mix (MW)</span>
            </div>
            {TECH_DIST.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={TECH_DIST} cx="50%" cy="50%" outerRadius={60} innerRadius={35} dataKey="value">
                    {TECH_DIST.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps} formatter={(v: number) => [`${v} MW`, ""]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--ds-text-faint)" }}
              >
                No data
              </div>
            )}
          </div>

          {/* Generation Trend */}
          <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Generation Trend</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["24H", "7D"].map((t) => (
                  <button key={t} className={`timeframe-btn ${genTf === t ? "active" : ""}`} onClick={() => setGenTf(t as "24H" | "7D")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={genData}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="Actual" />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={CHART_COLORS.violet}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Availability Trend */}
          {/* <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Availability Trend (30D)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={availData}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis domain={[90, 100]} {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.teal}
                  fill={CHART_COLORS.teal}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                  name="Availability %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div> */}

          {/* Revenue Trend */}
          {/* <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Revenue Trend (7D, $K)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={revData}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.amber}
                  fill={CHART_COLORS.amber}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                  name="Revenue $K"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div> */}

          {/* Carbon Reduction */}
          {/* <div className="chart-card">
            <div className="chart-card-header">
              <span className="chart-card-title">Carbon Reduction (30D, tCO₂)</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={carbonData}>
                <XAxis dataKey="time" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...chartTooltipProps} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.teal}
                  fill={CHART_COLORS.teal}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  dot={false}
                  name="CO₂ t"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div> */}
        </div>
      </div>

      {/* ─── Fleet Performance Intelligence ──────────────────────────── */}
      <div>
        <div className="section-label" style={{ marginBottom: 10 }}>
          Fleet Performance Intelligence
        </div>
        <div className="fpi-table-wrap">
          <table className="fpi-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Generation</th>
                <th>Utilisation</th>
                <th>PR</th>
                <th>Availability</th>
                <th>vs Budget</th>
                <th>Revenue Today</th>
                <th>Health</th>
                <th>Alarms</th>
                {/* <th>AI Score</th> */}
              </tr>
            </thead>
            <tbody>
              {liveAllSites.map((s) => {
                const util = Math.round((s.generation / s.capacity) * 100);
                const budget = Math.round(s.capacity * (s.pr / 100) * 5.5);
                const actual = Math.round(s.generation * 7.5);
                const vsBudget = Math.round(((actual - budget) / budget) * 100);
                const hRag = rag(s.health, 85, 70);
                const aRag = rag(s.availability, 97, 94);
                return (
                  <tr key={s.id} className="fpi-row" onClick={() => nav(`/site/${s.id}`)}>
                    <td className="fpi-site">
                      <span className="fpi-site-dot" style={{ background: TECH_FILL[s.type] ?? "#f59e0b" }} />
                      {s.name}
                    </td>
                    <td>
                      <span className="chip info" style={{ fontSize: 8 }}>
                        {s.type}
                      </span>
                    </td>
                    <td className="fpi-num">{s.capacity} MW</td>
                    <td className="fpi-num fpi-accent">{s.generation} MW</td>
                    <td>
                      <div className="fpi-bar-cell">
                        <div className="fpi-bar-bg">
                          <div
                            className="fpi-bar-fill"
                            style={{
                              width: `${util}%`,
                              background: util >= 70 ? "var(--ds-success)" : util >= 50 ? "var(--ds-warning)" : "var(--ds-danger)",
                            }}
                          />
                        </div>
                        <span className="fpi-bar-pct">{util}%</span>
                      </div>
                    </td>
                    <td className={`fpi-num fpi-${rag(s.pr, 82, 76)}`}>{s.pr}%</td>
                    <td className={`fpi-num fpi-${aRag}`}>{s.availability}%</td>
                    <td className={`fpi-num fpi-${vsBudget >= 0 ? "success" : vsBudget >= -10 ? "warning" : "danger"}`}>
                      {vsBudget >= 0 ? "+" : ""}
                      {vsBudget}%
                    </td>
                    <td className="fpi-num">${(s.revenueToday / 1000).toFixed(1)}K</td>
                    <td>
                      <span className={`chip ${hRag}`} style={{ fontSize: 8 }}>
                        {s.health}/100
                      </span>
                    </td>
                    <td>
                      {s.alarms > 0 ? (
                        <span style={{ color: "var(--ds-warning)", fontSize: 11, fontWeight: 600 }}>{s.alarms} ⚠</span>
                      ) : (
                        <span style={{ color: "var(--ds-success)", fontSize: 11 }}>✓</span>
                      )}
                    </td>
                    {/* <td>
                      <div className="fpi-bar-cell">
                        <div className="fpi-bar-bg">
                          <div className="fpi-bar-fill" style={{ width: `${s.aiScore}%`, background: "var(--ds-accent)" }} />
                        </div>
                        <span className="fpi-bar-pct">{s.aiScore}%</span>
                      </div>
                    </td> */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <KpiDrilldownModal config={activeModal} onClose={() => setActiveModal(null)} />
      <AIFindingDrilldownModal finding={aiFinding} onClose={() => setAiFinding(null)} />
    </div>
  );
}
