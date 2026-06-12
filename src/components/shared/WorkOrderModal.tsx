import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { WorkOrder } from "../../data/mockData";
import { saveWO, generateWOId } from "../../utils/woStore";

export interface WOPreset {
  title: string;
  asset: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  description: string;
  steps?: string[];
  type?: "Corrective" | "Preventive" | "Emergency";
  siteId?: string;
}

interface Props {
  open: boolean;
  preset: WOPreset | null;
  onClose: () => void;
  onSubmit?: (wo: WorkOrder) => void;
}

const ASSIGNEES = ["Raj Kumar", "Priya Sharma", "Carlos Mendez", "Ahmed Hassan", "J. Smith", "M. Ali"];

function today(offset = 7) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function WorkOrderModal({ open, preset, onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    title: "", asset: "", type: "Corrective" as WOPreset["type"],
    priority: "High" as WOPreset["priority"], assignee: ASSIGNEES[0],
    dueDate: today(), description: "", notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Sync preset into form when modal opens
  useEffect(() => {
    if (open && preset) {
      setForm(f => ({
        ...f,
        title: preset.title,
        asset: preset.asset,
        priority: preset.priority,
        type: preset.type ?? "Corrective",
        description: preset.description,
        notes: preset.steps ? preset.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : "",
      }));
      setSubmitted(false);
    }
  }, [open, preset]);

  if (!open) return null;

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wo: WorkOrder = {
      id:               generateWOId(),
      title:            form.title,
      siteId:           preset?.siteId ?? "unknown",
      asset:            form.asset,
      type:             form.type as WorkOrder["type"],
      status:           "Open",
      priority:         form.priority as WorkOrder["priority"],
      assignee:         form.assignee,
      dueDate:          form.dueDate,
      description:      form.description,
      estimatedHours:   4,
      createdAt:        new Date().toISOString().slice(0, 10),
    };
    saveWO(wo);
    onSubmit?.(wo);
    setSubmitted(true);
  }

  return createPortal(
    <div className="wo-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wo-modal">
        <div className="wo-modal-hdr">
          <span className="wo-modal-title">🔧 Create Work Order</span>
          {preset?.asset && <span className="wo-modal-asset">{preset.asset}</span>}
          <button className="wo-close" onClick={onClose}>✕</button>
        </div>

        {submitted ? (
          <div className="wo-success">
            <div className="wo-success-icon">✓</div>
            <div className="wo-success-title">Work Order Created</div>
            <div className="wo-success-sub">
              <strong>{form.title}</strong> has been submitted and assigned to {form.assignee}.
            </div>
            <div className="wo-success-id">WO-{Date.now().toString().slice(-6)}</div>
            <button className="wo-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="wo-form" onSubmit={handleSubmit}>
            <div className="wo-field-row">
              <div className="wo-field wo-field-full">
                <label>Title</label>
                <input value={form.title} onChange={e => set("title", e.target.value)} required />
              </div>
            </div>

            <div className="wo-field-row">
              <div className="wo-field">
                <label>Asset</label>
                <input value={form.asset} onChange={e => set("asset", e.target.value)} required />
              </div>
              <div className="wo-field">
                <label>Type</label>
                <select value={form.type} onChange={e => set("type", e.target.value)}>
                  <option>Corrective</option>
                  <option>Preventive</option>
                  <option>Emergency</option>
                </select>
              </div>
            </div>

            <div className="wo-field-row">
              <div className="wo-field">
                <label>Priority</label>
                <select value={form.priority} onChange={e => set("priority", e.target.value)}>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="wo-field">
                <label>Assignee</label>
                <select value={form.assignee} onChange={e => set("assignee", e.target.value)}>
                  {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div className="wo-field">
                <label>Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
              </div>
            </div>

            <div className="wo-field-row">
              <div className="wo-field wo-field-full">
                <label>Description (AI pre-filled)</label>
                <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)} />
              </div>
            </div>

            <div className="wo-field-row">
              <div className="wo-field wo-field-full">
                <label>Actionable Steps (AI pre-filled)</label>
                <textarea rows={4} value={form.notes} onChange={e => set("notes", e.target.value)} />
              </div>
            </div>

            <div className="wo-form-footer">
              <button type="button" className="wo-cancel-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="wo-submit-btn">Create Work Order</button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
