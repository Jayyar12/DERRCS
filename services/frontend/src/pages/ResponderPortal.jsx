import { useEffect, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

import { FieldSet, FieldLegend } from "@/components/ui/field"

const injuryOptions = ['Laceration', 'Suspected fracture', 'Burn', 'Head trauma', 'Respiratory distress', 'Other'];
const interventionOptions = ['Wound dressing', 'Cervical collar', 'Splinting', 'CPR', 'Oxygen therapy', 'Other'];
const dispositions = ['TreatedOnScene', 'TransportedHealthCenter', 'TransportedNMMC', 'RefusedCare', 'Deceased'];

function Checklist({ label, options, values, onChange }) {
  return (
    <FieldSet className="mt-6">
      <FieldLegend>{label}</FieldLegend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label className="flex items-center gap-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-card" key={option}>
            <Checkbox 
              checked={values.includes(option)} 
              onCheckedChange={(checked) => onChange(checked ? [...values, option] : values.filter((value) => value !== option))} 
              className="size-5"
            />
            <span className="text-sm font-medium">{option}</span>
          </label>
        ))}
      </div>
    </FieldSet>
  );
}

function ResponderPortal() {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ patientName: '', approximateAge: '', gender: '', consciousnessLevel: '', injuriesObserved: [], interventionsRendered: [], disposition: '', destinationFacility: '', notes: '' });
  const session = getSession();

  async function loadAssignment({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    try { setAssignment(await api.currentAssignment()); setError(''); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the current dispatch.'); }
    finally { if (!quiet) setLoading(false); }
  }

  useEffect(() => { loadAssignment(); }, []);
  useEffect(() => subscribeSocket('unit:dispatch:alert', () => { toast('A dispatch update was received.'); loadAssignment({ quiet: true }); }), []);

  async function updateStatus(status) {
    if (!assignment) return;
    setSaving(true); setError('');
    try {
      await api.updateAssignmentStatus(assignment.assignment_id, status);
      toast.success(status === 'EnRoute' ? 'Unit marked En Route.' : 'Arrival recorded. You may now submit the field assessment.');
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
      toast.success('Field assessment saved. The incident is now resolved.');
      setIsDrawerOpen(false);
      await loadAssignment({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  const location = assignment?.location?.coordinates;
  const status = assignment?.assignment_status;
  const onScene = assignment?.incident_status === 'Active' && status === 'OnScene';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 sm:pb-0">
      <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3 shadow-sm sm:px-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-warning">TAGOLOAN MDRRMO</p>
          <h1 className="text-xl font-bold">Response Unit Field Portal</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium hidden sm:inline">{session?.fullName || 'Response unit'}</span>
          <Button variant="outline" size="sm" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" id="responder-main">
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-muted-foreground animate-pulse">Loading dispatch…</p>
        ) : !assignment ? (
          <Card className="text-center py-10 shadow-sm border-dashed">
            <CardHeader>
              <CardTitle className="text-2xl">No active dispatch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Keep this page open. A new assignment will appear here in real time.</p>
            </CardContent>
            <CardFooter className="justify-center pt-2">
              <Button size="lg" onClick={() => loadAssignment()}>Check again</Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card className="shadow-sm">
              <CardContent className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                  <div>
                    <Badge variant="outline" className="text-destructive border-destructive mb-2">{assignment.incident_status}</Badge>
                    <h2 className="text-3xl font-bold">{assignment.incident_code}</h2>
                    <p className="mt-1 text-muted-foreground">{assignment.emergency_type} &middot; {assignment.severity} severity</p>
                  </div>
                  <Badge className="text-base py-1 px-3">Unit: {status}</Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Caller notes</h3>
                  {assignment.caller_notes?.length ? (
                    <ul className="grid gap-2">
                      {assignment.caller_notes.map((note) => (
                        <li className="rounded-lg bg-muted p-3 text-sm" key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No caller notes provided.</p>
                  )}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  {['Dispatched', 'Acknowledged'].includes(status) && (
                    <Button size="lg" className="w-full text-lg py-8 font-bold bg-primary hover:bg-primary/90" disabled={saving} onClick={() => updateStatus('EnRoute')}>
                      Mark En Route
                    </Button>
                  )}
                  {['Dispatched', 'Acknowledged', 'EnRoute'].includes(status) && (
                    <Button size="lg" className="w-full text-lg py-8 font-bold bg-destructive hover:bg-destructive/90" disabled={saving} onClick={() => updateStatus('OnScene')}>
                      Arrived on Scene
                    </Button>
                  )}
                </div>

                {onScene && (
                  <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerTrigger asChild>
                      <Button size="lg" className="w-full mt-6 text-lg py-8 font-bold bg-success hover:bg-success/90 text-success-foreground">
                        Complete Field Assessment
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[96svh]">
                      <ScrollArea className="overflow-auto">
                        <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
                          <DrawerHeader className="px-0 pt-0 text-left">
                            <DrawerTitle className="text-2xl">Field Casualty Assessment</DrawerTitle>
                            <DrawerDescription>Complete the pre-hospital care report to resolve this incident.</DrawerDescription>
                          </DrawerHeader>
                          
                          <form className="mt-4 pb-10" onSubmit={submitAssessment}>
                            <div className="grid gap-6 sm:grid-cols-2">
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="patient-name">Patient name or identity</FieldLabel>
                                  <Input id="patient-name" autoComplete="name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor="patient-age">Approximate age</FieldLabel>
                                  <Input id="patient-age" type="number" min="0" max="130" inputMode="numeric" value={form.approximateAge} onChange={(e) => setForm({ ...form, approximateAge: e.target.value })} />
                                </Field>
                              </FieldGroup>
                              <FieldGroup>
                                <Field>
                                  <FieldLabel>Gender</FieldLabel>
                                  <Select value={form.gender || 'none'} onValueChange={(val) => setForm({ ...form, gender: val === 'none' ? '' : val })}>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Not recorded" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Not recorded</SelectItem>
                                      <SelectItem value="Male">Male</SelectItem>
                                      <SelectItem value="Female">Female</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </Field>
                                <Field>
                                  <FieldLabel>Consciousness (AVPU)</FieldLabel>
                                  <Select value={form.consciousnessLevel || 'none'} onValueChange={(val) => setForm({ ...form, consciousnessLevel: val === 'none' ? '' : val })}>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Not recorded" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Not recorded</SelectItem>
                                      {['Alert', 'Verbal', 'Pain', 'Unresponsive'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </FieldGroup>
                            </div>

                            <Checklist label="Injuries observed" options={injuryOptions} values={form.injuriesObserved} onChange={(injuriesObserved) => setForm({ ...form, injuriesObserved })} />
                            <Checklist label="Interventions rendered" options={interventionOptions} values={form.interventionsRendered} onChange={(interventionsRendered) => setForm({ ...form, interventionsRendered })} />

                            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                              <FieldGroup>
                                <Field>
                                  <FieldLabel>Disposition *</FieldLabel>
                                  <Select value={form.disposition} onValueChange={(val) => setForm({ ...form, disposition: val })} required>
                                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select disposition" /></SelectTrigger>
                                    <SelectContent>
                                      {dispositions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              </FieldGroup>
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="destination">Destination facility</FieldLabel>
                                  <Input id="destination" value={form.destinationFacility} onChange={(e) => setForm({ ...form, destinationFacility: e.target.value })} />
                                </Field>
                              </FieldGroup>
                            </div>

                            <div className="mt-6">
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="assessment-notes">Notes</FieldLabel>
                                  <Textarea id="assessment-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                                </Field>
                              </FieldGroup>
                            </div>

                            <DrawerFooter className="px-0 mt-8">
                              <Button size="lg" className="w-full py-6 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground" disabled={saving} type="submit">
                                {saving ? 'Saving assessment…' : 'Submit Assessment and Resolve'}
                              </Button>
                            </DrawerFooter>
                          </form>
                        </div>
                      </ScrollArea>
                    </DrawerContent>
                  </Drawer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Emergency location</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {location ? `${location[1].toFixed(5)}, ${location[0].toFixed(5)}` : 'Location unavailable'}
                </p>
                {location && (
                  <div className="h-80 overflow-hidden rounded-xl border">
                    <TagoloanMap selectedPoint={{ latitude: location[1], longitude: location[0] }} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default ResponderPortal;
