import { useEffect, useRef, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const statusColors = { Reported: 'bg-warning text-warning-foreground', Validated: 'bg-primary text-primary-foreground', Dispatched: 'bg-secondary text-secondary-foreground', Active: 'bg-destructive text-destructive-foreground', Resolved: 'bg-success text-success-foreground', Closed: 'bg-muted text-muted-foreground' };
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
  const [alertMsg, setAlertMsg] = useState('');
  const [audibleAlerts, setAudibleAlerts] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
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
      subscribeSocket('dispatcher:candidate:new', () => { toast('Candidate activity received. Dashboard refreshed.'); loadDashboard({ quiet: true }); }),
      subscribeSocket('dispatcher:field:resolved', () => { toast('A field assessment was completed. Dashboard refreshed.'); loadDashboard({ quiet: true }); }),
      subscribeSocket('dispatcher:assignment:recommended', (payload) => setRecommendations((current) => ({ ...current, [payload.incidentId]: payload }))),
      subscribeSocket('dispatcher:incident:escalated', (payload) => {
        playEscalationTone();
        setAlertMsg(`${payload.incidentCode || 'Incident'} needs attention: ${payload.status} has exceeded its response threshold.`);
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
    } catch (requestError) { setError(requestError.message); }
  }

  async function confirmCandidate() {
    if (!selected) return;
    try {
      const result = await api.confirmCandidate(selected.id);
      setSelected((current) => ({ ...current, status: 'Confirmed', incident_id: result.incidentId, incident_code: result.incidentCode, incident_status: result.status }));
      toast.success(`${result.incidentCode} was validated. Await the live allocation recommendation or choose an available unit.`);
      loadDashboard({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
  }

  async function assignUnit(event) {
    event.preventDefault();
    if (!selected?.incident_id || !selectedUnitId) return;
    try {
      await api.assign(selected.incident_id, selectedUnitId, notes);
      toast.success('Response unit dispatched and notified.');
      setSelected(null);
      loadDashboard({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
  }

  async function closeIncident(incidentId) {
    try { await api.closeIncident(incidentId); toast.success('Incident closed after review.'); loadDashboard({ quiet: true }); }
    catch (requestError) { setError(requestError.message); }
  }

  const markers = [
    ...candidates
      .filter((c) => c.center_location?.coordinates?.length >= 2)
      .map((candidate) => ({
        id: `candidate-${candidate.id}`,
        latitude: candidate.center_location.coordinates[1],
        longitude: candidate.center_location.coordinates[0],
        title: `${candidate.emergency_type} candidate`,
        description: `${candidate.report_count} reports — Pending review`,
        color: '#f59e0b',
        selected: selected?.id === candidate.id,
        candidateId: candidate.id,
      })),
    ...incidents
      .filter((i) => i.location?.coordinates?.length >= 2)
      .map((incident) => ({
        id: `incident-${incident.id}`,
        latitude: incident.location.coordinates[1],
        longitude: incident.location.coordinates[0],
        title: incident.incident_code,
        description: `${incident.emergency_type} — ${incident.status}`,
        color: statusColors[incident.status]?.includes('primary')
          ? '#2563eb'
          : statusColors[incident.status]?.includes('warning')
          ? '#f59e0b'
          : '#dc2626',
        incidentId: incident.id,
      })),
  ];
  const recommendation = selected?.incident_id ? recommendations[selected.incident_id] : null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-card px-4 py-3 shadow-sm sm:px-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-warning">TAGOLOAN MDRRMO</p>
          <h1 className="text-xl font-bold">Dispatcher Command Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          {session?.role === 'Admin' && <a className="text-sm underline text-muted-foreground" href="/admin">Admin panel</a>}
          <Button variant="outline" size="sm" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>
            Sign out
          </Button>
        </div>
      </header>

      {alertMsg && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertTitle>Escalation alert</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {alertMsg}
            <Button variant="outline" size="sm" onClick={() => setAlertMsg('')}>Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <main className="flex-1 overflow-hidden" id="dashboard-main">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={70} minSize={50} className="relative h-full overflow-hidden">
            <TagoloanMap className="h-full w-full absolute inset-0" markers={markers} onMarkerSelect={(marker) => marker.candidateId && openCandidate(marker.candidateId)} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={30} minSize={25} className="bg-muted/30">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-6 p-4">
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-lg">Candidate Review</CardTitle>
                    <Button variant="link" size="sm" onClick={() => loadDashboard()}>Refresh</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox id="audible" checked={audibleAlerts} onCheckedChange={(checked) => enableAudibleAlerts(checked)} />
                      <label htmlFor="audible" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Play a brief tone for escalations
                      </label>
                    </div>

                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading live candidates…</p>
                    ) : candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending candidate clusters.</p>
                    ) : (
                      <div className="grid gap-3">
                        {candidates.map((candidate) => (
                          <div 
                            key={candidate.id} 
                            className="rounded-lg border p-3 hover:border-primary cursor-pointer transition-colors"
                            onClick={() => openCandidate(candidate.id)}
                          >
                            <strong className="block">{candidate.emergency_type}</strong>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {candidate.report_count} report{candidate.report_count === 1 ? '' : 's'} &middot; {formatDate(candidate.created_at)}
                            </span>
                            <span className="mt-2 block text-sm line-clamp-2">
                              {candidate.latest_summary || 'Summary is being prepared.'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Incident Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {incidents.slice(0, 8).map((incident) => (
                        <div className="rounded-lg border p-3" key={incident.id}>
                          <div className="flex items-start justify-between gap-2">
                            <strong className="text-sm">{incident.incident_code}</strong>
                            <Badge className={statusColors[incident.status]}>{incident.status}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {incident.emergency_type} &middot; {incident.report_count || 0} reports
                          </p>
                          {incident.status === 'Resolved' && (
                            <Button variant="link" size="sm" className="px-0 mt-2 h-auto" onClick={() => closeIncident(incident.id)}>
                              Close after review
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <Sheet open={!!selected} onOpenChange={(isOpen) => !isOpen && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2 text-warning border-warning">{selected.status}</Badge>
                    <SheetTitle className="text-2xl">{selected.emergency_type} Candidate</SheetTitle>
                  </div>
                </div>
                <SheetDescription className="text-base text-foreground mt-4">
                  {selected.latest_summary || 'No AI summary is available yet. Review the report details below.'}
                </SheetDescription>
                {selected.summary_is_fallback && (
                  <Alert variant="warning" className="mt-3 bg-warning/10 border-warning/20">
                    <AlertDescription className="text-warning-foreground">Template fallback summary in use.</AlertDescription>
                  </Alert>
                )}
              </SheetHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold mb-3">Individual Submissions ({selected.reports.length})</h3>
                  <div className="grid gap-3">
                    {selected.reports.map((report) => (
                      <Card key={report.id}>
                        <CardContent className="p-4">
                          <p className="text-sm">{report.description || 'No narrative supplied.'}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDate(report.created_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selected.status === 'Pending' && (
                  <Button className="w-full" size="lg" onClick={confirmCandidate}>Validate Incident</Button>
                )}

                {selected.incident_status === 'Validated' && (
                  <Card className="border-primary bg-primary/5">
                    <CardHeader>
                      <CardTitle>Resource Dispatch</CardTitle>
                      {recommendation && (
                        <CardDescription className="text-primary mt-2">
                          Algorithm recommendation: <strong>{recommendation.unitCode || recommendation.recommendedUnitId}</strong> &middot; estimated {recommendation.estimatedTravelTimeMinutes} minutes. Dispatcher confirmation is required.
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={assignUnit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Response Unit</label>
                          <Select value={selectedUnitId} onValueChange={setSelectedUnitId} required>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Choose an available unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.unit_code} &middot; {unit.unit_type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Dispatch Notes (optional)</label>
                          <Textarea className="bg-background" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
                        </div>
                        
                        <Button type="submit" variant="destructive" className="w-full font-bold">Confirm Dispatch</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default DispatcherDashboard;
