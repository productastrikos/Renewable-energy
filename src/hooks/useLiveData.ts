import { useState, useEffect, useRef } from "react";
import type { SiteData } from "../data/mockData";

/** Adds ±pct/2 noise to a value and rounds to `decimals` places */
export function jitter(base: number, pct = 0.03, decimals = 1): number {
  return +(base * (1 + (Math.random() - 0.5) * pct)).toFixed(decimals);
}

/** Returns a live-updating value that ticks every `ms` milliseconds */
export function useLiveValue(base: number, pct = 0.03, ms = 8000, decimals = 1): number {
  const [val, setVal] = useState(() => jitter(base, pct, decimals));
  const baseRef = useRef(base);
  baseRef.current = base;
  useEffect(() => {
    const id = setInterval(() => setVal(jitter(baseRef.current, pct, decimals)), ms);
    return () => clearInterval(id);
  }, [pct, ms, decimals]);
  return val;
}

/** Returns a live clock string "HH:MM:SS" that updates every second */
export function useLiveClock(): string {
  const [t, setT] = useState(() => new Date().toLocaleTimeString("en-GB", { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toLocaleTimeString("en-GB", { hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Returns "X seconds/minutes ago" that updates every 10s */
export function useLastSync(intervalMs = 10000): string {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const id = setInterval(() => setElapsed(s => s + intervalMs / 1000), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  if (elapsed < 60) return elapsed <= 5 ? "Just now" : `${Math.round(elapsed)}s ago`;
  return `${Math.floor(elapsed / 60)}m ago`;
}

/** Appends new data points to a series at a given interval */
export function useLiveChart<T>(
  initial: T[],
  generator: (prev: T[]) => T,
  ms = 30000,
  maxPoints = 48,
): T[] {
  const [data, setData] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = [...prev, generator(prev)];
        return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
      });
    }, ms);
    return () => clearInterval(id);
  }, [ms, maxPoints]);
  return data;
}

/** Returns a live-updating copy of a site array — generation/availability/pr tick with small noise */
export function useLiveSites(base: SiteData[], tickMs = 8000): SiteData[] {
  const [sites, setSites] = useState<SiteData[]>(base);
  const baseRef = useRef(base);

  useEffect(() => {
    baseRef.current = base;
    setSites(base);
  }, [base]);

  useEffect(() => {
    const id = setInterval(() => {
      setSites(
        baseRef.current.map((s) => ({
          ...s,
          generation: Math.max(0, Math.round(s.generation * (1 + (Math.random() - 0.5) * 0.04))),
          availability: +Math.min(100, s.availability * (1 + (Math.random() - 0.5) * 0.006)).toFixed(1),
          pr: +Math.min(100, s.pr * (1 + (Math.random() - 0.5) * 0.004)).toFixed(1),
        })),
      );
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return sites;
}

export interface LiveEvent {
  id: number;
  ts: string;
  site: string;
  msg: string;
  level: "info" | "warning" | "danger" | "success";
}

const _LIVE_EVENT_POOL: Omit<LiveEvent, "id" | "ts">[] = [
  { site: "Al Dhafra Solar Park",   msg: "INV-14 temp 87°C — threshold exceeded",               level: "warning" },
  { site: "NEOM Wind Farm",         msg: "WTG-007 vibration normalized: 0.22 g",                level: "success" },
  { site: "Jubail Battery Storage", msg: "SOC 94.2% — discharge window 17:30–20:00",            level: "info"    },
  { site: "MBR Solar Park",         msg: "String INV-006 fault cleared — output restored",       level: "success" },
  { site: "Duqm Renewable Park",    msg: "Wind cluster output 105% of forecast",                 level: "success" },
  { site: "Ibri Solar Station",     msg: "PR 98.7% — fleet best performance today",             level: "success" },
  { site: "NEOM Wind Farm",         msg: "WTG-003 pitch deviation ±1.8° — monitoring",          level: "warning" },
  { site: "MBR Solar Park",         msg: "SCADA polling delay 3.2 s — connectivity check",      level: "info"    },
  { site: "Jubail Battery Storage", msg: "Grid frequency event 49.8 Hz — responding",            level: "warning" },
  { site: "Al Dhafra Solar Park",   msg: "Block-B panel cleaning complete — PR +1.9%",           level: "success" },
  { site: "Al Dhafra Solar Park",   msg: "TX-001 oil temp 52°C — within normal limits",          level: "info"    },
  { site: "NEOM Wind Farm",         msg: "WTG-007 emergency blade inspection initiated",         level: "warning" },
  { site: "Jubail Battery Storage", msg: "Cell balancing complete — all racks healthy",          level: "success" },
  { site: "Duqm Renewable Park",    msg: "Hybrid optimizer switched to wind priority mode",      level: "info"    },
  { site: "MBR Solar Park",         msg: "INV-002 string mismatch — output 72%",                level: "warning" },
  { site: "Ibri Solar Station",     msg: "Irradiance 902 W/m² — peak generation active",         level: "success" },
  { site: "NEOM Wind Farm",         msg: "Wind speed 12.4 m/s — all turbines at rated power",  level: "success" },
  { site: "Duqm Renewable Park",    msg: "BESS SOC 62% — balanced with solar generation",       level: "info"    },
  { site: "Al Dhafra Solar Park",   msg: "Soiling loss 1.8% — cleaning scheduled this week",   level: "info"    },
  { site: "Jubail Battery Storage", msg: "Charging complete — SOC 98%, dispatch ready 17:30",   level: "success" },
  { site: "Portfolio",              msg: "Fleet availability 98.3% — SLA target maintained",    level: "success" },
  { site: "Portfolio",              msg: "Carbon offset 48.6 K tCO₂ cumulative today",          level: "info"    },
  { site: "MBR Solar Park",         msg: "SCADA comms restored after 4-min connectivity drop",  level: "success" },
  { site: "Ibri Solar Station",     msg: "TX-002 temp 48°C — within normal operating range",    level: "info"    },
  { site: "Duqm Renewable Park",    msg: "Scheduled maintenance TX-001 complete — back online", level: "success" },
];

let _evtCounter = 0;
let _lastEvtIdx  = -1;

function _makeEvent(): LiveEvent {
  let idx: number;
  do { idx = Math.floor(Math.random() * _LIVE_EVENT_POOL.length); }
  while (idx === _lastEvtIdx && _LIVE_EVENT_POOL.length > 1);
  _lastEvtIdx = idx;
  const e  = _LIVE_EVENT_POOL[idx];
  const ts = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return { ...e, id: ++_evtCounter, ts };
}

/** Returns a live-scrolling list of SCADA events; a new event is prepended every tickMs */
export function useLiveEvents(tickMs = 6000, initialCount = 10): LiveEvent[] {
  const [events, setEvents] = useState<LiveEvent[]>(() =>
    Array.from({ length: initialCount }, _makeEvent),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setEvents((prev) => [_makeEvent(), ...prev].slice(0, 40));
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return events;
}
