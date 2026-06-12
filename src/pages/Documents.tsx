import { useState, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { fetchSops, createSop, updateSop, deleteSop, type Sop } from "../api/endpoints";

// ─── helpers ──────────────────────────────────────────────────────────────────
const CATEGORIES = ["Emergency", "Grid Fault Response", "Start-up / Shutdown", "Maintenance", "Safety", "Other"];
const SITE_TYPES = ["Solar", "Wind", "BESS", "Hybrid", "Hydro"];

const CAT_COLOR: Record<string, string> = {
  "Emergency":          "#ef4444",
  "Grid Fault Response":"#f59e0b",
  "Start-up / Shutdown":"#3b82f6",
  "Maintenance":        "#14b8a6",
  "Safety":             "#a78bfa",
  "Other":              "#94a3b8",
};

function catStyle(cat: string): React.CSSProperties {
  const c = CAT_COLOR[cat] ?? "#94a3b8";
  return { fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em",
    padding:"2px 7px", borderRadius:4, background:c+"22", color:c, border:`1px solid ${c}44` };
}

const BLANK: Omit<Sop, "id" | "lastRevised"> = {
  title: "", category: "Emergency", applicableTo: [], alarmCode: null,
  revision: "R1", revisedBy: "", status: "Active",
  steps: [""], warnings: [], relatedAlarms: [], attachments: [],
};

// ─── SOP detail modal ─────────────────────────────────────────────────────────
function SopModal({ sop, onClose, onSaved, onDeleted }: {
  sop: Sop | "new"; onClose: () => void;
  onSaved: () => void; onDeleted?: () => void;
}) {
  const isNew = sop === "new";
  const [form, setForm] = useState<Omit<Sop, "id" | "lastRevised">>(
    isNew ? { ...BLANK } : {
      title: sop.title, category: sop.category, applicableTo: [...sop.applicableTo],
      alarmCode: sop.alarmCode, revision: sop.revision, revisedBy: sop.revisedBy,
      status: sop.status, steps: [...sop.steps], warnings: [...sop.warnings],
      relatedAlarms: [...sop.relatedAlarms], attachments: [...sop.attachments],
    }
  );
  const [editing, setEditing] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setLine = (arr: "steps" | "warnings" | "relatedAlarms", i: number, v: string) =>
    setForm(f => { const a = [...f[arr] as string[]]; a[i] = v; return { ...f, [arr]: a }; });

  const addLine  = (arr: "steps" | "warnings" | "relatedAlarms") =>
    setForm(f => ({ ...f, [arr]: [...(f[arr] as string[]), ""] }));

  const delLine  = (arr: "steps" | "warnings" | "relatedAlarms", i: number) =>
    setForm(f => { const a = [...f[arr] as string[]]; a.splice(i, 1); return { ...f, [arr]: a }; });

  const toggleType = (t: string) =>
    setField("applicableTo", form.applicableTo.includes(t)
      ? form.applicableTo.filter(x => x !== t)
      : [...form.applicableTo, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) await createSop(form);
      else        await updateSop((sop as Sop).id, form);
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!isNew) { await deleteSop((sop as Sop).id); onDeleted?.(); onClose(); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1900 }} />
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(740px,95vw)", maxHeight:"90vh", overflowY:"auto",
        background:"var(--ds-panel)", borderRadius:16, zIndex:1950,
        boxShadow:"0 8px 30px rgba(0,0,0,0.28)", display:"flex", flexDirection:"column",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1 }}>
            {editing ? (
              <input value={form.title} onChange={e => setField("title", e.target.value)}
                placeholder="SOP Title…"
                style={{ width:"100%", background:"var(--ds-surface-soft)", border:"1px solid rgba(255,255,255,0.12)",
                  borderRadius:8, padding:"6px 10px", fontSize:15, fontWeight:700,
                  color:"var(--ds-text)", outline:"none" }} />
            ) : (
              <div style={{ fontSize:15, fontWeight:700, color:"var(--ds-text)" }}>
                {(sop as Sop).title}
              </div>
            )}
            {!isNew && !editing && (
              <div style={{ fontSize:11, color:"var(--ds-text-faint)", marginTop:3 }}>
                {(sop as Sop).revision} · Revised {(sop as Sop).lastRevised} by {(sop as Sop).revisedBy}
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {!isNew && !editing && (
              <button onClick={() => setEditing(true)} style={btnStyle("#3b7de8")}>Edit</button>
            )}
            {editing && (
              <button onClick={handleSave} disabled={saving || !form.title.trim()} style={btnStyle("#22c55e")}>
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            {editing && !isNew && (
              <button onClick={() => setEditing(false)} style={btnStyle("rgba(255,255,255,0.12)")}>Cancel</button>
            )}
            {!isNew && !editing && (
              <button onClick={() => setConfirmDel(true)} style={btnStyle("#ef4444")}>Delete</button>
            )}
            <button onClick={onClose} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.12)",
              color:"var(--ds-text-muted)", borderRadius:8, width:28, height:28, cursor:"pointer",
              fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
          </div>
        </div>

        {confirmDel && (
          <div style={{ margin:"12px 20px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.35)",
            borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"#ef4444", flex:1 }}>Delete this SOP permanently?</span>
            <button onClick={handleDelete} style={btnStyle("#ef4444")}>Yes, Delete</button>
            <button onClick={() => setConfirmDel(false)} style={btnStyle("rgba(255,255,255,0.12)")}>Cancel</button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* Meta row */}
          {editing ? (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Field label="Category">
                <select value={form.category} onChange={e => setField("category", e.target.value)} style={selectStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Revision">
                <input value={form.revision} onChange={e => setField("revision", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Revised By">
                <input value={form.revisedBy} onChange={e => setField("revisedBy", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Alarm Code (optional)">
                <input value={form.alarmCode ?? ""} onChange={e => setField("alarmCode", e.target.value || null)} style={inputStyle} placeholder="e.g. INV-FAULT" />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => setField("status", e.target.value as Sop["status"])} style={selectStyle}>
                  {["Active","Draft","Archived"].map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              <span style={catStyle((sop as Sop).category)}>{(sop as Sop).category}</span>
              {(sop as Sop).alarmCode && (
                <span style={{ fontSize:10, color:"var(--ds-text-faint)", background:"var(--ds-surface-soft)",
                  padding:"2px 8px", borderRadius:4 }}>Alarm: {(sop as Sop).alarmCode}</span>
              )}
              {(sop as Sop).applicableTo.map(t => (
                <span key={t} style={{ fontSize:10, color:"var(--ds-text-faint)", background:"var(--ds-surface-soft)",
                  padding:"2px 8px", borderRadius:4 }}>{t}</span>
              ))}
            </div>
          )}

          {/* Applicable to */}
          {editing && (
            <Field label="Applicable To">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {SITE_TYPES.map(t => (
                  <button key={t} onClick={() => toggleType(t)} style={{
                    padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:11,
                    border:"1px solid rgba(255,255,255,0.15)",
                    background: form.applicableTo.includes(t) ? "rgba(91,141,224,0.25)" : "transparent",
                    color: form.applicableTo.includes(t) ? "#5b8de0" : "var(--ds-text-faint)",
                  }}>{t}</button>
                ))}
              </div>
            </Field>
          )}

          {/* Steps */}
          <div>
            <div style={sectionLabel}>Procedure Steps</div>
            {(editing ? form.steps : (sop as Sop).steps).map((step, i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ minWidth:22, height:22, borderRadius:"50%", background:"rgba(91,141,224,0.2)",
                  color:"#5b8de0", fontSize:11, fontWeight:700, display:"flex", alignItems:"center",
                  justifyContent:"center", flexShrink:0, marginTop:1 }}>{i + 1}</span>
                {editing ? (
                  <>
                    <input value={step} onChange={e => setLine("steps", i, e.target.value)}
                      style={{ ...inputStyle, flex:1 }} />
                    <button onClick={() => delLine("steps", i)} style={{ color:"#ef4444", background:"transparent",
                      border:"none", cursor:"pointer", fontSize:16, padding:"0 4px", marginTop:1 }}>×</button>
                  </>
                ) : (
                  <span style={{ fontSize:12, color:"var(--ds-text)", lineHeight:1.5 }}>{step}</span>
                )}
              </div>
            ))}
            {editing && (
              <button onClick={() => addLine("steps")} style={{ ...btnStyle("rgba(255,255,255,0.08)"), fontSize:11, marginTop:4 }}>
                + Add Step
              </button>
            )}
          </div>

          {/* Warnings */}
          {((editing ? form.warnings : (sop as Sop).warnings).length > 0 || editing) && (
            <div>
              <div style={sectionLabel}>Warnings & Cautions</div>
              {(editing ? form.warnings : (sop as Sop).warnings).map((w, i) => (
                <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                  <span style={{ color:"#f59e0b", fontSize:13, marginTop:1 }}>⚠</span>
                  {editing ? (
                    <>
                      <input value={w} onChange={e => setLine("warnings", i, e.target.value)}
                        style={{ ...inputStyle, flex:1 }} />
                      <button onClick={() => delLine("warnings", i)} style={{ color:"#ef4444", background:"transparent",
                        border:"none", cursor:"pointer", fontSize:16 }}>×</button>
                    </>
                  ) : (
                    <span style={{ fontSize:12, color:"#f59e0b", lineHeight:1.5 }}>{w}</span>
                  )}
                </div>
              ))}
              {editing && (
                <button onClick={() => addLine("warnings")} style={{ ...btnStyle("rgba(255,255,255,0.08)"), fontSize:11, marginTop:2 }}>
                  + Add Warning
                </button>
              )}
            </div>
          )}

          {/* Related alarms */}
          {((editing ? form.relatedAlarms : (sop as Sop).relatedAlarms).length > 0 || editing) && (
            <div>
              <div style={sectionLabel}>Related Alarm Codes</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom: editing ? 8 : 0 }}>
                {(editing ? form.relatedAlarms : (sop as Sop).relatedAlarms).map((a, i) => (
                  <span key={i} style={{ display:"flex", alignItems:"center", gap:4,
                    background:"var(--ds-surface-soft)", borderRadius:4, padding:"2px 8px" }}>
                    <span style={{ fontSize:11, color:"var(--ds-text-faint)" }}>{a}</span>
                    {editing && (
                      <button onClick={() => delLine("relatedAlarms", i)} style={{ color:"#ef4444",
                        background:"transparent", border:"none", cursor:"pointer", fontSize:12, padding:0 }}>×</button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <button onClick={() => addLine("relatedAlarms")} style={{ ...btnStyle("rgba(255,255,255,0.08)"), fontSize:11 }}>
                  + Add Alarm Code
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, border: "none", borderRadius: 6, padding: "5px 12px",
  fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer",
});
const inputStyle: React.CSSProperties = {
  background: "var(--ds-surface-soft)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--ds-text)",
  outline: "none", width: "100%",
};
const selectStyle: React.CSSProperties = { ...inputStyle };
const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
  color: "var(--ds-text-muted)", marginBottom: 8,
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ds-text-faint)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Documents() {
  const [catFilter, setCatFilter]   = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<Sop | "new" | null>(null);
  const [tick, setTick]             = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const { data: sopData, loading } = useApi(
    () => fetchSops(),
    [tick]
  );
  const sops = sopData ?? [];

  const filtered = sops.filter(s => {
    if (catFilter !== "All" && s.category !== catFilter) return false;
    if (typeFilter !== "All" && !s.applicableTo.includes(typeFilter)) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
        !(s.alarmCode ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cats = ["All", ...CATEGORIES];

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {selected && (
        <SopModal
          sop={selected}
          onClose={() => setSelected(null)}
          onSaved={refresh}
          onDeleted={refresh}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ds-text)", margin: 0 }}>
            Standard Operating Procedures
          </h1>
          <p style={{ fontSize: 12, color: "var(--ds-text-faint)", margin: "2px 0 0" }}>
            {sops.length} procedures · Stored on server · Persists across reloads
          </p>
        </div>
        <button onClick={() => setSelected("new")} style={{ ...btnStyle("#3b7de8"), marginLeft: "auto", padding: "7px 16px", fontSize: 12 }}>
          + New SOP
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search title or alarm code…"
          style={{ ...inputStyle, width: 220 }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 600,
              border: `1px solid ${catFilter === c ? (CAT_COLOR[c] ?? "#5b8de0") + "66" : "rgba(255,255,255,0.1)"}`,
              background: catFilter === c ? (CAT_COLOR[c] ?? "#5b8de0") + "22" : "transparent",
              color: catFilter === c ? (CAT_COLOR[c] ?? "#5b8de0") : "var(--ds-text-faint)",
            }}>{c}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["All", ...SITE_TYPES].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)",
              background: typeFilter === t ? "rgba(91,141,224,0.2)" : "transparent",
              color: typeFilter === t ? "#5b8de0" : "var(--ds-text-faint)",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* SOP cards */}
      {loading ? (
        <div style={{ color: "var(--ds-text-faint)", fontSize: 13 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--ds-text-faint)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
          No SOPs found. Click <strong>+ New SOP</strong> to create one.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map(sop => (
            <div key={sop.id}
              onClick={() => setSelected(sop)}
              style={{
                background: "var(--ds-panel)", borderRadius: 10,
                borderLeft: `3px solid ${CAT_COLOR[sop.category] ?? "#94a3b8"}`,
                padding: "12px 14px", cursor: "pointer", transition: "transform 0.14s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ds-text)", lineHeight: 1.3 }}>{sop.title}</div>
                  <div style={{ fontSize: 10, color: "var(--ds-text-faint)", marginTop: 2 }}>
                    {sop.revision} · {sop.lastRevised} · {sop.revisedBy}
                  </div>
                </div>
                <span style={catStyle(sop.category)}>{sop.category}</span>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {sop.applicableTo.map(t => (
                  <span key={t} style={{ fontSize: 9, color: "var(--ds-text-faint)", background: "var(--ds-surface-soft)", padding: "1px 6px", borderRadius: 3 }}>{t}</span>
                ))}
                {sop.alarmCode && (
                  <span style={{ fontSize: 9, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "1px 6px", borderRadius: 3 }}>
                    Alarm: {sop.alarmCode}
                  </span>
                )}
              </div>

              <div style={{ fontSize: 11, color: "var(--ds-text-faint)" }}>
                {sop.steps.length} steps
                {sop.warnings.length > 0 && ` · ${sop.warnings.length} warning(s)`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
