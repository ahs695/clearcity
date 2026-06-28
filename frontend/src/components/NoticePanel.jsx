import { useState } from 'react'
import { X, Send, CheckCircle, ShieldAlert, FileText } from 'lucide-react'
import { updateNoticeStatus } from '../api/client'

const statusClass = (status) => {
  if (status === 'pending') return 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
  if (status === 'dispatched') return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25'
  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[1100] p-4 overflow-hidden duration-300">
      
      {/* Modal Card wrapper */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 pointer-events-none" />

        {/* Header container */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Enforcement Notices</h2>
              <p className="text-xs text-slate-400">Generated actions against attributed emission sources</p>
            </div>
          </div>

          {/* Close toggle */}
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable list of notice drafts */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {localNotices.map((notice) => {
              const nj = notice.notice_json || {}
              const d = nj
              const aqi = d.sensor_readings?.aqi
              const pm25 = d.sensor_readings?.pm25

              return (
                <div 
                  key={notice.id} 
                  className="bg-slate-950/40 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-lg transition-all"
                >
                  <div className="space-y-3">
                    
                    {/* Source ID name + Indicator Badge */}
                    <div className="flex items-center gap-2.5">
                      <span className="w-5.5 h-5.5 rounded-md bg-red-500/10 text-red-400 text-xs flex items-center justify-center font-extrabold flex-shrink-0">
                        #{notice.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-slate-200 block truncate" title={notice.source_name}>
                          {d.issued_to || notice.source_name}
                        </span>
                        <span className="text-[10px] text-slate-500 tech-font uppercase tracking-wider">
                          Type: {notice.source_type}
                        </span>
                      </div>
                    </div>

                    {/* Evidence summary text box */}
                    {d.evidence_summary && (
                      <p className="text-xs font-semibold text-slate-100 leading-snug p-2.5 rounded-lg bg-slate-900/60 border-l-2 border-indigo-500 pl-3">
                        {d.evidence_summary}
                      </p>
                    )}

                    {/* Parameter grid values */}
                    {nj.sensor_readings && (
                      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/40 rounded-lg p-2 text-[10px] text-center border border-slate-850/50">
                        <div>
                          <span className="text-slate-500 block font-medium">AQI</span>
                          <span className="font-bold text-slate-220 tech-font">{aqi ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">PM2.5</span>
                          <span className="font-bold text-slate-220 tech-font">{pm25 ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">Wind</span>
                          <span className="font-bold text-slate-220 tech-font">{nj.sensor_readings.wind_speed ?? '—'}m/s</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-medium">Vector</span>
                          <span className="font-bold text-slate-220 tech-font">{nj.sensor_readings.wind_direction ?? '—'}°</span>
                        </div>
                      </div>
                    )}

                    {/* Action directive label */}
                    {d.action_required && (
                      <div className="flex items-start gap-2 border border-red-500/20 bg-red-950/10 rounded-lg p-2.5 text-[11px] text-red-300 leading-snug">
                        <ShieldAlert size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <span>{d.action_required}</span>
                      </div>
                    )}

                    {/* Legal text line */}
                    {d.legal_authority && (
                      <p className="text-[10px] text-slate-500 italic leading-snug">
                        {d.legal_authority}
                      </p>
                    )}
                  </div>

                  {/* Actions row: Status + Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-900/80">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold tech-font ${statusClass(notice.status)}`}>
                      {notice.status}
                    </span>
                    {notice.status === 'pending' ? (
                      <button
                        onClick={() => markDispatched(notice.id)}
                        className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all shadow"
                      >
                        <Send size={12} />
                        <span>Mark Dispatched</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle size={12} />
                        <span>Dispatched</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Modal Info Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 text-[10px] text-slate-500 text-center flex-shrink-0">
          Generated using PostGIS spatial coordinates overlap and local wind direction vector matching parameters.
        </div>
      </div>
    </div>
  )
}
