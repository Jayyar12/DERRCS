import { useEffect, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';

const injuryOptions = ['Laceration', 'Suspected fracture', 'Burn', 'Head trauma', 'Respiratory distress', 'Other'];
const interventionOptions = ['Wound dressing', 'Cervical collar', 'Splinting', 'CPR', 'Oxygen therapy', 'Other'];
const dispositions = ['TreatedOnScene', 'TransportedHealthCenter', 'TransportedNMMC', 'RefusedCare', 'Deceased'];

function Checklist({ id: _id, label, options, values, onChange }) {
  return <fieldset className="mt-5"><legend className="font-bold">{label}</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{options.map((option) => <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3" key={option}><input type="checkbox" checked={values.includes(option)} onChange={(event) => onChange(event.target.checked ? [...values, option] : values.filter((value) => value !== option))} />{option}</label>)}</div></fieldset>;
}

function ResponderPortal() {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patientName: '', approximateAge: '', gender: '', consciousnessLevel: '', injuriesObserved: [], interventionsRendered: [], disposition: '', destinationFacility: '', notes: '' });
  const session = getSession();

  async function loadAssignment({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    try { setAssignment(await api.currentAssignment()); setError(''); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the current dispatch.'); }
    finally { if (!quiet) setLoading(false); }
  }

  useEffect(() => { loadAssignment(); }, []);
  useEffect(() => subscribeSocket('unit:dispatch:alert', () => { setMessage('A dispatch update was received.'); loadAssignment({ quiet: true }); }), []);

  async function updateStatus(status) {
    if (!assignment) return;
    setSaving(true); setError('');
    try {
      await api.updateAssignmentStatus(assignment.assignment_id, status);
      setMessage(status === 'EnRoute' ? 'Unit marked En Route.' : 'Arrival recorded. You may now submit the field assessment.');
      await loadAssignment({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function submitAssessment(event) {
    event.preventDefault();
    if (!assignment) return;
    setSaving(true); setError('');
    try {
      await api.submitAssessment(assignment.incident_id, { ...form, approximateAge: form.approximateAge ? Number(form.approximateAge) : null, assignmentId: assignment.assignment_id });
      setMessage('Field assessment saved. The incident is now resolved.');
      await loadAssignment({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  const location = assignment?.location?.coordinates;
  const status = assignment?.assignment_status;
  const onScene = assignment?.incident_status === 'Active' && status === 'OnScene';

  return <div className="min-h-svh bg-slate-100 text-slate-900"><a className="skip-link" href="#responder-main">Skip to assigned emergency</a><header className="flex items-center justify-between gap-4 bg-slate-950 px-4 py-4 text-white sm:px-6"><div><p className="text-xs font-bold tracking-widest text-amber-300">TAGOLOAN MDRRMO</p><h1 className="text-xl font-bold">Response Unit Field Portal</h1></div><div className="flex items-center gap-3"><span className="text-sm">{session?.fullName || 'Response unit'}</span><button className="rounded border border-slate-500 px-3 py-2 text-sm font-semibold hover:bg-slate-800" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>Sign out</button></div></header><p className="sr-only" aria-live="polite">{message}</p><main className="mx-auto max-w-5xl px-4 py-6 sm:px-6" id="responder-main" tabIndex="-1">{error && <div className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}{loading ? <p>Loading dispatch…</p> : !assignment ? <section className="rounded-2xl bg-white p-8 shadow-sm"><h2 className="text-2xl font-bold">No active dispatch</h2><p className="mt-2 text-slate-600">Keep this page open. A new assignment will appear here in real time.</p><button className="mt-5 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white" onClick={() => loadAssignment()}>Check again</button></section> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-red-700">{assignment.incident_status}</p><h2 className="text-2xl font-bold">{assignment.incident_code}</h2><p className="mt-1 text-slate-600">{assignment.emergency_type} · {assignment.severity} severity</p></div><span className="rounded-full bg-slate-900 px-3 py-2 text-sm font-bold text-white">Unit: {status}</span></div><h3 className="mt-7 font-bold">Caller notes</h3>{assignment.caller_notes?.length ? <ul className="mt-3 grid gap-2">{assignment.caller_notes.map((note) => <li className="rounded-lg bg-slate-100 p-3" key={note}>{note}</li>)}</ul> : <p className="mt-2 text-slate-600">No caller notes provided.</p>}<div className="mt-7 flex flex-wrap gap-3">{['Dispatched', 'Acknowledged'].includes(status) && <button className="rounded-lg bg-blue-700 px-5 py-4 font-bold text-white hover:bg-blue-800 disabled:bg-blue-300" disabled={saving} onClick={() => updateStatus('EnRoute')}>Mark En Route</button>}{['Dispatched', 'Acknowledged', 'EnRoute'].includes(status) && <button className="rounded-lg bg-red-700 px-5 py-4 font-bold text-white hover:bg-red-800 disabled:bg-red-300" disabled={saving} onClick={() => updateStatus('OnScene')}>Arrived on Scene</button>}</div>{onScene && <form className="mt-8 border-t border-slate-200 pt-7" onSubmit={submitAssessment}><h3 className="text-xl font-bold">Field Casualty Assessment</h3><p className="mt-2 text-slate-600">Complete the pre-hospital care report to resolve this incident.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><label className="font-semibold" htmlFor="patient-name">Patient name or identity</label><input className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="patient-name" autoComplete="name" value={form.patientName} onChange={(event) => setForm((current) => ({ ...current, patientName: event.target.value }))} /></div><div><label className="font-semibold" htmlFor="patient-age">Approximate age</label><input className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="patient-age" type="number" min="0" max="130" inputMode="numeric" value={form.approximateAge} onChange={(event) => setForm((current) => ({ ...current, approximateAge: event.target.value }))} /></div><div><label className="font-semibold" htmlFor="gender">Gender</label><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" id="gender" value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))}><option value="">Not recorded</option><option>Male</option><option>Female</option><option>Other</option></select></div><div><label className="font-semibold" htmlFor="consciousness">Consciousness (AVPU)</label><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" id="consciousness" value={form.consciousnessLevel} onChange={(event) => setForm((current) => ({ ...current, consciousnessLevel: event.target.value }))}><option value="">Not recorded</option>{['Alert', 'Verbal', 'Pain', 'Unresponsive'].map((option) => <option key={option}>{option}</option>)}</select></div></div><Checklist id="injuries" label="Injuries observed" options={injuryOptions} values={form.injuriesObserved} onChange={(injuriesObserved) => setForm((current) => ({ ...current, injuriesObserved }))} /><Checklist id="interventions" label="Interventions rendered" options={interventionOptions} values={form.interventionsRendered} onChange={(interventionsRendered) => setForm((current) => ({ ...current, interventionsRendered }))} /><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><label className="font-semibold" htmlFor="disposition">Disposition</label><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" id="disposition" value={form.disposition} onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value }))} required><option value="">Select disposition</option>{dispositions.map((option) => <option key={option}>{option}</option>)}</select></div><div><label className="font-semibold" htmlFor="destination">Destination facility</label><input className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="destination" value={form.destinationFacility} onChange={(event) => setForm((current) => ({ ...current, destinationFacility: event.target.value }))} /></div></div><label className="mt-5 block font-semibold" htmlFor="assessment-notes">Notes</label><textarea className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="assessment-notes" rows="4" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /><button className="mt-6 rounded-lg bg-emerald-700 px-5 py-4 font-bold text-white hover:bg-emerald-800 disabled:bg-emerald-300" disabled={saving} type="submit">{saving ? 'Saving assessment…' : 'Submit assessment and resolve incident'}</button></form>}</section><aside className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="font-bold">Emergency location</h2><p className="mt-2 text-sm text-slate-600">{location ? `${location[1].toFixed(5)}, ${location[0].toFixed(5)}` : 'Location unavailable'}</p>{location && <div className="mt-4 h-80 overflow-hidden rounded-xl border border-slate-300"><TagoloanMap selectedPoint={{ latitude: location[1], longitude: location[0] }} /></div>}</aside></div>}</main></div>;
}

export default ResponderPortal;
