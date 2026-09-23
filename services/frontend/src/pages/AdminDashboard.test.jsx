import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
    window.localStorage.clear();
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

    expect(screen.getByRole('link', { name: 'Dispatcher View' })).toHaveAttribute('href', '/dispatcher');

    // It should render Analytics by default
    expect(await screen.findByText('Report Volume Trend', {}, { timeout: 5000 })).toBeInTheDocument();
    
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

  it('shows staff loading and empty states without treating pending data as empty', async () => {
    mockBasicResponses();
    let resolveUsers;
    api.adminUsers.mockImplementationOnce(() => new Promise((resolve) => {
      resolveUsers = resolve;
    }));

    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Create Staff Account')).toBeInTheDocument();
    expect(screen.queryByText('No staff accounts')).not.toBeInTheDocument();

    await act(async () => resolveUsers([]));
    expect(screen.getByText('No staff accounts')).toBeInTheDocument();
  });

  it('requires staff details before submitting a new account', async () => {
    mockBasicResponses();
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Create Staff Account')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(api.createUser).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Full Name')).toBeInvalid();
  });

  it('creates a staff account with the entered details and resets the form', async () => {
    mockBasicResponses();
    api.createUser.mockResolvedValueOnce({ id: 'u-new' });
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Create Staff Account')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Maria Reyes' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mreyes' } });
    fireEvent.change(screen.getByLabelText('Phone (Optional)'), { target: { value: '09171234567' } });
    fireEvent.change(screen.getByLabelText('Temporary Password'), { target: { value: 'securepass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(api.createUser).toHaveBeenCalledWith({
      fullName: 'Maria Reyes',
      username: 'mreyes',
      phoneNumber: '09171234567',
      password: 'securepass123',
      role: 'Dispatcher',
    }));
    expect(await screen.findByText('Staff account created.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toHaveValue('');
    expect(screen.getByLabelText('Username')).toHaveValue('');
  });

  it('disables staff creation while saving and ignores a second submit', async () => {
    mockBasicResponses();
    let resolveCreate;
    api.createUser.mockImplementationOnce(() => new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Create Staff Account')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Maria Reyes' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mreyes' } });
    fireEvent.change(screen.getByLabelText('Temporary Password'), { target: { value: 'securepass123' } });
    const createButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(createButton);

    await waitFor(() => expect(api.createUser).toHaveBeenCalledTimes(1));
    expect(createButton).toBeDisabled();
    fireEvent.submit(createButton.closest('form'));
    expect(api.createUser).toHaveBeenCalledTimes(1);

    await act(async () => resolveCreate({ id: 'u-new' }));
    expect(screen.getByText('Staff account created.')).toBeInTheDocument();
    expect(createButton).toBeEnabled();
  });

  it('deactivates staff and reports a failed deactivation', async () => {
    mockBasicResponses();
    api.updateUser.mockRejectedValueOnce(new Error('Unable to deactivate account'));
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Admin One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith('u1', { isActive: false }));
    expect(await screen.findByText('Unable to deactivate account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeEnabled();
  });

  it('successfully deactivates an active staff account', async () => {
    mockBasicResponses();
    api.updateUser.mockResolvedValueOnce({});
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Admin One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(api.updateUser).toHaveBeenCalledWith('u1', { isActive: false }));
    expect(await screen.findByText('Admin One is now deactivated.')).toBeInTheDocument();
  });

  it('shows an API error when staff creation fails and keeps the form values', async () => {
    mockBasicResponses();
    api.createUser.mockRejectedValueOnce(new Error('Username is already in use'));
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /staff accounts/i }));
    expect(await screen.findByText('Create Staff Account')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Maria Reyes' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mreyes' } });
    fireEvent.change(screen.getByLabelText('Temporary Password'), { target: { value: 'securepass123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Username is already in use')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('mreyes');
  });
});
