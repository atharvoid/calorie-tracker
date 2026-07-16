# UI/UX Audit Findings

This audit documents every "vibecoded" styling smell in the application and tracks its consolidation into design system tokens, canonical button styles, and shared primitives.

| File | Line Range | Issue | Planned Fix | Status |
| :--- | :--- | :--- | :--- | :--- |
| `components/auth-button.tsx` | 19-24 | Hardcoded inline secondary button styling | Replace with `SECONDARY_BTN` | [x] Fixed |
| `components/auth-button.tsx` | 40-42 | Hardcoded inline ghost button styling | Replace with `GHOST_BTN` | [x] Fixed |
| `components/connect-telegram.tsx` | 25 | Hardcoded inline button styling | Replace with `SECONDARY_BTN` | [x] Fixed |
| `components/dropzone.tsx` | 35 | Hardcoded card wrapper markup | Replace container with `<Panel>` | [x] Fixed |
| `components/dropzone.tsx` | 42-49 | Dropzone remove button lacks focus-visible ring | Add `focus-visible:ring-2 focus-visible:ring-accent` | [x] Fixed |
| `components/dropzone.tsx` | 55-69 | Dropzone drop button lacks focus-visible ring | Add `focus-visible:ring-2 focus-visible:ring-accent` | [x] Fixed |
| `components/file-drop.tsx` | 29 | Bespoke upload confirmation card container | Replace container with `<Panel>` | [x] Fixed |
| `components/file-drop.tsx` | 32-38 | File-drop remove button lacks focus-visible ring | Add `focus-visible:ring-2 focus-visible:ring-accent` | [x] Fixed |
| `components/file-drop.tsx` | 44-58 | File-drop drop button lacks focus-visible ring | Add `focus-visible:ring-2 focus-visible:ring-accent` | [x] Fixed |
| `components/input-toggle.tsx` | 23-32 | Tab buttons lack focus-visible rings; uses `rounded-[8px]` | Replace with `rounded-btn` and add focus-visible rings | [x] Fixed |
| `components/sheet-panel.tsx` | 51-53 | Custom loading card container | Replace with `<Panel>` / unified spinner | [x] Fixed |
| `components/sheet-panel.tsx` | 59-75 | Custom empty/disconnect block | Replace with `<EmptyState>` + actions | [x] Fixed |
| `components/sheet-panel.tsx` | 64 | Hardcoded Google Sheet button styling | Replace with `PRIMARY_BTN` | [x] Fixed |
| `components/sheet-panel.tsx` | 86-91 | Bespoke refresh button lacks focus-visible ring | Add `focus-visible:ring-2 focus-visible:ring-accent` and `GHOST_BTN` | [x] Fixed |
| `components/sheet-panel.tsx` | 92-99 | External link button lacks focus-visible | Add `focus-visible:ring-2 focus-visible:ring-accent` | [x] Fixed |
| `components/sheet-panel.tsx` | 102 | Synchronized sheet list container | Replace container with `<Panel>` | [x] Fixed |
| `components/transform-panel.tsx` | 123 | Textarea lacks focus-visible token | Add focus-visible style | [x] Fixed |
| `components/transform-panel.tsx` | 130-144 | Transform button uses hardcoded styles | Replace with `PRIMARY_BTN` | [x] Fixed |
| `components/transform-panel.tsx` | 146-151 | Load demo button uses hardcoded styles | Replace with `SECONDARY_BTN` | [x] Fixed |
| `components/transform-panel.tsx` | 155-163 | Sample selection links are buttons without focus ring | Replace button styles with `GHOST_BTN` and add focus ring | [x] Fixed |
| `components/transform-panel.tsx` | 172-174 | Bespoke error message block | Replace with `<Panel className="text-danger">` | [x] Fixed |
| `components/transform-panel.tsx` | 187-189 | Bespoke table empty state placeholder | Replace with `<EmptyState>` | [x] Fixed |
| `components/transform-panel.tsx` | 198-202 | Table skeleton uses repeated card style | Replace with `<Panel>` | [x] Fixed |
| `components/editable-table.tsx` | 53-59 | Send to Analytics button uses custom styling | Replace with `SECONDARY_BTN` | [x] Fixed |
| `components/editable-table.tsx` | 61-67 | Send to Sheet button uses custom styling | Replace with `SECONDARY_BTN` | [x] Fixed |
| `components/editable-table.tsx` | 68-73 | Download Excel button uses custom styling | Replace with `PRIMARY_BTN` | [x] Fixed |
| `components/editable-table.tsx` | 77 | Table scroll container uses repeated card style | Replace with `<Panel>` wrapper | [x] Fixed |
| `components/analytics-report.tsx` | 74 | Download PDF button uses hardcoded styles | Replace with `PRIMARY_BTN` | [x] Fixed |
| `components/analytics-report.tsx` | 100 | Key Points box uses custom card style | Replace with `<Panel>` | [x] Fixed |
| `components/analytics-report.tsx` | 147 | Chart card uses custom card style | Replace with `<Panel>` | [x] Fixed |
| `components/kpi-card.tsx` | 27 | KPI card uses custom card style | Replace with `<Panel>` | [x] Fixed |
| `components/ui/tabs.tsx` | 61 | Tab headers focus style overrides | Ensure focus ring matches design system | [x] Fixed |
