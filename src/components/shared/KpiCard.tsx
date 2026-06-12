import React from "react";

export type RagStatus = "success" | "warning" | "danger" | "info";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  rag: RagStatus;
  trend?: string;
  trendDir?: "up" | "down";
  onClick?: () => void;
}

export function KpiCard({ label, value, unit, icon, rag, trend, trendDir, onClick }: KpiCardProps) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className="kpi-row1">
        <div className="kpi-icon">{icon}</div>
        {trend && (
          <div className="kpi-trend">
            <span className={`trend-badge ${trendDir ?? "up"}`}>{trend}</span>
            <span className="trend-caption">vs prev</span>
          </div>
        )}
      </div>
      <div className="kpi-value">
        <span className="stat-value">{value}</span>
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-divider" />
      <div className="kpi-card-footer">
        <span className={`rag-badge ${rag}`}>
          {rag === "success" ? "NORMAL" : rag === "warning" ? "WARNING" : rag === "danger" ? "CRITICAL" : "INFO"}
        </span>
        {onClick && (
          <button
            className="kpi-eye"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label={`View ${label} detail`}
            title="Drill down"
          >
            <svg
              viewBox="0 0 24 24"
              width={10}
              height={10}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
