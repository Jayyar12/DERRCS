import { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from 'cn';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError } from '../api/client';
import { useGeolocation } from '../hooks/useGeolocation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/common/SectionHeader';
import { OrganizationHero } from '@/components/branding/OrganizationBrand';
import { CheckCircle2, Flame, Droplets, Activity, Car, LifeBuoy, MapPin, ClipboardList, Map, Eye, AlertTriangle, X } from 'lucide-react';

const emergencyTypes = [
  { name: 'Fire', icon: Flame, color: 'text-warning' },
  { name: 'Flood', icon: Droplets, color: 'text-primary' },
  { name: 'Medical', icon: Activity, color: 'text-destructive' },
  { name: 'Road Accident', icon: Car, color: 'text-warning' },
  { name: 'Rescue', icon: LifeBuoy, color: 'text-success' }
];

const questionSets = {
  Fire: [['structureType', 'What is burning?', ['Residential', 'Commercial', 'Vegetation', 'Vehicle', 'Other']], ['peopleTrapped', 'Are people trapped?', ['Yes', 'No', 'Unknown']], ['hazardousMaterialsNearby', 'Are hazardous materials nearby?', ['Yes', 'No', 'Unknown']]],
  Flood: [['waterDepth', 'Estimated water depth', ['Below ankle', 'Knee deep', 'Waist deep', 'Above waist', 'Unknown']], ['peopleStranded', 'Are people stranded?', ['Yes', 'No', 'Unknown']]],
  Medical: [['patientConscious', 'Is the patient conscious?', ['Yes', 'No', 'Unknown']], ['breathing', 'Is the patient breathing normally?', ['Yes', 'No', 'Unknown']]],
  'Road Accident': [['vehiclesInvolved', 'Vehicles involved', ['Motorcycle', 'Car', 'Truck', 'Multiple', 'Other']], ['peopleTrapped', 'Is anyone trapped?', ['Yes', 'No', 'Unknown']]],
  Rescue: [['rescueType', 'Type of rescue needed', ['Water rescue', 'Confined space', 'Collapsed structure', 'Missing person', 'Other']], ['peopleTrapped', 'Is anyone trapped?', ['Yes', 'No', 'Unknown']]],
};

// Matches the operational boundary seeded in seeds/02-initial-seeds.sql.
const operationalBounds = { minLatitude: 8.48, maxLatitude: 8.58, minLongitude: 124.7, maxLongitude: 124.81 };

function isOperationalLocation(coordinates) {
  if (!coordinates) return false;
  const { latitude, longitude } = coordinates;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= operationalBounds.minLatitude && latitude <= operationalBounds.maxLatitude
    && longitude >= operationalBounds.minLongitude && longitude <= operationalBounds.maxLongitude;
}

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
  const [manualCoordinates, setManualCoordinates] = useState({ latitude: '', longitude: '' });
  const [locationMessage, setLocationMessage] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const submitInFlight = useRef(false);
  const locationChoiceId = useRef(0);
  const photoInputRef = useRef(null);

  const questions = useMemo(() => questionSets[form.emergencyType] || [], [form.emergencyType]);

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAnswer = (key, value) => setForm((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }));

  const { loading: geoLoading, error: geoError, requestLocation, clearLocation } = useGeolocation();
  const locationFeedback = geoLoading ? 'Getting location...' : geoError || locationMessage;

  async function handleGpsRequest() {
    const choiceId = ++locationChoiceId.current;
    setLocationMessage('');
    const gpsCoordinates = await requestLocation();
    if (!gpsCoordinates || choiceId !== locationChoiceId.current) return;
    const coords = { latitude: gpsCoordinates.lat, longitude: gpsCoordinates.lng };
    setReporterCoordinates(coords);
    if (isOperationalLocation(coords)) {
      setEmergencyCoordinates(coords);
      setManualCoordinates({ latitude: String(coords.latitude), longitude: String(coords.longitude) });
      setLocationMessage('Location attached from GPS.');
      setError('');
    } else {
      setEmergencyCoordinates(null);
      setManualCoordinates({ latitude: '', longitude: '' });
      setLocationMessage('GPS is outside Tagoloan operational bounds. Select the emergency location on the map or enter its coordinates.');
    }
  }

  function selectEmergencyLocation(coordinates, source) {
    locationChoiceId.current += 1;
    clearLocation?.();
    if (!isOperationalLocation(coordinates)) {
      setEmergencyCoordinates(null);
      setLocationMessage('Emergency location must be within Tagoloan operational bounds.');
      setError('Emergency location must be within Tagoloan operational bounds.');
      return;
    }
    setEmergencyCoordinates(coordinates);
    setManualCoordinates({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude) });
    setLocationMessage(source === 'map' ? 'Emergency location selected on the map.' : 'Entered emergency coordinates attached.');
    setError('');
  }

  function applyManualCoordinates() {
    const latitude = Number(manualCoordinates.latitude);
    const longitude = Number(manualCoordinates.longitude);
    if (!manualCoordinates.latitude.trim() || !manualCoordinates.longitude.trim()) {
      setError('Enter both latitude and longitude.');
      return;
    }
    selectEmergencyLocation({ latitude, longitude }, 'manual');
  }

  function updateManualCoordinate(key, value) {
    locationChoiceId.current += 1;
    clearLocation?.();
    setManualCoordinates((current) => ({ ...current, [key]: value }));
    setEmergencyCoordinates(null);
    setLocationMessage('Apply both coordinates to set the emergency location.');
    setError('');
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be less than 10MB.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    setError('');
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result || null);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function resetReport() {
    setStep(1);
    setForm({ emergencyType: '', description: '', answers: {} });
    setEmergencyCoordinates(null);
    setReporterCoordinates(null);
    setManualCoordinates({ latitude: '', longitude: '' });
    setLocationMessage('');
    setPhoto(null);
    setPhotoPreview(null);
    setError('');
    setConfirmation(null);
  }

  function nextStep() {
    setError('');
    if (step === 1 && !form.emergencyType) {
      setError('Please select an emergency type.');
      return;
    }
    if (step === 1 && !form.description.trim()) {
      setError('Please provide a brief description.');
      return;
    }
    if (step === 2) {
      const unanswered = questions.filter(([k]) => !form.answers[k]);
      if (unanswered.length) {
        setError('Please answer all operational questions.');
        return;
      }
    }
    if (step === 3 && !isOperationalLocation(emergencyCoordinates)) {
      setError('Select an emergency location within Tagoloan operational bounds.');
      return;
    }
    setStep((current) => current + 1);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitInFlight.current || confirmation) return;
    if (step !== 4 || questions.some(([key]) => !form.answers[key])) {
      setError('Complete each reporting step before submitting.');
      return;
    }
    if (!form.emergencyType || !form.description.trim()) {
      setError('Emergency type and description are required.');
      return;
    }
    if (!isOperationalLocation(emergencyCoordinates)) {
      setError('Select an emergency location within Tagoloan operational bounds.');
      return;
    }

    submitInFlight.current = true;
    setError('');
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

      const result = await api.submitReport(data);
      setConfirmation(result);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Unable to submit the report. Please try again.');
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center p-4">
        <OrganizationHero />
        <Card className="w-full max-w-xl text-center border-border">
          <CardContent className="pt-10 pb-8 flex flex-col items-center">
            <CheckCircle2 className="size-16 text-primary mb-4" />
            <h1 className="text-xl font-bold mb-2">Help is being coordinated.</h1>
            <p className="text-base text-muted-foreground mb-8 max-w-md">Keep yourself safe. MDRRMO will review your report with nearby submissions.</p>
            
            <div className="w-full text-left p-6 bg-secondary/30 rounded-xl mb-8 flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Tracking Identifier</p>
                <p className="font-mono text-lg">{confirmation.reportId}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Received At</p>
                <p className="text-base">{new Date(confirmation.receivedAt).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button className="flex-1 text-base" size="lg" onClick={resetReport}>
                Submit Another Report
              </Button>
              <Link
                to="/"
                onClick={resetReport}
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'flex-1 text-base')}
              >
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground pb-20">
      <PageHeader
        variant="public"
        title="Emergency Report"
        actions={<Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Agency Login</Link>}
      />
      
      <main className="mx-auto max-w-2xl px-4 py-8" id="main-content">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-primary shrink-0">Step {step} of 4</span>
              <Progress value={step * 25} aria-label="Report progress" className="flex-1" />
            </div>
            <CardTitle className="text-lg font-bold">Report an Emergency</CardTitle>
            <CardDescription className="text-sm">Move to safety first. This form alerts nearby dispatchers.</CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
            
            <form id="report-form" onSubmit={submit} className="flex flex-col gap-6">
              
              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <FieldSet>
                    <FieldLegend className="flex items-center gap-2 text-base font-semibold mb-4">
                      <AlertTriangle className="size-5 text-warning" /> What is happening?
                    </FieldLegend>
                    <ToggleGroup
                      value={form.emergencyType ? [form.emergencyType] : []}
                      onValueChange={(val) => updateForm('emergencyType', val[0] || '')}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full"
                    >
                      {emergencyTypes.map(({ name, icon: Icon, color }) => {
                        const isSelected = form.emergencyType === name;
                        return (
                          <ToggleGroupItem
                            key={name}
                            value={name}
                            variant="outline"
                            className={cn(
                              "h-auto p-4 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all cursor-pointer text-center",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40 shadow-sm"
                                : "border-border bg-card text-foreground hover:border-muted-foreground/50 hover:bg-muted/30"
                            )}
                          >
                            <Icon className={cn("size-7", isSelected ? "text-primary" : color)} />
                            <span className="text-sm font-semibold">{name}</span>
                          </ToggleGroupItem>
                        );
                      })}
                    </ToggleGroup>
                  </FieldSet>
                  
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
                <div className="flex flex-col gap-6">
                  <SectionHeader icon={ClipboardList}>
                    Operational Details
                  </SectionHeader>
                  <FieldGroup className="gap-6">
                    {questions.map(([key, label, options]) => (
                      <Field key={key}>
                        <FieldLabel htmlFor={`question-${key}`}>{label}</FieldLabel>
                        <Select
                          value={form.answers[key] || ''}
                          onValueChange={(val) => updateAnswer(key, val)}
                        >
                          <SelectTrigger id={`question-${key}`} className="w-full bg-background h-10 px-3 text-sm">
                            <SelectValue placeholder="Select an answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    ))}
                  </FieldGroup>
                </div>
              )}
              
              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <SectionHeader icon={Map}>
                    Emergency Location
                  </SectionHeader>
                  <p className="text-sm text-muted-foreground">Select the emergency location on the map, use GPS, or enter coordinates below.</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Button type="button" variant="secondary" onClick={handleGpsRequest} disabled={geoLoading}>
                      {geoLoading ? <Spinner data-icon="inline-start" /> : <MapPin data-icon="inline-start" />} Use my GPS location
                    </Button>
                    {locationFeedback && <span role="status" className="text-sm text-muted-foreground">{locationFeedback}</span>}
                  </div>
                  
                  <div className="h-[300px] md:h-[400px] w-full rounded-xl overflow-hidden border border-border [&_.leaflet-layer]:filter [&_.leaflet-layer]:invert [&_.leaflet-layer]:hue-rotate-180 [&_.leaflet-layer]:brightness-75 [&_.leaflet-layer]:contrast-125">
                    <ErrorBoundary>
                      <TagoloanMap interactive selectedPoint={emergencyCoordinates} onLocationChange={(coords) => selectEmergencyLocation(coords, 'map')} />
                    </ErrorBoundary>
                  </div>

                  <FieldGroup className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="emergency-latitude">Latitude (manual option)</FieldLabel>
                      <Input
                        id="emergency-latitude"
                        name="emergency-latitude"
                        inputMode="decimal"
                        value={manualCoordinates.latitude}
                        onChange={(event) => updateManualCoordinate('latitude', event.target.value)}
                        onBlur={applyManualCoordinates}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="emergency-longitude">Longitude (manual option)</FieldLabel>
                      <Input
                        id="emergency-longitude"
                        name="emergency-longitude"
                        inputMode="decimal"
                        value={manualCoordinates.longitude}
                        onChange={(event) => updateManualCoordinate('longitude', event.target.value)}
                        onBlur={applyManualCoordinates}
                      />
                    </Field>
                  </FieldGroup>
                  <Button type="button" variant="outline" onClick={applyManualCoordinates}>Use entered coordinates</Button>
                  
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="photo">Attach Photo (Optional)</FieldLabel>
                      <div className="flex flex-col gap-2">
                        <Input 
                          id="photo" 
                          ref={photoInputRef}
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          capture="environment" 
                          onChange={handlePhotoChange}
                          className="file:text-foreground file:bg-secondary file:px-3 file:py-1 file:rounded-md file:border-none file:mr-4 file:cursor-pointer"
                        />
                        {photoPreview && (
                          <div className="relative mt-2 w-fit">
                            <img
                              src={photoPreview}
                              alt="Emergency preview"
                              className="h-28 w-28 object-cover rounded-lg border border-border shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={removePhoto}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow hover:bg-destructive/80 transition-colors"
                              aria-label="Remove photo"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </Field>
                  </FieldGroup>
                </div>
              )}
              
              {step === 4 && (
                <div className="flex flex-col gap-6">
                  <SectionHeader icon={Eye}>
                    Review Summary
                  </SectionHeader>
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
                    {photo && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">Attached Photo</p>
                        <p className="text-sm text-foreground">{photo.name}</p>
                      </div>
                    )}
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
              <Button type="button" onClick={nextStep} disabled={step === 3 && geoLoading}>Continue</Button>
            ) : (
              <Button type="submit" form="report-form" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  'Submit Emergency'
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export default CitizenReport;
