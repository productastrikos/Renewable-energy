export type RagStatus = "success" | "warning" | "danger" | "info";

export function rag(val: number, good: number, warn: number): RagStatus {
  if (val >= good) return "success";
  if (val >= warn) return "warning";
  return "danger";
}

export function ragInverse(val: number, good: number, warn: number): RagStatus {
  if (val <= good) return "success";
  if (val <= warn) return "warning";
  return "danger";
}

export function fmt(n: number, decimals = 1): string {
  if (n >= 1e9) return (n / 1e9).toFixed(decimals) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(decimals) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(decimals) + "K";
  return n.toFixed(decimals);
}

export function generate24h(base: number, noise = 0.1) {
  const hours = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24"];
  return hours.map((h, i) => {
    const dayFactor = Math.sin((i / 12) * Math.PI);
    const actual = Math.max(0, base * dayFactor + (Math.random() - 0.5) * base * noise);
    const forecast = Math.max(0, base * dayFactor * (1 + (Math.random() - 0.5) * 0.05));
    return { time: h + ":00", actual: +actual.toFixed(1), forecast: +forecast.toFixed(1) };
  });
}

/** Filter 24h series to only include time points up to (and including) the current hour. */
export function clipToNow<T extends { time: string }>(data: T[]): T[] {
  const currentHour = new Date().getHours();
  return data.filter(d => parseInt(d.time.split(":")[0], 10) <= currentHour);
}

/**
 * Live 24h series: one point per hour from 00:00 to the current hour,
 * plus an exact HH:MM point at the current minute.
 * Uses a stable seeded RNG so historical hour values don't jump on re-render —
 * only the current-minute tip updates when the component re-renders.
 */
export function generate24hLive(seed: number, base: number, noise = 0.1) {
  const now = new Date();
  const h0 = now.getHours();
  const m0 = now.getMinutes();

  // Stable pseudo-random: sin-based so no external RNG needed
  const stableR = (s: number) => Math.abs(Math.sin(seed * 0.127 + s * 311.7)) % 1;

  const points: { time: string; actual: number }[] = [];
  for (let h = 0; h <= h0; h++) {
    const dayFactor = Math.sin((h / 23) * Math.PI);
    const actual = Math.max(0, base * dayFactor + (stableR(h) - 0.5) * base * noise);
    points.push({ time: `${String(h).padStart(2, "0")}:00`, actual: +actual.toFixed(1) });
  }

  // Add current-minute tip (uses minute in seed so it advances each tick)
  if (m0 > 0) {
    const dayFactor = Math.sin(((h0 + m0 / 60) / 23) * Math.PI);
    const r = Math.abs(Math.sin(seed * 0.127 + h0 * 311.7 + m0 * 7.13)) % 1;
    const actual = Math.max(0, base * dayFactor + (r - 0.5) * base * noise);
    points.push({
      time: `${String(h0).padStart(2, "0")}:${String(m0).padStart(2, "0")}`,
      actual: +actual.toFixed(1),
    });
  }

  return points;
}

export function generate7d(base: number, noise = 0.08) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date().getDay(); // 0=Sun … 6=Sat
  // Build last 7 days in order, ending on today
  const days = Array.from({ length: 7 }, (_, i) => names[(today - 6 + i + 14) % 7]);
  return days.map((d) => ({
    day: d,
    actual:   +(base * (1 + (Math.random() - 0.5) * noise * 2)).toFixed(1),
    forecast: +(base * (1 + (Math.random() - 0.5) * noise * 1.4)).toFixed(1),
  }));
}

export function generate30d(base: number) {
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    value: +(base * (0.8 + Math.random() * 0.4)).toFixed(1),
  }));
}
