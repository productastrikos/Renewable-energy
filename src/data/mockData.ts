export type SiteType = "Solar" | "Wind" | "Hydro" | "BESS" | "Hybrid";
export type SiteStatus = "Normal" | "Warning" | "Critical";
export type WeatherImpact = "None" | "Low" | "Medium" | "High";

export interface SiteData {
  id: string;
  name: string;
  region: string;
  country: string;
  state: string;
  type: SiteType;
  lat: number;
  lng: number;
  capacity: number;
  generation: number;
  availability: number;
  pr: number;
  health: number;
  alarms: number;
  codYear: number;
  status: SiteStatus;
  weatherImpact: WeatherImpact;
  aiScore: number;
  cuf: number;
  carbonOffset: number;
  revenueToday: number;
}

export const SITES: SiteData[] = [
  {
    id: "solar-farm-a",
    name: "Al Dhafra Solar Park",
    region: "UAE",
    country: "UAE",
    state: "Abu Dhabi",
    type: "Solar",
    lat: 23.1,
    lng: 53.7,
    capacity: 250,
    generation: 195,
    availability: 98.2,
    pr: 84.1,
    health: 92,
    alarms: 2,
    codYear: 2022,
    status: "Normal",
    weatherImpact: "Low",
    aiScore: 94,
    cuf: 78.0,
    carbonOffset: 8200,
    revenueToday: 42500,
  },
  {
    id: "solar-farm-b",
    name: "MBR Solar Park",
    region: "UAE",
    country: "UAE",
    state: "Dubai",
    type: "Solar",
    lat: 24.7,
    lng: 55.3,
    capacity: 180,
    generation: 141,
    availability: 96.8,
    pr: 82.3,
    health: 87,
    alarms: 5,
    codYear: 2021,
    status: "Warning",
    weatherImpact: "Low",
    aiScore: 88,
    cuf: 78.3,
    carbonOffset: 5900,
    revenueToday: 31200,
  },
  {
    id: "wind-farm-a",
    name: "NEOM Wind Farm",
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    state: "Tabuk Province",
    type: "Wind",
    lat: 28.4,
    lng: 36.5,
    capacity: 400,
    generation: 310,
    availability: 97.5,
    pr: 81.0,
    health: 79,
    alarms: 8,
    codYear: 2023,
    status: "Warning",
    weatherImpact: "Medium",
    aiScore: 82,
    cuf: 77.5,
    carbonOffset: 14200,
    revenueToday: 68000,
  },
  {
    id: "bess-site-a",
    name: "Jubail Battery Storage",
    region: "Saudi Arabia",
    country: "Saudi Arabia",
    state: "Eastern Province",
    type: "BESS",
    lat: 27.0,
    lng: 49.7,
    capacity: 120,
    generation: 85,
    availability: 99.1,
    pr: 88.0,
    health: 95,
    alarms: 1,
    codYear: 2023,
    status: "Normal",
    weatherImpact: "None",
    aiScore: 97,
    cuf: 70.8,
    carbonOffset: 3100,
    revenueToday: 18700,
  },
  {
    id: "hybrid-plant",
    name: "Duqm Renewable Park",
    region: "Oman",
    country: "Oman",
    state: "Al Wusta",
    type: "Hybrid",
    lat: 19.7,
    lng: 57.7,
    capacity: 320,
    generation: 248,
    availability: 98.8,
    pr: 86.5,
    health: 91,
    alarms: 3,
    codYear: 2024,
    status: "Normal",
    weatherImpact: "Low",
    aiScore: 93,
    cuf: 77.5,
    carbonOffset: 10800,
    revenueToday: 57300,
  },
  {
    id: "hydro-plant-a",
    name: "Ibri Solar Station",
    region: "Oman",
    country: "Oman",
    state: "Ad Dhahirah",
    type: "Solar",
    lat: 23.2,
    lng: 56.5,
    capacity: 150,
    generation: 148,
    availability: 99.5,
    pr: 98.7,
    health: 97,
    alarms: 0,
    codYear: 2022,
    status: "Normal",
    weatherImpact: "None",
    aiScore: 99,
    cuf: 98.7,
    carbonOffset: 6400,
    revenueToday: 31800,
  },
];

export const PORTFOLIO_KPI = {
  totalCapacityMW: 1420,
  currentGenerationMW: 1127,
  availability: 98.3,
  revenueToday: 249500,
  carbonOffsetToday: 48600,
  openAlarms: 19,
  criticalAlarms: 3,
  workOrders: 8,
  aiConfidence: 94,
};

export type WOStatus = "Open" | "InProgress" | "Overdue" | "Closed";
export type WOPriority = "High" | "Medium" | "Low";
export type WOType = "Corrective" | "Preventive" | "Emergency";

export interface WorkOrder {
  id: string;
  title: string;
  siteId: string;
  asset: string;
  type: WOType;
  status: WOStatus;
  priority: WOPriority;
  assignee: string;
  dueDate: string;
  description: string;
  estimatedHours: number;
  createdAt: string;
}

export const WORK_ORDERS: WorkOrder[] = [
  {
    id: "WO-2024-001",
    title: "INV-14 Over-temperature Investigation",
    siteId: "solar-farm-a",
    asset: "INV-14",
    type: "Corrective",
    status: "Overdue",
    priority: "High",
    assignee: "Raj Kumar",
    dueDate: "2026-06-12",
    description: "Inverter temperature exceeding 88°C threshold. Inspect cooling fans and heat sinks.",
    estimatedHours: 4,
    createdAt: "2026-06-05",
  },
  {
    id: "WO-2024-002",
    title: "Transformer T-12 Cooling Inspection",
    siteId: "solar-farm-a",
    asset: "T-12",
    type: "Corrective",
    status: "Open",
    priority: "High",
    assignee: "Priya Sharma",
    dueDate: "2026-06-16",
    description: "Cooling degradation detected. Inspect oil levels, radiator fins and cooling fans.",
    estimatedHours: 6,
    createdAt: "2026-06-01",
  },
  {
    id: "WO-2024-003",
    title: "String INV-001 Quarterly Inspection",
    siteId: "solar-farm-a",
    asset: "INV-001",
    type: "Preventive",
    status: "InProgress",
    priority: "Medium",
    assignee: "Carlos Mendez",
    dueDate: "2026-06-18",
    description: "Routine quarterly inspection of string combiner boxes and fuses.",
    estimatedHours: 3,
    createdAt: "2026-06-01",
  },
  {
    id: "WO-2024-004",
    title: "Weather Station Calibration",
    siteId: "solar-farm-a",
    asset: "WS-001",
    type: "Preventive",
    status: "Open",
    priority: "Low",
    assignee: "Ahmed Hassan",
    dueDate: "2026-06-15",
    description: "Annual calibration of irradiance sensors and anemometers.",
    estimatedHours: 2,
    createdAt: "2026-06-02",
  },
  {
    id: "WO-2024-005",
    title: "BESS Thermal Management Check",
    siteId: "solar-farm-a",
    asset: "BESS-001",
    type: "Preventive",
    status: "Open",
    priority: "Medium",
    assignee: "Raj Kumar",
    dueDate: "2026-06-12",
    description: "Check thermal management system and cell balancing status.",
    estimatedHours: 3,
    createdAt: "2026-06-02",
  },
  {
    id: "WO-2024-006",
    title: "INV-7 Firmware Update",
    siteId: "solar-farm-a",
    asset: "INV-7",
    type: "Preventive",
    status: "Closed",
    priority: "Low",
    assignee: "Priya Sharma",
    dueDate: "2026-05-30",
    description: "Apply firmware patch v2.4.1 to resolve MPPT efficiency issue.",
    estimatedHours: 1,
    createdAt: "2026-05-25",
  },
  {
    id: "WO-2024-007",
    title: "Panel Cleaning – Block 2",
    siteId: "solar-farm-a",
    asset: "Block-2",
    type: "Preventive",
    status: "InProgress",
    priority: "Medium",
    assignee: "Carlos Mendez",
    dueDate: "2026-06-13",
    description: "Water wash of 480 modules in Block 2. Expected PR improvement of 2.1%.",
    estimatedHours: 8,
    createdAt: "2026-06-02",
  },
  {
    id: "WO-2024-008",
    title: "Switchyard Annual Maintenance",
    siteId: "solar-farm-a",
    asset: "SY-001",
    type: "Preventive",
    status: "Closed",
    priority: "Medium",
    assignee: "Ahmed Hassan",
    dueDate: "2026-05-20",
    description: "Annual maintenance of breakers, isolators and protection relays.",
    estimatedHours: 12,
    createdAt: "2026-05-10",
  },
];

export interface Technician {
  id: string;
  name: string;
  role: string;
  status: "Available" | "On-Site" | "Off-Duty";
  skills: string[];
  currentSite?: string;
  phone: string;
  certifications: string[];
  avatar: string;
}

export const TECHNICIANS: Technician[] = [
  {
    id: "T1",
    name: "Raj Kumar",
    role: "Lead Technician",
    status: "On-Site",
    skills: ["Solar PV", "BESS", "HV Systems"],
    currentSite: "solar-farm-a",
    phone: "+91-98765-43210",
    certifications: ["IEC 62109", "NABCEP PV"],
    avatar: "RK",
  },
  {
    id: "T2",
    name: "Priya Sharma",
    role: "Electrical Engineer",
    status: "On-Site",
    skills: ["Transformer", "Switchgear", "SCADA"],
    currentSite: "solar-farm-a",
    phone: "+91-98765-43211",
    certifications: ["IEC 60204", "SCADA Lvl 2"],
    avatar: "PS",
  },
  {
    id: "T3",
    name: "Carlos Mendez",
    role: "O&M Technician",
    status: "On-Site",
    skills: ["Solar PV", "Inverters", "Module Cleaning"],
    currentSite: "solar-farm-a",
    phone: "+91-98765-43212",
    certifications: ["IEC 62109"],
    avatar: "CM",
  },
  {
    id: "T4",
    name: "Ahmed Hassan",
    role: "Instrument Technician",
    status: "Available",
    skills: ["Weather Stations", "SCADA", "BMS"],
    currentSite: undefined,
    phone: "+91-98765-43213",
    certifications: ["ISA CCST", "IEC 61508"],
    avatar: "AH",
  },
];

export interface AssetNode {
  id: string;
  name: string;
  health: number;
  status: "success" | "warning" | "danger";
  alarms: number;
}

export interface InverterNode extends AssetNode {
  strings: number;
  temp: number;
  output: number;
}

export interface BlockNode {
  id: string;
  name: string;
  inverters: InverterNode[];
}

export interface TransformerNode extends AssetNode {
  temp: number;
  load: number;
}

export interface SiteHierarchy {
  blocks: BlockNode[];
  transformers: TransformerNode[];
  switchyard: AssetNode;
  scada: AssetNode;
  weatherStation?: AssetNode;
  bess?: AssetNode & { capacity: number; soc: number };
}

export const SITE_ASSET_HIERARCHY: Record<string, SiteHierarchy> = {
  // ── Solar Farm A (250 MW, New Mexico) ─────────────────────────────────────
  "solar-farm-a": {
    blocks: [
      {
        id: "B1", name: "Block 1",
        inverters: [
          { id: "INV-001", name: "INV-001", health: 96, status: "success", alarms: 0, strings: 12, temp: 45, output: 98 },
          { id: "INV-002", name: "INV-002", health: 72, status: "warning", alarms: 2, strings: 12, temp: 71, output: 87 },
          { id: "INV-003", name: "INV-003", health: 94, status: "success", alarms: 0, strings: 12, temp: 48, output: 97 },
          { id: "INV-004", name: "INV-004", health: 91, status: "success", alarms: 0, strings: 12, temp: 51, output: 95 },
        ],
      },
      {
        id: "B2", name: "Block 2",
        inverters: [
          { id: "INV-005", name: "INV-005", health: 88, status: "success", alarms: 0, strings: 12, temp: 55, output: 93 },
          { id: "INV-006", name: "INV-006", health: 45, status: "danger",  alarms: 3, strings: 12, temp: 88, output: 61 },
          { id: "INV-007", name: "INV-007", health: 81, status: "warning", alarms: 1, strings: 12, temp: 63, output: 89 },
          { id: "INV-008", name: "INV-008", health: 93, status: "success", alarms: 0, strings: 12, temp: 47, output: 96 },
        ],
      },
      {
        id: "B3", name: "Block 3",
        inverters: [
          { id: "INV-009", name: "INV-009", health: 97, status: "success", alarms: 0, strings: 12, temp: 44, output: 99 },
          { id: "INV-010", name: "INV-010", health: 89, status: "success", alarms: 0, strings: 12, temp: 52, output: 93 },
          { id: "INV-011", name: "INV-011", health: 76, status: "warning", alarms: 1, strings: 12, temp: 69, output: 85 },
          { id: "INV-012", name: "INV-012", health: 92, status: "success", alarms: 0, strings: 12, temp: 49, output: 96 },
        ],
      },
    ],
    transformers: [
      { id: "TX-001", name: "Transformer TX-001", health: 88, status: "success", alarms: 0, temp: 55, load: 82 },
      { id: "TX-002", name: "Transformer TX-002", health: 68, status: "warning", alarms: 1, temp: 72, load: 84 },
      { id: "TX-003", name: "Transformer TX-003", health: 91, status: "success", alarms: 0, temp: 52, load: 78 },
    ],
    switchyard:     { id: "SY-001",    name: "Switchyard SY-001",       health: 95,  status: "success", alarms: 0 },
    weatherStation: { id: "WS-001",    name: "Weather Station WS-01",   health: 99,  status: "success", alarms: 0 },
    scada:          { id: "SCADA-001", name: "SCADA System",             health: 100, status: "success", alarms: 0 },
    bess:           { id: "BESS-001",  name: "BESS Unit 1",              health: 91,  status: "success", alarms: 0, capacity: 50, soc: 76 },
  },

  // ── Solar Farm B (180 MW, Arizona) ────────────────────────────────────────
  "solar-farm-b": {
    blocks: [
      {
        id: "SFB-B1", name: "Block 1",
        inverters: [
          { id: "SFB-INV-001", name: "INV-001", health: 96, status: "success", alarms: 0, strings: 10, temp: 46, output: 97 },
          { id: "SFB-INV-002", name: "INV-002", health: 71, status: "warning", alarms: 2, strings: 10, temp: 73, output: 85 },
          { id: "SFB-INV-003", name: "INV-003", health: 89, status: "success", alarms: 0, strings: 10, temp: 50, output: 94 },
        ],
      },
      {
        id: "SFB-B2", name: "Block 2",
        inverters: [
          { id: "SFB-INV-004", name: "INV-004", health: 83, status: "warning", alarms: 2, strings: 10, temp: 64, output: 88 },
          { id: "SFB-INV-005", name: "INV-005", health: 91, status: "success", alarms: 0, strings: 10, temp: 49, output: 95 },
          { id: "SFB-INV-006", name: "INV-006", health: 87, status: "success", alarms: 0, strings: 10, temp: 53, output: 92 },
        ],
      },
      {
        id: "SFB-B3", name: "Block 3",
        inverters: [
          { id: "SFB-INV-007", name: "INV-007", health: 68, status: "warning", alarms: 1, strings: 10, temp: 77, output: 81 },
          { id: "SFB-INV-008", name: "INV-008", health: 93, status: "success", alarms: 0, strings: 10, temp: 48, output: 96 },
          { id: "SFB-INV-009", name: "INV-009", health: 88, status: "success", alarms: 0, strings: 10, temp: 52, output: 93 },
        ],
      },
    ],
    transformers: [
      { id: "SFB-TX-001", name: "Transformer TX-001", health: 90, status: "success", alarms: 0, temp: 54, load: 80 },
      { id: "SFB-TX-002", name: "Transformer TX-002", health: 84, status: "success", alarms: 0, temp: 58, load: 83 },
      { id: "SFB-TX-003", name: "Transformer TX-003", health: 79, status: "warning", alarms: 0, temp: 66, load: 87 },
    ],
    switchyard:     { id: "SFB-SY-001",    name: "Switchyard SY-001",     health: 93, status: "success", alarms: 0 },
    weatherStation: { id: "SFB-WS-001",    name: "Weather Station WS-01", health: 98, status: "success", alarms: 0 },
    scada:          { id: "SFB-SCADA-001", name: "SCADA System",           health: 99, status: "success", alarms: 0 },
  },

  // ── Wind Farm A (400 MW, Gujarat) ─────────────────────────────────────────
  "wind-farm-a": {
    blocks: [
      {
        id: "WFA-C1", name: "Cluster 1",
        inverters: [
          { id: "WTG-001", name: "Turbine WTG-001", health: 88, status: "success", alarms: 0, strings: 3, temp: 42, output: 91 },
          { id: "WTG-002", name: "Turbine WTG-002", health: 74, status: "warning", alarms: 2, strings: 3, temp: 58, output: 83 },
          { id: "WTG-003", name: "Turbine WTG-003", health: 92, status: "success", alarms: 0, strings: 3, temp: 40, output: 94 },
          { id: "WTG-004", name: "Turbine WTG-004", health: 61, status: "warning", alarms: 2, strings: 3, temp: 67, output: 76 },
          { id: "WTG-005", name: "Turbine WTG-005", health: 95, status: "success", alarms: 0, strings: 3, temp: 38, output: 97 },
        ],
      },
      {
        id: "WFA-C2", name: "Cluster 2",
        inverters: [
          { id: "WTG-006", name: "Turbine WTG-006", health: 82, status: "success", alarms: 0, strings: 3, temp: 44, output: 88 },
          { id: "WTG-007", name: "Turbine WTG-007", health: 55, status: "danger",  alarms: 3, strings: 3, temp: 71, output: 64 },
          { id: "WTG-008", name: "Turbine WTG-008", health: 90, status: "success", alarms: 0, strings: 3, temp: 41, output: 93 },
          { id: "WTG-009", name: "Turbine WTG-009", health: 79, status: "warning", alarms: 1, strings: 3, temp: 52, output: 86 },
          { id: "WTG-010", name: "Turbine WTG-010", health: 87, status: "success", alarms: 0, strings: 3, temp: 43, output: 91 },
        ],
      },
      {
        id: "WFA-C3", name: "Cluster 3",
        inverters: [
          { id: "WTG-011", name: "Turbine WTG-011", health: 93, status: "success", alarms: 0, strings: 3, temp: 39, output: 95 },
          { id: "WTG-012", name: "Turbine WTG-012", health: 68, status: "warning", alarms: 0, strings: 3, temp: 61, output: 79 },
          { id: "WTG-013", name: "Turbine WTG-013", health: 85, status: "success", alarms: 0, strings: 3, temp: 45, output: 90 },
          { id: "WTG-014", name: "Turbine WTG-014", health: 97, status: "success", alarms: 0, strings: 3, temp: 37, output: 98 },
          { id: "WTG-015", name: "Turbine WTG-015", health: 76, status: "warning", alarms: 0, strings: 3, temp: 55, output: 84 },
        ],
      },
      {
        id: "WFA-C4", name: "Cluster 4",
        inverters: [
          { id: "WTG-016", name: "Turbine WTG-016", health: 91, status: "success", alarms: 0, strings: 3, temp: 41, output: 94 },
          { id: "WTG-017", name: "Turbine WTG-017", health: 83, status: "success", alarms: 0, strings: 3, temp: 46, output: 89 },
          { id: "WTG-018", name: "Turbine WTG-018", health: 70, status: "warning", alarms: 0, strings: 3, temp: 59, output: 80 },
        ],
      },
    ],
    transformers: [
      { id: "WFA-TX-001", name: "Transformer TX-001", health: 86, status: "success", alarms: 0, temp: 56, load: 78 },
      { id: "WFA-TX-002", name: "Transformer TX-002", health: 73, status: "warning", alarms: 1, temp: 68, load: 82 },
      { id: "WFA-TX-003", name: "Transformer TX-003", health: 90, status: "success", alarms: 0, temp: 53, load: 75 },
      { id: "WFA-TX-004", name: "Transformer TX-004", health: 88, status: "success", alarms: 0, temp: 57, load: 80 },
    ],
    switchyard:     { id: "WFA-SY-001",    name: "Switchyard SY-001",      health: 91, status: "success", alarms: 0 },
    weatherStation: { id: "WFA-WS-001",    name: "Anemometer Station WS-1", health: 97, status: "success", alarms: 0 },
    scada:          { id: "WFA-SCADA-001", name: "SCADA System",            health: 99, status: "success", alarms: 0 },
  },

  // ── BESS Site A (120 MW, Maharashtra) ─────────────────────────────────────
  "bess-site-a": {
    blocks: [
      {
        id: "BSA-BB1", name: "Battery Bank 1",
        inverters: [
          { id: "PCS-001", name: "PCS Unit PCS-001", health: 97, status: "success", alarms: 0, strings: 8, temp: 30, output: 96 },
          { id: "PCS-002", name: "PCS Unit PCS-002", health: 94, status: "success", alarms: 0, strings: 8, temp: 32, output: 94 },
          { id: "PCS-003", name: "PCS Unit PCS-003", health: 91, status: "success", alarms: 0, strings: 8, temp: 34, output: 92 },
          { id: "PCS-004", name: "PCS Unit PCS-004", health: 72, status: "warning", alarms: 1, strings: 8, temp: 48, output: 83 },
        ],
      },
      {
        id: "BSA-BB2", name: "Battery Bank 2",
        inverters: [
          { id: "PCS-005", name: "PCS Unit PCS-005", health: 98, status: "success", alarms: 0, strings: 8, temp: 29, output: 97 },
          { id: "PCS-006", name: "PCS Unit PCS-006", health: 96, status: "success", alarms: 0, strings: 8, temp: 31, output: 95 },
          { id: "PCS-007", name: "PCS Unit PCS-007", health: 99, status: "success", alarms: 0, strings: 8, temp: 28, output: 99 },
          { id: "PCS-008", name: "PCS Unit PCS-008", health: 95, status: "success", alarms: 0, strings: 8, temp: 33, output: 95 },
        ],
      },
    ],
    transformers: [
      { id: "BSA-TX-001", name: "Transformer TX-001", health: 95, status: "success", alarms: 0, temp: 50, load: 72 },
      { id: "BSA-TX-002", name: "Transformer TX-002", health: 92, status: "success", alarms: 0, temp: 52, load: 74 },
    ],
    switchyard: { id: "BSA-SY-001",    name: "Switchyard SY-001", health: 98, status: "success", alarms: 0 },
    scada:      { id: "BSA-SCADA-001", name: "SCADA / BMS",        health: 100, status: "success", alarms: 0 },
    bess:       { id: "BSA-BESS-001",  name: "Central Battery System", health: 95, status: "success", alarms: 0, capacity: 120, soc: 76 },
  },

  // ── Hybrid Plant A (320 MW, Bavaria) ─────────────────────────────────────
  "hybrid-plant": {
    blocks: [
      {
        id: "HYB-SB1", name: "Solar Block 1",
        inverters: [
          { id: "HYB-INV-001", name: "INV-001", health: 95, status: "success", alarms: 0, strings: 12, temp: 47, output: 97 },
          { id: "HYB-INV-002", name: "INV-002", health: 88, status: "success", alarms: 0, strings: 12, temp: 53, output: 93 },
          { id: "HYB-INV-003", name: "INV-003", health: 79, status: "warning", alarms: 1, strings: 12, temp: 65, output: 87 },
        ],
      },
      {
        id: "HYB-SB2", name: "Solar Block 2",
        inverters: [
          { id: "HYB-INV-004", name: "INV-004", health: 93, status: "success", alarms: 0, strings: 12, temp: 49, output: 96 },
          { id: "HYB-INV-005", name: "INV-005", health: 91, status: "success", alarms: 0, strings: 12, temp: 51, output: 94 },
          { id: "HYB-INV-006", name: "INV-006", health: 86, status: "success", alarms: 0, strings: 12, temp: 56, output: 91 },
        ],
      },
      {
        id: "HYB-WC1", name: "Wind Cluster",
        inverters: [
          { id: "HYB-WTG-001", name: "Turbine WTG-001", health: 97, status: "success", alarms: 0, strings: 3, temp: 38, output: 98 },
          { id: "HYB-WTG-002", name: "Turbine WTG-002", health: 82, status: "success", alarms: 0, strings: 3, temp: 45, output: 89 },
          { id: "HYB-WTG-003", name: "Turbine WTG-003", health: 75, status: "warning", alarms: 2, strings: 3, temp: 56, output: 83 },
          { id: "HYB-WTG-004", name: "Turbine WTG-004", health: 94, status: "success", alarms: 0, strings: 3, temp: 40, output: 96 },
        ],
      },
    ],
    transformers: [
      { id: "HYB-TX-001", name: "Transformer TX-001", health: 91, status: "success", alarms: 0, temp: 54, load: 80 },
      { id: "HYB-TX-002", name: "Transformer TX-002", health: 87, status: "success", alarms: 0, temp: 57, load: 78 },
      { id: "HYB-TX-003", name: "Transformer TX-003", health: 94, status: "success", alarms: 0, temp: 51, load: 76 },
    ],
    switchyard:     { id: "HYB-SY-001",    name: "Switchyard SY-001",     health: 96, status: "success", alarms: 0 },
    weatherStation: { id: "HYB-WS-001",    name: "Weather Station WS-01", health: 98, status: "success", alarms: 0 },
    scada:          { id: "HYB-SCADA-001", name: "SCADA System",           health: 100, status: "success", alarms: 0 },
    bess:           { id: "HYB-BESS-001",  name: "BESS Storage Unit",      health: 90, status: "success", alarms: 0, capacity: 80, soc: 62 },
  },

  // ── Hydro Plant A (150 MW, Baden-Württemberg) ─────────────────────────────
  "hydro-plant-a": {
    blocks: [
      {
        id: "HDA-U1", name: "Powerhouse Unit 1",
        inverters: [
          { id: "GEN-001", name: "Generator GEN-001", health: 98, status: "success", alarms: 0, strings: 14, temp: 42, output: 99 },
          { id: "GEN-002", name: "Generator GEN-002", health: 97, status: "success", alarms: 0, strings: 14, temp: 43, output: 98 },
        ],
      },
      {
        id: "HDA-U2", name: "Powerhouse Unit 2",
        inverters: [
          { id: "GEN-003", name: "Generator GEN-003", health: 96, status: "success", alarms: 0, strings: 14, temp: 44, output: 97 },
          { id: "GEN-004", name: "Generator GEN-004", health: 99, status: "success", alarms: 0, strings: 14, temp: 41, output: 100 },
        ],
      },
      {
        id: "HDA-U3", name: "Powerhouse Unit 3",
        inverters: [
          { id: "GEN-005", name: "Generator GEN-005", health: 95, status: "success", alarms: 0, strings: 14, temp: 46, output: 96 },
          { id: "GEN-006", name: "Generator GEN-006", health: 98, status: "success", alarms: 0, strings: 14, temp: 42, output: 99 },
        ],
      },
    ],
    transformers: [
      { id: "HDA-TX-001", name: "Transformer TX-001", health: 96, status: "success", alarms: 0, temp: 50, load: 88 },
      { id: "HDA-TX-002", name: "Transformer TX-002", health: 98, status: "success", alarms: 0, temp: 48, load: 85 },
      { id: "HDA-TX-003", name: "Transformer TX-003", health: 97, status: "success", alarms: 0, temp: 49, load: 87 },
    ],
    switchyard: { id: "HDA-SY-001",    name: "Switchyard SY-001",    health: 99, status: "success", alarms: 0 },
    scada:      { id: "HDA-SCADA-001", name: "SCADA / Hydro Control", health: 100, status: "success", alarms: 0 },
  },
};

export const ASSETS = [
  { id: "T-12", name: "Transformer T-12", type: "Transformer", health: 68, temp: 72, load: 84, vibration: 0.24, failureRisk: 32, alarm: "Cooling degradation", status: "warning" as const },
  { id: "INV-14", name: "Inverter INV-14", type: "Inverter", health: 45, temp: 88, load: 92, vibration: 0.18, failureRisk: 58, alarm: "Over-temp threshold", status: "danger" as const },
  { id: "INV-7", name: "Inverter INV-7", type: "Inverter", health: 75, temp: 65, load: 78, vibration: 0.12, failureRisk: 18, alarm: "", status: "warning" as const },
  { id: "BAT-3", name: "Battery B-3", type: "Battery", health: 91, temp: 38, load: 54, vibration: 0.05, failureRisk: 8, alarm: "", status: "success" as const },
  { id: "SG-2", name: "Switchgear SG-2", type: "Switchgear", health: 88, temp: 42, load: 60, vibration: 0.08, failureRisk: 12, alarm: "", status: "success" as const },
  { id: "TRB-1", name: "Turbine T-1", type: "Turbine", health: 82, temp: 55, load: 88, vibration: 0.22, failureRisk: 24, alarm: "Bearing wear detected", status: "warning" as const },
];

export type AIFindingPriority = "danger" | "warning" | "success" | "info";
export type AIFindingUrgency = "immediate" | "urgent" | "monitor" | "opportunity";

export interface AIFindingCause {
  label: string;
  probability: number;
  severity: "danger" | "warning" | "info";
}

export interface AIFindingAsset {
  id: string;
  name: string;
  status: "danger" | "warning" | "success";
  detail: string;
}

export interface AIFindingStep {
  urgency: "immediate" | "urgent" | "monitor";
  action: string;
  eta: string;
}

export interface AIFindingDrilldown {
  detectedAt: string;
  urgency: AIFindingUrgency;
  summary: string;
  expected?: { value: string; unit: string };
  actual?: { value: string; unit: string };
  delta?: string;
  causes: AIFindingCause[];
  affectedAssets: AIFindingAsset[];
  nextSteps: AIFindingStep[];
  context?: string;
}

export interface AIFinding {
  site: string;
  metric: string;
  rootCause: string;
  loss: string;
  action: string;
  priority: AIFindingPriority;
  drilldown: AIFindingDrilldown;
}

export const AI_FINDINGS: AIFinding[] = [
  {
    site: "Al Dhafra Solar Park", metric: "Generation ↓ 8%", rootCause: "Cloud Cover 61%", loss: "$18,200", action: "Delay battery charging", priority: "warning",
    drilldown: {
      detectedAt: "Today, 11:45",
      urgency: "monitor",
      summary: "Solar Farm A is generating 8% below forecast due to heavy cloud cover (61%) over Block B and Block C. AI models predict cloud clearance within 3–4 hours. Battery charging can be deferred to avoid curtailment losses.",
      expected: { value: "195", unit: "MW" },
      actual:   { value: "179", unit: "MW" },
      delta: "−16 MW",
      causes: [
        { label: "Cloud Cover (61%)",        probability: 73, severity: "warning" },
        { label: "Panel soiling (Block B)",  probability: 18, severity: "warning" },
        { label: "Irradiance sensor drift",  probability:  9, severity: "info"    },
      ],
      affectedAssets: [
        { id: "B2", name: "Block B",   status: "warning", detail: "Irradiance 722 W/m² vs 854 expected" },
        { id: "B3", name: "Block C",   status: "warning", detail: "Irradiance 720 W/m² vs 850 expected" },
        { id: "B1", name: "Block A",   status: "success", detail: "Operating normally at 854 W/m²"       },
      ],
      nextSteps: [
        { urgency: "monitor", action: "Defer BESS charging cycle by 3–4 hours",           eta: "Immediate" },
        { urgency: "urgent", action: "Schedule panel cleaning for Block B (soiling −2%)", eta: "This week"  },
        { urgency: "monitor", action: "Recalibrate irradiance sensor on Block C",         eta: "Next PM"    },
      ],
      context: "Cloud cover pattern matches seasonal forecast. No equipment fault involved. Production will recover when sky clears (~15:00 local).",
    },
  },
  {
    site: "NEOM Wind Farm", metric: "Availability ↓ 3%", rootCause: "Blade inspection overdue", loss: "$9,400", action: "Schedule blade inspection", priority: "danger",
    drilldown: {
      detectedAt: "Today, 09:30",
      urgency: "immediate",
      summary: "WTG-003 and WTG-007 are operating at derated capacity. Blade inspection is 91 days overdue on WTG-007. AI vibration analysis has detected micro-stress signatures consistent with leading-edge erosion. Risk of blade failure elevated at current wind speeds (12.4 m/s).",
      expected: { value: "310", unit: "MW" },
      actual:   { value: "300", unit: "MW" },
      delta: "−10 MW",
      causes: [
        { label: "Blade inspection overdue (WTG-007)", probability: 71, severity: "danger"  },
        { label: "Pitch control micro-fault (WTG-003)", probability: 22, severity: "warning" },
        { label: "Turbulence from upstream WTG-002",    probability:  7, severity: "info"    },
      ],
      affectedAssets: [
        { id: "WTG-007", name: "WTG-007", status: "danger",  detail: "Inspection overdue 91 days · vibration 0.38 g" },
        { id: "WTG-003", name: "WTG-003", status: "warning", detail: "Pitch deviation ±1.8° · output 94%"             },
        { id: "WTG-002", name: "WTG-002", status: "success", detail: "Operating normally at 98% output"               },
      ],
      nextSteps: [
        { urgency: "immediate", action: "Take WTG-007 offline for emergency blade inspection", eta: "Within 4h"  },
        { urgency: "urgent",   action: "Replace pitch actuator bearing on WTG-003",           eta: "Within 48h" },
        { urgency: "monitor",  action: "Increase vibration monitoring frequency to 15 min",   eta: "Today"      },
      ],
      context: "IEC 61400-1 requires blade inspection every 2 years max. WTG-007 is 3 months past this threshold. Insurance clause may be triggered if failure occurs.",
    },
  },
  {
    site: "Duqm Renewable Park", metric: "PR improved +2.1%", rootCause: "Cleaning completed", loss: "+$12,800", action: "No action needed", priority: "success",
    drilldown: {
      detectedAt: "Today, 08:00",
      urgency: "opportunity",
      summary: "Panel cleaning completed yesterday on all 3 solar blocks of Hybrid Plant A. Performance Ratio recovered from 84.4% to 86.5%, a 2.1 percentage-point improvement. This is tracking above monthly target. Wind cluster is also performing at full output.",
      expected: { value: "84.4", unit: "% PR" },
      actual:   { value: "86.5", unit: "% PR" },
      delta: "+2.1 pp",
      causes: [
        { label: "Panel soiling removed (all blocks)", probability: 89, severity: "info" },
        { label: "Reduced ambient temperature (−3°C)", probability:  8, severity: "info" },
        { label: "Favourable irradiance angle",        probability:  3, severity: "info" },
      ],
      affectedAssets: [
        { id: "HYB-SB1", name: "Solar Block A", status: "success", detail: "PR 87.2% ↑ from 84.1% after cleaning" },
        { id: "HYB-SB2", name: "Solar Block B", status: "success", detail: "PR 86.8% ↑ from 84.7% after cleaning" },
        { id: "HYB-WC1", name: "Wind Cluster",  status: "success", detail: "100% availability, 9.1 m/s avg wind"   },
      ],
      nextSteps: [
        { urgency: "monitor", action: "Continue monthly cleaning schedule per current plan",         eta: "Ongoing"   },
        { urgency: "monitor", action: "Log cleaning event in CMMS against next soiling baseline", eta: "Today"     },
        { urgency: "monitor", action: "Review cleaning interval if soiling rate increases",        eta: "Quarterly" },
      ],
      context: "Revenue uplift of +$12,800 today compared to pre-cleaning baseline. Annual cleaning ROI now confirmed at 340% vs cleaning cost.",
    },
  },
  {
    site: "Jubail Battery Storage", metric: "SOC at 94%", rootCause: "Grid demand low", loss: "+$4,200", action: "Prepare for evening discharge", priority: "info",
    drilldown: {
      detectedAt: "Today, 12:00",
      urgency: "opportunity",
      summary: "BESS Site A has charged to 94% SOC during the midday low-demand window at low grid prices. AI forecasts evening peak demand at 17:30–20:00 with spot prices expected at $0.18–0.22/kWh. Discharging during this window will maximise arbitrage revenue.",
      expected: { value: "80–85", unit: "% SOC" },
      actual:   { value: "94",   unit: "% SOC" },
      delta: "+9–14 pp above target",
      causes: [
        { label: "Grid demand below forecast (−18%)", probability: 62, severity: "info" },
        { label: "Solar generation surplus feeding BESS", probability: 31, severity: "info" },
        { label: "Charge rate not throttled during glut", probability:  7, severity: "warning" },
      ],
      affectedAssets: [
        { id: "BESS-001", name: "BESS Rack 1", status: "success", detail: "SOC 94% · temp 31°C · cell balance OK" },
        { id: "BESS-002", name: "BESS Rack 2", status: "success", detail: "SOC 93% · temp 30°C · cell balance OK" },
        { id: "PCS-001",  name: "PCS-001",     status: "success", detail: "Grid-ready, rated 40 MW discharge"     },
      ],
      nextSteps: [
        { urgency: "urgent",  action: "Schedule peak discharge 17:30–20:00 at full 40 MW",     eta: "Today 17:00" },
        { urgency: "monitor", action: "Monitor SOC to not drop below 15% during discharge",     eta: "Auto"        },
        { urgency: "monitor", action: "Review charge throttle settings for low-demand periods", eta: "This week"   },
      ],
      context: "Forecasted spot price: $0.21/kWh at 18:00. Arbitrage opportunity: +$4,200 vs charging cost of $1,800. Net margin: +$2,400 above baseline.",
    },
  },
  {
    site: "MBR Solar Park", metric: "Inverter faults ×5", rootCause: "String degradation", loss: "$6,100", action: "Schedule string inspection", priority: "danger",
    drilldown: {
      detectedAt: "Today, 10:15",
      urgency: "urgent",
      summary: "Five inverters at Solar Farm B are showing abnormal string currents consistent with cell micro-cracking and delamination on aging panel strings (installed 2021). INV-006 is the most severe with 3 strings open-circuited. Total output loss is 14.2 MW across the affected units.",
      expected: { value: "141", unit: "MW" },
      actual:   { value: "127", unit: "MW" },
      delta: "−14 MW",
      causes: [
        { label: "Panel string degradation (4+ years)",   probability: 67, severity: "danger"  },
        { label: "Thermal cycling stress (summer peak)",   probability: 22, severity: "warning" },
        { label: "Connection corrosion in combiner boxes", probability: 11, severity: "warning" },
      ],
      affectedAssets: [
        { id: "SFB-INV-006", name: "INV-006", status: "danger",  detail: "3 open-circuit strings · output 58% · temp 89°C" },
        { id: "SFB-INV-002", name: "INV-002", status: "danger",  detail: "2 under-current strings · output 72%"            },
        { id: "SFB-INV-004", name: "INV-004", status: "warning", detail: "String mismatch detected · output 84%"           },
        { id: "SFB-INV-008", name: "INV-008", status: "warning", detail: "DC input deviation +3.1% · output 88%"           },
        { id: "SFB-INV-011", name: "INV-011", status: "warning", detail: "THD slightly elevated · output 91%"              },
      ],
      nextSteps: [
        { urgency: "immediate", action: "Isolate INV-006 and perform emergency string inspection", eta: "Within 2h"  },
        { urgency: "urgent",   action: "EL scan of Block 2 strings to map degradation extent",   eta: "This week"  },
        { urgency: "urgent",   action: "Clean and inspect combiner box connections on INV-002",  eta: "Within 48h" },
        { urgency: "monitor",  action: "Submit insurance claim for premature degradation",       eta: "This month" },
      ],
      context: "String degradation rate exceeds warranty threshold at year 4. Manufacturer warranty inspection clause should be triggered for INV-006. EL imaging recommended for full block assessment.",
    },
  },
];
