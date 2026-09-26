import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TagoloanMap from '../components/map/TagoloanMap';
import { clearSession, getSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { IncidentReviewSheet } from '../features/incident-review';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from '@/components/layout/PageHeader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useIncidentData } from '../hooks/useIncidentData';
import { useIncidentReview } from '../hooks/useIncidentReview';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useMapMarkers } from '../hooks/useMapMarkers';

import { AudioAlertManager } from '../features/dispatcher/components/AudioAlertManager';
import { CandidateReviewPanel } from '../features/dispatcher/components/CandidateReviewPanel';
import { IncidentStatusPanel } from '../features/dispatcher/components/IncidentStatusPanel';
import { MobileTabBar } from '../features/dispatcher/components/MobileTabBar';

function useDashboardViewport() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}

function DispatcherDashboard() {
  const [alertMsg, setAlertMsg] = useState('');
  const [audibleAlerts, setAudibleAlerts] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  const { isMobile, isTablet } = useDashboardViewport();
  
  const audioManagerRef = useRef(null);
  const session = getSession();

  const { candidates, incidents, rawReports, loading, refreshing, error, refresh } = useIncidentData();
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

  const markers = useMapMarkers({
    rawReports,
    candidates,
    incidents,
    selection,
  });

  // Adjust selection object to match what IncidentReviewSheet expects (kind instead of type)
  const normalizedSelection = selection ? { kind: selection.type, id: selection.id } : null;

  function handleSignOut() {
    disconnectSocket();
    clearSession();
    window.location.assign('/login');
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <PageHeader
        title="Dispatcher Command Dashboard"
        actions={(
          <>
            {session?.role === 'Admin' && (
              <Link className="text-sm underline text-muted-foreground hover:text-foreground" to="/admin">
                Admin panel
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign out
            </Button>
          </>
        )}
      />

      <div className="shrink-0 border-b border-border bg-card px-4 py-2 sm:px-6">
        <AudioAlertManager
          ref={audioManagerRef}
          audibleAlerts={audibleAlerts}
          setAudibleAlerts={setAudibleAlerts}
        />
      </div>

      {alertMsg && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 shrink-0">
          <AlertTitle>Escalation alert</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{alertMsg}</span>
            <Button variant="outline" size="sm" onClick={() => setAlertMsg('')}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="m-4 shrink-0">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message || error}</AlertDescription>
        </Alert>
      )}

      {/* Responsive layout: Desktop (ResizablePanelGroup) vs Mobile (Tabbed flow) */}
      <main className="flex-1 overflow-hidden relative" id="main-content" tabIndex={-1}>
        {isMobile ? (
          <div className="h-full flex flex-col pb-16">
            {activeTab === 'map' && (
              <div className="relative flex-1 w-full h-full overflow-hidden">
                <ErrorBoundary>
                  <TagoloanMap
                    className="h-full w-full absolute inset-0"
                    markers={markers}
                    onMarkerSelect={(marker) => {
                      if (marker.candidateId) openCandidate(marker.candidateId);
                      else if (marker.incidentId) openIncident(marker.incidentId);
                    }}
                  />
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
                <ErrorBoundary>
                  <CandidateReviewPanel
                    candidates={candidates}
                    loading={loading}
                    refreshing={refreshing}
                    selection={normalizedSelection}
                    openCandidate={openCandidate}
                    onRefresh={() => refresh()}
                  />
                </ErrorBoundary>
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
                <ErrorBoundary>
                  <IncidentStatusPanel
                    incidents={incidents}
                    loading={loading}
                    selection={normalizedSelection}
                    openIncident={openIncident}
                  />
                </ErrorBoundary>
              </div>
            )}

            <MobileTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              candidateCount={candidates.length}
              incidentCount={incidents.length}
            />
          </div>
        ) : isTablet ? (
          <div className="relative h-full w-full overflow-hidden">
            <ErrorBoundary>
              <TagoloanMap
                className="h-full w-full absolute inset-0"
                markers={markers}
                onMarkerSelect={(marker) => {
                  if (marker.candidateId) openCandidate(marker.candidateId);
                  else if (marker.incidentId) openIncident(marker.incidentId);
                }}
              />
            </ErrorBoundary>

            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-4 z-10 shadow-md bg-card/90 backdrop-blur"
              onClick={() => setTabletSidebarOpen(true)}
            >
              Open reports and incidents
            </Button>

            <Sheet open={tabletSidebarOpen} onOpenChange={setTabletSidebarOpen}>
              <SheetContent aria-label="Reports and incidents" className="w-[420px] sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Reports and incidents</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <ErrorBoundary>
                    <CandidateReviewPanel
                      candidates={candidates}
                      loading={loading}
                      refreshing={refreshing}
                      selection={normalizedSelection}
                      openCandidate={openCandidate}
                      onRefresh={() => refresh()}
                    />
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <IncidentStatusPanel
                      incidents={incidents}
                      loading={loading}
                      selection={normalizedSelection}
                      openIncident={openIncident}
                    />
                  </ErrorBoundary>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={70} minSize={50} className="relative h-full overflow-hidden">
              <ErrorBoundary>
                <TagoloanMap
                  className="h-full w-full absolute inset-0"
                  markers={markers}
                  onMarkerSelect={(marker) => {
                    if (marker.candidateId) openCandidate(marker.candidateId);
                    else if (marker.incidentId) openIncident(marker.incidentId);
                  }}
                />
              </ErrorBoundary>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={30} minSize={25} className="bg-muted/30">
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-6 p-4">
                  <ErrorBoundary>
                    <CandidateReviewPanel
                      candidates={candidates}
                      loading={loading}
                      refreshing={refreshing}
                      selection={normalizedSelection}
                      openCandidate={openCandidate}
                      onRefresh={() => refresh()}
                    />
                  </ErrorBoundary>

                  <ErrorBoundary>
                    <IncidentStatusPanel
                      incidents={incidents}
                      loading={loading}
                      selection={normalizedSelection}
                      openIncident={openIncident}
                    />
                  </ErrorBoundary>
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      <ErrorBoundary resetKey={normalizedSelection ? `${normalizedSelection.kind}:${normalizedSelection.id}` : 'closed'}>
        <IncidentReviewSheet
          selection={normalizedSelection}
          role={session?.role}
          onSelectionChange={handleSelectionChange}
          onCommitted={() => refresh()}
        />
      </ErrorBoundary>
    </div>
  );
}

export default DispatcherDashboard;
