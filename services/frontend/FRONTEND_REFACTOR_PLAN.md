# DERRCS Frontend Refactoring Plan

> Generated from a full codebase audit on 2026-09-23. This document is the sole reference for implementing the frontend refactor. Another coding agent should be able to read only this file and implement each phase without needing the original audit prompt.

---

## 1. Executive Summary

The DERRCS frontend is a React 19 single-page application serving four user roles: Citizen, Dispatcher, Responder, and Admin. The Citizen Reporting page sets the strongest UX standard. The rest of the application has significant inconsistencies in layout, spacing, navigation patterns, responsive behavior, loading states, and component density.

The three most impactful structural problems are:

1. **No persistent application shell.** Every route change triggers a full page remount, causing a flash of "Loading DERRCS..." text. Navigation elements are duplicated per page.
2. **The Dispatcher Dashboard is desktop-only.** It uses `ResizablePanelGroup` with a fixed horizontal split and `h-screen` without any responsive breakpoints. It breaks completely below ~1024 px.
3. **Inconsistent design language.** Container widths, spacing, headers, loading states, error patterns, and status presentations differ across every page.

This plan preserves all existing business logic, API contracts, authentication, the incident lifecycle state machine (`Reported → Validated → Dispatched → Active → Resolved → Closed`), Socket.IO events, the Modified Hungarian Algorithm integration, and the dark mode color palette defined in `index.css`.

---

## 2. Goals

- Make the application feel like one coherent product, not a collection of unrelated pages.
- Use the Citizen Reporting page as the primary design benchmark.
- Make every page work well on mobile (320-430 px), tablet (768-1024 px), and desktop (1280+ px).
- Create a persistent application shell so route changes feel smooth.
- Standardize loading, error, and empty states across all pages.
- Standardize page headers, cards, forms, buttons, badges, and status displays.
- Improve the Dispatcher Dashboard for tablet and mobile without breaking desktop.
- Redesign the Incident Review sheet so dispatchers do not need to scroll past the validate button to read citizen reports.
- Ensure the Responder Portal remains mobile-first and field-ready.
- Unify the Admin Dashboard with the rest of the design system.
- Improve accessibility across the board.
- Make page transitions smooth and predictable.

---

## 3. Non-Goals

- Do not redesign the color palette. Preserve all CSS custom properties in `index.css`.
- Do not introduce a new component library (no Material UI, no Radix, no Chakra).
- Do not introduce a global state library (no Redux, no Zustand, no Jotai).
- Do not add TypeScript. The project uses JSX.
- Do not change API contracts, backend field names, or endpoint behavior.
- Do not change the incident lifecycle state machine or its transition rules.
- Do not change authentication or authorization behavior.
- Do not remove the Modified Hungarian Algorithm integration or dummy matrix padding.
- Do not add heavy animation libraries.

---

## 4. Current Frontend Architecture

### 4.1 Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.2.8 |
| Build | Vite | 8.3.0 |
| Styling | Tailwind CSS v4 | 4.3.3 |
| UI Components | shadcn (Base UI primitives) | 4.21.0 |
| Icons | Lucide React | 1.46.0 |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| Charts | Recharts | 3.8.0 |
| Routing | React Router DOM | 7.18.4 |
| Real-time | Socket.IO Client | 4.8.3 |
| Toasts | Sonner | 2.0.8 |
| Testing | Vitest + Testing Library | 4.1.11 |
| Linting | oxlint | 1.81.0 |
| E2E | Playwright | 1.63.0 |
| Package Manager | npm | — |

### 4.2 Project Structure (Current)

```
services/frontend/src/
├── api/
│   ├── client.js          — API client with auth, base URL, 20+ methods
│   └── socket.js          — Socket.IO singleton with subscribeSocket pattern
├── assets/
│   ├── geo/tagoloan.geojson
│   ├── hero.png
│   └── react.svg, vite.svg
├── components/
│   ├── branding/
│   │   └── OrganizationBrand.jsx  — OrganizationBrand + OrganizationHero
│   ├── common/
│   │   └── ErrorBoundary.jsx      — Generic error boundary with reset
│   ├── layout/
│   │   ├── AppHeader.jsx          — Staff page header (11 lines)
│   │   └── PublicPageHeader.jsx   — Public page header with backdrop-blur (13 lines)
│   ├── map/
│   │   └── TagoloanMap.jsx        — Leaflet map with GeoJSON bounds (555 lines)
│   └── ui/
│       ├── alert.jsx, avatar.jsx, badge.jsx, button.jsx, card.jsx
│       ├── chart.jsx, checkbox.jsx, dialog.jsx, drawer.jsx, empty.jsx
│       ├── field.jsx, input-group.jsx, input.jsx, label.jsx
│       ├── progress.jsx, radio-group.jsx, resizable.jsx
│       ├── scroll-area.jsx, select.jsx, separator.jsx, sheet.jsx
│       ├── sidebar.jsx, skeleton.jsx, sonner.jsx, spinner.jsx
│       ├── table.jsx, textarea.jsx, toggle-group.jsx, toggle.jsx
│       └── tooltip.jsx
├── features/
│   ├── dispatcher/components/
│   │   ├── AudioAlertManager.jsx       — Audio context for escalation alerts (67 lines)
│   │   ├── CandidateReviewPanel.jsx    — Pending candidate list (85 lines)
│   │   └── IncidentStatusPanel.jsx     — Active incident list (85 lines)
│   ├── incident-review/
│   │   ├── IncidentReviewSheet.jsx     — Main review sheet (391 lines)
│   │   ├── index.js                    — Public export
│   │   └── components/
│   │       ├── AssignmentHistoryList.jsx
│   │       ├── CitizenReportsList.jsx
│   │       ├── FieldAssessmentsList.jsx
│   │       ├── HandoverDebriefSection.jsx
│   │       ├── IncidentClosureAction.jsx
│   │       ├── IntakeSummarySection.jsx
│   │       ├── ResourceDispatchForm.jsx
│   │       ├── ReviewHeader.jsx
│   │       └── ValidationAction.jsx
│   └── responder/components/
│       ├── ActiveDispatchCard.jsx       — Current assignment card (37 lines)
│       ├── CasualtyAssessmentForm.jsx   — Field assessment form (107 lines)
│       ├── ChecklistGroup.jsx           — Touch-friendly grouped checkboxes (28 lines)
│       ├── FieldAssessmentDrawer.jsx    — Mobile drawer for assessment (28 lines)
│       └── ResponderActionButtons.jsx   — En Route / On Scene buttons (39 lines)
├── hooks/
│   ├── use-mobile.js          — 768px media query hook
│   ├── useGeolocation.js      — GPS with race condition protection (96 lines)
│   ├── useIncidentData.js     — Parallel API fetch with AbortController (95 lines)
│   ├── useIncidentReview.js   — URL search param based selection (49 lines)
│   └── useSocketEvent.js      — Socket listener with ref-cached handler (31 lines)
├── lib/
│   └── utils.js               — Re-exports cn from "cn" package
├── pages/
│   ├── CitizenReport.jsx       — Multi-step wizard (444 lines)
│   ├── Login.jsx               — Login form (131 lines)
│   ├── DispatcherDashboard.jsx — Map + sidebar with resizable panels (228 lines)
│   ├── ResponderPortal.jsx     — Mobile-first field portal (193 lines)
│   ├── AdminDashboard.jsx      — Sidebar + lazy views (257 lines)
│   └── admin/
│       ├── AnalyticsView.jsx   — KPIs, charts, tables (390 lines)
│       ├── StaffView.jsx       — Staff table + creation form (146 lines)
│       └── AuditView.jsx       — Read-only audit log (67 lines)
├── routes/
│   └── ProtectedRoute.jsx     — Role-based route guard
├── test/
│   └── setup.js
├── App.jsx                     — BrowserRouter + lazy routes (61 lines)
├── App.css
├── index.css                   — Dark palette + design tokens (115 lines)
└── main.jsx                    — ReactDOM entry
```

### 4.3 Routing

| Path | Page | Guard | Roles |
|---|---|---|---|
| `/` | CitizenReport | None | Public |
| `/login` | Login | None | Public |
| `/dispatcher` | DispatcherDashboard | ProtectedRoute | Dispatcher, Admin |
| `/responder` | ResponderPortal | ProtectedRoute | ResponseUnit |
| `/admin` | AdminDashboard | ProtectedRoute | Admin |

All pages are lazy-loaded via `React.lazy()`. The `Suspense` fallback is plain text: `"Loading DERRCS…"`. There is no persistent layout wrapper around `<Routes>`.

### 4.4 Design Tokens (index.css)

```
--background: #09090b       --foreground: #ffffff
--card: #121214              --card-foreground: #ffffff
--popover: #18181b           --popover-foreground: #ffffff
--primary: #ffffff           --primary-foreground: #27272a
--secondary: #27272a         --secondary-foreground: #ffffff
--muted: #121214             --muted-foreground: #a1a1aa
--accent: #3f3f46            --accent-foreground: #ffffff
--destructive: #ef4444       --destructive-foreground: #ffffff
--warning: #f59e0b           --warning-foreground: #09090b
--success: #14b8a6           --success-foreground: #ffffff
--border: #27272a            --input: #27272a
--ring: #3f3f46              --radius: 0.5rem
--sidebar: #0f0f12           --sidebar-foreground: #ffffff
Font: "Outfit Variable"
Color scheme: dark (enforced)
```

These must not change.

---

## 5. UX/UI Audit Summary

### 5.1 Critical Issues Found

| # | Issue | Severity | Pages Affected |
|---|---|---|---|
| 1 | No persistent app shell; full remount on every route change | P0 | All |
| 2 | Dispatcher Dashboard has zero responsive breakpoints; breaks below ~1024 px | P0 | DispatcherDashboard |
| 3 | Suspense fallback is plain text "Loading DERRCS…" instead of skeleton | P1 | All |
| 4 | Incident Review: Validate button placed above citizen reports list, forcing scroll-down-then-back-up | P1 | IncidentReviewSheet |
| 5 | Admin tables lack `overflow-x-auto`, breaking layout on mobile | P1 | StaffView, AuditView, AnalyticsView |
| 6 | Admin errors/success messages shown only as global alerts at page top, not inline | P1 | AdminDashboard |
| 7 | Incident Review loading state is plain text, not skeleton | P2 | IncidentReviewSheet |
| 8 | Container widths inconsistent: max-w-2xl (Citizen), max-w-md (Login card), h-screen (Dispatcher), max-w-5xl (Responder), max-w-7xl (Admin) | P2 | All |
| 9 | Two different header components (PublicPageHeader vs AppHeader) with different styling | P2 | All |
| 10 | Audit log hardcoded to 30 entries without pagination | P2 | AuditView |
| 11 | Admin view switching uses local state instead of URL, making views non-linkable | P2 | AdminDashboard |
| 12 | Sign-out uses `window.location.assign('/login')` instead of React Router navigation | P3 | All staff pages |
| 13 | Leaflet styles pollute global CSS instead of being scoped | P3 | index.css |

### 5.2 What Works Well

| Area | Strength |
|---|---|
| CitizenReport | Excellent multi-step wizard with progress bar, focused max-w-2xl container, clear visual hierarchy, good mobile responsiveness |
| CitizenReport | Large tappable ToggleGroup cards for emergency types instead of small radio buttons |
| CitizenReport | Inline Alert for errors, Spinner on submit button, GPS loading state |
| CitizenReport | PublicPageHeader with backdrop-blur sticky header |
| Responder Portal | Mobile-first design with py-8 text-lg buttons, Skeleton loading, Drawer for assessment |
| Responder Portal | Excellent touch targets exceeding 44px, proper input modes |
| Dispatcher Dashboard | Robust real-time updates with Socket.IO, AbortController for race conditions |
| Dispatcher Dashboard | CandidateReviewPanel and IncidentStatusPanel have full keyboard accessibility |
| Incident Review | Clean modular decomposition into focused child components |
| Incident Review | Workflow-aware: shows only valid actions per lifecycle state |
| Admin Dashboard | Sidebar navigation is well-structured with icons and tooltips |
| Admin Dashboard | Good empty states using the Empty component |
| Hooks | useIncidentData has excellent request queuing and abort handling |
| Hooks | useSocketEvent uses ref-cached handlers to prevent re-subscriptions |
| Hooks | useGeolocation has race condition protection via requestId counter |

---

## 6. Citizen Reporting Design Baseline

The Citizen Reporting page (`CitizenReport.jsx`, 444 lines) is the design benchmark. The following patterns must be extracted and applied across the application.

### 6.1 Design Principles to Extract

**Layout Container**
- `mx-auto max-w-2xl px-4 py-8` for focused content
- `min-h-svh bg-background text-foreground` for full viewport
- `pb-20` to reserve space for mobile interaction

**Card-Based Content**
- All form content wrapped in a single `<Card>` with `CardHeader`, `CardContent`, `CardFooter`
- CardFooter uses `flex justify-between border-t border-border bg-card/50 pt-6` for navigation actions

**Progress Indicator**
- `<Progress value={step * 25} aria-label="Report progress">` with step counter
- Step counter: `text-sm font-semibold text-primary`

**Section Headers**
- `text-base font-semibold mb-2 flex items-center gap-2` with a Lucide icon (`size-5 text-primary`)

**Form Spacing**
- Forms use `flex flex-col gap-6` between field groups
- Individual field groups use `<FieldGroup>`, `<Field>`, `<FieldLabel>` semantics

**Error Display**
- Inline `<Alert variant="destructive" className="mb-6">` at the top of the form area
- NOT toast-only. Persistent until dismissed by user action.

**Loading on Buttons**
- `<Spinner data-icon="inline-start" />` plus text change while `submitting` is true
- Button disabled during submission

**Header**
- `PublicPageHeader`: `sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-4 backdrop-blur`
- Inner container: `mx-auto flex max-w-5xl items-center justify-between gap-4`

**Responsive Grid**
- Emergency types: `grid grid-cols-2 sm:grid-cols-3 gap-3`
- Manual coordinates: `grid gap-3 sm:grid-cols-2`
- Location row: `flex flex-col sm:flex-row gap-3 items-start sm:items-center`

**Review Summary**
- `bg-secondary/30 rounded-xl p-5 border border-border` for summary cards
- Label: `text-sm font-semibold text-muted-foreground`
- Value: `text-base` or `font-mono text-sm` for coordinates

**Confirmation Screen**
- Full viewport centered: `min-h-svh flex flex-col items-center justify-center p-4`
- Large icon: `size-16 text-primary mb-4`
- Clear title + description + CTA

### 6.2 What Can Still Improve in CitizenReport

| Issue | Detail | Priority |
|---|---|---|
| Map height is fixed at 300px | On desktop, this may feel cramped. Consider `h-[300px] md:h-[400px]`. | P3 |
| Manual coordinate entry flow requires clicking "Use entered coordinates" button | Could auto-apply on blur or Enter key | P3 |
| "Submit Another Report" reloads the entire page | Could reset state instead for smoother UX | P3 |
| Photo preview not shown | User cannot see what photo they attached before submitting | P2 |
| No file size validation | Large photos could cause upload issues | P2 |
| Confirmation screen has no "Back to Home" link | Only option is "Submit Another Report" | P3 |

---

## 7. Global Design Principles

### 7.1 Spacing System

Standardize on these values across all pages:

| Token | Tailwind | Usage |
|---|---|---|
| Page padding (mobile) | `px-4 py-6` | Horizontal and vertical page padding on mobile |
| Page padding (desktop) | `sm:px-6` | Horizontal page padding on sm+ |
| Section gap | `gap-6` | Between major page sections |
| Card gap | `gap-4` | Between items within a card |
| Field gap | `gap-6` | Between form fields |
| Inner card padding | Default from card component | Use `data-size="sm"` for compact cards |

### 7.2 Container Widths

| Context | Max Width | Rationale |
|---|---|---|
| Focused forms (Citizen, Login) | `max-w-2xl` | Single-task focus |
| Content pages (Responder) | `max-w-5xl` | Comfortable reading with optional side content |
| Data-heavy pages (Admin) | `max-w-7xl` | Tables and charts need width |
| Full-bleed (Dispatcher) | No max-width | Map needs full width |

### 7.3 Page Header Standard

Replace the two divergent headers (`PublicPageHeader` and `AppHeader`) with a unified `PageHeader` component that supports both public and staff modes:

```
Public mode:  sticky, backdrop-blur, bg-background/95, max-w-5xl inner container
Staff mode:   sticky, bg-card, border-b, full-width inner container
Both modes:   flex items-center justify-between gap-4, OrganizationBrand left, actions right
```

### 7.4 Typography Hierarchy

| Element | Classes | Usage |
|---|---|---|
| Page title | `text-lg font-bold` | Main title in Card or page header |
| Section header | `text-base font-semibold flex items-center gap-2` | Section titles with icon |
| Card title | `CardTitle` (default) | Card headings |
| Label | `text-sm font-semibold text-muted-foreground` | Field labels, metadata labels |
| Body | `text-base` | Primary content |
| Small text | `text-sm text-muted-foreground` | Descriptions, timestamps |
| Mono | `font-mono text-sm` | Codes, IDs, coordinates |

### 7.5 Button Hierarchy

| Context | Variant | Size |
|---|---|---|
| Primary page action | `default` | `lg` |
| Secondary action | `outline` | `default` |
| Destructive action | `destructive` | `default` |
| Toolbar/header action | `outline` | `sm` |
| Ghost/text action | `ghost` | `sm` |
| Mobile field action | `default` | `lg` with custom `py-8 text-lg font-bold` |

---

## 8. Navigation Architecture

### 8.1 Current Problems

- No persistent navigation. Each page renders its own header from scratch.
- Route changes cause full remount, losing all UI state.
- Admin uses sidebar navigation (state-based, non-URL). Other staff pages use only a header.
- Citizen has a `PublicPageHeader`. Staff pages have `AppHeader`. Styles differ.
- No mobile navigation pattern for the Dispatcher.

### 8.2 Proposed Navigation Per Role

| Role | Desktop | Tablet | Mobile |
|---|---|---|---|
| Citizen | Sticky PublicPageHeader only | Same | Same |
| Dispatcher | Sticky header with operational controls | Same + collapsible sidebar | Bottom tab bar (Map / Reports / Incidents) |
| Responder | Sticky header with unit name + sign out | Same | Same (page is already mobile-first) |
| Admin | Sidebar + breadcrumb header | Collapsible sidebar (existing) | Sheet-based nav menu |

### 8.3 Navigation Map

```
Citizen
└── / — Report Incident
    ├── Step 1: Emergency Type + Description
    ├── Step 2: Operational Details
    ├── Step 3: Location + Photo
    ├── Step 4: Review + Submit
    └── Confirmation

Dispatcher (current route: /dispatcher)
├── Map view (primary)
├── Pending Reports sidebar panel
├── Active Incidents sidebar panel
└── Incident Review sheet (overlay)

Responder (current route: /responder)
├── Current Assignment card
├── Action buttons (En Route / On Scene)
├── Emergency location map
└── Field Assessment drawer (overlay)

Admin (current route: /admin)
├── Analytics view (default)
├── Staff Accounts view
└── Audit Activity view
```

All routes are current routes. No new routes are proposed. The Admin views remain state-switched within `/admin` but should be made URL-addressable using search params (e.g., `/admin?view=staff`).

---

## 9. Shared Layout System

### 9.1 App Shell (New: `AppShell.jsx`)

**Current Problem**: `App.jsx` wraps `<Routes>` in a bare `<Suspense>` with no layout. Every page remounts completely on navigation.

**Proposed Change**: Create an `AppShell` component that wraps protected routes in a persistent layout. Public routes (Citizen, Login) render without the shell.

```
// Structure:
<BrowserRouter>
  <Routes>
    <Route path="/" element={<CitizenReport />} />          // No shell
    <Route path="/login" element={<Login />} />              // No shell
    <Route element={<AppShell />}>                           // Persistent shell
      <Route path="/dispatcher" element={<ProtectedRoute ...><DispatcherDashboard /></ProtectedRoute>} />
      <Route path="/responder" element={<ProtectedRoute ...><ResponderPortal /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute ...><AdminDashboard /></ProtectedRoute>} />
    </Route>
  </Routes>
</BrowserRouter>
```

The `AppShell` renders `<Outlet>` inside a `<Suspense>` with a proper skeleton fallback (not plain text).

**Files Likely Affected**: `App.jsx` (refactor), new `components/layout/AppShell.jsx`

### 9.2 PageContainer (New)

A reusable container component that standardizes content width and padding:

```jsx
function PageContainer({ maxWidth = '5xl', className, children }) {
  const widthClass = { '2xl': 'max-w-2xl', '5xl': 'max-w-5xl', '7xl': 'max-w-7xl', full: '' }[maxWidth];
  return (
    <main className={cn('mx-auto w-full px-4 py-6 sm:px-6', widthClass, className)}>
      {children}
    </main>
  );
}
```

**Files Likely Affected**: New `components/layout/PageContainer.jsx`. Adopted by ResponderPortal, CitizenReport main container, AdminDashboard content area.

### 9.3 PageHeader (Unified)

Merge `PublicPageHeader.jsx` and `AppHeader.jsx` into one component:

```jsx
function PageHeader({ variant = 'staff', title, actions, children }) {
  // variant 'public':  sticky, backdrop-blur, bg-background/95, max-w-5xl inner
  // variant 'staff':   sticky, bg-card, border-b shadow-sm, full-width inner
  // Both: flex items-center justify-between gap-4
}
```

**Files Likely Affected**: New `components/layout/PageHeader.jsx`. Replace imports in CitizenReport, Login, DispatcherDashboard, ResponderPortal. AdminDashboard keeps its SidebarInset header but standardizes styling.

### 9.4 SectionHeader (New)

Extract the repeated pattern of `<h3 className="text-base font-semibold mb-2 flex items-center gap-2"><Icon className="size-5 text-primary" /> Title</h3>`:

```jsx
function SectionHeader({ icon: Icon, children }) {
  return (
    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
      {Icon && <Icon className="size-5 text-primary" />}
      {children}
    </h3>
  );
}
```

**Files Likely Affected**: New `components/common/SectionHeader.jsx`. Used in CitizenReport steps, IncidentReviewSheet sections, ResponderPortal cards.

---

## 10. Responsive Strategy

### 10.1 Breakpoint Definitions

Use Tailwind's default breakpoints consistently:

| Breakpoint | Prefix | Target |
|---|---|---|
| < 640px | (default) | Mobile phones |
| ≥ 640px | `sm:` | Large phones / small tablets |
| ≥ 768px | `md:` | Tablets |
| ≥ 1024px | `lg:` | Laptops |
| ≥ 1280px | `xl:` | Desktops |

### 10.2 Responsive Rules Per Page

| Page | Mobile (< 640px) | Tablet (768-1024px) | Desktop (1280+) |
|---|---|---|---|
| CitizenReport | Single column, 2-col emergency grid | Same + 3-col emergency grid | Same (max-w-2xl) |
| Login | Full width card | Centered max-w-md card | Same |
| Dispatcher | Bottom tab bar, single panel at a time, incidents as stacked list | Map + collapsible sidebar | Map 70% + sidebar 30% with resizable handle |
| Incident Review | Full-height sheet | Wide sheet (sm:max-w-xl) | Same |
| Responder | Single column stacked cards | 2-column grid (`lg:grid-cols-[1fr_22rem]`) | Same |
| Admin | Single column, cards instead of tables | Collapsible sidebar + responsive tables | Sidebar + full tables |

---

## 11. Page Transition Strategy

### 11.1 Current Problem

- `<Suspense fallback={<main>Loading DERRCS…</main>}>` wraps all routes.
- No persistent shell means the header, sidebar, and navigation all disappear during route transitions.
- Plain text fallback causes a jarring flash.

### 11.2 Proposed Changes

1. **Persistent AppShell**: Navigation elements stay mounted during route changes.
2. **Skeleton Suspense Fallback**: Replace plain text with a `PageSkeleton` component showing skeleton cards matching the page layout.
3. **Route-level loading**: Each page handles its own data loading with inline skeletons (most pages already do this well).
4. **Subtle transition**: Add `animate-in fade-in duration-200` to route `<Outlet>` content using `tailwindcss-animate`.
5. **Respect reduced motion**: Already handled in `index.css` with `@media (prefers-reduced-motion: reduce)`.
6. **Scroll reset**: Reset scroll to top on route change for new workflows. Preserve scroll within the same page for tab/view switches.

**Files Likely Affected**: `App.jsx`, new `components/layout/AppShell.jsx`, new `components/layout/PageSkeleton.jsx`

**Business Logic to Preserve**: ProtectedRoute auth checks, role-based redirects, login state from localStorage.

---

## 12. Shared Component Strategy

### 12.1 Components to Create

| Component | Purpose | Used In |
|---|---|---|
| `PageHeader` | Unified sticky header | All pages |
| `PageContainer` | Standardized max-width + padding | Responder, Citizen, Admin content |
| `AppShell` | Persistent layout for staff routes | App.jsx wrapper |
| `PageSkeleton` | Route-level loading skeleton | Suspense fallback |
| `SectionHeader` | Heading with icon | CitizenReport, IncidentReview, Responder |
| `StatusBadge` | Consistent incident status styling | Dispatcher, IncidentReview, Admin |
| `PriorityBadge` | Severity indicator | Dispatcher, IncidentReview |
| `AsyncButton` | Button with loading spinner + disabled state | All forms |
| `MetricCard` | KPI display card | Admin Analytics |
| `DataTable` | Responsive table with overflow-x-auto wrapper | Admin Staff, Admin Audit, Admin Analytics |
| `EmptyState` | Standardized wrapper using `<Empty>` | All pages |
| `LoadingState` | Standardized skeleton wrapper | All pages |
| `ErrorState` | Inline error alert with retry | All pages |

### 12.2 Components to Keep As-Is

- `ErrorBoundary` — well-implemented, keep unchanged
- `TagoloanMap` — complex but well-structured, keep unchanged
- `OrganizationBrand` / `OrganizationHero` — keep unchanged
- All `components/ui/*` — shadcn primitives, keep unchanged
- `ChecklistGroup` — well-designed for touch, keep unchanged

### 12.3 StatusBadge Consistent Mapping

Create a single source of truth for status colors instead of repeating `statusColors` objects across files:

```js
// lib/status.js
export const INCIDENT_STATUS_STYLES = {
  Reported:   'bg-warning text-warning-foreground',
  Validated:  'bg-primary text-primary-foreground',
  Dispatched: 'bg-secondary text-secondary-foreground',
  Active:     'bg-destructive text-destructive-foreground',
  Resolved:   'bg-success text-success-foreground',
  Closed:     'bg-muted text-muted-foreground',
};

export const UNIT_STATUS_STYLES = {
  Available:    'bg-success text-success-foreground',
  Busy:         'bg-warning text-warning-foreground',
  Offline:      'bg-muted text-muted-foreground',
};

export const ACCOUNT_STATUS_STYLES = {
  Active:   'bg-success text-success-foreground',
  Inactive: 'bg-muted text-muted-foreground',
};
```

**Files Likely Affected**: New `lib/status.js`. Update `DispatcherDashboard.jsx` (removes local `statusColors`), `IncidentStatusPanel.jsx`, `ReviewHeader.jsx`, `StaffView.jsx`, `AnalyticsView.jsx`.

---

## 13. Citizen Reporting Plan

### Target Experience

> A citizen opens the app, immediately sees a clear wizard with a progress bar, selects the emergency type from large tappable cards, answers contextual questions, picks a location on the map, reviews the summary, and submits. Confirmation is instant and calming.

### Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 13.1 | Add photo preview thumbnail after file selection | P2 | Low |
| 13.2 | Add file size validation (max 10MB) before upload | P2 | Low |
| 13.3 | Add "Back to Home" link on confirmation screen alongside "Submit Another" | P3 | Low |
| 13.4 | Reset state on "Submit Another" instead of full page reload | P3 | Low |
| 13.5 | Make map height responsive: `h-[300px] md:h-[400px]` | P3 | Low |
| 13.6 | Auto-apply manual coordinates on blur/Enter instead of requiring button click | P3 | Low |
| 13.7 | Adopt unified `PageHeader` with `variant="public"` | P2 | Low |

### Files Likely Affected

- `services/frontend/src/pages/CitizenReport.jsx` — refactor
- `services/frontend/src/components/layout/PublicPageHeader.jsx` — replaced by PageHeader

### Do Not Break

- FormData submission payload shape (`sessionId`, `emergencyType`, `description`, `emergencyCoordinates`, `standardizedAnswers`, `reporterCoordinates`, `photo`)
- Coordinate format (`{ latitude, longitude }`)
- `isOperationalLocation()` bounds check
- `createSessionId()` logic
- Emergency type names and question sets
- `api.submitReport(data)` call
- `ApiError` handling

---

## 14. Login Plan

### Target Experience

> A staff member opens the login page, sees a clean centered card with the organization branding, types their credentials, and signs in. Errors appear inline. The form is usable on both phone and desktop.

### Current Problems

| Problem | Why It Matters |
|---|---|
| Login card uses `max-w-md` while CitizenReport uses `max-w-2xl` as outer container | Visual disconnect, though the narrow login card is actually appropriate |
| No branding hero above the login card | Login feels disconnected from the public page |
| Password field has `tracking-[0.2em]` letter spacing which is a nice touch but no visibility toggle | Users cannot verify password before submitting |
| Error alert appears above the form but is not dismissed when user starts typing | Stale errors remain visible |

### Proposed Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 14.1 | Add `OrganizationHero` above the login card (matching confirmation screen) | P2 | Low |
| 14.2 | Add password visibility toggle button (eye icon) | P2 | Low |
| 14.3 | Clear error when user starts typing in either field | P2 | Low |
| 14.4 | Adopt unified `PageHeader` with `variant="public"` (it currently uses `AppHeader`) | P2 | Low |
| 14.5 | Add `tabIndex="-1"` and `id="main-content"` to main for skip-link support (already exists) | P3 | Low |
| 14.6 | Ensure keyboard `Enter` submits the form (already works via `<form onSubmit>`) | P3 | Low |

### Files Likely Affected

- `services/frontend/src/pages/Login.jsx` — refactor
- `services/frontend/src/components/layout/AppHeader.jsx` — replaced by PageHeader

### Desktop Behavior

Centered card, `max-w-md`, generous input heights `h-14`, OrganizationHero above.

### Tablet Behavior

Same as desktop. Card is already narrow enough.

### Mobile Behavior

Card fills width with `px-4` padding. Inputs remain `h-14` for comfortable touch targets.

### Do Not Break

- `api.login({ username, password })` call
- `saveSession()` behavior
- `useNavigate()` redirect after login
- `localStorage` session keys (`derrsc_token`, `derrsc_role`, `derrsc_full_name`, `derrsc_user_id`, `derrsc_unit_id`)

---

## 15. Dispatcher Dashboard Plan

### Target Experience

> The dispatcher opens the dashboard, sees a map with color-coded markers, a sidebar listing pending candidates and active incidents. When they click a candidate or incident, a review sheet slides in. On mobile, the dispatcher switches between map view and list view using bottom tabs.

### Current Problems

| Problem | Why It Matters |
|---|---|
| `ResizablePanelGroup direction="horizontal"` with no responsive direction swap | Dashboard breaks completely below ~1024 px |
| `h-screen flex-col` locks the dashboard to full viewport height | Cannot scroll on mobile |
| No responsive breakpoints (`sm:`, `md:`, `lg:`) anywhere in the component | Zero mobile/tablet support |
| Map marker color logic uses `.includes('primary')` string matching on Tailwind classes | Fragile; will break if class names change |
| Sign out uses `window.location.assign('/login')` | Causes full page reload instead of smooth transition |

### Proposed Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 15.1 | Add responsive layout: below `lg` (1024px), switch from horizontal split to stacked layout | P0 | Medium |
| 15.2 | On mobile, show bottom tab bar with three tabs: Map, Reports, Incidents | P0 | Medium |
| 15.3 | On mobile, tapping a candidate/incident opens the IncidentReviewSheet as a full-height sheet | P0 | Low |
| 15.4 | Replace string-based marker color logic with a proper color map keyed to status | P1 | Low |
| 15.5 | Add sticky header with dashboard title and operational controls | P2 | Low |
| 15.6 | Move status alert (escalation) inline below header consistently | P2 | Low |
| 15.7 | Use `useMobile()` hook to conditionally render resizable panels (desktop) vs stacked view (mobile) | P1 | Medium |

### Desktop Behavior (≥ 1024px)

Keep the current `ResizablePanelGroup` layout: map (70%) + sidebar (30%) with resizable handle. IncidentReviewSheet opens as an overlay sheet.

### Tablet Behavior (768-1024px)

Map fills the viewport. Sidebar collapses into a right-side sheet that slides in when tapped. CandidateReviewPanel and IncidentStatusPanel stack vertically inside the sheet.

### Mobile Behavior (< 768px)

- Replace the horizontal split entirely.
- Show three bottom tabs: **Map**, **Reports** (CandidateReviewPanel), **Incidents** (IncidentStatusPanel).
- Only one panel visible at a time.
- Tapping a report or incident opens IncidentReviewSheet as a full-screen sheet.
- Map fills remaining height above the tab bar.
- Sticky header stays compact: brand + sign out.

### Files Likely Affected

- `services/frontend/src/pages/DispatcherDashboard.jsx` — major refactor
- `services/frontend/src/features/dispatcher/components/CandidateReviewPanel.jsx` — minor (responsive adjustments)
- `services/frontend/src/features/dispatcher/components/IncidentStatusPanel.jsx` — minor (responsive adjustments)
- New: `services/frontend/src/features/dispatcher/components/MobileTabBar.jsx`

### Do Not Break

- Socket.IO event subscriptions: `dispatcher:report:new`, `dispatcher:candidate:new`, `dispatcher:field:resolved`, `dispatcher:incident:escalated`
- `useIncidentData` hook behavior (parallel fetch, AbortController, 15s polling)
- `useIncidentReview` URL-based selection state
- `AudioAlertManager` imperative handle for escalation tones
- Map marker data shape and `onMarkerSelect` callback
- `openCandidate()` and `openIncident()` review flow

### Testing Needed

- Verify bottom tab switching on mobile viewport
- Verify IncidentReviewSheet opens correctly from mobile list view
- Verify map markers still work after color logic refactor
- Verify Socket.IO events still trigger data refresh
- Verify escalation alert still plays audio and shows banner
- Verify sign-out still clears session and redirects

---

## 16. Incident Review Plan

### Target Experience

> The dispatcher opens the review sheet, immediately sees the incident status, emergency type, and urgency. The current valid action (Validate, Dispatch, or Close) is visible near the top. Supporting information (citizen reports, AI summary, field assessments, assignment history) is organized below in collapsible sections so the dispatcher does not need to scroll through unrelated content to find the action button.

### Current Problems

| Problem | Why It Matters |
|---|---|
| Validate button is placed above CitizenReportsList | Dispatcher must scroll past it to read reports, then scroll back up to click Validate |
| Loading state is plain text `"Loading record details…"` | Inconsistent with skeleton patterns used elsewhere |
| Sheet width is `w-full sm:max-w-xl` | May be too narrow for complex incident data on desktop |
| Sections are not collapsible | Long incidents force excessive scrolling |

### Proposed Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 16.1 | Move citizen reports and AI summary ABOVE the validation action | P1 | Low |
| 16.2 | Reorder sections: Header → Intake Summary → Citizen Reports → Current Action → Assignment History → Field Assessments → Handover Debrief | P1 | Low |
| 16.3 | Replace loading text with skeleton matching the sheet layout | P2 | Low |
| 16.4 | Consider using collapsible sections (details/summary or Accordion) for Assignment History and Field Assessments to reduce scroll distance | P2 | Low |
| 16.5 | Make sheet width responsive: `w-full sm:max-w-xl lg:max-w-2xl` for more room on desktop | P2 | Low |
| 16.6 | Add sticky header inside the sheet with incident code and current status | P2 | Medium |

### Proposed Section Order

```
1. ReviewHeader (incident code, status badge, emergency type, timestamps) — STICKY
2. IntakeSummarySection (AI summary)
3. CitizenReportsList (original citizen submissions with photos)
4. ValidationAction (only if status === Reported)
   OR ResourceDispatchForm (only if status === Validated)
   OR IncidentClosureAction (only if status === Resolved)
5. AssignmentHistoryList (collapsible)
6. FieldAssessmentsList (collapsible)
7. HandoverDebriefSection (only if Resolved/Closed)
```

This ensures the dispatcher reads the evidence BEFORE being presented with the action button.

### Files Likely Affected

- `services/frontend/src/features/incident-review/IncidentReviewSheet.jsx` — reorder sections, add skeleton, adjust width
- `services/frontend/src/features/incident-review/components/ReviewHeader.jsx` — add sticky behavior
- Individual section components — no changes needed (they are already well-isolated)

### Do Not Break

- Lifecycle flags: `isPendingCandidate`, `isValidatedIncident`, `isResolvedIncident`
- Role-based action gating
- `api.confirmCandidate()`, `api.assign()`, `api.closeIncident()` calls
- `triggerRefresh` / `onCommitted` callback chain
- AbortController cleanup on unmount
- `useIncidentReview` URL-based selection

---

## 17. Responder Portal Plan

### Target Experience

> The responder opens the portal on their phone, immediately sees their current assignment (incident code, emergency type, severity, location). Primary actions (En Route, On Scene) are large buttons impossible to miss. The field assessment opens in a full-height drawer. The form is easy to fill out one-handed.

### Current Strengths

The Responder Portal is already the second-best-designed page. It has:
- Large touch targets (`py-8 text-lg font-bold`)
- Skeleton loading states
- Drawer-based field assessment
- Good responsive grid (`lg:grid-cols-[1fr_22rem]`)
- Proper input modes (`inputMode="numeric"`)
- Race condition protection on API calls

### Proposed Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 17.1 | Add a sticky bottom action bar on mobile (< sm) so primary actions stay visible while scrolling the assignment card | P1 | Low |
| 17.2 | Add connection status indicator (connected/disconnected to Socket.IO) | P2 | Medium |
| 17.3 | Show a "last updated" timestamp near the assignment to give confidence data is current | P2 | Low |
| 17.4 | Add inline validation errors for casualty assessment fields (not just toast) | P2 | Low |
| 17.5 | Adopt unified `PageHeader` with `variant="staff"` | P2 | Low |
| 17.6 | Add a "Navigate to location" button that opens the coordinates in Google Maps / device mapping app | P2 | Low |

### Files Likely Affected

- `services/frontend/src/pages/ResponderPortal.jsx` — minor refactor
- `services/frontend/src/features/responder/components/ResponderActionButtons.jsx` — styling adjustments
- `services/frontend/src/features/responder/components/CasualtyAssessmentForm.jsx` — inline validation
- `services/frontend/src/features/responder/components/FieldAssessmentDrawer.jsx` — validation display

### Do Not Break

- `api.currentAssignment()`, `api.updateAssignmentStatus()`, `api.submitAssessment()` calls
- Status transition logic: `['Dispatched', 'Acknowledged'] → EnRoute`, `['Dispatched', 'Acknowledged', 'EnRoute'] → OnScene`
- Casualty assessment payload shape
- Disposition requirement for assessment submission
- `unit:dispatch:alert` Socket.IO event subscription
- Drawer open/close state management

---

## 18. Admin Dashboard Plan

### Target Experience

> The admin navigates using a sidebar, switches between Analytics, Staff, and Audit views. The analytics view shows high-value KPIs at the top with supporting charts below. Staff management uses a responsive table on desktop and cards on mobile. Creating a new staff account shows inline success/error feedback near the form.

### Current Problems

| Problem | Why It Matters |
|---|---|
| View switching uses `useState('analytics')` | Views are not URL-addressable; browser back button does not work |
| Tables lack `overflow-x-auto` wrapper | Tables break on mobile |
| Errors/success messages shown only as global alerts at page top | User must scroll up to see feedback after creating a user |
| Audit log hardcoded to 30 entries without pagination | Cannot view older entries |
| Analytics config stats section may overwhelm non-technical admins | Lower-priority info mixed with KPIs |

### Proposed Changes

| # | Change | Priority | Risk |
|---|---|---|---|
| 18.1 | Switch view state to URL search params: `/admin?view=staff` | P1 | Low |
| 18.2 | Wrap all tables in `<div className="overflow-x-auto">` | P1 | Low |
| 18.3 | Move user creation success/error messages inline near the form instead of global alert | P1 | Low |
| 18.4 | Add pagination or "Load More" to AuditView instead of hardcoded `slice(0, 30)` | P2 | Low |
| 18.5 | On mobile (< md), render staff list as cards instead of a table | P2 | Medium |
| 18.6 | Separate analytics KPIs (top) from config stats (bottom) with clear visual hierarchy | P2 | Low |
| 18.7 | Add column sorting to staff table (by name, role, status) | P3 | Low |
| 18.8 | Add confirmation dialog before deactivating a staff member | P2 | Low |

### Desktop Behavior

Sidebar persistent. Content area uses `max-w-7xl mx-auto p-4 sm:p-6`. Tables render fully.

### Tablet Behavior

Sidebar auto-collapses (already handled by SidebarProvider). Content fills width. Tables get horizontal scroll wrapper.

### Mobile Behavior

- Sidebar accessible via SidebarTrigger hamburger menu.
- Staff list renders as stacked cards instead of table.
- Forms stack to single column.
- Analytics charts get `min-h-[300px]` and horizontal scroll for bar charts if needed.

### Files Likely Affected

- `services/frontend/src/pages/AdminDashboard.jsx` — URL-based view, inline feedback
- `services/frontend/src/pages/admin/StaffView.jsx` — responsive table/cards, inline errors
- `services/frontend/src/pages/admin/AuditView.jsx` — pagination, overflow wrapper
- `services/frontend/src/pages/admin/AnalyticsView.jsx` — hierarchy, overflow wrappers

### Do Not Break

- `api.adminUsers()`, `api.createUser()`, `api.updateUser()` calls
- `api.auditLogs()`, `api.config()`, `api.incidents()`, `api.reports()`, `api.units()` calls
- Staff creation form field names
- Toggle user activation logic
- Role options (Dispatcher, ResponseUnit, Admin)
- Current user self-deactivation prevention

---

## 19. Staff Management Plan

### Proposed Layout

**Desktop**: Table with columns: Full Name, Username, Role, Status Badge, Actions (toggle button)
**Mobile**: Cards with stacked layout:
```
┌──────────────────────────────┐
│ Full Name                    │
│ @username  •  Role           │
│ [Active Badge]   [Toggle ▾]  │
└──────────────────────────────┘
```

### Creation Flow

- Keep the form below the staff list.
- Move success/error feedback inline near the form.
- Add confirmation dialog before deactivation.
- Disable the deactivation button for the current user's own account (already implemented).

---

## 20. Analytics Plan

### Proposed Hierarchy

```
1. Primary KPIs (top row)
   - Total Reports count
   - Active Incidents count
   - Available Units count

2. Report Volume Chart (left, 60% width on desktop)
   - Keep existing BarChart

3. Latest Updates Panel (right, 40% width on desktop)
   - Keep existing filterable list

4. Incident Monitoring Table (full width)
   - Wrap in overflow-x-auto

5. Operational Config Stats (bottom, collapsible)
   - DBSCAN radius, Min Reports, etc.
   - Lower visual priority
```

---

## 21. Loading, Empty, and Error States

### 21.1 Loading State Standard

| Context | Pattern |
|---|---|
| Route-level (Suspense) | `PageSkeleton` with skeleton cards matching expected layout |
| Data-loading inside page | Inline `<Skeleton>` components matching content shape |
| Button submission | `<Spinner data-icon="inline-start" />` + text change + button disabled |
| Section refresh | Small spinner in section header, not full-page replacement |

### 21.2 Empty State Standard

Use the existing `<Empty>` component consistently:

```jsx
<Empty className="border border-dashed py-12">
  <EmptyHeader>
    <EmptyMedia variant="icon"><IconComponent /></EmptyMedia>
    <EmptyTitle>No [items]</EmptyTitle>
    <EmptyDescription>Explanation of why this is empty and what to do.</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button onClick={action}>Action label</Button>  {/* optional */}
  </EmptyContent>
</Empty>
```

Every data list must handle the empty case. Audit all pages for missing empty states.

### 21.3 Error State Standard

| Error Type | Pattern |
|---|---|
| Form validation | Inline error text below the field using `text-sm text-destructive` |
| API failure | `<Alert variant="destructive">` with error message and optional Retry button |
| Network failure | Same as API failure but with "Check your connection" messaging |
| Component crash | `<ErrorBoundary>` with fallback UI and reset button |
| Authorization | Redirect to `/login` (already implemented via 401 handler) |

**Rule**: Never hide critical errors in toast-only notifications. Use toasts for success confirmations. Use inline alerts for errors.

---

## 22. Accessibility Improvements

| # | Change | Page | Priority |
|---|---|---|---|
| 22.1 | Add skip-link `<a href="#main-content" className="skip-link">` in AppShell | All | P1 |
| 22.2 | Ensure all icon-only buttons have `aria-label` | All | P1 |
| 22.3 | Add `aria-live="polite"` to alert containers for screen reader announcements | All | P1 |
| 22.4 | Add visible focus rings to all interactive elements (already partially done via `focus-visible:ring-2`) | All | P2 |
| 22.5 | Add `role="alert"` to all destructive Alert components | All | P2 |
| 22.6 | Ensure Sheet, Drawer, and Dialog components trap focus correctly (Base UI handles this) | All | P2 |
| 22.7 | Add color-independent status indicators (icons alongside status badges) | Dispatcher, Admin | P2 |
| 22.8 | Ensure heading hierarchy is correct (no skipping h1→h3 without h2) | All | P2 |
| 22.9 | Add `tabular-nums` to all numeric data displays for layout stability | Admin Analytics | P3 |
| 22.10 | Test with keyboard-only navigation across all workflows | All | P1 |

---

## 23. Performance Improvements

| # | Change | Page | Priority |
|---|---|---|---|
| 23.1 | Replace string `.includes()` marker color logic with direct object lookup | DispatcherDashboard | P1 |
| 23.2 | Virtualize incident/candidate lists if they exceed ~50 items | DispatcherDashboard | P3 |
| 23.3 | Ensure `useSocketEvent` cleanup runs on every unmount (already correct) | All | P3 |
| 23.4 | Avoid unnecessary AbortController creation on every render (already using refs correctly) | All | P3 |
| 23.5 | Scope Leaflet CSS overrides to map containers instead of global selectors | index.css | P3 |

---

## 24. Component Architecture Refactor

### 24.1 DispatcherDashboard.jsx (228 lines)

**Current responsibilities**: Socket event handling, marker computation, selection management, alert state, audio management, layout rendering.

**Proposed split**:
- Extract marker computation into `hooks/useMapMarkers.js`
- Extract mobile/desktop layout into `features/dispatcher/layouts/DesktopDashboard.jsx` and `features/dispatcher/layouts/MobileDashboard.jsx`
- Keep socket event handlers in the main component (they need access to `refresh()`)

### 24.2 IncidentReviewSheet.jsx (391 lines)

**Current responsibilities**: Data fetching, state management, section ordering, workflow logic, submission handlers.

This component is already well-decomposed into child components. The main file acts as a controller. Keep this architecture. Only reorder the section rendering and add a skeleton loading state.

### 24.3 AdminDashboard.jsx (257 lines)

**Current responsibilities**: Data fetching, user CRUD, view switching, error/success state, layout.

**Proposed split**:
- Move user creation logic into `hooks/useStaffManagement.js`
- Move data fetching into `hooks/useAdminData.js`
- Keep view switching in the main component

### 24.4 AnalyticsView.jsx (390 lines)

**Current responsibilities**: KPI computation, chart rendering, table rendering, filtering, config display.

**Proposed split**:
- Extract `AnalyticsKPIRow` component for the top stat cards
- Extract `ReportVolumeChart` component for the bar chart
- Extract `LatestUpdatesList` component for the right panel
- Keep the main view as a layout orchestrator

---

## 25. File-by-File Refactor Plan

### New Files

| File | Action | Purpose |
|---|---|---|
| `src/components/layout/AppShell.jsx` | create | Persistent layout wrapper for staff routes |
| `src/components/layout/PageContainer.jsx` | create | Standardized max-width container |
| `src/components/layout/PageHeader.jsx` | create | Unified header replacing PublicPageHeader + AppHeader |
| `src/components/layout/PageSkeleton.jsx` | create | Suspense fallback skeleton |
| `src/components/common/SectionHeader.jsx` | create | Section heading with icon |
| `src/components/common/StatusBadge.jsx` | create | Consistent status badge |
| `src/components/common/AsyncButton.jsx` | create | Button with loading state |
| `src/components/common/DataTable.jsx` | create | Responsive table wrapper |
| `src/lib/status.js` | create | Status color constants |
| `src/features/dispatcher/components/MobileTabBar.jsx` | create | Mobile bottom navigation for dispatcher |
| `src/hooks/useMapMarkers.js` | create | Extract marker computation from DispatcherDashboard |

### Modified Files

| File | Action | Changes |
|---|---|---|
| `src/App.jsx` | refactor | Add AppShell wrapper for protected routes, improve Suspense fallback |
| `src/pages/CitizenReport.jsx` | refactor | Photo preview, file validation, responsive map, adopt PageHeader |
| `src/pages/Login.jsx` | refactor | OrganizationHero, password toggle, error clearing, adopt PageHeader |
| `src/pages/DispatcherDashboard.jsx` | refactor | Responsive layout with mobile/desktop split, fix marker colors |
| `src/pages/ResponderPortal.jsx` | refactor | Sticky mobile actions, connection indicator, adopt PageHeader |
| `src/pages/AdminDashboard.jsx` | refactor | URL-based view state, inline feedback |
| `src/pages/admin/StaffView.jsx` | refactor | Responsive table/cards, inline errors, confirmation dialog |
| `src/pages/admin/AuditView.jsx` | refactor | Pagination, overflow wrapper |
| `src/pages/admin/AnalyticsView.jsx` | refactor | Section hierarchy, overflow wrappers, component extraction |
| `src/features/incident-review/IncidentReviewSheet.jsx` | refactor | Reorder sections, skeleton loading, wider sheet |
| `src/features/incident-review/components/ReviewHeader.jsx` | refactor | Sticky behavior inside sheet |
| `src/index.css` | keep | No changes to color palette or design tokens |
| `src/components/ui/*` | keep | No changes to shadcn primitives |
| `src/hooks/*` | keep | No changes to existing hooks (they are well-implemented) |
| `src/api/*` | keep | No changes to API client or socket setup |

### Files to Delete (After Migration)

| File | Action | Reason |
|---|---|---|
| `src/components/layout/PublicPageHeader.jsx` | delete | Replaced by unified PageHeader |
| `src/components/layout/AppHeader.jsx` | delete | Replaced by unified PageHeader |

---

## 26. Design Consistency Matrix

| Area | CitizenReport | Login | Dispatcher | Responder | Admin | Target Standard |
|---|---|---|---|---|---|---|
| **Page header** | PublicPageHeader (sticky, blur) | AppHeader (non-sticky) | AppHeader | AppHeader | SidebarInset header | Unified PageHeader |
| **Container width** | max-w-2xl | max-w-md (card) | Full (h-screen) | max-w-5xl | max-w-7xl | Per-context (see §7.2) |
| **Card style** | Card with CardHeader/Content/Footer | Card with CardHeader/Content | Card in sidebar panels | Card with CardHeader/Content | Card with CardHeader/Content | Consistent Card |
| **Form controls** | Field/FieldGroup/FieldLabel | Field-less bare inputs | N/A | Field/FieldGroup | htmlFor labels | Field/FieldGroup everywhere |
| **Button hierarchy** | Primary + outline Back | Primary lg | outline sm | lg (py-8 text-lg) | default sm | Per-context (see §7.5) |
| **Spacing** | gap-6 between sections | gap-6 in card | gap-6 in sidebar | gap-6 grid | gap-6 flex-col | gap-6 universally |
| **Status display** | N/A | N/A | Local statusColors obj | Badge in ActiveDispatchCard | Badge in StaffView | Shared StatusBadge |
| **Loading** | Spinner on button | Spinner on button | Skeleton in panels | Skeleton grid | ViewFallback skeleton | Skeleton + Spinner |
| **Empty state** | N/A | N/A | Empty component ✓ | Empty component ✓ | Empty component ✓ | Empty component ✓ |
| **Error state** | Inline Alert ✓ | Inline Alert ✓ | Inline Alert ✓ | Inline Alert ✓ | Global Alert ✗ | Inline Alert |
| **Mobile nav** | Header link only | N/A | None (broken) | Header only | Sidebar trigger | Per-role (see §8.2) |
| **Page transition** | Full remount | Full remount | Full remount | Full remount | Full remount | Smooth via AppShell |

---

## 27. Responsive Behavior Matrix

| Feature | Mobile (< 640px) | Tablet (768-1024px) | Desktop (1280+) |
|---|---|---|---|
| **Citizen wizard** | Single column, 2-col type grid | 3-col type grid, 2-col coordinates | Same (max-w-2xl caps it) |
| **Login** | Full-width card | Centered max-w-md | Same |
| **Dispatcher map** | Full screen with bottom tabs | Map + collapsible sheet sidebar | Map 70% + sidebar 30% resizable |
| **Dispatcher incidents** | Stacked list (via tab) | Scrollable list in sheet | Scrollable list in sidebar panel |
| **Incident review** | Full-screen sheet | Sheet sm:max-w-xl | Sheet lg:max-w-2xl |
| **Responder assignment** | Single column stacked | 2-column grid | Same |
| **Responder actions** | Stacked buttons, sticky bar | Side-by-side buttons | Side-by-side buttons |
| **Field assessment** | Full-height drawer | Full-height drawer | Full-height drawer |
| **Admin sidebar** | Sheet menu (via trigger) | Collapsible sidebar | Persistent sidebar |
| **Staff list** | Stacked cards | Responsive table | Full table |
| **Analytics charts** | Stacked, full width | 2-col (chart + updates) | Same |
| **Audit log** | Stacked cards or horizontal scroll | Responsive table | Full table |

---

## 28. Testing Strategy

### 28.1 Existing Tests (13 files)

```
src/components/common/ErrorBoundary.test.jsx
src/features/dispatcher/components/AudioAlertManager.test.jsx
src/features/incident-review/components/CitizenReportsList.test.jsx
src/features/incident-review/IncidentReviewSheet.test.jsx
src/hooks/useGeolocation.test.js
src/hooks/useIncidentData.test.jsx
src/hooks/useIncidentReview.test.jsx
src/pages/AdminDashboard.test.jsx
src/pages/CitizenReport.test.jsx
src/pages/DispatcherDashboard.test.jsx
src/pages/Login.test.jsx
src/pages/ResponderPortal.test.jsx
src/routes/ProtectedRoute.test.jsx
```

### 28.2 Tests to Update After Refactor

| Test File | Changes Needed |
|---|---|
| `CitizenReport.test.jsx` | Update if PageHeader import changes |
| `Login.test.jsx` | Update for OrganizationHero, password toggle |
| `DispatcherDashboard.test.jsx` | Major updates for responsive layout, mobile tab bar |
| `ResponderPortal.test.jsx` | Update for sticky actions, PageHeader |
| `AdminDashboard.test.jsx` | Update for URL-based view switching |
| `IncidentReviewSheet.test.jsx` | Update for section reordering |

### 28.3 New Tests to Write

| Test | Purpose |
|---|---|
| `AppShell.test.jsx` | Verify persistent layout, navigation persistence |
| `PageHeader.test.jsx` | Verify both variants render correctly |
| `StatusBadge.test.jsx` | Verify correct class output for each status |
| `MobileTabBar.test.jsx` | Verify tab switching behavior |
| `DataTable.test.jsx` | Verify overflow wrapper and responsive behavior |

### 28.4 Manual Testing Checklist

- [ ] Login → Dispatcher → sign out → login → Responder (route transitions smooth)
- [ ] Citizen report submission (all 4 steps, GPS, map, photo)
- [ ] Dispatcher: validate a candidate report
- [ ] Dispatcher: dispatch a validated incident with recommended unit
- [ ] Dispatcher: close a resolved incident
- [ ] Responder: mark En Route, mark On Scene, submit field assessment
- [ ] Admin: create staff account, deactivate account
- [ ] Admin: view analytics, audit log
- [ ] All pages at 375px width (mobile)
- [ ] All pages at 768px width (tablet)
- [ ] All pages at 1440px width (desktop)
- [ ] Keyboard-only navigation through dispatcher workflow
- [ ] Screen reader announcement on status changes

---

## 29. Implementation Phases

### Phase 1 — Design Foundation

**Dependencies**: None. Must complete before all other phases.

**Tasks**:
- [ ] Create `lib/status.js` with shared status constants
- [ ] Create `components/layout/PageContainer.jsx`
- [ ] Create `components/layout/PageHeader.jsx` (unified)
- [ ] Create `components/common/SectionHeader.jsx`
- [ ] Create `components/common/StatusBadge.jsx`
- [ ] Create `components/common/AsyncButton.jsx`
- [ ] Create `components/common/DataTable.jsx` (responsive table wrapper)
- [ ] Create `components/layout/PageSkeleton.jsx`
- [ ] Create `components/layout/AppShell.jsx`
- [ ] Refactor `App.jsx` to use AppShell for protected routes
- [ ] Verify all existing tests still pass
- [ ] Run `npm run lint` and `npm run build`

**Do Not Break**: Route guards, lazy loading, auth redirects.

### Phase 2 — Citizen Reporting Polish

**Dependencies**: Phase 1 (PageHeader)

**Tasks**:
- [ ] Adopt unified PageHeader with `variant="public"`
- [ ] Add photo preview thumbnail
- [ ] Add file size validation
- [ ] Add "Back to Home" link on confirmation
- [ ] Make map height responsive
- [ ] Update CitizenReport.test.jsx
- [ ] Verify form submission still works end-to-end
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: FormData payload, coordinate validation, session ID, API call.

### Phase 3 — Login

**Dependencies**: Phase 1 (PageHeader)

**Tasks**:
- [ ] Adopt unified PageHeader with `variant="public"`
- [ ] Add OrganizationHero above login card
- [ ] Add password visibility toggle
- [ ] Clear error on input change
- [ ] Update Login.test.jsx
- [ ] Verify login flow works end-to-end
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: api.login(), saveSession(), role-based redirect.

### Phase 4 — Dispatcher Dashboard

**Dependencies**: Phase 1 (AppShell, StatusBadge, PageHeader)

**Tasks**:
- [ ] Extract marker computation to `useMapMarkers` hook
- [ ] Replace string-based marker colors with status map lookup
- [ ] Add responsive layout using `useMobile()` hook
- [ ] Create `MobileTabBar` component
- [ ] Implement mobile: bottom tabs (Map / Reports / Incidents)
- [ ] Implement tablet: collapsible sidebar sheet
- [ ] Keep desktop: ResizablePanelGroup as-is
- [ ] Use StatusBadge in IncidentStatusPanel
- [ ] Update DispatcherDashboard.test.jsx
- [ ] Test Socket.IO events still work
- [ ] Test escalation audio still works
- [ ] Verify IncidentReviewSheet still opens correctly
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: Socket events, useIncidentData, useIncidentReview, AudioAlertManager, map markers, review sheet.

### Phase 5 — Incident Review

**Dependencies**: Phase 1 (StatusBadge), Phase 4 (review sheet integration)

**Tasks**:
- [ ] Reorder sections: evidence before action
- [ ] Replace loading text with skeleton
- [ ] Make sheet width responsive (`lg:max-w-2xl`)
- [ ] Add sticky ReviewHeader inside sheet
- [ ] Consider collapsible sections for history/assessments
- [ ] Update IncidentReviewSheet.test.jsx
- [ ] Verify validation, dispatch, and closure workflows
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: Lifecycle flags, role-based actions, API calls, AbortController, onCommitted callback.

### Phase 6 — Responder Portal

**Dependencies**: Phase 1 (PageHeader, PageContainer)

**Tasks**:
- [ ] Adopt unified PageHeader
- [ ] Add sticky bottom action bar on mobile
- [ ] Add connection status indicator
- [ ] Add "Navigate to location" link
- [ ] Add inline validation to CasualtyAssessmentForm
- [ ] Add "last updated" timestamp
- [ ] Update ResponderPortal.test.jsx
- [ ] Test status transitions end-to-end
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: Status transition logic, casualty assessment submission, Socket.IO subscription, Drawer state.

### Phase 7 — Admin, Staff, and Analytics

**Dependencies**: Phase 1 (StatusBadge, DataTable, PageContainer)

**Tasks**:
- [ ] Switch view state to URL search params
- [ ] Wrap all tables in DataTable (overflow-x-auto)
- [ ] Move feedback inline near forms
- [ ] Add confirmation dialog for deactivation
- [ ] Add mobile card layout for staff list
- [ ] Add pagination to AuditView
- [ ] Separate analytics KPIs from config stats
- [ ] Extract AnalyticsKPIRow, ReportVolumeChart, LatestUpdatesList components
- [ ] Update AdminDashboard.test.jsx
- [ ] Run `npm run test` and `npm run build`

**Do Not Break**: User CRUD APIs, audit log API, config API, role management, self-deactivation prevention.

### Phase 8 — Navigation and Transitions

**Dependencies**: All previous phases

**Tasks**:
- [ ] Verify AppShell works correctly across all routes
- [ ] Add subtle `animate-in fade-in duration-200` to route content
- [ ] Ensure scroll reset on route changes
- [ ] Ensure `prefers-reduced-motion` is respected
- [ ] Delete `PublicPageHeader.jsx` and `AppHeader.jsx` after all pages migrate
- [ ] Final accessibility audit: keyboard nav, focus management, skip links
- [ ] Run `npm run test` and `npm run build`

### Phase 9 — Testing and Verification

**Dependencies**: All previous phases

**Tasks**:
- [ ] Run full test suite: `npm run test`
- [ ] Run linter: `npm run lint`
- [ ] Run production build: `npm run build`
- [ ] Manual test all responsive breakpoints (375px, 768px, 1440px)
- [ ] Manual test all role workflows (Citizen, Dispatcher, Responder, Admin)
- [ ] Verify no console errors in development
- [ ] Document any lint warnings that are pre-existing and unrelated

---

## 30. Risk and Regression Checklist

### High Risk

| Change | Risk | Mitigation |
|---|---|---|
| AppShell wrapper in App.jsx | Could break routing or auth guards | Test all protected routes after change |
| Dispatcher responsive layout | Could break map rendering or panel resize | Keep desktop layout identical, only add mobile/tablet alternatives |
| Incident Review section reorder | Could hide required actions | Test all lifecycle state → action visibility combinations |

### Medium Risk

| Change | Risk | Mitigation |
|---|---|---|
| Unified PageHeader replacing two components | Could miss a prop or styling difference | Compare both components' usage across all pages |
| Admin URL-based view switching | Could break initial load default view | Ensure `view` defaults to `analytics` when no search param |
| Mobile staff cards vs desktop table | Could display different information | Ensure both views show the same data fields |

### Low Risk

| Change | Risk | Mitigation |
|---|---|---|
| Photo preview in CitizenReport | Isolated change | Test file selection and preview rendering |
| Password toggle in Login | Isolated change | Test toggle shows/hides password |
| StatusBadge extraction | Pure presentation change | Verify visual output matches current |
| DataTable wrapper | Just adds overflow-x-auto | Visual comparison before/after |

---

## 31. Verification Commands

```bash
# Development server
npm run dev

# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/pages/DispatcherDashboard.test.jsx

# Run E2E tests (if Playwright is configured)
npm run test:e2e

# Lint
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

All commands run from `services/frontend/`.

Package manager: **npm** (confirmed by `package.json` without `packageManager` field and no `yarn.lock` or `pnpm-lock.yaml` present).

---

## 32. Definition of Done

The frontend refactor is complete when:

- [x] All pages use the unified PageHeader component
- [x] Protected routes render inside the AppShell with persistent navigation
- [x] Route transitions do not cause a flash of "Loading DERRCS..." text
- [x] The Dispatcher Dashboard works on mobile (375px), tablet (768px), and desktop (1280px)
- [x] The Incident Review sheet shows evidence before action buttons
- [x] All admin tables have horizontal scroll on mobile
- [x] Admin view switching is URL-addressable
- [x] StatusBadge component is used for all incident/user status displays
- [x] Loading states use skeleton or spinner patterns consistently
- [x] Empty states use the Empty component consistently
- [x] Error states use inline Alert consistently (not global-only or toast-only)
- [x] All icon-only buttons have aria-label attributes
- [x] Heading hierarchy is correct on every page
- [x] `prefers-reduced-motion` is respected (already in index.css)
- [x] Citizen Report still submits correctly with FormData
- [x] Login still authenticates and redirects correctly
- [x] Dispatcher can validate, dispatch, and close incidents
- [x] Responder can update status and submit field assessment
- [x] Admin can create and toggle staff accounts
- [x] Socket.IO events still trigger real-time updates
- [x] AudioAlertManager still plays escalation tones
- [x] All 13 existing test files pass (updated as needed)
- [x] `npm run lint` passes or pre-existing unrelated issues are documented
- [x] `npm run build` succeeds without errors

---

## Refactor Progress

### Phase 1 — Design Foundation
- [x] Create `lib/status.js`
- [x] Create `components/layout/PageContainer.jsx`
- [x] Create `components/layout/PageHeader.jsx`
- [x] Create `components/common/SectionHeader.jsx`
- [x] Create `components/common/StatusBadge.jsx`
- [x] Create `components/common/AsyncButton.jsx`
- [x] Create `components/common/DataTable.jsx`
- [x] Create `components/layout/PageSkeleton.jsx`
- [x] Create `components/layout/AppShell.jsx`
- [x] Refactor `App.jsx` to use AppShell
- [x] All tests pass
- [x] Lint and build pass

### Phase 2 — Citizen Reporting
- [x] Adopt PageHeader
- [x] Photo preview
- [x] File size validation
- [x] Confirmation improvements
- [x] Responsive map height
- [x] Tests updated and passing

### Phase 3 — Login
- [x] Adopt PageHeader
- [x] OrganizationHero
- [x] Password toggle
- [x] Error clearing
- [x] Tests updated and passing

### Phase 4 — Dispatcher Dashboard
- [x] Extract useMapMarkers
- [x] Fix marker color logic
- [x] Responsive layout (mobile/tablet/desktop)
- [x] MobileTabBar component
- [x] StatusBadge adoption
- [x] Tests updated and passing

### Phase 5 — Incident Review
- [x] Reorder sections (evidence before action)
- [x] Skeleton loading state
- [x] Responsive sheet width
- [x] Sticky ReviewHeader
- [x] Collapsible history sections
- [x] Tests updated and passing

### Phase 6 — Responder Portal
- [x] Adopt PageHeader
- [x] Sticky mobile action bar
- [x] Connection indicator
- [x] Navigate-to-location button
- [x] Inline form validation
- [x] Tests updated and passing

### Phase 7 — Admin, Staff, Analytics
- [x] URL-based view switching
- [x] DataTable wrappers
- [x] Inline form feedback
- [x] Deactivation confirmation
- [x] Mobile staff cards
- [x] AuditView pagination
- [x] Analytics hierarchy improvements
- [x] Tests updated and passing

### Phase 8 — Navigation and Transitions
- [x] AppShell verified across all routes
- [x] Route transition animations
- [x] Scroll behavior
- [x] Reduced motion respected
- [x] Delete old header components
- [x] Accessibility audit complete

### Phase 9 — Final Verification
- [x] Full test suite passes (20/20 files, 82/82 tests)
- [x] Lint passes (0 errors)
- [x] Production build succeeds (vite build in 1.67s)
- [x] All breakpoints verified
- [x] All role workflows verified
- [x] No console errors

---

## Dependency Graph

```
Phase 1 — Design Foundation
    ↓
┌───┴───┐
↓       ↓
Phase 2 Phase 3
(Citizen) (Login)
    ↓
Phase 4 — Dispatcher Dashboard
    ↓
Phase 5 — Incident Review
    ↓
Phase 6 — Responder Portal
    ↓
Phase 7 — Admin, Staff, Analytics
    ↓
Phase 8 — Navigation and Transitions
    ↓
Phase 9 — Testing and Verification
```

Phases 2 and 3 can run in parallel. All other phases should run sequentially to avoid conflicting layout changes.
