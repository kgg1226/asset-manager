# UI Kit — Asset Manager

A single-file interactive recreation of the Asset Manager web app (Next.js 15 + Tailwind 4). Covers the login flow, fixed app shell, dashboard, licenses table with add-modal, and stub pages for every sidebar entry.

## Run
Open `index.html` directly — it links `../../colors_and_type.css` for fonts + tokens.

## What's in here
- **Login screen** — centered form card. Use `admin / changeme123`.
- **App shell** — fixed 240px sidebar + 56px top header, `max-w-7xl` content container.
- **Sidebar** — collapsible groups (ANALYSIS, ASSET MANAGEMENT, ORGANIZATION, SETTINGS), active-state styling, Alpha pill on Asset Map.
- **Top header** — global search, notification bell (with red dot), language toggle, avatar + role chip + log-out.
- **Dashboard page** — 4 metric cards, monthly-cost bar chart, Expiring-soon list with D-day pills, category tabs.
- **Licenses page** — sortable data table, search filter, Add-license modal, CSV button, bilingual CIA badges.
- **Hardware page** — table with status + CIA chips.
- **Stub pages** for the remaining sidebar entries — rendered as empty cards with a short note.

## Component inventory
Everything is implemented as inline CSS classes on a single HTML file rather than separate JSX files — this keeps the kit openable as one artifact. Class prefixes map 1:1 to Tailwind patterns in the original codebase (`nav-item`, `metric`, `pill-high`, `btn-primary`, etc.). To lift a piece into a new mock, copy the class definitions from the `<style>` block in `index.html` plus the matching markup.

## State
Login status and current page persist to `localStorage` under `asset-mgr-ui-kit`, matching the original app's pattern of saving dashboard widget config.

## Fidelity notes
- **Not recreated:** the ReactFlow asset-map canvas, org-chart drag & drop, CSV import flow, Prisma-backed data — these are placeholder cards with a note.
- **Simplified:** the language toggle is a static icon (not a real dropdown); charts are pure-CSS bars rather than Recharts.
- **Fully matched:** colors, type, radii, shadows, hover/active/focus states, icon choices (Lucide shapes inlined as SVG), spacing.
