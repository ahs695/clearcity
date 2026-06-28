import { useState } from 'react'
import { MapPin, Share2, Check, Send, CheckCircle2, ChevronDown, ChevronUp, Globe, FileText } from 'lucide-react'
import { updateNoticeStatus } from '../api/client'

const RANK_COLORS = { 1: '#f87171', 2: '#fb923c', 3: '#facc15' }

const getAQIColor = (aqi) => {
  if (aqi == null) return '#475569'
  if (aqi <= 50) return '#10b981'
  if (aqi <= 100) return '#84cc16'
  if (aqi <= 200) return '#eab308'
  if (aqi <= 300) return '#f97316'
  return '#ef4444'
}

const statusClass = (status) => {
  if (status === 'pending') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  if (status === 'dispatched') return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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
  const rankColor = RANK_COLORS[notice.rank] || '#475569'
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

  const d = lang === 'hi' && njHi ? njHi : nj

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <span
          className="w-8 h-8 rounded-xl text-slate-900 text-sm font-extrabold flex items-center justify-center flex-shrink-0 shadow"
          style={{ backgroundColor: rankColor }}
        >
          {notice.rank}
        </span>
        <div className="min-w-0 flex-grow">
          <span className="font-extrabold text-slate-100 block truncate text-xs sm:text-sm" title={nj.issued_to || notice.source_name}>
            {nj.issued_to || notice.source_name}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">
            {notice.source_type}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{
            backgroundColor: `${getAQIColor(aqi)}15`,
            color: getAQIColor(aqi),
            border: `1px solid ${getAQIColor(aqi)}30`
          }}
        >
          {aqi != null ? `AQI ${aqi}` : 'AQI —'}
        </span>
        <span className={`text-[10px] uppercase font-bold leading-normal px-2 py-0.5 rounded ${statusClass(notice.status)}`}>
          {notice.status}
        </span>
      </div>

      <div className="px-4 pb-3">
        <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
          <span>Attribution Confidence</span>
          <span>{(confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1">
          <div
            className="bg-indigo-500 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ width: `${Math.min(confidence * 100, 100)}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 text-[11px] text-indigo-400 font-bold py-2.5 border-t border-slate-800 hover:bg-slate-800/40 transition-colors"
      >
        <span>{expanded ? 'Collapse Notice Details' : 'View Full Notice'}</span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/20">
          
          <div className="flex gap-2 px-4 pt-3 pb-2">
            <button
              onClick={() => setLang('en')}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                lang === 'en'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              English
            </button>
            {njHi && (
              <button
                onClick={() => setLang('hi')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  lang === 'hi'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                हिंदी
              </button>
            )}
          </div>

          <div className="px-4 pb-2 space-y-3 text-[11px] text-slate-300">
            {d.notice_number && (
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Notice Identifier</span>
                <span className="ml-2 text-slate-300 font-semibold">{d.notice_number}</span>
              </div>
            )}

            {d.violation_type && (
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Violation Category</span>
                <p className="text-slate-200 font-semibold mt-0.5">{d.violation_type}</p>
              </div>
            )}

            {d.evidence_summary && (
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5">
                <p className="font-semibold text-slate-200 leading-normal">{d.evidence_summary}</p>
              </div>
            )}

            {d.sensor_readings && (
              <div className="grid grid-cols-4 gap-1 bg-slate-900/50 rounded-lg p-2 text-center text-[10px] border border-slate-800/60 font-medium">
                <div>
                  <span className="text-slate-500 block">AQI</span>
                  <span className="font-bold text-slate-200">{d.sensor_readings.aqi ?? '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">PM2.5</span>
                  <span className="font-bold text-slate-200">{d.sensor_readings.pm25 ?? '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Wind</span>
                  <span className="font-bold text-slate-200">{d.sensor_readings.wind_speed ?? '—'} m/s</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Vector</span>
                  <span className="font-bold text-slate-200">{d.sensor_readings.wind_direction ?? '—'}°</span>
                </div>
              </div>
            )}

            {d.action_required && (
              <div className="border border-red-500/25 bg-red-950/10 p-2.5 rounded-lg text-red-300 leading-snug">
                <p className="font-bold">{d.action_required}</p>
              </div>
            )}

            {d.compliance_deadline && (
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Compliance Deadline</span>
                <p className="text-slate-300 font-semibold mt-0.5">{d.compliance_deadline}</p>
              </div>
            )}

            {d.legal_authority && (
              <p className="text-[10px] text-slate-500 italic leading-snug">{d.legal_authority}</p>
            )}
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/60">
            {notice.status === 'pending' ? (
              <button
                onClick={markDispatched}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-2 rounded-lg transition-all shadow flex items-center justify-center gap-1 active:scale-95"
              >
                <Send size={12} />
                <span>Dispatch</span>
              </button>
            ) : (
              <div className="flex-1 bg-slate-900 border border-slate-800 text-emerald-400 text-[11px] font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                <CheckCircle2 size={12} />
                <span>Dispatched</span>
              </div>
            )}
            
            <button
              onClick={openMaps}
              disabled={!coords}
              className="flex-shrink-0 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700/80 hover:text-slate-200 disabled:opacity-40 text-slate-400 text-[11px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              <MapPin size={12} />
              <span className="hidden sm:inline">Directions</span>
            </button>
            
            <button
              onClick={shareNotice}
              className="flex-shrink-0 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700/80 hover:text-slate-200 text-slate-400 text-[11px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Share2 size={12} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
