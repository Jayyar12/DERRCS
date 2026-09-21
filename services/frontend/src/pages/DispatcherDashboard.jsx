import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';
import { IncidentReviewSheet } from '../features/incident-review';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from '@/components/layout/AppHeader';

const statusColors = {
  Reported: 'bg-warning text-warning-foreground',
  Validated: 'bg-primary text-primary-foreground',
  Dispatched: 'bg-secondary text-secondary-foreground',
  Active: 'bg-destructive text-destructive-foreground',
  Resolved: 'bg-success text-success-foreground',
  Closed: 'bg-muted text-muted-foreground',
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

function parseReviewParam(reviewParam) {
  if (!reviewParam || typeof reviewParam !== 'string') return null;
  if (reviewParam.startsWith('candidate:')) {
    const id = reviewParam.slice('candidate:'.length).trim();
    return id ? { kind: 'candidate', id } : null;
  }
  if (reviewParam.startsWith('incident:')) {
    const id = reviewParam.slice('incident:'.length).trim();
    return id ? { kind: 'incident', id } : null;
  }
  return null;
}

function DispatcherDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [rawReports, setRawReports] = useState([]);
  const [alertMsg, setAlertMsg] = useState('');
  const [audibleAlerts, setAudibleAlerts] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const audioContextRef = useRef(null);
  const session = getSession();

  const selection = useMemo(() => {
    return parseReviewParam(searchParams.get('review'));
  }, [searchParams]);

  const loadDashboard = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [nextCandidates, nextIncidents, nextReports] = await Promise.all([
        api.candidates(),
        api.incidents(),
        api.reports(),
      ]);
      setCandidates(nextCandidates);
      setIncidents(nextIncidents);
      setRawReports(nextReports);
      setError('');
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to load the command dashboard.'
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const cleanup = [
      subscribeSocket('dispatcher:report:new', () => {
        loadDashboard({ quiet: true });
      }),
      subscribeSocket('dispatcher:candidate:new', () => {
        toast('Candidate activity received. Dashboard refreshed.');
        loadDashboard({ quiet: true });
      }),
      subscribeSocket('dispatcher:field:resolved', () => {
        toast('A field assessment was completed. Dashboard refreshed.');
        loadDashboard({ quiet: true });
      }),
      subscribeSocket('dispatcher:incident:escalated', (payload) => {
        playEscalationTone();
        setAlertMsg(
          `${payload.incidentCode || 'Incident'} needs attention: ${payload.status} has exceeded its response threshold.`
        );
        loadDashboard({ quiet: true });
      }),
    ];
    return () => cleanup.forEach((unsubscribe) => unsubscribe());
  }, [loadDashboard]);

  useEffect(() => () => audioContextRef.current?.close(), []);

  const openCandidate = useCallback(
    (candidateId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('review', `candidate:${candidateId}`);
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const openIncident = useCallback(
    (incidentId) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('review', `incident:${incidentId}`);
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const handleSelectionChange = useCallback(
    (nextSelection) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!nextSelection) {
            next.delete('review');
          } else {
            next.set('review', `${nextSelection.kind}:${nextSelection.id}`);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const markers = useMemo(() => [
    ...rawReports
      .filter((r) => r.latitude && r.longitude)
      .map((report) => ({
        id: `report-${report.id}`,
        latitude: report.latitude,
        longitude: report.longitude,
        title: 'Unverified Report',
        description: report.emergency_type,
        color: '#9ca3af',
        reportId: report.id,
      })),
    ...candidates
      .filter((c) => c.center_location?.coordinates?.length >= 2)
      .map((candidate) => ({
        id: `candidate-${candidate.id}`,
        latitude: candidate.center_location.coordinates[1],
        longitude: candidate.center_location.coordinates[0],
        title: `${candidate.emergency_type} candidate`,
        description: `${candidate.report_count} reports — Pending review`,
        color: '#f59e0b',
        selected: selection?.kind === 'candidate' && selection?.id === candidate.id,
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
        selected: selection?.kind === 'incident' && selection?.id === incident.id,
        incidentId: incident.id,
      })),
  ], [rawReports, candidates, incidents, selection]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <AppHeader
        title="Dispatcher Command Dashboard"
        actions={(
          <>
            {session?.role === 'Admin' && (
              <a className="text-sm underline text-muted-foreground" href="/admin">
                Admin panel
              </a>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                disconnectSocket();
                clearSession();
                window.location.assign('/login');
              }}
            >
              Sign out
            </Button>
          </>
        )}
      />

      {alertMsg && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertTitle>Escalation alert</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {alertMsg}
            <Button variant="outline" size="sm" onClick={() => setAlertMsg('')}>
              Dismiss
            </Button>
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
            <TagoloanMap
              className="h-full w-full absolute inset-0"
              markers={markers}
              onMarkerSelect={(marker) => {
                if (marker.candidateId) openCandidate(marker.candidateId);
                else if (marker.incidentId) openIncident(marker.incidentId);
              }}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={30} minSize={25} className="bg-muted/30">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-6 p-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-lg">Candidate Review</CardTitle>
                    <Button variant="link" size="sm" onClick={() => loadDashboard()}>
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="audible"
                        checked={audibleAlerts}
                        onCheckedChange={(checked) => enableAudibleAlerts(checked)}
                      />
                      <label
                        htmlFor="audible"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
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
                            role="button"
                            tabIndex={0}
                            className={`rounded-lg border p-3 hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              selection?.kind === 'candidate' && selection?.id === candidate.id
                                ? 'border-primary ring-1 ring-primary'
                                : ''
                            }`}
                            onClick={() => openCandidate(candidate.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openCandidate(candidate.id);
                              }
                            }}
                          >
                            <strong className="block">{candidate.emergency_type}</strong>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {candidate.report_count} report
                              {candidate.report_count === 1 ? '' : 's'} &middot;{' '}
                              {formatDate(candidate.created_at)}
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
                    {incidents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active incidents.</p>
                    ) : (
                      <div className="grid gap-3">
                        {incidents.map((incident) => (
                          <div
                            key={incident.id}
                            role="button"
                            tabIndex={0}
                            className={`rounded-lg border p-3 hover:border-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              selection?.kind === 'incident' && selection?.id === incident.id
                                ? 'border-primary ring-1 ring-primary'
                                : ''
                            }`}
                            onClick={() => openIncident(incident.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openIncident(incident.id);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <strong className="text-sm">{incident.incident_code}</strong>
                              <Badge className={statusColors[incident.status]}>
                                {incident.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {incident.emergency_type} &middot; {incident.report_count || 0} reports
                            </p>
                            <span className="mt-2 text-xs text-primary font-medium inline-block">
                              Review details &rarr;
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <IncidentReviewSheet
        selection={selection}
        role={session?.role}
        onSelectionChange={handleSelectionChange}
        onCommitted={() => loadDashboard({ quiet: true })}
      />
    </div>
  );
}

export default DispatcherDashboard;
