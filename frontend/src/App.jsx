import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
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
      <div className="flex flex-col h-screen overflow-hidden bg-slate-955 text-slate-100 font-sans antialiased">
        {demoStatus?.demo_mode && !bannerDismissed && (
          <div
            className="flex items-center justify-between px-4 bg-slate-900 border-b border-indigo-500/20 text-xs font-medium text-slate-300 flex-shrink-0 relative overflow-hidden"
            style={{ height: 38 }}
          >
            {/* Background glowing gradient line */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-2 z-10">
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <Sparkles size={13} className="text-amber-400" />
              <span>
                <strong className="text-slate-100 font-semibold">Demo Sandbox Active:</strong> Pre-seeded with {demoStatus.seeded_stations} CAAQMS stations and {demoStatus.seeded_sources} pollution sources. Prophet ML forecasting is live.
              </span>
            </div>
            
            <button
              onClick={() => setBannerDismissed(true)}
              className="z-10 ml-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors duration-150"
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<CommandCentre />} />
            <Route path="/inspector" element={<FieldInspector />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
