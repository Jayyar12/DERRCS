# Frontend shadcn/ui Architecture Analysis and Improvement Discovery

## 1. Executive Summary

This document reviews the frontend codebase against official shadcn/ui and Base UI standards. The current setup runs Vite, React 19, Tailwind CSS v4, and Base UI primitives under the `base-nova` style preset.

The codebase already installs 25 core UI components in `services/frontend/src/components/ui/`. However, multiple pages still use hand-rolled HTML, raw color overrides, incorrect trigger props, and manual spacing classes. Adopting official shadcn patterns will improve maintainability, accessibility, and visual consistency.

---

## 2. Project Configuration Baseline

```json
{
  "framework": "Vite (SPA)",
  "base": "base (Base UI primitives)",
  "style": "base-nova",
  "tailwind": "v4",
  "iconLibrary": "lucide (lucide-react)",
  "uiPath": "services/frontend/src/components/ui"
}
```

### Critical Architecture Rule: Base UI vs Radix
This project uses **Base UI** (`base: "base"`), not Radix.
* Base UI triggers use `render={<Button />}` instead of `asChild`.
* When `render` replaces a button with a link (`<a>`), it requires `nativeButton={false}`.
* Base UI `Select` requires wrapping items in `SelectGroup`.
* Multi-select controls and option groups use array-based `defaultValue` and Base UI boolean props.

---

## 3. Discovered Anti-Patterns and Areas for Improvement

### A. Primitive Mismatches (Radix vs Base UI)
* **Drawer Trigger in Responder Portal**:
  * Location: `services/frontend/src/pages/ResponderPortal.jsx`
  * Issue: Uses `<DrawerTrigger asChild>`.
  * Fix: Use `<DrawerTrigger render={<Button ... />} />`.
* **Sidebar Menu Link in Admin Dashboard**:
  * Location: `services/frontend/src/pages/AdminDashboard.jsx`
  * Issue: Uses `<SidebarMenuButton render={<a href="/dispatcher" />} />` without `nativeButton={false}`.
  * Fix: Add `nativeButton={false}` to tell Base UI that the trigger element is an anchor tag.

### B. Form Controls and Option Sets
* **Native Select Elements**:
  * Location: `services/frontend/src/pages/CitizenReport.jsx` (Step 2 questions) and `services/frontend/src/pages/admin/StaffView.jsx` (Role selection).
  * Issue: Both use raw `<select className="...">` elements instead of shadcn's `Select` or `NativeSelect`.
  * Fix: Refactor to shadcn `Select` with `SelectGroup` and `SelectItem`.
* **Select Items Without SelectGroup**:
  * Location: `services/frontend/src/pages/ResponderPortal.jsx` (Gender, AVPU, and Disposition selectors).
  * Issue: `SelectItem` elements sit directly inside `SelectContent` without `SelectGroup`.
  * Fix: Wrap all `SelectItem` lists inside `SelectGroup`.
* **Manual Option Grids Instead of Toggle Groups**:
  * Location: `services/frontend/src/pages/CitizenReport.jsx` (Emergency type grid) and `services/frontend/src/pages/admin/AnalyticsView.jsx` (Time filters).
  * Issue: Uses raw `div` and `<button>` loops with manual `onClick` state handlers and ternary class strings.
  * Fix: Install and use `ToggleGroup` and `ToggleGroupItem` wrapped in `FieldSet` + `FieldLegend`.
* **Form Field Layout Structure**:
  * Location: `services/frontend/src/features/incident-review/IncidentReviewSheet.jsx` and `services/frontend/src/pages/DispatcherDashboard.jsx`.
  * Issue: Uses raw `<label>` and `space-x-2` / `space-y-*` wrappers.
  * Fix: Standardize on `FieldGroup`, `Field`, and `FieldLabel`.

### C. Styling and Semantic Tokens
* **Hardcoded Status Colors**:
  * Location: `services/frontend/src/features/incident-review/IncidentReviewSheet.jsx` (`statusColors` map) and `services/frontend/src/pages/CitizenReport.jsx` (`emergencyTypes`).
  * Issue: Uses raw Tailwind palette classes (`text-orange-500`, `text-blue-500`, `bg-green-600`, `bg-amber-500`, `bg-purple-600`).
  * Fix: Replace with semantic `Badge` variants (`default`, `secondary`, `destructive`, `outline`) and theme color tokens (`bg-primary`, `text-destructive`, `text-muted-foreground`).
* **Manual Dark Mode Overrides**:
  * Location: `services/frontend/src/features/incident-review/IncidentReviewSheet.jsx` (custom green and amber alert boxes).
  * Issue: Uses hardcoded classes like `border-green-600 bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-200`.
  * Fix: Use semantic `Alert` components with standard variants without ad-hoc dark mode utilities.
* **Legacy Spacing Classes**:
  * Locations: `CitizenReport.jsx`, `AnalyticsView.jsx`, `DispatcherDashboard.jsx`, `ResponderPortal.jsx`.
  * Issue: Uses `space-y-6`, `space-y-4`, `space-y-1`, and `space-x-2`.
  * Fix: Convert to `flex flex-col gap-6`, `flex flex-col gap-4`, and `flex items-center gap-2`.

### D. Component Composition and Missing Primitives
* **Custom Progress Bar**:
  * Location: `services/frontend/src/pages/CitizenReport.jsx`.
  * Issue: Renders a manual `div` with calculated percentage width for step progress.
  * Fix: Replace with the installed `Progress` component (`<Progress value={step * 25} />`).
* **Loading Placeholders**:
  * Locations: `ResponderPortal.jsx`, `DispatcherDashboard.jsx`, `AnalyticsView.jsx`.
  * Issue: Renders raw text with `animate-pulse` or unstyled pulsing `div`s.
  * Fix: Use the `Skeleton` component for structured placeholder loading cards.
* **Empty States**:
  * Locations: `DispatcherDashboard.jsx` (candidate and incident lists), `AuditView.jsx`, `AnalyticsView.jsx`.
  * Issue: Renders unstyled `<p className="text-muted-foreground">` text.
  * Fix: Add the shadcn `Empty` component (`EmptyHeader`, `EmptyTitle`, `EmptyDescription`, `EmptyMedia`).
* **Button Loading States**:
  * Locations: `Login.jsx`, `IncidentReviewSheet.jsx`, `CitizenReport.jsx`, `ResponderPortal.jsx`.
  * Issue: Switches text string (`"Submitting..."`, `"Validating..."`) without structured icons.
  * Fix: Compose buttons with `Spinner` + `data-icon="inline-start"` + `disabled`.
* **Search Inputs**:
  * Location: `services/frontend/src/pages/admin/AnalyticsView.jsx`.
  * Issue: Uses a `relative` div with an absolute positioned `Search` icon.
  * Fix: Use `InputGroup`, `InputGroupInput`, and `InputGroupAddon`.

### E. Icon Positioning Rules
* **Button Icon Classes**:
  * Locations: `CitizenReport.jsx`, `Login.jsx`, `DispatcherDashboard.jsx`.
  * Issue: Uses manual `className="size-4 mr-2"` on Lucide icons inside buttons.
  * Fix: Use `data-icon="inline-start"` or `data-icon="inline-end"` and let shadcn CSS handle icon sizing and spacing automatically.

---

## 4. Recommended New Components to Install

To support the refactoring plan, install these official components via the CLI:
1. `npx shadcn@latest add toggle-group` (for option sets, emergency types, filter bars)
2. `npx shadcn@latest add empty` (for zero-data states in dashboards and audit logs)
3. `npx shadcn@latest add spinner` (for accessible loading indicators in action buttons)
4. `npx shadcn@latest add input-group` (for search bars and grouped input controls)
5. `npx shadcn@latest add alert-dialog` (for destructive confirmation modals such as staff deactivation)

---

## 5. Phased Improvement Plan

### Phase 1: Core Layout and Primitive Compliance
* Fix Base UI trigger props across `ResponderPortal.jsx` (`render` on `DrawerTrigger`) and `AdminDashboard.jsx` (`nativeButton={false}`).
* Remove all `space-x-*` and `space-y-*` classes in favor of `flex gap-*`.
* Standardize Lucide icon attributes inside buttons to `data-icon`.

### Phase 2: Form Architecture and Option Sets
* Install `toggle-group`.
* Refactor `CitizenReport.jsx` emergency type picker to `ToggleGroup`.
* Refactor `AnalyticsView.jsx` time filters to `ToggleGroup`.
* Replace native `<select>` tags in `CitizenReport.jsx` and `StaffView.jsx` with Base UI `Select` + `SelectGroup`.
* Ensure every `SelectItem` in `ResponderPortal.jsx` sits inside a `SelectGroup`.

### Phase 3: Semantic Styling and Color Tokens
* Replace raw color objects in `IncidentReviewSheet.jsx` and `CitizenReport.jsx` with semantic `Badge` variants and CSS variable tokens.
* Remove manual dark mode overrides on alerts and cards.
* Integrate the installed `Progress` component into `CitizenReport.jsx`.

### Phase 4: Feedback, Loading, and Empty States
* Install `empty`, `spinner`, and `input-group`.
* Replace raw `animate-pulse` texts with structured `Skeleton` layouts.
* Replace empty list messages with `Empty` component compositions.
* Add `Spinner` indicators to submitting buttons.

---

## 6. Verification and Regression Testing
* Run `npm test` after each phase to verify all React component tests continue to pass.
* Run `npm run build` to verify clean bundle generation with no syntax or CSS errors.
* Validate all keyboard navigation, ARIA attributes, and form submissions across desktop and mobile views.
