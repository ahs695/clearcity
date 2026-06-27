import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { getSources } from '../api/client'

const getAQIColor = (aqi) => {
  if (aqi == null) return '#888888'
  if (aqi <= 50) return '#00e400'
  if (aqi <= 100) return '#92d050'
  if (aqi <= 200) return '#ffff00'
  if (aqi <= 300) return '#ff7e00'
  if (aqi <= 400) return '#ff0000'
  return '#99004c'
}

const sourceColors = {
  brick_kiln: '#8B4513',
  construction: '#FFA500',
  industrial: '#DC143C',
  waste_burning: '#696969',
  traffic: '#4169E1',
}

const windIcon = (degrees) => L.divIcon({
  html: `<svg width="20" height="20" viewBox="0 0 20 20">
    <polygon points="10,2 14,18 10,14 6,18" fill="#374151" transform="rotate(${degrees}, 10, 10)"/>
  </svg>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const sourceIcon = (type) => L.divIcon({
  html: `<svg width="12" height="12" viewBox="0 0 12 12">
    <polygon points="6,1 11,11 1,11" fill="${sourceColors[type] || '#888888'}"/>
  </svg>`,
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 11],
})

function FlyToStation({ station }) {
  const map = useMap()
  useEffect(() => {
    if (station) map.flyTo([station.lat, station.lon], 14)
  }, [station, map])
  return null
}

export default function AQIMap({ stations, selectedStation, onStationClick }) {
  const [sources, setSources] = useState([])

  useEffect(() => {
    getSources().then(setSources).catch(() => {})
  }, [])

  return (
    <MapContainer
      center={[28.6139, 77.2090]}
      zoom={11}
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <FlyToStation station={selectedStation} />

      {stations.map((station) => (
        <CircleMarker
          key={station.station_id}
          center={[station.lat, station.lon]}
          radius={12}
          fillColor={getAQIColor(station.aqi)}
          fillOpacity={0.85}
          color="white"
          weight={1}
          eventHandlers={{ click: () => onStationClick(station) }}
        >
          <Popup>
            <strong>{station.name}</strong><br />
            AQI: {station.aqi ?? '—'}<br />
            PM2.5: {station.pm25 ?? '—'}<br />
            {station.recorded_at && new Date(station.recorded_at).toLocaleString()}
          </Popup>
        </CircleMarker>
      ))}

      {stations.filter(s => s.wind_direction != null).map((station) => (
        <Marker
          key={`wind-${station.station_id}`}
          position={[station.lat + 0.003, station.lon + 0.003]}
          icon={windIcon(station.wind_direction)}
        />
      ))}

      {sources.map((source) => (
        <Marker
          key={source.source_id}
          position={[source.lat, source.lon]}
          icon={sourceIcon(source.source_type)}
        >
          <Popup>
            <strong>{source.name}</strong><br />
            Type: {source.source_type}<br />
            Intensity: {source.emission_intensity}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
