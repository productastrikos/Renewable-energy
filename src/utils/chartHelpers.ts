import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export const CHART_COLORS = {
  blue: "#5b8de0",
  sky: "#38bdf8",
  teal: "#14b8a6",
  amber: "#f59e0b",
  pink: "#ec4899",
  indigo: "#6366f1",
  lime: "#a3e635",
  slate: "#94a3b8",
  violet: "#8b5cf6",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

const tooltipStyle = {
  backgroundColor: "var(--ds-panel)",
  border: "1px solid var(--ds-chart-tooltip-border)",
  borderRadius: "8px",
  padding: "8px 10px",
  boxShadow: "none",
  color: "var(--ds-text)",
  fontSize: 11,
};

const labelStyle = { color: "var(--ds-text-muted)", fontSize: 10 };

export const chartTooltipProps = {
  contentStyle: tooltipStyle,
  labelStyle,
  itemStyle: { color: "var(--ds-text-muted)", fontSize: 10 },
};

export const axisProps = {
  tick: { fill: "var(--ds-text-faint)", fontSize: 9 },
  axisLine: false,
  tickLine: false,
};

export function ragColor(val: number, warnThresh: number, dangerThresh: number, mode: "high-good" | "low-good" = "high-good") {
  if (mode === "high-good") {
    if (val >= warnThresh) return CHART_COLORS.success;
    if (val >= dangerThresh) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  } else {
    if (val <= warnThresh) return CHART_COLORS.success;
    if (val <= dangerThresh) return CHART_COLORS.warning;
    return CHART_COLORS.danger;
  }
}

export {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
};
