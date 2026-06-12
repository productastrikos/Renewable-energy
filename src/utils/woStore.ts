import { WorkOrder } from "../data/mockData";

const KEY = "re-dashboard-work-orders";

export function getStoredWOs(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkOrder[]) : [];
  } catch {
    return [];
  }
}

export function saveWO(wo: WorkOrder): void {
  const existing = getStoredWOs();
  localStorage.setItem(KEY, JSON.stringify([wo, ...existing]));
  window.dispatchEvent(new Event("wo-store-updated"));
}

export function generateWOId(): string {
  const existing = getStoredWOs();
  const num = (existing.length + 1).toString().padStart(4, "0");
  return `WO-${new Date().getFullYear()}-USR-${num}`;
}
