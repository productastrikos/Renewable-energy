import { useState } from "react";

export type Timeframe = "12H" | "24H" | "7D" | "30D" | "10Y";

interface Props {
  options: Timeframe[];
  value: Timeframe;
  onChange: (t: Timeframe) => void;
}

export function ChartTimeframeControl({ options, value, onChange }: Props) {
  return (
    <div className="timeframe-control">
      {options.map((t) => (
        <button key={t} className={`timeframe-btn ${value === t ? "active" : ""}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function useTimeframe(defaultVal: Timeframe) {
  const [tf, setTf] = useState<Timeframe>(defaultVal);
  return { tf, setTf };
}
