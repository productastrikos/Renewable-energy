import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Outlet, useNavigate } from "react-router-dom";
import { SITES, SiteData, SITE_ASSET_HIERARCHY, AI_FINDINGS } from "../../data/mockData";
import { fetchSite } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { IcoArrowLeft, IcoZap, IcoActivity, IcoBell, IcoBrain } from "../../components/shared/Icons";
import { rag } from "../../utils/ragHelpers";

const TYPE_GRAD: Record<string, string> = {
  Solar:  "linear-gradient(90deg,#f59e0b,#d97706)",
  Wind:   "linear-gradient(90deg,#38bdf8,#0284c7)",
  Hydro:  "linear-gradient(90deg,#34d399,#059669)",
  BESS:   "linear-gradient(90deg,#818cf8,#4f46e5)",
  Hybrid: "linear-gradient(90deg,#a78bfa,#7c3aed)",
};

export interface SiteWorkspaceContext { site: SiteData; }

// ─── Alarm item type ──────────────────────────────────────────────────────────
interface AlarmItem {
  id: string;
  severity: "danger" | "warning";
  asset: string;
  msg: string;
}

const SEV_COLOR = { danger: "#ef4444", warning: "#f59e0b" };
const SEV_LABEL = { danger: "CRITICAL", warning: "WARNING" };

const PRIORITY_COLOR: Record<string, string> = {
  danger:  "#ef4444",
  warning: "#f59e0b",
  success: "#22c55e",
  info:    "#38bdf8",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SiteWorkspace() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [openPanel, setOpenPanel] = useState<"bell" | "ai" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const staticSite = SITES.find((s) => s.id === id);
  const { data: apiSite, loading } = useApi(() => fetchSite(id!), [id]);
  const site: SiteData | undefined = apiSite ?? staticSite;

  // Close panel on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    if (openPanel) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openPanel]);

  // Derive alarm items from hierarchy
  const alarmItems = useMemo((): AlarmItem[] => {
    if (!site) return [];
    const h = SITE_ASSET_HIERARCHY[site.id];
    if (!h) return [];
    const items: AlarmItem[] = [];
    h.blocks.forEach(b => b.inverters.forEach(inv => {
      if (inv.status !== "success") {
        items.push({
          id: inv.id,
          severity: inv.status as "danger" | "warning",
          asset: inv.name,
          msg: inv.status === "danger"
            ? `Over-temperature ${inv.temp}°C — output ${inv.output}%`
            : `Degraded output ${inv.output}% · ${inv.temp}°C`,
        });
      }
    }));
    h.transformers.forEach(tx => {
      if (tx.status !== "success") {
        items.push({
          id: tx.id,
          severity: tx.status as "danger" | "warning",
          asset: tx.name.replace("Transformer ", "TX-"),
          msg: `Cooling degraded — ${tx.temp}°C, ${tx.load}% load`,
        });
      }
    });
    return items;
  }, [site]);

  // Derive AI findings for this site
  const siteFindings = useMemo(() => {
    if (!site) return [];
    const word = site.name.split(" ")[0];
    return AI_FINDINGS.filter(f => f.site.includes(word)).slice(0, 5);
  }, [site]);

  if (loading && !site) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--ds-text-faint)" }}>
      <p>Loading site…</p>
    </div>
  );

  if (!site) return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--ds-text-faint)" }}>
      <p>Site not found: <strong>{id}</strong></p>
      <button className="btn-ghost" onClick={() => nav("/")}>← Back to Portfolio</button>
    </div>
  );

  const healthRag = rag(site.health, 85, 70);
  const criticalCount = alarmItems.filter(a => a.severity === "danger").length;

  function toggle(panel: "bell" | "ai") {
    setOpenPanel(p => p === panel ? null : panel);
  }

  return (
    <div className="site-workspace">
      {/* ── Site Header ─────────────────────────────────────────────────────── */}
      <div className="site-workspace-header" ref={panelRef} style={{ position: "relative" }}>
        <button className="site-back-btn" onClick={() => nav("/")}>
          <IcoArrowLeft width={14} height={14} /> Portfolio
        </button>
        <div className="swh-divider" />
        <div className="swh-accent" style={{ background: TYPE_GRAD[site.type] ?? TYPE_GRAD.Solar }} />
        <div className="swh-info">
          <span className="swh-name">{site.name}</span>
          <span className="swh-sub">{site.state}, {site.country}</span>
        </div>
        <div className="swh-badges">
          <span className="chip info">{site.type}</span>
          <span className={`chip ${healthRag}`}>{site.status}</span>
        </div>
        <div className="swh-stats">
          <div className="swh-stat"><IcoZap width={12} height={12} /><span>{site.capacity} MW</span></div>
          <div className="swh-stat"><IcoActivity width={12} height={12} /><span>{site.availability}% avail</span></div>
        </div>

        {/* ── Drilldown icon buttons ── */}
        <div className="swh-drilldown-btns">
          {/* Bell — Alarms */}
          <button
            className={`swh-icon-pill bell${openPanel === "bell" ? " active" : ""}${site.alarms > 0 ? " has-alert" : ""}`}
            onClick={() => toggle("bell")}
            title="Active Alarms"
          >
            <IcoBell width={16} height={16} />
            {site.alarms > 0 && (
              <span className="swh-pill-badge bell-badge">{site.alarms}</span>
            )}
          </button>

          {/* AI — Insights */}
          <button
            className={`swh-icon-pill ai${openPanel === "ai" ? " active" : ""}`}
            onClick={() => toggle("ai")}
            title="AI Insights"
          >
            <IcoBrain width={16} height={16} />
            {siteFindings.length > 0 && (
              <span className="swh-pill-badge ai-badge">{siteFindings.length}</span>
            )}
          </button>
        </div>

        {/* ── Bell drilldown panel ── */}
        {openPanel === "bell" && (
          <div className="swh-drilldown-panel bell-panel">
            <div className="swh-dd-hdr">
              <span className="swh-dd-title">
                <IcoBell width={12} height={12} /> Active Alarms
              </span>
              {criticalCount > 0 && (
                <span className="swh-dd-critical">{criticalCount} Critical</span>
              )}
              <button
                className="swh-dd-action"
                onClick={() => { nav(`/site/${id}/alarms`); setOpenPanel(null); }}
              >
                View All →
              </button>
            </div>
            <div className="swh-dd-body">
              {alarmItems.length === 0 ? (
                <div className="swh-dd-empty">
                  <span style={{ fontSize: 18 }}>✓</span>
                  <span>No active alarms</span>
                </div>
              ) : alarmItems.map(a => (
                <div key={a.id} className="swh-alarm-row">
                  <span className="swh-alarm-dot" style={{ background: SEV_COLOR[a.severity] }} />
                  <div className="swh-alarm-info">
                    <div className="swh-alarm-header">
                      <span className="swh-alarm-asset">{a.asset}</span>
                      <span className="swh-alarm-sev" style={{ color: SEV_COLOR[a.severity] }}>
                        {SEV_LABEL[a.severity]}
                      </span>
                    </div>
                    <div className="swh-alarm-msg">{a.msg}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="swh-dd-footer">
              <button
                className="swh-dd-footer-btn"
                onClick={() => { nav(`/site/${id}/events`); setOpenPanel(null); }}
              >
                Event Log
              </button>
              <button
                className="swh-dd-footer-btn"
                onClick={() => { nav(`/site/${id}/soe`); setOpenPanel(null); }}
              >
                SOE (1ms)
              </button>
            </div>
          </div>
        )}

        {/* ── AI drilldown panel ── */}
        {openPanel === "ai" && (
          <div className="swh-drilldown-panel ai-panel-dd">
            <div className="swh-dd-hdr">
              <span className="swh-dd-title">
                <IcoBrain width={12} height={12} /> AI Insights
              </span>
              <span className="swh-dd-sub">{site.name}</span>
              <button
                className="swh-dd-action"
                onClick={() => { nav(`/site/${id}/ai-insights`); setOpenPanel(null); }}
              >
                Full Analysis →
              </button>
            </div>
            <div className="swh-dd-body">
              {siteFindings.length === 0 ? (
                <div className="swh-dd-empty">
                  <span style={{ fontSize: 18 }}>✦</span>
                  <span>No AI findings for this site</span>
                </div>
              ) : siteFindings.map((f, i) => (
                <div key={i} className="swh-ai-row" onClick={() => { nav(`/site/${id}/ai-insights`); setOpenPanel(null); }}>
                  <div
                    className="swh-ai-priority"
                    style={{
                      background: (PRIORITY_COLOR[f.priority] ?? "#888") + "22",
                      borderColor: (PRIORITY_COLOR[f.priority] ?? "#888") + "55",
                      color: PRIORITY_COLOR[f.priority] ?? "#888",
                    }}
                  >
                    {f.priority.toUpperCase()}
                  </div>
                  <div className="swh-ai-content">
                    <div className="swh-ai-metric">{f.metric}</div>
                    <div className="swh-ai-cause">{f.rootCause}</div>
                    <div className="swh-ai-action">{f.action}</div>
                  </div>
                  <div className="swh-ai-loss" style={{ color: f.loss.startsWith("+") ? "#22c55e" : "#ef4444" }}>
                    {f.loss}
                  </div>
                </div>
              ))}
            </div>
            <div className="swh-dd-footer">
              <button
                className="swh-dd-footer-btn"
                onClick={() => { nav(`/site/${id}/ai-alarms`); setOpenPanel(null); }}
              >
                AI Alarm Advisor
              </button>
              <button
                className="swh-dd-footer-btn"
                onClick={() => { nav(`/site/${id}/ai-insights`); setOpenPanel(null); }}
              >
                Situational Intel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <div className="site-tab-content">
        <Outlet context={{ site } satisfies SiteWorkspaceContext} />
      </div>
    </div>
  );
}
