import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import * as client from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual('../api/client');
  return {
    ...actual,
    api: {
      login: vi.fn(),
    },
    getSession: vi.fn(),
    saveSession: vi.fn(),
  };
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getSession.mockReturnValue(null);
  });

  it('renders AppHeader with organization branding and public portal navigation', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Agency Login' })).toBeInTheDocument();
    expect(screen.getAllByText('TAGOLOAN MDRRMO').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /public portal/i })).toHaveAttribute('href', '/');
    expect(screen.getByLabelText(/badge id \/ username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in securely/i })).toBeInTheDocument();
  });

  it('submits credentials, saves session, and navigates on success', async () => {
    client.api.login.mockResolvedValueOnce({
      token: 'jwt-123',
      role: 'Dispatcher',
      username: 'disp1',
      fullName: 'Chief Dispatcher',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dispatcher" element={<div>Dispatcher Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/badge id \/ username/i), {
      target: { value: 'disp1' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    await waitFor(() => {
      expect(client.api.login).toHaveBeenCalledWith({
        username: 'disp1',
        password: 'password123',
      });
      expect(client.saveSession).toHaveBeenCalledWith({
        token: 'jwt-123',
        role: 'Dispatcher',
        username: 'disp1',
        fullName: 'Chief Dispatcher',
      });
      expect(screen.getByText('Dispatcher Home')).toBeInTheDocument();
    });
  });

  it('displays an error alert when login fails', async () => {
    client.api.login.mockRejectedValueOnce(
      new client.ApiError('Invalid credentials', 401)
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/badge id \/ username/i), {
      target: { value: 'wronguser' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('redirects to dashboard immediately if an active session exists', () => {
    client.getSession.mockReturnValue({
      token: 'valid-token',
      role: 'ResponseUnit',
      username: 'unit-alpha',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/responder" element={<div>Responder Portal Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Responder Portal Home')).toBeInTheDocument();
  });

  it('toggles password visibility when the visibility button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('clears error alert when user modifies username or password', async () => {
    client.api.login.mockRejectedValueOnce(
      new client.ApiError('Invalid credentials', 401)
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/badge id \/ username/i), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in securely/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/badge id \/ username/i), { target: { value: 'bad2' } });
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
  });
});
