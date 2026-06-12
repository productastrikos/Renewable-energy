interface Props {
  value: number;
  max?: number;
  status: "success" | "warning" | "danger";
}

export function ProgressBar({ value, max = 100, status }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${status}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
