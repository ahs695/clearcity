import { useState } from 'react'
import { updateNoticeStatus } from '../api/client'

const RANK_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#eab308' }

const getAQIColor = (aqi) => {
  if (aqi == null) return '#888888'
  if (aqi <= 50) return '#00e400'
  if (aqi <= 100) return '#92d050'
  if (aqi <= 200) return '#ffff00'
  if (aqi <= 300) return '#ff7e00'
  if (aqi <= 400) return '#ff0000'
  return '#99004c'
}

const statusClass = (status) => {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
  if (status === 'dispatched') return 'bg-blue-100 text-blue-800'
  return 'bg-green-100 text-green-800'
}

const parseLatLon = (address) => {
  if (!address) return null
  if (typeof address === 'object' && address.lat != null) {
    return [parseFloat(address.lat), parseFloat(address.lon)]
  }
  if (typeof address === 'string') {
    const parts = address.split(',').map(s => parseFloat(s.trim()))
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]]
    }
  }
  return null
}

export default function InspectionCard({ notice, onStatusUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [lang, setLang] = useState('en')
  const [copied, setCopied] = useState(false)

  const nj = notice.notice_json || {}
  const njHi = notice.notice_json_hindi || null
  const aqi = nj.sensor_readings?.aqi ?? null
  const confidence = nj.attributed_sources?.[0]?.confidence ?? 0
  const rankColor = RANK_COLORS[notice.rank] || '#6b7280'
  const coords = parseLatLon(nj.address)

  const markDispatched = () => {
    updateNoticeStatus(notice.id, 'dispatched')
      .then(onStatusUpdate)
      .catch(() => {})
  }

  const openMaps = () => {
    if (coords) window.open(`https://maps.google.com/?q=${coords[0]},${coords[1]}`, '_blank')
  }

  const shareNotice = () => {
    const text = nj.evidence_summary || `Notice #${nj.notice_number || notice.id}`
    if (navigator.share) {
      navigator.share({ title: 'ClearCity Notice', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  // Active notice data (English or Hindi)
  const d = lang === 'hi' && njHi ? njHi : nj

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Top row: rank + site name + source type */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <span
          className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: rankColor }}
        >
          {notice.rank}
        </span>
        <span className="font-semibold text-gray-900 flex-1 truncate text-sm">
          {nj.issued_to || notice.source_name}
        </span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">
          {notice.source_type}
        </span>
      </div>

      {/* AQI chip + status chip */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{
            backgroundColor: getAQIColor(aqi),
            color: aqi != null && aqi <= 200 ? '#111827' : '#fff',
          }}
        >
          {aqi != null ? `AQI ${aqi}` : 'N/A'}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusClass(notice.status)}`}>
          {notice.status}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-0.5">
          <span>Confidence</span>
          <span>{(confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full"
            style={{ width: `${Math.min(confidence * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-xs text-blue-600 font-medium py-2 border-t hover:bg-gray-50 transition-colors"
      >
        {expanded ? 'Hide ↑' : 'View Notice ↓'}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t">
          {/* Language toggle */}
          <div className="flex gap-2 px-4 pt-3 pb-2">
            <button
              onClick={() => setLang('en')}
              className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                lang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              English
            </button>
            {njHi && (
              <button
                onClick={() => setLang('hi')}
                className={`text-xs px-3 py-1 rounded font-medium transition-colors ${
                  lang === 'hi'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                हिंदी
              </button>
            )}
          </div>

          {/* Notice fields */}
          <div className="px-4 pb-2 space-y-2 text-xs">
            {d.notice_number && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-xs">Notice #</span>
                <span className="ml-2 text-gray-700">{d.notice_number}</span>
              </div>
            )}

            {d.issued_to && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-xs">Issued to</span>
                <p className="font-semibold text-gray-900 mt-0.5">{d.issued_to}</p>
              </div>
            )}

            {d.violation_type && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-xs">Violation</span>
                <p className="text-gray-700 mt-0.5">{d.violation_type}</p>
              </div>
            )}

            {d.evidence_summary && (
              <div className="bg-blue-50 rounded p-2">
                <p className="text-sm font-medium text-gray-800 leading-snug">{d.evidence_summary}</p>
              </div>
            )}

            {d.sensor_readings && (
              <div className="grid grid-cols-2 gap-1 bg-gray-50 rounded p-2">
                <div>
                  <span className="text-gray-500">AQI </span>
                  <span className="font-semibold text-gray-800">{d.sensor_readings.aqi ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">PM2.5 </span>
                  <span className="font-semibold text-gray-800">{d.sensor_readings.pm25 ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Wind </span>
                  <span className="font-semibold text-gray-800">{d.sensor_readings.wind_speed ?? '—'} m/s</span>
                </div>
                <div>
                  <span className="text-gray-500">Dir </span>
                  <span className="font-semibold text-gray-800">{d.sensor_readings.wind_direction ?? '—'}°</span>
                </div>
              </div>
            )}

            {d.action_required && (
              <div className="border-l-4 border-red-500 bg-red-50 pl-3 py-2 pr-2 rounded-r">
                <p className="font-bold text-red-800">{d.action_required}</p>
              </div>
            )}

            {d.compliance_deadline && (
              <div>
                <span className="text-gray-400 uppercase tracking-wide text-xs">Compliance deadline</span>
                <p className="text-gray-700 mt-0.5">{d.compliance_deadline}</p>
              </div>
            )}

            {d.legal_authority && (
              <p className="text-gray-400 italic">{d.legal_authority}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-4 py-3 border-t">
            <button
              onClick={markDispatched}
              disabled={notice.status !== 'pending'}
              className="flex-1 bg-blue-600 text-white text-xs font-semibold py-2 rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Mark Dispatched
            </button>
            <button
              onClick={openMaps}
              disabled={!coords}
              className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 rounded hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              {coords ? 'Open in Maps' : 'Location unavailable'}
            </button>
            <button
              onClick={shareNotice}
              className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 rounded hover:bg-gray-200 transition-colors"
            >
              {copied ? 'Copied!' : 'Share Notice'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
