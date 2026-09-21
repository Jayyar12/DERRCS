import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login-state">{location.state?.from || 'no-from'}</div>;
}

describe('ProtectedRoute query preservation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects unauthenticated user to /login and preserves complete pathname and query params', () => {
    render(
      <MemoryRouter initialEntries={['/dispatcher?review=incident:inc-999&filter=all']}>
        <Routes>
          <Route
            path="/dispatcher"
            element={
              <ProtectedRoute allowedRoles={['Dispatcher']}>
                <div>Protected Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-state')).toHaveTextContent(
      '/dispatcher?review=incident:inc-999&filter=all'
    );
  });
});
