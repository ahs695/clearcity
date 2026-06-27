import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { getEnforcementNotices } from '../api/client'
import InspectionCard from '../components/InspectionCard'

const CACHE_KEY = 'clearcity_notices'

const formatDate = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const INFO_BULLETS = [
  '✅ 15 Delhi CAAQMS stations (pre-seeded)',
  '✅ 40 registered emission sources',
  '✅ 7 days historical AQI data',
  '✅ Prophet ML forecasting (live model)',
  '✅ PostGIS spatial attribution (live query)',
  '✅ Pre-computed enforcement notices (EN + HI)',
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

      <div className="h-full flex flex-col bg-gray-100">
        {/* Fixed header */}
        <header className="fixed top-0 left-0 right-0 z-20 bg-gray-900 text-white flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-300 hover:text-white flex-shrink-0"
          >
            ← Command Centre
          </button>
          <span className="flex-1 text-center text-sm font-bold truncate">
            ClearCity Field Inspector
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate()}</span>
          <span className="ml-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
            {notices.length} pending
          </span>
          <button
            onClick={() => setShowInfo(true)}
            className="text-gray-400 hover:text-white flex-shrink-0 ml-1"
            aria-label="About"
          >
            <Settings size={14} />
          </button>
        </header>

        {/* Offline banner */}
        {offline && (
          <div className="fixed top-12 left-0 right-0 z-10 bg-red-100 text-red-700 text-sm px-4 py-2">
            Offline — showing cached data · Last updated {lastUpdated}
          </div>
        )}

        {/* Scrollable content area */}
        <div className={`flex-1 overflow-y-auto ${offline ? 'pt-20' : 'pt-14'} pb-20`}>
          {loading ? (
            <div className="text-center text-gray-500 mt-20 text-sm">Loading notices…</div>
          ) : notices.length === 0 ? (
            <div className="text-green-600 text-center mt-20 text-lg">
              No pending inspections. All clear ✓
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {notices.map(n => (
                <InspectionCard key={n.id} notice={n} onStatusUpdate={refetch} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom tab bar — hidden on md+ */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t bg-white md:hidden z-20">
          <button className="flex-1 py-3 text-sm font-medium text-blue-600">
            Inspections
          </button>
          <button
            className="flex-1 py-3 text-sm text-gray-500"
            onClick={() => navigate('/')}
          >
            Map
          </button>
          <button
            className="flex-1 py-3 text-sm text-gray-500"
            onClick={() => setShowInfo(true)}
          >
            Settings
          </button>
        </div>
      </div>
    </>
  )
}
