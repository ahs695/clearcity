import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, ArrowLeft, Activity, Calendar, ShieldAlert, CloudOff, RefreshCw } from 'lucide-react'
import { getEnforcementNotices } from '../api/client'
import InspectionCard from '../components/InspectionCard'

const CACHE_KEY = 'clearcity_notices'

const formatDate = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const INFO_BULLETS = [
  '⚡ Deployed React-Vite dynamic inspector portal',
  '📍 Field-resilient local cache capability layer',
  '📋 Detailed English/Hindi translation mappings',
  '🗺 Direct geo-linking to Google Maps navigation',
  '🔒 Secure, direct API dispatch status overrides',
]

export default function FieldInspector() {
  const navigate = useNavigate()
  const [notices, setNotices] = useState([])
  const [offline, setOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')
  const [loading, setLoading] = useState(true)
  const [showInfo, setShowInfo] = useState(false)

  const refetch = useCallback(() => {
    setLoading(true)
    getEnforcementNotices('pending')
      .then(data => {
        setNotices(data)
        setOffline(false)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: new Date().toISOString() }))
      })
      .catch(() => {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { data, savedAt } = JSON.parse(cached)
          setNotices(data)
          setOffline(true)
          setLastUpdated(new Date(savedAt).toLocaleString())
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <>
      {/* About Info Modal Dialog */}
      {showInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 transition-all">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Settings size={22} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Inspector Portal Settings</h3>
                <p className="text-xs text-slate-400">ClearCity enforcement field guide</p>
              </div>
            </div>

            <div className="space-y-3 my-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 max-h-60 overflow-y-auto">
              {INFO_BULLETS.map((bullet, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-350">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <button
              className="mt-2 w-full py-2.5 px-4 bg-indigo-600 font-semibold text-white rounded-xl text-sm hover:bg-indigo-500 active:scale-[0.98] transition-all"
              onClick={() => setShowInfo(false)}
            >
              Return to Workspace
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="h-full flex flex-col bg-slate-950 text-slate-200">
        
        {/* Sleek Fixed Header Card */}
        <header className="fixed top-0 left-0 right-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-950/80 px-2.5 py-1.5 border border-slate-800 rounded-lg transition-all active:scale-95 flex-shrink-0"
          >
            <ArrowLeft size={13} />
            <span>Command Centre</span>
          </button>
          
          <div className="flex items-center gap-2 max-w-[12rem] md:max-w-none text-center">
            <span className="hidden sm:block h-6 w-6 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-md flex items-center justify-center text-white font-extrabold text-xs">A</span>
            <span className="font-extrabold tracking-wider text-xs md:text-sm text-slate-100 uppercase truncate">
              Field Inspector workspace
            </span>
          </div>

          <div className="flex items-center gap-3.5 flex-shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500">
              <Calendar size={12} className="text-slate-600" />
              <span>{formatDate()}</span>
            </div>
            
            <div className="flex bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{notices.length} pending</span>
            </div>

            <button
              onClick={() => setShowInfo(true)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
              aria-label="About"
            >
              <Settings size={15} />
            </button>
          </div>
        </header>

        {/* Offline Alert Banner */}
        {offline && (
          <div className="fixed top-14 left-0 right-0 z-10 bg-red-950/80 border-b border-red-500/20 backdrop-blur text-red-300 text-xs px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudOff size={14} className="text-red-400 animate-bounce" />
              <span>Offline Session — Reading cached data index. Last updated {lastUpdated}</span>
            </div>
            <button 
              onClick={refetch}
              className="p-1 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded text-red-200 transition-all font-semibold"
            >
              <RefreshCw size={10} className="animate-spin" />
            </button>
          </div>
        )}

        {/* Scrollable Layout Context */}
        <div className={`flex-1 overflow-y-auto px-4 ${offline ? 'pt-24' : 'pt-16'} pb-20 max-w-7xl mx-auto w-full`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-32 text-slate-500">
              <Activity size={24} className="animate-spin text-indigo-400 mb-3" />
              <p className="text-xs font-semibold tracking-widest uppercase">Fetching Pending Violations...</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-32 text-center">
              <ShieldAlert size={48} className="text-emerald-400/80 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-200 mb-1">Clear Environmental Record</h3>
              <p className="text-xs text-slate-500 max-w-sm">No pending compliance investigations or enforcement orders triggered for upwind source regions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
              {notices.map(n => (
                <InspectionCard key={n.id} notice={n} onStatusUpdate={refetch} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom tab bar — hidden on md+ */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-slate-800 bg-slate-900/90 backdrop-blur-md md:hidden z-20">
          <button className="flex-1 py-3 text-xs font-bold text-indigo-400 flex flex-col items-center gap-1">
            <Activity size={15} />
            <span>Worklist</span>
          </button>
          <button
            className="flex-1 py-3 text-xs font-medium text-slate-500 hover:text-slate-300 flex flex-col items-center gap-1"
            onClick={() => navigate('/')}
          >
            <Settings size={15} className="rotate-45" />
            <span>Map Grid</span>
          </button>
        </div>
      </div>
    </>
  )
}
