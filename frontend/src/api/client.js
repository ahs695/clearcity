import axios from 'axios'

const BASE = 'http://localhost:8000/api'

export const getStations = () => axios.get(`${BASE}/stations`).then(r => r.data)
export const getStationHistory = (id, hours = 24) => axios.get(`${BASE}/stations/${id}/history?hours=${hours}`).then(r => r.data)
export const getAttributionResults = () => axios.get(`${BASE}/attribution/results`).then(r => r.data)
export const triggerAttribution = (stationId) => axios.post(`${BASE}/attribution/trigger`, { station_id: stationId }).then(r => r.data)
export const getEnforcementNotices = (status) => axios.get(`${BASE}/enforcement/notices`, { params: { status } }).then(r => r.data)
export const getNotice = (id, lang = 'en') => axios.get(`${BASE}/enforcement/notices/${id}`, { params: { lang } }).then(r => r.data)
export const fetchNotices = (attributionId) => axios.post(`${BASE}/enforcement/generate`, { attribution_id: attributionId }).then(r => r.data)
export const updateNoticeStatus = (id, status) => axios.patch(`${BASE}/enforcement/notices/${id}/status`, { status }).then(r => r.data)
export const getForecast = (stationId) => axios.get(`${BASE}/forecast/${stationId}`).then(r => r.data)
export const getDemoStatus = () => axios.get(`${BASE}/demo/status`).then(r => r.data)
export const getSources = () => axios.get(`${BASE}/sources`).then(r => r.data)
