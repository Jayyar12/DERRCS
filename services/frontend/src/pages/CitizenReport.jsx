import { useMemo, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError } from '../api/client';

const emergencyTypes = ['Fire', 'Flood', 'Medical', 'Road Accident', 'Rescue'];
const questionSets = {
  Fire: [['structureType', 'What is burning?', ['Residential', 'Commercial', 'Vegetation', 'Vehicle', 'Other']], ['peopleTrapped', 'Are people trapped?', ['Yes', 'No', 'Unknown']], ['hazardousMaterialsNearby', 'Are hazardous materials nearby?', ['Yes', 'No', 'Unknown']]],
  Flood: [['waterDepth', 'Estimated water depth', ['Below ankle', 'Knee deep', 'Waist deep', 'Above waist', 'Unknown']], ['peopleStranded', 'Are people stranded?', ['Yes', 'No', 'Unknown']]],
  Medical: [['patientConscious', 'Is the patient conscious?', ['Yes', 'No', 'Unknown']], ['breathing', 'Is the patient breathing normally?', ['Yes', 'No', 'Unknown']]],
  'Road Accident': [['vehiclesInvolved', 'Vehicles involved', ['Motorcycle', 'Car', 'Truck', 'Multiple', 'Other']], ['peopleTrapped', 'Is anyone trapped?', ['Yes', 'No', 'Unknown']]],
  Rescue: [['rescueType', 'Type of rescue needed', ['Water rescue', 'Confined space', 'Collapsed structure', 'Missing person', 'Other']], ['peopleTrapped', 'Is anyone trapped?', ['Yes', 'No', 'Unknown']]],
};

function createSessionId() {
  const key = 'derrsc_citizen_session';
  const saved = sessionStorage.getItem(key);
  if (saved) return saved;
  const id = globalThis.crypto?.randomUUID?.() || `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessionStorage.setItem(key, id);
  return id;
}

function CitizenReport() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ emergencyType: '', description: '', answers: {} });
  const [reporterCoordinates, setReporterCoordinates] = useState(null);
  const [emergencyCoordinates, setEmergencyCoordinates] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const questions = useMemo(() => questionSets[form.emergencyType] || [], [form.emergencyType]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateAnswer = (key, value) => setForm((current) => ({ ...current, answers: { ...current.answers, [key]: value } }));

  function useMyLocation() {
    setLocationMessage('Requesting your location…');
    if (!navigator.geolocation) return setLocationMessage('This browser cannot provide location. Place the emergency pin manually.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { latitude: coords.latitude, longitude: coords.longitude };
        setReporterCoordinates(location);
        setEmergencyCoordinates((current) => current || location);
        setLocationMessage('Your location was recorded. Adjust the emergency pin if the emergency is elsewhere.');
      },
      () => setLocationMessage('Location was unavailable. Place the emergency pin manually.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function nextStep() {
    setError('');
    if (step === 1 && (!form.emergencyType || !form.description.trim())) return setError('Choose an emergency type and briefly describe what is happening.');
    if (step === 2 && questions.some(([key]) => !form.answers[key])) return setError('Answer each operational question before continuing.');
    if (step === 3 && !emergencyCoordinates) return setError('Use your location or place the emergency pin on the Tagoloan map.');
    setStep((current) => Math.min(current + 1, 4));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!emergencyCoordinates) return setError('An emergency location is required.');
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('sessionId', createSessionId());
      data.append('emergencyType', form.emergencyType);
      data.append('description', form.description.trim());
      data.append('emergencyCoordinates', JSON.stringify(emergencyCoordinates));
      data.append('standardizedAnswers', JSON.stringify(form.answers));
      if (reporterCoordinates) data.append('reporterCoordinates', JSON.stringify(reporterCoordinates));
      if (photo) data.append('photo', photo);
      setConfirmation(await api.submitReport(data));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit the report. Please try again.');
    } finally { setSubmitting(false); }
  }

  if (confirmation) return <main className="grid min-h-svh place-items-center bg-slate-950 px-4 py-10 text-slate-900" id="main-content" tabIndex="-1"><section className="w-full max-w-xl rounded-2xl bg-white p-7 shadow-2xl sm:p-10" aria-labelledby="confirmation-title"><p className="text-sm font-bold tracking-wide text-emerald-700">REPORT RECEIVED</p><h1 className="mt-2 text-3xl font-bold text-slate-950" id="confirmation-title">Help is being coordinated.</h1><p className="mt-4 leading-7 text-slate-700">Keep yourself safe. MDRRMO will review your report with nearby submissions.</p><dl className="mt-6 grid gap-4 rounded-xl bg-slate-100 p-5 text-left"><div><dt className="text-sm font-semibold text-slate-500">Tracking identifier</dt><dd className="mt-1 break-all font-mono text-base text-slate-950">{confirmation.reportId}</dd></div><div><dt className="text-sm font-semibold text-slate-500">Received</dt><dd className="mt-1 text-slate-950">{new Date(confirmation.receivedAt).toLocaleString()}</dd></div></dl><button className="mt-7 w-full rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800" onClick={() => window.location.reload()}>Submit another report</button></section></main>;

  return <div className="min-h-svh bg-slate-950 text-slate-900"><a className="skip-link" href="#main-content">Skip to report form</a><header className="border-b border-slate-700 bg-slate-900 px-4 py-4 text-white sm:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><div><p className="text-sm font-bold tracking-widest text-amber-300">TAGOLOAN MDRRMO</p><h1 className="text-xl font-bold">DERRCS Emergency Reporting</h1></div><a className="text-sm underline" href="/login">Staff login</a></div></header><main className="mx-auto max-w-5xl px-4 py-7 sm:px-8" id="main-content" tabIndex="-1"><section className="rounded-2xl bg-white p-5 shadow-xl sm:p-8" aria-labelledby="report-title"><p className="text-sm font-semibold text-blue-700">Step {step} of 4</p><h2 className="mt-1 text-2xl font-bold text-slate-950" id="report-title">Report an emergency</h2><p className="mt-2 max-w-2xl text-slate-600">For immediate danger, move to safety first. This form records both your location and the actual emergency location.</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${step * 25}%` }} /></div>{error && <div className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}<p className="sr-only" aria-live="polite">{locationMessage}</p><form className="mt-7" onSubmit={submit}>
      {step === 1 && <fieldset><legend className="text-lg font-bold">What is happening?</legend><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{emergencyTypes.map((type) => <label key={type} className={`cursor-pointer rounded-xl border-2 p-4 font-semibold ${form.emergencyType === type ? 'border-blue-700 bg-blue-50 text-blue-950' : 'border-slate-200 hover:border-blue-400'}`}><input className="sr-only" name="emergencyType" type="radio" value={type} checked={form.emergencyType === type} onChange={() => updateForm('emergencyType', type)} />{type}</label>)}</div><label className="mt-6 block font-semibold" htmlFor="description">Short description</label><p className="mt-1 text-sm text-slate-600" id="description-hint">Describe hazards, visible damage, and people needing help.</p><textarea className="mt-2 w-full rounded-lg border border-slate-300 p-3" id="description" name="description" value={form.description} onChange={(event) => updateForm('description', event.target.value)} aria-describedby="description-hint" rows="4" required /></fieldset>}
      {step === 2 && <fieldset><legend className="text-lg font-bold">Operational details</legend><div className="mt-5 grid gap-5">{questions.map(([key, label, options]) => <div key={key}><label className="block font-semibold" htmlFor={key}>{label}</label><select className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" id={key} value={form.answers[key] || ''} onChange={(event) => updateAnswer(key, event.target.value)} required><option value="">Select an answer</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>)}</div></fieldset>}
      {step === 3 && <fieldset><legend className="text-lg font-bold">Set the emergency location</legend><p className="mt-2 text-slate-600">Your GPS can identify you, but tap the map when the emergency is somewhere else.</p><div className="mt-4 flex flex-wrap gap-3"><button className="rounded-lg bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800" type="button" onClick={useMyLocation}>Use my location</button>{locationMessage && <span className="self-center text-sm text-slate-700">{locationMessage}</span>}</div><div className="mt-5 h-80 overflow-hidden rounded-xl border border-slate-300"><TagoloanMap interactive selectedPoint={emergencyCoordinates} onLocationChange={setEmergencyCoordinates} /></div><label className="mt-5 block font-semibold" htmlFor="photo">Photo (optional)</label><input className="mt-2 block w-full rounded-lg border border-slate-300 p-2" id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0] || null)} /></fieldset>}
      {step === 4 && <section aria-labelledby="review-title"><h3 className="text-lg font-bold" id="review-title">Review before submitting</h3><dl className="mt-4 grid gap-4 rounded-xl bg-slate-100 p-5"><div><dt className="text-sm font-semibold text-slate-500">Emergency</dt><dd>{form.emergencyType}</dd></div><div><dt className="text-sm font-semibold text-slate-500">Description</dt><dd>{form.description}</dd></div><div><dt className="text-sm font-semibold text-slate-500">Emergency pin</dt><dd>{emergencyCoordinates ? `${emergencyCoordinates.latitude.toFixed(5)}, ${emergencyCoordinates.longitude.toFixed(5)}` : 'Not set'}</dd></div></dl></section>}
      <div className="mt-8 flex flex-wrap justify-between gap-3">{step > 1 ? <button className="rounded-lg border border-slate-300 px-5 py-3 font-bold text-slate-800 hover:bg-slate-100" type="button" onClick={() => setStep((current) => current - 1)}>Back</button> : <span />}{step < 4 ? <button className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800" type="button" onClick={nextStep}>Continue</button> : <button className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300" disabled={submitting} type="submit">{submitting ? 'Submitting…' : 'Submit emergency report'}</button>}</div>
    </form></section></main></div>;
}

export default CitizenReport;
