import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";

// ─── Event Log mock data ──────────────────────────────────────────────────────
interface EventRow {
  id: string; ts: string; type: string;
  asset: string; desc: string; oldVal: string; newVal: string;
}

const MOCK_EVENTS: EventRow[] = [
  { id:"E01", ts:"2026-04-07 17:14:22", type:"ALARM",      asset:"INV-B01",     desc:"DC Bus Overvoltage ALARM ON",                        oldVal:"Normal",    newVal:"Alarm"     },
  { id:"E02", ts:"2026-04-07 17:14:22", type:"PROTECTION", asset:"INV-B01",     desc:"DC Overvoltage Protection TRIP",                     oldVal:"Ready",     newVal:"Tripped"   },
  { id:"E03", ts:"2026-04-07 17:14:22", type:"CONTROL",    asset:"INV-B01",     desc:"Inverter B01 STOP command executed",                 oldVal:"Running",   newVal:"Stopped"   },
  { id:"E04", ts:"2026-04-07 17:11:05", type:"ALARM",      asset:"SMB-A02",     desc:"String Current Deviation ALARM ON",                  oldVal:"Normal",    newVal:"Alarm"     },
  { id:"E05", ts:"2026-04-07 17:08:47", type:"ALARM",      asset:"BESS-SEWA",   desc:"BESS SOC Below 20% ALARM ON",                        oldVal:"Normal",    newVal:"Critical"  },
  { id:"E06", ts:"2026-04-07 17:08:47", type:"CONTROL",    asset:"BESS-SEWA",   desc:"BESS Discharge Rate Limited to 0.5C [AUTO]",         oldVal:"1.0C",      newVal:"0.5C"      },
  { id:"E07", ts:"2026-04-07 16:58:12", type:"PROTECTION", asset:"132KV-CB-01", desc:"Trip Coil Supervision ALARM ON",                     oldVal:"Healthy",   newVal:"Open"      },
  { id:"E08", ts:"2026-04-07 16:55:30", type:"ALARM",      asset:"INV-A02",     desc:"Grid Frequency Deviation ALARM ON",                  oldVal:"Normal",    newVal:"Warning"   },
  { id:"E09", ts:"2026-04-07 16:55:28", type:"SYSTEM",     asset:"GRID-FREQ",   desc:"Grid Frequency 49.82 Hz (below 49.9 Hz threshold)",  oldVal:"50.01",     newVal:"49.82"     },
  { id:"E10", ts:"2026-04-07 16:54:55", type:"CONTROL",    asset:"PPC-01",      desc:"PPC Frequency Response Mode ACTIVATED [AUTO]",       oldVal:"Normal",    newVal:"Freq Resp" },
  { id:"E11", ts:"2026-04-07 16:42:11", type:"ALARM",      asset:"PQM-1",       desc:"THD Voltage > 5% ALARM ON",                          oldVal:"Normal",    newVal:"Warning"   },
  { id:"E12", ts:"2026-04-07 16:30:00", type:"CONTROL",    asset:"WTG-02",      desc:"WTG-02 Maintenance Stop INITIATED [J.SMITH]",        oldVal:"Running",   newVal:"Maint."    },
  { id:"E13", ts:"2026-04-07 16:15:44", type:"COMMS",      asset:"DNP3-RTU-3",  desc:"DNP3 Communication TIMEOUT",                         oldVal:"Connected", newVal:"Timeout"   },
  { id:"E14", ts:"2026-04-07 16:00:00", type:"SYSTEM",     asset:"SCADA-GW",    desc:"Historian archiving cycle completed – 12,847 tags",  oldVal:"–",         newVal:"Archived"  },
  { id:"E15", ts:"2026-04-07 15:45:22", type:"CONTROL",    asset:"INV-A01",     desc:"Active Power Setpoint changed to 95 MW [M.ALI]",     oldVal:"90 MW",     newVal:"95 MW"     },
  { id:"E16", ts:"2026-04-07 15:30:10", type:"CONTROL",    asset:"BESS-SEWA",   desc:"BESS Charge Mode ACTIVATED (off-peak) [AUTO]",       oldVal:"Idle",      newVal:"Charging"  },
];

// ─── SOE mock data ────────────────────────────────────────────────────────────
interface SoeRow {
  id: string; ts: string; ms: string; site: string;
  bay: string; asset: string; signal: string;
  change: string; src: string; qual: string;
}

const MOCK_SOE: SoeRow[] = [
  { id:"S01", ts:"2026-04-07 17:14:22", ms:"347.000", site:"Al Dhafra",   bay:"Bay 2", asset:"INV-B01",     signal:"DC Bus Overvoltage",        change:"ON",     src:"IED",    qual:"Good" },
  { id:"S02", ts:"2026-04-07 17:14:22", ms:"350.000", site:"Al Dhafra",   bay:"Bay 2", asset:"INV-B01",     signal:"DC Overvoltage Protection", change:"TRIP",   src:"IED",    qual:"Good" },
  { id:"S03", ts:"2026-04-07 17:14:22", ms:"352.000", site:"Al Dhafra",   bay:"Bay 2", asset:"CB-B01",      signal:"Circuit Breaker",           change:"OPEN",   src:"IED",    qual:"Good" },
  { id:"S04", ts:"2026-04-07 17:14:22", ms:"355.000", site:"Al Dhafra",   bay:"Bay 2", asset:"INV-B01",     signal:"Inverter Running",          change:"OFF",    src:"IED",    qual:"Good" },
  { id:"S05", ts:"2026-04-07 17:14:22", ms:"400.000", site:"Al Dhafra",   bay:"Bay 2", asset:"PPC-01",      signal:"Frequency Response Mode",   change:"ON",     src:"SCADA",  qual:"Good" },
  { id:"S06", ts:"2026-04-07 16:58:12", ms:"3.000",   site:"DEWA Sub",    bay:"132kV", asset:"132KV-CB-01", signal:"Trip Coil Supervision",     change:"ON",     src:"IED",    qual:"Good" },
  { id:"S07", ts:"2026-04-07 16:55:30", ms:"221.000", site:"Al Dhafra",   bay:"Grid",  asset:"GRID-FREQ",   signal:"Under Frequency Alarm",     change:"ON",     src:"RTU",    qual:"Good" },
  { id:"S08", ts:"2026-04-07 16:55:28", ms:"100.000", site:"Al Dhafra",   bay:"Grid",  asset:"PPC-01",      signal:"Frequency Response Pickup", change:"PICKUP", src:"IED",    qual:"Good" },
  { id:"S09", ts:"2026-04-07 16:42:11", ms:"782.000", site:"Al Dhafra",   bay:"MV Sub",asset:"PQM-1",       signal:"THD Voltage > 5%",          change:"ON",     src:"IED",    qual:"Good" },
  { id:"S10", ts:"2026-04-07 16:30:00", ms:"0.000",   site:"Masdar Wind", bay:"WTG",   asset:"WTG-02",      signal:"Maintenance Stop",          change:"ON",     src:"MANUAL", qual:"Good" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  ALARM:"#ef4444", PROTECTION:"#f97316", CONTROL:"#14b8a6", SYSTEM:"#38bdf8", COMMS:"#f59e0b",
};

const CHANGE_STYLE: Record<string, { bg: string; color: string }> = {
  ON:     { bg:"#ef444433", color:"#ef4444" },
  OFF:    { bg:"#44444433", color:"#9ca3af" },
  TRIP:   { bg:"#f9731633", color:"#f97316" },
  OPEN:   { bg:"#f9731633", color:"#f97316" },
  PICKUP: { bg:"#eab30833", color:"#eab308" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function EventLogTab({ events, search, setSearch, typeFilter, setTypeFilter }: {
  events: EventRow[];
  search: string; setSearch: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
}) {
  const filtered = useMemo(() => events.filter(e => {
    if (typeFilter !== "All Types" && e.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!e.asset.toLowerCase().includes(q) && !e.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [events, search, typeFilter]);

  return (
    <>
      <div className="ae-filter-row">
        <div className="ae-search-wrap">
          <span className="ae-search-ico">⌕</span>
          <input className="ae-search" placeholder="Search asset, description..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="ae-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {["All Types","ALARM","PROTECTION","CONTROL","SYSTEM","COMMS"].map(v => <option key={v}>{v}</option>)}
        </select>
        <span className="ae-count">{filtered.length} events</span>
      </div>
      <div className="ae-table-wrap">
        <table className="ae-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>TYPE</th>
              <th>ASSET</th>
              <th>DESCRIPTION</th>
              <th>OLD → NEW</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="ae-row">
                <td className="ae-ts">
                  <span className="ae-ts-icon">⏱</span>{e.ts}
                </td>
                <td>
                  <span className="ae-type-chip"
                    style={{ color: TYPE_COLOR[e.type] ?? "#e5e7eb", background: (TYPE_COLOR[e.type] ?? "#555") + "22" }}>
                    {e.type === "CONTROL" ? "⚙" : e.type === "ALARM" ? "⚠" : e.type === "PROTECTION" ? "⚡" : e.type === "COMMS" ? "⋯" : "●"} {e.type}
                  </span>
                </td>
                <td className="ae-asset">{e.asset}</td>
                <td className="ae-desc">{e.desc}</td>
                <td className="ae-old-new">
                  <span className="ae-old">{e.oldVal}</span>
                  <span className="ae-arrow">→</span>
                  <span className="ae-new" style={{ color: e.type === "ALARM" || e.type === "PROTECTION" ? "#f87171" : "#86efac" }}>
                    {e.newVal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SoeTab({ rows, search, setSearch }: {
  rows: SoeRow[]; search: string; setSearch: (v: string) => void;
}) {
  const filtered = useMemo(() => rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.asset.toLowerCase().includes(q) || r.signal.toLowerCase().includes(q) || r.site.toLowerCase().includes(q);
  }), [rows, search]);

  return (
    <>
      {/* SOE stats bar */}
      <div className="soe-stats-bar">
        <div className="soe-stat">Total Events <strong className="soe-stat-val">10,042</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Trips <strong className="soe-stat-val soe-danger">2</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Alarms ON <strong className="soe-stat-val soe-warn">5</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Controls <strong className="soe-stat-val">3</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Time Sync <strong className="soe-stat-val soe-ok">GPS ±1µs</strong></div>
      </div>

      <div className="ae-filter-row">
        <div className="ae-search-wrap">
          <span className="ae-search-ico">⌕</span>
          <input className="ae-search" placeholder="Search SOE..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="ae-count">{filtered.length} of {rows.length} events</span>
      </div>

      <div className="ae-table-wrap">
        <table className="ae-table soe-table">
          <thead>
            <tr>
              <th>TIMESTAMP (UTC)</th>
              <th>MS</th>
              <th>SITE</th>
              <th>BAY</th>
              <th>ASSET</th>
              <th>SIGNAL</th>
              <th>CHANGE</th>
              <th>SOURCE</th>
              <th>QUALITY</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const cs = CHANGE_STYLE[r.change] ?? { bg:"#33333344", color:"#9ca3af" };
              return (
                <tr key={r.id} className="ae-row">
                  <td className="ae-ts">{r.ts}</td>
                  <td className="soe-ms">{r.ms}</td>
                  <td className="ae-muted">{r.site}</td>
                  <td className="ae-muted">{r.bay}</td>
                  <td className="ae-asset">{r.asset}</td>
                  <td className="ae-desc">{r.signal}</td>
                  <td>
                    <span className="soe-change-chip" style={{ background: cs.bg, color: cs.color }}>
                      {r.change}
                    </span>
                  </td>
                  <td className="ae-muted">{r.src}</td>
                  <td>
                    <span className="soe-qual-good">● {r.qual}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SiteEventLog() {
  useOutletContext<SiteWorkspaceContext>();
  const [activeTab, setActiveTab]     = useState<"log" | "soe">("log");
  const [logSearch, setLogSearch]     = useState("");
  const [typeFilter, setTypeFilter]   = useState("All Types");
  const [soeSearch, setSoeSearch]     = useState("");

  return (
    <div className="ae-page">
      {/* ── Tab bar + export buttons ── */}
      <div className="ae-topbar" style={{ paddingBottom: 0, borderBottom: "none" }}>
        <div className="evlog-tabs">
          <button
            className={`evlog-tab${activeTab === "log" ? " active" : ""}`}
            onClick={() => setActiveTab("log")}
          >
            Event Log
          </button>
          <button
            className={`evlog-tab${activeTab === "soe" ? " active" : ""}`}
            onClick={() => setActiveTab("soe")}
          >
            SOE (1ms Resolution)
          </button>
        </div>
        {activeTab === "soe" && (
          <div className="soe-badges">
            <span className="soe-badge">IEC 61850 / IEEE 1588 PTP Synchronized</span>
            <span className="soe-badge green">1ms Resolution</span>
          </div>
        )}
        <div style={{ flex:1 }} />
        <button className="ae-action-btn">↓ Export CSV</button>
        <button className="ae-action-btn">↓ Export COMTRADE</button>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "log" ? (
        <EventLogTab
          events={MOCK_EVENTS}
          search={logSearch} setSearch={setLogSearch}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        />
      ) : (
        <SoeTab rows={MOCK_SOE} search={soeSearch} setSearch={setSoeSearch} />
      )}
    </div>
  );
}
