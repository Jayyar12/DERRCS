import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    adminUsers: vi.fn(),
    auditLogs: vi.fn(),
    config: vi.fn(),
    incidents: vi.fn(),
    reports: vi.fn(),
    units: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
  },
  clearSession: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message) { super(message); }
  }
}));

vi.mock('../api/socket', () => ({
  disconnectSocket: vi.fn(),
}));

// Mock the Recharts components to avoid jsdom rendering issues
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="recharts-barchart">{children}</div>,
  Bar: () => <div data-testid="recharts-bar" />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Legend: () => <div data-testid="recharts-legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="recharts-responsive-container">{children}</div>,
}));

// Provide basic resize observer mock for rechart
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBasicResponses = () => {
    api.adminUsers.mockResolvedValue([
      { id: 'u1', username: 'admin1', full_name: 'Admin One', role: 'Admin', is_active: true },
      { id: 'u2', username: 'disp1', full_name: 'Dispatcher One', role: 'Dispatcher', is_active: false },
    ]);
    api.auditLogs.mockResolvedValue([
      { id: 'log1', action: 'incident_created', actor_name: 'Citizen', entity_name: 'Incident', entity_id: 'i1', created_at: new Date().toISOString() }
    ]);
    api.config.mockResolvedValue({ dbscanEpsilonMeters: 500, dbscanMinPoints: 3, reportedEscalationMinutes: 5, validatedEscalationMinutes: 10 });
    api.incidents.mockResolvedValue([
      { id: 'i1', incident_code: 'INC-1', emergency_type: 'Fire', status: 'Active', severity: 'Critical', created_at: new Date().toISOString() }
    ]);
    api.reports.mockResolvedValue([
      { id: 'r1', created_at: new Date().toISOString() }
    ]);
    api.units.mockResolvedValue([
      { id: 'u1' }
    ]);
  };

  const renderComponent = () => render(<BrowserRouter><AdminDashboard /></BrowserRouter>);

  it('loads and renders the analytics view by default with stats and charts', async () => {
    mockBasicResponses();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    // It should render Analytics by default
    await waitFor(() => {
      expect(screen.getByText('Report Volume Trend')).toBeInTheDocument();
    });
    
    // Stats
    expect(screen.getByText('Active Incidents')).toBeInTheDocument();
    expect(screen.getByText('Total Reports')).toBeInTheDocument();
  });

  it('navigates to staff view and can toggle user status', async () => {
    mockBasicResponses();
    renderComponent();

    // Click Staff Accounts sidebar button
    const staffBtn = screen.getByRole('button', { name: /staff accounts/i });
    fireEvent.click(staffBtn);

    await waitFor(() => {
      expect(screen.getByText('Create Staff Account')).toBeInTheDocument();
    });

    expect(screen.getByText('Dispatcher One')).toBeInTheDocument();

    // Click Activate on the inactive dispatcher
    api.updateUser.mockResolvedValueOnce({});
    mockBasicResponses(); // For the refresh load

    // Find the Activate button. Because the admin might be active, we find Activate which is specific to inactive
    const activateBtn = screen.getByRole('button', { name: 'Activate' });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(api.updateUser).toHaveBeenCalledWith('u2', { isActive: true });
    });
  });

  it('navigates to audit view and shows system logs', async () => {
    mockBasicResponses();
    renderComponent();

    // Click Audit Activity sidebar button
    const auditBtn = screen.getByRole('button', { name: /audit activity/i });
    fireEvent.click(auditBtn);

    await waitFor(() => {
      expect(screen.getByText('Recent Audit Activity')).toBeInTheDocument();
    });

    expect(screen.getByText('incident_created')).toBeInTheDocument();
  });

  it('displays error state if data loading fails', async () => {
    api.adminUsers.mockRejectedValue(new Error('Failed to fetch admin users'));
    api.auditLogs.mockResolvedValue([]);
    api.config.mockResolvedValue(null);
    api.incidents.mockResolvedValue([]);
    api.reports.mockResolvedValue([]);
    api.units.mockResolvedValue([]);
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch admin users')).toBeInTheDocument();
    });
  });
});
