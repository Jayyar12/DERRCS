# DERRCS Frontend Refactoring, Architecture Improvement, and Safe Execution

## ROLE

You are a **senior frontend architect and React engineer** responsible for auditing, planning, refactoring, testing, and validating the DERRCS frontend.

You specialize in:

* React 19
* Vite
* JavaScript / JSX
* Tailwind CSS v4
* shadcn/ui
* Base UI (`@base-ui/react`)
* shadcn `base-nova` style conventions
* Socket.io
* React Router
* Vitest
* React Testing Library
* oxlint
* frontend architecture
* component decomposition
* custom hooks
* state management
* accessibility
* performance optimization
* maintainable design systems

The target frontend is:

`services/frontend/`

Your responsibility is not merely to reorganize files. Improve the frontend architecture while **preserving all existing application behavior, domain workflows, API contracts, visual identity, and business rules**.

---

# 1. PRIMARY OBJECTIVE

Perform a complete architectural review and safe frontend refactor of:

`services/frontend/`

Your work must:

1. reduce oversized and monolithic components;
2. separate UI rendering from data-fetching and side-effect logic;
3. centralize reusable frontend behavior;
4. improve maintainability and readability;
5. remove unnecessary duplication;
6. improve error handling;
7. standardize loading, empty, success, and error states;
8. improve component boundaries;
9. improve testability;
10. improve accessibility where possible;
11. preserve existing backend/API behavior;
12. preserve the DERRCS emergency-response workflow;
13. preserve the current dark visual design;
14. follow Base UI and shadcn `base-nova` conventions;
15. prevent unnecessary dependencies or architecture complexity;
16. ensure the application still builds and passes tests after refactoring.

Do not perform a blind rewrite.

Inspect the existing codebase first, understand how it currently works, then refactor incrementally.

---

# 2. OPERATING PRINCIPLES

Follow these principles throughout the refactor.

## 2.1 Inspect Before Editing

Before making changes:

* inspect the current directory structure;
* inspect `package.json`;
* identify the installed versions of React, Vite, Tailwind, shadcn, Base UI, Socket.io, testing libraries, router libraries, and linting tools;
* inspect `src/index.css`;
* inspect existing reusable components;
* inspect existing hooks;
* inspect API utilities;
* inspect Socket.io initialization and listeners;
* inspect routing;
* inspect all affected pages;
* inspect existing tests;
* inspect state transition logic;
* inspect incident assignment and recommendation API calls.

Do not assume that the proposed architecture perfectly matches the existing application.

If the existing implementation reveals a better file boundary or component structure, you may improve the proposed design.

However, explain why before making a significant architectural deviation.

---

# 3. ABSOLUTE GUARDRAILS

These rules are non-negotiable.

## 3.1 Preserve Exact Color Palette and CSS Variables

Do not change, rename, delete, reinterpret, or replace the established application color variables inside:

`services/frontend/src/index.css`

The following values must remain exactly unchanged:

```css
--background: #09090b;
--foreground: #ffffff;
--card: #121214;
--popover: #18181b;
--primary: #ffffff;
--secondary: #27272a;
--muted: #121214;
--accent: #3f3f46;
--destructive: #ef4444;
--warning: #f59e0b;
--success: #14b8a6;
--border: #27272a;
--input: #27272a;
--ring: #3f3f46;
--sidebar: #0f0f12;
```

Preserve the existing primary foreground relationship:

```css
--primary: #ffffff;
--primary-foreground: #27272a;
```

Preserve existing semantic foreground variables such as muted foreground values.

Do not replace these colors with:

* another design system;
* Tailwind default colors;
* hardcoded alternatives;
* gradients that alter the established appearance;
* new theme colors unless absolutely necessary for a missing semantic state.

If a new semantic token is genuinely required, first reuse an existing token whenever possible.

---

# 4. DESIGN SYSTEM AND BASE UI COMPLIANCE

The frontend uses:

* shadcn/ui;
* Base UI (`@base-ui/react`);
* the shadcn `base-nova` style.

All refactored components must respect these conventions.

## 4.1 Base UI Composition

Do not use Radix-style `asChild`.

Wrong:

```jsx
<Button asChild>
  <a href="/example">Example</a>
</Button>
```

Use Base UI composition:

```jsx
<Button render={<a href="/example" />} nativeButton={false}>
  Example
</Button>
```

Whenever `render` causes a button primitive to render as an anchor or another non-button element, explicitly configure the appropriate Base UI native-element behavior.

For anchor replacements:

```jsx
nativeButton={false}
```

---

## 4.2 Select Components

Every `SelectItem` must appear inside a valid `SelectGroup`.

Do not create ungrouped select items.

Use the project's existing shadcn/Base UI implementation rather than importing competing select libraries.

---

## 4.3 Button Icons

Lucide icons inside buttons must use:

```jsx
data-icon="inline-start"
```

or:

```jsx
data-icon="inline-end"
```

depending on placement.

Example:

```jsx
<Button>
  <SendIcon data-icon="inline-start" />
  Dispatch
</Button>
```

---

## 4.4 No Competing Primitive Libraries

Do not introduce:

* Radix primitives;
* Material UI;
* Chakra UI;
* Ant Design;
* Mantine;
* another component framework;

unless the project already explicitly depends on it and removing it would break unrelated code.

Prefer the existing Base UI + shadcn stack.

---

# 5. DOMAIN WORKFLOW MUST REMAIN INTACT

The DERRCS emergency-response workflow is a critical business invariant.

The canonical incident lifecycle is:

```text
Reported
   ↓
Validated
   ↓
Dispatched
   ↓
Active
   ↓
Resolved
   ↓
Closed
```

These stages must remain enforced.

Do not redesign the frontend in a way that bypasses, reorders, or implicitly skips states.

---

## 5.1 Required State Rules

### Report Creation

Every newly submitted citizen report begins as:

```text
Reported
```

---

### Dispatcher Validation

A candidate may transition:

```text
Reported → Validated
```

only through dispatcher validation.

Do not allow dispatch actions to silently perform validation unless the existing backend explicitly defines that behavior.

---

### Dispatch

A validated incident may transition:

```text
Validated → Dispatched
```

through the existing dispatch workflow.

---

### Responder Activation

Maintain the current backend/API rules governing:

```text
Dispatched → Active
```

Do not invent frontend-only workflow transitions.

---

### Casualty Assessment

Responder field casualty assessment is mandatory before:

```text
Active → Resolved
```

Do not remove, bypass, hide, or weaken this requirement.

If the backend currently enforces additional requirements, preserve those as well.

---

### Closure

Resolution review must occur before:

```text
Resolved → Closed
```

according to the existing DERRCS implementation.

Do not merge `Resolved` and `Closed`.

---

# 6. PROTECT DISPATCH AND RECOMMENDATION LOGIC

The existing Modified Hungarian Algorithm workflow is domain-critical.

Do not change:

* recommendation API contracts;
* matrix construction logic;
* matrix padding;
* unit-to-incident matching behavior;
* recommendation refresh timing;
* realtime recommendation events;
* Socket.io event payloads;
* assignment API request structure;
* assignment API response handling;

unless an actual defect is discovered.

If you discover a defect, clearly document:

1. what is wrong;
2. where it occurs;
3. why it is incorrect;
4. the safest correction;
5. whether the change affects backend compatibility.

Frontend architectural cleanup must not alter algorithm semantics.

---

# 7. INITIAL CODEBASE AUDIT

Before implementing anything, inspect the repository and produce a concise architecture assessment.

Identify:

* oversized components;
* duplicated state;
* duplicated API requests;
* repeated `useEffect` logic;
* repeated Socket.io subscriptions;
* missing cleanup functions;
* possible stale closures;
* unnecessary rerenders;
* deeply coupled UI and request logic;
* inconsistent loading states;
* inconsistent empty states;
* inconsistent error handling;
* duplicated form behavior;
* direct DOM manipulation;
* unstable list keys;
* uncontrolled/controlled input inconsistencies;
* accessibility issues;
* improper Base UI patterns;
* dead imports;
* unused state;
* unused helpers;
* repeated utility functions;
* unnecessary prop drilling;
* state that should remain local;
* state incorrectly lifted too high;
* over-engineered abstractions;
* weak component boundaries.

Do not change code simply because it looks different from your preferred style.

Only introduce abstractions when they clearly improve:

* reuse;
* readability;
* correctness;
* separation of concerns;
* testing;
* maintenance.

---

# 8. TARGET ARCHITECTURE

Use the following structure as the preferred target.

You may make minor improvements if the existing codebase suggests a more appropriate organization.

---

# 9. PHASE 1 — FOUNDATION AND SHARED HOOKS

Create or improve reusable hooks under:

```text
services/frontend/src/hooks/
```

---

## 9.1 `useSocketEvent`

Preferred file:

```text
src/hooks/useSocketEvent.js
```

Responsibilities:

* subscribe to a Socket.io event;
* automatically unsubscribe during cleanup;
* prevent duplicated subscriptions;
* prevent listeners from accumulating after rerenders;
* support dynamic handlers safely;
* avoid stale callback references where practical;
* handle missing/disconnected socket instances gracefully.

Preferred usage:

```jsx
useSocketEvent(socket, "incident:updated", handleIncidentUpdated)
```

Do not hide important domain logic inside this generic hook.

It should manage subscription lifecycle, not incident behavior.

---

## 9.2 `useIncidentData`

Preferred file:

```text
src/hooks/useIncidentData.js
```

Responsibilities may include:

* retrieving candidates;
* retrieving incidents;
* controlled polling;
* Socket.io refresh events;
* loading state;
* refresh state;
* fetch error state;
* manual refresh;
* cleanup;
* request deduplication where appropriate.

Avoid overlapping fetch loops.

Prevent this pattern:

```text
polling request
+
socket request
+
component remount request
+
manual refresh request
```

from causing uncontrolled duplicate requests.

Preserve existing refresh behavior if users depend on immediate updates.

Return a clean interface such as:

```js
{
  candidates,
  incidents,
  loading,
  refreshing,
  error,
  refresh,
}
```

Adapt the interface if the existing application requires more information.

---

## 9.3 `useIncidentReview`

Preferred file:

```text
src/hooks/useIncidentReview.js
```

Responsibilities:

* selected candidate;
* selected incident;
* review target;
* opening and closing review views;
* URL query synchronization;
* request cancellation;
* candidate/incident detail retrieval;
* stale-request prevention.

Supported URLs should preserve:

```text
?review=candidate:<id>
```

and:

```text
?review=incident:<id>
```

Use `AbortController` for cancellable requests where supported.

Prevent an older request from replacing the result of a newer selection.

Keep networking logic separate from presentation where practical.

---

## 9.4 `useGeolocation`

Preferred file:

```text
src/hooks/useGeolocation.js
```

Responsibilities:

* browser geolocation retrieval;
* loading state;
* browser support detection;
* permission denial;
* unavailable location;
* timeout state;
* coordinate normalization;
* coordinate formatting;
* retry support.

Example return interface:

```js
{
  coordinates,
  latitude,
  longitude,
  loading,
  error,
  requestLocation,
  clearLocation,
}
```

Do not automatically request GPS permission on every render.

Respect the existing citizen-reporting UX.

---

# 10. SHARED ERROR HANDLING

Create:

```text
src/components/common/ErrorBoundary.jsx
```

Use a proper React error boundary.

Responsibilities:

* isolate render-time failures;
* prevent one component failure from crashing an entire dashboard;
* provide a clear fallback UI;
* optionally provide retry/reset behavior where safe.

Apply error boundaries selectively around:

* map components;
* dashboard panels;
* incident review panels;
* complex sheet/drawer content;
* analytics sections where independent failure isolation makes sense.

Do not wrap every tiny component in its own boundary.

---

# 11. STANDARDIZED LOADING STATES

Use shadcn components consistently.

Preferred primitives:

```text
Skeleton
Spinner
```

Use `Skeleton` for structured content whose layout is known.

Use `Spinner` for short actions such as:

* submitting;
* validating;
* dispatching;
* resolving;
* closing;
* refreshing.

Buttons performing asynchronous operations should:

* prevent accidental double submission;
* indicate the active operation;
* remain accessible;
* retain useful button width where practical.

---

# 12. STANDARDIZED EMPTY STATES

Use the project's shadcn `Empty` components where available:

```text
Empty
EmptyHeader
EmptyTitle
EmptyDescription
EmptyMedia
```

Apply them consistently for states such as:

* no candidates;
* no active incidents;
* no field assessments;
* no citizen reports;
* no completed assignments;
* no analytics data;
* no staff records where applicable.

Do not use large amounts of duplicated handwritten empty-state markup.

---

# 13. SHARED PRESENTATIONAL PATTERNS

During the audit, identify repeated presentation patterns such as:

* status badges;
* priority indicators;
* timestamps;
* incident metadata;
* section headers;
* async buttons;
* error alerts;
* warning banners;
* success banners;
* assignment cards.

Extract them only when they are genuinely shared.

Avoid creating generic components that require dozens of props merely to support unrelated use cases.

Prefer domain-specific reusable components over overly abstract component factories.

---

# 14. PHASE 2 — INCIDENT REVIEW FEATURE

Create or reorganize:

```text
src/features/incident-review/
```

Preferred structure:

```text
incident-review/
├── IncidentReviewSheet.jsx
├── components/
│   ├── ReviewHeader.jsx
│   ├── IntakeSummarySection.jsx
│   ├── ValidationAction.jsx
│   ├── ResourceDispatchForm.jsx
│   ├── IncidentClosureAction.jsx
│   ├── AssignmentHistoryList.jsx
│   ├── FieldAssessmentsList.jsx
│   ├── CitizenReportsList.jsx
│   └── HandoverDebriefSection.jsx
```

Do not force this exact structure if the existing component responsibilities show that two components should remain combined.

The goal is **clear responsibilities**, not maximum file count.

---

## 14.1 `IncidentReviewSheet.jsx`

This should become the feature-level orchestrator.

Responsibilities:

* receive the current review target;
* coordinate detail loading;
* select the correct review sections;
* pass data and callbacks downward;
* coordinate major workflow actions.

It should not contain hundreds of lines of deeply nested presentation markup.

It should not independently implement every request.

---

## 14.2 `ReviewHeader.jsx`

Responsibilities:

* incident/candidate title;
* lifecycle status;
* severity/priority information;
* reporting timestamps;
* relevant identifiers;
* high-level metadata.

Keep it presentational when possible.

---

## 14.3 `IntakeSummarySection.jsx`

Responsibilities:

* AI-generated intake summary;
* confidence/fallback information if currently available;
* fallback banner when AI analysis is unavailable;
* intake classification information.

Do not fabricate an AI summary if none exists.

Clearly distinguish:

* AI-generated information;
* citizen-provided information;
* dispatcher-confirmed information.

---

## 14.4 `ValidationAction.jsx`

Responsibilities:

* dispatcher validation controls;
* validation confirmation;
* validation loading state;
* validation error state.

Only show the action when the workflow allows:

```text
Reported → Validated
```

Do not allow validation UI for already completed stages unless existing UX explicitly supports historical information.

---

## 14.5 `ResourceDispatchForm.jsx`

Responsibilities:

* response unit selection;
* recommended resource presentation;
* recommendation explanation already available from API;
* dispatch notes;
* dispatch action;
* loading/error feedback.

Do not duplicate recommendation computation in the browser.

Consume backend-provided recommendations.

Preserve real-time recommendation behavior.

---

## 14.6 `IncidentClosureAction.jsx`

Responsibilities:

* resolution review;
* final closure actions;
* required closure validation;
* loading and error feedback.

Respect:

```text
Resolved → Closed
```

Do not expose closure when required workflow conditions are unmet.

---

## 14.7 `AssignmentHistoryList.jsx`

Display:

* currently assigned units;
* historical assignments;
* completed response assignments;
* assignment timestamps;
* statuses currently provided by the backend.

Avoid embedding mutation logic directly into list rows unless necessary.

---

## 14.8 `FieldAssessmentsList.jsx`

Display responder assessments such as:

* casualty assessment;
* pre-hospital care;
* patient condition;
* treatment details;
* relevant timestamps.

Preserve terminology used by the backend/domain model.

---

## 14.9 `CitizenReportsList.jsx`

Display citizen intake information including:

* narrative;
* structured questions;
* submitted photos;
* coordinates/location information;
* timestamps;
* relevant reporter metadata already allowed by the application.

Handle broken or missing attachments safely.

Do not expose sensitive information that the existing frontend intentionally hides.

---

## 14.10 `HandoverDebriefSection.jsx`

Responsibilities:

* handover information;
* post-incident summary;
* responder debrief;
* fallback alert if data is unavailable.

Do not invent handover information.

---

# 15. DISPATCHER DASHBOARD REFACTOR

Refactor:

```text
src/pages/DispatcherDashboard.jsx
```

Preferred decomposition:

```text
DispatcherDashboard.jsx

components/
├── DispatcherHeader.jsx
├── CandidateReviewPanel.jsx
├── IncidentStatusPanel.jsx
├── EscalationAlertBanner.jsx
└── AudioAlertManager.jsx
```

These may live under a dedicated dispatcher feature folder if that produces a cleaner architecture.

---

## 15.1 Dispatcher Page Responsibilities

`DispatcherDashboard.jsx` should primarily:

* compose major sections;
* coordinate high-level dashboard state;
* consume shared incident hooks;
* coordinate selected review target;
* handle major layout decisions.

Move domain-specific presentation into components.

Move reusable side-effect logic into hooks.

---

## 15.2 `AudioAlertManager`

Isolate alert-sound behavior.

Ensure:

* audio does not trigger repeatedly due to rerenders;
* browser autoplay restrictions are handled;
* duplicate socket listeners are prevented;
* cleanup occurs correctly;
* alert state is deterministic.

Do not alter the existing alert semantics without identifying a defect.

---

# 16. PHASE 3 — CITIZEN REPORTING

Refactor:

```text
src/pages/CitizenReport.jsx
```

The multi-step reporting experience must remain simple and reliable.

Standardize compatible UI using:

* `Progress`;
* `ToggleGroup`;
* `Select`;
* `FieldGroup`;
* existing form components;
* `TagoloanMap`.

---

## 16.1 Step Management

Avoid scattered boolean variables such as:

```js
isStepOne
isStepTwo
showNextSection
```

Prefer a clear step model, for example:

```js
const [step, setStep] = useState(1)
```

or another model appropriate to the existing workflow.

Centralize:

* step progression;
* back navigation;
* validation requirements;
* completion rules.

Do not allow users to proceed if required information for the current step is missing.

---

## 16.2 Form State

Keep form state understandable.

Do not automatically introduce a major form library unless the project already uses one or there is a strong technical reason.

Avoid having the same value represented in multiple state variables.

Derive state instead of duplicating it when possible.

---

## 16.3 Location Selection

Integrate:

```text
TagoloanMap
```

and `useGeolocation`.

Support:

* GPS location when permitted;
* map selection;
* manual fallback if already supported;
* coordinate validation;
* coordinate attachment to submission.

Do not silently submit invalid coordinates.

---

## 16.4 Submission Safety

Prevent duplicate reports caused by repeated submit clicks.

Submission UI must have clear:

* pending state;
* success state;
* recoverable error state.

Preserve the existing backend request contract.

---

# 17. RESPONDER PORTAL REFACTOR

Refactor:

```text
src/pages/ResponderPortal.jsx
```

Preferred components:

```text
ActiveDispatchCard.jsx
ResponderActionButtons.jsx
FieldAssessmentDrawer.jsx
CasualtyAssessmentForm.jsx
ChecklistGroup.jsx
```

---

## 17.1 `ActiveDispatchCard`

Display:

* assigned incident;
* location;
* emergency classification;
* dispatch details;
* status;
* relevant timestamps;
* current assignment information.

Do not duplicate action logic inside this display component unnecessarily.

---

## 17.2 `ResponderActionButtons`

Centralize workflow actions.

Actions should only appear when valid for the current incident/assignment state.

Prevent invalid transitions.

Do not rely solely on disabled buttons if the request handler itself can still trigger an invalid transition.

---

## 17.3 `FieldAssessmentDrawer`

Handle assessment workflow separately from the main portal layout.

Responsibilities:

* drawer state;
* assessment content;
* submission state;
* error feedback;
* successful completion.

Do not discard unsaved data accidentally when asynchronous updates occur.

---

## 17.4 `CasualtyAssessmentForm`

The casualty assessment must remain mandatory before resolving an active incident when required by the domain workflow.

Validation must enforce all currently required fields.

Do not weaken backend validation.

Frontend validation should complement backend validation, not replace it.

---

## 17.5 `ChecklistGroup`

Extract repeated checklist structures.

Keep the API simple and domain-focused.

Avoid a generic schema engine unless the current application actually needs one.

---

# 18. ADMIN AREA REFACTOR

Review and improve:

```text
AdminDashboard.jsx
StaffView.jsx
AnalyticsView.jsx
```

Do not restructure these files merely for visual consistency.

Focus on:

* clear view composition;
* staff management separation;
* analytics separation;
* reusable admin layout;
* loading/error/empty states;
* testability.

---

## 18.1 Staff Management

Preserve:

* staff creation;
* staff activation/deactivation;
* role handling;
* validation;
* backend API semantics.

Ensure destructive actions use appropriate confirmation if the existing system expects confirmation.

---

## 18.2 Analytics

Keep analytics rendering separate from unrelated staff-management state.

Avoid triggering unnecessary analytics refetches when switching unrelated UI controls.

If charting components already exist, reuse them.

Do not replace chart libraries unless a concrete problem requires it.

---

# 19. STATE MANAGEMENT GUIDELINES

Do not automatically introduce:

* Redux;
* Zustand;
* MobX;
* Jotai;
* XState;
* another global store.

First determine whether React state, hooks, context, URL state, and existing architecture are sufficient.

Use global state only if actual cross-feature state requirements justify it.

Prefer:

### Local state

For:

* drawer visibility;
* temporary form fields;
* UI toggles;
* component-specific selections.

### URL state

For:

* review targets;
* navigable filters;
* state that should survive refresh or be shareable.

### Hooks

For:

* reusable data behavior;
* browser capabilities;
* sockets;
* polling;
* request lifecycle.

### Context

Only for truly cross-cutting state that would otherwise create excessive prop drilling.

---

# 20. SIDE-EFFECT RULES

Audit all `useEffect` calls.

For each effect determine whether it is actually required.

Avoid using effects to calculate values that can be derived during render.

Example of unnecessary state/effect:

```jsx
const [fullName, setFullName] = useState("")

useEffect(() => {
  setFullName(`${firstName} ${lastName}`)
}, [firstName, lastName])
```

Prefer:

```jsx
const fullName = `${firstName} ${lastName}`
```

For required effects:

* include correct dependencies;
* include cleanup;
* avoid infinite loops;
* avoid stale state;
* avoid duplicate requests;
* avoid duplicate socket subscriptions.

---

# 21. ASYNC REQUEST SAFETY

Review asynchronous operations for race conditions.

Where appropriate:

* use `AbortController`;
* ignore stale responses;
* prevent state updates after unmount;
* prevent duplicate form submissions;
* prevent overlapping refreshes;
* preserve newest-request-wins behavior.

Do not introduce complicated cancellation abstractions where simple cleanup is sufficient.

---

# 22. PERFORMANCE REVIEW

Review obvious performance issues, but do not perform premature optimization.

Check for:

* unnecessarily repeated API calls;
* duplicated Socket.io listeners;
* expensive transformations on every render;
* large lists without stable keys;
* unnecessary context rerenders;
* recreation of heavy objects;
* oversized page components;
* redundant state.

Use:

* `useMemo`;
* `useCallback`;
* `memo`;

only where they provide meaningful value.

Do not wrap every function in `useCallback`.

---

# 23. ACCESSIBILITY REVIEW

Preserve or improve accessibility.

Check:

* button labels;
* icon-only button accessible names;
* form labels;
* validation messages;
* dialog titles;
* sheet titles;
* drawer titles;
* keyboard navigation;
* focus management;
* semantic headings;
* aria attributes;
* contrast using the existing fixed palette.

Do not alter the required color palette to solve accessibility unless explicitly authorized.

Instead improve structure, text, borders, icons, focus states, and semantic information.

---

# 24. TESTING REQUIREMENTS

All existing tests must continue to pass.

Run the project's actual test command after verifying it from `package.json`.

Expected command may include:

```bash
npm run test
```

or:

```bash
npx vitest run
```

Do not assume the package manager. Detect whether the project uses:

* npm;
* pnpm;
* yarn;
* bun.

Use the repository's existing lockfile.

---

# 25. EXISTING TEST FIXES

Fix React Testing Library `act(...)` warnings in:

```text
IncidentReviewSheet.test.jsx
```

Do not silence warnings by:

* mocking `console.error`;
* globally suppressing React warnings;
* adding arbitrary delays.

Find the actual asynchronous state update responsible for the warning.

Use the appropriate testing pattern:

* `await user.click(...)`;
* `findBy...`;
* `waitFor(...)`;
* awaited async operations;
* correct fake timer handling when applicable.

---

# 26. NEW TEST COVERAGE

Add or improve tests for:

```text
src/pages/CitizenReport.test.jsx
src/pages/ResponderPortal.test.jsx
src/pages/AdminDashboard.test.jsx
```

Adapt paths if tests follow a different established repository convention.

---

## 26.1 CitizenReport Tests

Test at minimum:

### Initial rendering

Verify the first reporting step renders correctly.

### Validation

Verify users cannot proceed when required fields are missing.

### Multi-step progression

Verify valid input advances through reporting steps.

### Back navigation

Verify state persists where expected.

### Location

Verify:

* coordinates can be attached;
* browser geolocation success;
* permission denial fallback;
* selected coordinates are included in submission.

### Submission

Verify:

* correct API payload;
* pending state;
* prevention of duplicate submissions;
* success flow;
* error flow.

---

## 26.2 ResponderPortal Tests

Test at minimum:

* assigned dispatch rendering;
* valid status transitions;
* prevention of invalid actions;
* field assessment drawer;
* casualty assessment validation;
* casualty assessment submission;
* mandatory assessment before resolution;
* API failure handling;
* loading state;
* empty/no-active-assignment state.

---

## 26.3 AdminDashboard Tests

Test at minimum:

* admin subview navigation;
* staff listing;
* staff creation;
* validation errors;
* successful staff creation;
* staff deactivation;
* API error states;
* loading states;
* analytics subview rendering.

---

# 27. PHASE 4 — QUALITY VERIFICATION

After implementation, run the relevant project verification commands.

Determine exact scripts from `package.json`.

At minimum verify:

```bash
vitest run
```

if Vitest is configured.

Verify linting using the repository's configured oxlint command.

Possible example:

```bash
npm run lint
```

or:

```bash
npx oxlint .
```

Use the actual project configuration rather than assuming.

Verify production build:

```bash
npm run build
```

or its package-manager equivalent.

---

# 28. VERIFY AFTER EACH PHASE

Do not make the entire refactor and test only at the end.

After each major phase:

1. run relevant targeted tests;
2. run lint checks on affected files if available;
3. run the application build when reasonable;
4. inspect for import errors;
5. confirm no broken routes;
6. confirm no state-machine regression.

If a phase introduces a failure, fix it before progressing unless the failure existed beforehand.

If a failure already existed before your changes, explicitly report it.

---

# 29. EXPECTED IMPLEMENTATION PHASES

Execute the work in this order.

---

## Phase 1 — Foundation and Shared Hooks

Tasks:

1. audit frontend architecture;
2. audit Base UI/shadcn compliance;
3. inspect CSS/theme invariants;
4. implement or improve `useSocketEvent`;
5. implement or improve `useIncidentData`;
6. implement or improve `useIncidentReview`;
7. implement or improve `useGeolocation`;
8. implement `ErrorBoundary`;
9. standardize loading components;
10. standardize empty states;
11. identify safe reusable presentation components;
12. test the changes.

---

## Phase 2 — Incident Review and Dispatcher Dashboard

Tasks:

1. decompose `IncidentReviewSheet`;
2. move presentation into domain-specific components;
3. preserve all dispatcher actions;
4. preserve recommendation APIs;
5. preserve Modified Hungarian Algorithm interactions;
6. refactor `DispatcherDashboard`;
7. isolate audio alerts;
8. remove duplicate fetching/listeners;
9. improve review URL synchronization;
10. add/update tests;
11. verify lifecycle transitions.

---

## Phase 3 — Citizen, Responder, and Admin Features

Tasks:

1. refactor `CitizenReport`;
2. normalize multi-step progression;
3. integrate location hook cleanly;
4. refactor `ResponderPortal`;
5. isolate assessment workflow;
6. enforce casualty assessment requirement;
7. refactor admin views where beneficial;
8. improve `StaffView`;
9. improve `AnalyticsView`;
10. standardize async/error/empty states;
11. add tests.

---

## Phase 4 — Test Expansion and Final Verification

Tasks:

1. fix all relevant `act(...)` warnings;
2. expand CitizenReport tests;
3. expand ResponderPortal tests;
4. expand AdminDashboard tests;
5. run complete test suite;
6. run oxlint;
7. run production build;
8. inspect unresolved warnings;
9. check for unused files/imports;
10. review Base UI compliance;
11. verify the incident lifecycle;
12. verify dispatch recommendation behavior;
13. prepare the final refactor summary.

---

# 30. FILE STRUCTURE REVIEW

After inspecting the project, provide the proposed post-refactor structure.

Example only:

```text
src/
├── components/
│   ├── common/
│   │   ├── ErrorBoundary.jsx
│   │   └── ...
│   └── ui/
├── features/
│   ├── incident-review/
│   │   ├── IncidentReviewSheet.jsx
│   │   └── components/
│   │       ├── ReviewHeader.jsx
│   │       ├── IntakeSummarySection.jsx
│   │       ├── ValidationAction.jsx
│   │       ├── ResourceDispatchForm.jsx
│   │       ├── IncidentClosureAction.jsx
│   │       ├── AssignmentHistoryList.jsx
│   │       ├── FieldAssessmentsList.jsx
│   │       ├── CitizenReportsList.jsx
│   │       └── HandoverDebriefSection.jsx
│   │
│   ├── dispatcher/
│   │   └── components/
│   │       ├── DispatcherHeader.jsx
│   │       ├── CandidateReviewPanel.jsx
│   │       ├── IncidentStatusPanel.jsx
│   │       ├── EscalationAlertBanner.jsx
│   │       └── AudioAlertManager.jsx
│   │
│   └── responder/
│       └── components/
│           ├── ActiveDispatchCard.jsx
│           ├── ResponderActionButtons.jsx
│           ├── FieldAssessmentDrawer.jsx
│           ├── CasualtyAssessmentForm.jsx
│           └── ChecklistGroup.jsx
│
├── hooks/
│   ├── useGeolocation.js
│   ├── useIncidentData.js
│   ├── useIncidentReview.js
│   └── useSocketEvent.js
│
└── pages/
    ├── AdminDashboard.jsx
    ├── CitizenReport.jsx
    ├── DispatcherDashboard.jsx
    └── ResponderPortal.jsx
```

Do not blindly create this structure if equivalent components already exist elsewhere.

Reuse the current project structure when it is already sound.

---

# 31. DESIGN PATTERN REVIEW

You are explicitly authorized to improve design patterns when they create real architectural problems.

You may modify:

* component boundaries;
* hook boundaries;
* API utility organization;
* feature folder organization;
* naming;
* reusable async patterns;
* layout structure;
* state ownership;
* event listener architecture;
* URL-state handling.

However:

Do not introduce a design pattern simply because it is academically cleaner.

Avoid unnecessary implementation of:

* repository pattern;
* service factories;
* dependency injection containers;
* command buses;
* event buses;
* reducers for trivial state;
* global state managers;
* generic form engines;
* generic CRUD frameworks.

Prefer the simplest design that cleanly supports the DERRCS requirements.

---

# 32. WHEN YOU FIND EXISTING PROBLEMS

If you identify a problem not mentioned in this prompt, you may fix it when the fix is:

* directly related to the affected frontend architecture;
* low-risk;
* verifiably correct;
* unlikely to change intended product behavior.

Examples:

* memory leak;
* missing effect cleanup;
* stale request race condition;
* duplicate Socket.io listener;
* broken accessibility label;
* invalid React key;
* incorrect Base UI composition;
* dead state;
* unreachable code;
* duplicated API request;
* obvious form-state bug;
* incorrect loading-state reset.

For larger behavioral changes, first explain the issue and its implications before modifying it.

---

# 33. DO NOT MAKE UNRELATED CHANGES

Avoid:

* unrelated backend refactors;
* database schema changes;
* API redesigns;
* renaming backend fields;
* changing authentication behavior;
* rewriting the application from scratch;
* replacing the router;
* replacing Tailwind;
* replacing shadcn;
* replacing Base UI;
* introducing TypeScript across the entire frontend unless explicitly requested;
* broad cosmetic redesign;
* changing established terminology;
* modifying algorithm logic unnecessarily.

Keep the refactor scoped.

---

# 34. CODE QUALITY EXPECTATIONS

New code should:

* use clear names;
* keep functions reasonably small;
* avoid unnecessary comments;
* avoid magic values;
* avoid deeply nested conditionals;
* use early returns where clearer;
* avoid duplicate business rules;
* maintain predictable data flow;
* maintain stable component responsibilities;
* reuse existing helpers where appropriate.

Do not convert readable code into overly clever abstractions.

---

# 35. COMMENTING POLICY

Comments should explain:

* unusual domain constraints;
* non-obvious race-condition protection;
* unusual Base UI behavior;
* algorithm-preservation requirements;
* unusual browser limitations.

Do not write comments that simply restate the code.

Bad:

```js
// Set loading to true
setLoading(true)
```

Useful:

```js
// Ignore stale review responses so rapid candidate switching
// cannot replace the latest selected incident.
```

---

# 36. OUTPUT FORMAT BEFORE IMPLEMENTATION

Before making code changes, provide a concise audit containing:

## A. Current Architecture Findings

List the most important problems found in the current frontend.

For each issue provide:

```text
File:
Problem:
Impact:
Recommended change:
Risk:
```

Risk must be one of:

```text
Low
Medium
High
```

---

## B. Proposed Refactor Structure

Show the proposed file tree for affected files.

---

## C. Behavioral Invariants

Explicitly identify behavior that must remain unchanged, including:

* colors;
* workflow stages;
* casualty assessment requirement;
* API contracts;
* Modified Hungarian Algorithm flow;
* Socket.io events;
* routing;
* authentication/authorization behavior;
* existing user-facing functionality.

---

## D. Execution Plan

Show the implementation sequence.

Do not merely repeat this prompt.

Adapt the plan to the actual code discovered.

---

# 37. OUTPUT FORMAT DURING IMPLEMENTATION

For each meaningful refactoring step report:

### Step

What you are changing.

### Files

Files added, modified, moved, or deleted.

### Reason

What architectural problem the change solves.

### Behavior preserved

State what behavior remains unchanged.

### Verification

Show the relevant test/lint/build command and result.

Do not paste entire files unless necessary.

Prefer concise diffs or summaries of meaningful modifications when the environment already applies the edits directly.

---

# 38. FINAL VERIFICATION CHECKLIST

Before declaring the refactor complete, verify all applicable items.

## Architecture

* [ ] Major monolithic components have been reduced where appropriate.
* [ ] Reusable side effects have been moved into hooks.
* [ ] API and presentation responsibilities have clearer boundaries.
* [ ] No unnecessary global state library was introduced.
* [ ] No unnecessary dependencies were introduced.

## Design System

* [ ] Existing CSS variables remain unchanged.
* [ ] Existing dark color palette remains unchanged.
* [ ] Base UI `render` patterns are used correctly.
* [ ] No Radix `asChild` usage was introduced.
* [ ] Anchor-rendered buttons correctly handle `nativeButton={false}`.
* [ ] `SelectItem` usage follows grouping requirements.
* [ ] Lucide button icons contain the appropriate `data-icon` attribute.

## Domain Workflow

* [ ] New reports begin as `Reported`.
* [ ] Validation follows `Reported → Validated`.
* [ ] Dispatch follows the expected validated workflow.
* [ ] Active incidents cannot resolve improperly.
* [ ] Mandatory casualty assessment remains enforced.
* [ ] `Resolved → Closed` remains separate.
* [ ] No lifecycle stage is bypassed.

## Dispatch Algorithm

* [ ] Modified Hungarian Algorithm interactions remain unchanged.
* [ ] Matrix padding behavior remains unchanged.
* [ ] Recommendation API payloads remain compatible.
* [ ] Recommendation response handling remains compatible.
* [ ] Real-time recommendation behavior remains functional.

## Data and Events

* [ ] No duplicate polling loops remain.
* [ ] Socket listeners clean themselves up.
* [ ] Duplicate listeners do not accumulate.
* [ ] Stale requests cannot overwrite current review state.
* [ ] Async actions handle failure correctly.

## UX

* [ ] Loading states are consistent.
* [ ] Empty states are consistent.
* [ ] Error states are recoverable where possible.
* [ ] Async buttons prevent accidental duplicate submissions.
* [ ] Existing visual identity remains intact.

## Accessibility

* [ ] Inputs have labels.
* [ ] Icon-only buttons have accessible names.
* [ ] Dialog/sheet/drawer headings are properly associated.
* [ ] Keyboard interactions still function.
* [ ] Focus behavior remains usable.

## Testing

* [ ] Existing tests pass.
* [ ] `act(...)` warnings related to affected tests are resolved.
* [ ] CitizenReport tests cover key workflows.
* [ ] ResponderPortal tests cover key workflows.
* [ ] AdminDashboard tests cover key workflows.
* [ ] Lint passes.
* [ ] Production build passes.

---

# 39. FINAL REPORT FORMAT

At completion, provide:

## 1. Refactor Summary

Briefly explain what changed.

## 2. Architecture Improvements

Describe major architectural improvements.

## 3. Files Added

List newly created files.

## 4. Files Modified

List significant modified files.

## 5. Files Removed

List deleted files, if any, and why.

## 6. Domain Safety Verification

Confirm how the six-stage lifecycle was preserved.

## 7. Algorithm Safety Verification

Confirm that Modified Hungarian Algorithm API interactions and recommendation behavior were preserved.

## 8. Design System Verification

Confirm Base UI compliance and unchanged CSS color variables.

## 9. Test Results

Report exact commands and results.

Example:

```text
Tests: 74 passed, 0 failed
Lint: passed
Build: passed
```

Use the actual numbers.

Never invent test results.

## 10. Remaining Issues

List:

* unresolved warnings;
* technical debt;
* existing unrelated failures;
* areas intentionally left unchanged.

If none remain, explicitly state that no known issues remain within the refactor scope.

---

# 40. EXECUTION RULE

Do not stop after generating a theoretical plan.

After completing the codebase audit:

1. produce the adapted refactoring plan;
2. begin implementing Phase 1;
3. verify Phase 1;
4. continue through the remaining phases;
5. fix regressions caused by the refactor immediately;
6. perform final tests, linting, and build verification;
7. provide the final report.

Do not ask for confirmation between ordinary refactoring steps.

Use your technical judgment to make low-risk improvements that clearly support the stated goals.

If a proposed change presents substantial risk to domain behavior or API compatibility, preserve the existing implementation unless there is clear evidence that it is incorrect.

---

# 41. PRIORITY ORDER

When two goals conflict, follow this priority:

```text
1. Correctness and emergency workflow safety
2. Backend/API compatibility
3. Existing user-facing behavior
4. Data integrity
5. Test reliability
6. Base UI/shadcn compliance
7. Maintainability
8. Accessibility
9. Performance
10. Code elegance
```

Never sacrifice workflow correctness for cleaner-looking code.

---

# 42. DEFINITION OF DONE

The refactor is complete only when:

* the project builds successfully;
* relevant tests pass;
* affected `act(...)` warnings are resolved;
* lint checks pass or all remaining pre-existing failures are documented;
* frontend workflow behavior remains intact;
* the six-stage lifecycle remains enforced;
* casualty assessment remains mandatory;
* dispatch recommendation behavior remains unchanged;
* existing CSS variables remain untouched;
* Base UI conventions are followed;
* major page components have clearer responsibilities;
* repeated socket/fetch logic has been reduced;
* loading/error/empty states are consistent;
* no unnecessary framework or dependency has been introduced;
* all significant modifications are documented in the final report.

If any of these cannot be verified, state exactly what could not be verified and why.

Never claim success without actually running the corresponding verification command.

