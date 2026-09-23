import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CitizenReportsList } from './CitizenReportsList';

describe('CitizenReportsList', () => {
  it('explains when no citizen reports are linked', () => {
    render(<CitizenReportsList reports={[]} />);
    expect(screen.getByText('No citizen reports')).toBeInTheDocument();
  });

  it('keeps a readable fallback when a submitted photo fails to load', () => {
    render(<CitizenReportsList reports={[{
      id: 'report-1',
      description: 'Water rising near the bridge',
      photo_url: '/uploads/missing.jpg',
      emergency_location: { coordinates: [124.75, 8.54] },
    }]} />);

    fireEvent.error(screen.getByAltText('Citizen submission photo'));
    expect(screen.getByText('Submitted photo is unavailable.')).toBeInTheDocument();
    expect(screen.getByText(/Emergency location: 8.54, 124.75/)).toBeInTheDocument();
    expect(screen.getByText('Water rising near the bridge')).toBeInTheDocument();
  });
});
