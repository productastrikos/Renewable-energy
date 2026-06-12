import { useNavigate, useLocation } from "react-router-dom";
import {
  IcoGlobe,
  IcoChart,
  IcoZap,
  IcoArrowLeft,
  IcoActivity,
  IcoWrench,
  IcoCalendar,
  IcoLayers,
  IcoTrendUp,
  IcoBell,
  IcoAlertTriangle,
  IcoSparkle,
  IcoSun,
  IcoWind,
  IcoDroplets,
  IcoBattery,
  IcoCpu,
  IcoLeaf,
  IcoBrain,
  IcoFileText,
} from "../shared/Icons";
import { SITES } from "../../data/mockData";
import { fetchSite } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";

const W = 15;

const PORTFOLIO_NAV = [
  { section: "PORTFOLIO", items: [{ label: "Global Operations", path: "/", icon: <IcoGlobe /> }] },
  {
    section: "DATA & ANALYTICS",
    items: [
      { label: "Trending & Charts", path: "/trending", icon: <IcoTrendUp /> },
      { label: "Executive & ESG", path: "/executive", icon: <IcoChart /> },
      { label: "Grid & Power Quality", path: "/grid", icon: <IcoZap /> },
      // { label: "SOP Documents", path: "/documents", icon: <IcoFileText /> },
    ],
  },
];

// Common workspace items shared by all site types
const WORKSPACE_BASE = [
  { label: "Overview", path: "", icon: <IcoActivity width={W} height={W} /> },
  { label: "Assets", path: "/assets", icon: <IcoLayers width={W} height={W} /> },
  { label: "Operations", path: "/operations", icon: <IcoZap width={W} height={W} /> },
  { label: "Maintenance", path: "/maintenance", icon: <IcoWrench width={W} height={W} /> },
];

function getSiteNav(siteType: string) {
  switch (siteType) {
    case "Wind":
      return [
        {
          section: "SITE WORKSPACE",
          items: [...WORKSPACE_BASE, { label: "Wind Analytics", path: "/energy", icon: <IcoWind width={W} height={W} /> }],
        },
        {
          section: "ALARMS & EVENTS",
          items: [
            { label: "Alarm Management", path: "/alarms", icon: <IcoBell width={W} height={W} /> },
            { label: "Turbine Fault Log", path: "/turbine-faults", icon: <IcoAlertTriangle width={W} height={W} /> },
            // { label: "Event Log",          path: "/events" },   // covered by Alarm Management
            // { label: "Sequence of Events", path: "/soe"    },   // specialized — enable if needed
          ],
        },
        {
          section: "AI & INTELLIGENCE",
          items: [
            { label: "AI Situational Intel", path: "/ai-insights", icon: <IcoSparkle width={W} height={W} /> },
            { label: "AI Alarm Advisor", path: "/ai-alarms", icon: <IcoAlertTriangle width={W} height={W} /> },
            // { label: "Wind Resource Forecast", path: "/wind-forecast", icon: <IcoWind width={W} height={W} /> },
          ],
        },
      ];

    case "Hydro":
      return [
        {
          section: "SITE WORKSPACE",
          items: [
            ...WORKSPACE_BASE,
            { label: "Water Management", path: "/water-management", icon: <IcoDroplets width={W} height={W} /> },
            { label: "Hydro Analytics", path: "/energy", icon: <IcoActivity width={W} height={W} /> },
          ],
        },
        {
          section: "ALARMS & EVENTS",
          items: [
            { label: "Alarm Management", path: "/alarms", icon: <IcoBell width={W} height={W} /> },
            { label: "Water Level Alerts", path: "/water-alerts", icon: <IcoDroplets width={W} height={W} /> },
            // { label: "Event Log",          path: "/events" },   // covered by Alarm Management
            // { label: "Sequence of Events", path: "/soe"    },   // specialized — enable if needed
          ],
        },
        {
          section: "AI & INTELLIGENCE",
          items: [
            { label: "AI Situational Intel", path: "/ai-insights", icon: <IcoSparkle width={W} height={W} /> },
            { label: "AI Alarm Advisor", path: "/ai-alarms", icon: <IcoAlertTriangle width={W} height={W} /> },
            // { label: "Flow & Inflow Forecast", path: "/flow-forecast", icon: <IcoDroplets width={W} height={W} /> },
          ],
        },
      ];

    case "BESS":
      return [
        {
          section: "SITE WORKSPACE",
          items: [...WORKSPACE_BASE, { label: "Storage Analytics", path: "/energy", icon: <IcoBattery width={W} height={W} /> }],
        },
        {
          section: "ALARMS & EVENTS",
          items: [
            { label: "Alarm Management", path: "/alarms", icon: <IcoBell width={W} height={W} /> },
            { label: "BMS Fault Log", path: "/bms-faults", icon: <IcoAlertTriangle width={W} height={W} /> },
            // { label: "Event Log",        path: "/events" }, // covered by Alarm Management + BMS Fault Log
          ],
        },
        {
          section: "AI & INTELLIGENCE",
          items: [
            { label: "AI Situational Intel", path: "/ai-insights", icon: <IcoSparkle width={W} height={W} /> },
            { label: "Dispatch Optimizer", path: "/dispatch-optimizer", icon: <IcoCpu width={W} height={W} /> },
            // { label: "Degradation Forecast", path: "/degradation", icon: <IcoBattery width={W} height={W} /> },
          ],
        },
      ];

    case "Hybrid":
      return [
        {
          section: "SITE WORKSPACE",
          items: [...WORKSPACE_BASE, { label: "Energy Analytics", path: "/energy", icon: <IcoCalendar width={W} height={W} /> }],
        },
        {
          section: "ALARMS & EVENTS",
          items: [
            { label: "Alarm Management", path: "/alarms", icon: <IcoBell width={W} height={W} /> },
            // { label: "Event Log",          path: "/events" }, // covered by Alarm Management
            // { label: "Sequence of Events", path: "/soe"    }, // specialized — enable if needed
          ],
        },
        {
          section: "AI & INTELLIGENCE",
          items: [
            { label: "AI Situational Intel", path: "/ai-insights", icon: <IcoSparkle width={W} height={W} /> },
            { label: "AI Alarm Advisor", path: "/ai-alarms", icon: <IcoAlertTriangle width={W} height={W} /> },
            // { label: "Multi-Source Optimizer", path: "/multi-source", icon: <IcoCpu width={W} height={W} /> },
          ],
        },
      ];

    // Solar + default
    default:
      return [
        {
          section: "SITE WORKSPACE",
          items: [...WORKSPACE_BASE, { label: "Energy Analytics", path: "/energy", icon: <IcoSun width={W} height={W} /> }],
        },
        {
          section: "ALARMS & EVENTS",
          items: [
            { label: "Alarm Management", path: "/alarms", icon: <IcoBell width={W} height={W} /> },
            // { label: "Event Log",          path: "/events" }, // covered by Alarm Management
            // { label: "Sequence of Events", path: "/soe"    }, // specialized — enable if needed
          ],
        },
        {
          section: "AI & INTELLIGENCE",
          items: [
            { label: "AI Situational Intel", path: "/ai-insights", icon: <IcoSparkle width={W} height={W} /> },
            { label: "AI Alarm Advisor", path: "/ai-alarms", icon: <IcoAlertTriangle width={W} height={W} /> },
            { label: "Soiling Detection", path: "/soiling", icon: <IcoLeaf width={W} height={W} /> },
          ],
        },
      ];
  }
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: Props) {
  const nav = useNavigate();
  const loc = useLocation();

  // Detect if we're on a site page
  const siteMatch = loc.pathname.match(/^\/site\/([^/]+)/);
  const siteId = siteMatch ? siteMatch[1] : null;
  const staticSite = siteId ? SITES.find((s) => s.id === siteId) : null;
  const { data: apiSite } = useApi(() => (siteId ? fetchSite(siteId) : Promise.resolve(null)), [siteId]);
  const site = apiSite ?? staticSite;

  const isExactPath = (path: string) => {
    if (path === "/") return loc.pathname === "/";
    return loc.pathname === path;
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ background: "none", boxShadow: "none" }}>
          <img src="/Astrikos_solo_logo.png" alt="Astrikos" width={28} height={28} style={{ objectFit: "contain", display: "block" }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <div className="sidebar-logo-text">Renewable Energy</div>
            <div className="sidebar-logo-sub">Portfolio Operations</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* Site context: back + site tabs */}
        {site ? (
          <>
            <button className="nav-item" onClick={() => nav("/")} aria-label="Back to Portfolio">
              <IcoArrowLeft width={15} height={15} />
              <span className="nav-item-label">Back to Portfolio</span>
            </button>

            {!collapsed && (
              <div className="sidebar-site-context">
                <div className="sidebar-site-badge">{site.type}</div>
                <div className="sidebar-site-name">{site.name}</div>
              </div>
            )}

            {getSiteNav(site.type).map((group) => (
              <div key={group.section}>
                <div className="sidebar-section-label">{group.section}</div>
                {group.items.map((tab) => {
                  const fullPath = `/site/${siteId}${tab.path}`;
                  const isActive = tab.path === "" ? loc.pathname === `/site/${siteId}` : loc.pathname.startsWith(fullPath);
                  return (
                    <button key={tab.path} className={`nav-item ${isActive ? "active" : ""}`} onClick={() => nav(fullPath)} aria-label={tab.label}>
                      {tab.icon}
                      <span className="nav-item-label">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            <div style={{ borderTop: "1px solid var(--ds-border)", margin: "8px 8px" }} />
            <div className="sidebar-section-label">PORTFOLIO</div>
            {PORTFOLIO_NAV.flatMap((g) => g.items).map((item) => (
              <button
                key={item.path}
                className={`nav-item ${isExactPath(item.path) ? "active" : ""}`}
                onClick={() => nav(item.path)}
                aria-label={item.label}
              >
                {item.icon}
                <span className="nav-item-label">{item.label}</span>
              </button>
            ))}
          </>
        ) : (
          /* Portfolio context: normal nav */
          PORTFOLIO_NAV.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map((item) => (
                <button
                  key={item.path}
                  className={`nav-item ${isExactPath(item.path) ? "active" : ""}`}
                  onClick={() => nav(item.path)}
                  aria-label={item.label}
                >
                  {item.icon}
                  <span className="nav-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
