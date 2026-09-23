import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => {
  vi.restoreAllMocks();
});

it('keeps the dashboard usable after a review fails and resets for the next record', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});

  function Review({ record }) {
    if (record === 'broken') throw new Error('Review failed');
    return <p>Reviewing {record}</p>;
  }

  const { rerender } = render(
    <>
      <ErrorBoundary resetKey="broken">
        <Review record="broken" />
      </ErrorBoundary>
      <p>Dashboard controls remain available</p>
    </>
  );

  expect(screen.getByText('This section could not be displayed.')).toBeInTheDocument();
  expect(screen.getByText('Dashboard controls remain available')).toBeInTheDocument();

  rerender(
    <>
      <ErrorBoundary resetKey="next">
        <Review record="next" />
      </ErrorBoundary>
      <p>Dashboard controls remain available</p>
    </>
  );

  expect(screen.getByText('Reviewing next')).toBeInTheDocument();
});
