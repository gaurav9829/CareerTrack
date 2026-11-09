import client from './client'

// ---- Auth ----
export function login(email, password) {
  return client.post('/auth/login', { email, password }).then((r) => r.data)
}
export function logout() {
  return client.post('/auth/logout').then((r) => r.data)
}
export function fetchMe() {
  return client.get('/auth/me').then((r) => r.data)
}

// ---- Admin: dashboard + jobs ----
export function fetchStats() {
  return client.get('/admin/stats').then((r) => r.data)
}

// params: q, status, sort, page, limit
export function fetchAdminJobs(params) {
  return client.get('/admin/jobs', { params }).then((r) => r.data)
}

export function fetchAdminJob(id) {
  return client.get(`/admin/jobs/${id}`).then((r) => r.data)
}

export function createJob(payload) {
  return client.post('/admin/jobs', payload).then((r) => r.data)
}

export function updateJob(id, payload) {
  return client.put(`/admin/jobs/${id}`, payload).then((r) => r.data)
}

export function publishJob(id) {
  return client.patch(`/admin/jobs/${id}/publish`).then((r) => r.data)
}
export function unpublishJob(id) {
  return client.patch(`/admin/jobs/${id}/unpublish`).then((r) => r.data)
}
export function closeJob(id) {
  return client.patch(`/admin/jobs/${id}/close`).then((r) => r.data)
}
export function deleteJob(id) {
  return client.delete(`/admin/jobs/${id}`).then((r) => r.data)
}

// ---- Admin: applications ----

// params: job, status, from, to, q, page, limit
export function fetchApplications(params) {
  return client.get('/admin/applications', { params }).then((r) => r.data)
}

export function fetchApplication(id) {
  return client.get(`/admin/applications/${id}`).then((r) => r.data)
}

export function updateApplicationStatus(id, status) {
  return client.patch(`/admin/applications/${id}/status`, { status }).then((r) => r.data)
}

export function addApplicationNote(id, text) {
  return client.post(`/admin/applications/${id}/notes`, { text }).then((r) => r.data)
}

export function deleteApplication(id) {
  return client.delete(`/admin/applications/${id}`).then((r) => r.data)
}

// The résumé stream and CSV export are plain links (the auth cookie is sent
// automatically because they are same-origin), so expose URL builders:
export function resumeUrl(applicationId) {
  return `${client.defaults.baseURL}/admin/applications/${applicationId}/resume`
}

export function exportCsvUrl(params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return `${client.defaults.baseURL}/admin/applications/export${qs ? `?${qs}` : ''}`
}
