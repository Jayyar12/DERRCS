import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import DispatcherDashboard from './DispatcherDashboard';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    candidates: vi.fn(),
    candidate: vi.fn(),
    confirmCandidate: vi.fn(),
    incidents: vi.fn(),
    incident: vi.fn(),
    units: vi.fn(),
    reports: vi.fn(),
    assign: vi.fn(),
    closeIncident: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message, { status, code } = {}) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  getSession: vi.fn(() => ({ role: 'Dispatcher', fullName: 'Dispatcher Juan' })),
  clearSession: vi.fn(),
}));

vi.mock('../api/socket', () => ({
  subscribeSocket: vi.fn(() => () => {}),
  disconnectSocket: vi.fn(),
}));

vi.mock('../components/map/TagoloanMap', () => ({
  default: function MockMap({ markers, onMarkerSelect }) {
    return (
      <div data-testid="mock-map">
        {markers.map((m) => (
          <button
            key={m.id}
            data-testid={`marker-${m.id}`}
            onClick={() => onMarkerSelect(m)}
          >
            {m.title}
          </button>
        ))}
      </div>
    );
  },
}));

describe('DispatcherDashboard integration and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCandidates = [
    {
      id: 'cand-1',
      emergency_type: 'Flood',
      status: 'Pending',
      report_count: 3,
      created_at: '2026-09-21T10:00:00Z',
      latest_summary: 'Flood in Poblacion',
      center_location: { coordinates: [124.75, 8.53] },
    },
  ];

  const mockIncidents = Array.from({ length: 12 }, (_, i) => ({
    id: `inc-${i + 1}`,
    incident_code: `INC-2026-0${i + 1}`,
    emergency_type: i % 2 === 0 ? 'Fire' : 'Medical',
    status: 'Validated',
    report_count: 2,
    created_at: '2026-09-21T09:00:00Z',
    location: { coordinates: [124.75, 8.53] },
  }));

  const mockReports = [];

  it('renders all incidents without 8-record truncation and allows opening candidate by card', async () => {
    api.candidates.mockResolvedValueOnce(mockCandidates);
    api.incidents.mockResolvedValueOnce(mockIncidents);
    api.reports.mockResolvedValueOnce(mockReports);
    api.candidate.mockResolvedValueOnce({
      ...mockCandidates[0],
      reports: [],
    });
    api.units.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/dispatcher']}>
        <Routes>
          <Route path="/dispatcher" element={<DispatcherDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Flood in Poblacion')).toBeInTheDocument();
    });

    // Verify all 12 incidents are rendered (no slice(0, 8) limitation)
    expect(screen.getAllByText('INC-2026-01').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('INC-2026-012').length).toBeGreaterThanOrEqual(1);

    // Click candidate card to open review
    const candidateCard = screen.getByText('Flood in Poblacion').closest('[role="button"]');
    expect(candidateCard).toBeInTheDocument();
    fireEvent.click(candidateCard);

    await waitFor(() => {
      expect(api.candidate).toHaveBeenCalledWith('cand-1', expect.any(Object));
    });
  });

  it('restores selection from URL query param when loaded directly', async () => {
    api.candidates.mockResolvedValueOnce(mockCandidates);
    api.incidents.mockResolvedValueOnce(mockIncidents);
    api.reports.mockResolvedValueOnce(mockReports);
    api.incident.mockResolvedValueOnce({
      id: 'inc-12',
      incident_code: 'INC-2026-012',
      emergency_type: 'Medical',
      status: 'Validated',
      created_at: '2026-09-21T09:00:00Z',
      reports: [],
      assignments: [],
      assessments: [],
    });
    api.units.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/dispatcher?review=incident:inc-12']}>
        <Routes>
          <Route path="/dispatcher" element={<DispatcherDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.incident).toHaveBeenCalledWith('inc-12', expect.any(Object));
      expect(screen.getByRole('heading', { level: 2, name: /INC-2026-012/ })).toBeInTheDocument();
    });
  });

  it('opens record review when selecting incident or candidate map marker', async () => {
    api.candidates.mockResolvedValueOnce(mockCandidates);
    api.incidents.mockResolvedValueOnce(mockIncidents);
    api.reports.mockResolvedValueOnce(mockReports);
    api.incident.mockResolvedValueOnce({
      id: 'inc-1',
      incident_code: 'INC-2026-001',
      emergency_type: 'Fire',
      status: 'Validated',
      reports: [],
      assignments: [],
      assessments: [],
    });
    api.units.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/dispatcher']}>
        <Routes>
          <Route path="/dispatcher" element={<DispatcherDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-map')).toBeInTheDocument();
    });

    const markerBtn = screen.getByTestId('marker-incident-inc-1');
    fireEvent.click(markerBtn);

    await waitFor(() => {
      expect(api.incident).toHaveBeenCalledWith('inc-1', expect.any(Object));
    });
  });

  it('removes review query parameter when closing review sheet while preserving other parameters', async () => {
    api.candidates.mockResolvedValueOnce(mockCandidates);
    api.incidents.mockResolvedValueOnce(mockIncidents);
    api.reports.mockResolvedValueOnce(mockReports);
    api.candidate.mockResolvedValueOnce({
      ...mockCandidates[0],
      reports: [],
    });

    function LocationDisplay() {
      const location = useLocation();
      return <div data-testid="current-search">{location.search}</div>;
    }

    render(
      <MemoryRouter initialEntries={['/dispatcher?filter=active&review=candidate:cand-1']}>
        <Routes>
          <Route
            path="/dispatcher"
            element={
              <>
                <DispatcherDashboard />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Flood Candidate')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('current-search')).toHaveTextContent('?filter=active');
    });
  });
});
