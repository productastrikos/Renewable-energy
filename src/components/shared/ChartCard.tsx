import React, { useState } from "react";
import { IcoEye } from "./Icons";
import { ChartTimeframeControl, Timeframe } from "./ChartTimeframeControl";

export interface ChartStat  { label: string; value: string; highlight?: boolean }
export interface ChartInfo  {
  description: string;
  stats?:    ChartStat[];
  source?:   string;
  standard?: string;
  note?:     string;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  timeframeOptions?: Timeframe[];
  timeframe?: Timeframe;
  onTimeframeChange?: (t: Timeframe) => void;
  style?: React.CSSProperties;
  info?: ChartInfo;
}

export function ChartCard({ title, children, timeframeOptions, timeframe, onTimeframeChange, style, info }: ChartCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="chart-card" style={{ ...style, position: "relative" }}>
      <div className="chart-card-header">
        <span className="chart-card-title">{title}</span>
        {timeframeOptions && timeframe && onTimeframeChange && (
          <ChartTimeframeControl options={timeframeOptions} value={timeframe} onChange={onTimeframeChange} />
        )}
        <button
          className={`icon-btn cc-eye-btn${open ? " active" : ""}`}
          style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0 }}
          aria-label="Chart info"
          onClick={() => setOpen((v) => !v)}
          disabled={!info}
        >
          <IcoEye />
        </button>
      </div>

      {children}

      {/* Info popover */}
      {open && info && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 299 }}
            onClick={() => setOpen(false)}
          />
          <div className="cc-info-popover">
            {/* Header */}
            <div className="cc-info-header">
              <span className="cc-info-title">{title}</span>
              <button className="cc-info-close" onClick={() => setOpen(false)}>×</button>
            </div>

            {/* Description */}
            <p className="cc-info-desc">{info.description}</p>

            {/* Stats grid */}
            {info.stats && info.stats.length > 0 && (
              <div className="cc-info-stats">
                {info.stats.map((s, i) => (
                  <div key={i} className={`cc-info-stat${s.highlight ? " highlight" : ""}`}>
                    <span className="cc-info-stat-label">{s.label}</span>
                    <span className="cc-info-stat-value">{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Source / Standard */}
            {(info.source || info.standard) && (
              <div className="cc-info-meta">
                {info.source   && <span>📡 {info.source}</span>}
                {info.standard && <span>📋 {info.standard}</span>}
              </div>
            )}

            {/* Note */}
            {info.note && <p className="cc-info-note">{info.note}</p>}
          </div>
        </>
      )}
    </div>
  );
}
