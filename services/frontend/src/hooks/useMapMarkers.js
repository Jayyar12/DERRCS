import { useMemo } from 'react';

export const INCIDENT_MARKER_COLORS = {
  Reported: '#f59e0b',
  Validated: '#2563eb',
  Dispatched: '#3b82f6',
  Active: '#ef4444',
  Resolved: '#14b8a6',
  Closed: '#71717a',
};

export function useMapMarkers({ rawReports = [], candidates = [], incidents = [], selection = null }) {
  return useMemo(() => [
    ...rawReports
      .filter((r) => r.latitude && r.longitude)
      .map((report) => ({
        id: `report-${report.id}`,
        latitude: report.latitude,
        longitude: report.longitude,
        title: 'Unverified Report',
        description: report.emergency_type,
        color: '#9ca3af',
        reportId: report.id,
      })),
    ...candidates
      .filter((c) => c.center_location?.coordinates?.length >= 2)
      .map((candidate) => ({
        id: `candidate-${candidate.id}`,
        latitude: candidate.center_location.coordinates[1],
        longitude: candidate.center_location.coordinates[0],
        title: `${candidate.emergency_type} candidate`,
        description: `${candidate.report_count} reports — Pending review`,
        color: '#f59e0b',
        selected: selection?.type === 'candidate' && selection?.id === candidate.id,
        candidateId: candidate.id,
      })),
    ...incidents
      .filter((i) => i.location?.coordinates?.length >= 2)
      .map((incident) => ({
        id: `incident-${incident.id}`,
        latitude: incident.location.coordinates[1],
        longitude: incident.location.coordinates[0],
        title: incident.incident_code,
        description: `${incident.emergency_type} — ${incident.status}`,
        color: INCIDENT_MARKER_COLORS[incident.status] || '#ef4444',
        selected: selection?.type === 'incident' && selection?.id === incident.id,
        incidentId: incident.id,
      })),
  ], [rawReports, candidates, incidents, selection]);
}

export default useMapMarkers;
