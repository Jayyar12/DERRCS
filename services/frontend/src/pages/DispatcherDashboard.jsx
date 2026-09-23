import { useRef, useState, useMemo } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { clearSession, getSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { IncidentReviewSheet } from '../features/incident-review';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppHeader } from '@/components/layout/AppHeader';

import { useIncidentData } from '../hooks/useIncidentData';
import { useIncidentReview } from '../hooks/useIncidentReview';
import { useSocketEvent } from '../hooks/useSocketEvent';

import { AudioAlertManager } from '../features/dispatcher/components/AudioAlertManager';
import { CandidateReviewPanel } from '../features/dispatcher/components/CandidateReviewPanel';
import { IncidentStatusPanel } from '../features/dispatcher/components/IncidentStatusPanel';

const statusColors = {
  Reported: 'bg-warning text-warning-foreground',
  Validated: 'bg-primary text-primary-foreground',
  Dispatched: 'bg-secondary text-secondary-foreground',
  Active: 'bg-destructive text-destructive-foreground',
  Resolved: 'bg-success text-success-foreground',
  Closed: 'bg-muted text-muted-foreground',
};

function DispatcherDashboard() {
  const [alertMsg, setAlertMsg] = useState('');
  const [audibleAlerts, setAudibleAlerts] = useState(false);
  
  const audioManagerRef = useRef(null);
  const session = getSession();

  const { candidates, incidents, rawReports, loading, error, refresh } = useIncidentData();
  const { selection, openCandidate, openIncident, clearSelection } = useIncidentReview();

  useSocketEvent('dispatcher:report:new', () => {
    refresh();
  });

  useSocketEvent('dispatcher:candidate:new', () => {
    toast('Candidate activity received. Dashboard refreshed.');
    refresh();
  });

  useSocketEvent('dispatcher:field:resolved', () => {
    toast('A field assessment was completed. Dashboard refreshed.');
    refresh();
  });

  useSocketEvent('dispatcher:incident:escalated', (payload) => {
    audioManagerRef.current?.playEscalationTone();
    setAlertMsg(
      `${payload.incidentCode || 'Incident'} needs attention: ${payload.status} has exceeded its response threshold.`
    );
    refresh();
  });

  const handleSelectionChange = (nextSelection) => {
    if (!nextSelection) {
      clearSelection();
    } else if (nextSelection.kind === 'candidate') {
      openCandidate(nextSelection.id);
    } else if (nextSelection.kind === 'incident') {
      openIncident(nextSelection.id);
    }
  };

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
        selected: selection?.type === 'candidate' && selection?.id === candidate.id,
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
        selected: selection?.type === 'incident' && selection?.id === incident.id,
        incidentId: incident.id,
      })),
  ], [rawReports, candidates, incidents, selection]);

  // Adjust selection object to match what IncidentReviewSheet expects (kind instead of type)
  const normalizedSelection = selection ? { kind: selection.type, id: selection.id } : null;

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
          <AlertDescription>{error.message || error}</AlertDescription>
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
                <CandidateReviewPanel
                  candidates={candidates}
                  loading={loading}
                  selection={normalizedSelection}
                  openCandidate={openCandidate}
                  onRefresh={() => refresh()}
                >
                  <AudioAlertManager
                    ref={audioManagerRef}
                    audibleAlerts={audibleAlerts}
                    setAudibleAlerts={setAudibleAlerts}
                  />
                </CandidateReviewPanel>

                <IncidentStatusPanel
                  incidents={incidents}
                  loading={loading}
                  selection={normalizedSelection}
                  openIncident={openIncident}
                />
              </div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      <IncidentReviewSheet
        selection={normalizedSelection}
        role={session?.role}
        onSelectionChange={handleSelectionChange}
        onCommitted={() => refresh()}
      />
    </div>
  );
}

export default DispatcherDashboard;
