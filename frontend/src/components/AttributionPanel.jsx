import { useState, useEffect } from 'react'
import { triggerAttribution, fetchNotices, getForecast } from '../api/client'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts'
import NoticePanel from './NoticePanel'

const compass = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

const aqiChipClass = (aqi) => {
  if (!aqi) return 'bg-gray-300 text-gray-700'
  if (aqi <= 50) return 'bg-green-400 text-gray-900'
  if (aqi <= 100) return 'bg-lime-400 text-gray-900'
  if (aqi <= 200) return 'bg-yellow-400 text-gray-900'
  if (aqi <= 300) return 'bg-orange-500 text-white'
  if (aqi <= 400) return 'bg-red-600 text-white'
  return 'bg-purple-900 text-white'
}

export default function AttributionPanel({ stationId, stationName, aqi }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notices, setNotices] = useState([])
  const [noticesVisible, setNoticesVisible] = useState(false)
  const [noticesLoading, setNoticesLoading] = useState(false)
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    if (!stationId) return
    setLoading(true)
    setResult(null)
    setForecast(null)
    setNoticesVisible(false)
    setNotices([])
    triggerAttribution(stationId)
      .then(setResult)
      .catch(() => {})
      .finally(() => setLoading(false))
    getForecast(stationId).then(setForecast).catch(() => {})
  }, [stationId])

  const handleViewNotices = () => {
    if (!result) return
    setNoticesLoading(true)
    fetchNotices(result.id)
      .then(data => {
        setNotices(data)
        setNoticesVisible(true)
      })
      .catch(() => {})
      .finally(() => setNoticesLoading(false))
  }

  if (loading) {
    return (
      <div className="border-t p-4 text-xs text-gray-500 text-center">
        Loading attribution…
      </div>
    )
  }

  if (!result) return null

  const sources = Array.isArray(result.attributed_sources) ? result.attributed_sources : []

  return (
    <div className="border-t bg-gray-50 p-3 text-xs overflow-y-auto max-h-[32rem]">
      <div className="font-semibold text-gray-800 mb-1 text-sm">{stationName}</div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`font-bold px-2 py-0.5 rounded text-xs ${aqiChipClass(result.aqi_at_trigger)}`}>
          AQI {result.aqi_at_trigger}
        </span>
        <span className="text-gray-400">
          {result.triggered_at ? new Date(result.triggered_at).toLocaleString() : ''}
        </span>
      </div>

      {(result.wind_speed != null || result.wind_direction != null) && (
        <div className="text-gray-600 mb-3">
          Wind:{' '}
          {result.wind_speed != null ? `${result.wind_speed} m/s` : '—'}
          {result.wind_direction != null
            ? ` · ${result.wind_direction}° (${compass(result.wind_direction)})`
            : ''}
        </div>
      )}

      {sources.length > 0 && (
        <div className="space-y-2 mb-3">
          {sources.slice(0, 3).map((src, i) => (
            <div key={src.source_id || i} className="bg-white rounded border p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="font-medium text-gray-800 truncate">{src.source_id}</span>
                <span className="ml-auto text-gray-500 flex-shrink-0">
                  {src.confidence != null ? `${(src.confidence * 100).toFixed(0)}% confidence` : ''}
                </span>
              </div>
              {src.confidence != null && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(src.confidence * 100, 100)}%` }}
                  />
                </div>
              )}
              {src.distance_km != null && (
                <div className="text-gray-500">{src.distance_km} km away</div>
              )}
              {src.reasoning && (
                <div className="text-gray-400 mt-1 leading-tight">{src.reasoning}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 72h forecast chart */}
      {forecast && (
        <div className="mt-3 border-t pt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">72h AQI Forecast</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={forecast.forecast.filter((_, i) => i % 6 === 0)}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={t => new Date(t).getHours() + 'h'}
                tick={{ fontSize: 10 }}
              />
              <YAxis domain={[0, 500]} tick={{ fontSize: 10 }} width={28} />
              <Tooltip formatter={(v) => [Math.round(v), 'AQI']} />
              <ReferenceLine y={100} stroke="#92d050" strokeDasharray="3 3" />
              <ReferenceLine y={200} stroke="#ff7e00" strokeDasharray="3 3" />
              <ReferenceLine y={300} stroke="#ff0000" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="aqi_predicted"
                stroke="#6366f1"
                fill="#e0e7ff"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 mt-1">
            Peak: AQI {forecast.peak_forecast.aqi} ·{' '}
            {new Date(forecast.peak_forecast.timestamp).toLocaleString()}
          </div>
        </div>
      )}

      <button
        onClick={handleViewNotices}
        disabled={noticesLoading}
        className="w-full bg-red-600 text-white text-xs font-semibold py-2 rounded hover:bg-red-700 disabled:opacity-50 transition-colors mt-3"
      >
        {noticesLoading ? 'Loading…' : 'View Enforcement Notices'}
      </button>

      {noticesVisible && notices.length > 0 && (
        <NoticePanel notices={notices} onClose={() => setNoticesVisible(false)} />
      )}
    </div>
  )
}
