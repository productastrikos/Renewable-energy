import { useState } from "react";
import { ProgressBar } from "../shared/ProgressBar";

const TYPES = ["Transformer", "Switchgear", "Inverter", "Battery", "Turbine"];

const ASSET_SVG: Record<string, React.ReactNode> = {
  Transformer: (
    <g>
      <rect x="80" y="60" width="80" height="80" rx="8" fill="rgba(245,158,11,0.1)" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="120" cy="100" r="25" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="120" cy="85" r="10" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="120" cy="115" r="10" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <line x1="120" y1="60" x2="120" y2="45" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
      <line x1="120" y1="140" x2="120" y2="155" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="120" y="175" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
        Transformer T-12
      </text>
    </g>
  ),
  Inverter: (
    <g>
      <rect x="60" y="55" width="120" height="90" rx="8" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" strokeWidth="1.5" />
      <path d="M80 110 L100 75 L120 110 L140 75 L160 110" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <rect x="75" y="120" width="30" height="12" rx="2" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" strokeWidth="1" />
      <rect x="115" y="120" width="30" height="12" rx="2" fill="rgba(56,189,248,0.15)" stroke="#38bdf8" strokeWidth="1" />
      <text x="120" y="175" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
        Inverter INV-14
      </text>
    </g>
  ),
  Battery: (
    <g>
      <rect x="70" y="55" width="100" height="85" rx="8" fill="rgba(99,102,241,0.1)" stroke="#6366f1" strokeWidth="1.5" />
      <rect x="85" y="70" width="70" height="12" rx="2" fill="rgba(99,102,241,0.3)" stroke="#6366f1" strokeWidth="1" />
      <rect x="85" y="88" width="70" height="12" rx="2" fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="1" />
      <rect x="85" y="106" width="70" height="12" rx="2" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1" />
      <rect x="115" y="47" width="10" height="10" rx="2" fill="#6366f1" />
      <text x="120" y="175" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
        Battery B-3
      </text>
    </g>
  ),
  Switchgear: (
    <g>
      <rect x="70" y="55" width="100" height="85" rx="4" fill="rgba(20,184,166,0.1)" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="90" y1="75" x2="150" y2="75" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="90" y1="95" x2="150" y2="95" stroke="#14b8a6" strokeWidth="1.5" />
      <line x1="90" y1="115" x2="150" y2="115" stroke="#14b8a6" strokeWidth="1.5" />
      <circle cx="100" cy="75" r="5" fill="#14b8a6" />
      <circle cx="100" cy="95" r="5" fill="#14b8a6" />
      <circle cx="130" cy="115" r="5" fill="rgba(20,184,166,0.4)" stroke="#14b8a6" strokeWidth="1" />
      <text x="120" y="175" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
        Switchgear SG-2
      </text>
    </g>
  ),
  Turbine: (
    <g>
      <circle cx="120" cy="95" r="6" fill="#ec4899" />
      <path d="M120 89 L108 60 L132 60 Z" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" />
      <path d="M125 98 L148 118 L135 138 Z" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" />
      <path d="M115 98 L92 118 L105 138 Z" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1.5" />
      <line x1="120" y1="101" x2="120" y2="155" stroke="#ec4899" strokeWidth="2" />
      <rect x="110" y="155" width="20" height="10" rx="2" fill="rgba(236,72,153,0.2)" stroke="#ec4899" strokeWidth="1" />
      <text x="120" y="178" textAnchor="middle" fill="var(--ds-text-faint)" fontSize="9">
        Turbine T-1
      </text>
    </g>
  ),
};

interface Props {
  assetType?: string;
  health?: number;
}

export function AssetDigitalTwin({ assetType = "Transformer", health = 78 }: Props) {
  const [selectedType, setSelectedType] = useState(assetType);

  return (
    <div className="dt-panel" style={{ height: "100%" }}>
      <div className="dt-header">
        <span className="card-title">Asset DT Viewer</span>
        <span className={`chip ${health >= 85 ? "success" : health >= 70 ? "warning" : "danger"}`}>Health {health}</span>
      </div>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--ds-border)" }}>
        <div className="timeframe-control" style={{ width: "100%" }}>
          {TYPES.map((t) => (
            <button
              key={t}
              className={`timeframe-btn ${selectedType === t ? "active" : ""}`}
              onClick={() => setSelectedType(t)}
              style={{ flex: 1, fontSize: 9.5 }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="dt-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
        <svg viewBox="0 0 240 200" width="100%" style={{ maxHeight: 200 }}>
          <defs>
            <pattern id="agrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="240" height="200" fill="url(#agrid)" rx="6" />
          {ASSET_SVG[selectedType]}
        </svg>
      </div>
    </div>
  );
}
