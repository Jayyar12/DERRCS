import { useEffect, useState, useRef, useCallback } from 'react';
import { api, ApiError } from '../../api/client';
import { useSocketEvent } from '../../hooks/useSocketEvent';

import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { ReviewHeader } from './components/ReviewHeader';
import { IntakeSummarySection } from './components/IntakeSummarySection';
import { HandoverDebriefSection } from './components/HandoverDebriefSection';
import { ValidationAction } from './components/ValidationAction';
import { ResourceDispatchForm } from './components/ResourceDispatchForm';
import { IncidentClosureAction } from './components/IncidentClosureAction';
import { AssignmentHistoryList } from './components/AssignmentHistoryList';
import { FieldAssessmentsList } from './components/FieldAssessmentsList';
import { CitizenReportsList } from './components/CitizenReportsList';

export function IncidentReviewSheet({
  selection,
  role,
  onSelectionChange,
  onCommitted,
}) {
  const [data, setData] = useState(null);
  const [units, setUnits] = useState([]);
  const [recommendations, setRecommendations] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const abortControllerRef = useRef(null);
  const activeRefreshPromiseRef = useRef(null);

  useSocketEvent('dispatcher:assignment:recommended', (payload) => {
    if (payload?.incidentId) {
      setRecommendations((prev) => ({ ...prev, [payload.incidentId]: payload }));
    }
  });

  const loadRecord = useCallback(
    async ({ signal, clearError = true } = {}) => {
      if (!selection || !selection.id) {
        setData(null);
        if (clearError) setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      if (clearError) setError(null);

      try {
        if (selection.kind === 'candidate') {
          const candidateData = await api.candidate(selection.id, { signal });
          if (signal?.aborted) return;
          setData({
            kind: 'candidate',
            raw: candidateData,
            id: candidateData.id,
            status: candidateData.status,
            incidentId: candidateData.incident_id,
            incidentCode: candidateData.incident_code,
            incidentStatus: candidateData.incident_status,
            emergencyType: candidateData.emergency_type,
            reportCount: candidateData.report_count,
            createdAt: candidateData.created_at,
            updatedAt: candidateData.updated_at,
            latestSummary: candidateData.latest_summary,
            summaryIsFallback: candidateData.summary_is_fallback,
            reports: candidateData.reports || [],
            assignments: [],
            assessments: [],
            handoverSummary: null,
            handoverIsFallback: false,
          });

          if (candidateData.incident_status === 'Validated' || candidateData.status === 'Validated') {
            const availableUnits = await api.units({ signal }).catch(() => []);
            setUnits(availableUnits);
          }
        } else if (selection.kind === 'incident') {
          const incidentData = await api.incident(selection.id, { signal });
          let candidateSummary = null;
          let summaryFallback = false;

          if (incidentData.candidate_id) {
            try {
              const candidateRes = await api.candidate(incidentData.candidate_id, { signal });
              candidateSummary = candidateRes.latest_summary;
              summaryFallback = candidateRes.summary_is_fallback;
            } catch {
              // Ignore if candidate detail read fails
            }
          }

          if (signal?.aborted) return;

          setData({
            kind: 'incident',
            raw: incidentData,
            id: incidentData.id,
            status: incidentData.status,
            incidentId: incidentData.id,
            incidentCode: incidentData.incident_code,
            incidentStatus: incidentData.status,
            emergencyType: incidentData.emergency_type,
            severity: incidentData.severity,
            escalationLevel: incidentData.escalation_level,
            reportCount: (incidentData.reports || []).length,
            createdAt: incidentData.created_at,
            validatedAt: incidentData.validated_at,
            dispatchedAt: incidentData.dispatched_at,
            resolvedAt: incidentData.resolved_at,
            closedAt: incidentData.closed_at,
            latestSummary: candidateSummary,
            summaryIsFallback: summaryFallback,
            reports: incidentData.reports || [],
            assignments: incidentData.assignments || [],
            assessments: incidentData.assessments || [],
            handoverSummary: incidentData.handover_summary,
            handoverIsFallback: incidentData.handover_is_fallback,
          });

          if (incidentData.status === 'Validated') {
            const availableUnits = await api.units({ signal }).catch(() => []);
            setUnits(availableUnits);
          }
        } else {
          setError('Invalid selection type.');
        }
      } catch (err) {
        if (err.name === 'AbortError' || signal?.aborted) {
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load details.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [selection]
  );

  const triggerRefresh = useCallback(
    ({ preserveError = false } = {}) => {
      if (activeRefreshPromiseRef.current) {
        return activeRefreshPromiseRef.current;
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const promise = loadRecord({ signal: controller.signal, clearError: !preserveError }).finally(() => {
        activeRefreshPromiseRef.current = null;
      });
      activeRefreshPromiseRef.current = promise;
      return promise;
    },
    [loadRecord]
  );

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSelectedUnitId('');
    setNotes('');
    setActionSuccessMessage('');

    loadRecord({ signal: controller.signal, clearError: true });

    return () => {
      controller.abort();
    };
  }, [selection?.kind, selection?.id, loadRecord]);

  const availableUnitsList = units.filter((u) => u.current_status === 'Available');

  useEffect(() => {
    if (selectedUnitId && !availableUnitsList.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId('');
    }
  }, [availableUnitsList, selectedUnitId]);

  const handleClose = () => {
    if (onSelectionChange) {
      onSelectionChange(null);
    }
  };

  const handleValidate = async () => {
    if (submitting || !data?.id) return;
    setSubmitting(true);
    setError(null);
    setActionSuccessMessage('');
    try {
      const result = await api.confirmCandidate(data.id);
      const successText = `${result.incidentCode || 'Incident'} was validated. Await the live allocation recommendation or choose an available unit.`;
      setActionSuccessMessage(successText);
      toast.success(successText);
      if (onSelectionChange) {
        onSelectionChange({ kind: 'incident', id: result.incidentId });
      }
      if (onCommitted) {
        onCommitted({ action: 'validate', incidentId: result.incidentId });
      }
      triggerRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to validate incident.');
      triggerRefresh({ preserveError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    const incidentTargetId = data?.incidentId || data?.id;
    if (submitting || !incidentTargetId || !selectedUnitId) return;
    setSubmitting(true);
    setError(null);
    setActionSuccessMessage('');
    try {
      await api.assign(incidentTargetId, selectedUnitId, notes);
      const successText = 'Response unit dispatched and notified.';
      setActionSuccessMessage(successText);
      toast.success(successText);
      setSelectedUnitId('');
      setNotes('');
      if (onCommitted) {
        onCommitted({ action: 'dispatch', incidentId: incidentTargetId });
      }
      triggerRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to assign unit.');
      triggerRefresh({ preserveError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseIncident = async () => {
    const incidentTargetId = data?.incidentId || data?.id;
    if (submitting || !incidentTargetId) return;
    setSubmitting(true);
    setError(null);
    setActionSuccessMessage('');
    try {
      await api.closeIncident(incidentTargetId);
      const successText = 'Incident closed after review.';
      setActionSuccessMessage(successText);
      toast.success(successText);
      if (onCommitted) {
        onCommitted({ action: 'close', incidentId: incidentTargetId });
      }
      triggerRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to close incident.');
      triggerRefresh({ preserveError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = Boolean(selection?.id);
  const activeIncidentId = data?.incidentId || data?.id;
  const recommendation = activeIncidentId ? recommendations[activeIncidentId] : null;

  const effectiveStatus = data?.status || data?.incidentStatus;
  const isPendingCandidate = data?.kind === 'candidate' && data?.status === 'Pending';
  const isValidatedIncident = effectiveStatus === 'Validated' || data?.incidentStatus === 'Validated';
  const isResolvedIncident = effectiveStatus === 'Resolved' || data?.incidentStatus === 'Resolved';
  const isClosedIncident = effectiveStatus === 'Closed' || data?.incidentStatus === 'Closed';

  const canValidate = isPendingCandidate && role === 'Dispatcher';
  const canDispatch = isValidatedIncident && role === 'Dispatcher';
  const canClose = isResolvedIncident && (role === 'Dispatcher' || role === 'Admin');

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <ReviewHeader data={data} loading={loading} effectiveStatus={effectiveStatus} />

        {loading && !data && (
          <div className="p-4 text-sm text-muted-foreground" role="status">
            Loading record details…
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={triggerRefresh}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {actionSuccessMessage && (
          <Alert className="mb-4 border-success/40 bg-success/10">
            <AlertDescription className="text-success font-medium">{actionSuccessMessage}</AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="flex flex-col gap-6">
            <IntakeSummarySection data={data} />
            <HandoverDebriefSection data={data} isResolvedIncident={isResolvedIncident} isClosedIncident={isClosedIncident} />
            
            <ValidationAction
              canValidate={canValidate}
              onValidate={handleValidate}
              submitting={submitting}
            />

            <ResourceDispatchForm
              isValidatedIncident={isValidatedIncident}
              canDispatch={canDispatch}
              recommendation={recommendation}
              availableUnitsList={availableUnitsList}
              selectedUnitId={selectedUnitId}
              setSelectedUnitId={setSelectedUnitId}
              notes={notes}
              setNotes={setNotes}
              onDispatch={handleDispatch}
              submitting={submitting}
            />

            <IncidentClosureAction
              canClose={canClose}
              onClose={handleCloseIncident}
              submitting={submitting}
            />

            <AssignmentHistoryList assignments={data.assignments} />
            <FieldAssessmentsList assessments={data.assessments} />
            <CitizenReportsList reports={data.reports} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
