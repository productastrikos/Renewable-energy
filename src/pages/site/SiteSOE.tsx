import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { SiteWorkspaceContext } from "./SiteWorkspace";

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

const CHANGE_STYLE: Record<string, { bg: string; color: string }> = {
  ON:     { bg:"#ef444433", color:"#ef4444" },
  OFF:    { bg:"#44444433", color:"#9ca3af" },
  TRIP:   { bg:"#f9731633", color:"#f97316" },
  OPEN:   { bg:"#f9731633", color:"#f97316" },
  PICKUP: { bg:"#eab30833", color:"#eab308" },
};

export default function SiteSOE() {
  const { site } = useOutletContext<SiteWorkspaceContext>();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => MOCK_SOE.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.asset.toLowerCase().includes(q) || r.signal.toLowerCase().includes(q) || r.site.toLowerCase().includes(q);
  }), [search]);

  return (
    <div className="ae-page">
      {/* ── Header ── */}
      <div className="ae-topbar">
        <span className="ae-page-title">Sequence of Events (SOE)</span>
        <span className="soe-badge">IEC 61850 / IEEE 1588 PTP Synchronized</span>
        <span className="soe-badge green">1ms Resolution</span>
        <div style={{ flex:1 }} />
        <div className="ae-search-wrap" style={{ width: 220 }}>
          <span className="ae-search-ico">⌕</span>
          <input className="ae-search" placeholder="Search SOE..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="ae-action-btn">↓ Export</button>
      </div>

      {/* ── Stats bar ── */}
      <div className="soe-stats-bar">
        <div className="soe-stat">Total Events <strong className="soe-stat-val">{(10000 + site.alarms * 42).toLocaleString()}</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Trips <strong className="soe-stat-val soe-danger">2</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Alarms ON <strong className="soe-stat-val soe-warn">{site.alarms}</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Controls <strong className="soe-stat-val">3</strong></div>
        <div className="soe-stat-sep" />
        <div className="soe-stat">Time Sync <strong className="soe-stat-val soe-ok">GPS ±1µs</strong></div>
      </div>

      {/* ── Table ── */}
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
                  <td><span className="soe-qual-good">● {r.qual}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
