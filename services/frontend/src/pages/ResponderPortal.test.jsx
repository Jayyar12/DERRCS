import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResponderPortal from './ResponderPortal';
import { api, ApiError } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    currentAssignment: vi.fn(),
    updateAssignmentStatus: vi.fn(),
    submitAssessment: vi.fn(),
  },
  getSession: () => ({ fullName: 'Test Unit' }),
  clearSession: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message) { super(message); }
  }
}));

vi.mock('../api/socket', () => ({
  subscribeSocket: vi.fn(() => () => {}),
  disconnectSocket: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../components/map/TagoloanMap', () => ({
  default: function MockMap() { return <div data-testid="mock-map">Map</div>; }
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children, required }) => (
    <select 
      value={value || ''} 
      onChange={(e) => onValueChange(e.target.value)}
      required={required}
      data-testid="mock-select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }) => <>{children}</>,
  SelectValue: ({ placeholder }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }) => <>{children}</>,
  SelectGroup: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

import { toast } from 'sonner';

describe('ResponderPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => render(<BrowserRouter><ResponderPortal /></BrowserRouter>);

  it('renders assigned dispatch and displays caller notes', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-1',
      incident_id: 'inc-1',
      incident_code: 'INC-2026-999',
      emergency_type: 'Fire',
      severity: 'High',
      incident_status: 'Active',
      assignment_status: 'Dispatched',
      caller_notes: ['Flames seen from second floor', 'People evacuated'],
      location: { coordinates: [124.7, 8.5] }
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('INC-2026-999')).toBeInTheDocument();
    });

    expect(screen.getByText('Flames seen from second floor')).toBeInTheDocument();
    expect(screen.getByText('People evacuated')).toBeInTheDocument();
    
    // Status update button should be En Route
    expect(screen.getByRole('button', { name: /mark en route/i })).toBeInTheDocument();
  });

  it('allows state transitions EnRoute -> OnScene and opens casualty assessment', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-2',
      incident_id: 'inc-2',
      incident_code: 'INC-2026-888',
      incident_status: 'Active',
      assignment_status: 'EnRoute',
    });

    api.updateAssignmentStatus.mockResolvedValueOnce({});
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /arrived on scene/i })).toBeInTheDocument();
    });

    // We need a new mock response for after loadAssignment is called again
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-2',
      incident_id: 'inc-2',
      incident_code: 'INC-2026-888',
      incident_status: 'Active',
      assignment_status: 'OnScene',
    });

    fireEvent.click(screen.getByRole('button', { name: /arrived on scene/i }));

    await waitFor(() => {
      expect(api.updateAssignmentStatus).toHaveBeenCalledWith('asg-2', 'OnScene');
      expect(screen.getByRole('button', { name: /complete field assessment/i })).toBeInTheDocument();
    });
  });

  it('enforces mandatory disposition requirement before resolving incident', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-3',
      incident_id: 'inc-3',
      incident_code: 'INC-2026-777',
      incident_status: 'Active',
      assignment_status: 'OnScene',
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete field assessment/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /complete field assessment/i }));

    // Drawer opens
    await waitFor(() => {
      expect(screen.getByText('Field Casualty Assessment')).toBeInTheDocument();
    });

    // Submit without selecting disposition
    // We fire submit on the form directly to bypass jsdom HTML5 required validation
    // and test our programmatic enforcement.
    const form = screen.getByRole('button', { name: /submit assessment and resolve/i }).closest('form');
    fireEvent.submit(form);
    
    // It should throw an error internally and show alert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A disposition must be selected to complete the casualty assessment.');
    });
    
    // api should not be called
    expect(api.submitAssessment).not.toHaveBeenCalled();
    
    // Select disposition
    const selects = screen.getAllByTestId('mock-select');
    fireEvent.change(selects[2], { target: { value: 'TreatedOnScene' } });
    
    api.submitAssessment.mockResolvedValueOnce({});
    api.currentAssignment.mockResolvedValueOnce(null);
    
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(api.submitAssessment).toHaveBeenCalled();
    });
  });

  it('shows loading and an empty state when there is no active assignment', async () => {
    let resolveAssignment;
    api.currentAssignment.mockImplementationOnce(() => new Promise((resolve) => {
      resolveAssignment = resolve;
    }));

    renderComponent();
    expect(screen.getByRole('status', { name: 'Loading dispatch' })).toBeInTheDocument();

    await act(async () => resolveAssignment(null));
    expect(screen.getByText('No active dispatch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark en route|arrived on scene|complete field assessment/i })).not.toBeInTheDocument();
  });

  it('does not offer status changes or assessment for a completed assignment', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-complete',
      incident_id: 'inc-complete',
      incident_code: 'INC-COMPLETE',
      incident_status: 'Resolved',
      assignment_status: 'Completed',
    });

    renderComponent();
    expect(await screen.findByText('INC-COMPLETE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark en route|arrived on scene|complete field assessment/i })).not.toBeInTheDocument();
    expect(api.updateAssignmentStatus).not.toHaveBeenCalled();
    expect(api.submitAssessment).not.toHaveBeenCalled();
  });

  it('keeps the current action available after a status update fails', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-error',
      incident_id: 'inc-error',
      incident_code: 'INC-ERROR',
      incident_status: 'Dispatched',
      assignment_status: 'Dispatched',
    });
    api.updateAssignmentStatus.mockRejectedValueOnce(new Error('Dispatch update failed'));

    renderComponent();
    const enRouteButton = await screen.findByRole('button', { name: /mark en route/i });
    fireEvent.click(enRouteButton);

    expect(await screen.findByText('Dispatch update failed')).toBeInTheDocument();
    expect(api.updateAssignmentStatus).toHaveBeenCalledWith('asg-error', 'EnRoute');
    expect(screen.getByRole('button', { name: /mark en route/i })).toBeEnabled();
  });

  it('submits the casualty assessment once with normalized age and a saving state', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-assess',
      incident_id: 'inc-assess',
      incident_code: 'INC-ASSESS',
      incident_status: 'Active',
      assignment_status: 'OnScene',
    });
    let resolveAssessment;
    api.submitAssessment.mockImplementationOnce(() => new Promise((resolve) => {
      resolveAssessment = resolve;
    }));

    renderComponent();
    fireEvent.click(await screen.findByRole('button', { name: /complete field assessment/i }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText('Patient name or identity'), { target: { value: 'Ana Cruz' } });
    fireEvent.change(within(drawer).getByLabelText('Approximate age'), { target: { value: '34' } });
    fireEvent.change(within(drawer).getByLabelText('Notes'), { target: { value: 'Patient stable' } });
    fireEvent.change(within(drawer).getAllByTestId('mock-select')[2], { target: { value: 'TreatedOnScene' } });

    const submitButton = within(drawer).getByRole('button', { name: /submit assessment and resolve/i });
    fireEvent.submit(submitButton.closest('form'));

    await waitFor(() => expect(api.submitAssessment).toHaveBeenCalledWith('inc-assess', expect.objectContaining({
      assignmentId: 'asg-assess',
      patientName: 'Ana Cruz',
      approximateAge: 34,
      disposition: 'TreatedOnScene',
      notes: 'Patient stable',
    })));
    expect(api.submitAssessment).toHaveBeenCalledTimes(1);
    expect(within(drawer).getByRole('button', { name: /saving assessment/i })).toBeDisabled();
    fireEvent.submit(submitButton.closest('form'));
    expect(api.submitAssessment).toHaveBeenCalledTimes(1);

    api.currentAssignment.mockResolvedValueOnce(null);
    await act(async () => resolveAssessment({}));
    expect(toast.success).toHaveBeenCalledWith('Field assessment saved. The incident is now resolved.');
    expect(screen.getByText('No active dispatch')).toBeInTheDocument();
  });

  it('keeps the assessment drawer open and shows a save failure in the drawer', async () => {
    api.currentAssignment.mockResolvedValueOnce({
      assignment_id: 'asg-save-error',
      incident_id: 'inc-save-error',
      incident_code: 'INC-SAVE-ERROR',
      incident_status: 'Active',
      assignment_status: 'OnScene',
    });
    api.submitAssessment.mockRejectedValueOnce(new ApiError('Assessment could not be saved'));

    renderComponent();
    fireEvent.click(await screen.findByRole('button', { name: /complete field assessment/i }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getAllByTestId('mock-select')[2], { target: { value: 'TreatedOnScene' } });
    fireEvent.submit(within(drawer).getByRole('button', { name: /submit assessment and resolve/i }).closest('form'));

    expect(await within(drawer).findByText('Assessment could not be saved')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: /submit assessment and resolve/i })).toBeEnabled();
    expect(api.submitAssessment).toHaveBeenCalledTimes(1);
  });

  it('finishes loading when a socket alert replaces the initial assignment request', async () => {
    let resolveInitial;
    api.currentAssignment
      .mockImplementationOnce(() => new Promise((resolve) => { resolveInitial = resolve; }))
      .mockResolvedValueOnce({
        assignment_id: 'asg-fresh',
        incident_id: 'inc-fresh',
        incident_code: 'INC-FRESH',
        incident_status: 'Dispatched',
        assignment_status: 'Dispatched',
      });
    const { subscribeSocket } = await import('../api/socket');
    let alertHandler;
    vi.mocked(subscribeSocket).mockImplementationOnce((event, handler) => {
      expect(event).toBe('unit:dispatch:alert');
      alertHandler = handler;
      return () => {};
    });

    renderComponent();
    expect(screen.getByRole('status', { name: 'Loading dispatch' })).toBeInTheDocument();
    expect(alertHandler).toBeTypeOf('function');
    act(() => alertHandler());

    expect(await screen.findByText('INC-FRESH')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading dispatch' })).not.toBeInTheDocument();
    expect(api.currentAssignment).toHaveBeenCalledTimes(2);
    await act(async () => resolveInitial({
      assignment_id: 'asg-stale',
      incident_id: 'inc-stale',
      incident_code: 'INC-STALE',
      incident_status: 'Dispatched',
      assignment_status: 'Dispatched',
    }));
    expect(screen.getByText('INC-FRESH')).toBeInTheDocument();
    expect(screen.queryByText('INC-STALE')).not.toBeInTheDocument();
  });
});
