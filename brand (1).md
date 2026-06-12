# Frontend Design System — Brand & UI Guidelines

**Audience:** Front-end engineers, designers, and contributors building any data-dense operational web product.
**Status:** Authoritative. These are general rules that apply to **every** product built under this design system. Each product may instantiate its own colour values, but must follow the structural rules, scales, and forbidden-effects list verbatim. If a new requirement is not covered here, extend this file *before* implementing — do not improvise.

> The token prefix used throughout this document is `--ds-*` (design-system). Each product is free to pick a short, product-scoped prefix (e.g. `--app-*`, `--brand-*`) but must keep the **token names, roles, and relationships** identical.

---

## 0. Design Philosophy

These guidelines target **enterprise operations consoles** — dashboards, control planes, internal tools, telemetry surfaces. They are not for marketing sites. The look-and-feel must communicate:

1. **Calm authority.** The user is making decisions from the data on screen. The UI must never compete with the data.
2. **High signal density.** Every pixel is allocated to a value, a trend, a status, or an action. Decorative elements are forbidden.
3. **Flat, opaque surfaces.** Solid panels on a darker page background. No glass, no gradients on chrome, no neon, no neumorphism.
4. **Restrained colour.** Neutral greys carry the layout. Colour is reserved exclusively for **status (RAG)**, **brand accent**, and **a single AI / "generated content" hue**.
5. **Token-driven theming.** Every colour, radius, shadow, and spacing rule lives in CSS custom properties. Never hard-code a hex value in a component.

> **Rule of thumb:** if a visual choice draws attention to itself rather than to the data, it is wrong.

---

## 1. Visual Forbidden List (Non-Negotiable)

The following effects are **banned** in any product built on this system:

| Banned effect | Why |
|---|---|
| **Glassmorphism** (`backdrop-filter`, `blur()`, translucent panels over images/maps) | Reduces legibility, fights contrast tokens. All "glass" classes must be flattened to solid surfaces. |
| Neumorphism / soft inset shadows | Looks toy-like, hides hierarchy. |
| Gradient backgrounds on cards, panels, headers, sidebar, buttons | Brand chrome is flat. The only gradient permitted is a low-opacity **area-fill under a line series** in a chart. |
| Drop-shadow halos / coloured neon glows | A `pulse-glow` keyframe is reserved for live status indicators only. Do not reuse it elsewhere. |
| Box-shadows on cards, panels, dropdowns above the `--ds-shadow-md` step | Heavy shadows imply elevation we do not want. |
| Rounded corners > 16 px on cards, > 999 px on anything other than avatars / pill chips | Breaks the rectilinear, dense grid. |
| Border radii of `0` on interactive surfaces | Always use the radius scale below. |
| `text-transform: uppercase` on body copy, value displays, table cells | Uppercase is reserved for section labels, RAG badges, status chips, sub-labels. |
| Custom display fonts | One typeface, one source of truth (see §3). |
| Emoji as a primary icon for a KPI, button, nav item, or table cell | All icons are SVG line art. Emoji is permitted only inside informal user-facing feeds (e.g. activity logs) where it is content, not chrome. |
| Animated backgrounds, particle systems, parallax, marquee | Distracts from telemetry. |
| Coloured page backgrounds (anything other than `--ds-bg`) | Page background is one neutral. |
| Mixing units of measurement on the same axis without a secondary axis | Confuses the reader. |
| Red / Amber / Green for non-status meaning (e.g. as a chart series colour for a normal data line) | RAG colours mean **status**. Never repurpose them for branding or generic series. |

---

## 2. Theming & Token System

All colours, shadows, layout sizes, and chart colours are CSS custom properties scoped to `body[data-theme='dark' | 'light']`. Components consume tokens via `var(--ds-*)`. **Default theme is dark.**

### 2.1 Master tokens (change these to retheme everything)

| Token | Role |
|---|---|
| `--ds-panel` | **Master card / panel surface.** Single point of retheming for every card. |
| `--ds-btn` | **Master action-button fill.** Primary CTA, modal confirms. |
| `--ds-btn-hover` | Hover state of `--ds-btn`. |
| `--ds-bg` | Page background (behind panels). |
| `--ds-accent` | Brand accent (active nav, focus ring, link, primary chart series). |

> If you need to retheme an entire product, change `--ds-panel` and `--ds-btn` only. Do not edit individual component colours.

### 2.2 Surface tokens

| Token | Use |
|---|---|
| `--ds-bg-elevated` | Elevated panel (= `--ds-panel`); we do not visually elevate beyond surface contrast. |
| `--ds-surface` | Standard inner surface (chart wrappers, KPI bodies). |
| `--ds-surface-soft` | Subtle inner zone (search field, segmented-control track). |
| `--ds-surface-raised` | Hover state for icon buttons, dropdown rows, control buttons. |

### 2.3 Border tokens

| Token | Use |
|---|---|
| `--ds-border` | Standard border. **In dark mode the border is intentionally near-invisible** — separation comes from surface contrast. |
| `--ds-border-soft` | Hairlines (table rows, list dividers). |
| `--ds-panel-border` | Card / modal outer border. Light mode gets a faint hairline; dark mode is borderless by design. |

### 2.4 Typography tokens

| Token | Use |
|---|---|
| `--ds-text` | Primary text: stat value, page title, table cell value. |
| `--ds-text-muted` | Secondary text: KPI label, table header, body description. |
| `--ds-text-faint` | Tertiary text: axis ticks, comparison captions, placeholders, breadcrumb separators, timestamps. |

### 2.5 Status (RAG) tokens — the only semantic colour family

| Status | Tokens | Meaning |
|---|---|---|
| Success / Normal | `--ds-success`, `--ds-success-bg`, `--ds-success-border`, `--ds-success-bar` | Within target. Saturated green ≈ `#16a34a` (dark) / `#15803d` (light). |
| Warning | `--ds-warning`, `--ds-warning-bg`, `--ds-warning-border`, `--ds-warning-bar` | At threshold; needs attention. Amber ≈ `#d97706` / `#c2410c`. |
| Critical / Danger | `--ds-danger`, `--ds-danger-bg`, `--ds-danger-border`, `--ds-danger-bar` | SLA breach; immediate action. Red ≈ `#dc2626` / `#b91c1c`. |
| Info | `--ds-info`, `--ds-info-bg`, `--ds-info-border` | Neutral informational badges. Sky ≈ `#0ea5e9` / `#0369a1`. |

> RAG is **status only**. Never use a RAG colour to differentiate two normal data series in a chart. Never use red, amber, or green as a chart series colour for non-status data — see §7.

### 2.6 Brand accent tokens

| Token | Use |
|---|---|
| `--ds-accent` | Active nav row, focus ring, link colour, primary chart series in light mode. |
| `--ds-accent-strong` | Hover variant. |
| `--ds-accent-bg` | Active-row tint, hover surface for nav items (8% alpha of the accent). |
| `--ds-accent-border` | Focus / active border (≈ 20% alpha of the accent). |

The accent colour is the product's brand colour. Pick **one** hue, typically a calm blue, and stick to it. The chart-series accent in dark mode may be brightened by ~15% to compensate for the dark surface. Do not use multiple accent hues in one product.

### 2.7 AI / generated-content tokens — reserved channel

A dedicated hue (commonly **violet/purple**) is reserved for AI- or model-generated content (advisories, predictions, copilots). It must not appear anywhere else — not in regular charts, not on regular buttons, not in KPI accents.

| Token | Use |
|---|---|
| `--ds-advisory` | AI advisory button base, badges, AI chip. |
| `--ds-advisory-strong` | Hover state. |
| `--ds-advisory-panel` | AI slide-over panel solid background. |
| `--ds-advisory-border` | Left edge of AI slide-over. |
| `--ds-violet` | **Predictive chart series only** (e.g. forecast line). |
| `--ds-violet-bg` | Predictive area fill (≈ 10% alpha). |

If a product has no AI surfaces, omit these tokens — do not co-opt them for any other purpose.

### 2.8 Modal / coloured-context cards

For coloured "context" cards inside detail modals only, define paired bg/border tokens:

`--ds-modal-{success|warning|danger|info|advisory|teal}-bg`
`--ds-modal-{success|warning|danger|info|advisory|teal}-border`

In dark mode, bg is a deep desaturated tint of the colour (≈ 8–12% L). In light mode, bg is the colour at ≈ 9–10% alpha and border at ≈ 35–45% alpha. **Coloured cards live only inside modals**, never on the main canvas.

### 2.9 Shadow scale

| Token | Allowed on |
|---|---|
| `--ds-shadow-xs` | Segmented-control track only. |
| `--ds-shadow-sm` | Standard panel. |
| `--ds-shadow-md` | Floating dropdown, tooltip. |
| `--ds-shadow-lg` | Profile menu, modal frame. |

Cards have **no shadow** by default. Hover lifts them via `transform: translateY(-2px)` only.

### 2.10 Theme switching

- Theme is set on `<body data-theme="dark" | "light">` and toggled by a single header control.
- All theme overrides for legacy utility classes (e.g. Tailwind `text-slate-*`, `bg-slate-*`, `text-white`, `bg-black/*`) are funnelled through CSS rules in the global stylesheet. **Never** add a component that hard-codes a utility dark-mode colour without an accompanying light-mode override.
- Default theme is **dark**.
- Logos are recoloured by a `--ds-logo-filter` token (e.g. `brightness(2)` dark, `brightness(0.1) saturate(0)` light). Do not import a logo as multiple files.
- The chrome (sidebar + top header) and the page background **swap roles** between themes: in dark mode chrome is the deepest neutral; in light mode chrome is the brightest white. This swap must remain intact when adding new chrome elements.

### 2.11 Complete Colour Reference

These are the **exact, fixed hex values** to use for each token. Treat this table as the single source of truth when setting up the CSS custom-property block for a new product. Values marked with * are applied at a specific alpha — the hex is for reference only; use the `rgba()` form in the stylesheet.

#### Page & panel surfaces

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-bg` | `#1c1c1c` | `#f1f5fa` | Page background (behind all panels). |
| `--ds-panel` | `#0a0a0a` | `#ffffff` | Every card, side panel, modal frame, sidebar, header. |
| `--ds-surface` | `#202020` | `#ffffff` | Chart wrapper bodies, KPI card inner body. |
| `--ds-surface-soft` | `#141414` | `#f7f9fc` | Search field, segmented-control track, table header row, skeleton boxes. |
| `--ds-surface-raised` | `#2a2a2a` | `#edf1f8` | Row hover, icon-button hover, dropdown row hover. |

#### Borders

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-border` | `transparent` | `rgba(0,0,0,0.12)` | Sidebar edge, header bottom, input outline, card outer edge (light only). |
| `--ds-border-soft` | `transparent` | `rgba(0,0,0,0.07)` | Table row dividers, list hairlines. |
| `--ds-panel-border` | `transparent` | `rgba(0,0,0,0.10)` | KPI card and modal card outer border (light only — dark is borderless by design). |

> In dark mode all three border tokens are intentionally `transparent`. Separation is achieved purely through surface-colour contrast. **Never** add a manual border to a dark-mode card.

#### Typography

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-text` | `#e8eef5` | `#0d0d0d` | KPI value, page title, table cell value, modal heading. |
| `--ds-text-muted` | `#afc3d8` | `#1f1f1f` | KPI label, body copy, table header, section heading, button text. |
| `--ds-text-faint` | `#8ca0b6` | `#4a4a4a` | Axis ticks, comparison captions ("vs previous"), input placeholder, breadcrumb separators, timestamps, side metadata. |

#### Brand accent (blue)

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-accent` | `#c8c8c8` | `#3b6dbf` | Active nav row text, focus ring, inline link colour. |
| `--ds-accent-strong` | `#a8a8a8` | `#2d5ca8` | Hover variant of `--ds-accent`. |
| `--ds-accent-bg` | `rgba(200,200,200,0.08)` | `rgba(59,109,191,0.08)` | Active nav row fill, icon-button hover fill, active filter pill fill. |
| `--ds-accent-border` | `rgba(200,200,200,0.20)` | `rgba(59,109,191,0.22)` | Focus ring, active nav row border, active filter pill border. |
| **Chart series blue** (fixed) | `#5b8de0` | `#3b7de8` | Primary chart line/bar series, timeframe active-button text. This value overrides `--ds-accent` specifically in chart contexts — do not change it per theme via the accent token; pin it here instead. |

> **Dark-mode accent note:** In dark mode the nav accent is intentionally **silver** (`#c8c8c8`) so the chrome stays calm and the chart-line blue (`#5b8de0`) does the talking. These are two separate values for two separate roles — do not unify them.

#### Primary action button

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-btn` | `#3d3d3d` | `#3b7de8` | Fill of the primary action button (Submit, Confirm, Save, Apply). |
| `--ds-btn-hover` | `#505050` | `#2d6ad4` | Hover fill. |
| `--ds-btn-text` | `#ffffff` | `#ffffff` | Label text on primary button (white in both themes). |
| Primary button shadow | `0 2px 10px rgba(59,125,232,0.25)` | same | Only non-status shadow on a button. |

#### RAG — Status colours

| Status | Token | Dark value | Light value | Used on |
|---|---|---|---|---|
| Success | `--ds-success` | `#16a34a` | `#15803d` | RAG badge text, progress fill (normal), chart threshold line (normal). |
| | `--ds-success-bg` | `rgba(22,163,74,0.12)` | `rgba(22,163,74,0.10)` | Status chip background, positive trend badge fill. |
| | `--ds-success-border` | `rgba(22,163,74,0.35)` | `rgba(22,163,74,0.40)` | Status chip border. |
| | `--ds-success-bar` | `rgba(22,163,74,0.90)` | same | Chart bar fill when value is within target. |
| Warning | `--ds-warning` | `#d97706` | `#c2410c` | RAG badge text, progress fill (warning). |
| | `--ds-warning-bg` | `rgba(245,158,11,0.12)` | `rgba(217,119,6,0.10)` | Status chip background. |
| | `--ds-warning-border` | `rgba(245,158,11,0.35)` | `rgba(217,119,6,0.45)` | Status chip border. |
| | `--ds-warning-bar` | `rgba(245,158,11,0.90)` | same | Chart bar fill when value is at threshold. |
| Danger | `--ds-danger` | `#dc2626` | `#b91c1c` | RAG badge text, progress fill (critical), notification badge fill, destructive text. |
| | `--ds-danger-bg` | `rgba(220,38,38,0.12)` | `rgba(220,38,38,0.10)` | Status chip background, negative trend badge fill. |
| | `--ds-danger-border` | `rgba(220,38,38,0.35)` | `rgba(220,38,38,0.40)` | Status chip border. |
| | `--ds-danger-bar` | `rgba(220,38,38,0.90)` | same | Chart bar fill when value is critical. |
| Info | `--ds-info` | `#0ea5e9` | `#0369a1` | Informational badge text, 2nd chart series. |
| | `--ds-info-bg` | `rgba(14,165,233,0.12)` | `rgba(3,105,161,0.09)` | Info chip background. |
| | `--ds-info-border` | `rgba(14,165,233,0.35)` | `rgba(3,105,161,0.35)` | Info chip border. |

#### AI / advisory (violet-purple)

| Token | Dark value | Light value | Used on |
|---|---|---|---|
| `--ds-advisory` | `#8b5cf6` | `#7c3aed` | AI advisory button fill, AI badge, AI chip. |
| `--ds-advisory-strong` | `#7c3aed` | `#6d28d9` | Hover state of advisory button. |
| `--ds-advisory-panel` | `rgb(130,90,210)` | same | AI slide-over panel solid background. |
| `--ds-advisory-border` | `rgba(139,92,246,0.45)` | same | Left-edge accent on AI slide-over. |
| `--ds-violet` | `#8b5cf6` | `#7c3aed` | **Predictive chart series only** — dashed line, 2 px. |
| `--ds-violet-bg` | `rgba(139,92,246,0.10)` | same | Area fill under a predictive series. |

#### Modal coloured-context cards (used inside detail modals only)

| Card type | Dark bg | Dark border | Light bg | Light border |
|---|---|---|---|---|
| success | `#0f2b1f` | `#1a4d33` | `rgba(22,163,74,0.10)` | `rgba(22,163,74,0.40)` |
| warning | `#2b1f0a` | `#4d3810` | `rgba(217,119,6,0.10)` | `rgba(217,119,6,0.45)` |
| danger | `#2b0f0f` | `#4d1a1a` | `rgba(220,38,38,0.10)` | `rgba(220,38,38,0.40)` |
| info | `#1a1a1a` | `#2e2e2e` | `rgba(3,105,161,0.09)` | `rgba(3,105,161,0.35)` |
| advisory | `#1a0f2b` | `#341a4d` | `rgba(124,58,237,0.09)` | `rgba(124,58,237,0.35)` |
| teal | `#161616` | `#2a2a2a` | `rgba(14,116,144,0.09)` | `rgba(14,116,144,0.35)` |

These coloured-card surfaces appear **only** inside modals; never on the main canvas.

#### Shadows

| Token | Dark value | Light value | Allowed on |
|---|---|---|---|
| `--ds-shadow-xs` | `0 1px 3px rgba(0,0,0,0.35)` | `0 1px 3px rgba(0,0,0,0.06)` | Segmented-control track only. |
| `--ds-shadow-sm` | `0 2px 8px rgba(0,0,0,0.28)` | `0 2px 8px rgba(0,0,0,0.07)` | Standard panel. |
| `--ds-shadow-md` | `0 4px 16px rgba(0,0,0,0.26)` | `0 4px 16px rgba(0,0,0,0.09)` | Floating dropdown, chart tooltip. |
| `--ds-shadow-lg` | `0 8px 30px rgba(0,0,0,0.24)` | `0 8px 30px rgba(0,0,0,0.11)` | Profile menu, modal frame. |

KPI cards and chart cards have **no shadow**. Hover lift is `transform: translateY(-2px)` only — no shadow added.

#### Chart categorical palette (fixed, non-status series)

These are the only colours permitted for differentiating data series that carry no status meaning. Use them in order; do not skip or reorder.

| Position | Hex | Name | Notes |
|---|---|---|---|
| 1 | `#3b7de8` (light) / `#5b8de0` (dark) | **Brand blue** | Primary series. Always position 1. |
| 2 | `#0ea5e9` (light) / `#38bdf8` (dark) | Sky | |
| 3 | `#14b8a6` | Teal | |
| 4 | `#f59e0b` | Amber | **Only** when no RAG warning line is also shown on the same chart. |
| 5 | `#ec4899` | Pink | |
| 6 | `#6366f1` | Indigo | |
| 7 | `#a3e635` | Lime | |
| 8 | `#94a3b8` | Slate | Neutral fallback / "Other" segment. |

Area-fill alpha: 10–15% of the border colour (e.g. `rgba(59,125,232,0.12)` for brand-blue area).

#### One-off fixed colours (no token)

| Value | Where used |
|---|---|
| `#ef4444` | Logout / Delete / Discard text; destructive menu item. No token needed — this colour appears only as text on a transparent background. |
| `#ffffff` | Button label on all filled buttons (primary, AI advisory). Always white regardless of theme. |
| `rgba(34,197,94,0.12)` | Positive trend badge fill (inside KPI card). |
| `rgba(239,68,68,0.12)` | Negative trend badge fill (inside KPI card). |
| `rgba(255,255,255,0.08)` | KPI card internal divider in dark mode (replaces `--ds-border` which is transparent). |
| `rgba(0,0,0,0.4)` | Map marker border (all themes). |
| `brightness(2)` / `brightness(0.1) saturate(0)` | `--ds-logo-filter`: dark / light logo recolouring via CSS `filter`. |

---

## 3. Typography

### 3.1 Font

- **Family:** `Inter`, loaded from Google Fonts (weights 300, 400, 500, 600, 700).
- **Fallback:** `sans-serif`.
- **No alternate fonts.** Do not add Roboto, Poppins, Mono, or display fonts. If a legacy config lists another family, the rendered font must still be Inter via a body-level rule.
- **Do not use** `font-mono`, `font-serif`, or any Google Font beyond the Inter weights listed.

### 3.2 Type scale

| Role | Size | Weight | Line-height | Letter-spacing | Notes |
|---|---|---|---|---|---|
| Page title | 20 px | 700 | 1.2 | -0.02 em | `.page-title` |
| Page subtitle | 12 px | 400 | 1.4 | normal | `.page-subtitle` |
| Section heading (in panel) | 13 px | 600 | 1.3 | normal | inline |
| Card title (chart wrapper) | 10 px | 600 | 1.2 | 0.06 em, **UPPERCASE** | |
| Stat value (large) | `clamp(1.4rem, 3vw, 2.2rem)` | 700 | 1.0 | -0.01 em | |
| Stat label | 14 px | 500 | 1.4 | normal | |
| Stat unit | 12 px | 500 | 1.0 | normal | faint |
| Trend badge (`+x.x%`) | 10 px | 600 | 1.2 | normal | |
| Trend caption ("vs previous") | 9 px | 500 | 1.2 | normal | faint |
| RAG badge label | 10 px | 700 | 1.0 | 0.06 em, **UPPERCASE** | |
| Status chip | 10 px | 700 | 1.0 | 0.04 em, **UPPERCASE** | |
| Body / table cell | 12.5–13 px | 400 | 1.5 | normal | |
| Table header | 11 px | 700 | 1.2 | 0.04 em, **UPPERCASE** | |
| Sidebar nav item | 14 px | 500 (600 active) | 1.3 | normal | |
| Sidebar section label | 11 px | 700 | 1.2 | 0.08 em, **UPPERCASE** | |
| Search input | 12.5 px | 400 | 1.4 | normal | |
| Search dropdown row label | 12 px | 600 | 1.3 | normal | |
| Search dropdown row breadcrumb | 10 px | 400 | 1.3 | normal, faint | |
| Segmented-control button | 10.5 px | 600 | 1.0 | 0.02 em | |
| Chart axis tick | 9 px | 400 | 1.0 | normal | |
| Chart legend | 10 px | 500 | 1.0 | normal | |

### 3.3 Text colour mapping

| Element | Token |
|---|---|
| Stat value, page title, table value, primary heading | `--ds-text` |
| Stat label, body copy, table header, secondary heading | `--ds-text-muted` |
| Axis ticks, comparison captions, placeholder, breadcrumb separator, timestamp, side metadata | `--ds-text-faint` |
| Active nav row, focus ring, link | `--ds-accent` |
| Logout / destructive menu item | `#ef4444` |

Never use `color: white` or `color: black` directly — always go through tokens.

---

## 4. Iconography

### 4.1 Source

All icons are **SVG line art**, hand-rolled in a single in-product icon module. Do **not** import from external icon libraries (Heroicons, Lucide, FontAwesome, Material) — keep dependencies zero and the visual language consistent.

Each icon is exported as a small React component (or framework equivalent) named `Ico<Domain>` (e.g. `IcoUser`, `IcoBolt`, `IcoTrendUp`). New products replicate this pattern with their own domain-appropriate set.

### 4.2 Style rules

- **Stroke-only:** `fill="none"`, `stroke="currentColor"`, `stroke-width: 1.6–1.8`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- **viewBox** is always `0 0 24 24`.
- The icon inherits colour from `currentColor`. Never set fill/stroke directly on an icon — control colour via the parent.
- Default sizes: `28 × 24` for KPI icons; `16 × 16` (`w-4 h-4`) for nav-row icons; `20 × 20` (`w-5 h-5`) for menu and small inline icons; `11 × 11` for the "open detail" eye on chart cards.

### 4.3 Icon containers

KPI icons sit in a **28 × 28 px** rounded container (`border-radius: 12px`/`rounded-xl`) painted with the brand accent. This is the one place the brand accent is used as an icon-tint; do not extend it elsewhere.

### 4.4 Adding a new icon

Add it next to the existing `Ico*` exports following the same conventions. One icon per domain concept; reuse aggressively.

---

## 5. Layout System

### 5.1 Application chrome

| Region | Width / Height | Background | Border |
|---|---|---|---|
| Sidebar (open) | `--ds-sidebar-w: 244px` | chrome surface (deepest in dark, brightest in light — see §2.10) | right border `--ds-border` |
| Sidebar (collapsed) | `60px` | same | same |
| Top header | `--ds-header-h: 62px` | same as sidebar | bottom border `--ds-border` |
| Page background | fills remaining space | `--ds-bg` | — |
| Content padding | `24px` (`p-6`) on the scrollable page area | inherits | — |

### 5.2 Spacing scale

| Token | Px | Use |
|---|---|---|
| `gap-1` / `p-1` | 4 | Inline icon ↔ label |
| `gap-2` / `p-2` | 8 | Compact stack inside chip |
| `gap-3` / `p-3` | 12 | Inside chart wrapper, between mini-stats |
| `gap-4` / `p-4` | 16 | Standard panel inner padding |
| `gap-6` / `p-6` | 24 | Page padding, between major panel rows |
| `gap-8` / `p-8` | 32 | Reserved for full-bleed empty states |

### 5.3 Radius scale

| Radius | Use |
|---|---|
| `4px` | Status badge bottoms, trend badge |
| `6px` | Segmented-control button, AI badge |
| `8px` | Header search, primary button, icon button, control button, nav item, dropdown row |
| `10px` | Search dropdown container, modal info card |
| `12px` | Stat icon container, profile menu |
| `16px` | KPI card, modal context card, modal frame |
| `20px` | Status chip pill |
| `999px` | Avatar circle, status dot, profile trigger circle |

Never use a radius outside this scale.

### 5.4 Grid

- Primary KPI grid: **6 columns** on `xl`, **3** on `md`, **2** on `sm` (`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3`).
- Chart panel grid: **2 columns** on `lg`, single column below (`grid-cols-1 lg:grid-cols-2 gap-4`).
- Detail-page split layouts: **2/3 + 1/3** (`grid-cols-3` with `col-span-2` for the dominant panel).
- Tables span the full container width with `overflow-x-auto`.

### 5.5 Z-index scale

| Layer | z-index | Element |
|---|---|---|
| Page content | auto | — |
| Sticky header | 50 | top bar |
| Tooltip / floating control | 100 | chart tooltip |
| Profile menu | 1200 | profile dropdown |
| Search dropdown | 2000 | header search results |
| Side panel slide-over | 1500–1600 | right-edge panels |
| Modal backdrop | 1900 | modal backdrop |
| Modal frame | 1950 | modal card |

Never invent a new z-index outside this scale.

### 5.6 Overlap rules

| Element | Allowed to overlap | Forbidden to overlap |
|---|---|---|
| Top header | nothing | sidebar, page content |
| Sidebar | nothing | header, page content |
| Search dropdown | header (extends downward into page area) | side panels |
| Profile menu | header, page content | side panels, modals |
| Side slide-over (notifications, AI) | page content (right edge, fixed width ~400 px) | header, sidebar |
| Modal | everything (centred); sidebar remains reachable only via Escape | — |
| Map | nothing — fills its panel | KPI cards must never sit on top of a map |

Side-panels and modals use a **transparent click-catcher backdrop** — explicitly no `backdrop-filter`. Page content remains visible beneath. Do not introduce a dimmed/blurred backdrop.

---

## 6. Components

### 6.1 KPI Card

The single most-used component.

**Structure (top to bottom):**

1. Row 1 — **Icon (28 × 28, accent-tinted, rounded-xl) on the left + Trend badge ("▲ 4.2%" green/red) and "vs previous" caption on the right.**
2. Row 2 — **Value** (large, `clamp(1.4rem, 3vw, 2.2rem)`, `--ds-text`) with optional unit beside it (faint, 0.75 rem).
3. Row 3 — **Label** (14 px, `--ds-text`, ellipsised single line).
4. Divider — 1 px hairline, 6 px vertical margin.
5. Row 4 — **RAG badge** uppercase: `NORMAL` | `WARNING` | `CRITICAL`. 10 px, 700, 0.06 em tracking.
6. Optional bottom-right action: small circular info button (eye icon) opening a detail modal — 20 px diameter.

**Visual rules:**

- `padding: 17px 14px` (legacy) or `10px 12px 8px` (compact) — use compact when a row fits 6 cards.
- `border-radius: 16px`.
- **No shadow** at rest. Hover: `transform: translateY(-2px)` only.
- Light theme adds a hairline border `1px solid rgba(0,0,0,0.10)`. Dark theme has no border.
- Background is `--ds-surface`.
- Trend badge background: `rgba(34,197,94,0.12)` for positive, `rgba(239,68,68,0.12)` for negative — borderless.
- Cards must not use chart fills, gradient overlays, or coloured borders.

### 6.2 Detail Modal (drill-down from a KPI)

- Frame: `--ds-panel` background, `1px solid var(--ds-panel-border)`, `border-radius: 16px`, `--ds-shadow-lg`.
- Inside, coloured "context" cards use the `--ds-modal-{success|warning|danger|info|advisory|teal}-bg/-border` token pairs (see §2.8).
- Each modal contains: a header (label + value + RAG dot), a timeframe selector limited to the meaningful horizons for that metric, a primary chart (historical + predictive overlay if relevant), and a stack of context cards (drivers, recommendations, related metrics).
- Predictive series rendered with `--ds-violet`, dashed border, low-opacity fill.
- The backdrop is the transparent click-catcher. Do not blur or dim.

### 6.3 Buttons

| Variant | Background | Text | Border | Where to use |
|---|---|---|---|---|
| **Primary action** | `--ds-btn` | white | none | Submit, Save, Confirm, Apply, the single dominant action in any context. **Limit one per panel.** |
| **Control / secondary** | `--ds-surface-soft` | `--ds-text-muted` | `1px solid --ds-border` | Cancel, Reset, "Open chart", row actions, secondary tab actions. |
| **Icon-only** | transparent | `--ds-text-muted` | `1px solid --ds-border` | Header bell, theme toggle, sidebar collapse, refresh. 34 × 34 px, 8 px radius. |
| **Active icon** | `--ds-accent-bg` | `--ds-accent` | `--ds-accent-border` | When the icon's panel is open. |
| **AI / Advisory action** | `--ds-advisory` | white | `--ds-advisory-strong` | **AI subsystem only.** Header trigger, AI drawer CTAs. Never repurpose. |
| **Segmented (timeframe / mode)** | transparent / accent-bg @ 12% | `--ds-text-faint` / accent | none / accent-border | Time-horizon selectors, view-mode toggles. The active state is the only place a permanently-accent fill is allowed inside a chart card. |
| **Destructive** | `rgba(239,68,68,0.10)` | `#ef4444` | none | Logout, Delete, Discard. Use sparingly. |
| **Ghost link** | transparent | `--ds-accent` | none, hover underline | Inline "View details", "See history". |

**Button rules:**

- All buttons: `border-radius: 8px`, `font-weight: 600`, `cursor: pointer`, `transition: 0.14–0.15s`.
- Primary buttons get a soft drop-shadow (`0 2px 10px <accent-rgba 0.25>`) — this is the **only** non-status shadow allowed on a button.
- Never put more than one primary button visible in the same viewport row.
- Disabled state: `opacity: 0.5; cursor: not-allowed;` — no other styling change.
- Buttons in tables shrink to `padding: 4px 10px`, `font-size: 11px`.

### 6.4 Side-panels (right-edge slide-over)

Two canonical variants:

- **Notification / Alert panel:** standard panel surface (`--ds-panel`). Width ≈ 400 px. Each row is a flat card with a coloured **left border** (4 px) signalling severity (RAG). No backgrounds tinted by severity.
- **AI / Advisory panel:** distinct **AI-hued panel** using `var(--ds-advisory-panel)`. Light cream text (e.g. `#fef9ef`). Inner cards have a near-white background with dark AI-hued text. The panel's left border uses `--ds-advisory-border`. Priority chips inside this panel may use a richer set of hues at low opacity, but those chips are **scoped to the AI panel only** and do not bleed onto other surfaces.

Both panels share `animate-slide-in-right` (0.28 s `cubic-bezier(0.22,1,0.36,1)`).

### 6.5 Sidebar navigation

- Section labels: uppercase, 11 px, 700.
- Items: 14 px, 500, 10 × 14 px padding, 8 px radius, full-width row.
- Hover: `--ds-accent-bg` background.
- Active: `--ds-accent-bg` background, `--ds-accent` text, 600 weight.
- Icons: 16 × 16 SVG line art, stroke-width 1.6, inherits `currentColor`.
- When the sidebar is collapsed (60 px), labels hide and only icons show, centred.
- Logo at the top is recoloured by `--ds-logo-filter`. Click navigates to the home route.

### 6.6 Top header

Order, left → right: **Sidebar collapse button → Page title (or breadcrumb) → Search bar (centre, max 480 px) → AI/Advisory button (if applicable) → Theme toggle → Notifications bell → Profile circle.**

- Header height fixed at 62 px.
- Page title is plain text (`.page-title`, 20 px, 700) for top-level routes. **Breadcrumbs** appear on detail / nested views as: `Section › Page › Detail` with `›` separators in `--ds-text-faint`. Only the last crumb is `--ds-text`; preceding crumbs are `--ds-text-muted` and clickable.
- The AI/Advisory button is the only **AI-hued** element in the header.
- The bell shows a numeric badge in `--ds-danger` if any unacknowledged alerts exist; the badge is a 16 px circle, `font-size: 9px`, `font-weight: 700`, white text. If critical alerts exist, the bell pulses with `pulse-glow`.

### 6.7 Search bar

- Background `--ds-bg`, 1 px border `--ds-border`, 8 px radius, 6 × 12 px padding.
- Focus state: border becomes `--ds-accent-border`, background lifts to `--ds-surface`. **No outer ring**, no glow.
- Placeholder: short, lowercase, 3-bucket hint (e.g. "Search …, …, …").
- Keyboard: `Ctrl+K` / `Cmd+K` focuses the input and opens the dropdown.
- **Search dropdown:**
  - Min-width 360 px, max-height 440 px, `--ds-shadow-lg`.
  - Each row shows: 28 × 28 icon tile (`--ds-surface-raised` background) + label (12 px, 600) + breadcrumb description (10 px, faint).
  - Hover row background: `--ds-surface-soft`.
  - Empty state: centred faint text "No matches".
  - Maximum 10 results.
  - Search index is a single in-memory list. **Every new page and KPI must add an entry** with `label`, `path`, `breadcrumb`, `keywords`, and `icon`.
  - Click a row → navigate, dropdown closes, query clears.
- Dropdown closes on outside click and Escape.

### 6.8 Status chips & badges

- Canonical pill: 10 px / 700 / uppercase / 0.04 em tracking / 20 px radius / 1 px border / 2 × 8 px padding.
- Variants: `success | warning | danger | info | accent` — each uses the matching `--ds-{variant}-bg/-border` and `--ds-{variant}` token trio.
- Use chips on tables (status column), inside cards (rare), and on filter bars.
- Notification badge on icon button: 16 × 16 circle, white text, RAG-coloured fill.

### 6.9 Progress bars

- Track: 5 px height, `--ds-border-soft`, 4 px radius.
- Fill: full height, 4 px radius, colour driven by the RAG of the value (success / warning / danger).
- 0.3 s width transition. No striping, no animation, no gradient.

### 6.10 Tables

- Background: `--ds-panel`. Header row background: `--ds-surface-soft`.
- Header text: 11 px, 700, uppercase, 0.04 em tracking, `--ds-text-muted`.
- Cell text: 12.5 px, `--ds-text`. Faint metadata: `--ds-text-faint`.
- Row dividers: 1 px `--ds-border-soft`. Hover row: `--ds-surface-raised`.
- Status column: use a status chip.
- Numeric columns are right-aligned and use tabular numerals (`font-variant-numeric: tabular-nums`).
- Action column: ghost icon buttons or a single ghost-link.
- Pagination: 12 px text, `--ds-text-muted`, page numbers in size-down control buttons.

### 6.11 Dropdowns / Selects

- Trigger uses the secondary control button style with a chevron icon at the right.
- Menu surface: `--ds-panel`, 10 px radius, `--ds-shadow-md`, max-height 320 px, overflow-y auto.
- Item rows reuse search-dropdown row styles (8 × 12 px padding, hover `--ds-surface-soft`).
- For ≤ 4 options, use a segmented control instead of a dropdown.
- Multi-select dropdowns add a checkbox in front of each row; selected count shows on the trigger as `<Label> · 3`.

### 6.12 Tabs

- Inline horizontal tab bar inside a panel header.
- Inactive tab: `--ds-text-muted`, 12.5 px, 500 weight, no underline.
- Active tab: `--ds-text`, 600 weight, **2 px bottom border in `--ds-accent`**.
- 12 px horizontal padding, 8 px vertical.
- No background fills, no rounded pills.

### 6.13 Forms

- Input: 32 px height, 8 px radius, 1 px border `--ds-border`, background `--ds-bg`, padding 6 × 12 px, 12.5 px text.
- Focus: border `--ds-accent-border`. No ring.
- Label: 11 px, 600, `--ds-text-muted`, margin-bottom 4 px.
- Helper / error text: 10.5 px under the input. Error text in `--ds-danger`. Error border `--ds-danger-border`.
- Inputs span the available column; never stretch wider than 480 px in a single-column form.

### 6.14 Loading

- Full-page boot: a single centred logo + thin spinner.
- Inline loader: 16 × 16 circular border spinner with `border-top-color: var(--ds-accent)`, 0.8 s `spin`.
- Skeleton boxes: `--ds-surface-soft`, 12 px radius, **no animated shimmer**.

---

## 7. Charts

### 7.1 Library

- Use **one** charting library per product (e.g. Chart.js + react-chartjs-2, or Recharts) — do not mix.
- All chart styling tokens come from a single helper (e.g. `getChartTokens()`) that resolves the active theme.
- All wrappers must use shared `chartTooltip()` / `chartScales()` helpers — do not hand-style tooltips per chart.

### 7.2 Allowed chart series colours (non-status)

The categorical palette is the **only** approved set for non-status data series:

| Order | Hex | Name |
|---|---|---|
| 1 | `--ds-accent` (brand) | Brand — primary series |
| 2 | `--ds-info` (`#0ea5e9` / `#0369a1`) | Sky / info |
| 3 | `#14b8a6` | Teal |
| 4 | `#f59e0b` | Amber **(only when the chart shows non-status data and no warning RAG line is present)** |
| 5 | `#ec4899` | Pink |
| 6 | `#6366f1` | Indigo |
| 7 | `#a3e635` | Lime |
| 8 | `#94a3b8` | Slate (neutral fallback) |

For area-fill series, fills are 10–15% alpha of the border colour.

> **Hard rule on RAG colours in charts:**
> - The full saturated success / warning / danger bar tokens are **only** for bars or segments whose value carries that status meaning, and for **threshold reference lines** (dashed: `6/4` normal, `4/3` warning, `3/3` critical).
> - You may not pick "green" as the colour of a normal data series simply because you like green. If green is used, it means *normal*. Same for amber and red.

### 7.3 Predictive series

- Always rendered in `--ds-violet`.
- Border style: dashed (`borderDash: [5, 4]`), border width 2 px.
- Optional fill: `--ds-violet-bg` (10% alpha).
- Label suffixed with "(predicted)".

### 7.4 Chart card wrapper

Container pattern: `--ds-panel` background, `--ds-border` border, `border-radius: 8px`, `padding: 12px`, `position: relative`.

Header row (8 px above chart): title (10 px uppercase tracking-wider, `--ds-text-muted`, flex-1) + timeframe selector + small "open detail" eye button (11 × 11 icon in a 16 × 16 circle).

Body: chart canvas with a fixed `height` (commonly 120 / 160 / 220 / 280 px). Use `responsive: true, maintainAspectRatio: false`.

### 7.5 Axes & grid

- Tick colour: `--ds-text-faint`, font 9 px.
- X grid: hidden.
- Y grid: hidden by default. If a chart absolutely needs Y gridlines (rare, only when comparing two stacked dataset families), use a dedicated `--ds-chart-grid` token at very low alpha.
- Axis title: 8 px, `--ds-text-faint`, only when the unit is non-obvious.

### 7.6 Tooltip

- Background: `--ds-panel`. Border: 1 px in a dedicated `--ds-chart-tooltip-border` token.
- Title: `--ds-text` (11 px). Body: `--ds-text-muted` (10 px).
- Padding 8 px. No drop-shadow.
- Always single-tooltip mode; never floating multi-series cards.

### 7.7 Legend

- Position: `top` for line/bar; `right` for doughnut.
- Label colour: `--ds-text`, 10 px, 500.
- `usePointStyle: true`, `boxWidth: 10`, `padding: 10`.
- Hide legend items whose label starts with `––` (these are threshold reference lines).
- Hide the legend entirely on charts with a single dataset.

### 7.8 Doughnut

- `cutout: '65%'` (always).
- Tooltip shows percentage of total, not raw value.
- Maximum 6 segments. Use the categorical palette in order; the slate fallback is "Other".

### 7.9 Timeframe selector

- A single shared component (e.g. `ChartTimeframeControl`) with options grouped into `realtime | ops | trend | strategic`.
- Allowed presets: **`12H`, `24H`, `7D`, `30D`** — these are the **only** time horizons in the entire system. Pick a subset per chart based on what the underlying metric meaningfully supports.
  - `realtime` (12H / 24H) — intra-day operational telemetry.
  - `ops` (24H / 7D) — daily operational KPIs.
  - `trend` (7D / 30D) — weekly/monthly performance.
  - `strategic` (30D) — long-horizon trends, ESG, capacity forecasts.
- The active button uses a fixed brand-blue accent fill regardless of theme — this is the only fixed-accent state in the chart UI.

---

## 8. Maps

If the product includes a map surface:

- **Library:** Leaflet, plain. No proprietary wrappers.
- Map background tile: muted greyscale (`leaflet-container { background: var(--ds-bg) !important }`). Do not introduce coloured base maps.
- Asset markers: 12–16 px circle, brand-accent or RAG fill (whichever carries meaning), white border. A live/active marker may pulse via `pulse-glow` on the dot only.
- Status markers: RAG fill driven by an explicit threshold (e.g. `< 70% success`, `70–85% warning`, `> 85% danger`). Border 1 px `rgba(0,0,0,0.4)`.
- Region polygons: stroke `--ds-accent`, fill same accent at 10% alpha. Hover: 18% alpha.
- Path polylines: 3 px, `--ds-accent` for current; `--ds-violet` (dashed) for predicted/optimised.
- Map controls (zoom, recenter, layer toggle): control-button style, 32 × 32 px, top-right corner.
- Map tooltips/popups: `--ds-panel` background, 10 px radius, `--ds-shadow-md`. **No** Leaflet default white bubble.
- The map fills its panel; KPI cards, badges, charts must **never** float on top of the map. Use a side-by-side panel layout instead.

---

## 9. Page Layout Patterns

Every page in a product is built from the same layout vocabulary. Pick the variant that matches the page's purpose; do not invent a new shape.

### 9.1 Standard Operations Page (default)

Top-to-bottom anatomy:

1. **Page header** — title + subtitle (left) and any page-level primary action (right).
2. **Filter bar** (optional) — pill-style filter set immediately under the header. Use the active-pill treatment from §6.5 (accent bg + accent text + accent border). 28 px tall, 12 px horizontal padding, 999 px radius.
3. **KPI grid** — 6-column `xl` / 3-column `md` / 2-column `sm` row of KPI cards. Limit to one row (max 6 KPIs). If you need more, the page is doing too much — split it.
4. **Charts grid** — 2-column `lg` / 1-column below row(s) of chart cards. Each chart card has its own timeframe selector.
5. **Detail / tab area** — split layout (2/3 + 1/3) hosting a primary table or list and a secondary side panel (e.g. recent activity, related items).

### 9.2 Detail Page (drill-down from a KPI or list row)

- Breadcrumb header replaces the plain page title.
- Single primary chart at the top (full-width).
- Tabbed area below for related views (history, comparisons, audit).
- Right-edge sticky context column (1/3) for metadata and actions.

### 9.3 Map / Twin Page

- Full-bleed map fills the page area.
- Right-edge collapsible panel (≈ 320 px) with three accordion groups: **Layers** (toggle visible categories), **Time / Mode** (play/pause/speed for replays or simulations), **Selected Asset** (details when a marker is clicked).
- Optional bottom-edge compact bar with a timeline scrubber.
- KPIs are not displayed on this page; the map is the primary surface.

### 9.4 Form / Profile Page

- Two-column layout: identity / summary (left, narrow), form sections (right, wider).
- Section headings use `.page-title` size-down (16 px / 700) with a 1 px `--ds-border-soft` underline.
- Destructive actions (sign out, delete account) are the only red-text items on the page.

### 9.5 Auth Page (login / sign up / reset)

- Centred card on `--ds-bg`. Card uses `--ds-panel`, 16 px radius, `--ds-shadow-lg`, max-width 380 px, 32 px padding.
- Logo at the top, recoloured by `--ds-logo-filter`.
- Single primary button using the primary action style.
- No marketing copy, no background imagery.

### 9.6 Activity / Feed strip (sub-component, not a page)

When a feed appears inside another page, each row is: 32 × 32 icon circle (`--ds-surface-soft`) + bold event title + faint timestamp + optional severity chip on the right. Emoji is permitted **only** in this feed prefix as content.

---

## 10. Behaviour & Interaction

### 10.1 Animation

| Animation | Duration | Easing | Use |
|---|---|---|---|
| `slide-up` | 0.25 s | ease-out | Profile menu, dropdown reveal |
| `slide-in-right` | 0.28 s | `cubic-bezier(0.22,1,0.36,1)` | Side panels |
| `fade-in` | 0.20 s | ease-out | Modal frame |
| `pulse-glow` | 2 s infinite | — | Live status dot, critical-alert bell only |
| `spin` | 0.8 s linear infinite | — | Loading spinner |

**No other animations** are permitted. Do not animate value changes (no number-tickers), do not animate chart redraws beyond the library defaults, do not bounce panels.

### 10.2 Hover

- KPI card: `transform: translateY(-2px)`. No background change.
- Nav item: background `--ds-accent-bg`. No transform.
- Buttons: background lift to `-hover` token. Primary button shadow grows from `0 2px 10px` → `0 4px 16px`.
- Table row: `--ds-surface-raised`.
- Icon button: background `--ds-surface-raised`, text `--ds-text`, border `--ds-accent-border`.

### 10.3 Focus

- Always visible. Focus ring is `outline: 2px solid var(--ds-accent-border)` with `outline-offset: 2px` on buttons, links, form fields.
- Search input uses border-colour change instead of an outline.
- A "Skip to content" link is required at the top of the document for accessibility.

### 10.4 Keyboard

- `Ctrl+K` / `Cmd+K`: focus search.
- `Esc`: close any open dropdown, modal, or side panel; clear search query.
- `Tab` / `Shift+Tab`: must reach every interactive element in DOM order.
- Modals trap focus inside the dialog until dismissed.

### 10.5 Empty / error / loading states

- **Empty:** centred 14 px `--ds-text-muted` message + small icon + (optional) primary CTA.
- **Error:** red icon, `--ds-danger` heading, body in `--ds-text-muted`, retry button (control-button style).
- **Loading:** inline spinner + 12 px caption "Loading…" in `--ds-text-faint`. Use `--ds-surface-soft` skeleton boxes for table/card loading.

---

## 11. Element Sizing Reference

Single source of truth for "how big is X".

| Element | Dimensions |
|---|---|
| Sidebar (open / collapsed) | 244 px / 60 px |
| Header | 62 px tall |
| Side panel slide-over | 400 px wide |
| KPI card | min 140 px wide, min height ≈ 130 px (compact 110 px), 16 px radius |
| KPI icon container | 28 × 28 px, 12 px radius |
| Chart card | parent column width × `height` prop (commonly 120 / 160 / 220 / 280 px) |
| Icon button | 34 × 34 px, 8 px radius |
| Primary / control button | 36 px tall (32 px in tables) |
| Status chip | 22 px tall, 20 px radius |
| Search bar | 32 px tall, max-width 480 px |
| Search dropdown | min 360 px, max 440 px tall |
| Profile menu | min 230 px wide |
| Avatar / profile trigger | 36 × 36 px, 999 px radius |
| Notification badge | 16 × 16 px |
| Segmented-control button | 22 px tall, 6 px radius |
| Modal frame | min-width 600 px, max-width 1080 px, max-height 88 vh |
| Form input | 32 px tall, 8 px radius, max-width 480 px |
| Progress bar | 5 px tall, 4 px radius |

---

## 12. Accessibility

- Minimum body-text contrast: WCAG AA (4.5:1) — both themes verified for `--ds-text` and `--ds-text-muted` on every documented surface.
- Faint text (`--ds-text-faint`) must only be used for genuinely tertiary content.
- All icon-only buttons must have `aria-label` and `title`.
- Status badges must include text (uppercase token) — never colour-only.
- Focus must be visible at all times.
- Charts include an accessible summary via the chart's `aria-label` and a textual summary line above the chart for screen readers.
- Modals expose `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the title.

---

## 13. When in Doubt

1. **Open the global stylesheet** and find the matching token. If no token exists, add one to the `:root` block before adding it to the component.
2. **Mirror an existing component** rather than inventing a new pattern. If you need a new pattern, add it here first.
3. **Stay flat.** Solid surfaces, no gradients, no glass.
4. **Reserve colour:** RAG = status, brand accent = chrome & primary chart series, AI hue = generated content only, neutrals = everything else.
5. **One typeface (Inter), one icon library (in-product `Ico*`), four time horizons (12H / 24H / 7D / 30D), eight chart series colours, three RAG levels.** That is the entire visual language.

Anything else is a deviation and must be reviewed against this document before merge.
