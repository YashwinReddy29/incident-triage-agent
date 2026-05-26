import axios from 'axios'

const API = axios.create({ baseURL: '/api' })

export const testConnection   = ()      => API.get('/incidents/snow/test')
export const syncIncidents    = (limit) => API.post(`/incidents/snow/sync?limit=${limit}`)
export const getIncidents     = (limit) => API.get(`/incidents/?limit=${limit}`)
export const triageIncident   = (data)  => API.post('/triage/', data)
export const getTriageHistory = (limit) => API.get(`/triage/history?limit=${limit}`)
export const getTriageStats   = ()      => API.get('/triage/stats')
export const getRunbooks      = ()      => API.get('/runbooks/')
export const searchRunbooks   = (q)     => API.get(`/runbooks/search?q=${q}`)