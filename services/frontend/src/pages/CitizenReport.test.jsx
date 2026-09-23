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
      <div data-testid="mock-map" onClick={() => onLocationChange?.({ latitude: 8.5, longitude: 124.7 })}>
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestLocation = vi.fn();
    useGeolocation.mockReturnValue({
      coordinates: null,
      loading: false,
      error: null,
      requestLocation: mockRequestLocation,
    });
  });

  const renderComponent = () => render(<BrowserRouter><CitizenReport /></BrowserRouter>);

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
    
    // Step 1
    fireEvent.click(screen.getByText('Flood'));
    fireEvent.change(screen.getByPlaceholderText(/describe hazards/i), { target: { value: 'Water knee deep' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Step 2
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    
    // Answer questions
    const selects = screen.getAllByTestId('mock-select');
    
    fireEvent.change(selects[0], { target: { value: 'Knee deep' } });
    fireEvent.change(selects[1], { target: { value: 'Yes' } });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Step 3
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    
    // Try to skip location
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Step 4
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    
    // Attempt submit without map click (it should fail if no coordinates)
    fireEvent.click(screen.getByRole('button', { name: /submit emergency/i }));
    expect(screen.getByText('Please select an emergency location on the map.')).toBeInTheDocument();
    
    // Go back to step 3 and click map
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByTestId('mock-map'));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Submit again on step 4
    fireEvent.click(screen.getByRole('button', { name: /submit emergency/i }));
    
    await waitFor(() => {
      expect(api.submitReport).toHaveBeenCalled();
    });
    
    expect(screen.getByText('Help is being coordinated.')).toBeInTheDocument();
    expect(screen.getByText('REP-123')).toBeInTheDocument();
  });
});
