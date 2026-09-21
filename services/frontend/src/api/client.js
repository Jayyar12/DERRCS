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
  login: (credentials, options = {}) => apiRequest('/auth/login', { method: 'POST', body: credentials, ...options }),
  reports: (options = {}) => apiRequest('/reports', options),
  submitReport: (formData, options = {}) => apiRequest('/reports', { method: 'POST', body: formData, ...options }),
  candidates: (options = {}) => apiRequest('/candidates', options),
  candidate: (id, options = {}) => apiRequest(`/candidates/${id}`, options),
  confirmCandidate: (id, options = {}) => apiRequest(`/candidates/${id}/confirm`, { method: 'POST', ...options }),
  units: (options = {}) => apiRequest('/units', options),
  incidents: (options = {}) => apiRequest('/incidents', options),
  incident: (id, options = {}) => apiRequest(`/incidents/${id}`, options),
  assign: (incidentId, responseUnitId, notes, options = {}) => apiRequest(`/incidents/${incidentId}/assign`, {
    method: 'POST', body: { responseUnitId, notes }, ...options,
  }),
  closeIncident: (incidentId, options = {}) => apiRequest(`/incidents/${incidentId}/close`, { method: 'POST', ...options }),
  currentAssignment: (options = {}) => apiRequest('/assignments/current', options),
  updateAssignmentStatus: (assignmentId, status, options = {}) => apiRequest(`/assignments/${assignmentId}/status`, {
    method: 'PATCH', body: { status }, ...options,
  }),
  submitAssessment: (incidentId, assessment, options = {}) => apiRequest(`/incidents/${incidentId}/field-assessment`, {
    method: 'POST', body: assessment, ...options,
  }),
  adminUsers: (options = {}) => apiRequest('/admin/users', options),
  createUser: (user, options = {}) => apiRequest('/admin/users', { method: 'POST', body: user, ...options }),
  updateUser: (id, updates, options = {}) => apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: updates, ...options }),
  auditLogs: (options = {}) => apiRequest('/admin/audit-logs', options),
  config: (options = {}) => apiRequest('/admin/config', options),
};
