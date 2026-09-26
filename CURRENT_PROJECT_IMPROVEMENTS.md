# Current Project Improvements

This tracker lists verified gaps and planned improvements for the citizen-report,
clustering, dispatcher, responder, administrator, and map workflows. It is an
initial tracker, not a full-system audit.

## Current Gaps

### LIM-001 — Split incorrectly grouped reports

**Status:** Open

**Current behavior:** Two nearby reports of the same emergency type can be
grouped into one candidate, even when they describe separate emergencies.

**Impact:** The dispatcher cannot separate the reports into individual
incidents using the current dashboard or API.

**Recommended improvement:** Add a dispatcher action to split a candidate,
reassign selected reports, and create linked incidents starting at `Reported`.
This must not bypass the incident lifecycle.

---

### LIM-002 — Show individual report locations in a cluster

**Status:** Open

**Current behavior:** The dashboard map shows one candidate marker at the
cluster's center point. Zooming in does not reveal the locations of linked
reports.

**Impact:** The dispatcher has less spatial information when deciding whether
a candidate represents one emergency or multiple nearby emergencies.

**Recommended improvement:** Show the linked report markers when a candidate
is selected. For reports at the exact same location, use an offset or a
spiderfy/list interaction so every report can be reviewed. Let a Dispatcher or
Admin select an individual report from the cluster review; the map should then
automatically pan to that report's emergency location, zoom in to a useful
street-level view, and visually highlight the selected report marker.

---

### LIM-004 — Make the clustering worker easier to operate

**Status:** Open

**Current behavior:** Clustering depends on the separate Python worker at
`services/algorithms/src/worker.py`. If it is not running, reports are stored
but do not appear as candidates.

**Impact:** The dashboard has no candidate to validate, dispatch, or activate.

**Recommended improvement:** Run the algorithm worker as a managed service or
add a visible health check that warns operators when it is offline.

---

### LIM-005 — Show validated incidents waiting for a unit

**Status:** Open

**Current behavior:** The allocation worker may recommend a unit, but the
dispatcher must manually select an available unit and confirm dispatch.

**Impact:** There is no visible queue or availability notification for a
validated incident waiting for a response unit.

**Recommended improvement:** Keep dispatcher confirmation as required, but
add a waiting queue and unit-availability notifications.

## Improvements Backlog

### IMP-001 — Focus the Field Casualty Assessment

**Priority:** High

**Current behavior:** The responder map remains prominent while the responder
is completing the Field Casualty Assessment.

**Why this matters:** After arrival on scene, the assessment is the task that
resolves the incident. The map is secondary information and can take attention
and screen space away from the form, especially on a small field device.

**Recommended improvement:** Open the assessment in a focused full-screen
view. Hide the map or place it behind a clearly labelled **View location**
action. Keep the form single-column with large touch targets.

---

### IMP-002 — Add summaries to the Admin dashboard

**Priority:** Medium

**Current behavior:** The Admin dashboard shows report counts, trends,
activity logs, and incident monitoring, but does not show a readable intake or
handover summary for an incident.

**Recommended improvement:** Add an incident-detail view with the available AI
summary, report count, status, field-assessment outcome, and a link to its
audit activity.

---

### IMP-003 — Export administrative records

**Priority:** Medium

**Current behavior:** There is no export endpoint or dashboard control for
reports, incidents, analytics, or audit activity.

**Impact:** Administrators cannot create a shareable CSV or PDF record.

**Recommended improvement:** Add role-protected exports with a chosen date
range and clear scope. Start with CSV exports for incidents and audit logs.
Add a printable/PDF incident summary only after deciding which personal or
medical information may be included.

---

### IMP-004 — Archive completed cases separately from live incidents

**Priority:** High

**Current behavior:** The system correctly transitions incidents through
`Active → Resolved → Closed`, but resolved and closed cases remain visible on
the live dispatcher map. There is no archive or history section.

**Recommended improvement:** Keep the existing lifecycle unchanged. After an
incident is closed, remove it from the default live map and Incident Status
panel. Provide an Archive view with date, status, search, and read-only case
details. When an Admin or Dispatcher selects an archived case, show its
location on the map in a distinct archive color so it cannot be confused with
a live emergency.

---

### IMP-005 — Allow manual dispatch for an individual emergency report

**Priority:** High

**Current behavior:** With `DBSCAN_MIN_POINTS=2`, a single uncorroborated
report stays at `Received` and cannot enter the incident lifecycle, even when
it may be urgent.

**Recommended improvement:** Keep DBSCAN for corroborated reports, but add a
dispatcher-reviewed **Create Incident** action for a single report. After the
dispatcher validates that incident, the dispatcher must be able to manually
select and dispatch an available response unit. The incident must still follow
the existing lifecycle:
`Reported → Validated → Dispatched → Active → Resolved → Closed`.

---

### IMP-006 — Support multiple units from any department at one incident

**Priority:** High

**Current behavior:** The current workflow allows only one response unit for
an incident. After the first assignment, the incident changes from `Validated`
to `Dispatched`, and the assignment route rejects another unit. This applies
to units from the same department and units from different departments.

**Why this matters:** A large fire or complex emergency may need multiple fire
trucks, ambulances, rescue teams, or a combination of departments at the same
location.

**Recommended improvement:** Allow the dispatcher to add one or more available
units to the same validated, dispatched, or active incident, including units
from the same department and different departments. Each unit needs its own
assignment, arrival status, and completion record. The first assignment moves
the incident to `Dispatched`; later assignments must add resources without
repeating or bypassing the incident lifecycle. The incident must not resolve
until required field-assessment requirements are satisfied.

---

### IMP-007 — Dispatch separate units to individual reports in a cluster

**Priority:** High

**Current behavior:** Reports grouped into one cluster share one candidate and
one incident location. The dispatcher cannot currently turn selected reports
in that cluster into separate dispatch targets.

**Why this matters:** A cluster can contain multiple separate emergencies near
each other. Each emergency may need a different response unit and must send
that unit to its own exact report location.

**Recommended improvement:** After reviewing a cluster, let the Dispatcher
create separate incidents from selected individual reports. The dispatcher can
then manually assign a response unit to each separate incident. The responder
portal must display the assigned individual report's emergency location—not
the cluster centroid or another report's location—and each incident must keep
its own lifecycle and field assessment.

---

### IMP-008 — Add filters to the clustering review

**Priority:** Medium

**Current behavior:** The clustering review presents linked citizen reports as
one unfiltered list.

**Impact:** When a cluster contains many reports, a dispatcher may take too
long to find reports relevant to location, time, severity, or the situation
being assessed.

**Recommended improvement:** Add cluster-review filters for submission time,
emergency type, location/distance from the cluster center, and reports with
photos or structured answers. Show the number of matching reports and keep the
selected report highlighted on the map when filters change.

---

### IMP-009 — Preserve the user's map view after the first load

**Priority:** Medium

**Current behavior:** The map repeatedly calls `fitBounds` immediately and
again after short delays. This can reset a Dispatcher's or Admin's manual zoom
and map position while reviewing reports. Development-mode remounts can make
the reset more noticeable.

**Impact:** The map moves away from the location a user is examining, making
cluster and incident review frustrating.

**Recommended improvement:** Fit the map to Tagoloan only once when the map
first loads. Afterwards, preserve the user's zoom and position when pins are
refreshed, reports are selected, or the map layout recalculates. Recenter or
zoom only after an explicit user action, such as selecting a report or pressing
a **Fit to Tagoloan** control.

---

### IMP-010 — Require details when a structured answer is **Other**

**Priority:** Medium

**Current behavior:** The citizen form requires a general short description
for every report. Some operational questions also offer **Other**, but choosing
that answer does not require a specific explanation.

**Why this matters:** The general description may not explain what **Other**
means for the selected question—for example, an unlisted type of structure
burning or an unlisted rescue type.

**Recommended improvement:** When a citizen selects **Other** for a structured
question, reveal a clearly labelled **Please specify** field and require an
answer before continuing. Keep the existing general short description; this
new field adds detail rather than replacing it.

---

### IMP-011 — Capture multiple emergency needs in one citizen submission

**Priority:** Medium

**Current behavior:** A citizen report has one `emergency_type`. This is
intentional because clustering only groups reports with the same primary type.

**Why this matters:** One event can involve multiple needs, such as a road
accident with injuries, or a fire with people requiring rescue.

**Recommended improvement:** Keep one required **primary emergency type** for
clustering. Add optional multi-select **additional emergency needs** such as
Medical or Rescue, stored separately from the primary type. Show these needs
to the Dispatcher so they can add the appropriate units or create separate
incidents when the situation represents separate emergencies. Do not store
multiple values in `emergency_type`, because that would break the current
same-type clustering rule.

---

### IMP-012 — Allow a minimal field assessment when no casualty details exist

**Priority:** Medium

**Current behavior:** A responder must choose a disposition before submitting
the Field Casualty Assessment. The other fields are optional, but there is no
clear option for an incident with no casualty, no patient information, or no
assessment details available.

**Why this matters:** A responder may need to document and resolve a fire,
flood, or false alarm even when there is no patient to assess.

**Recommended improvement:** Keep the required field-assessment record and
the required disposition so the lifecycle is not bypassed. Add clear options
such as **No casualty identified**, **No patient found**, or **Unable to
assess**, plus an optional note. This lets the responder submit a valid minimal
report without inventing patient details.

---

### IMP-013 — Prevent accidental blank field-assessment submissions

**Priority:** High

**Current behavior:** The system only requires a disposition to submit and
resolve an assessment. All patient, injury, intervention, destination, and
note fields can be blank. This means an incident can be resolved with only a
disposition such as `TreatedOnScene`, even when no other assessment details
were entered.

**Why this matters:** A responder may select a disposition unintentionally or
assume that an otherwise empty form is not ready to submit. The incident then
resolves and the response unit becomes available, leaving an incomplete record.

**Recommended improvement:** Before resolving, require either: (1) meaningful
assessment details, or (2) an explicit no-casualty outcome such as **No
casualty identified**, **No patient found**, or **Unable to assess**. Show a
clear confirmation that the incident will be resolved and the unit made
available. Keep the field-assessment record required by the lifecycle.

---

### IMP-014 — Keep responder status actions fully visible and separate

**Priority:** High

**Current behavior:** At wider screen sizes, **Mark En Route** and **Arrived
on Scene** switch from a vertical layout to one horizontal row. The breakpoint
uses the browser width, not the width of the dispatch card, so the arrival
button can be squeezed, partly visible, or appear beside the En Route button
when the card is narrow.

**Why this matters:** **Arrived on Scene** is a critical responder action. It
must be fully visible and easy to tap without confusion or accidental action.

**Recommended improvement:** Keep these actions vertically stacked by default,
or change to a horizontal layout only when the dispatch card itself has enough
space. Ensure both buttons remain fully visible, have large touch targets, and
retain clear spacing on every screen size.

---

### IMP-015 — Support multiple casualty assessments for one incident

**Priority:** High

**Current behavior:** The responder field-assessment form captures one
casualty record and resolves the incident immediately after it is submitted.
There is no way to add several patient forms, review them together, and submit
all completed assessments at once.

**Why this matters:** One incident can involve multiple patients. Responders
need to document each patient separately without resolving the incident after
the first entry or losing the forms already entered.

**Recommended improvement:** Let the responder add multiple casualty forms as
draft entries, label them clearly (for example, **Patient 1**, **Patient 2**),
review, edit, or remove each entry, and submit the full set in one action. The
server must save every assessment in one transaction. Only after at least one
valid assessment—or an explicit no-casualty outcome—is saved may the incident
transition from `Active` to `Resolved` and the unit become available.

## Intended Controls

- A responder, rather than a dispatcher, changes an assigned incident from
  `Dispatched` to `Active` by marking arrival on scene.
- A Fire report cannot join a Flood candidate because clustering filters by
  emergency type.
- A response unit becomes available only after submitting the required field
  assessment and transitioning the incident from `Active` to `Resolved`.

## Tracking Rules

- Keep an item **Open** until it is implemented and tested.
- Record affected files, test evidence, and the decision when an item changes.
- Do not remove the documented six-stage incident lifecycle or the Modified
  Hungarian Algorithm's dummy-matrix padding while resolving items.
