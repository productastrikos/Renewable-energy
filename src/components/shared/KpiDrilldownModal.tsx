import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartTimeframeControl, Timeframe } from "./ChartTimeframeControl";
import { chartTooltipProps, axisProps } from "../../utils/chartHelpers";
import { RagStatus } from "./KpiCard";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ModalContextCard {
  title: string;
  type: "success" | "warning" | "danger" | "info" | "advisory";
  rows: Array<{ label: string; value: string }>;
  note?: string;
}

export interface KpiThreshold {
  warningValue: number;
  criticalValue: number;
  maxValue?: number;
  direction?: "high-good" | "low-good";
  unit?: string;
  rows: Array<{ status: "success" | "warning" | "danger"; label: string; range: string }>;
  standard?: string;
}

export interface KpiDataSource {
  name: string;
  type: string;
  frequency: string;
  protocol?: string;
  tag?: string;
  lastSync?: string;
}

export interface KpiModalConfig {
  label: string;
  value: string | number;
  unit?: string;
  rag: RagStatus;
  description: string;
  timeframeOptions: Timeframe[];
  chartType: "line" | "bar" | "area";
  chartData: Partial<Record<Timeframe, any[]>>;
  series: Array<{ key: string; name: string; color: string; dashed?: boolean }>;
  xKey: string;
  contextCards: ModalContextCard[];
  thresholds?: KpiThreshold;
  dataSource?: KpiDataSource;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface Props {
  config: KpiModalConfig | null;
  onClose: () => void;
}

export function KpiDrilldownModal({ config, onClose }: Props) {
  const [tf, setTf] = useState<Timeframe>("24H");

  useEffect(() => {
    if (config) setTf(config.timeframeOptions[0]);
  }, [config?.label]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!config) return null;

  const rawData = config.chartData[tf] ?? config.chartData[config.timeframeOptions[0]] ?? [];

  // Fix: replace last 24H point's time label with actual current HH:MM
  const data = (() => {
    if (tf === "24H" && rawData.length > 0) {
      const now    = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      return [...rawData.slice(0, -1), { ...rawData[rawData.length - 1], [config.xKey]: nowStr }];
    }
    return rawData;
  })();
  const ragLabel = config.rag === "success" ? "NORMAL" : config.rag === "warning" ? "WARNING" : config.rag === "danger" ? "CRITICAL" : "INFO";

  const renderChart = () => {
    const common = { data, margin: { top: 4, right: 8, bottom: 0, left: 0 } };

    if (config.chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart {...common}>
            <XAxis dataKey={config.xKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...chartTooltipProps} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
            {config.series.map((s) => <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} name={s.name} />)}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const ChartComp = config.chartType === "area" ? AreaChart : LineChart;
    return (
      <ResponsiveContainer width="100%" height={220}>
        <ChartComp {...common}>
          <XAxis dataKey={config.xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...chartTooltipProps} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--ds-text-muted)" }} />
          {config.series.map((s) =>
            config.chartType === "area" ? (
              <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} fill={`${s.color}18`} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} name={s.name} />
            ) : (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={false} name={s.name} />
            )
          )}
        </ChartComp>
      </ResponsiveContainer>
    );
  };


  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="presentation" />
      <div className="modal-frame" role="dialog" aria-modal="true" aria-labelledby="modal-kpi-title">
        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-kpi-label" id="modal-kpi-title">{config.label}</div>
            <div className="modal-value-row">
              <span className="modal-value">{config.value}</span>
              {config.unit && <span className="modal-unit">{config.unit}</span>}
              <span className={`rag-badge ${config.rag}`} style={{ marginLeft: 8 }}>{ragLabel}</span>
            </div>
            <div className="modal-desc">{config.description}</div>
          </div>
          <div className="modal-header-right">
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">

          {/* Type + Thresholds row */}
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 14 }}>
            {/* Data source — brand.md §3.2: side metadata uses --ds-text-faint label + --ds-text value */}
            {config.dataSource && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--ds-surface-soft)", borderRadius: 6,
                padding: "4px 10px",
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: "var(--ds-text-faint)",
                }}>Data Source</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "var(--ds-text)",
                  borderLeft: "1px solid var(--ds-border-soft)", paddingLeft: 8,
                }}>{config.dataSource.type}</span>
              </div>
            )}

            {/* Threshold rows (no gauge bar, just the range list) */}
            {config.thresholds && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {config.thresholds.rows.map((row, i) => {
                  const isActive = row.status === config.rag;
                  const dotColor = row.status === "success" ? "var(--ds-success)"
                    : row.status === "warning" ? "var(--ds-warning)" : "var(--ds-danger)";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                      opacity: isActive ? 1 : 0.45,
                      background: isActive ? "var(--ds-surface-raised)" : "transparent",
                      borderRadius: 4, padding: isActive ? "2px 6px" : "2px 0",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                      <span style={{ color: "var(--ds-text-muted)" }}>{row.label}</span>
                      <span style={{ color: "var(--ds-text)", fontWeight: isActive ? 600 : 400 }}>{row.range}</span>
                      {isActive && <span style={{ fontSize: 9, color: dotColor, fontWeight: 700, marginLeft: 2 }}>NOW</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trend chart */}
          <div className="modal-chart-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="modal-section-label" style={{ marginBottom: 0 }}>Trend</div>
              {config.timeframeOptions.length > 1 && (
                <ChartTimeframeControl options={config.timeframeOptions} value={tf} onChange={setTf} />
              )}
            </div>
            {renderChart()}
          </div>

          {/* Context cards */}
          {config.contextCards.length > 0 && (
            <>
              <div className="modal-section-label">Breakdown</div>
              <div className="modal-context-grid">
                {config.contextCards.map((card, i) => (
                  <div key={i} className={`modal-ctx-card ${card.type}`}>
                    <div className="modal-ctx-title">{card.title}</div>
                    {card.rows.map((row, j) => (
                      <div key={j} className="modal-ctx-row">
                        <span className="modal-ctx-label">{row.label}</span>
                        <span className="modal-ctx-value">{row.value}</span>
                      </div>
                    ))}
                    {card.note && <div className="modal-ctx-note">{card.note}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
