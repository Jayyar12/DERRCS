import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMapMarkers, INCIDENT_MARKER_COLORS } from './useMapMarkers';

describe('useMapMarkers', () => {
  it('maps incidents, candidates, and raw reports to markers with correct colors', () => {
    const rawReports = [
      { id: 'rep-1', latitude: 8.52, longitude: 124.76, emergency_type: 'Flood' },
    ];
    const candidates = [
      { id: 'cand-1', center_location: { coordinates: [124.75, 8.53] }, emergency_type: 'Fire', report_count: 3 },
    ];
    const incidents = [
      { id: 'inc-1', location: { coordinates: [124.74, 8.51] }, incident_code: 'INC-101', emergency_type: 'Medical', status: 'Active' },
    ];

    const { result } = renderHook(() =>
      useMapMarkers({ rawReports, candidates, incidents, selection: null })
    );

    expect(result.current).toHaveLength(3);
    const incidentMarker = result.current.find((m) => m.id === 'incident-inc-1');
    expect(incidentMarker).toBeDefined();
    expect(incidentMarker.color).toBe(INCIDENT_MARKER_COLORS.Active);
    expect(incidentMarker.title).toBe('INC-101');
  });
});
