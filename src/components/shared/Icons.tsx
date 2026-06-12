import React from "react";

const s = { fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const IcoGlobe = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <circle cx="12" cy="12" r="10" {...s} />
    <line x1="2" y1="12" x2="22" y2="12" {...s} />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s} />
  </svg>
);
export const IcoBuilding = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" {...s} />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" {...s} />
  </svg>
);
export const IcoWrench = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      {...s}
    />
  </svg>
);
export const IcoTrendUp = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...s} />
    <polyline points="17 6 23 6 23 12" {...s} />
  </svg>
);
export const IcoChart = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <line x1="18" y1="20" x2="18" y2="10" {...s} />
    <line x1="12" y1="20" x2="12" y2="4" {...s} />
    <line x1="6" y1="20" x2="6" y2="14" {...s} />
  </svg>
);
export const IcoZap = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...s} />
  </svg>
);
export const IcoBell = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...s} />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" {...s} />
  </svg>
);
export const IcoSun = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <circle cx="12" cy="12" r="5" {...s} />
    <line x1="12" y1="1" x2="12" y2="3" {...s} />
    <line x1="12" y1="21" x2="12" y2="23" {...s} />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...s} />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...s} />
    <line x1="1" y1="12" x2="3" y2="12" {...s} />
    <line x1="21" y1="12" x2="23" y2="12" {...s} />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...s} />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...s} />
  </svg>
);
export const IcoMoon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...s} />
  </svg>
);
export const IcoSearch = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <circle cx="11" cy="11" r="8" {...s} />
    <line x1="21" y1="21" x2="16.65" y2="16.65" {...s} />
  </svg>
);
export const IcoMenu = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <line x1="3" y1="6" x2="21" y2="6" {...s} />
    <line x1="3" y1="12" x2="21" y2="12" {...s} />
    <line x1="3" y1="18" x2="21" y2="18" {...s} />
  </svg>
);
export const IcoChevronRight = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <polyline points="9 18 15 12 9 6" {...s} />
  </svg>
);
export const IcoRefresh = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <polyline points="23 4 23 10 17 10" {...s} />
    <polyline points="1 20 1 14 7 14" {...s} />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" {...s} />
  </svg>
);
export const IcoMapPin = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...s} />
    <circle cx="12" cy="10" r="3" {...s} />
  </svg>
);
export const IcoEye = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={11} height={11} {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s} />
    <circle cx="12" cy="12" r="3" {...s} />
  </svg>
);
export const IcoActivity = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...s} />
  </svg>
);
export const IcoCpu = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" {...s} />
    <rect x="9" y="9" width="6" height="6" {...s} />
    <line x1="9" y1="1" x2="9" y2="4" {...s} />
    <line x1="15" y1="1" x2="15" y2="4" {...s} />
    <line x1="9" y1="20" x2="9" y2="23" {...s} />
    <line x1="15" y1="20" x2="15" y2="23" {...s} />
    <line x1="20" y1="9" x2="23" y2="9" {...s} />
    <line x1="20" y1="14" x2="23" y2="14" {...s} />
    <line x1="1" y1="9" x2="4" y2="9" {...s} />
    <line x1="1" y1="14" x2="4" y2="14" {...s} />
  </svg>
);
export const IcoDollar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <line x1="12" y1="1" x2="12" y2="23" {...s} />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" {...s} />
  </svg>
);
export const IcoLeaf = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M17 8C8 10 5.9 16.17 3.82 19.09a.7.7 0 0 0 .8 1.01c1.37-.37 2.85-.97 4.38-1.89 2.2-1.32 4.07-3.2 5-5.21" {...s} />
    <path d="M22 3c-1.33 1.33-4.1 2.5-8 2.5C10.23 5.5 7 6.85 5 9" {...s} />
  </svg>
);
export const IcoCloud = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" {...s} />
  </svg>
);
export const IcoWind = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" {...s} />
  </svg>
);
export const IcoBattery = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <rect x="1" y="6" width="18" height="12" rx="2" {...s} />
    <line x1="23" y1="13" x2="23" y2="11" {...s} />
    <line x1="11" y1="9" x2="7" y2="15" {...s} />
    <polyline points="11 9 15 9 13 15" {...s} />
  </svg>
);
export const IcoThermometer = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" {...s} />
  </svg>
);
export const IcoSettings = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <circle cx="12" cy="12" r="3" {...s} />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      {...s}
    />
  </svg>
);
export const IcoFilter = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" {...s} />
  </svg>
);
export const IcoChevronDown = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <polyline points="6 9 12 15 18 9" {...s} />
  </svg>
);
export const IcoArrowLeft = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <line x1="19" y1="12" x2="5" y2="12" {...s} />
    <polyline points="12 19 5 12 12 5" {...s} />
  </svg>
);
export const IcoCalendar = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...s} />
    <line x1="16" y1="2" x2="16" y2="6" {...s} />
    <line x1="8" y1="2" x2="8" y2="6" {...s} />
    <line x1="3" y1="10" x2="21" y2="10" {...s} />
  </svg>
);
export const IcoUser = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...s} />
    <circle cx="12" cy="7" r="4" {...s} />
  </svg>
);
export const IcoLayers = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" {...s} />
    <polyline points="2 17 12 22 22 17" {...s} />
    <polyline points="2 12 12 17 22 12" {...s} />
  </svg>
);
export const IcoCheckCircle = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" {...s} />
    <polyline points="22 4 12 14.01 9 11.01" {...s} />
  </svg>
);
export const IcoAlertTriangle = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s} />
    <line x1="12" y1="9" x2="12" y2="13" {...s} />
    <line x1="12" y1="17" x2="12.01" y2="17" {...s} />
  </svg>
);
export const IcoDroplets = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" {...s} />
    <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" {...s} />
  </svg>
);
export const IcoSparkle = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" {...s} />
  </svg>
);
export const IcoBrain = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375M6.003 5.125A3 3 0 0 0 6.401 6.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 9v4M12 18v3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
export const IcoChevronLeft = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={14} height={14} {...p}>
    <polyline points="15 18 9 12 15 6" {...s} />
  </svg>
);
export const IcoFileText = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...s} />
    <polyline points="14 2 14 8 20 8" {...s} />
    <line x1="16" y1="13" x2="8" y2="13" {...s} />
    <line x1="16" y1="17" x2="8" y2="17" {...s} />
    <polyline points="10 9 9 9 8 9" {...s} />
  </svg>
);
