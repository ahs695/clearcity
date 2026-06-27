export function Toast({ alerts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 shadow text-sm max-w-xs"
        >
          <div className="font-medium text-yellow-800">⚠ {alert.station_name}</div>
          <div className="text-yellow-700">AQI {alert.aqi} — {alert.message}</div>
          <button
            className="text-xs text-yellow-500 mt-1 hover:text-yellow-700"
            onClick={() => onDismiss(i)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}
