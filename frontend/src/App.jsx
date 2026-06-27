import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { getDemoStatus } from './api/client'
import CommandCentre from './views/CommandCentre'
import FieldInspector from './views/FieldInspector'

export default function App() {
  const [demoStatus, setDemoStatus] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    getDemoStatus().then(setDemoStatus).catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen">
        {demoStatus?.demo_mode && !bannerDismissed && (
          <div
            className="flex items-center justify-between bg-yellow-400 px-4 text-xs font-medium text-yellow-900 flex-shrink-0"
            style={{ height: 36 }}
          >
            <span>
              ⚡ Demo mode — pre-seeded data&nbsp;|&nbsp;
              {demoStatus.seeded_stations} stations&nbsp;|&nbsp;
              {demoStatus.seeded_sources} emission sources&nbsp;|&nbsp;
              Prophet ML forecasting active
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="ml-4 text-yellow-800 hover:text-yellow-900 font-bold text-base leading-none"
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<CommandCentre />} />
            <Route path="/inspector" element={<FieldInspector />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
