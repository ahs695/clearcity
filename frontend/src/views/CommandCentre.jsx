import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Settings, ChevronLeft, ChevronRight, Search, Activity, 
  MapPin, AlertCircle, Info, HelpCircle, ShieldAlert 
} from 'lucide-react'
import { getStations } from '../api/client'
import { useAlerts } from '../hooks/useAlerts'
import { Toast } from '../components/Toast'
import AQIMap from '../components/AQIMap'
import AttributionPanel from '../components/AttributionPanel'

const getAQIColor = (aqi) => {
  if (aqi == null) return '#475569' // Slate-600
  if (aqi <= 50) return '#10b981' // Emerald-500
  if (aqi <= 100) return '#84cc16' // Lime-500
  if (aqi <= 200) return '#eab308' // Yellow-500
  if (aqi <= 300) return '#f97316' // Orange-500
  if (aqi <= 400) return '#ef4444' // Red-500
  return '#a855f7' // Purple-500
}

const getAQITextColor = (aqi) => {
  if (aqi == null) return 'text-slate-300'
  if (aqi <= 50) return 'text-emerald-400'
  if (aqi <= 100) return 'text-lime-400'
  if (aqi <= 200) return 'text-yellow-400'
  if (aqi <= 300) return 'text-orange-400'
  return 'text-red-400'
}

const INFO_BULLETS = [
  '⚡ Modern React 19 Frontend running under Vite',
  '📍 15 Deployed Delhi CAAQMS Monitoring Stations',
  '🏭 40 Active Registered Emission Source Coordinates',
  '📈 Real-time air quality sensors & WS polling active',
  '⚛ Prophet ML AI Models generating 72h forecasts',
  '🗺 PostGIS Spatial analysis attributing pollution causes',
]

export default function CommandCentre() {
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [search, setSearch] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [showInfo, setShowInfo] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [wsConnected, setWsConnected] = useState(true)

  useEffect(() => {
    getStations().then(setStations).catch(() => {})
    const interval = setInterval(() => {
      getStations().then(setStations).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useAlerts((alert) => {
    setAlerts(prev => [...prev, alert])
    setWsConnected(true)
    setTimeout(() => setAlerts(prev => prev.slice(1)), 6000)
  })

  const dismissAlert = (i) => setAlerts(prev => prev.filter((_, idx) => idx !== i))

  const filtered = stations.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Real-time floating Notification Toast alerts */}
      <Toast alerts={alerts} onDismiss={dismissAlert} />

      {/* Info Dialog Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">About ClearCity</h3>
                <p className="text-xs text-slate-400">Intelligent Emission Attribution System</p>
              </div>
            </div>

            <div className="space-y-3 my-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 max-h-60 overflow-y-auto">
              {INFO_BULLETS.map((bullet, idx) => (
                <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-300">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <button
              className="mt-2 w-full py-2.5 px-4 bg-indigo-600 font-semibold text-white rounded-xl text-sm hover:bg-indigo-500 active:scale-[0.98] transition-all"
              onClick={() => setShowInfo(false)}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Workspace Container */}
      <div className="flex h-full w-full overflow-hidden bg-slate-950 text-slate-150">
        
        {/* LEFT COLLAPSIBLE SIDEBAR */}
        <div 
          className={`sidebar-transition relative flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur-md overflow-hidden z-20 ${
            sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6.5 w-6.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <Activity size={13} className="text-white animate-pulse" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">ClearCity</h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400">Live Station Feeds</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInfo(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-105 hover:bg-slate-800 rounded-lg transition-all"
                  title="About Platform"
                >
                  <Settings size={15} />
                </button>
              </div>
            </div>

            {/* View Switcher Button */}
            <button
              onClick={() => navigate('/inspector')}
              className="mt-4 w-full flex items-center justify-between px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl hover:bg-indigo-650/10 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-305 transition-all text-xs font-semibold"
            >
              <span>Field Inspector panel</span>
              <span className="tech-font text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">CTRL + F →</span>
            </button>
          </div>

          {/* Search box pane */}
          <div className="px-4 py-3 border-b border-slate-800/80 flex-shrink-0 relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Find target station..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-xl focus:border-indigo-550 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200 placeholder-slate-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Collapsible List elements */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-800/40">
            {filtered.length === 0 && (
              <div className="p-8 text-center">
                <AlertCircle size={20} className="mx-auto text-slate-650 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No matching stations</p>
              </div>
            )}
            {filtered.map(station => (
              <button
                key={station.station_id}
                onClick={() => setSelectedStation(station)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-all ${
                  selectedStation?.station_id === station.station_id
                    ? 'bg-indigo-950/20 border-r-2 border-indigo-550'
                    : ''
                }`}
              >
                {/* Visual indicator color sphere */}
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getAQIColor(station.aqi) }}
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-205 truncate">{station.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-450 tech-font">PM2.5: {station.pm25 ?? 'N/A'}</span>
                    {station.aqi_category && (
                      <>
                        <span className="text-slate-700 text-[10px]">•</span>
                        <span className={`text-[9px] uppercase font-bold tracking-wider ${getAQITextColor(station.aqi)}`}>
                          {station.aqi_category}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  className="text-right text-xs font-bold tech-font px-2 py-0.5 rounded border bg-slate-950/80"
                  style={{ 
                    borderColor: `${getAQIColor(station.aqi)}25`, 
                    color: getAQIColor(station.aqi)
                  }}
                >
                  {station.aqi ?? '—'}
                </div>
              </button>
            ))}
          </div>
          
          {/* Active status bar footer */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{wsConnected ? 'WS Server Online' : 'WS Server Offline'}</span>
            </div>
            <span className="tech-font text-[9px]">v1.0.4-live</span>
          </div>
        </div>

        {/* FLOATING SIDEBAR TOGGLE BUTTON */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-30 h-14 w-5 bg-slate-900 hover:bg-slate-800 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/20 rounded-r-xl shadow-lg flex items-center justify-center transition-all cursor-pointer ${
            sidebarOpen ? 'left-80' : 'left-0'
          }`}
          style={{ transitionProperty: 'left, background' }}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* MAP PANEL (CENTER STRETCH) */}
        <div className="flex-1 relative h-full">
          <AQIMap
            stations={stations}
            selectedStation={selectedStation}
            onStationClick={setSelectedStation}
            sidebarOpen={sidebarOpen}
          />
        </div>

        {/* RIGHT COLLAPSIBLE DETAIL DRAWERS (ATTRIBUTION PANEL) */}
        <div 
          className={`sidebar-transition relative flex-shrink-0 flex flex-col border-l border-slate-800 bg-slate-900/90 backdrop-blur-md overflow-hidden z-20 ${
            selectedStation ? 'w-96 opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          {selectedStation && (
            <AttributionPanel
              stationId={selectedStation.station_id}
              stationName={selectedStation.name}
              aqi={selectedStation.aqi}
              onClose={() => setSelectedStation(null)}
            />
          )}
        </div>
      </div>
    </>
  )
}
