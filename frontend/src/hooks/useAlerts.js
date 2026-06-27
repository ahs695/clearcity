import { useEffect } from 'react'

export function useAlerts(onAlert) {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/alerts')
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'alert') onAlert(data)
    }
    ws.onerror = () => console.log('WebSocket unavailable — alerts disabled')
    return () => ws.close()
  }, [])
}
