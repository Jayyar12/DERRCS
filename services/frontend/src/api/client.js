const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getSession() {
  const token = localStorage.getItem('derrsc_token');
  const role = localStorage.getItem('derrsc_role');
  const fullName = localStorage.getItem('derrsc_full_name');
  return token ? { token, role, fullName } : null;
}

export function saveSession({ token, role, fullName, userId, unitId }) {
  localStorage.setItem('derrsc_token', token);
  localStorage.setItem('derrsc_role', role);
  localStorage.setItem('derrsc_full_name', fullName || '');
  localStorage.setItem('derrsc_user_id', userId || '');
  localStorage.setItem('derrsc_unit_id', unitId || '');
}

export function clearSession() {
  ['derrsc_token', 'derrsc_role', 'derrsc_full_name', 'derrsc_user_id', 'derrsc_unit_id']
    .forEach((key) => localStorage.removeItem(key));
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = localStorage.getItem('derrsc_token');
  const isFormData = body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    if (response.status === 401) clearSession();
    throw new ApiError(payload.error?.message || 'The request could not be completed.', {
      status: response.status,
      code: payload.error?.code,
    });
  }
  return payload.data;
}

export const api = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials }),
  submitReport: (formData) => apiRequest('/reports', { method: 'POST', body: formData }),
  candidates: () => apiRequest('/candidates'),
  candidate: (id) => apiRequest(`/candidates/${id}`),
  confirmCandidate: (id) => apiRequest(`/candidates/${id}/confirm`, { method: 'POST' }),
  units: () => apiRequest('/units'),
  incidents: () => apiRequest('/incidents'),
  incident: (id) => apiRequest(`/incidents/${id}`),
  assign: (incidentId, responseUnitId, notes) => apiRequest(`/incidents/${incidentId}/assign`, {
    method: 'POST', body: { responseUnitId, notes },
  }),
  closeIncident: (incidentId) => apiRequest(`/incidents/${incidentId}/close`, { method: 'POST' }),
  currentAssignment: () => apiRequest('/assignments/current'),
  updateAssignmentStatus: (assignmentId, status) => apiRequest(`/assignments/${assignmentId}/status`, {
    method: 'PATCH', body: { status },
  }),
  submitAssessment: (incidentId, assessment) => apiRequest(`/incidents/${incidentId}/field-assessment`, {
    method: 'POST', body: assessment,
  }),
  adminUsers: () => apiRequest('/admin/users'),
  createUser: (user) => apiRequest('/admin/users', { method: 'POST', body: user }),
  updateUser: (id, updates) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: updates }),
  auditLogs: () => apiRequest('/admin/audit-logs'),
  config: () => apiRequest('/admin/config'),
};
