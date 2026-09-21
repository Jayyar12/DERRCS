import { useEffect, useState, useRef, useCallback } from 'react';
import { api, ApiError } from '../../api/client';
import { subscribeSocket } from '../../api/socket';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

const statusColors = {
  Pending: 'bg-amber-500 text-white',
  Reported: 'bg-amber-500 text-white',
  Validated: 'bg-blue-600 text-white',
  Dispatched: 'bg-purple-600 text-white',
  Active: 'bg-red-600 text-white',
  Resolved: 'bg-green-600 text-white',
  Closed: 'bg-muted text-muted-foreground',
};

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

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

  // Capture socket recommendations throughout session
  useEffect(() => {
    const unsubscribe = subscribeSocket('dispatcher:assignment:recommended', (payload) => {
      if (payload?.incidentId) {
        setRecommendations((prev) => ({ ...prev, [payload.incidentId]: payload }));
      }
    });
    return () => unsubscribe();
  }, []);

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

  // Coalesced refresh handler
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

  // Load record when selection changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Reset draft fields when selection record changes
    setSelectedUnitId('');
    setNotes('');
    setActionSuccessMessage('');

    loadRecord({ signal: controller.signal, clearError: true });

    return () => {
      controller.abort();
    };
  }, [selection?.kind, selection?.id, loadRecord]);

  // Filter available response units
  const availableUnitsList = units.filter((u) => u.current_status === 'Available');

  // Verify that selectedUnitId is still available; clear if not
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

  // Determine current effective state
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
        <SheetHeader className="mb-4">
          <div className="flex justify-between items-start">
            <div>
              {effectiveStatus && (
                <Badge className={`mb-2 ${statusColors[effectiveStatus] || 'bg-muted text-muted-foreground'}`}>
                  {effectiveStatus}
                </Badge>
              )}
              <SheetTitle className="text-2xl">
                {loading && !data
                  ? 'Loading Record...'
                  : data?.incidentCode
                  ? `${data.incidentCode} (${data.emergencyType})`
                  : data
                  ? `${data.emergencyType} Candidate`
                  : 'Incident Review'}
              </SheetTitle>
            </div>
          </div>

          <SheetDescription className="text-sm text-foreground mt-2">
            {data?.createdAt && `Created at ${formatDate(data.createdAt)}`}
            {data?.validatedAt && ` · Validated at ${formatDate(data.validatedAt)}`}
            {data?.dispatchedAt && ` · Dispatched at ${formatDate(data.dispatchedAt)}`}
            {data?.resolvedAt && ` · Resolved at ${formatDate(data.resolvedAt)}`}
            {data?.closedAt && ` · Closed at ${formatDate(data.closedAt)}`}
          </SheetDescription>
        </SheetHeader>

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
          <Alert className="mb-4 border-green-600 bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-200">
            <AlertDescription>{actionSuccessMessage}</AlertDescription>
          </Alert>
        )}

        {data && (
          <div className="flex flex-col gap-6">
            {/* Intake AI Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Intake Summary</CardTitle>
                <CardDescription>
                  {data.latestSummary || 'No AI summary is available yet. Review the report details below.'}
                </CardDescription>
              </CardHeader>
              {data.summaryIsFallback && (
                <CardContent className="pt-0">
                  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-amber-900 dark:text-amber-200 py-2">
                    <AlertDescription className="text-xs">
                      Template fallback summary in use.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>

            {/* Handover Debrief Summary for resolved or closed incidents */}
            {(isResolvedIncident || isClosedIncident || data.handoverSummary) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Handover Debrief</CardTitle>
                  <CardDescription>
                    {data.handoverSummary || 'No handover summary recorded.'}
                  </CardDescription>
                </CardHeader>
                {data.handoverIsFallback && (
                  <CardContent className="pt-0">
                    <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 text-amber-900 dark:text-amber-200 py-2">
                      <AlertDescription className="text-xs">
                        Template fallback handover debrief in use.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Validation action for pending candidate */}
            {canValidate && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleValidate}
                disabled={submitting}
              >
                {submitting ? 'Validating…' : 'Validate Incident'}
              </Button>
            )}

            {/* Resource Dispatch form for validated incident */}
            {isValidatedIncident && (
              <Card className="border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resource Dispatch</CardTitle>
                  {recommendation && availableUnitsList.some((u) => u.id === (recommendation.unitId || recommendation.recommendedUnitId)) ? (
                    <CardDescription className="text-primary mt-1 text-sm font-medium">
                      Algorithm recommendation:{' '}
                      <strong>{recommendation.unitCode || recommendation.recommendedUnitId}</strong>{' '}
                      &middot; estimated {recommendation.estimatedTravelTimeMinutes} minutes.
                    </CardDescription>
                  ) : recommendation ? (
                    <CardDescription className="text-muted-foreground mt-1 text-sm">
                      Recommended unit {recommendation.unitCode || recommendation.recommendedUnitId} is currently unavailable. Choose from available units below.
                    </CardDescription>
                  ) : (
                    <CardDescription className="text-muted-foreground mt-1 text-sm">
                      Select an available response unit to dispatch.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {canDispatch ? (
                    <form onSubmit={handleDispatch} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="unit-select" className="text-sm font-semibold">
                          Response Unit
                        </label>
                        {availableUnitsList.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No response units are currently available.
                          </p>
                        ) : (
                          <Select
                            value={selectedUnitId}
                            onValueChange={setSelectedUnitId}
                            required
                          >
                            <SelectTrigger id="unit-select" className="bg-background w-full">
                              <SelectValue placeholder="Choose an available unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {availableUnitsList.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.unit_code} &middot; {unit.unit_type}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label htmlFor="dispatch-notes" className="text-sm font-semibold">
                          Dispatch Notes (optional)
                        </label>
                        <Textarea
                          id="dispatch-notes"
                          className="bg-background"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          placeholder="Special instructions for responders..."
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="destructive"
                        className="w-full font-bold"
                        disabled={submitting || !selectedUnitId}
                      >
                        {submitting ? 'Dispatching…' : 'Confirm Dispatch'}
                      </Button>
                    </form>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Only dispatchers can allocate response units.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Close incident action for resolved incident */}
            {canClose && (
              <Card className="border-green-600 bg-green-50 dark:bg-green-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Incident Closure</CardTitle>
                  <CardDescription>
                    Field operations and assessment are complete. Review all records before final closure.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="default"
                    className="w-full bg-green-700 hover:bg-green-800 text-white"
                    size="lg"
                    onClick={handleCloseIncident}
                    disabled={submitting}
                  >
                    {submitting ? 'Closing Incident…' : 'Close Incident After Review'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Assignments list */}
            {data.assignments && data.assignments.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3">Unit Assignments ({data.assignments.length})</h3>
                <div className="flex flex-col gap-3">
                  {data.assignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardContent className="p-3 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <strong className="text-sm font-semibold">
                            {assignment.unit_code} ({assignment.unit_type})
                          </strong>
                          <Badge variant="outline">{assignment.status}</Badge>
                        </div>
                        {assignment.responder_name && (
                          <p className="text-xs text-muted-foreground">
                            Responder: {assignment.responder_name}
                          </p>
                        )}
                        {assignment.notes && (
                          <p className="text-xs mt-1 bg-muted p-2 rounded">{assignment.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned: {formatDate(assignment.assigned_at)}
                          {assignment.completed_at && ` · Completed: ${formatDate(assignment.completed_at)}`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Field Assessments */}
            {data.assessments && data.assessments.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3">
                  Pre-Hospital Field Care Reports ({data.assessments.length})
                </h3>
                <div className="flex flex-col gap-3">
                  {data.assessments.map((assessment) => (
                    <Card key={assessment.id}>
                      <CardContent className="p-3 flex flex-col gap-2 text-xs">
                        <div className="flex justify-between font-semibold text-sm">
                          <span>Disposition: {assessment.disposition}</span>
                          <span className="text-muted-foreground font-normal">
                            {formatDate(assessment.created_at)}
                          </span>
                        </div>
                        {assessment.patient_name && (
                          <p>
                            <strong>Patient:</strong> {assessment.patient_name}{' '}
                            {assessment.approximate_age ? `(${assessment.approximate_age} yrs)` : ''}{' '}
                            {assessment.gender ? `· ${assessment.gender}` : ''}
                          </p>
                        )}
                        {assessment.consciousness_level && (
                          <p>
                            <strong>Consciousness:</strong> {assessment.consciousness_level}
                          </p>
                        )}
                        {assessment.injuries_observed && (
                          <p>
                            <strong>Injuries:</strong> {assessment.injuries_observed}
                          </p>
                        )}
                        {assessment.interventions_rendered && (
                          <p>
                            <strong>Interventions:</strong> {assessment.interventions_rendered}
                          </p>
                        )}
                        {assessment.destination_facility && (
                          <p>
                            <strong>Facility:</strong> {assessment.destination_facility}
                          </p>
                        )}
                        {assessment.notes && (
                          <p className="bg-muted p-2 rounded">
                            <strong>Notes:</strong> {assessment.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Reports List */}
            <div>
              <h3 className="font-bold text-sm mb-3">
                Citizen Submissions ({data.reports.length})
              </h3>
              {data.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports recorded.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-3 flex flex-col gap-2">
                        <p className="text-sm">{report.description || 'No narrative supplied.'}</p>

                        {report.standardized_answers &&
                          typeof report.standardized_answers === 'object' &&
                          Object.keys(report.standardized_answers).length > 0 && (
                            <div className="bg-muted/50 p-2 rounded text-xs flex flex-col gap-1">
                              <span className="font-semibold text-muted-foreground">
                                Structured answers:
                              </span>
                              {Object.entries(report.standardized_answers).map(([q, a]) => (
                                <div key={q} className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">{q}:</span>
                                  <span className="font-medium text-right">
                                    {typeof a === 'boolean' ? (a ? 'Yes' : 'No') : String(a)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        {report.photo_url && (
                          <div className="mt-1">
                            <img
                              src={report.photo_url}
                              alt="Citizen submission photo"
                              className="max-h-48 rounded object-cover border"
                            />
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Submitted: {formatDate(report.created_at)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
