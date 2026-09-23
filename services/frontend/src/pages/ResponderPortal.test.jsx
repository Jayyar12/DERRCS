import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResponderPortal from './ResponderPortal';
import { api } from '../api/client';

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
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
});
