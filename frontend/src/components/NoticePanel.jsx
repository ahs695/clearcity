import { useState } from 'react'
import { X } from 'lucide-react'
import { updateNoticeStatus } from '../api/client'

const statusClass = (status) => {
  if (status === 'pending') return 'bg-yellow-100 text-yellow-800'
  if (status === 'dispatched') return 'bg-blue-100 text-blue-800'
  return 'bg-green-100 text-green-800'
}

export default function NoticePanel({ notices, onClose }) {
  const [localNotices, setLocalNotices] = useState(notices)

  const markDispatched = (id) => {
    updateNoticeStatus(id, 'dispatched')
      .then(() => {
        setLocalNotices(prev =>
          prev.map(n => n.id === id ? { ...n, status: 'dispatched' } : n)
        )
      })
      .catch(() => {})
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-xs text-gray-700">Enforcement Notices</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-3">
        {localNotices.map((notice) => {
          const nj = notice.notice_json || {}
          return (
            <div key={notice.id} className="bg-white border rounded p-2 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {notice.rank}
                </span>
                <span className="font-semibold text-gray-800 truncate">{notice.source_name}</span>
                <span className="ml-auto bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {notice.source_type}
                </span>
              </div>

              {nj.evidence_summary && (
                <p className="text-sm font-medium text-gray-800 mb-2 leading-tight">
                  {nj.evidence_summary}
                </p>
              )}

              {nj.sensor_readings && (
                <div className="grid grid-cols-2 gap-1 mb-2 bg-gray-50 rounded p-1.5">
                  <div>
                    <span className="text-gray-500">AQI </span>
                    <span className="font-semibold">{nj.sensor_readings.aqi ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">PM2.5 </span>
                    <span className="font-semibold">{nj.sensor_readings.pm25 ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Wind </span>
                    <span className="font-semibold">{nj.sensor_readings.wind_speed ?? '—'} m/s</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Dir </span>
                    <span className="font-semibold">{nj.sensor_readings.wind_direction ?? '—'}°</span>
                  </div>
                </div>
              )}

              {nj.action_required && (
                <div className="border border-red-300 bg-red-50 rounded p-1.5 mb-2 text-red-800">
                  {nj.action_required}
                </div>
              )}

              {nj.legal_authority && (
                <p className="text-gray-400 mb-2">{nj.legal_authority}</p>
              )}

              <div className="flex items-center justify-between mt-1">
                <span className={`px-2 py-0.5 rounded font-medium ${statusClass(notice.status)}`}>
                  {notice.status}
                </span>
                {notice.status === 'pending' && (
                  <button
                    onClick={() => markDispatched(notice.id)}
                    className="bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                  >
                    Mark Dispatched
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
