import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Flame, Droplets, Activity, Car, LifeBuoy, MapPin, Camera, ClipboardList, Map, Eye, AlertTriangle } from 'lucide-react';

const emergencyTypes = [
  { name: 'Fire', icon: Flame, color: 'text-orange-500' },
  { name: 'Flood', icon: Droplets, color: 'text-blue-500' },
  { name: 'Medical', icon: Activity, color: 'text-rose-500' },
  { name: 'Road Accident', icon: Car, color: 'text-amber-500' },
  { name: 'Rescue', icon: LifeBuoy, color: 'text-emerald-500' }
];

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
  const [emergencyCoordinates, setEmergencyCoordinates] = useState(null);
  const [reporterCoordinates, setReporterCoordinates] = useState(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);

  const questions = useMemo(() => questionSets[form.emergencyType] || [], [form.emergencyType]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAnswer = (key, value) => setForm((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));

  function useMyLocation() {
    setLocationMessage('Getting location...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setEmergencyCoordinates(coords);
        setReporterCoordinates(coords);
        setLocationMessage('Location acquired via GPS.');
      },
      (err) => {
        setLocationMessage(err.code === 1 ? 'Location access denied. Please place the pin on the map.' : 'Unable to acquire location automatically.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function nextStep() {
    setError('');
    if (step === 1 && (!form.emergencyType || !form.description.trim())) return setError('Select an emergency type and provide a short description.');
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

  if (confirmation) {
    return (
      <main className="min-h-svh flex items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center border-border">
          <CardContent className="pt-10 pb-8 flex flex-col items-center">
            <CheckCircle2 className="size-16 text-primary mb-4" />
            <h1 className="text-xl font-bold mb-2">Help is being coordinated.</h1>
            <p className="text-base text-muted-foreground mb-8 max-w-md">Keep yourself safe. MDRRMO will review your report with nearby submissions.</p>
            
            <div className="w-full text-left p-6 bg-secondary/30 rounded-xl mb-8 space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Tracking Identifier</p>
                <p className="font-mono text-lg">{confirmation.reportId}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Received At</p>
                <p className="text-base">{new Date(confirmation.receivedAt).toLocaleString()}</p>
              </div>
            </div>
            
            <Button className="w-full text-base" size="lg" onClick={() => window.location.reload()}>Submit Another Report</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground pb-20">
      <header className="border-b border-border bg-background/95 backdrop-blur px-4 py-4 sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest text-muted-foreground uppercase">TAGOLOAN MDRRMO</p>
            <h1 className="text-xl font-bold">Emergency Report</h1>
          </div>
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Agency Login</Link>
        </div>
      </header>
      
      <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-primary">Step {step} of 4</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${step * 25}%` }} />
              </div>
            </div>
            <CardTitle className="text-lg font-bold">Report an Emergency</CardTitle>
            <CardDescription className="text-sm">Move to safety first. This form alerts nearby dispatchers.</CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
            
            <form id="report-form" onSubmit={submit} className="space-y-6">
              
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="size-5 text-warning" /> What is happening?
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {emergencyTypes.map(({ name, icon: Icon, color }) => (
                        <div
                          key={name}
                          onClick={() => updateForm('emergencyType', name)}
                          className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-2 transition-colors ${form.emergencyType === name ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-muted-foreground/50'}`}
                        >
                          <Icon className={`size-7 ${color} ${form.emergencyType === name ? 'opacity-100 drop-shadow-md' : 'opacity-70'}`} />
                          <span className={`text-sm font-semibold ${form.emergencyType === name ? 'text-primary' : 'text-muted-foreground'}`}>{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="description">Short description</FieldLabel>
                      <Textarea 
                        id="description" 
                        name="description" 
                        placeholder="Describe hazards, visible damage, etc."
                        value={form.description} 
                        onChange={(event) => updateForm('description', event.target.value)} 
                        rows={4} 
                        required 
                      />
                    </Field>
                  </FieldGroup>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-6">
                  <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary" /> Operational Details
                  </h3>
                  <FieldGroup>
                    {questions.map(([key, label, options]) => (
                      <Field key={key}>
                        <FieldLabel htmlFor={key}>{label}</FieldLabel>
                        <select 
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                          id={key} 
                          value={form.answers[key] || ''} 
                          onChange={(event) => updateAnswer(key, event.target.value)} 
                          required
                        >
                          <option value="" disabled>Select an answer</option>
                          {options.map((option) => <option key={option}>{option}</option>)}
                        </select>
                      </Field>
                    ))}
                  </FieldGroup>
                </div>
              )}
              
              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                    <Map className="size-5 text-primary" /> Emergency Location
                  </h3>
                  <p className="text-sm text-muted-foreground">Tap the map to set the exact location.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button type="button" variant="secondary" onClick={useMyLocation}>
                      <MapPin className="size-4 mr-2" /> Use my GPS location
                    </Button>
                    {locationMessage && <span className="text-sm text-muted-foreground">{locationMessage}</span>}
                  </div>
                  
                  <div className="h-[300px] w-full rounded-xl overflow-hidden border border-border [&_.leaflet-layer]:filter [&_.leaflet-layer]:invert [&_.leaflet-layer]:hue-rotate-180 [&_.leaflet-layer]:brightness-75 [&_.leaflet-layer]:contrast-125">
                    <TagoloanMap interactive selectedPoint={emergencyCoordinates} onLocationChange={setEmergencyCoordinates} />
                  </div>
                  
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="photo">Attach Photo (Optional)</FieldLabel>
                      <div className="flex items-center gap-2">
                        <Input 
                          id="photo" 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          capture="environment" 
                          onChange={(event) => setPhoto(event.target.files?.[0] || null)} 
                          className="file:text-foreground file:bg-secondary file:px-3 file:py-1 file:rounded-md file:border-none file:mr-4 file:cursor-pointer"
                        />
                      </div>
                    </Field>
                  </FieldGroup>
                </div>
              )}
              
              {step === 4 && (
                <div className="space-y-6">
                  <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                    <Eye className="size-5 text-primary" /> Review Summary
                  </h3>
                  <div className="grid gap-4 bg-secondary/30 rounded-xl p-5 border border-border">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Type</p>
                      <p className="text-base">{form.emergencyType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Description</p>
                      <p className="text-base">{form.description}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Coordinates</p>
                      <p className="font-mono text-sm">{emergencyCoordinates ? `${emergencyCoordinates.latitude.toFixed(5)}, ${emergencyCoordinates.longitude.toFixed(5)}` : 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}

            </form>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t border-border bg-card/50 pt-6">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>Back</Button>
            ) : <div />}
            
            {step < 4 ? (
              <Button type="button" onClick={nextStep}>Continue</Button>
            ) : (
              <Button type="submit" form="report-form" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Emergency'}
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default CitizenReport;
