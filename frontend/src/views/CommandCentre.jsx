import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { getStations } from '../api/client'
import { useAlerts } from '../hooks/useAlerts'
import { Toast } from '../components/Toast'
import AQIMap from '../components/AQIMap'
import AttributionPanel from '../components/AttributionPanel'

const getAQIColor = (aqi) => {
  if (aqi == null) return '#888888'
  if (aqi <= 50) return '#00e400'
  if (aqi <= 100) return '#92d050'
  if (aqi <= 200) return '#ffff00'
  if (aqi <= 300) return '#ff7e00'
  if (aqi <= 400) return '#ff0000'
  return '#99004c'
}

const needsDarkText = (aqi) => aqi != null && aqi <= 200

const INFO_BULLETS = [
  '✅ 15 Delhi CAAQMS stations (pre-seeded)',
  '✅ 40 registered emission sources',
  '✅ 7 days historical AQI data',
  '✅ Prophet ML forecasting (live model)',
  '✅ PostGIS spatial attribution (live query)',
  '✅ Pre-computed enforcement notices (EN + HI)',
]

export default function CommandCentre() {
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [search, setSearch] = useState('')
  const [selectedStation, setSelectedStation] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    getStations().then(setStations).catch(() => {})
    const interval = setInterval(() => {
      getStations().then(setStations).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useAlerts((alert) => {
    setAlerts(prev => [...prev, alert])
    setTimeout(() => setAlerts(prev => prev.slice(1)), 5000)
  })

  const dismissAlert = (i) => setAlerts(prev => prev.filter((_, idx) => idx !== i))

  const filtered = stations.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Toast alerts={alerts} onDismiss={dismissAlert} />

      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="font-semibold text-lg mb-3">About ClearCity Demo</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              {INFO_BULLETS.map(b => <li key={b}>{b}</li>)}
            </ul>
            <button
              className="mt-4 w-full bg-gray-900 text-white rounded-lg py-2 text-sm hover:bg-gray-700"
              onClick={() => setShowInfo(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="flex h-full overflow-hidden bg-gray-100">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r bg-white overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gray-900 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold tracking-wide">ClearCity Command Centre</h1>
                <p className="text-xs text-gray-400 mt-0.5">Delhi Air Quality Monitor</p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <button
                  onClick={() => navigate('/inspector')}
                  className="text-xs text-gray-300 hover:text-white"
                >
                  Field Inspector →
                </button>
                <button
                  onClick={() => setShowInfo(true)}
                  className="text-gray-400 hover:text-white"
                  aria-label="About"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b flex-shrink-0">
            <input
              type="text"
              placeholder="Search stations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Station list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filtered.length === 0 && (
              <div className="p-4 text-xs text-gray-400 text-center">No stations found</div>
            )}
            {filtered.map(station => (
              <button
                key={station.station_id}
                onClick={() => setSelectedStation(station)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                  selectedStation?.station_id === station.station_id
                    ? 'bg-blue-50 border-l-2 border-l-blue-500'
                    : ''
                }`}
              >
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    backgroundColor: getAQIColor(station.aqi),
                    color: needsDarkText(station.aqi) ? '#1f2937' : '#fff',
                    minWidth: '2.25rem',
                    textAlign: 'center',
                  }}
                >
                  {station.aqi ?? '—'}
                </span>
                <span className="text-xs text-gray-800 truncate flex-1">{station.name}</span>
                {station.aqi_category && (
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden xl:block">
                    {station.aqi_category}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Attribution panel */}
          {selectedStation && (
            <AttributionPanel
              stationId={selectedStation.station_id}
              stationName={selectedStation.name}
              aqi={selectedStation.aqi}
            />
          )}
        </div>

        {/* Map panel */}
        <div className="flex-1 relative">
          <AQIMap
            stations={stations}
            selectedStation={selectedStation}
            onStationClick={setSelectedStation}
          />
        </div>
      </div>
    </>
  )
}
