# Current Project Improvements

This tracker lists verified bugs, current gaps, and planned improvements for the
citizen-report, clustering, dispatcher, responder, administrator, and map
workflows. It is an initial tracker, not a full-system audit.

Current behavior was checked against the working-tree source on **2026-09-26**.
Recommendations describe future work, not completed features. Decisions marked
below must be resolved before their related implementation. Exact visual
symptoms still require browser verification where noted.

## Known Bugs

### BUG-001 — Correct trapped-person claims in fallback summaries

**Status:** Open

**Priority:** High

**Verified current behavior:** The citizen form sends `peopleTrapped` as
`"Yes"`, `"No"`, or `"Unknown"`. The fallback summarizer checks Python
truthiness, so both `"No"` and `"Unknown"` incorrectly produce “Citizen reports
indicate people may be trapped.” It also checks only the first report's answer.

**Impact:** The dispatcher can receive misleading hazard information when
fallback summarization runs, including omission of a later affirmative report.

**Recommended correction:** Normalize answers explicitly, including existing
boolean values. Distinguish affirmative, negative, unknown, and missing answers;
consider the linked reports without implying that conflicting reports agree.

**Acceptance criteria:**

- `"Yes"` or `true` contributes an affirmative reported hazard.
- `"No"` or `false` does not contribute an affirmative hazard.
- `"Unknown"`, missing, or null answers retain uncertainty and do not establish
  either an affirmative hazard or confirmed absence.
- A later affirmative report remains visible when the first answer is negative;
  contradictory answers remain identifiable as conflicting reports.

**Evidence:** [Citizen question values](services/frontend/src/pages/CitizenReport.jsx)
and `generate_template_summary()` in
[summarizer.py](services/algorithms/src/summarizer.py). The string-truthiness
failure was reproduced by executing the fallback function in isolation.

---

### BUG-002 — Prevent candidate and incident destination drift

**Status:** Open

**Priority:** High

**Verified current behavior:** Attaching a report updates the candidate's
centroid, but the linked incident retains its creation-time location. Candidate
confirmation does not reconcile these locations. The responder assignment API
returns the incident location, so the candidate marker reviewed by a dispatcher
can differ from the destination sent to the responder.

**Impact:** The reviewed cluster location and operational destination can
diverge without an explicit destination decision or explanation.

**Recommended correction:** Establish an authoritative emergency destination
before dispatch and use it consistently in review, allocation, and responder
navigation. Preserve each report's original emergency coordinates. If the
operational destination differs from the cluster center, make that distinction
clear to the dispatcher.

**Acceptance criteria:**

- Incoming reports and candidate confirmation cannot leave an unexplained
  mismatch between the reviewed destination and dispatched destination,
  including when they run concurrently.
- The dispatcher-reviewed destination is preserved through dispatch;
  clustering cannot silently move it after dispatch.
- Individual incidents created by splitting use the selected report's emergency
  location, as required by IMP-007.

**Decision needed before implementation:** Whether a pending incident tracks
the current centroid or uses a destination explicitly selected by the
dispatcher. Any later destination-change workflow must define dispatcher
authorization, audit history, and responder notification. The current code
demonstrates drift; it does not establish the centroid as the correct
operational destination in every case.

**Evidence:** Candidate centroid updates and incident creation in
[clustering.py](services/algorithms/src/clustering.py), confirmation in
[candidates.js](services/ingestion/src/routes/candidates.js), and destination
retrieval in [assignments.js](services/ingestion/src/routes/assignments.js).

## Current Gaps

### LIM-001 — Split incorrectly grouped reports

**Status:** Open

**Current behavior:** Two nearby reports of the same emergency type can be
grouped into one candidate, even when they describe separate emergencies.

**Impact:** The dispatcher cannot separate the reports into individual
incidents using the current dashboard or API.

**Recommended improvement:** Add a dispatcher action to split a candidate,
reassign selected reports, and create linked incidents starting at `Reported`.
Move both report links (`candidate_id` and `incident_id`) atomically with the
required count/location updates and audit records. Invalidate stale summaries
and arrange regeneration for affected groups. Protect the split from delayed
or replayed clustering events overwriting report membership.

**Dependencies and decisions:** IMP-007 defines the dispatch and exact-location
outcome of this same split operation. Decide which lifecycle stages permit
splitting and how later nearby reports attach to manually separated candidates.
Splitting must preserve the six-stage lifecycle and existing response history.

**Evidence:** Report membership updates in
[clustering.py](services/algorithms/src/clustering.py) and current candidate
operations in [candidates.js](services/ingestion/src/routes/candidates.js).

---

### LIM-002 — Show individual report locations in a cluster

**Status:** Open

**Current behavior:** The dashboard map shows one candidate marker at the
cluster's center point. Zooming in does not reveal the locations of linked
reports. Individual emergency coordinates already exist in the candidate-detail
API and are displayed as text in the report review.

**Impact:** The dispatcher has less spatial information when deciding whether
a candidate represents one emergency or multiple nearby emergencies.

**Recommended improvement:** Show the linked report markers when a candidate
is selected. For reports at the exact same location, use an offset or a
spiderfy/list interaction so every report can be reviewed. Let a Dispatcher or
Admin select an individual report from the cluster review; the map should then
automatically pan to that report's emergency location, zoom in to a useful
street-level view, and visually highlight the selected report marker. Offsets
must affect display only; keep the stored emergency coordinates unchanged.

**Dependencies:** Coordinate map focus with IMP-009. Incident-detail report
data currently omits coordinates, so incident review fetches candidate details
to restore them. Include direct report-coordinate access when supporting
incidents that cannot use that candidate lookup.

**Evidence:** [Candidate detail API](services/ingestion/src/routes/candidates.js),
[report review](services/frontend/src/features/incident-review/components/CitizenReportsList.jsx),
and [incident review data loading](services/frontend/src/features/incident-review/IncidentReviewSheet.jsx).

---

### LIM-004 — Make the clustering worker easier to operate

**Status:** Open

**Current behavior:** Clustering depends on the separate Python worker at
`services/algorithms/src/worker.py`. While it is offline, newly stored reports
are not processed into candidates. Existing candidates and incidents remain
available. Docker Compose currently manages PostgreSQL and RabbitMQ only; the
ingestion `/health` endpoint does not verify worker readiness.

**Impact:** New reports can wait without a candidate for dispatcher validation,
even while the ingestion service appears healthy.

**Recommended improvement:** Run the algorithm worker as a managed service,
add visible worker-health and processing-backlog information, and provide
recovery for reports whose processing event was not delivered. Restarting the
worker alone does not establish that every stored report will be processed.

**Evidence:** [Worker](services/algorithms/src/worker.py),
[Compose services](docker-compose.yml), [health endpoint](services/ingestion/src/index.js),
and [event publishing](services/ingestion/src/config/rabbitmq.js).

---

### LIM-005 — Show validated incidents waiting for a unit

**Status:** Open

**Current behavior:** The allocation worker may recommend a unit, but the
dispatcher must select an available unit and confirm dispatch. Validated
incidents already appear in the Incident Status panel, and overdue validated
incidents already generate escalation alerts.

**Impact:** There is no dedicated waiting-for-unit queue or unit-availability
notification to distinguish these incidents from the general status list.

**Recommended improvement:** Keep dispatcher confirmation as required, but
add a waiting queue and unit-availability notifications.

**Evidence:** [Incident Status panel](services/frontend/src/features/dispatcher/components/IncidentStatusPanel.jsx)
and [escalation worker](services/ingestion/src/workers/escalationWorker.js).

## Improvements Backlog

### IMP-001 — Focus the Field Casualty Assessment

**Status:** Open

**Priority:** High

**Current behavior:** The assessment already opens in a modal drawer above the
map, with a maximum height of `96svh`. The form uses one column on small screens
and two columns at the `sm` breakpoint. Remaining concerns about map prominence,
scrolling, and usable screen space need browser verification on field devices.

**Why this matters:** After arrival on scene, the assessment is the task that
resolves the incident. The map is secondary information and can take attention
and screen space away from the form, especially on a small field device.

**Recommended improvement:** Refine the existing drawer into a focused
full-screen assessment view. Keep the map behind the assessment or a clearly
labelled **View location** action. Use a single-column form with large touch
targets and accessible scrolling.

**Evidence:** [Assessment drawer](services/frontend/src/features/responder/components/FieldAssessmentDrawer.jsx)
and [assessment form](services/frontend/src/features/responder/components/CasualtyAssessmentForm.jsx).

---

### IMP-002 — Add summaries to the Admin dashboard

**Status:** Open

**Priority:** Medium

**Current behavior:** The Admin dashboard shows report counts, trends,
activity logs, and incident monitoring, but does not show a readable intake or
handover summary directly in that dashboard. Admin users can already access
these summaries and assessments through the linked Dispatcher View.

**Recommended improvement:** Connect Admin incident monitoring to the existing
incident-detail review, reusing its available AI summary, report count, status,
and field assessments. Add access to the incident's audit activity while
preserving role permissions.

**Evidence:** [Admin dashboard](services/frontend/src/pages/AdminDashboard.jsx)
and [shared incident review](services/frontend/src/features/incident-review/IncidentReviewSheet.jsx).

---

### IMP-003 — Export administrative records

**Status:** Open

**Priority:** Medium

**Current behavior:** There is no export endpoint or dashboard control for
reports, incidents, analytics, or audit activity.

**Impact:** Administrators cannot create a shareable CSV or PDF record.

**Recommended improvement:** Add role-protected exports with a chosen date
range and clear scope. Start with CSV exports for incidents and audit logs.
Export the complete selected record set from the server, rather than only rows
loaded in the dashboard. The current audit API defaults to 50 records and caps
requests at 100; that limit must not silently truncate an export.
Add a printable/PDF incident summary only after deciding which personal or
medical information may be included.

**Evidence:** [Admin audit API](services/ingestion/src/routes/admin.js)
and [dashboard audit controls](services/frontend/src/pages/admin/AuditView.jsx).

---

### IMP-004 — Archive completed cases separately from live incidents

**Status:** Open

**Priority:** High

**Current behavior:** The system correctly transitions incidents through
`Active → Resolved → Closed`, but resolved and closed cases remain visible on
the live dispatcher map. There is no archive or history section.

**Recommended improvement:** Keep the existing lifecycle unchanged. After an
incident is closed, remove it from the default live map and Incident Status
panel. Provide an Archive view with date, status, search, and read-only case
details. When an Admin or Dispatcher selects an archived case, show its
location on the map in a distinct archive color so it cannot be confused with
a live emergency. Keep `Resolved` cases accessible for required closure review;
the archive boundary in this item is `Closed`.

**Evidence:** [Map marker generation](services/frontend/src/hooks/useMapMarkers.js)
and [incident list and closure routes](services/ingestion/src/routes/incidents.js).

---

### IMP-005 — Add manual incident creation for reports awaiting clustering

**Status:** Open

**Priority:** High

**Current behavior:** The current configuration and worker default use
`DBSCAN_MIN_POINTS=1`. A single report can already form a candidate with a linked
`Reported` incident and proceed through existing validation and manual dispatch.
An isolated report can remain at `Received` when a higher threshold is configured
or clustering processing is unavailable. There is no dispatcher action to
manually promote that waiting report into the candidate/incident workflow.

**Recommended improvement:** Keep normal DBSCAN processing and add a
dispatcher-reviewed **Create Incident** fallback for a report awaiting
clustering. Create a candidate with a linked `Reported` incident so the existing
validation and manual assignment workflow can be reused. Prevent concurrent or
replayed worker processing from creating duplicate incidents or overwriting
the manual decision. Preserve the selected report's emergency location and the
existing lifecycle:
`Reported → Validated → Dispatched → Active → Resolved → Closed`.

**Dependencies:** Coordinate recovery with LIM-004 and report-membership
protection with LIM-001.

**Evidence:** [Default configuration](.env.example),
[clustering worker](services/algorithms/src/clustering.py), and
[singleton specification](CONTEXT.md).

---

### IMP-006 — Support multiple response units at one incident

**Status:** Open

**Priority:** High

**Current behavior:** The API and dispatcher UI currently permit only one
response-unit assignment for an incident. The first assignment changes the
incident from `Validated` to `Dispatched`, and the assignment route rejects
another unit. The database already supports multiple assignments per incident.
Units have a `unit_type`; department ownership is not separately modeled.

**Why this matters:** A large fire or complex emergency may need multiple fire
trucks, ambulances, rescue teams, or a combination of departments at the same
location.

**Recommended improvement:** Allow the dispatcher to add one or more available
units to the same validated, dispatched, or active incident, including units
of the same or different types. Each unit needs its own assignment, arrival
status, and completion record. The first assignment moves
the incident to `Dispatched`; later assignments must add resources without
repeating or bypassing the incident lifecycle. Enforce assignment ownership and
`OnScene` status on the server before accepting that unit's assessment.

**Dependencies and decisions:** Define one completion policy with IMP-012,
IMP-013, and IMP-015: which assignments must contribute assessments/completion,
who can finalize the incident, and when each unit becomes available. The current
assessment route resolves the entire incident and releases only the submitting
unit, so merely permitting more assignments would strand other units and block
their later assessments. These completion and release rules remain undecided;
this item does not authorize earlier unit release. If actual department
ownership is needed, define it separately from unit type.

**Evidence:** [Assignment and assessment routes](services/ingestion/src/routes/incidents.js)
and [existing one-to-many schema](database-schema.sql).

---

### IMP-007 — Dispatch separate units to individual reports in a cluster

**Status:** Open

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

**Dependencies:** This is the dispatch outcome of the split operation in
LIM-001, not a second splitting feature. Set each resulting incident's
`location` from the selected report's `emergency_location`, because the
responder receives the incident location. Coordinate destination consistency
with BUG-002 and individual report review with LIM-002.

**Evidence:** [Responder assignment data](services/ingestion/src/routes/assignments.js).

---

### IMP-008 — Add filters to the clustering review

**Status:** Open

**Priority:** Medium

**Current behavior:** The clustering review presents linked citizen reports as
one unfiltered list.

**Impact:** When a cluster contains many reports, a dispatcher may take too
long to find reports relevant to location, time, hazards, or the situation
being assessed.

**Recommended improvement:** Add cluster-review filters for submission time,
location/distance from the cluster center, photos, and specific structured
answers. All reports in a cluster already share a primary emergency type, so
put any emergency-type filter on the candidate list. The citizen UI requires
operational answers; filtering by particular answers is more useful than merely
checking whether answers exist. Individual reports do not currently have a
severity field.

Show the number of matching reports. Keep the selected report highlighted on
the map when filters change, and indicate if it is outside the filtered list.
This map interaction depends on LIM-002.

**Evidence:** [Report list](services/frontend/src/features/incident-review/components/CitizenReportsList.jsx),
[citizen validation](services/frontend/src/pages/CitizenReport.jsx), and
[same-type clustering](services/algorithms/src/clustering.py).

---

### IMP-009 — Preserve the user's map view after the first load

**Status:** Open

**Priority:** Medium

**Current behavior:** On boundary-data load or a new map instance, the map calls
`fitBounds` immediately and again after 150 and 400 milliseconds. These fits can
overwrite an early manual view change. Ordinary marker refreshes do not directly
rerun that effect. Mobile tab changes unmount the map, so returning to it creates
a new instance and repeats the fit; development-mode remounts can also repeat
initialization.

**Impact:** The map moves away from the location a user is examining, making
cluster and incident review frustrating.

**Recommended improvement:** Fit the map to Tagoloan only once when the map
first loads in the dashboard. Afterwards, preserve the user's zoom and position
when pins refresh, an existing selection is retained, the layout recalculates,
or the user returns from another mobile tab. Recenter or zoom after an explicit
user action, such as selecting an individual report under LIM-002 or pressing
a **Fit to Tagoloan** control. Initial fit timers must not override a view the
user has already chosen.

**Evidence:** [Map initialization](services/frontend/src/components/map/TagoloanMap.jsx)
and [mobile map mounting](services/frontend/src/pages/DispatcherDashboard.jsx).

---

### IMP-010 — Require details when a structured answer is **Other**

**Status:** Open

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
new field adds detail rather than replacing it. Enforce the conditional rule
server-side as well as in the form, reject whitespace-only explanations, store
each explanation with its question, and display it during dispatcher review.
Remove stale question-specific values when the primary type or answer changes.

**Evidence:** [Citizen questions and validation](services/frontend/src/pages/CitizenReport.jsx)
and [report ingestion](services/ingestion/src/routes/reports.js), which currently
stores parsed answers without question-specific validation.

---

### IMP-011 — Capture multiple emergency needs in one citizen submission

**Status:** Open

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
same-type clustering rule. Include validation, persistence, report-detail
responses, dispatcher display, and summary inputs for the additional needs.

**Dependencies:** IMP-006 supplies extra units for one event. LIM-001/IMP-007
supplies separate incidents only when reports describe separate emergencies.
Additional needs do not by themselves establish separate incidents.

**Evidence:** [Report schema](database-schema.sql),
[ingestion fields](services/ingestion/src/routes/reports.js), and
[type-based clustering](services/algorithms/src/clustering.py).

---

### IMP-012 — Allow a minimal field assessment when no casualty details exist

**Status:** Open

**Priority:** Medium

**Current behavior:** A responder must choose a disposition before submitting
the Field Casualty Assessment. The other fields are optional, but there is no
clear option for an incident with no casualty, no patient information, or no
assessment details available.

**Why this matters:** A responder may need to document and resolve a fire,
flood, or false alarm even when there is no patient to assess.

**Recommended improvement:** Keep the required field-assessment record and
the required disposition so the lifecycle is not bypassed. Add clear outcomes
such as **No casualty identified** and **No patient found**. Represent **Unable
to assess** separately as an uncertain outcome; missing patient identity also
does not establish that there was no casualty. Update form options, server
validation, and the database disposition CHECK constraint together, preserving
existing disposition values.

Exclude no-casualty records from patient totals in summaries and reporting. The
current fallback handover counts every assessment row as one patient.

**Decisions needed before implementation:** Which outcomes permit resolution
and what supporting details are required, especially for **Unable to assess**.
Coordinate these rules with IMP-013 and the completion policy in IMP-006 and
IMP-015.

**Evidence:** [Assessment form](services/frontend/src/features/responder/components/CasualtyAssessmentForm.jsx),
[disposition constraint](database-schema.sql), and
[handover patient counting](services/algorithms/src/summarizer.py).

---

### IMP-013 — Prevent accidental blank field-assessment submissions

**Status:** Open

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
casualty identified** or **No patient found**, under the rules defined with
IMP-012. An **Unable to assess** outcome requires its own decision and must not
be treated as proof of no casualty. Apply the same content rules server-side and
client-side, including rejection of whitespace-only text used to satisfy them.

The existing submit button already says **Submit Assessment and Resolve**. Add
explicit confirmation explaining incident resolution and unit availability
under the agreed completion policy. Confirmation does not replace validation.
Keep the required stored assessment and assignment ownership checks. Add the
server-side `OnScene` guard described in IMP-006; the current server route does
not enforce that assignment status.

**Decision needed before implementation:** Define exactly what assessment
details satisfy each outcome; “meaningful” alone is not a testable requirement.
Missing patient identity must remain distinguishable from an empty assessment.

**Evidence:** [Assessment submission](services/ingestion/src/routes/incidents.js),
[current form](services/frontend/src/features/responder/components/CasualtyAssessmentForm.jsx),
and [assessment-existence guard](services/ingestion/src/services/stateMachine.js).

---

### IMP-014 — Keep responder status actions fully visible and separate

**Status:** Open

**Priority:** High

**Current behavior:** At the `sm` viewport breakpoint, **Mark En Route** and
**Arrived on Scene** switch from `flex-col` to `flex-row`. Both retain `w-full`
and inherit `shrink-0` from the shared button component. When both actions are
visible, two full-width, nonshrinking buttons share one row, creating horizontal
overflow risk. Exact clipping at particular screen sizes needs browser
verification.

**Why this matters:** **Arrived on Scene** is a critical responder action. It
must be fully visible and easy to tap without confusion or accidental action.

**Recommended improvement:** Keep these actions vertically stacked by default,
or change to a horizontal layout only when the dispatch card itself has enough
space. If using a row, also adjust button widths so they share the available
space; a breakpoint change alone does not fix the width rules. Ensure both
buttons remain fully visible, have large touch targets, and retain clear spacing
across card widths and screen sizes.

**Evidence:** [Responder actions](services/frontend/src/features/responder/components/ResponderActionButtons.jsx)
and [shared button sizing](services/frontend/src/components/ui/button.jsx).

---

### IMP-015 — Support multiple casualty assessments for one incident

**Status:** Open

**Priority:** High

**Current behavior:** The responder field-assessment form captures one
casualty record and resolves the incident immediately after it is submitted.
There is no way to add several patient forms, review them together, and submit
all completed assessments at once. The database already permits multiple
assessment rows per incident and assignment, and incident review already reads
an assessment array.

**Why this matters:** One incident can involve multiple patients. Responders
need to document each patient separately without resolving the incident after
the first entry or losing the forms already entered.

**Recommended improvement:** Let the responder add multiple casualty forms as
draft entries, label them clearly (for example, **Patient 1**, **Patient 2**),
review, edit, or remove each entry, and submit the full set in one action. The
server must validate every submitted entry and save the full batch in one
transaction. A failed entry must reject the batch without partial persistence.
Require a nonempty valid patient batch or a stored explicit no-casualty
assessment governed by IMP-012/013. One valid entry cannot excuse another
incomplete entry. Preserve entered drafts after a failed submission and prevent
retries from creating duplicate assessment batches.

**Dependencies and decisions:** Saving the batch is necessary but must not
alone imply all patients and responding units have finished. Incident resolution
and each unit's release must follow the completion policy defined with IMP-006.
No-casualty records must remain distinguishable from patient records in summaries
and counts. Define draft persistence across navigation/reload before
implementation.

**Evidence:** [Responder form state](services/frontend/src/pages/ResponderPortal.jsx),
[assessment submission](services/ingestion/src/routes/incidents.js), and
[existing assessment schema](database-schema.sql).

## Intended Controls

- A responder, rather than a dispatcher, changes an assigned incident from
  `Dispatched` to `Active` by marking arrival on scene.
- A Fire report cannot join a Flood candidate because clustering filters by
  emergency type.
- In the current single-unit workflow, the assigned unit becomes available only
  after its required field assessment is stored and the incident transitions
  from `Active` to `Resolved`.
- IMP-006 and IMP-015 must define multi-unit completion and release rules before
  implementation. This tracker does not authorize earlier release or resolution
  based solely on the first unit's submission.

## Tracking Rules

- Keep an item **Open** until it is implemented and tested.
- Record affected files, test evidence, and the decision when an item changes.
- A documentation correction or a passing existing test does not complete a
  planned feature. Distinguish source-verified behavior, reproduced defects, and
  visual symptoms awaiting browser verification.
- Preserve existing item IDs and use dependencies to connect overlapping work.
- Resolve each marked decision before implementing the affected behavior; do
  not infer an operational or medical completion policy from an example label.
- Do not remove the documented six-stage incident lifecycle or the Modified
  Hungarian Algorithm's dummy-matrix padding while resolving items.
