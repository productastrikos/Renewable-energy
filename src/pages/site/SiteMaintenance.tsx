import { useState, useMemo, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { KpiCard } from "../../components/shared/KpiCard";
import {
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
  chartTooltipProps,
  axisProps,
  CHART_COLORS,
} from "../../utils/chartHelpers";
import { rag } from "../../utils/ragHelpers";
import { WORK_ORDERS, TECHNICIANS, WorkOrder } from "../../data/mockData";
import { getStoredWOs } from "../../utils/woStore";

type WOStatus = WorkOrder["status"];
import { fetchSiteWorkOrders, fetchTechnicians, fetchSops, type Sop } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { SiteWorkspaceContext } from "./SiteWorkspace";
import { IcoWrench, IcoAlertTriangle, IcoCheckCircle, IcoZap, IcoCalendar, IcoUser, IcoSparkle, IcoFileText } from "../../components/shared/Icons";

// WO type → SOP category keyword mapping
const WO_TYPE_TO_SOP: Record<string, string> = {
  Emergency: "Emergency",
  Corrective: "Corrective",
  Preventive: "Preventive",
};

const WO_STATUS_COLOR: Record<string, string> = {
  Open: "info",
  InProgress: "advisory",
  Overdue: "danger",
  Closed: "success",
};

const PRIORITY_COLOR: Record<string, string> = {
  High: "var(--ds-danger)",
  Medium: "var(--ds-warning)",
  Low: "var(--ds-info)",
};

const CAL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_DATES = Array.from({ length: 14 }, (_, i) => i + 1);

const STATUS_OPTIONS: { label: string; value: WOStatus }[] = [
  { label: "Open", value: "Open" },
  { label: "In Progress", value: "InProgress" },
  { label: "Overdue", value: "Overdue" },
  { label: "Closed", value: "Closed" },
];

function WOCard({
  wo,
  onDragStart,
  onMove,
  onClick,
}: {
  wo: WorkOrder;
  onDragStart: (id: string) => void;
  onMove: (id: string, status: WOStatus) => void;
  onClick: () => void;
}) {
  const [showMove, setShowMove] = useState(false);

  return (
    <div
      className={`wo-card priority-${wo.priority.toLowerCase()}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(wo.id);
      }}
      style={{ cursor: "grab" }}
      onClick={onClick}
    >
      <div className="wo-card-header">
        <span className="wo-card-id">{wo.id}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
          <span className={`chip ${WO_STATUS_COLOR[wo.status]}`} style={{ fontSize: 8 }}>
            {wo.status}
          </span>
          {/* Move button */}
          <div
            style={{ position: "relative" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMove((v) => !v);
            }}
          >
            <button
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--ds-text-faint)",
                fontSize: 13,
                lineHeight: 1,
                padding: "0 2px",
              }}
              title="Move to column"
            >
              ⋮
            </button>
            {showMove && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setShowMove(false)} />
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 200,
                    background: "var(--ds-surface)",
                    border: "1px solid var(--ds-border)",
                    borderRadius: 6,
                    minWidth: 130,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      fontSize: 9,
                      color: "var(--ds-text-faint)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--ds-border)",
                    }}
                  >
                    Move to
                  </div>
                  {STATUS_OPTIONS.filter((s) => s.value !== wo.status).map((s) => (
                    <div
                      key={s.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(wo.id, s.value);
                        setShowMove(false);
                      }}
                      style={{ padding: "7px 12px", fontSize: 11, color: "var(--ds-text-muted)", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      → {s.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="wo-card-title">{wo.title}</div>
      <div className="wo-card-meta">
        <span style={{ color: PRIORITY_COLOR[wo.priority], fontSize: 10, fontWeight: 600 }}>{wo.priority}</span>
        <span className="wo-card-dot" />
        <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{wo.asset}</span>
      </div>
      <div className="wo-card-footer">
        <span style={{ fontSize: 10, color: "var(--ds-text-faint)" }}>{wo.assignee}</span>
        <span style={{ fontSize: 10, color: wo.status === "Overdue" ? "var(--ds-danger)" : "var(--ds-text-faint)" }}>Due: {wo.dueDate.slice(5)}</span>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.12)", marginTop: 4, userSelect: "none" }}>⠿ drag to move</div>
    </div>
  );
}

export default function SiteMaintenance() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const nav = useNavigate();
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, WOStatus>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);

  function moveWO(id: string, newStatus: WOStatus) {
    setStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));
    // Persist for user-created WOs
    const stored = getStoredWOs();
    const isStored = stored.some((w) => w.id === id);
    if (isStored) {
      const updated = stored.map((w) => (w.id === id ? { ...w, status: newStatus } : w));
      localStorage.setItem("re-dashboard-work-orders", JSON.stringify(updated));
      window.dispatchEvent(new Event("wo-store-updated"));
    }
    setSelectedWO((prev) => (prev?.id === id ? { ...prev, status: newStatus } : prev));
  }

  function handleDrop(colStatus: WOStatus) {
    if (dragId.current && dragId.current !== colStatus) {
      moveWO(dragId.current, colStatus);
    }
    dragId.current = null;
    setDragOver(null);
  }

  const { data: apiWorkOrders } = useApi(() => fetchSiteWorkOrders(site.id), [site.id]);
  const { data: apiTechnicians } = useApi(() => fetchTechnicians(), []);
  const { data: allSops } = useApi(() => fetchSops(), []);
  const [storedWOs, setStoredWOs] = useState<WorkOrder[]>([]);

  // Reload stored WOs whenever the page mounts or gains focus
  useEffect(() => {
    const load = () => setStoredWOs(getStoredWOs().filter((w) => w.siteId === site.id));
    load();
    window.addEventListener("focus", load);
    window.addEventListener("wo-store-updated", load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener("wo-store-updated", load);
    };
  }, [site.id]);

  const siteWOs = useMemo(() => {
    const base = apiWorkOrders ?? WORK_ORDERS.filter((w) => w.siteId === site.id);
    const baseIds = new Set(base.map((w) => w.id));
    const merged = [...storedWOs.filter((w) => !baseIds.has(w.id)), ...base];
    // Apply any manual status overrides
    return merged.map((w) => (statusOverrides[w.id] ? { ...w, status: statusOverrides[w.id] } : w));
  }, [apiWorkOrders, site.id, storedWOs, statusOverrides]);
  const technicians = apiTechnicians ?? TECHNICIANS;
  const openWOs = siteWOs.filter((w) => w.status === "Open").length;
  const inProgressWOs = siteWOs.filter((w) => w.status === "InProgress");
  const overdueWOs = siteWOs.filter((w) => w.status === "Overdue");
  const closedWOs = siteWOs.filter((w) => w.status === "Closed");
  const allOpen = siteWOs.filter((w) => w.status === "Open");
  const pmCount = siteWOs.filter((w) => w.type === "Preventive").length;
  const pmClosed = siteWOs.filter((w) => w.type === "Preventive" && w.status === "Closed").length;
  const pmCompliance = pmCount > 0 ? Math.round((pmClosed / pmCount) * 100) : 100;

  const typeDistData = useMemo(() => {
    const types: Record<string, number> = {};
    siteWOs.forEach((w) => {
      types[w.type] = (types[w.type] ?? 0) + 1;
    });
    const colors: Record<string, string> = { Corrective: CHART_COLORS.danger, Preventive: CHART_COLORS.sky, Emergency: CHART_COLORS.amber };
    return Object.entries(types).map(([name, value]) => ({ name, value, fill: colors[name] ?? CHART_COLORS.blue }));
  }, [siteWOs]);

  const priorityBarData = useMemo(() => {
    const p = { High: 0, Medium: 0, Low: 0 };
    siteWOs
      .filter((w) => w.status !== "Closed")
      .forEach((w) => {
        p[w.priority] = (p[w.priority] ?? 0) + 1;
      });
    return Object.entries(p).map(([name, value]) => ({ name, value }));
  }, [siteWOs]);

  const siteTechs = technicians.filter((t) => t.currentSite === site.id || t.status === "Available");

  // SOPs relevant to the currently selected WO type
  const relatedSops: Sop[] = useMemo(() => {
    if (!allSops) return [];
    const keyword = selectedWO ? (WO_TYPE_TO_SOP[selectedWO.type] ?? "") : "";
    const matched = keyword ? allSops.filter((s: Sop) => s.category.toLowerCase().includes(keyword.toLowerCase()) && s.status === "Active") : [];
    return matched.slice(0, 3);
  }, [allSops, selectedWO?.type]);

  // Latest 4 active SOPs for the quick-access panel (no filter)
  const quickSops: Sop[] = useMemo(() => (allSops ?? []).filter((s: Sop) => s.status === "Active").slice(0, 4), [allSops]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <KpiCard
          label="Open Work Orders"
          value={openWOs + overdueWOs.length + inProgressWOs.length}
          icon={<IcoWrench width={14} height={14} />}
          rag="warning"
          trend="+2 this week"
          trendDir="down"
        />
        <KpiCard
          label="Overdue WOs"
          value={overdueWOs.length}
          icon={<IcoAlertTriangle width={14} height={14} />}
          rag={overdueWOs.length > 0 ? "danger" : "success"}
          trend={overdueWOs.length > 0 ? "Requires action" : "On track"}
          trendDir={overdueWOs.length > 0 ? "down" : "up"}
        />
        <KpiCard
          label="PM Compliance"
          value={pmCompliance}
          unit="%"
          icon={<IcoCheckCircle width={14} height={14} />}
          rag={rag(pmCompliance, 90, 80)}
          trend="+5%"
          trendDir="up"
        />
        <KpiCard
          label="MTTR"
          value="3.2"
          unit="h"
          icon={<IcoZap width={14} height={14} />}
          rag={rag(100 - 3.2, 95, 90)}
          trend="-0.4h"
          trendDir="up"
        />
      </div>

      {/* Kanban Board */}
      <div>
        <div className="section-label" style={{ marginBottom: 8 }}>
          Work Order Board
        </div>
        <div className="wo-board">
          {[
            { title: "Open", status: "Open" as WOStatus, items: allOpen, color: "var(--ds-info)" },
            { title: "In Progress", status: "InProgress" as WOStatus, items: inProgressWOs, color: "var(--ds-advisory)" },
            { title: "Overdue", status: "Overdue" as WOStatus, items: overdueWOs, color: "var(--ds-danger)" },
            { title: "Closed", status: "Closed" as WOStatus, items: closedWOs, color: "var(--ds-success)" },
          ].map((col) => (
            <div
              key={col.title}
              className={`wo-column${dragOver === col.status ? " wo-col-drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(col.status);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.status)}
            >
              <div className="wo-column-header" style={{ borderTop: `3px solid ${col.color}` }}>
                <span className="wo-column-title">{col.title}</span>
                <span className="wo-column-count">{col.items.length}</span>
              </div>
              <div className="wo-column-body">
                {col.items.map((wo) => (
                  <WOCard
                    key={wo.id}
                    wo={wo}
                    onDragStart={(id) => {
                      dragId.current = id;
                    }}
                    onMove={moveWO}
                    onClick={() => setSelectedWO(wo === selectedWO ? null : wo)}
                  />
                ))}
                {col.items.length === 0 && (
                  <div className={`wo-empty${dragOver === col.status ? " wo-drop-hint" : ""}`}>
                    {dragOver === col.status ? "Drop here" : `No ${col.title.toLowerCase()} orders`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WO Detail + Calendar + Technicians */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: 12 }}>
        {/* WO Detail / Calendar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <IcoCalendar width={12} height={12} />
            <span className="chart-card-title">Maintenance Calendar — June 2026</span>
          </div>
          <div className="maint-calendar">
            {CAL_DAYS.map((d) => (
              <div key={d} className="cal-day-label">
                {d}
              </div>
            ))}
            {CAL_DATES.map((date) => {
              const hasWO = siteWOs.some((w) => {
                const d = parseInt(w.dueDate.slice(-2));
                return d === date;
              });
              const isOverdue = siteWOs.some((w) => w.status === "Overdue" && parseInt(w.dueDate.slice(-2)) === date);
              return (
                <div key={date} className={`cal-date${hasWO ? " has-wo" : ""}${isOverdue ? " overdue" : ""}`}>
                  <span>{date}</span>
                  {hasWO && <span className="cal-wo-dot" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Analytics Charts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="chart-card" style={{ flex: 1 }}>
            <div className="chart-card-header">
              <span className="chart-card-title">WO by Type</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <PieChart>
                <Pie data={typeDistData} cx="50%" cy="50%" outerRadius={45} innerRadius={28} dataKey="value">
                  {typeDistData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipProps} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9, color: "var(--ds-text-muted)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card" style={{ flex: 1 }}>
            <div className="chart-card-header">
              <span className="chart-card-title">Open WOs by Priority</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={priorityBarData}>
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {priorityBarData.map((d, i) => (
                    <Cell key={i} fill={d.name === "High" ? CHART_COLORS.danger : d.name === "Medium" ? CHART_COLORS.warning : CHART_COLORS.sky} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technician Assignment */}
        <div className="chart-card">
          <div className="chart-card-header">
            <IcoUser width={12} height={12} />
            <span className="chart-card-title">Technicians</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {siteTechs.map((tech) => (
              <div key={tech.id} className="tech-card">
                <div className="tech-avatar">{tech.avatar}</div>
                <div className="tech-info">
                  <div className="tech-name">{tech.name}</div>
                  <div className="tech-role">{tech.role}</div>
                  <div className="tech-skills">{tech.skills.slice(0, 2).join(" · ")}</div>
                </div>
                <span
                  className={`chip ${tech.status === "On-Site" ? "success" : tech.status === "Available" ? "info" : "warning"}`}
                  style={{ fontSize: 8, height: 18, alignSelf: "center" }}
                >
                  {tech.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title">
            <IcoSparkle width={11} height={11} /> AI Maintenance Intelligence
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "10px 12px" }}>
          {[
            {
              title: "Suggested Schedule",
              type: "info" as const,
              insight: "Group INV-14 & TX-02 maintenance on Jun 5 to reduce downtime overlap. Estimated saving: 2h technician time.",
            },
            {
              title: "Spare Parts Alert",
              type: "warning" as const,
              insight: "Cooling fans for INV-series running low (2 units). Reorder before Jun 8 to avoid WO delays. Lead time: 3 days.",
            },
            {
              title: "PM Optimization",
              type: "success" as const,
              insight: "Switching from 6-month to condition-based PM for INV-001 through INV-012 could reduce PM cost by 18% annually.",
            },
          ].map((item) => (
            <div key={item.title} className={`ai-finding-card modal-${item.type}`} style={{ padding: "10px 12px" }}>
              <div className="ai-finding-site">{item.title}</div>
              <div style={{ fontSize: 11.5, color: "#e9d5ff", lineHeight: 1.5, marginTop: 4 }}>{item.insight}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SOP Quick Access */}
      {/* <div className="chart-card" style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ds-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
            <IcoFileText width={12} height={12} /> SOP Quick Access
          </span>
          <button
            onClick={() => nav("/documents")}
            style={{ fontSize: 11, color: "var(--ds-primary, #a78bfa)", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}
          >
            Open SOP Library →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {quickSops.length === 0
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 56, borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid var(--ds-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
              ))
            : quickSops.map((sop: Sop) => (
                <div
                  key={sop.id}
                  onClick={() => nav("/documents")}
                  style={{
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                    background: "rgba(167,139,250,0.05)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(167,139,250,0.12)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.35)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(167,139,250,0.05)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.15)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <IcoFileText width={10} height={10} style={{ color: "#a78bfa", flexShrink: 0 }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.04em" }}>{sop.category}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ds-text)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {sop.title}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--ds-text-faint)", marginTop: 4 }}>Rev {sop.revision} · {sop.lastRevised}</div>
                </div>
              ))
          }
        </div>
      </div> */}

      {/* WO Detail Modal */}
      {selectedWO && (
        <div className="modal-overlay" onClick={() => setSelectedWO(null)}>
          <div className="modal-panel" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: 11, color: "var(--ds-text-faint)", marginBottom: 2 }}>
                  {selectedWO.id} · {selectedWO.type}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedWO.title}</div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedWO(null)} style={{ width: 28, height: 28 }} aria-label="Close">
                ✕
              </button>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Asset", value: selectedWO.asset },
                { label: "Status", value: selectedWO.status },
                { label: "Priority", value: selectedWO.priority },
                { label: "Assignee", value: selectedWO.assignee },
                { label: "Due Date", value: selectedWO.dueDate },
                { label: "Est. Hours", value: `${selectedWO.estimatedHours}h` },
              ].map((row) => (
                <div key={row.label} className="stat-row">
                  <span style={{ fontSize: 12, color: "var(--ds-text-faint)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ds-text)" }}>{row.value}</span>
                </div>
              ))}
              <div
                style={{
                  marginTop: 4,
                  padding: "8px 10px",
                  background: "var(--ds-surface-soft)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--ds-text-muted)",
                  lineHeight: 1.5,
                }}
              >
                {selectedWO.description}
              </div>

              {/* ── Related SOPs ── */}
              <div style={{ marginTop: 8, borderTop: "1px solid var(--ds-border)", paddingTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--ds-text-faint)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <IcoFileText width={11} height={11} /> Related SOPs
                  </span>
                  <button
                    onClick={() => nav("/documents")}
                    style={{
                      fontSize: 10,
                      color: "var(--ds-primary, #a78bfa)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    View All →
                  </button>
                </div>
                {relatedSops.length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--ds-text-faint)", fontStyle: "italic" }}>
                    No matching SOPs found.{" "}
                    <span
                      style={{ color: "var(--ds-primary, #a78bfa)", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => nav("/documents")}
                    >
                      Browse library
                    </span>
                  </div>
                ) : (
                  relatedSops.map((sop: Sop) => (
                    <div
                      key={sop.id}
                      onClick={() => nav("/documents")}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "7px 9px",
                        marginBottom: 4,
                        background: "rgba(167,139,250,0.06)",
                        border: "1px solid rgba(167,139,250,0.18)",
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.13)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.06)")}
                    >
                      <IcoFileText width={12} height={12} style={{ color: "#a78bfa", marginTop: 1, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--ds-text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {sop.title}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginTop: 1 }}>
                          {sop.category} · Rev {sop.revision}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          marginLeft: "auto",
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(34,197,94,0.12)",
                          color: "#22c55e",
                          flexShrink: 0,
                          alignSelf: "center",
                        }}
                      >
                        {sop.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
