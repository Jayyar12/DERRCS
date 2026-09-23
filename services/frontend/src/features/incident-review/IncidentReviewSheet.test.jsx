import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { IncidentReviewSheet } from './IncidentReviewSheet';
import { api } from '../../api/client';

vi.mock('../../api/client', () => ({
  api: {
    candidate: vi.fn(),
    confirmCandidate: vi.fn(),
    incident: vi.fn(),
    assign: vi.fn(),
    closeIncident: vi.fn(),
    units: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message, { status, code } = {}) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('../../api/socket', () => ({
  subscribeSocket: vi.fn(() => () => {}),
  disconnectSocket: vi.fn(),
}));

describe('IncidentReviewSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays a validated incident when opened directly by selection', async () => {
    const mockIncident = {
      id: 'inc-123',
      incident_code: 'INC-2026-001',
      emergency_type: 'Flood',
      status: 'Validated',
      severity: 'High',
      created_at: '2026-09-21T10:00:00Z',
      validated_at: '2026-09-21T10:05:00Z',
      reports: [
        {
          id: 'rep-1',
          description: 'Water level rising quickly in Poblacion',
          created_at: '2026-09-21T10:00:00Z',
        },
      ],
      assignments: [],
      assessments: [],
    };

    const mockUnits = [
      { id: 'unit-1', unit_code: 'MED-1', unit_type: 'Ambulance', current_status: 'Available' },
    ];

    api.incident.mockResolvedValueOnce(mockIncident);
    api.units.mockResolvedValueOnce(mockUnits);

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-123' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/INC-2026-001/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Flood/i)).toBeInTheDocument();
    expect(screen.getByText('Water level rising quickly in Poblacion')).toBeInTheDocument();
  });

  it('allows dispatcher to validate a pending candidate and transitions selection to incident', async () => {
    const mockCandidate = {
      id: 'cand-456',
      emergency_type: 'Fire',
      status: 'Pending',
      report_count: 2,
      created_at: '2026-09-21T11:00:00Z',
      latest_summary: 'Residential fire reported near market',
      summary_is_fallback: false,
      reports: [
        { id: 'r-1', description: 'Smoke seen in market area', created_at: '2026-09-21T11:00:00Z' },
      ],
    };

    api.candidate.mockResolvedValueOnce(mockCandidate);
    api.confirmCandidate.mockResolvedValueOnce({
      incidentId: 'inc-789',
      incidentCode: 'INC-2026-002',
      status: 'Validated',
      confirmedAt: '2026-09-21T11:05:00Z',
    });

    const onSelectionChange = vi.fn();
    const onCommitted = vi.fn();

    render(
      <IncidentReviewSheet
        selection={{ kind: 'candidate', id: 'cand-456' }}
        role="Dispatcher"
        onSelectionChange={onSelectionChange}
        onCommitted={onCommitted}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validate incident/i })).toBeInTheDocument();
    });

    const validateButton = screen.getByRole('button', { name: /validate incident/i });
    validateButton.click();

    await waitFor(() => {
      expect(api.confirmCandidate).toHaveBeenCalledWith('cand-456');
    });

    expect(onSelectionChange).toHaveBeenCalledWith({ kind: 'incident', id: 'inc-789' });
    expect(onCommitted).toHaveBeenCalledWith({ action: 'validate', incidentId: 'inc-789' });
  });

  it('allows dispatcher to dispatch an available unit with notes to a validated incident', async () => {
    const mockIncident = {
      id: 'inc-100',
      incident_code: 'INC-2026-003',
      emergency_type: 'Medical',
      status: 'Validated',
      created_at: '2026-09-21T12:00:00Z',
      reports: [],
      assignments: [],
      assessments: [],
    };

    const mockUnits = [
      { id: 'unit-med-1', unit_code: 'MED-1', unit_type: 'Ambulance', current_status: 'Available' },
      { id: 'unit-fire-1', unit_code: 'FIRE-1', unit_type: 'Engine', current_status: 'Assigned' },
    ];

    api.incident.mockResolvedValueOnce(mockIncident);
    api.units.mockResolvedValueOnce(mockUnits);
    api.assign.mockResolvedValueOnce({
      assignmentId: 'asg-1',
      incidentId: 'inc-100',
      responseUnitId: 'unit-med-1',
      status: 'Dispatched',
    });

    const onCommitted = vi.fn();

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-100' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={onCommitted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Dispatch')).toBeInTheDocument();
    });

    // Verify unavailable units are not listed or only available units are choices
    expect(screen.getByRole('button', { name: /confirm dispatch/i })).toBeDisabled();

    // In testing-library with Base UI / custom select, we can test assigning via selecting the unit
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getByText(/MED-1/)).toBeInTheDocument();
    });

    const medUnitOption = screen.getByText(/MED-1/);
    fireEvent.click(medUnitOption);

    const notesInput = screen.getByPlaceholderText(/special instructions/i);
    fireEvent.change(notesInput, { target: { value: 'Priority alpha patient' } });

    await waitFor(() => {
      const dispatchBtn = screen.getByRole('button', { name: /confirm dispatch/i });
      expect(dispatchBtn).not.toBeDisabled();
    });

    const dispatchBtn = screen.getByRole('button', { name: /confirm dispatch/i });
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(api.assign).toHaveBeenCalledWith('inc-100', 'unit-med-1', 'Priority alpha patient');
    });

    expect(onCommitted).toHaveBeenCalledWith({ action: 'dispatch', incidentId: 'inc-100' });
  });

  it('allows dispatcher or admin to review debrief and close a resolved incident', async () => {
    const mockResolvedIncident = {
      id: 'inc-200',
      incident_code: 'INC-2026-004',
      emergency_type: 'Vehicular Accident',
      status: 'Resolved',
      created_at: '2026-09-21T13:00:00Z',
      resolved_at: '2026-09-21T13:45:00Z',
      handover_summary: 'Patient stabilized and transported to Tagoloan Health Center',
      handover_is_fallback: false,
      reports: [],
      assignments: [
        {
          id: 'asg-200',
          unit_code: 'MED-2',
          unit_type: 'Ambulance',
          status: 'Completed',
          responder_name: 'Juan Dela Cruz',
          assigned_at: '2026-09-21T13:05:00Z',
          completed_at: '2026-09-21T13:45:00Z',
        },
      ],
      assessments: [
        {
          id: 'fa-200',
          disposition: 'Transported',
          patient_name: 'Mario Santos',
          injuries_observed: 'Laceration on right arm',
          destination_facility: 'Tagoloan Health Center',
          created_at: '2026-09-21T13:40:00Z',
        },
      ],
    };

    api.incident.mockResolvedValueOnce(mockResolvedIncident);
    api.closeIncident.mockResolvedValueOnce({
      incidentId: 'inc-200',
      status: 'Closed',
      closedAt: '2026-09-21T14:00:00Z',
    });

    const onCommitted = vi.fn();

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-200' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={onCommitted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Patient stabilized and transported to Tagoloan Health Center')).toBeInTheDocument();
    });

    expect(screen.getByText('Mario Santos')).toBeInTheDocument();
    expect(screen.getByText(/Laceration on right arm/)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close incident after review/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(api.closeIncident).toHaveBeenCalledWith('inc-200');
    });

    expect(onCommitted).toHaveBeenCalledWith({ action: 'close', incidentId: 'inc-200' });
  });

  it('displays algorithmic recommendation without auto-dispatching or auto-selecting', async () => {
    let recommendationHandler;
    const { subscribeSocket } = await import('../../api/socket');
    vi.mocked(subscribeSocket).mockImplementation((event, handler) => {
      if (event === 'dispatcher:assignment:recommended') {
        recommendationHandler = handler;
      }
      return () => {};
    });

    const mockIncident = {
      id: 'inc-rec-1',
      incident_code: 'INC-2026-005',
      emergency_type: 'Flood',
      status: 'Validated',
      created_at: '2026-09-21T14:00:00Z',
      reports: [],
      assignments: [],
      assessments: [],
    };

    const mockUnits = [
      { id: 'unit-boat-1', unit_code: 'BOAT-1', unit_type: 'Rescue Boat', current_status: 'Available' },
      { id: 'unit-med-3', unit_code: 'MED-3', unit_type: 'Ambulance', current_status: 'Available' },
    ];

    api.incident.mockResolvedValueOnce(mockIncident);
    api.units.mockResolvedValueOnce(mockUnits);

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-rec-1' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Dispatch')).toBeInTheDocument();
    });

    // Fire socket recommendation event
    expect(recommendationHandler).toBeDefined();
    act(() => {
      recommendationHandler({
        incidentId: 'inc-rec-1',
        unitId: 'unit-boat-1',
        unitCode: 'BOAT-1',
        estimatedTravelTimeMinutes: 8,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Algorithm recommendation:/)).toBeInTheDocument();
      expect(screen.getByText(/BOAT-1/)).toBeInTheDocument();
      expect(screen.getByText(/8 minutes/)).toBeInTheDocument();
    });

    // Ensure api.assign was NOT called automatically
    expect(api.assign).not.toHaveBeenCalled();
  });

  it('handles server conflict during dispatch and provides retryable error state', async () => {
    const { ApiError } = await import('../../api/client');
    const mockIncident = {
      id: 'inc-err-1',
      incident_code: 'INC-2026-006',
      emergency_type: 'Fire',
      status: 'Validated',
      created_at: '2026-09-21T15:00:00Z',
      reports: [],
      assignments: [],
      assessments: [],
    };

    const mockUnits = [
      { id: 'unit-fire-9', unit_code: 'ENG-9', unit_type: 'Engine', current_status: 'Available' },
    ];

    api.incident.mockResolvedValue(mockIncident);
    api.units.mockResolvedValue(mockUnits);
    api.assign.mockRejectedValueOnce(
      new ApiError('Unit is not available. Current status: Assigned.', { status: 409, code: 'UNIT_UNAVAILABLE' })
    );

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-err-1' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resource Dispatch')).toBeInTheDocument();
    });

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);

    await waitFor(() => {
      expect(screen.getByText(/ENG-9/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/ENG-9/));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm dispatch/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm dispatch/i }));

    await waitFor(() => {
      expect(screen.getByText('Unit is not available. Current status: Assigned.')).toBeInTheDocument();
    });

    // Should not retry assign automatically
    expect(api.assign).toHaveBeenCalledTimes(1);
  });

  it('restricts actions for non-dispatcher roles', async () => {
    const mockPendingCandidate = {
      id: 'cand-readonly',
      emergency_type: 'Medical',
      status: 'Pending',
      reports: [],
    };

    api.candidate.mockResolvedValueOnce(mockPendingCandidate);

    render(
      <IncidentReviewSheet
        selection={{ kind: 'candidate', id: 'cand-readonly' }}
        role="ResponseUnit"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Medical Candidate/)).toBeInTheDocument();
    });

    // ResponseUnit cannot validate
    expect(screen.queryByRole('button', { name: /validate incident/i })).not.toBeInTheDocument();
  });

  it('displays template fallback warnings when summaries use fallback generators', async () => {
    const mockIncident = {
      id: 'inc-fallback',
      incident_code: 'INC-2026-007',
      emergency_type: 'Flood',
      status: 'Resolved',
      created_at: '2026-09-21T16:00:00Z',
      candidate_id: 'cand-fallback',
      handover_summary: 'Template summary: Flood response completed.',
      handover_is_fallback: true,
      reports: [],
      assignments: [],
      assessments: [],
    };

    api.incident.mockResolvedValueOnce(mockIncident);
    api.candidate.mockResolvedValueOnce({
      id: 'cand-fallback',
      latest_summary: 'Template summary: Flood intake registered.',
      summary_is_fallback: true,
    });

    render(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-fallback' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Template fallback summary in use.')).toBeInTheDocument();
      expect(screen.getByText('Template fallback handover debrief in use.')).toBeInTheDocument();
    });
  });

  it('aborts superseded reads and ignores slow out-of-order responses when switching selection', async () => {
    let slowResolve;
    const slowCandidatePromise = new Promise((resolve) => {
      slowResolve = resolve;
    });

    api.candidate.mockImplementationOnce(() => slowCandidatePromise);
    api.incident.mockResolvedValueOnce({
      id: 'inc-fast',
      incident_code: 'INC-2026-FAST',
      emergency_type: 'Fire',
      status: 'Validated',
      reports: [],
      assignments: [],
      assessments: [],
    });
    api.units.mockResolvedValueOnce([]);

    const { rerender } = render(
      <IncidentReviewSheet
        selection={{ kind: 'candidate', id: 'cand-slow' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    // Switch selection immediately to fast incident
    rerender(
      <IncidentReviewSheet
        selection={{ kind: 'incident', id: 'inc-fast' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/INC-2026-FAST/)).toBeInTheDocument();
    });

    // Now resolve slow candidate late
    await act(async () => {
      slowResolve({
        id: 'cand-slow',
        emergency_type: 'Medical',
        status: 'Pending',
        reports: [],
      });
    });

    // Verify view does not get overwritten by slow candidate
    expect(screen.getByText(/INC-2026-FAST/)).toBeInTheDocument();
    expect(screen.queryByText(/Medical Candidate/)).not.toBeInTheDocument();
  });

  it('guards against duplicate submissions during validate action', async () => {
    let confirmResolve;
    const confirmPromise = new Promise((resolve) => {
      confirmResolve = resolve;
    });

    api.candidate.mockResolvedValueOnce({
      id: 'cand-dup',
      emergency_type: 'Flood',
      status: 'Pending',
      reports: [],
    });
    api.confirmCandidate.mockImplementationOnce(() => confirmPromise);

    render(
      <IncidentReviewSheet
        selection={{ kind: 'candidate', id: 'cand-dup' }}
        role="Dispatcher"
        onSelectionChange={vi.fn()}
        onCommitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validate incident/i })).toBeInTheDocument();
    });

    const validateBtn = screen.getByRole('button', { name: /validate incident/i });
    fireEvent.click(validateBtn);

    // Button should now be disabled and display Validating...
    expect(validateBtn).toBeDisabled();
    expect(screen.getByText(/validating/i)).toBeInTheDocument();

    // Clicking again should not invoke confirmCandidate again
    fireEvent.click(validateBtn);
    expect(api.confirmCandidate).toHaveBeenCalledTimes(1);

    await act(async () => {
      confirmResolve({
        incidentId: 'inc-dup-res',
        incidentCode: 'INC-DUP',
        status: 'Validated',
      });
    });
  });
});
