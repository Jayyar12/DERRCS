import { useCallback, useEffect, useRef, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket } from '../api/socket';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { toast } from "sonner"
import { LifeBuoy, Navigation } from "lucide-react"

import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ActiveDispatchCard } from '../features/responder/components/ActiveDispatchCard';
import { ResponderActionButtons } from '../features/responder/components/ResponderActionButtons';
import { FieldAssessmentDrawer } from '../features/responder/components/FieldAssessmentDrawer';

function ResponderPortal() {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [form, setForm] = useState({ patientName: '', approximateAge: '', gender: '', consciousnessLevel: '', injuriesObserved: [], interventionsRendered: [], disposition: '', destinationFacility: '', notes: '' });
  const savingRef = useRef(false);
  const loadControllerRef = useRef(null);
  const session = getSession();

  const loadAssignment = useCallback(async ({ quiet = false } = {}) => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    if (!quiet) setLoading(true);
    try {
      const current = await api.currentAssignment({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setAssignment(current);
      setLastUpdated(new Date());
      setError('');
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(requestError instanceof ApiError ? requestError.message : 'Unable to load the current dispatch.');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (loadControllerRef.current === controller) loadControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    loadAssignment();
    return () => loadControllerRef.current?.abort();
  }, [loadAssignment]);

  useSocketEvent('unit:dispatch:alert', () => {
    toast('A dispatch update was received.');
    loadAssignment({ quiet: true });
  });

  async function updateStatus(status) {
    const allowed = status === 'EnRoute'
      ? ['Dispatched', 'Acknowledged']
      : status === 'OnScene'
        ? ['Dispatched', 'Acknowledged', 'EnRoute']
        : [];
    if (savingRef.current || !assignment || !allowed.includes(assignment.assignment_status)) return;
    savingRef.current = true;
    setSaving(true); setError('');
    try {
      await api.updateAssignmentStatus(assignment.assignment_id, status);
      toast.success(status === 'EnRoute' ? 'Unit marked En Route.' : 'Arrival recorded. You may now submit the field assessment.');
      await loadAssignment({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
    finally { savingRef.current = false; setSaving(false); }
  }

  async function submitAssessment(event) {
    event.preventDefault();
    if (savingRef.current || assignment?.incident_status !== 'Active' || assignment?.assignment_status !== 'OnScene') return;
    if (!form.disposition) {
      const message = 'A disposition must be selected to complete the casualty assessment.';
      setAssessmentError(message);
      toast.error(message);
      return;
    }

    savingRef.current = true;
    setSaving(true); setError(''); setAssessmentError('');
    try {
      await api.submitAssessment(assignment.incident_id, { ...form, approximateAge: form.approximateAge ? Number(form.approximateAge) : null, assignmentId: assignment.assignment_id });
      toast.success('Field assessment saved. The incident is now resolved.');
      setIsDrawerOpen(false);
      // Reset form
      setForm({ patientName: '', approximateAge: '', gender: '', consciousnessLevel: '', injuriesObserved: [], interventionsRendered: [], disposition: '', destinationFacility: '', notes: '' });
      await loadAssignment({ quiet: true });
    } catch (requestError) { setAssessmentError(requestError instanceof ApiError ? requestError.message : 'Unable to save the field assessment.'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  const location = assignment?.location?.coordinates;
  const status = assignment?.assignment_status;
  const onScene = assignment?.incident_status === 'Active' && status === 'OnScene';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 sm:pb-0">
      <PageHeader
        title="Response Unit Field Portal"
        actions={(
          <>
            <span className="hidden items-center gap-1.5 text-xs text-success font-medium sm:flex" role="status">
              <span className="size-2 rounded-full bg-success animate-pulse" />
              Live
            </span>
            <span className="text-sm font-medium hidden sm:inline">{session?.fullName || 'Response unit'}</span>
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

      <PageContainer maxWidth="5xl">
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" role="status" aria-label="Loading dispatch">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        ) : !assignment ? (
          <Empty className="border border-dashed py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LifeBuoy />
              </EmptyMedia>
              <EmptyTitle>No active dispatch</EmptyTitle>
              <EmptyDescription>
                Keep this page open. A new assignment will appear here in real time.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="lg" onClick={() => loadAssignment()}>Check again</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <ActiveDispatchCard assignment={assignment} status={status}>
              <ResponderActionButtons status={status} saving={saving} updateStatus={updateStatus} />
              {onScene && (
                <FieldAssessmentDrawer 
                  isOpen={isDrawerOpen} 
                  setIsOpen={setIsDrawerOpen}
                  form={form}
                  setForm={setForm}
                  submitAssessment={submitAssessment}
                  saving={saving}
                  error={assessmentError}
                />
              )}
              {lastUpdated && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Last updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </ActiveDispatchCard>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Emergency location</CardTitle>
              </CardHeader>
              <CardContent>
                {location ? (
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-mono text-muted-foreground">
                      {`${location[1].toFixed(5)}, ${location[0].toFixed(5)}`}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${location[1]},${location[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Navigation className="size-3.5" />
                      Directions
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">Location unavailable</p>
                )}
                {location && (
                  <div className="h-80 overflow-hidden rounded-xl border">
                    <ErrorBoundary>
                      <TagoloanMap selectedPoint={{ latitude: location[1], longitude: location[0] }} />
                    </ErrorBoundary>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export default ResponderPortal;
