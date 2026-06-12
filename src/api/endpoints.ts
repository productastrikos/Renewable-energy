import { api } from "./client";
import type {
  SiteData, SiteHierarchy, WorkOrder, Technician,
  AIFinding, PORTFOLIO_KPI as PortfolioKpiType, ASSETS,
} from "../data/mockData";

export type AssetItem = (typeof ASSETS)[number];

// Re-export for consumers
export type { SiteData, SiteHierarchy, WorkOrder, Technician, AIFinding };

export type PortfolioKpi = typeof import("../data/mockData").PORTFOLIO_KPI;

export type TelemetryPoint    = { time: string; actual: number; forecast?: number };
export type AvailabilityPoint = { time: string; value: number };
export type IrradiancePoint   = { time: string; generation: number; irradiance: number };
export type GenerationPeriod  = "24h" | "7d" | "30d";

export interface AdvisorAlarm {
  id: string;
  sev: "CRITICAL" | "HIGH" | "WARNING";
  title: string;
  asset: string;
  site: string;
  time: string;
  protocol: string;
  confidence: number;
  analysis: string;
  standards: string[];
  immediate: string[];
  preventive: string[];
}

// ── Portfolio ──────────────────────────────────────────────────────────────────
export const fetchPortfolioKpi = () =>
  api.get<PortfolioKpi>("/portfolio/kpi");

// ── Sites ──────────────────────────────────────────────────────────────────────
export const fetchSites = (filters?: {
  region?: string; type?: string; status?: string;
}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<SiteData[]>(`/sites${q ? `?${q}` : ""}`);
};

export const fetchSite       = (id: string) => api.get<SiteData>(`/sites/${id}`);
export const fetchHierarchy  = (id: string) => api.get<SiteHierarchy>(`/sites/${id}/hierarchy`);
export const fetchSiteWorkOrders  = (id: string, status?: string) =>
  api.get<WorkOrder[]>(`/sites/${id}/work-orders${status ? `?status=${status}` : ""}`);
export const fetchSiteAiFindings  = (id: string) => api.get<AIFinding[]>(`/sites/${id}/ai-findings`);
export const fetchSiteAiAlarms    = (id: string) => api.get<AdvisorAlarm[]>(`/sites/${id}/ai-alarms`);

// ── Telemetry ──────────────────────────────────────────────────────────────────
export const fetchGeneration = (siteId: string, period: GenerationPeriod = "24h") =>
  api.get<TelemetryPoint[]>(`/telemetry/${siteId}/generation?period=${period}`);

export const fetchAvailability = (siteId: string) =>
  api.get<AvailabilityPoint[]>(`/telemetry/${siteId}/availability`);

export const fetchIrradiance = (siteId: string) =>
  api.get<IrradiancePoint[]>(`/telemetry/${siteId}/irradiance`);

// ── Work Orders ────────────────────────────────────────────────────────────────
export const fetchWorkOrders = (filters?: {
  siteId?: string; status?: string; priority?: string; type?: string;
}) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<WorkOrder[]>(`/work-orders${q ? `?${q}` : ""}`);
};

export const fetchWorkOrder = (id: string)  => api.get<WorkOrder>(`/work-orders/${id}`);
export const createWorkOrder = (body: Partial<WorkOrder>) => api.post<WorkOrder>("/work-orders", body);
export const updateWorkOrder = (id: string, body: Partial<WorkOrder>) =>
  api.patch<WorkOrder>(`/work-orders/${id}`, body);

// ── Technicians ────────────────────────────────────────────────────────────────
export const fetchTechnicians = (filters?: { status?: string; site?: string }) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<Technician[]>(`/technicians${q ? `?${q}` : ""}`);
};

// ── Assets ────────────────────────────────────────────────────────────────────
export const fetchAssets = (filters?: { status?: string; type?: string }) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<AssetItem[]>(`/assets${q ? `?${q}` : ""}`);
};

// ── AI Findings ────────────────────────────────────────────────────────────────
export const fetchAiFindings = (filters?: { priority?: string; site?: string }) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<AIFinding[]>(`/ai-findings${q ? `?${q}` : ""}`);
};

// ── SOPs ───────────────────────────────────────────────────────────────────────
export interface Sop {
  id: string;
  title: string;
  category: string;
  applicableTo: string[];
  alarmCode: string | null;
  revision: string;
  lastRevised: string;
  revisedBy: string;
  status: "Active" | "Draft" | "Archived";
  steps: string[];
  warnings: string[];
  relatedAlarms: string[];
  attachments: string[];
}

export const fetchSops = (filters?: { category?: string; applicableTo?: string }) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(filters ?? {}).filter(([, v]) => v))
  ).toString();
  return api.get<Sop[]>(`/sops${q ? `?${q}` : ""}`);
};

export const fetchSop = (id: string) => api.get<Sop>(`/sops/${id}`);

export const createSop = (data: Omit<Sop, "id" | "lastRevised">) =>
  api.post<Sop>("/sops", data);

export const updateSop = (id: string, data: Partial<Sop>) =>
  api.put<Sop>(`/sops/${id}`, data);

export const deleteSop = (id: string) =>
  api.delete<{ ok: boolean }>(`/sops/${id}`);
