# Renewable Energy Dashboard — UI/UX Reference

**Status:** Authoritative. All pages, components, and charts must conform to both this document and `brand (1).md`. In any conflict, the more specific rule wins.

---

## 0. Design System Foundation

This dashboard is built on the enterprise design system defined in `brand (1).md`. Key non-negotiables:

- **Default theme:** dark (`body[data-theme="dark"]`)
- **Font:** Inter (300/400/500/600/700), no fallback fonts
- **Surfaces:** flat, opaque — no glassmorphism, no gradients on chrome
- **Colour discipline:** RAG = status only · brand accent = chrome + primary chart series · `--ds-advisory` (violet) = AI content only
- **Forbidden:** glassmorphism, neumorphism, neon glows, gradient backgrounds, particle systems, `text-transform: uppercase` on body/values, emoji as icons
- **Charts:** one library, `getChartTokens()` helper, `chartTooltip()` / `chartScales()` shared helpers

---

## 1. Token Quick Reference

### 1.1 Core Surfaces

| Token                 | Dark      | Light     |
| --------------------- | --------- | --------- |
| `--ds-bg`             | `#1c1c1c` | `#f1f5fa` |
| `--ds-panel`          | `#0a0a0a` | `#ffffff` |
| `--ds-surface`        | `#202020` | `#ffffff` |
| `--ds-surface-soft`   | `#141414` | `#f7f9fc` |
| `--ds-surface-raised` | `#2a2a2a` | `#edf1f8` |

### 1.2 Typography Tokens

| Token             | Dark      | Light     |
| ----------------- | --------- | --------- |
| `--ds-text`       | `#e8eef5` | `#0d0d0d` |
| `--ds-text-muted` | `#afc3d8` | `#1f1f1f` |
| `--ds-text-faint` | `#8ca0b6` | `#4a4a4a` |

### 1.3 RAG Tokens (status only)

| Status  | Colour (dark) | Background              | Border                  |
| ------- | ------------- | ----------------------- | ----------------------- |
| Success | `#16a34a`     | `rgba(22,163,74,0.12)`  | `rgba(22,163,74,0.35)`  |
| Warning | `#d97706`     | `rgba(245,158,11,0.12)` | `rgba(245,158,11,0.35)` |
| Danger  | `#dc2626`     | `rgba(220,38,38,0.12)`  | `rgba(220,38,38,0.35)`  |
| Info    | `#0ea5e9`     | `rgba(14,165,233,0.12)` | `rgba(14,165,233,0.35)` |

### 1.4 AI / Advisory Tokens

| Token                  | Dark                    | Light     |
| ---------------------- | ----------------------- | --------- |
| `--ds-advisory`        | `#8b5cf6`               | `#7c3aed` |
| `--ds-advisory-panel`  | `rgb(130,90,210)`       | same      |
| `--ds-advisory-border` | `rgba(139,92,246,0.45)` | same      |
| `--ds-violet`          | `#8b5cf6`               | `#7c3aed` |
| `--ds-violet-bg`       | `rgba(139,92,246,0.10)` | same      |

### 1.5 Chart Categorical Palette (non-status series, in order)

| #   | Hex (dark) | Name                                        |
| --- | ---------- | ------------------------------------------- |
| 1   | `#5b8de0`  | Brand blue (primary series)                 |
| 2   | `#38bdf8`  | Sky                                         |
| 3   | `#14b8a6`  | Teal                                        |
| 4   | `#f59e0b`  | Amber (only if no RAG warning line present) |
| 5   | `#ec4899`  | Pink                                        |
| 6   | `#6366f1`  | Indigo                                      |
| 7   | `#a3e635`  | Lime                                        |
| 8   | `#94a3b8`  | Slate (neutral / "Other")                   |

Predictive/forecast series: `--ds-violet`, dashed `[5,4]`, 2 px, `--ds-violet-bg` fill.

---

## 2. Application Chrome

### 2.1 Sidebar

- Open: `244px` · Collapsed: `60px`
- Background: deepest neutral in dark, brightest white in light
- Section labels: 11 px / 700 / uppercase / 0.08 em tracking / `--ds-text-muted`
- Nav items: 14 px / 500 (600 active) / `10×14px` padding / 8 px radius
- Active row: `--ds-accent-bg` bg + `--ds-accent` text + `--ds-accent-border` border
- Icons: 16×16 SVG line art, `stroke-width: 1.6`, `currentColor`

**Navigation items (in order):**

```
MONITORING
  ├ Global Operations Center      [IcoGlobe]
  ├ Site Command Center           [IcoBuilding]

INTELLIGENCE
  ├ Asset Performance             [IcoWrench]
  ├ Energy & Forecasting          [IcoTrendUp]

REPORTING
  └ Executive & ESG Center        [IcoChart]
```

### 2.2 Top Header (62 px)

Left → right: Sidebar collapse · Breadcrumb/Page title · Search (center, max 480 px) · AI Advisory button · Theme toggle · Notifications bell · Profile circle

- AI Advisory button: `--ds-advisory` fill, white text — only AI-hued element in header
- Bell badge: 16 px circle, `--ds-danger` fill, `pulse-glow` if critical alarms > 0
- Profile trigger: 36×36 px, 999 px radius

---

## 3. Shared KPI Card Spec

Structure (top → bottom):

1. Row 1 — icon (28×28, 12 px radius, accent-tinted) LEFT + trend badge + "vs previous" caption RIGHT
2. Row 2 — stat value (`clamp(1.4rem, 3vw, 2.2rem)` / 700 / `--ds-text`) + unit (faint, 0.75 rem)
3. Row 3 — label (14 px / `--ds-text-muted` / ellipsised)
4. Hairline divider (`rgba(255,255,255,0.08)` dark / `rgba(0,0,0,0.10)` light, 6 px margin)
5. Row 4 — RAG badge: `NORMAL` | `WARNING` | `CRITICAL` (10 px / 700 / 0.06 em / uppercase)
6. Bottom-right — eye icon button (20 px) → detail modal

Visual rules:

- `padding: 10px 12px 8px` (compact, 6-card row)
- `border-radius: 16px` · background `--ds-surface`
- No shadow at rest · hover: `transform: translateY(-2px)` only
- Trend badge: `rgba(34,197,94,0.12)` positive / `rgba(239,68,68,0.12)` negative

---

## 4. PAGE 1 — Global Operations Center

**Role:** Primary situational awareness surface. Never navigate away from this page to reach core status.

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  Header (62px)                                          │
├─────────────────────────────────────────────────────────┤
│  KPI Strip — 12 cards · grid-cols-6 xl / 4 md / 3 sm   │
├──────────────────────────────────┬──────────────────────┤
│                                  │  AI Intelligence     │
│  GIS + Digital Twin Map (70%)    │  Panel (30%)         │
│                                  │                      │
│  [Leaflet, greyscale tiles]      │  [right-edge fixed]  │
│                                  │                      │
├──────────────────────────────────┴──────────────────────┤
│  Portfolio Charts Row (4 charts · 2-col grid lg)        │
└─────────────────────────────────────────────────────────┘
```

### 4.2 KPI Strip — 12 Cards

Grid: `grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3` (two rows of 6)

| #   | Label                    | Value       | RAG Rule                                    |
| --- | ------------------------ | ----------- | ------------------------------------------- |
| 1   | Total Portfolio Capacity | 5.2 GW      | Info (static)                               |
| 2   | Available Capacity       | 4.9 GW      | Success ≥98% · Warning 95–98% · Danger <95% |
| 3   | Current Generation       | 3.7 GW      | Compare vs forecast                         |
| 4   | Portfolio Availability   | 98.2%       | Success ≥97% · Warning 94–97% · Danger <94% |
| 5   | Portfolio PR             | 84.3%       | Success ≥80% · Warning 75–80% · Danger <75% |
| 6   | Daily Energy             | 92 GWh      | Compare vs target                           |
| 7   | Revenue Today            | $1.9M       | Compare vs budget                           |
| 8   | Carbon Offset            | 41,000 tCO₂ | Info                                        |
| 9   | Open Alarms              | 78          | Success 0 · Warning 1–20 · Danger >20       |
| 10  | Critical Alarms          | 7           | Success 0 · Warning 1–3 · Danger >3         |
| 11  | Work Orders              | 132         | Info                                        |
| 12  | AI Confidence            | 94%         | Success ≥90% · Warning 75–90% · Danger <75% |

### 4.3 GIS + Digital Twin Map (70% width)

Library: Leaflet, greyscale tiles. `background: var(--ds-bg)`.

- Page fills the panel — KPI cards must never float on top of the map (see brand §8)
- Site markers: 14 px circle, RAG fill (health-score driven), `1px solid rgba(0,0,0,0.4)` border
- Active/live markers: `pulse-glow` on dot only
- Region polygons: `stroke: --ds-accent`, `fill: --ds-accent` at 10% alpha
- Map controls (zoom, recenter, layers): control-button style, 32×32 px, top-right corner
- Popups: `--ds-panel` bg, 10 px radius, `--ds-shadow-md` — no Leaflet default bubble

**Site Hierarchy (initial state):**

```
World
 ├ USA
 │   ├ Solar Farm A     [status dot]
 │   └ Solar Farm B     [status dot]
 ├ India
 │   ├ Wind Farm A      [status dot]
 │   └ BESS Site A      [status dot]
 └ Germany
     └ Hybrid Plant A   [status dot]
```

**On Site Marker Click:**

1. Map zooms to site (smooth animation, 0.5 s)
2. Popup opens — `--ds-panel` surface, 10 px radius, `--ds-shadow-md`

Popup content:

```
[Site Name]                        [Health Score badge]
──────────────────────────────────────────────────
Generation:   XXX MW    [sparkline 24h]
Availability: XX.X%     [progress bar RAG]
Forecast:     XXX MW    [vs actual delta]
Weather:      ☀ 24°C  Wind 12 km/h

[Mini Digital Twin]
  ┌──────────────┐
  │  3D Preview  │  Panels · Inverters · Substation · BESS
  └──────────────┘

[Open Site Command Center →]   [ghost-link]
```

Mini DT: embedded 3D preview within the popup. Click → navigates to Page 2 (Site Command Center).

### 4.4 AI Intelligence Panel (30% width, right side)

Surface: `--ds-advisory-panel`, left border `4px solid --ds-advisory-border`.
Text: light cream (`#fef9ef`). Inner finding cards: near-white bg, dark AI-hued text.
Animate: `slide-in-right` 0.28 s.

**Panel Header:**

```
[⚡ AI INTELLIGENCE]                [Refresh icon]
AI Confidence: 94%  [Success chip]
```

**Finding Card structure** (repeating):

```
┌─────────────────────────────────────────────────┐
│  [Site Name]                [Priority chip]     │
│  Generation ↓ 8%                                │
│  ─────────────────────────────────────────────  │
│  Root Cause:  Cloud Cover 61%                   │
│  Expected Loss: $18,200                         │
│  ─────────────────────────────────────────────  │
│  Recommended Action:                            │
│  Delay battery charging                         │
│                             [Act →] [Dismiss]   │
└─────────────────────────────────────────────────┘
```

- Priority chips inside AI panel only: Urgent (danger-tinted), Watch (warning-tinted), Info (info-tinted) — these chip hues are scoped to AI panel, never bleed to main canvas
- Max 5 findings visible, scrollable

### 4.5 Portfolio Charts Row

Grid: `grid-cols-2 lg:grid-cols-4 gap-4`

| Chart                  | Type           | Series                                            | Timeframe | Notes                                       |
| ---------------------- | -------------- | ------------------------------------------------- | --------- | ------------------------------------------- |
| Capacity by Technology | Doughnut       | Solar · Wind · BESS · Hydro (categorical palette) | Static    | `cutout: 65%`, max 6 segments, legend right |
| Generation Trend       | Line           | Actual (brand blue) · Forecast (violet dashed)    | 24H / 7D  | Area fill 12% alpha                         |
| Site Health Ranking    | Horizontal Bar | Health score per site                             | 24H       | RAG fill per bar                            |
| Alarm Distribution     | Doughnut       | Critical · Major · Minor                          | Live      | RAG fills (danger / warning / info)         |

Chart card wrapper: `--ds-panel` bg · `--ds-border` border · `border-radius: 8px` · `padding: 12px`
Header: title (10 px UPPERCASE `--ds-text-muted`) + timeframe selector + eye icon (11×11)

---

## 5. PAGE 2 — Site Command Center

**Accessed via:** map popup "Open Site Command Center" link, or sidebar → Site Command Center (with site pre-selected via context).

### 5.1 Header

Breadcrumb: `Global Operations › [Region] › [Site Name]`

- Preceding crumbs: `--ds-text-muted` + clickable
- Last crumb: `--ds-text`
- Separator: `›` in `--ds-text-faint`

### 5.2 Header KPI Strip — 8 Cards

Grid: `grid-cols-4 xl:grid-cols-8 gap-3`

| #   | Label         | RAG Rule                                    |
| --- | ------------- | ------------------------------------------- |
| 1   | Site Capacity | Info                                        |
| 2   | Current MW    | Compare vs rated                            |
| 3   | Daily MWh     | Compare vs target                           |
| 4   | PR            | Success ≥80% · Warning 75–80% · Danger <75% |
| 5   | CUF           | Success ≥22% · Warning 18–22% · Danger <18% |
| 6   | Revenue       | Compare vs budget                           |
| 7   | Availability  | Success ≥97% · Warning 94–97% · Danger <94% |
| 8   | Health Score  | Success ≥85 · Warning 70–85 · Danger <70    |

### 5.3 Main Layout (3-column)

```
┌──────────────┬─────────────────────────┬──────────────┐
│ Embedded DT  │   Operational KPIs +    │  AI Copilot  │
│ (30%)        │   Site Charts           │  (30%)       │
│              │   (40%)                 │              │
└──────────────┴─────────────────────────┴──────────────┘
```

Grid: `grid-cols-3 gap-4`, left = `col-span-1`, centre = `col-span-1`, right = `col-span-1`

### 5.4 Embedded Digital Twin (30% — left column)

Solar farm DT hierarchy:

```
Solar Farm
 ├ Inverters      [clickable]
 ├ Combiner Boxes [clickable]
 ├ Weather Station
 ├ Transformer    [clickable]
 └ BESS           [clickable]
```

**On Component Click** (e.g. Inverter INV-14):

- DT view zooms to component
- Detail panel overlays below the DT (within the column, not modal):

```
INV-14 — Inverter                    [WARNING chip]
──────────────────────────────────────
Temperature:  68°C     [progress RAG]
Current:      142 A    [progress RAG]
Voltage:      480 V    [Normal]
Efficiency:   94.1%    [progress RAG]
Active Alarm: Over-temp threshold
──────────────────────────────────────
[View Full History →]    [Create WO →]
```

### 5.5 Operational KPIs + Site Charts (40% — centre)

**Charts (stacked, full column width):**

| Chart                        | Type           | Series                                              | Timeframe |
| ---------------------------- | -------------- | --------------------------------------------------- | --------- |
| Generation vs Forecast       | Line           | Actual (brand blue) · Forecast (violet dashed)      | 24H       |
| Irradiance vs Production     | Dual Line      | Irradiance (teal) · Production (brand blue)         | 24H / 7D  |
| Revenue Trend                | Line           | Revenue (brand blue)                                | 7D        |
| Availability Trend           | Line           | Availability % (brand blue) · Target (dashed amber) | 30D       |
| Inverter Performance Ranking | Horizontal Bar | Top 20 by output (RAG fill per bar)                 | 24H       |

All charts: `height: 160px` except Inverter Ranking (`height: 220px`).

Generation vs Forecast axis labels:

- Y: `MW` · X: `06 · 09 · 12 · 15 · 18` (24H ticks)
- Tick colour: `--ds-text-faint` / 9 px
- X grid: hidden · Y grid: hidden

### 5.6 AI Copilot (30% — right column)

Surface: `--ds-advisory-panel`, left border `4px solid --ds-advisory-border`.

```
[🤖 AI COPILOT]
──────────────────────────────────────────
Why is generation down?

[Finding card — advisory modal bg]
  Cloud Cover: 24%
  Inverter INV-14 Offline

[Recovery card — info modal bg]
  Predicted Recovery: 14:20
  Confidence: 91%

[Action card — warning modal bg]
  Suggested: Skip afternoon peak charge
  Est. savings: $4,200

──────────────────────────────────────────
Ask a question...  [input 32px, 8px radius]
[Send →]           [primary button]
```

Input background: `--ds-bg`, border `--ds-border`, focus: `--ds-accent-border`.

---

## 6. PAGE 3 — Asset Performance & Maintenance

**Role:** Asset intelligence — health trends, failure probability, maintenance scheduling. Not a flat asset list.

### 6.1 KPI Strip — 8 Cards

Grid: `grid-cols-4 xl:grid-cols-8 gap-3`

| #   | Label       | RAG Rule                                        |
| --- | ----------- | ----------------------------------------------- |
| 1   | Asset Count | Info                                            |
| 2   | Healthy     | Success always                                  |
| 3   | Warning     | Warning if > 0                                  |
| 4   | Critical    | Danger if > 0                                   |
| 5   | MTBF        | Success ≥720h · Warning 480–720h · Danger <480h |
| 6   | MTTR        | Success ≤4h · Warning 4–8h · Danger >8h         |
| 7   | Open WO     | Warning if > 50 · Danger if > 100               |
| 8   | Closed WO   | Info                                            |

### 6.2 Main Layout

```
┌──────────────────┬────────────────────────────────┐
│  Asset DT Viewer │  Charts + AI Section            │
│  (35%)           │  (65%)                          │
└──────────────────┴────────────────────────────────┘
```

### 6.3 Asset DT Viewer (35% — left)

Asset type selector (segmented control, top of panel):
`Transformer · Switchgear · Inverter · Battery · Turbine`

Active state: accent bg + accent text + accent border (brand §6.3 segmented).

On asset click → detail overlay within column:

```
[Asset Name]                        [Health chip]
──────────────────────────────────────────────────
Health Score:  78/100   [progress RAG]
Temperature:   72°C     [progress RAG]
Load:          84%      [progress RAG]
Vibration:     0.24 g   [progress Normal]
Active Alarm:  Cooling degradation
──────────────────────────────────────────────────
Failure Probability: 32%            [danger chip]
[Schedule Inspection]    [View WO History]
```

### 6.4 Charts (65% — right, 2-column grid)

| Chart                     | Type           | Series                                                 | Timeframe |
| ------------------------- | -------------- | ------------------------------------------------------ | --------- |
| Asset Health Ranking      | Horizontal Bar | Health score (RAG fill)                                | 24H       |
| Failure Probability Trend | Line           | Probability % (brand blue) · Threshold (dashed danger) | 30D       |
| Work Order Trend          | Line           | Open (warning amber) · Closed (teal)                   | 30D       |
| Maintenance Cost          | Bar            | Monthly cost (brand blue)                              | 30D       |
| Failure Root Cause        | Doughnut       | Cause categories (categorical palette)                 | 30D       |

Grid: `grid-cols-2 gap-4`. Failure Root Cause spans full width (`col-span-2`).

### 6.5 AI Failure Prediction Section

Below charts, full width. Surface: `--ds-panel`, left border `4px solid --ds-advisory-border`.

```
[⚡ AI PREDICTIVE MAINTENANCE]
──────────────────────────────────────────────────────────
┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐
│ Transformer T-12│ │  Inverter INV-7 │ │  Battery B-3  │
│                 │ │                 │ │               │
│ Failure Risk    │ │ Failure Risk    │ │ Failure Risk  │
│ 32%  [danger]   │ │ 18%  [warning]  │ │ 8%   [normal] │
│                 │ │                 │ │               │
│ Cooling         │ │ IGBT degradation│ │ SOH 91%       │
│ degradation     │ │                 │ │               │
│                 │ │                 │ │               │
│ Schedule insp.  │ │ Monitor closely │ │ No action     │
│ within 14 days  │ │ this week       │ │ required      │
└─────────────────┘ └─────────────────┘ └───────────────┘
```

Finding cards: `--ds-modal-{advisory}-bg/-border` within this panel (modal-card token usage — scoped to AI sections).

---

## 7. PAGE 4 — Energy Intelligence & Forecasting

**Role:** AI-driven generation forecasting, dispatch optimisation, revenue impact. No separate AI page.

### 7.1 KPI Strip — 6 Cards

Grid: `grid-cols-3 xl:grid-cols-6 gap-3`

| #   | Label             | RAG Rule                                                          |
| --- | ----------------- | ----------------------------------------------------------------- |
| 1   | Forecast Accuracy | Success ≥95% · Warning 90–95% · Danger <90%                       |
| 2   | Revenue Impact    | Compare vs plan                                                   |
| 3   | Reserve Cost      | Warning if above budget                                           |
| 4   | Curtailment       | Success 0% · Warning 1–5% · Danger >5%                            |
| 5   | Demand            | Compare vs forecast                                               |
| 6   | Grid Frequency    | Success 49.8–50.2 Hz · Warning outside ±0.2 · Danger outside ±0.5 |

### 7.2 Main Layout

```
┌────────────────────────────────┬──────────────────────┐
│  Charts (65%)                  │  AI Insights Panel   │
│                                │  (35%)               │
├────────────────────────────────┴──────────────────────┤
│  Embedded DT — Weather Overlay (full width)           │
└───────────────────────────────────────────────────────┘
```

### 7.3 Charts (65% — left, 2-column grid)

| Chart                   | Type    | Series                                                       | Timeframe |
| ----------------------- | ------- | ------------------------------------------------------------ | --------- |
| Day-Ahead Forecast      | Line    | Forecast (violet dashed) · Actual (brand blue)               | 24H       |
| Actual vs Forecast (7D) | Line    | Actual (brand blue) · Forecast (violet dashed)               | 7D        |
| Reserve Optimisation    | Bar     | Scheduled (teal) · Actual (brand blue) · Excess (amber)      | 24H       |
| Price Forecast          | Line    | Price (brand blue) · Forecast (violet dashed)                | 24H / 7D  |
| Battery Dispatch Plan   | Area    | Charge (sky) · Discharge (teal) · SOC % (right axis, indigo) | 24H       |
| Weather Impact          | Scatter | Irradiance vs Output (brand blue dots)                       | 7D        |

Area fill alpha: 12% of border colour. Dual-axis: only when units genuinely differ (§1 brand: no mixing units on same axis without secondary axis).

### 7.4 AI Insights Panel (35% — right)

Surface: `--ds-advisory-panel`, left border `4px solid --ds-advisory-border`.

```
[⚡ AI ENERGY INSIGHTS]                    Tomorrow
──────────────────────────────────────────────────────
Expected Output: 85 GWh         Confidence: 93%
[Success chip]

[Finding card — advisory bg]
  High Wind Event: 14:00–18:00
  Expected peak: +18% above P50

[Action card — warning bg]
  Recommended Action:
  Reserve battery capacity for evening peak
  Est. additional revenue: +$34,000

[Info card — info bg]
  Solar irradiance forecast: 5.8 kWh/m²
  Cloud probability: 12%

[Advisory card]
  Curtailment risk at Site B: 6%
  Consider grid export schedule adjustment
```

### 7.5 Embedded DT — Weather Overlay (full width, below charts)

Weather overlaid on site DT wireframe:

```
┌──────────────────────────────────────────────────────────┐
│  [Site DT wireframe with weather layer toggles]          │
│                                                          │
│  Layer toggles (top-right, control-button style):        │
│  [Cloud Movement]  [Wind Direction]  [Storm]  [Rainfall] │
│                                                          │
│  Active layer: Wind Direction arrows overlaid on DT      │
└──────────────────────────────────────────────────────────┘
```

Map layer toggles: segmented control (4 options — see brand §6.3 segmented).
DT wireframe height: `280px`.

---

## 8. PAGE 5 — Executive & ESG Center

**Role:** CEO/CFO surface. Financial performance, ESG metrics, portfolio overview.

### 8.1 KPI Strip — 8 Cards

Grid: `grid-cols-4 xl:grid-cols-8 gap-3`

| #   | Label         | RAG Rule                                    |
| --- | ------------- | ------------------------------------------- |
| 1   | EBITDA        | Compare vs target                           |
| 2   | Revenue       | Compare vs budget                           |
| 3   | OPEX          | Success if under budget · Danger if over    |
| 4   | CAPEX         | Info                                        |
| 5   | Carbon Offset | Info                                        |
| 6   | Availability  | Success ≥97% · Warning 94–97% · Danger <94% |
| 7   | Fleet Health  | Success ≥85 · Warning 70–85 · Danger <70    |
| 8   | ROI           | Compare vs plan                             |

### 8.2 Main Layout

```
┌────────────────────────────────┬──────────────────────┐
│  Portfolio Charts (65%)        │  AI Executive        │
│                                │  Summary (35%)       │
└────────────────────────────────┴──────────────────────┘
```

### 8.3 Charts (65% — left, 2-column grid)

| Chart                   | Type           | Series                                         | Timeframe |
| ----------------------- | -------------- | ---------------------------------------------- | --------- |
| Revenue by Site         | Horizontal Bar | Revenue per site (brand blue)                  | 30D       |
| Revenue by Technology   | Doughnut       | Solar · Wind · BESS · Hydro                    | 30D       |
| Carbon Reduction        | Line           | Monthly offset (teal) · Target (dashed violet) | 30D       |
| Energy Production Mix   | Doughnut       | Technology breakdown                           | 30D       |
| Top Performing Sites    | Horizontal Bar | Top 5 by PR (success-bar fill)                 | 30D       |
| Bottom Performing Sites | Horizontal Bar | Bottom 5 by PR (danger-bar fill)               | 30D       |

Top/Bottom site charts: `col-span-1` each, placed in the same row for direct comparison.

### 8.4 AI Executive Summary (35% — right)

Surface: `--ds-advisory-panel`, left border `4px solid --ds-advisory-border`.

```
[⚡ AI EXECUTIVE SUMMARY]        [Date: Jun 2, 2026]
─────────────────────────────────────────────────────

[Success card]
  Portfolio availability improved: +1.7%
  vs previous period

[Success card]
  Revenue increased: +$420K
  vs previous period

[Warning card]
  Site B requires maintenance
  Estimated revenue impact: -$12,000/week
  if deferred beyond 14 days

[Success card]
  Battery optimisation savings: +$91K
  AI dispatch strategy applied

─────────────────────────────────────────────────────
[Download PDF Report]    [Schedule Board Update]
```

Finding cards use `--ds-modal-{success|warning|danger|info}-bg/-border` tokens (inside this AI panel, which acts as a modal-equivalent surface for token scoping purposes).

Buttons:

- Download PDF: control/secondary style
- Schedule Board Update: primary action style (one per panel rule — these two are in different visual rows)

---

## 9. Digital Twin Integration (No Separate DT Page)

DT is embedded inline across pages. Summary:

| Page                       | DT Usage                         | Implementation                                |
| -------------------------- | -------------------------------- | --------------------------------------------- |
| Page 1 — Global Ops        | Site Preview DT in map popup     | Mini 3D preview, 180×120 px, in Leaflet popup |
| Page 2 — Site Command      | Full Site DT (30% left column)   | Full interactive DT, click-to-zoom components |
| Page 3 — Asset Performance | Asset DT (35% left column)       | Component-level zoom, asset type selector     |
| Page 4 — Forecasting       | Weather Overlay DT (full width)  | Site wireframe + weather layer toggles        |
| Page 5 — Executive         | Portfolio DT summary in AI panel | Read-only overview, no interaction            |

**DT Component Click Behaviour (Pages 2 & 3):**

- Smooth zoom animation to clicked component (0.3 s ease-out)
- Detail overlay renders below DT within the same column — not a modal
- "View Full History" and action buttons use ghost-link and control-button styles

---

## 10. Cross-Page Interaction Patterns

### 10.1 Site Selection Flow

```
Page 1 Map → click site marker
  → popup opens (zoom + popup animate simultaneously)
  → popup shows mini stats + mini DT + "Open Site Command Center" ghost-link
  → click ghost-link → navigate to Page 2 with site pre-loaded
```

### 10.2 KPI Drill-Down (all pages)

All KPI cards have an eye icon (bottom-right, 20 px). Click → opens Detail Modal:

Modal spec (brand §6.2):

- Frame: `--ds-panel` bg · `1px solid --ds-panel-border` · `border-radius: 16px` · `--ds-shadow-lg`
- Header: label + value + RAG dot
- Timeframe selector: 12H / 24H / 7D / 30D (subset per metric)
- Primary chart: historical line + predictive overlay (`--ds-violet` dashed)
- Context cards stack: drivers · recommendations · related metrics
- Backdrop: transparent click-catcher (no blur/dim — brand §5.6 rule)

### 10.3 AI Panel Open/Close

AI Advisory button in header (violet) opens the full AI slide-over:

- Width: ~400 px, right edge fixed, `z-index: 1500`
- Animate: `slide-in-right` 0.28 s `cubic-bezier(0.22,1,0.36,1)`
- Does not overlap header or sidebar
- Escape key closes it
- Content: aggregated findings from all pages, filterable by site/asset type

### 10.4 Alarm/Notification Flow

Bell icon → Notification slide-over:

- Standard panel surface (`--ds-panel`), not AI-hued
- Each row: flat card + 4 px coloured left border (RAG severity)
- No RAG-tinted backgrounds on rows
- Rows sorted: Critical → Major → Minor
- Acknowledge action: ghost icon button on each row

---

## 11. Chart Implementation Notes

### 11.1 Forecast vs Actual (recurring pattern)

Used on: Pages 1, 2, 4.

```
datasets: [
  {
    label: 'Actual',
    borderColor: '#5b8de0',        // brand blue (dark)
    backgroundColor: 'rgba(91,141,224,0.12)',
    fill: true, borderWidth: 2
  },
  {
    label: 'Forecast (predicted)',
    borderColor: '#8b5cf6',        // --ds-violet
    borderDash: [5, 4],
    backgroundColor: 'rgba(139,92,246,0.10)',
    fill: true, borderWidth: 2
  }
]
```

### 11.2 RAG Bar Charts (health ranking, site ranking)

Bar fill is driven by value threshold, not a fixed colour:

- `value >= threshold_success` → `--ds-success-bar`
- `value >= threshold_warning` → `--ds-warning-bar`
- `value < threshold_warning` → `--ds-danger-bar`

### 11.3 Doughnut Charts

- `cutout: '65%'` always
- `legend: { position: 'right' }`
- Max 6 segments, 8th categorical colour (slate) = "Other"
- Tooltip: percentage of total

### 11.4 Shared Helpers (required)

```js
getChartTokens()         // resolves --ds-* tokens for active theme
chartTooltip()           // --ds-panel bg, standard padding, no shadow
chartScales()            // 9px faint ticks, no x-grid, no y-grid by default
ChartTimeframeControl    // shared segmented timeframe component
```

---

## 12. Responsive Breakpoints

| Breakpoint         | Grid behaviour                                                 |
| ------------------ | -------------------------------------------------------------- |
| `< 768px` (sm)     | KPI: 2 cols · Charts: 1 col · Side panels: full-screen overlay |
| `768–1024px` (md)  | KPI: 3–4 cols · Charts: 1 col · DT column hidden (tab)         |
| `1024–1280px` (lg) | KPI: 4 cols · Charts: 2 cols · 3-col layout collapses to 2     |
| `≥ 1280px` (xl)    | Full layout as specified above                                 |

Map (Page 1): minimum viewport `1024px` for split layout. Below 1024px: map goes full-width, AI panel becomes a bottom drawer.

---

## 13. Search Index Entries

Every page and primary KPI must have a search entry with `{ label, path, breadcrumb, keywords, icon }`.

| Label                    | Path           | Breadcrumb                 | Keywords                              |
| ------------------------ | -------------- | -------------------------- | ------------------------------------- |
| Global Operations Center | `/`            | Home                       | overview, portfolio, GIS, map, alarms |
| Site Command Center      | `/site/:id`    | Site › Command             | generation, inverter, BESS, DT        |
| Asset Performance        | `/assets`      | Intelligence › Assets      | MTBF, MTTR, health, maintenance       |
| Energy & Forecasting     | `/forecasting` | Intelligence › Forecasting | forecast, dispatch, battery, price    |
| Executive & ESG Center   | `/executive`   | Reporting › Executive      | revenue, EBITDA, carbon, ESG          |

---

## 14. Accessibility Checklist (per page)

- [ ] "Skip to content" link at document top
- [ ] All icon-only buttons have `aria-label` + `title`
- [ ] Status badges include text (uppercase token) — not colour only
- [ ] Charts have `aria-label` + textual summary line above for screen readers
- [ ] Modals: `role="dialog"` · `aria-modal="true"` · `aria-labelledby` → title
- [ ] Focus visible at all times: `outline: 2px solid var(--ds-accent-border); outline-offset: 2px`
- [ ] WCAG AA contrast verified for `--ds-text` and `--ds-text-muted` on every surface
- [ ] `Ctrl+K` / `Cmd+K` → search · `Esc` → close panels/modals/dropdowns
- [ ] Modal traps focus inside until dismissed

---

## 15. Forbidden Patterns (reminder)

Do not build these on this dashboard:

- Glassmorphism on map popups or DT panels
- Gradient on any panel, card, sidebar, or button background
- Coloured neon glow on site markers (pulse-glow only on the dot)
- Charts using red/amber/green for non-status data series
- KPI cards or badges floating on top of the map
- Separate pages for Digital Twin or AI — these are always embedded
- Modal with blurred/dimmed backdrop
- More than one primary button visible in the same viewport row
- `--ds-advisory` violet used anywhere outside AI-content surfaces
- Rounded corners > 16 px on cards; `> 999px` on anything other than avatars/pills
- Emoji as navigation or KPI icons (SVG `Ico*` only)
