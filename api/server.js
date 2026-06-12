// ─────────────────────────────────────────────────────────────────────────────
//  Renewable Dashboard  —  Single-file Express API
//  Run:  node server.js   (or  node --watch server.js  for auto-reload)
//  Base: http://localhost:3001/api
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SITES = [
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

const PORTFOLIO_KPI = {
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

const WORK_ORDERS = [
  {
    id: "WO-2024-001",
    title: "INV-14 Over-temperature Investigation",
    siteId: "solar-farm-a",
    asset: "INV-14",
    type: "Corrective",
    status: "Overdue",
    priority: "High",
    assignee: "Raj Kumar",
    dueDate: "2026-06-01",
    estimatedHours: 4,
    createdAt: "2026-05-28",
    description: "Inverter temperature exceeding 88°C threshold. Inspect cooling fans and heat sinks.",
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
    dueDate: "2026-06-05",
    estimatedHours: 6,
    createdAt: "2026-06-01",
    description: "Cooling degradation detected. Inspect oil levels, radiator fins and cooling fans.",
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
    dueDate: "2026-06-10",
    estimatedHours: 3,
    createdAt: "2026-06-01",
    description: "Routine quarterly inspection of string combiner boxes and fuses.",
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
    estimatedHours: 2,
    createdAt: "2026-06-02",
    description: "Annual calibration of irradiance sensors and anemometers.",
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
    estimatedHours: 3,
    createdAt: "2026-06-02",
    description: "Check thermal management system and cell balancing status.",
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
    estimatedHours: 1,
    createdAt: "2026-05-25",
    description: "Apply firmware patch v2.4.1 to resolve MPPT efficiency issue.",
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
    dueDate: "2026-06-04",
    estimatedHours: 8,
    createdAt: "2026-06-02",
    description: "Water wash of 480 modules in Block 2. Expected PR improvement of 2.1%.",
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
    estimatedHours: 12,
    createdAt: "2026-05-10",
    description: "Annual maintenance of breakers, isolators and protection relays.",
  },
  {
    id: "WO-2024-009",
    title: "WTG-007 Emergency Blade Inspection",
    siteId: "wind-farm-a",
    asset: "WTG-007",
    type: "Emergency",
    status: "Open",
    priority: "High",
    assignee: "Raj Kumar",
    dueDate: "2026-06-03",
    estimatedHours: 6,
    createdAt: "2026-06-02",
    description: "Blade inspection overdue 91 days. Vibration anomaly detected.",
  },
  {
    id: "WO-2024-010",
    title: "SFB INV-006 String Replacement",
    siteId: "solar-farm-b",
    asset: "SFB-INV-006",
    type: "Corrective",
    status: "Open",
    priority: "High",
    assignee: "Priya Sharma",
    dueDate: "2026-06-06",
    estimatedHours: 5,
    createdAt: "2026-06-01",
    description: "3 open-circuit strings detected. Replace damaged string harnesses.",
  },
];

const TECHNICIANS = [
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
    currentSite: null,
    phone: "+91-98765-43213",
    certifications: ["ISA CCST", "IEC 61508"],
    avatar: "AH",
  },
  {
    id: "T5",
    name: "Anita Nair",
    role: "Wind Turbine Specialist",
    status: "On-Site",
    skills: ["Wind Turbines", "Blade Inspection", "SCADA"],
    currentSite: "wind-farm-a",
    phone: "+91-98765-43214",
    certifications: ["GWO", "IEC 61400"],
    avatar: "AN",
  },
];

const ASSETS = [
  {
    id: "T-12",
    name: "Transformer T-12",
    type: "Transformer",
    health: 68,
    temp: 72,
    load: 84,
    vibration: 0.24,
    failureRisk: 32,
    alarm: "Cooling degradation",
    status: "warning",
  },
  {
    id: "INV-14",
    name: "Inverter INV-14",
    type: "Inverter",
    health: 45,
    temp: 88,
    load: 92,
    vibration: 0.18,
    failureRisk: 58,
    alarm: "Over-temp threshold",
    status: "danger",
  },
  {
    id: "INV-7",
    name: "Inverter INV-7",
    type: "Inverter",
    health: 75,
    temp: 65,
    load: 78,
    vibration: 0.12,
    failureRisk: 18,
    alarm: "",
    status: "warning",
  },
  {
    id: "BAT-3",
    name: "Battery B-3",
    type: "Battery",
    health: 91,
    temp: 38,
    load: 54,
    vibration: 0.05,
    failureRisk: 8,
    alarm: "",
    status: "success",
  },
  {
    id: "SG-2",
    name: "Switchgear SG-2",
    type: "Switchgear",
    health: 88,
    temp: 42,
    load: 60,
    vibration: 0.08,
    failureRisk: 12,
    alarm: "",
    status: "success",
  },
  {
    id: "TRB-1",
    name: "Turbine T-1",
    type: "Turbine",
    health: 82,
    temp: 55,
    load: 88,
    vibration: 0.22,
    failureRisk: 24,
    alarm: "Bearing wear detected",
    status: "warning",
  },
];

const AI_FINDINGS = [
  {
    site: "Al Dhafra Solar Park",
    metric: "Generation ↓ 8%",
    rootCause: "Cloud Cover 61%",
    loss: "$18,200",
    action: "Delay battery charging",
    priority: "warning",
    drilldown: {
      detectedAt: "Today, 11:45",
      urgency: "monitor",
      summary:
        "Solar Farm A is generating 8% below forecast due to heavy cloud cover (61%) over Block B and Block C. AI models predict cloud clearance within 3–4 hours.",
      expected: { value: "195", unit: "MW" },
      actual: { value: "179", unit: "MW" },
      delta: "−16 MW",
      causes: [
        { label: "Cloud Cover (61%)", probability: 73, severity: "warning" },
        { label: "Panel soiling (Block B)", probability: 18, severity: "warning" },
        { label: "Irradiance sensor drift", probability: 9, severity: "info" },
      ],
      affectedAssets: [
        { id: "B2", name: "Block B", status: "warning", detail: "Irradiance 722 W/m² vs 854 expected" },
        { id: "B3", name: "Block C", status: "warning", detail: "Irradiance 720 W/m² vs 850 expected" },
        { id: "B1", name: "Block A", status: "success", detail: "Operating normally at 854 W/m²" },
      ],
      nextSteps: [
        { urgency: "monitor", action: "Defer BESS charging cycle by 3–4 hours", eta: "Immediate" },
        { urgency: "urgent", action: "Schedule panel cleaning for Block B (soiling −2%)", eta: "This week" },
        { urgency: "monitor", action: "Recalibrate irradiance sensor on Block C", eta: "Next PM" },
      ],
      context: "Cloud cover pattern matches seasonal forecast. No equipment fault involved. Production will recover when sky clears (~15:00 local).",
    },
  },
  {
    site: "NEOM Wind Farm",
    metric: "Availability ↓ 3%",
    rootCause: "Blade inspection overdue",
    loss: "$9,400",
    action: "Schedule blade inspection",
    priority: "danger",
    drilldown: {
      detectedAt: "Today, 09:30",
      urgency: "immediate",
      summary:
        "WTG-003 and WTG-007 are operating at derated capacity. Blade inspection is 91 days overdue on WTG-007. AI vibration analysis has detected micro-stress signatures consistent with leading-edge erosion.",
      expected: { value: "310", unit: "MW" },
      actual: { value: "300", unit: "MW" },
      delta: "−10 MW",
      causes: [
        { label: "Blade inspection overdue (WTG-007)", probability: 71, severity: "danger" },
        { label: "Pitch control micro-fault (WTG-003)", probability: 22, severity: "warning" },
        { label: "Turbulence from upstream WTG-002", probability: 7, severity: "info" },
      ],
      affectedAssets: [
        { id: "WTG-007", name: "WTG-007", status: "danger", detail: "Inspection overdue 91 days · vibration 0.38 g" },
        { id: "WTG-003", name: "WTG-003", status: "warning", detail: "Pitch deviation ±1.8° · output 94%" },
        { id: "WTG-002", name: "WTG-002", status: "success", detail: "Operating normally at 98% output" },
      ],
      nextSteps: [
        { urgency: "immediate", action: "Take WTG-007 offline for emergency blade inspection", eta: "Within 4h" },
        { urgency: "urgent", action: "Replace pitch actuator bearing on WTG-003", eta: "Within 48h" },
        { urgency: "monitor", action: "Increase vibration monitoring frequency to 15 min", eta: "Today" },
      ],
      context: "IEC 61400-1 requires blade inspection every 2 years max. WTG-007 is 3 months past this threshold.",
    },
  },
  {
    site: "Duqm Renewable Park",
    metric: "PR improved +2.1%",
    rootCause: "Cleaning completed",
    loss: "+$12,800",
    action: "No action needed",
    priority: "success",
    drilldown: {
      detectedAt: "Today, 08:00",
      urgency: "opportunity",
      summary:
        "Panel cleaning completed yesterday on all 3 solar blocks of Hybrid Plant A. Performance Ratio recovered from 84.4% to 86.5%, a 2.1 percentage-point improvement.",
      expected: { value: "84.4", unit: "% PR" },
      actual: { value: "86.5", unit: "% PR" },
      delta: "+2.1 pp",
      causes: [
        { label: "Panel soiling removed (all blocks)", probability: 89, severity: "info" },
        { label: "Reduced ambient temperature (−3°C)", probability: 8, severity: "info" },
        { label: "Favourable irradiance angle", probability: 3, severity: "info" },
      ],
      affectedAssets: [
        { id: "HYB-SB1", name: "Solar Block A", status: "success", detail: "PR 87.2% ↑ from 84.1% after cleaning" },
        { id: "HYB-SB2", name: "Solar Block B", status: "success", detail: "PR 86.8% ↑ from 84.7% after cleaning" },
        { id: "HYB-WC1", name: "Wind Cluster", status: "success", detail: "100% availability, 9.1 m/s avg wind" },
      ],
      nextSteps: [
        { urgency: "monitor", action: "Continue monthly cleaning schedule per current plan", eta: "Ongoing" },
        { urgency: "monitor", action: "Log cleaning event in CMMS against next soiling baseline", eta: "Today" },
      ],
      context: "Revenue uplift of +$12,800 today compared to pre-cleaning baseline. Annual cleaning ROI now confirmed at 340% vs cleaning cost.",
    },
  },
  {
    site: "Jubail Battery Storage",
    metric: "SOC at 94%",
    rootCause: "Grid demand low",
    loss: "+$4,200",
    action: "Prepare for evening discharge",
    priority: "info",
    drilldown: {
      detectedAt: "Today, 12:00",
      urgency: "opportunity",
      summary:
        "BESS Site A has charged to 94% SOC during the midday low-demand window. AI forecasts evening peak demand at 17:30–20:00 with spot prices expected at $0.18–0.22/kWh.",
      expected: { value: "80–85", unit: "% SOC" },
      actual: { value: "94", unit: "% SOC" },
      delta: "+9–14 pp above target",
      causes: [
        { label: "Grid demand below forecast (−18%)", probability: 62, severity: "info" },
        { label: "Solar generation surplus feeding BESS", probability: 31, severity: "info" },
        { label: "Charge rate not throttled during glut", probability: 7, severity: "warning" },
      ],
      affectedAssets: [
        { id: "BESS-001", name: "BESS Rack 1", status: "success", detail: "SOC 94% · temp 31°C · cell balance OK" },
        { id: "BESS-002", name: "BESS Rack 2", status: "success", detail: "SOC 93% · temp 30°C · cell balance OK" },
        { id: "PCS-001", name: "PCS-001", status: "success", detail: "Grid-ready, rated 40 MW discharge" },
      ],
      nextSteps: [
        { urgency: "urgent", action: "Schedule peak discharge 17:30–20:00 at full 40 MW", eta: "Today 17:00" },
        { urgency: "monitor", action: "Monitor SOC to not drop below 15% during discharge", eta: "Auto" },
      ],
      context: "Forecasted spot price: $0.21/kWh at 18:00. Arbitrage opportunity: +$4,200 vs charging cost of $1,800. Net margin: +$2,400.",
    },
  },
  {
    site: "MBR Solar Park",
    metric: "Inverter faults ×5",
    rootCause: "String degradation",
    loss: "$6,100",
    action: "Schedule string inspection",
    priority: "danger",
    drilldown: {
      detectedAt: "Today, 10:15",
      urgency: "urgent",
      summary:
        "Five inverters at Solar Farm B are showing abnormal string currents consistent with cell micro-cracking and delamination on aging panel strings (installed 2021). INV-006 is the most severe with 3 strings open-circuited.",
      expected: { value: "141", unit: "MW" },
      actual: { value: "127", unit: "MW" },
      delta: "−14 MW",
      causes: [
        { label: "Panel string degradation (4+ years)", probability: 67, severity: "danger" },
        { label: "Thermal cycling stress (summer peak)", probability: 22, severity: "warning" },
        { label: "Connection corrosion in combiner boxes", probability: 11, severity: "warning" },
      ],
      affectedAssets: [
        { id: "SFB-INV-006", name: "INV-006", status: "danger", detail: "3 open-circuit strings · output 58% · temp 89°C" },
        { id: "SFB-INV-002", name: "INV-002", status: "danger", detail: "2 under-current strings · output 72%" },
        { id: "SFB-INV-004", name: "INV-004", status: "warning", detail: "String mismatch detected · output 84%" },
      ],
      nextSteps: [
        { urgency: "immediate", action: "Isolate INV-006 and perform emergency string inspection", eta: "Within 2h" },
        { urgency: "urgent", action: "EL scan of Block 2 strings to map degradation extent", eta: "This week" },
        { urgency: "urgent", action: "Clean and inspect combiner box connections on INV-002", eta: "Within 48h" },
      ],
      context:
        "String degradation rate exceeds warranty threshold at year 4. Manufacturer warranty inspection clause should be triggered for INV-006.",
    },
  },
];

const HIERARCHY = {
  "solar-farm-a": {
    blocks: [
      {
        id: "B1",
        name: "Block 1",
        inverters: [
          { id: "INV-001", name: "INV-001", health: 96, status: "success", alarms: 0, strings: 12, temp: 45, output: 98 },
          { id: "INV-002", name: "INV-002", health: 72, status: "warning", alarms: 2, strings: 12, temp: 71, output: 87 },
          { id: "INV-003", name: "INV-003", health: 94, status: "success", alarms: 0, strings: 12, temp: 48, output: 97 },
          { id: "INV-004", name: "INV-004", health: 91, status: "success", alarms: 0, strings: 12, temp: 51, output: 95 },
        ],
      },
      {
        id: "B2",
        name: "Block 2",
        inverters: [
          { id: "INV-005", name: "INV-005", health: 88, status: "success", alarms: 0, strings: 12, temp: 55, output: 93 },
          { id: "INV-006", name: "INV-006", health: 45, status: "danger", alarms: 3, strings: 12, temp: 88, output: 61 },
          { id: "INV-007", name: "INV-007", health: 81, status: "warning", alarms: 1, strings: 12, temp: 63, output: 89 },
          { id: "INV-008", name: "INV-008", health: 93, status: "success", alarms: 0, strings: 12, temp: 47, output: 96 },
        ],
      },
      {
        id: "B3",
        name: "Block 3",
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
    switchyard: { id: "SY-001", name: "Switchyard SY-001", health: 95, status: "success", alarms: 0 },
    weatherStation: { id: "WS-001", name: "Weather Station WS-01", health: 99, status: "success", alarms: 0 },
    scada: { id: "SCADA-001", name: "SCADA System", health: 100, status: "success", alarms: 0 },
    bess: { id: "BESS-001", name: "BESS Unit 1", health: 91, status: "success", alarms: 0, capacity: 50, soc: 76 },
  },
  "solar-farm-b": {
    blocks: [
      {
        id: "SFB-B1",
        name: "Block 1",
        inverters: [
          { id: "SFB-INV-001", name: "INV-001", health: 96, status: "success", alarms: 0, strings: 10, temp: 46, output: 97 },
          { id: "SFB-INV-002", name: "INV-002", health: 71, status: "warning", alarms: 2, strings: 10, temp: 73, output: 85 },
          { id: "SFB-INV-003", name: "INV-003", health: 89, status: "success", alarms: 0, strings: 10, temp: 50, output: 94 },
        ],
      },
      {
        id: "SFB-B2",
        name: "Block 2",
        inverters: [
          { id: "SFB-INV-004", name: "INV-004", health: 83, status: "warning", alarms: 2, strings: 10, temp: 64, output: 88 },
          { id: "SFB-INV-005", name: "INV-005", health: 91, status: "success", alarms: 0, strings: 10, temp: 49, output: 95 },
          { id: "SFB-INV-006", name: "INV-006", health: 87, status: "success", alarms: 0, strings: 10, temp: 53, output: 92 },
        ],
      },
      {
        id: "SFB-B3",
        name: "Block 3",
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
    switchyard: { id: "SFB-SY-001", name: "Switchyard SY-001", health: 93, status: "success", alarms: 0 },
    weatherStation: { id: "SFB-WS-001", name: "Weather Station WS-01", health: 98, status: "success", alarms: 0 },
    scada: { id: "SFB-SCADA-001", name: "SCADA System", health: 99, status: "success", alarms: 0 },
  },
  "wind-farm-a": {
    blocks: [
      {
        id: "WFA-C1",
        name: "Cluster 1",
        inverters: [
          { id: "WTG-001", name: "Turbine WTG-001", health: 88, status: "success", alarms: 0, strings: 3, temp: 42, output: 91 },
          { id: "WTG-002", name: "Turbine WTG-002", health: 74, status: "warning", alarms: 2, strings: 3, temp: 58, output: 83 },
          { id: "WTG-003", name: "Turbine WTG-003", health: 92, status: "success", alarms: 0, strings: 3, temp: 40, output: 94 },
          { id: "WTG-004", name: "Turbine WTG-004", health: 61, status: "warning", alarms: 2, strings: 3, temp: 67, output: 76 },
          { id: "WTG-005", name: "Turbine WTG-005", health: 95, status: "success", alarms: 0, strings: 3, temp: 38, output: 97 },
        ],
      },
      {
        id: "WFA-C2",
        name: "Cluster 2",
        inverters: [
          { id: "WTG-006", name: "Turbine WTG-006", health: 82, status: "success", alarms: 0, strings: 3, temp: 44, output: 88 },
          { id: "WTG-007", name: "Turbine WTG-007", health: 55, status: "danger", alarms: 3, strings: 3, temp: 71, output: 64 },
          { id: "WTG-008", name: "Turbine WTG-008", health: 90, status: "success", alarms: 0, strings: 3, temp: 41, output: 93 },
          { id: "WTG-009", name: "Turbine WTG-009", health: 79, status: "warning", alarms: 1, strings: 3, temp: 52, output: 86 },
          { id: "WTG-010", name: "Turbine WTG-010", health: 87, status: "success", alarms: 0, strings: 3, temp: 43, output: 91 },
        ],
      },
      {
        id: "WFA-C3",
        name: "Cluster 3",
        inverters: [
          { id: "WTG-011", name: "Turbine WTG-011", health: 93, status: "success", alarms: 0, strings: 3, temp: 39, output: 95 },
          { id: "WTG-012", name: "Turbine WTG-012", health: 68, status: "warning", alarms: 0, strings: 3, temp: 61, output: 79 },
          { id: "WTG-013", name: "Turbine WTG-013", health: 85, status: "success", alarms: 0, strings: 3, temp: 45, output: 90 },
          { id: "WTG-014", name: "Turbine WTG-014", health: 97, status: "success", alarms: 0, strings: 3, temp: 37, output: 98 },
          { id: "WTG-015", name: "Turbine WTG-015", health: 76, status: "warning", alarms: 0, strings: 3, temp: 55, output: 84 },
        ],
      },
      {
        id: "WFA-C4",
        name: "Cluster 4",
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
    switchyard: { id: "WFA-SY-001", name: "Switchyard SY-001", health: 91, status: "success", alarms: 0 },
    weatherStation: { id: "WFA-WS-001", name: "Anemometer Station WS-1", health: 97, status: "success", alarms: 0 },
    scada: { id: "WFA-SCADA-001", name: "SCADA System", health: 99, status: "success", alarms: 0 },
  },
  "bess-site-a": {
    blocks: [
      {
        id: "BSA-BB1",
        name: "Battery Bank 1",
        inverters: [
          { id: "PCS-001", name: "PCS Unit PCS-001", health: 97, status: "success", alarms: 0, strings: 8, temp: 30, output: 96 },
          { id: "PCS-002", name: "PCS Unit PCS-002", health: 94, status: "success", alarms: 0, strings: 8, temp: 32, output: 94 },
          { id: "PCS-003", name: "PCS Unit PCS-003", health: 91, status: "success", alarms: 0, strings: 8, temp: 34, output: 92 },
          { id: "PCS-004", name: "PCS Unit PCS-004", health: 72, status: "warning", alarms: 1, strings: 8, temp: 48, output: 83 },
        ],
      },
      {
        id: "BSA-BB2",
        name: "Battery Bank 2",
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
    switchyard: { id: "BSA-SY-001", name: "Switchyard SY-001", health: 98, status: "success", alarms: 0 },
    scada: { id: "BSA-SCADA-001", name: "SCADA / BMS", health: 100, status: "success", alarms: 0 },
    bess: { id: "BSA-BESS-001", name: "Central Battery System", health: 95, status: "success", alarms: 0, capacity: 120, soc: 76 },
  },
  "hybrid-plant": {
    blocks: [
      {
        id: "HYB-SB1",
        name: "Solar Block 1",
        inverters: [
          { id: "HYB-INV-001", name: "INV-001", health: 95, status: "success", alarms: 0, strings: 12, temp: 47, output: 97 },
          { id: "HYB-INV-002", name: "INV-002", health: 88, status: "success", alarms: 0, strings: 12, temp: 53, output: 93 },
          { id: "HYB-INV-003", name: "INV-003", health: 79, status: "warning", alarms: 1, strings: 12, temp: 65, output: 87 },
        ],
      },
      {
        id: "HYB-SB2",
        name: "Solar Block 2",
        inverters: [
          { id: "HYB-INV-004", name: "INV-004", health: 93, status: "success", alarms: 0, strings: 12, temp: 49, output: 96 },
          { id: "HYB-INV-005", name: "INV-005", health: 91, status: "success", alarms: 0, strings: 12, temp: 51, output: 94 },
          { id: "HYB-INV-006", name: "INV-006", health: 86, status: "success", alarms: 0, strings: 12, temp: 56, output: 91 },
        ],
      },
      {
        id: "HYB-WC1",
        name: "Wind Cluster",
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
    switchyard: { id: "HYB-SY-001", name: "Switchyard SY-001", health: 96, status: "success", alarms: 0 },
    weatherStation: { id: "HYB-WS-001", name: "Weather Station WS-01", health: 98, status: "success", alarms: 0 },
    scada: { id: "HYB-SCADA-001", name: "SCADA System", health: 100, status: "success", alarms: 0 },
    bess: { id: "HYB-BESS-001", name: "BESS Storage Unit", health: 90, status: "success", alarms: 0, capacity: 80, soc: 62 },
  },
  "hydro-plant-a": {
    blocks: [
      {
        id: "HDA-U1",
        name: "Powerhouse Unit 1",
        inverters: [
          { id: "GEN-001", name: "Generator GEN-001", health: 98, status: "success", alarms: 0, strings: 14, temp: 42, output: 99 },
          { id: "GEN-002", name: "Generator GEN-002", health: 97, status: "success", alarms: 0, strings: 14, temp: 43, output: 98 },
        ],
      },
      {
        id: "HDA-U2",
        name: "Powerhouse Unit 2",
        inverters: [
          { id: "GEN-003", name: "Generator GEN-003", health: 96, status: "success", alarms: 0, strings: 14, temp: 44, output: 97 },
          { id: "GEN-004", name: "Generator GEN-004", health: 99, status: "success", alarms: 0, strings: 14, temp: 41, output: 100 },
        ],
      },
      {
        id: "HDA-U3",
        name: "Powerhouse Unit 3",
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
    switchyard: { id: "HDA-SY-001", name: "Switchyard SY-001", health: 99, status: "success", alarms: 0 },
    scada: { id: "HDA-SCADA-001", name: "SCADA / Hydro Control", health: 100, status: "success", alarms: 0 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  LIVE STATE  —  server-side simulation, ticks every 5 s
//  Every poll from the frontend returns slightly different values, just like a
//  real SCADA system pushing updates.
// ═══════════════════════════════════════════════════════════════════════════════

function jitter(val, pct = 0.03) {
  return val * (1 + (Math.random() - 0.5) * pct);
}

// Deep copy so base SITES values are preserved unchanged
let _liveSites = SITES.map((s) => ({ ...s }));

function _tickLiveSites() {
  _liveSites = SITES.map((s) => ({
    ...s,
    generation:   Math.max(0, Math.round(jitter(s.generation, 0.04))),
    availability: +Math.min(100, jitter(s.availability, 0.006)).toFixed(1),
    pr:           +Math.min(100, jitter(s.pr, 0.004)).toFixed(1),
  }));
}
setInterval(_tickLiveSites, 5000);

function _liveKpi() {
  const gen    = _liveSites.reduce((a, s) => a + s.generation, 0);
  const avail  = _liveSites.reduce((a, s) => a + s.availability, 0) / _liveSites.length;
  const rev    = _liveSites.reduce((a, s) => a + s.revenueToday, 0);
  const carbon = _liveSites.reduce((a, s) => a + s.carbonOffset, 0);
  const alarms = _liveSites.reduce((a, s) => a + s.alarms, 0);
  return {
    totalCapacityMW:     PORTFOLIO_KPI.totalCapacityMW,
    currentGenerationMW: gen,
    availability:        +avail.toFixed(1),
    revenueToday:        Math.round(jitter(rev, 0.015)),
    carbonOffsetToday:   carbon,
    openAlarms:          alarms,
    criticalAlarms:      _liveSites.filter((s) => s.status === "Critical").length,
    workOrders:          PORTFOLIO_KPI.workOrders,
    aiConfidence:        PORTFOLIO_KPI.aiConfidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TELEMETRY HELPERS  (server-side seeded generation, matches frontend helpers)
// ═══════════════════════════════════════════════════════════════════════════════
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function generate24h(base, variance, seed = 42) {
  const rand = seededRand(seed);
  return Array.from({ length: 25 }, (_, i) => {
    const h = String(i).padStart(2, "0");
    const solar = base * Math.max(0, Math.sin((Math.PI * (i - 4)) / 14));
    const noise = (rand() - 0.5) * variance * base;
    const actual = Math.max(0, Math.round(solar + noise));
    const forecast = Math.max(0, Math.round(solar + (rand() - 0.5) * variance * base * 0.6));
    return { time: `${h}:00`, actual, forecast };
  });
}

function generate7d(base, variance, seed = 99) {
  const rand = seededRand(seed);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => {
    const actual = Math.round(base * (1 + (rand() - 0.5) * variance));
    const forecast = Math.round(base * (1 + (rand() - 0.5) * variance * 0.7));
    return { day, actual, forecast };
  });
}

function generate30d(base, variance = 0.08, seed = 77) {
  const rand = seededRand(seed);
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    value: Math.min(100, Math.max(0, +(base + (rand() - 0.5) * variance * base).toFixed(1))),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AI RULE ENGINE  —  generates findings from real site + asset data
// ═══════════════════════════════════════════════════════════════════════════════

function _now() {
  const d = new Date();
  return `Today, ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function _time() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// ── Insight format (used by SiteAIInsights) ───────────────────────────────────
// Returns array of { id, type, sev, title, asset, site, detected, conf,
//                    analysis, rootCause, recommendation, steps, impact }
function generateInsights(siteId) {
  const site = _liveSites.find(s => s.id === siteId) || SITES.find(s => s.id === siteId);
  if (!site) return [];
  const h    = HIERARCHY[siteId];
  const all  = h ? h.blocks.flatMap(b => b.inverters) : [];
  const txs  = h ? (h.transformers || []) : [];
  const bess = h ? h.bess : null;
  const isWind = site.type === "Wind";
  const detected = _now();
  const findings = [];
  let n = 0;

  // ── Rule: danger assets ──────────────────────────────────────────────────────
  const danger = all.filter(a => a.status === "danger");
  if (danger.length) {
    const worst = danger.sort((a,b) => a.health - b.health)[0];
    const lostMW = +(danger.reduce((s,a) => s + (100-a.output), 0) * site.capacity / Math.max(all.length,1) / 100).toFixed(1);
    const lossUSD = Math.round(lostMW * (site.revenueToday / Math.max(site.generation,1)));
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "ROOT CAUSE", sev: "CRITICAL",
      title: `${isWind?"Turbine":"Inverter"} Critical Fault — ${worst.name}`,
      asset: worst.id, site: site.name, detected, conf: Math.min(98, 88 + Math.round((100-worst.health)/5)),
      analysis: isWind
        ? `${worst.name} health is ${worst.health}% with nacelle temp ${worst.temp}°C and output ${worst.output}% of rated. ${worst.alarms} active alarm(s). AI pattern matching indicates drive-train or control fault. Immediate shutdown required per IEC 61400-1.`
        : `${worst.name} health has dropped to ${worst.health}%, operating at ${worst.temp}°C (above 80°C IGBT threshold). Output is ${worst.output}% of rated with ${worst.alarms} active alarm(s). Likely causes: IGBT degradation, cooling fan failure, or DC string fault causing thermal stress.`,
      rootCause: isWind
        ? `Drive-train or pitch fault — health ${worst.health}%, temp ${worst.temp}°C`
        : `Thermal overload or IGBT fault — health ${worst.health}%, temp ${worst.temp}°C`,
      recommendation: isWind
        ? `Initiate Emergency Stop on ${worst.name}. Apply LOTO at tower base. Download fault log and raise emergency WO.`
        : `Isolate ${worst.id} from AC/DC sides. Verify DC voltage <50 Vdc. Photograph HMI fault log. Do not restart until root cause cleared.`,
      steps: isWind
        ? [`Issue Emergency Stop to ${worst.name} from SCADA.`, "Confirm rotor <5 RPM and blades feathered.", "Apply LOTO at tower-base MV switch.", "Download turbine controller fault log.", "Raise emergency maintenance work order in CMMS."]
        : [`Isolate ${worst.id} AC and DC disconnect switches.`, "Verify DC string voltage dropped to <50 Vdc.", `Photograph HMI fault codes on ${worst.id}.`, "Do NOT restart until root cause confirmed.", "Raise corrective maintenance work order in CMMS."],
      impact: `Generation loss: ${lostMW} MW · Revenue impact: ~$${lossUSD.toLocaleString()}/day while fault persists.`,
    });
  }

  // ── Rule: multiple warning assets ───────────────────────────────────────────
  const warns = all.filter(a => a.status === "warning");
  if (warns.length >= 3) {
    const hotOnes = warns.filter(a => a.temp > 65);
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "ANOMALY", sev: warns.length >= 5 ? "HIGH" : "MEDIUM",
      title: `${warns.length} ${isWind?"Turbines":"Inverters"} Degraded — Fleet Health Alert`,
      asset: warns[0].id, site: site.name, detected, conf: 85,
      analysis: `${warns.length} ${isWind?"turbines":"inverters"} at ${site.name} are in warning state. ${hotOnes.length > 0 ? `${hotOnes.length} unit(s) exceed 65°C, indicating cooling issues. ` : ""}Average output of affected units is ${Math.round(warns.reduce((s,a)=>s+a.output,0)/warns.length)}%. Fleet warning rate is ${Math.round(warns.length/Math.max(all.length,1)*100)}% — normal threshold is <10%.`,
      rootCause: hotOnes.length > 0 ? `Elevated temperatures in ${hotOnes.length} unit(s) — cooling system degradation` : `Performance degradation across ${warns.length} units — aging or soiling`,
      recommendation: `Schedule preventive thermal inspection of all ${warns.length} warning assets within 48 hours. ${hotOnes.length>0?"Prioritise cooling fan checks.":"Perform IV-curve trace on lowest-output units."}`,
      steps: [`List all ${warns.length} warning assets in CMMS and create preventive WO.`, hotOnes.length>0?`Inspect cooling fans and heat sinks on high-temp units (${hotOnes.map(a=>a.name).join(", ")}).`:`Run IV-curve trace on underperforming units.`, "Increase monitoring poll rate to 5-minute intervals.", "Compare output vs. peer assets to confirm deviation is equipment-driven, not weather."],
      impact: `Estimated combined output loss: ${+(warns.reduce((s,a)=>s+(100-a.output),0)*site.capacity/Math.max(all.length,1)/100).toFixed(1)} MW. Unresolved degradation will compound over time.`,
    });
  }

  // ── Rule: transformer health ─────────────────────────────────────────────────
  const badTx = txs.filter(t => t.health < 80 || t.temp > 65);
  if (badTx.length) {
    const worst = badTx.sort((a,b) => a.health - b.health)[0];
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "PREDICTION", sev: worst.health < 70 ? "CRITICAL" : "HIGH",
      title: `Transformer ${worst.name} — Health Degradation Detected`,
      asset: worst.id, site: site.name, detected, conf: 88,
      analysis: `${worst.name} has a health index of ${worst.health}% with winding temperature at ${worst.temp}°C and load factor ${worst.load}%. ${worst.temp > 65 ? `Temperature exceeds the IEC 60076 ONAN limit of 65°C — insulation aging rate doubles for every 8°C above rated.` : `Health index below 80% indicates accelerated insulation aging.`} DGA oil analysis is required.`,
      rootCause: worst.temp > 65 ? `Cooling system degradation — oil temp ${worst.temp}°C exceeds rated limit` : `Insulation aging — health index ${worst.health}% below 80% threshold`,
      recommendation: `Inspect oil cooling radiators and fan operation on ${worst.name}. Order oil sample for DGA within 7 days. Consider load derating if temperature remains elevated.`,
      steps: [`Acknowledge alarm on ${worst.id}.`, worst.temp>65?`Verify cooling fans running at rated speed on ${worst.name}.`:`Review health trend data over last 30 days.`, "Check oil level in conservator tank.", "Order oil DGA sample — send to lab within 7 days.", "If temp continues rising, reduce transformer load by 10%."],
      impact: `Unchecked transformer failure risk: ~$200,000–$500,000 replacement + 2–4 weeks generation loss. Planned maintenance cost: ~$15,000.`,
    });
  }

  // ── Rule: low PR (Solar / Hybrid) ────────────────────────────────────────────
  if ((site.type === "Solar" || site.type === "Hybrid") && site.pr < 83) {
    const gap = +(85 - site.pr).toFixed(1);
    const lostMW = +(gap * site.capacity / 100).toFixed(1);
    const lossUSD = Math.round(site.revenueToday * gap / 100);
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "ANOMALY", sev: site.pr < 80 ? "HIGH" : "MEDIUM",
      title: `Performance Ratio ${site.pr}% — Below 85% IEC 61724 Target`,
      asset: "ALL", site: site.name, detected, conf: 82,
      analysis: `Performance Ratio at ${site.name} is ${site.pr}%, which is ${gap}pp below the IEC 61724 target of 85% for this region. The shortfall represents approximately ${lostMW} MW of recoverable generation. Primary suspect is module soiling; secondary causes are string mismatch or inverter MPPT inefficiency.`,
      rootCause: `Module soiling (dust accumulation) — primary contributor to ${gap}pp PR deficit`,
      recommendation: `Schedule full-plant water wash within 7 days. Run IV-curve trace on lowest-performing strings to isolate mismatch losses. Compare PR against peer sites on same irradiance day to separate weather vs equipment causes.`,
      steps: ["Compare today's PR against 30-day trend — confirm it is declining, not weather-related.", "Schedule water wash of all module blocks within 7 days.", "Perform IV-curve trace on Block with lowest string currents.", "Recalibrate irradiance sensor if not done in last 6 months.", "Log cleaning date in CMMS to reset soiling baseline."],
      impact: `PR gap of ${gap}pp = ~${lostMW} MW lost = ~$${lossUSD.toLocaleString()}/day. Annual cleaning cost ROI: typically 3–5× in MENA desert climate.`,
    });
  }

  // ── Rule: low availability ───────────────────────────────────────────────────
  if (site.availability < 97) {
    const gap = +(98 - site.availability).toFixed(1);
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "ANOMALY", sev: site.availability < 95 ? "HIGH" : "MEDIUM",
      title: `Fleet Availability ${site.availability}% — Below 98% Contractual Target`,
      asset: site.id, site: site.name, detected, conf: 91,
      analysis: `Fleet availability at ${site.name} is ${site.availability}%, ${gap}pp below the typical PPA contractual minimum of 98%. ${site.alarms} active alarm(s) are contributing to downtime. Revenue impact is approximately $${Math.round(site.revenueToday * gap / 100).toLocaleString()}/day. Sustained breach may trigger liquidated damages under PPA terms.`,
      rootCause: `${site.alarms} active alarm(s) causing asset downtime — fleet health ${site.health}%`,
      recommendation: `Prioritise resolution of all active alarms by severity. Identify highest-capacity assets that are offline and restore them first. Validate availability calculation excludes TSO-mandated curtailment.`,
      steps: ["Open Alarm Management and filter by Critical/High severity.", "Identify offline assets with highest capacity contribution.", "Raise corrective WOs for all unacknowledged faults.", "Confirm curtailment events are excluded from availability calculation.", "Document breach in operational log for PPA reporting."],
      impact: `Availability gap of ${gap}pp = ~$${Math.round(site.revenueToday * gap / 100).toLocaleString()}/day revenue loss. PPA LD clause may apply if breach exceeds contractual grace period.`,
    });
  }

  // ── Rule: BESS optimization ───────────────────────────────────────────────────
  if (bess) {
    if (bess.soc > 88) {
      findings.push({
        id: `INS-${siteId}-${++n}`, type: "OPTIMIZATION", sev: "MEDIUM",
        title: `BESS SOC ${bess.soc}% — Peak Discharge Opportunity`,
        asset: bess.id, site: site.name, detected, conf: 91,
        analysis: `${bess.name} has reached ${bess.soc}% SOC during the midday charging window. This is above the optimal 75–85% operating range. Evening grid demand peak (17:30–20:00) represents the highest-value discharge window. Deploying the full ${bess.capacity} MWh capacity during peak hours maximises arbitrage revenue.`,
        rootCause: `Midday solar surplus has overcharged BESS above optimal SOC — discharge window now available`,
        recommendation: `Schedule full discharge cycle 17:30–20:00 via EMS setpoint update. Set minimum SOC threshold at 15% to protect battery life. Review morning charge schedule to throttle at 85% SOC.`,
        steps: ["Verify EMS dispatch mode is set to 'Time-of-Use Optimise'.", "Set discharge window: 17:30–20:00, target output: rated MW.", "Set minimum SOC cutoff: 15% to avoid deep discharge.", "Monitor cell temperatures during discharge — alert at 45°C.", "Log arbitrage revenue in daily operations report."],
        impact: `${bess.capacity} MWh × $0.18–0.22/kWh estimated peak tariff = $${Math.round(bess.capacity*0.20*1000).toLocaleString()} potential discharge revenue this evening.`,
      });
    } else if (bess.soc < 25) {
      findings.push({
        id: `INS-${siteId}-${++n}`, type: "ROOT CAUSE", sev: "HIGH",
        title: `BESS SOC Critically Low — ${bess.soc}% (Minimum 20%)`,
        asset: bess.id, site: site.name, detected, conf: 96,
        analysis: `${bess.name} SOC has dropped to ${bess.soc}%, below the IEC 62619 minimum operational threshold of 20%. Grid ancillary service obligations (frequency response, spinning reserve) are at risk. Immediate charge cycle is required. Deep discharge below 15% will accelerate capacity fade and may void warranty.`,
        rootCause: `Unplanned over-discharge — SOC ${bess.soc}% below 20% minimum operating threshold`,
        recommendation: `Initiate grid charge mode immediately. Notify TSO if FFR or spinning reserve obligations cannot be met. Reduce overnight dispatch depth in schedule to prevent recurrence.`,
        steps: ["Switch EMS to Grid Charge mode — target SOC 40% before next discharge.", "Notify TSO on duty hotline if ancillary service capacity is curtailed.", "Check BMS cell balance — deep discharge causes cell drift.", "Review yesterday's dispatch log to identify cause of over-discharge.", "Update dispatch schedule: set minimum SOC floor at 20%."],
        impact: `Ancillary service non-delivery risk. Deep discharge below 15% accelerates capacity fade — each deep discharge cycle reduces usable capacity by ~0.1%.`,
      });
    }
  }

  // ── Rule: high alarm count ────────────────────────────────────────────────────
  if (site.alarms >= 5 && site.status !== "Critical") {
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "ANOMALY", sev: "MEDIUM",
      title: `${site.alarms} Active Alarms — Above Normal Threshold`,
      asset: site.id, site: site.name, detected, conf: 87,
      analysis: `${site.name} has ${site.alarms} active alarms — above the normal threshold of 3. High alarm density increases operator cognitive load and risk of missing critical alerts. AI analysis indicates alarms may share a common root cause: ${warns.length > 0 ? `${warns.length} assets in warning state across multiple blocks` : "possible systemic issue — multiple assets degraded simultaneously"}.`,
      rootCause: `Multiple concurrent asset faults — alarm count ${site.alarms} exceeds normal operational baseline of ≤3`,
      recommendation: `Triage alarms by severity in Alarm Management. Group alarms by asset type to identify systemic vs isolated faults. Investigate whether a single root cause (e.g. grid disturbance, weather event) triggered multiple alarms simultaneously.`,
      steps: ["Open Alarm Management and sort by severity.", "Group alarms by asset type (inverter / transformer / SCADA).", "Check if alarm timestamps cluster around a single event.", "Acknowledge alarms being actively investigated.", "Create a single RCA work order if alarms share a root cause."],
      impact: `${site.alarms} unresolved alarms risk operator fatigue. Missed critical alarm could cost $5,000–$50,000 in undetected fault damage. Resolution time target: <2h for HIGH, <8h for MEDIUM.`,
    });
  }

  // ── Rule: compliant / healthy site ───────────────────────────────────────────
  if (findings.length === 0) {
    findings.push({
      id: `INS-${siteId}-${++n}`, type: "OPTIMIZATION", sev: "LOW",
      title: `All Systems Nominal — Optimisation Opportunity`,
      asset: site.id, site: site.name, detected, conf: 99,
      analysis: `All monitored systems at ${site.name} are operating within normal parameters. Availability is ${site.availability}%, PR is ${site.pr}%, and no critical alarms are active. Generation is ${site.generation} MW against ${site.capacity} MW capacity (${Math.round(site.generation/site.capacity*100)}% CUF). No corrective action required.`,
      rootCause: "No faults detected — site operating within all thresholds",
      recommendation: `Review upcoming preventive maintenance schedule. Consider reactive power optimisation if power factor is below 0.98. Evaluate panel cleaning schedule based on current soiling rate.`,
      steps: ["Review CMMS for any overdue preventive maintenance tasks.", "Check power factor trend — optimise Q setpoint if below 0.98.", "Confirm next scheduled cleaning date is within soiling budget.", "Review 30-day generation vs forecast for any gradual decline.", "Update AI baseline parameters with current healthy operating data."],
      impact: `Site AI score: ${site.aiScore}/100. Health: ${site.health}%. Maintaining current performance: $${site.revenueToday.toLocaleString()}/day revenue.`,
    });
  }

  return findings;
}

// ── Advisor alarm format (used by SiteAIAlarmAdvisor) ─────────────────────────
// Returns array of { id, sev, title, asset, site, time, protocol, confidence,
//                    analysis, standards, immediate, preventive }
function generateAdvisorAlarms(siteId) {
  const site = SITES.find(s => s.id === siteId);
  if (!site) return [];
  const h   = HIERARCHY[siteId];
  const all = h ? h.blocks.flatMap(b => b.inverters) : [];
  const txs = h ? (h.transformers || []) : [];
  const isWind = site.type === "Wind";
  const t = _time();
  const alarms = [];
  let n = 0;

  // Danger inverters → CRITICAL
  for (const inv of all.filter(a => a.status === "danger")) {
    alarms.push({
      id: `AA-${siteId}-${++n}`, sev: "CRITICAL",
      title: isWind ? `Turbine Critical Fault — ${inv.name}` : `Inverter Critical Fault — ${inv.name}`,
      asset: inv.id, site: site.name, time: t, protocol: "ModbusTCP",
      confidence: Math.min(98, 88 + Math.round((100 - inv.health) / 5)),
      analysis: isWind
        ? `${inv.name} has entered critical state. Health score ${inv.health}% · nacelle temp ${inv.temp}°C · output ${inv.output}% of rated · ${inv.alarms} active alarm(s). AI vibration and power curve analysis indicates drive-train or pitch control fault. Immediate shutdown required — continued operation at this health level risks catastrophic blade or gearbox failure.`
        : `${inv.name} health score ${inv.health}%. Operating temperature ${inv.temp}°C — above 80°C IGBT safe operating limit. Output is ${inv.output}% of rated with ${inv.alarms} active alarm(s). Pattern analysis indicates thermal overload caused by cooling fan failure or DC string fault. Isolation required before IGBT or capacitor damage escalates.`,
      standards: isWind
        ? ["IEC 61400-1 (Wind turbines — Design requirements)", "IEC 61400-25 (Communications for wind plant monitoring)"]
        : ["IEC 62109-1 (Safety of power converters for PV systems)", "IEC 60364-7-712 (Low voltage — Solar PV supply)", "IEEE 1547 (Interconnection of distributed energy resources)"],
      immediate: isWind
        ? [`Issue Emergency Stop to ${inv.name} from SCADA.`, "Confirm rotor speed <5 RPM and blades feathered.", "Apply LOTO at tower-base MV switch — do not ascend until rotor locked.", `Download turbine controller fault log and send to OEM.`, "Raise emergency maintenance work order in CMMS."]
        : [`Isolate ${inv.id} at AC and DC disconnect switches.`, "Verify DC string voltage has dropped to <50 Vdc using combiner meter.", `Log fault codes from HMI and photograph display on ${inv.id}.`, "Do NOT attempt restart until root cause is confirmed.", "Raise corrective maintenance work order in CMMS."],
      preventive: isWind
        ? ["Schedule blade and drive-train inspection per IEC 61400-1 2-year interval.", "Increase CMS vibration monitoring to 15-min intervals for adjacent turbines.", "Review gearbox oil sample for metal particle contamination."]
        : [`Set over-temperature alarm threshold to 75°C (5°C buffer) on ${inv.id}.`, "Inspect cooling fans and heat sink fins in next scheduled PM cycle.", "Schedule quarterly MPPT algorithm validation and firmware update."],
    });
    if (alarms.length >= 6) break;
  }

  // Warning + high temp → HIGH
  for (const inv of all.filter(a => a.status === "warning" && a.temp > 65)) {
    if (alarms.length >= 6) break;
    alarms.push({
      id: `AA-${siteId}-${++n}`, sev: "HIGH",
      title: isWind ? `Nacelle Over-Temperature — ${inv.name}` : `Inverter Over-Temperature — ${inv.name}`,
      asset: inv.id, site: site.name, time: t, protocol: "ModbusTCP",
      confidence: Math.min(95, 75 + (inv.temp - 65)),
      analysis: isWind
        ? `${inv.name} nacelle temperature is ${inv.temp}°C, above the 60°C operating limit. Output is ${inv.output}% of rated. If temperature reaches 75°C, turbine will auto-derate. AI analysis suggests cooling system degradation — bearing lubricant viscosity reduces at high temperature, accelerating wear.`
        : `${inv.name} operating at ${inv.temp}°C — above the 65°C warning threshold. Output is ${inv.output}% of rated. Elevated temperature accelerates IGBT electromigration and solder joint fatigue, reducing mean time between failures. Cooling system inspection is required.`,
      standards: isWind
        ? ["IEC 61400-1 (Wind turbines — Design requirements)"]
        : ["IEC 62109-1 (Safety of power converters)", "IEC 60068-2 (Environmental testing)"],
      immediate: [
        `Acknowledge alarm on ${inv.id}.`,
        isWind ? `Verify nacelle cooling fan is running at rated speed on ${inv.name}.` : `Check cooling fan operation — confirm rated RPM on ${inv.id}.`,
        `If temperature does not decrease within 30 min, reduce ${isWind ? inv.name : inv.id} output by 10%.`,
        "Log current temperature reading and trend in shift log.",
      ],
      preventive: [
        isWind ? "Schedule nacelle cooling system service in next 7 days." : `Clean heat sink fins and verify thermal paste on ${inv.id} in next PM.`,
        "Apply ambient temperature derating curve if site ambient >42°C.",
        "Set alarm threshold to 60°C for earlier warning on this unit.",
      ],
    });
  }

  // Warning transformers → HIGH
  for (const tx of txs.filter(t => t.health < 80 || t.temp > 65)) {
    if (alarms.length >= 6) break;
    alarms.push({
      id: `AA-${siteId}-${++n}`, sev: tx.health < 70 ? "CRITICAL" : "HIGH",
      title: `Transformer Health Alert — ${tx.name}`,
      asset: tx.id, site: site.name, time: t, protocol: "IED",
      confidence: 88,
      analysis: `${tx.name} health index is ${tx.health}% with winding temperature ${tx.temp}°C and load ${tx.load}%. ${tx.temp > 65 ? `Temperature exceeds IEC 60076 ONAN limit — insulation aging rate doubles for every 8°C above rated.` : `Health index below 80% suggests insulation aging or partial discharge activity.`} Dissolved Gas Analysis (DGA) of oil sample is required to assess internal fault risk.`,
      standards: ["IEC 60076 (Power transformers)", "IEC 60599 (Interpretation of DGA in oil)", "IEC 62271-100 (HV switchgear and controlgear)"],
      immediate: [
        `Acknowledge transformer alarm on ${tx.id}.`,
        tx.temp > 65 ? "Check ONAN cooling fans are running and radiator fins are clear." : "Pull 30-day health trend from SCADA historian.",
        "Check oil level in conservator tank — top up if below minimum.",
        tx.health < 70 ? `Consider load reduction on ${tx.id} until inspection complete.` : "Monitor temperature trend over next 4 hours.",
      ],
      preventive: [
        `Order DGA oil sample for ${tx.id} — send to certified lab within 7 days.`,
        "Review transformer loading — derate if sustained load >80%.",
        "Schedule annual bushing, tap changer, and protection relay inspection.",
      ],
    });
  }

  // Warning + low output → WARNING
  for (const inv of all.filter(a => a.status === "warning" && a.output < 85 && a.temp <= 65)) {
    if (alarms.length >= 6) break;
    alarms.push({
      id: `AA-${siteId}-${++n}`, sev: "WARNING",
      title: isWind ? `Turbine Under-Performance — ${inv.name}` : `String Under-Current — ${inv.name}`,
      asset: inv.id, site: site.name, time: t, protocol: "ModbusTCP",
      confidence: 82,
      analysis: isWind
        ? `${inv.name} output is ${inv.output}% of rated power with health ${inv.health}%. AI power curve analysis shows deviation from expected output at current wind speed. Probable cause: pitch angle mis-calibration or early gearbox wear. No immediate safety risk but performance loss will compound without intervention.`
        : `${inv.name} generating at ${inv.output}% of rated output with health ${inv.health}%. String current deviation analysis indicates underperforming string(s) on this inverter. Probable causes: module soiling, bypass diode failure, string fuse interruption, or partial shading. IV-curve testing needed to identify affected string(s).`,
      standards: isWind
        ? ["IEC 61400-25 (Wind plant communications and monitoring)"]
        : ["IEC 62446-1 (PV system documentation and maintenance)", "IEEE 1547 (Interconnection of distributed energy resources)"],
      immediate: [
        `Acknowledge alarm on ${inv.id}.`,
        isWind ? `Review pitch angle data for ${inv.name} in SCADA historian over last 24h.` : `Check string combiner current readings for ${inv.id} in SCADA.`,
        "Compare output with adjacent assets at same irradiance to confirm deviation.",
        "Log finding in shift report — dispatch technician if deviation >15%.",
      ],
      preventive: [
        isWind ? `Schedule pitch control calibration on ${inv.name} in next 14 days.` : `Perform IV-curve trace on ${inv.id} in next PM cycle.`,
        isWind ? "Review CMS vibration signatures for early gearbox wear." : "Schedule EL (electroluminescence) imaging for degradation assessment.",
        "Set string-level under-current alarm at 85% of peer string average.",
      ],
    });
  }

  // Fallback if no assets triggered alarms but site has active alarms
  if (alarms.length === 0 && site.alarms > 0) {
    alarms.push({
      id: `AA-${siteId}-${++n}`, sev: "WARNING",
      title: `${site.alarms} Active Alarm(s) — Triage Required`,
      asset: site.id, site: site.name, time: t, protocol: "SCADA",
      confidence: 90,
      analysis: `${site.name} has ${site.alarms} active alarm(s) flagged by the monitoring system. Fleet availability is ${site.availability}% and PR is ${site.pr}%. AI analysis has identified the alarms but asset-level detail requires operator review in the Alarm Management console to determine affected equipment.`,
      standards: ["IEC 61850 (Communication networks for power utility automation)", "IEC 62351 (Security for power systems communication)"],
      immediate: ["Open Alarm Management and review all active alarms.", "Prioritise by severity — acknowledge Critical alarms first.", "Dispatch technician to site if any alarm is unacknowledged >1h."],
      preventive: ["Configure alarm correlation rules to reduce alarm flood events.", "Review setpoint thresholds — adjust to reduce nuisance alarms.", "Schedule training for operators on alarm management best practices."],
    });
  }

  return alarms;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" }));

// ── Portfolio ─────────────────────────────────────────────────────────────────
app.get("/api/portfolio/kpi", (_req, res) => res.json(_liveKpi()));

// ── Sites ─────────────────────────────────────────────────────────────────────
app.get("/api/sites", (req, res) => {
  let result = [..._liveSites];          // live ticking values
  const { region, type, status } = req.query;
  if (region) result = result.filter((s) => s.region === region);
  if (type)   result = result.filter((s) => s.type   === type);
  if (status) result = result.filter((s) => s.status === status);
  res.json(result);
});

app.get("/api/sites/:id", (req, res) => {
  const site = _liveSites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: `Site '${req.params.id}' not found` });
  res.json(site);
});

app.get("/api/sites/:id/hierarchy", (req, res) => {
  const h = HIERARCHY[req.params.id];
  if (!h) return res.status(404).json({ error: `Hierarchy not available for '${req.params.id}'` });
  res.json(h);
});

app.get("/api/sites/:id/work-orders", (req, res) => {
  const wos = WORK_ORDERS.filter((w) => w.siteId === req.params.id);
  const { status } = req.query;
  res.json(status ? wos.filter((w) => w.status === status) : wos);
});

app.get("/api/sites/:id/ai-findings", (req, res) => {
  const site = SITES.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json(generateInsights(req.params.id));
});

app.get("/api/sites/:id/ai-alarms", (req, res) => {
  const site = SITES.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json(generateAdvisorAlarms(req.params.id));
});

// ── Telemetry (time-series) ───────────────────────────────────────────────────
app.get("/api/telemetry/:siteId/generation", (req, res) => {
  const site = SITES.find((s) => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const period = req.query.period || "24h";
  const seed = req.params.siteId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  if (period === "7d") return res.json(generate7d(site.generation * 7.8, 0.1, seed));
  if (period === "30d") {
    return res.json(
      generate30d((site.generation * 8) / 1000, 0.1, seed).map((d) => ({
        time: String(d.day),
        actual: d.value,
        forecast: +(d.value * 1.05).toFixed(1),
      })),
    );
  }
  res.json(generate24h(site.generation, 0.12, seed).map((d) => ({ time: d.time, actual: d.actual, forecast: d.forecast })));
});

app.get("/api/telemetry/:siteId/availability", (req, res) => {
  const site = SITES.find((s) => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const seed = req.params.siteId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 1;
  res.json(generate30d(site.availability, 0.04, seed).map((d) => ({ time: String(d.day), value: Math.min(100, d.value) })));
});

app.get("/api/telemetry/:siteId/irradiance", (req, res) => {
  const site = SITES.find((s) => s.id === req.params.siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const seed = req.params.siteId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 2;
  const rand = seededRand(seed);
  res.json(
    generate24h(site.generation, 0.12, seed).map((d, i) => ({
      time: d.time,
      generation: d.actual,
      irradiance: Math.max(0, Math.round(850 * Math.sin((Math.PI * i) / 16) + (rand() - 0.5) * 60)),
    })),
  );
});

// ── Work Orders ───────────────────────────────────────────────────────────────
app.get("/api/work-orders", (req, res) => {
  let result = [...WORK_ORDERS];
  const { siteId, status, priority, type } = req.query;
  if (siteId) result = result.filter((w) => w.siteId === siteId);
  if (status) result = result.filter((w) => w.status === status);
  if (priority) result = result.filter((w) => w.priority === priority);
  if (type) result = result.filter((w) => w.type === type);
  res.json(result);
});

app.get("/api/work-orders/:id", (req, res) => {
  const wo = WORK_ORDERS.find((w) => w.id === req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found" });
  res.json(wo);
});

app.post("/api/work-orders", (req, res) => {
  const { title, siteId, asset, type, priority, assignee, dueDate, description, estimatedHours } = req.body;
  if (!title || !siteId) return res.status(400).json({ error: "title and siteId are required" });
  const newWO = {
    id: `WO-${Date.now()}`,
    title,
    siteId,
    asset: asset || "",
    type: type || "Corrective",
    status: "Open",
    priority: priority || "Medium",
    assignee: assignee || "Unassigned",
    dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    description: description || "",
    estimatedHours: estimatedHours || 1,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  WORK_ORDERS.push(newWO);
  res.status(201).json(newWO);
});

app.patch("/api/work-orders/:id", (req, res) => {
  const idx = WORK_ORDERS.findIndex((w) => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Work order not found" });
  const allowed = ["status", "priority", "assignee", "dueDate", "description"];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) WORK_ORDERS[idx][key] = req.body[key];
  });
  res.json(WORK_ORDERS[idx]);
});

// ── Technicians ───────────────────────────────────────────────────────────────
app.get("/api/technicians", (req, res) => {
  const { status, site } = req.query;
  let result = [...TECHNICIANS];
  if (status) result = result.filter((t) => t.status === status);
  if (site) result = result.filter((t) => t.currentSite === site);
  res.json(result);
});

// ── AI Findings ───────────────────────────────────────────────────────────────
app.get("/api/ai-findings", (req, res) => {
  const { priority, site } = req.query;
  let result = SITES.flatMap(s => generateInsights(s.id));
  if (priority) result = result.filter(f => f.sev && f.sev.toLowerCase() === priority.toLowerCase());
  if (site)     result = result.filter(f => f.site.toLowerCase().includes(site.toLowerCase()));
  res.json(result);
});

// ── Assets ────────────────────────────────────────────────────────────────────
app.get("/api/assets", (req, res) => {
  const { status, type } = req.query;
  let result = [...ASSETS];
  if (status) result = result.filter((a) => a.status === status);
  if (type) result = result.filter((a) => a.type === type);
  res.json(result);
});

// ── 404 + error handlers ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SOPs  —  persisted to api/data/sops.json
// ═══════════════════════════════════════════════════════════════════════════════
const fs   = require("fs");
const path = require("path");
const SOPS_FILE = path.join(__dirname, "data", "sops.json");

function readSops() {
  try { return JSON.parse(fs.readFileSync(SOPS_FILE, "utf8")); }
  catch { return []; }
}
function writeSops(data) {
  fs.writeFileSync(SOPS_FILE, JSON.stringify(data, null, 2), "utf8");
}

// GET /api/sops  — optional ?category= &applicableTo=
app.get("/api/sops", (req, res) => {
  let sops = readSops();
  if (req.query.category)     sops = sops.filter(s => s.category === req.query.category);
  if (req.query.applicableTo) sops = sops.filter(s => s.applicableTo.includes(req.query.applicableTo));
  if (req.query.alarmCode)    sops = sops.filter(s => s.alarmCode === req.query.alarmCode || (s.relatedAlarms || []).includes(req.query.alarmCode));
  res.json(sops);
});

// GET /api/sops/:id
app.get("/api/sops/:id", (req, res) => {
  const sop = readSops().find(s => s.id === req.params.id);
  if (!sop) return res.status(404).json({ error: "SOP not found" });
  res.json(sop);
});

// POST /api/sops  — create
app.post("/api/sops", (req, res) => {
  const sops = readSops();
  const newSop = {
    ...req.body,
    id: "sop-" + Date.now(),
    lastRevised: new Date().toISOString().slice(0, 10),
    status: req.body.status || "Active",
  };
  sops.push(newSop);
  writeSops(sops);
  res.status(201).json(newSop);
});

// PUT /api/sops/:id  — full update
app.put("/api/sops/:id", (req, res) => {
  const sops = readSops();
  const idx  = sops.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "SOP not found" });
  sops[idx] = { ...sops[idx], ...req.body, id: req.params.id, lastRevised: new Date().toISOString().slice(0, 10) };
  writeSops(sops);
  res.json(sops[idx]);
});

// DELETE /api/sops/:id
app.delete("/api/sops/:id", (req, res) => {
  const sops = readSops();
  const idx  = sops.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "SOP not found" });
  sops.splice(idx, 1);
  writeSops(sops);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n✅  Renewable Dashboard API  →  http://localhost:${PORT}\n`);
  console.log("  GET  /api/health");
  console.log("  GET  /api/portfolio/kpi");
  console.log("  GET  /api/sites                       ?region= &type= &status=");
  console.log("  GET  /api/sites/:id");
  console.log("  GET  /api/sites/:id/hierarchy");
  console.log("  GET  /api/sites/:id/work-orders       ?status=");
  console.log("  GET  /api/sites/:id/ai-findings");
  console.log("  GET  /api/telemetry/:siteId/generation ?period=24h|7d|30d");
  console.log("  GET  /api/telemetry/:siteId/availability");
  console.log("  GET  /api/telemetry/:siteId/irradiance");
  console.log("  GET  /api/work-orders                 ?siteId= &status= &priority= &type=");
  console.log("  GET  /api/work-orders/:id");
  console.log("  POST /api/work-orders");
  console.log("  PATCH /api/work-orders/:id");
  console.log("  GET  /api/technicians                 ?status= &site=");
  console.log("  GET  /api/ai-findings                 ?priority= &site=");
  console.log("  GET  /api/assets                      ?status= &type=\n");
});
