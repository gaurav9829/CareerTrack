import client from './client'

// ---- Public job endpoints (no auth) ----

// params: q, location, company, type, level, sort, page, limit
export function fetchJobs(params) {
  return client.get('/jobs', { params }).then((r) => r.data)
}

export function fetchJob(id) {
  return client.get(`/jobs/${id}`).then((r) => r.data)
}

// formData: multipart with all fields + the resume file
export function submitApplication(jobId, formData, onProgress) {
  return client
    .post(`/jobs/${jobId}/apply`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    })
    .then((r) => r.data)
}
