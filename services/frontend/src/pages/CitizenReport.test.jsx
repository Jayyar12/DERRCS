import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CitizenReport from './CitizenReport';
import { api } from '../api/client';
import { useGeolocation } from '../hooks/useGeolocation';

vi.mock('../api/client', () => ({
  api: {
    submitReport: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message) {
      super(message);
    }
  }
}));

vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}));

vi.mock('../components/map/TagoloanMap', () => ({
  default: function MockMap({ onLocationChange }) {
    return (
      <div data-testid="mock-map" onClick={(event) => onLocationChange?.(event.altKey
        ? { latitude: 9, longitude: 125 }
        : { latitude: 8.5, longitude: 124.75 })}>
        Map Component
      </div>
    );
  }
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

describe('CitizenReport', () => {
  let mockRequestLocation;
  let mockClearLocation;
  let geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestLocation = vi.fn();
    mockClearLocation = vi.fn();
    geolocation = {
      coordinates: null,
      loading: false,
      error: null,
      requestLocation: mockRequestLocation,
      clearLocation: mockClearLocation,
    };
    useGeolocation.mockImplementation(() => geolocation);
  });

  const renderComponent = () => render(<BrowserRouter><CitizenReport /></BrowserRouter>);

  function advanceToLocation() {
    fireEvent.click(screen.getByText('Flood'));
    fireEvent.change(screen.getByPlaceholderText(/describe hazards/i), { target: { value: 'Water knee deep' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const selects = screen.getAllByTestId('mock-select');
    fireEvent.change(selects[0], { target: { value: 'Knee deep' } });
    fireEvent.change(selects[1], { target: { value: 'Yes' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  }

  it('validates step 1 inputs before allowing progression', async () => {
    renderComponent();
    
    // Initial state: step 1
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    
    // Try to continue without selecting emergency type or description
    fireEvent.click(continueBtn);
    expect(screen.getByText('Please select an emergency type.')).toBeInTheDocument();
    
    // Select emergency type
    fireEvent.click(screen.getByText('Fire'));
    fireEvent.click(continueBtn);
    expect(screen.getByText('Please provide a brief description.')).toBeInTheDocument();
    
    // Fill description
    fireEvent.change(screen.getByPlaceholderText(/describe hazards/i), { target: { value: 'Huge fire at market' } });
    fireEvent.click(continueBtn);
    
    // Should progress to step 2
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('handles multi-step progression and submission flow successfully', async () => {
    api.submitReport.mockResolvedValueOnce({ reportId: 'REP-123', receivedAt: new Date().toISOString() });
    
    renderComponent();
    advanceToLocation();

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Select an emergency location within Tagoloan operational bounds.')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mock-map'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit emergency/i }));

    await waitFor(() => {
      expect(api.submitReport).toHaveBeenCalledTimes(1);
    });
    const payload = api.submitReport.mock.calls[0][0];
    expect(JSON.parse(payload.get('emergencyCoordinates'))).toEqual({ latitude: 8.5, longitude: 124.75 });
    expect(JSON.parse(payload.get('standardizedAnswers'))).toEqual({ waterDepth: 'Knee deep', peopleStranded: 'Yes' });
    expect(screen.getByText('Help is being coordinated.')).toBeInTheDocument();
    expect(screen.getByText('REP-123')).toBeInTheDocument();
  });

  it('rejects an out-of-bounds map selection and keeps the location step open', () => {
    renderComponent();
    advanceToLocation();
    fireEvent.click(screen.getByTestId('mock-map'), { altKey: true });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    expect(api.submitReport).not.toHaveBeenCalled();
  });

  it('attaches GPS coordinates and preserves them through back navigation', async () => {
    mockRequestLocation.mockResolvedValueOnce({ lat: 8.54, lng: 124.75 });
    api.submitReport.mockResolvedValueOnce({ reportId: 'REP-GPS', receivedAt: new Date().toISOString() });
    renderComponent();
    advanceToLocation();
    fireEvent.click(screen.getByRole('button', { name: /use my gps location/i }));
    expect(mockRequestLocation).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('Location attached from GPS.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('8.54000, 124.75000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByLabelText('Latitude (manual option)')).toHaveValue('8.54');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit emergency/i }));
    await waitFor(() => expect(api.submitReport).toHaveBeenCalledTimes(1));
    const payload = api.submitReport.mock.calls[0][0];
    expect(JSON.parse(payload.get('emergencyCoordinates'))).toEqual({ latitude: 8.54, longitude: 124.75 });
    expect(JSON.parse(payload.get('reporterCoordinates'))).toEqual({ latitude: 8.54, longitude: 124.75 });
  });

  it('keeps a newer map choice when an earlier GPS request completes later', async () => {
    let resolveGps;
    mockRequestLocation.mockImplementationOnce(() => new Promise((resolve) => { resolveGps = resolve; }));
    renderComponent();
    advanceToLocation();
    fireEvent.click(screen.getByRole('button', { name: /use my gps location/i }));
    fireEvent.click(screen.getByTestId('mock-map'));
    resolveGps({ lat: 8.55, lng: 124.77 });
    await waitFor(() => expect(mockClearLocation).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('8.50000, 124.75000')).toBeInTheDocument();
  });

  it('requires another location when GPS is outside operational bounds', async () => {
    mockRequestLocation.mockResolvedValueOnce({ lat: 8.8, lng: 125 });
    renderComponent();
    advanceToLocation();
    fireEvent.click(screen.getByRole('button', { name: /use my gps location/i }));
    await waitFor(() => expect(screen.getByText(/GPS is outside Tagoloan operational bounds/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
  });

  it('allows keyboard entry after GPS permission is denied', () => {
    const view = renderComponent();
    advanceToLocation();
    geolocation = { ...geolocation, error: 'GPS permission was denied. Select the location on the map.' };
    view.rerender(<BrowserRouter><CitizenReport /></BrowserRouter>);
    expect(screen.getByText(/GPS permission was denied/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Latitude (manual option)'), { target: { value: '8.54' } });
    fireEvent.change(screen.getByLabelText('Longitude (manual option)'), { target: { value: '124.75' } });
    fireEvent.click(screen.getByRole('button', { name: /use entered coordinates/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.getByText('8.54000, 124.75000')).toBeInTheDocument();
  });

  it('prevents duplicate submissions while a report is pending and permits retry after failure', async () => {
    let rejectRequest;
    api.submitReport.mockImplementationOnce(() => new Promise((_, reject) => { rejectRequest = reject; }));
    renderComponent();
    advanceToLocation();
    fireEvent.click(screen.getByTestId('mock-map'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    const form = document.getElementById('report-form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.submitReport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    rejectRequest(new Error('network failure'));
    await waitFor(() => expect(screen.getByText('Unable to submit the report. Please try again.')).toBeInTheDocument());
    api.submitReport.mockResolvedValueOnce({ reportId: 'REP-RETRY', receivedAt: new Date().toISOString() });
    fireEvent.click(screen.getByRole('button', { name: /submit emergency/i }));
    await waitFor(() => expect(screen.getByText('REP-RETRY')).toBeInTheDocument());
    expect(api.submitReport).toHaveBeenCalledTimes(2);
  });
});
