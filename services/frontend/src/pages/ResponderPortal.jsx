import { useEffect, useState } from 'react';
import TagoloanMap from '../components/map/TagoloanMap';
import { api, ApiError, clearSession, getSession } from '../api/client';
import { disconnectSocket, subscribeSocket } from '../api/socket';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { toast } from "sonner"
import { LifeBuoy } from "lucide-react"

import { AppHeader } from '@/components/layout/AppHeader';
import { ActiveDispatchCard } from '../features/responder/components/ActiveDispatchCard';
import { ResponderActionButtons } from '../features/responder/components/ResponderActionButtons';
import { FieldAssessmentDrawer } from '../features/responder/components/FieldAssessmentDrawer';

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
    if (!form.disposition) {
      toast.error('A disposition must be selected to complete the casualty assessment.');
      return;
    }

    setSaving(true); setError('');
    try {
      await api.submitAssessment(assignment.incident_id, { ...form, approximateAge: form.approximateAge ? Number(form.approximateAge) : null, assignmentId: assignment.assignment_id });
      toast.success('Field assessment saved. The incident is now resolved.');
      setIsDrawerOpen(false);
      // Reset form
      setForm({ patientName: '', approximateAge: '', gender: '', consciousnessLevel: '', injuriesObserved: [], interventionsRendered: [], disposition: '', destinationFacility: '', notes: '' });
      await loadAssignment({ quiet: true });
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  const location = assignment?.location?.coordinates;
  const status = assignment?.assignment_status;
  const onScene = assignment?.incident_status === 'Active' && status === 'OnScene';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground pb-20 sm:pb-0">
      <AppHeader
        title="Response Unit Field Portal"
        actions={(
          <>
          <span className="text-sm font-medium hidden sm:inline">{session?.fullName || 'Response unit'}</span>
          <Button variant="outline" size="sm" onClick={() => { disconnectSocket(); clearSession(); window.location.assign('/login'); }}>
            Sign out
          </Button>
          </>
        )}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" id="responder-main">
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
                />
              )}
            </ActiveDispatchCard>

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
