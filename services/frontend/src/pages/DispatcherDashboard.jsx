import { useEffect, useRef, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';

const statusColors = { Reported: '#f59e0b', Validated: '#2563eb', Dispatched: '#7c3aed', Active: '#dc2626', Resolved: '#059669', Closed: '#64748b' };
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

function DispatcherDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [units, setUnits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [recommendations, setRecommendations] = useState({});
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState('');
  const [audibleAlerts, setAudibleAlerts] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const dialogRef = useRef(null);
  const audioContextRef = useRef(null);
  const session = getSession();

  async function loadDashboard({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    try {
      const [nextCandidates, nextUnits, nextIncidents] = await Promise.all([api.candidates(), api.units(), api.incidents()]);
      setCandidates(nextCandidates); setUnits(nextUnits); setIncidents(nextIncidents); setError('');
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the command dashboard.'); }
    finally { if (!quiet) setLoading(false); }
  }

  function enableAudibleAlerts(enabled) {
    if (enabled && !audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContextRef.current = new AudioContext();
    }
    audioContextRef.current?.resume();
    setAudibleAlerts(enabled);
  }

  function playEscalationTone() {
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  }

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    const cleanup = [
      subscribeSocket('dispatcher:candidate:new', () => { setMessage('Candidate activity received. Dashboard refreshed.'); loadDashboard({ quiet: true }); }),
      subscribeSocket('dispatcher:field:resolved', () => { setMessage('A field assessment was completed. Dashboard refreshed.'); loadDashboard({ quiet: true }); }),
      subscribeSocket('dispatcher:assignment:recommended', (payload) => setRecommendations((current) => ({ ...current, [payload.incidentId]: payload }))),
      subscribeSocket('dispatcher:incident:escalated', (payload) => {
        playEscalationTone();
        setAlert(`${payload.incidentCode || 'Incident'} needs attention: ${payload.status} has exceeded its response threshold.`);
        loadDashboard({ quiet: true });
      }),
    ];
    return () => cleanup.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => () => audioContextRef.current?.close(), []);

  async function openCandidate(candidateId) {
    try {
      setSelected(await api.candidate(candidateId));
      setSelectedUnitId(''); setNotes('');
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } catch (requestError) { setError(requestError.message); }
  }

  async function confirmCandidate() {
    if (!selected) return;
    try {
      const result = await api.confirmCandidate(selected.id);
      setSelected((current) => ({ ...current, status: 'Confirmed', incident_id: result.incidentId, incident_code: result.incidentCode, incident_status: result.status }));
      setMessage(`${result.incidentCode} was validated. Await the live allocation recommendation or choose an available unit.`);
      loadDashboard({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
  }

  async function assignUnit(event) {
    event.preventDefault();
    if (!selected?.incident_id || !selectedUnitId) return;
    try {
      await api.assign(selected.incident_id, selectedUnitId, notes);
      setMessage('Response unit dispatched and notified.');
      dialogRef.current?.close();
      loadDashboard({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
  }

  async function closeIncident(incidentId) {
    try { await api.closeIncident(incidentId); setMessage('Incident closed after review.'); loadDashboard({ quiet: true }); }
    catch (requestError) { setError(requestError.message); }
  }

  const markers = [
    ...candidates.map((candidate) => ({ id: `candidate-${candidate.id}`, latitude: candidate.center_location.coordinates[1], longitude: candidate.center_location.coordinates[0], title: `${candidate.emergency_type} candidate`, description: `${candidate.report_count} reports — Pending review`, color: '#f59e0b', selected: selected?.id === candidate.id, candidateId: candidate.id })),
    ...incidents.map((incident) => ({ id: `incident-${incident.id}`, latitude: incident.location.coordinates[1], longitude: incident.location.coordinates[0], title: incident.incident_code, description: `${incident.emergency_type} — ${incident.status}`, color: statusColors[incident.status], incidentId: incident.id })),
  ];
  const recommendation = selected?.incident_id ? recommendations[selected.incident_id] : null;

  return <div className="min-h-svh bg-slate-100 text-slate-900"><a className="skip-link" href="#dashboard-main">Skip to command dashboard</a><header className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 px-4 py-4 text-white sm:px-6"><div><p className="text-xs font-bold tracking-widest text-amber-300">TAGOLOAN MDRRMO</p><h1 className="text-xl font-bold">Dispatcher Command Dashboard</h1></div><div className="flex items-center gap-4"><span className="text-sm">{session?.fullName || 'Dispatcher'}</span>{session?.role === 'Admin' && <a className="text-sm underline" href="/admin">Admin panel</a>}<button className="rounded border border-slate-500 px-3 py-2 text-sm font-semibold hover:bg-slate-800" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>Sign out</button></div></header>{alert && <div className="bg-red-700 px-4 py-4 text-white" role="alert"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><strong>Escalation alert: {alert}</strong><button className="rounded border border-white px-3 py-1" onClick={() => setAlert('')}>Dismiss</button></div></div>}<p className="sr-only" aria-live="polite">{message}</p><main className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_25rem]" id="dashboard-main" tabIndex="-1"><section className="min-h-[32rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Live Tagoloan incident map"><TagoloanMap className="h-[32rem] xl:h-[calc(100svh-9rem)]" markers={markers} onMarkerSelect={(marker) => marker.candidateId && openCandidate(marker.candidateId)} /></section><aside className="grid content-start gap-5"><section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="candidate-heading"><div className="flex items-center justify-between"><h2 className="text-lg font-bold" id="candidate-heading">Candidate review</h2><button className="text-sm font-semibold text-blue-700 underline" onClick={() => loadDashboard()}>Refresh</button></div><label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={audibleAlerts} onChange={(event) => enableAudibleAlerts(event.target.checked)} />Play a brief tone for escalations</label>{loading ? <p className="mt-4 text-slate-600">Loading live candidates…</p> : candidates.length === 0 ? <p className="mt-4 text-slate-600">No pending candidate clusters.</p> : <ul className="mt-4 grid gap-3">{candidates.map((candidate) => <li key={candidate.id}><button className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-blue-500 hover:bg-blue-50" onClick={() => openCandidate(candidate.id)}><strong className="block">{candidate.emergency_type}</strong><span className="mt-1 block text-sm text-slate-600">{candidate.report_count} report{candidate.report_count === 1 ? '' : 's'} · {formatDate(candidate.created_at)}</span><span className="mt-2 block text-sm">{candidate.latest_summary || 'Summary is being prepared.'}</span></button></li>)}</ul>}</section><section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="incident-heading"><h2 className="text-lg font-bold" id="incident-heading">Incident status</h2><ul className="mt-4 grid gap-3">{incidents.slice(0, 8).map((incident) => <li className="rounded-lg border border-slate-200 p-3" key={incident.id}><div className="flex items-start justify-between gap-2"><strong>{incident.incident_code}</strong><span className="rounded-full px-2 py-1 text-xs font-bold text-white" style={{ background: statusColors[incident.status] }}>{incident.status}</span></div><p className="mt-1 text-sm text-slate-600">{incident.emergency_type} · {incident.report_count || 0} reports</p>{incident.status === 'Resolved' && <button className="mt-3 text-sm font-bold text-blue-700 underline" onClick={() => closeIncident(incident.id)}>Close after review</button>}</li>)}</ul></section>{error && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}</aside></main>
    <dialog className="w-[min(92vw,48rem)] rounded-2xl border-0 p-0 shadow-2xl" ref={dialogRef} onClose={() => setSelected(null)}>{selected && <section className="max-h-[88svh] overflow-y-auto p-6" aria-labelledby="candidate-dialog-title"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-amber-700">{selected.status}</p><h2 className="text-2xl font-bold" id="candidate-dialog-title">{selected.emergency_type} candidate</h2></div><button className="rounded p-2 text-slate-600 hover:bg-slate-100" onClick={() => dialogRef.current?.close()}>Close</button></div><p className="mt-4 leading-6 text-slate-700">{selected.latest_summary || 'No AI summary is available yet. Review the report details below.'}</p>{selected.summary_is_fallback && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">Template fallback summary in use.</p>}<h3 className="mt-6 font-bold">Individual submissions ({selected.reports.length})</h3><ul className="mt-3 grid gap-3">{selected.reports.map((report) => <li className="rounded-lg bg-slate-100 p-3" key={report.id}><p>{report.description || 'No narrative supplied.'}</p><p className="mt-1 text-xs text-slate-600">{formatDate(report.created_at)}</p></li>)}</ul>{selected.status === 'Pending' && <button className="mt-6 rounded-lg bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800" onClick={confirmCandidate}>Validate incident</button>}{selected.incident_status === 'Validated' && <form className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4" onSubmit={assignUnit}><h3 className="font-bold">Resource dispatch</h3>{recommendation && <p className="mt-2 text-sm text-blue-950">Algorithm recommendation: <strong>{recommendation.unitCode || recommendation.recommendedUnitId}</strong> · estimated {recommendation.estimatedTravelTimeMinutes} minutes. Dispatcher confirmation is required.</p>}<label className="mt-4 block font-semibold" htmlFor="unit">Response unit</label><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" id="unit" value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)} required><option value="">Choose an available unit</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_code} · {unit.unit_type}</option>)}</select><label className="mt-4 block font-semibold" htmlFor="dispatch-notes">Dispatch notes (optional)</label><textarea className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="dispatch-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" /><button className="mt-4 rounded-lg bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800" type="submit">Confirm dispatch</button></form>}</section>}</dialog></div>;
}

export default DispatcherDashboard;
