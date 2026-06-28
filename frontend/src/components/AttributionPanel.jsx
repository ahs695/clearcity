import { useState, useEffect } from 'react'
import { 
  X, AlertTriangle, ShieldCheck, Compass, Wind, 
  Layers, ChevronRight, Activity, ArrowUpRight 
} from 'lucide-react'
import { triggerAttribution, fetchNotices, getForecast } from '../api/client'
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import NoticePanel from './NoticePanel'

const compass = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

const aqiChipClass = (aqi) => {
  if (!aqi) return 'bg-slate-700 text-slate-300'
  if (aqi <= 50) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  if (aqi <= 100) return 'bg-lime-500/10 text-lime-400 border border-lime-500/20'
  if (aqi <= 200) return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
  if (aqi <= 300) return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
  if (aqi <= 400) return 'bg-red-500/10 text-red-400 border border-red-500/20'
  return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
}

export default function AttributionPanel({ stationId, stationName, aqi, onClose }) {
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 border-l border-slate-800 text-slate-400">
        <Activity size={24} className="animate-spin text-indigo-400 mb-3" />
        <span className="text-xs font-semibold tracking-wider uppercase">Running Attribution...</span>
      </div>
    )
  }

  if (!result) return null

  const sources = Array.isArray(result.attributed_sources) ? result.attributed_sources : []

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border-l border-slate-800 min-h-0 h-full">
      <div className="px-4 py-4 border-b border-slate-850 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
        <div>
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 mb-0.5">Attribution Panel</h2>
          <span className="text-sm font-bold text-slate-100 truncate block max-w-[15rem]" title={stationName}>
            {stationName}
          </span>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
          aria-label="Close attribution panel"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Observed AQI</span>
            <div className="text-xs text-slate-350 font-medium">
              {result.triggered_at ? new Date(result.triggered_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'} · Delhi CAAQMS
            </div>
          </div>
          <span className={`font-bold px-3 py-1 rounded-lg text-xs ${aqiChipClass(result.aqi_at_trigger)}`}>
            AQI {result.aqi_at_trigger}
          </span>
        </div>

        {(result.wind_speed != null || result.wind_direction != null) && (
          <div className="grid grid-cols-2 gap-3 bg-slate-950/20 border border-slate-800/50 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="p-1.5 bg-slate-800/80 rounded text-slate-400">
                <Wind size={13} />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-semibold">Wind Speed</p>
                <p className="font-semibold text-slate-200">
                  {result.wind_speed != null ? `${result.wind_speed} m/s` : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-350">
              <div className="p-1.5 bg-slate-800/80 rounded text-slate-400">
                <Compass size={13} />
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-semibold">Direction</p>
                <p className="font-semibold text-indigo-400">
                  {result.wind_direction != null
                    ? `${result.wind_direction}° (${compass(result.wind_direction)})`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-bold text-slate-300 flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              <span>Attributed Point Sources</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">{sources.length} sources linked</span>
          </div>

          {sources.length === 0 ? (
            <div className="bg-slate-950/25 border border-dashed border-slate-800/60 rounded-xl p-6 text-center text-xs text-slate-500">
              <ShieldCheck size={20} className="mx-auto text-emerald-400/70 mb-1.5" />
              No significant emission sources located in upwind profile.
            </div>
          ) : (
            <div className="space-y-2.5">
              {sources.slice(0, 3).map((src, i) => (
                <div key={src.source_id || i} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-bold text-xs text-slate-200 truncate">{src.source_id}</span>
                    </div>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                      {src.confidence != null ? `${(src.confidence * 100).toFixed(0)}% Match` : ''}
                    </span>
                  </div>

                  {src.confidence != null && (
                    <div className="w-full bg-slate-800 rounded-full h-1 relative">
                      <div
                        className="h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.min(src.confidence * 100, 100)}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-450">
                    <span>Range Context</span>
                    <span className="font-medium text-slate-350">{src.distance_km != null ? `${src.distance_km} km / Upwind` : '—'}</span>
                  </div>

                  {src.reasoning && (
                    <p className="text-[10px] text-slate-400 leading-normal bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                      {src.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {forecast && (
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
              <Activity size={13} className="text-violet-400" />
              <span>72h Deep AQI Forecast</span>
            </h3>

            <div className="bg-slate-950/35 border border-slate-800/80 rounded-xl p-3">
              <ResponsiveContainer width="100%" height={155}>
                <AreaChart data={forecast.forecast.filter((_, i) => i % 6 === 0)} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastColorGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={t => {
                      const hrs = new Date(t).getHours();
                      return hrs === 0 ? '12am' : `${hrs}h`;
                    }}
                    tick={{ fontSize: 9, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 480]} 
                    tick={{ fontSize: 9, fill: '#64748b' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#1e293b', 
                      color: '#f1f5f9', 
                      borderRadius: '10px', 
                      fontSize: '10px'
                    }} 
                    formatter={(v) => [Math.round(v), 'AQI']}
                  />
                  <ReferenceLine y={100} stroke="#84cc16" strokeDasharray="3 3" opacity={0.5} />
                  <ReferenceLine y={250} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} />
                  <Area
                    type="monotone"
                    dataKey="aqi_predicted"
                    stroke="#6366f1"
                    fill="url(#forecastColorGlow)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                <span>Predicted Peak</span>
                <span className="font-semibold text-slate-400">
                  AQI {forecast.peak_forecast.aqi} · {new Date(forecast.peak_forecast.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-850 flex-shrink-0">
        <button
          onClick={handleViewNotices}
          disabled={noticesLoading}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {noticesLoading ? (
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="animate-spin" />
              <span>Analyzing notices...</span>
            </span>
          ) : (
            <>
              <span>Review Enforcement Notices</span>
              <ArrowUpRight size={14} />
            </>
          )}
        </button>
      </div>

      {noticesVisible && notices.length > 0 && (
        <NoticePanel notices={notices} onClose={() => setNoticesVisible(false)} />
      )}
    </div>
  )
}
