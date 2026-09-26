import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppShell from './AppShell';

describe('AppShell', () => {
  it('renders a skip-link to main content', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    );
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('renders child routes inside the outlet', () => {
    render(
      <MemoryRouter initialEntries={['/test']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/test" element={<div data-testid="child-page">Child Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('child-page')).toBeInTheDocument();
    expect(screen.getByText('Child Page Content')).toBeInTheDocument();
  });
});
