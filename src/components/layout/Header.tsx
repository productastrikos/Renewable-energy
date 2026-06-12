import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { IcoMenu, IcoSearch, IcoBell, IcoSun, IcoMoon, IcoZap, IcoSparkle, IcoBrain } from "../shared/Icons";
import { SITES, AI_FINDINGS } from "../../data/mockData";
import { useLiveClock, useLiveValue } from "../../hooks/useLiveData";

// ─── Static search index ──────────────────────────────────────────────────────
const NAV_PAGES = [
  { label: "Global Operations", path: "/", desc: "Portfolio map & fleet KPIs", icon: "🌐" },
  { label: "Trending & Charts", path: "/trending", desc: "Multi-tag historian & live charts", icon: "📈" },
  { label: "Executive & ESG", path: "/executive", desc: "ESG reports & compliance", icon: "📊" },
];

const KPI_ITEMS = [
  { label: "Total Generation", desc: "Live MW across all sites", icon: "⚡" },
  { label: "Availability", desc: "Fleet availability %", icon: "✓" },
  { label: "Performance Ratio", desc: "Weighted PR across portfolio", icon: "📐" },
  { label: "Carbon Offset", desc: "tCO₂ avoided today", icon: "🌱" },
  { label: "Revenue Today", desc: "Intraday revenue across portfolio", icon: "$" },
];

// ─── Notification helpers ─────────────────────────────────────────────────────
const SITE_TYPE_ICON: Record<string, string> = {
  Solar: "☀",
  Wind: "〰",
  BESS: "⚡",
  Hybrid: "🔋",
  Hydro: "💧",
};
const SEV_COLOR = { danger: "#ef4444", warning: "#f59e0b", info: "#38bdf8", success: "#22c55e" };

interface Props {
  onToggleSidebar: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export function Header({ onToggleSidebar, theme, onToggleTheme }: Props) {
  const loc = useLocation();
  const nav = useNavigate();
  const { logout } = useAuth();
  const isSite = loc.pathname.startsWith("/site/");

  // Panel state
  const [panel, setPanel] = useState<"search" | "bell" | "ai" | "profile" | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [aiChatInput, setAiChat] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click or Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanel(null);
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    }
    function handleClick(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) setPanel(null);
    }
    document.addEventListener("keydown", handleKey);
    if (panel && panel !== "search") document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [panel]);

  // Focus search input when panel opens
  useEffect(() => {
    if (panel === "search") setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [panel]);

  function openSearch() {
    setSearchQ("");
    setPanel("search");
  }
  function toggle(p: typeof panel) {
    setPanel((prev) => (prev === p ? null : p));
  }

  // ── Search results ──────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    if (!q) return null;
    const sites = SITES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q),
    ).slice(0, 5);
    const pages = NAV_PAGES.filter((p) => p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    const kpis = KPI_ITEMS.filter((k) => k.label.toLowerCase().includes(q) || k.desc.toLowerCase().includes(q));
    const findings = AI_FINDINGS.filter((f) => f.metric.toLowerCase().includes(q) || f.site.toLowerCase().includes(q)).slice(0, 3);
    return { sites, pages, kpis, findings };
  }, [searchQ]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifications = useMemo(
    () =>
      SITES.filter((s) => s.alarms > 0).map((s) => ({
        id: `notif-${s.id}`,
        siteId: s.id,
        siteName: s.name,
        icon: SITE_TYPE_ICON[s.type] ?? "⚡",
        severity: (s.alarms > 3 ? "danger" : "warning") as "danger" | "warning",
        msg: `${s.alarms} active alarm${s.alarms !== 1 ? "s" : ""} — ${s.status}`,
        sub: `${s.state}, ${s.country}`,
      })),
    [],
  );

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;
  const totalAlarms = SITES.reduce((a, s) => a + s.alarms, 0);
  const totalWarnings = SITES.filter((s) => s.status === "Warning").length;
  const sitesOnline = SITES.filter((s) => s.status !== "Critical").length;

  // Live clock
  const clock = useLiveClock();
  // Live portfolio generation — fluctuates ±2% every 10s
  const baseGen = SITES.reduce((a, s) => a + s.generation, 0);
  const liveGen = useLiveValue(baseGen, 0.02, 10000, 0);

  // ── AI findings for panel ──────────────────────────────────────────────────
  const topFindings = AI_FINDINGS.slice(0, 5);

  return (
    <>
      {/* ─────────────────────── Header bar ─────────────────────────────────── */}
      <header className="app-header" ref={panel !== "search" ? overlayRef : undefined}>
        <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <IcoMenu />
        </button>

        {isSite ? (
          <div className="header-breadcrumb">
            <span className="crumb" onClick={() => nav("/")} style={{ cursor: "pointer" }}>
              Dashboard
            </span>
            <span className="sep">›</span>
            <span className="crumb active">Site Workspace</span>
          </div>
        ) : (
          <span className="header-title">Renewable Energy</span>
        )}

        <div className="header-spacer" />

        {/* Search bar */}
        <div className="header-search" onClick={openSearch} style={{ cursor: "text" }}>
          <span className="header-search-icon">
            <IcoSearch />
          </span>
          <span style={{ fontSize: 13, color: "var(--ds-text-faint)", userSelect: "none" }}>Search sites, assets, KPIs…</span>
          <span className="header-search-kbd">⌘K</span>
        </div>

        {/* Live status badges */}
        <div className="hdr-status-bar">
          <span className="hdr-live-dot" title="Live data feed" />
          <span className="hdr-status-badge hdr-sb-gen" title="Total portfolio generation">
            <IcoZap width={10} height={10} /> {liveGen} MW
          </span>
          {totalAlarms > 0 && (
            <button className="hdr-status-badge hdr-sb-danger" onClick={() => toggle("bell")} title={`${totalAlarms} active alarms`}>
              ⚠ {totalAlarms} Alarm{totalAlarms !== 1 ? "s" : ""}
            </button>
          )}
          {totalWarnings > 0 && (
            <span className="hdr-status-badge hdr-sb-warning" title={`${totalWarnings} sites in warning`}>
              ⚠ {totalWarnings} Warning{totalWarnings !== 1 ? "s" : ""}
            </span>
          )}
          <span className="hdr-status-badge hdr-sb-success" title={`${sitesOnline} of ${SITES.length} sites generating`}>
            ✓ {sitesOnline} Online
          </span>
          <span className="hdr-clock">{clock}</span>
        </div>

        {/* AI button */}
        <button className={`hdr-pill-btn ai-pill${panel === "ai" ? " active" : ""}`} onClick={() => toggle("ai")} aria-label="AI Insights">
          <IcoBrain width={15} height={15} />
        </button>

        {/* Theme toggle */}
        <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <IcoSun /> : <IcoMoon />}
        </button>

        {/* Bell */}
        <button
          className={`icon-btn hdr-bell${panel === "bell" ? " active" : ""}${unreadCount > 0 ? " has-notif" : ""}`}
          onClick={() => toggle("bell")}
          aria-label="Notifications"
          style={{ position: "relative" }}
        >
          <IcoBell />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>

        {/* Profile */}
        <button className={`profile-btn${panel === "profile" ? " active" : ""}`} onClick={() => toggle("profile")} aria-label="Profile">
          OP
        </button>

        {/* ── Bell panel ── */}
        {panel === "bell" && (
          <div className="hdr-dropdown bell-dd">
            <div className="hdr-dd-hdr">
              <span className="hdr-dd-title">
                <IcoBell width={12} height={12} /> Notifications
              </span>
              {totalAlarms > 0 && <span className="hdr-dd-badge danger">{totalAlarms} alarms</span>}
              <button className="hdr-dd-link" onClick={() => setReadIds(new Set(notifications.map((n) => n.id)))}>
                Mark all read
              </button>
            </div>
            <div className="hdr-dd-body">
              {notifications.length === 0 ? (
                <div className="hdr-dd-empty">✓ No active alarms across portfolio</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`hdr-notif-row${readIds.has(n.id) ? " read" : ""}`}
                    onClick={() => {
                      nav(`/site/${n.siteId}/alarms`);
                      setPanel(null);
                      setReadIds((s) => new Set([...s, n.id]));
                    }}
                  >
                    <span className="hdr-notif-icon" style={{ background: SEV_COLOR[n.severity] + "22" }}>
                      {n.icon}
                    </span>
                    <div className="hdr-notif-content">
                      <div className="hdr-notif-site">{n.siteName}</div>
                      <div className="hdr-notif-msg" style={{ color: SEV_COLOR[n.severity] }}>
                        {n.msg}
                      </div>
                      <div className="hdr-notif-sub">{n.sub}</div>
                    </div>
                    {!readIds.has(n.id) && <span className="hdr-notif-dot" />}
                  </div>
                ))
              )}
            </div>
            <div className="hdr-dd-footer">
              <button
                className="hdr-dd-footer-btn"
                onClick={() => {
                  nav("/");
                  setPanel(null);
                }}
              >
                Global Operations
              </button>
              <button
                className="hdr-dd-footer-btn"
                onClick={() => {
                  nav("/trending");
                  setPanel(null);
                }}
              >
                Trending & Charts
              </button>
            </div>
          </div>
        )}

        {/* ── AI panel ── */}
        {panel === "ai" && (
          <div className="hdr-dropdown ai-dd">
            <div className="hdr-dd-hdr">
              <span className="hdr-dd-title">
                <IcoSparkle width={12} height={12} /> AI Portfolio Insights
              </span>
              <span className="hdr-dd-badge ai">{topFindings.length} findings</span>
            </div>
            <div className="hdr-dd-body">
              {topFindings.map((f, i) => (
                <div
                  key={i}
                  className="hdr-ai-row"
                  onClick={() => {
                    setPanel(null);
                  }}
                >
                  <div
                    className="hdr-ai-pri"
                    style={{
                      background: (SEV_COLOR[f.priority as keyof typeof SEV_COLOR] ?? "#888") + "22",
                      color: SEV_COLOR[f.priority as keyof typeof SEV_COLOR] ?? "#888",
                      borderColor: (SEV_COLOR[f.priority as keyof typeof SEV_COLOR] ?? "#888") + "55",
                    }}
                  >
                    {f.priority.toUpperCase()}
                  </div>
                  <div className="hdr-ai-content">
                    <div className="hdr-ai-site">{f.site}</div>
                    <div className="hdr-ai-metric">{f.metric}</div>
                    <div className="hdr-ai-cause">{f.rootCause}</div>
                  </div>
                  <div className="hdr-ai-loss" style={{ color: f.loss.startsWith("+") ? "#22c55e" : "#ef4444" }}>
                    {f.loss}
                  </div>
                </div>
              ))}
            </div>
            {/* <div className="hdr-ai-chat">
              <input
                className="hdr-ai-input"
                placeholder="Ask AI about your portfolio…"
                value={aiChatInput}
                onChange={(e) => setAiChat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setAiChat("");
                }}
              />
              <button className="hdr-ai-send" onClick={() => setAiChat("")}>
                →
              </button>
            </div> */}
          </div>
        )}

        {/* ── Profile panel ── */}
        {panel === "profile" && (
          <div className="hdr-dropdown profile-dd">
            <div className="hdr-profile-info">
              <div className="hdr-profile-avatar">OP</div>
              <div>
                <div className="hdr-profile-name">Operations</div>
                <div className="hdr-profile-role">Portfolio Manager</div>
                <div className="hdr-profile-email">product@astrikos.ai</div>
              </div>
            </div>
            <div className="hdr-profile-divider" />
            {/* <button
              className="hdr-profile-item"
              onClick={() => {
                onToggleTheme();
              }}
            >
              {theme === "dark" ? "🌤" : "🌑"} Switch to {theme === "dark" ? "Light" : "Dark"} Mode
            </button>
            <button
              className="hdr-profile-item"
              onClick={() => {
                nav("/trending");
                setPanel(null);
              }}
            >
              📈 Trending & Charts
            </button>
            <button
              className="hdr-profile-item"
              onClick={() => {
                nav("/executive");
                setPanel(null);
              }}
            >
              📊 Executive Report
            </button> */}
            <div className="hdr-profile-divider" />
            <button
              className="hdr-profile-item hdr-profile-logout"
              onClick={() => { logout(); nav("/login", { replace: true }); }}
            >
              ⎋ Sign Out
            </button>
          </div>
        )}
      </header>

      {/* ─────────────────────── Search overlay ─────────────────────────────── */}
      {panel === "search" && (
        <div
          className="hdr-search-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPanel(null);
          }}
        >
          <div className="hdr-search-modal">
            <div className="hdr-search-bar">
              <IcoSearch width={16} height={16} />
              <input
                ref={searchInputRef}
                className="hdr-search-input"
                placeholder="Search sites, assets, KPIs, pages…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              {searchQ && (
                <button className="hdr-search-clear" onClick={() => setSearchQ("")}>
                  ✕
                </button>
              )}
              <kbd className="hdr-search-esc" onClick={() => setPanel(null)}>
                ESC
              </kbd>
            </div>

            <div className="hdr-search-results">
              {!searchQ ? (
                /* Default state */
                <>
                  <div className="hdr-search-section-label">QUICK NAV</div>
                  {NAV_PAGES.map((p) => (
                    <div
                      key={p.path}
                      className="hdr-search-item"
                      onClick={() => {
                        nav(p.path);
                        setPanel(null);
                      }}
                    >
                      <span className="hdr-search-item-icon">{p.icon}</span>
                      <div>
                        <div className="hdr-search-item-label">{p.label}</div>
                        <div className="hdr-search-item-desc">{p.desc}</div>
                      </div>
                    </div>
                  ))}
                  <div className="hdr-search-section-label" style={{ marginTop: 8 }}>
                    SITES
                  </div>
                  {SITES.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      className="hdr-search-item"
                      onClick={() => {
                        nav(`/site/${s.id}`);
                        setPanel(null);
                      }}
                    >
                      <span className="hdr-search-item-icon">{SITE_TYPE_ICON[s.type]}</span>
                      <div>
                        <div className="hdr-search-item-label">{s.name}</div>
                        <div className="hdr-search-item-desc">
                          {s.type} · {s.state}, {s.country} · {s.capacity} MW
                        </div>
                      </div>
                      {s.alarms > 0 && <span className="hdr-search-alarm-badge">{s.alarms}</span>}
                    </div>
                  ))}
                </>
              ) : (
                searchResults && (
                  <>
                    {searchResults.sites.length > 0 && (
                      <>
                        <div className="hdr-search-section-label">SITES</div>
                        {searchResults.sites.map((s) => (
                          <div
                            key={s.id}
                            className="hdr-search-item"
                            onClick={() => {
                              nav(`/site/${s.id}`);
                              setPanel(null);
                            }}
                          >
                            <span className="hdr-search-item-icon">{SITE_TYPE_ICON[s.type]}</span>
                            <div>
                              <div className="hdr-search-item-label">{s.name}</div>
                              <div className="hdr-search-item-desc">
                                {s.type} · {s.state}, {s.country} · {s.capacity} MW
                              </div>
                            </div>
                            {s.alarms > 0 && <span className="hdr-search-alarm-badge">{s.alarms}</span>}
                          </div>
                        ))}
                      </>
                    )}
                    {searchResults.pages.length > 0 && (
                      <>
                        <div className="hdr-search-section-label">PAGES</div>
                        {searchResults.pages.map((p) => (
                          <div
                            key={p.path}
                            className="hdr-search-item"
                            onClick={() => {
                              nav(p.path);
                              setPanel(null);
                            }}
                          >
                            <span className="hdr-search-item-icon">{p.icon}</span>
                            <div>
                              <div className="hdr-search-item-label">{p.label}</div>
                              <div className="hdr-search-item-desc">{p.desc}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {searchResults.findings.length > 0 && (
                      <>
                        <div className="hdr-search-section-label">AI FINDINGS</div>
                        {searchResults.findings.map((f, i) => (
                          <div key={i} className="hdr-search-item" onClick={() => setPanel(null)}>
                            <span className="hdr-search-item-icon">✦</span>
                            <div>
                              <div className="hdr-search-item-label">
                                {f.metric} — {f.site}
                              </div>
                              <div className="hdr-search-item-desc">
                                {f.rootCause} · {f.loss}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {searchResults.kpis.length > 0 && (
                      <>
                        <div className="hdr-search-section-label">KPIs</div>
                        {searchResults.kpis.map((k) => (
                          <div key={k.label} className="hdr-search-item" onClick={() => setPanel(null)}>
                            <span className="hdr-search-item-icon">{k.icon}</span>
                            <div>
                              <div className="hdr-search-item-label">{k.label}</div>
                              <div className="hdr-search-item-desc">{k.desc}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {!searchResults.sites.length && !searchResults.pages.length && !searchResults.findings.length && !searchResults.kpis.length && (
                      <div className="hdr-search-empty">
                        <div style={{ fontSize: 24, opacity: 0.3 }}>⌕</div>
                        <div>
                          No results for "<strong>{searchQ}</strong>"
                        </div>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
