import { useEffect, useState, memo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import L_dist_css from "leaflet/dist/leaflet.css?inline"; // ensure preloader works or use main CSS
import { getSources } from "../api/client";

const getAQIColor = (aqi) => {
  if (aqi == null) return "#64748b"; // slate-500
  if (aqi <= 50) return "#10b981"; // emerald-500
  if (aqi <= 100) return "#84cc16"; // lime-500
  if (aqi <= 200) return "#eab308"; // yellow-500
  if (aqi <= 300) return "#f97316"; // orange-500
  if (aqi <= 400) return "#ef4444"; // red-500
  return "#a855f7"; // purple-500
};

const sourceColors = {
  brick_kiln: "#d97706", // amber-600
  construction: "#f59e0b", // amber-500
  industrial: "#ef4444", // red-500
  waste_burning: "#cbd5e1", // slate-300
  traffic: "#3b82f6", // blue-500
};

// Sleek rotating wind vector SVG
const windIcon = (degrees) =>
  L.divIcon({
    html: `<div style="transform: rotate(${degrees}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4))" class="text-indigo-400">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <polyline points="6 10 12 4 18 10"></polyline>
      </svg>
    </div>`,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// Premium circular nested source marker
const sourceIcon = (type) =>
  L.divIcon({
    html: `<div class="w-4 h-4 rounded-full bg-slate-950/90 border-2 flex items-center justify-center shadow-lg shadow-black/40" style="border-color: ${sourceColors[type] || "#cbd5e1"}">
      <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${sourceColors[type] || "#cbd5e1"}"></span>
    </div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

// Automates Leaflet view snapping and size adjustments during sidebar transitions
function MapResizeController({ selectedStation, sidebarOpen }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedStation) {
      map.flyTo([selectedStation.lat, selectedStation.lon], 13);
    }
  }, [selectedStation, map]);

  useEffect(() => {
    // Triggers Leaflet canvas dimensions repaint after CSS transitions conclude
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 380);
    return () => clearTimeout(timer);
  }, [sidebarOpen, selectedStation, map]);

  return null;
}

export default memo(function AQIMap({
  stations,
  selectedStation,
  onStationClick,
  sidebarOpen,
}) {
  const [sources, setSources] = useState([]);

  useEffect(() => {
    getSources()
      .then(setSources)
      .catch(() => {});
  }, []);

  return (
    <MapContainer
      center={[28.6139, 77.209]}
      zoom={11}
      className="h-full w-full inset-0 z-10"
      zoomControl={false} // Disable standard controls to keep the map UI uncluttered
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <MapResizeController selectedStation={selectedStation} sidebarOpen={sidebarOpen} />

      {stations.map((station) => (
        <CircleMarker
          key={station.station_id}
          center={[station.lat, station.lon]}
          radius={selectedStation?.station_id === station.station_id ? 10 : 8}
          fillColor={getAQIColor(station.aqi)}
          fillOpacity={0.88}
          color={selectedStation?.station_id === station.station_id ? "#ffffff" : "transparent"}
          weight={2}
          className="cursor-pointer transition-all duration-300"
          eventHandlers={{ click: () => onStationClick(station) }}
        >
          <Popup minWidth={210}>
            <div className="space-y-1 p-0.5 text-slate-205" style={{ width: '210px' }}>
              <div className="font-extrabold text-slate-100 border-b border-slate-700/60 pb-1 text-xs">
                {station.name}
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 tech-font text-[10px] text-slate-300">
                <div>
                  <span className="text-slate-500 font-medium">AQI Value:</span>
                  <span className="font-bold ml-1" style={{ color: getAQIColor(station.aqi) }}>
                    {station.aqi ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">PM2.5:</span>
                  <span className="font-bold text-slate-200 ml-1">{station.pm25 ?? "—"} µg/m³</span>
                </div>
                {station.wind_speed != null && (
                  <div className="col-span-2">
                    <span className="text-slate-500 font-medium">Wind vector:</span>
                    <span className="text-slate-200 ml-1">
                      {station.wind_speed} m/s @ {station.wind_direction ?? 0}°
                    </span>
                  </div>
                )}
              </div>
              {station.recorded_at && (
                <div className="text-[9px] text-slate-500 text-right pt-2">
                  Observed: {new Date(station.recorded_at).toLocaleTimeString()}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {stations
        .filter((s) => s.wind_direction != null && selectedStation?.station_id === s.station_id)
        .map((station) => (
          <Marker
            key={`wind-${station.station_id}`}
            position={[station.lat + 0.002, station.lon + 0.002]}
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
            <div className="text-slate-205 space-y-1">
              <div className="font-bold text-indigo-400 text-xs">{source.name}</div>
              <div className="tech-font text-[10px] space-y-0.5">
                <div>
                  <span className="text-slate-500">Source Category:</span>{" "}
                  <span className="capitalize font-semibold text-slate-200">{source.source_type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-slate-500">Emission Load:</span>{" "}
                  <span className="font-semibold text-yellow-405">{source.emission_intensity ?? "Muted"}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Map Legend */}
      <div className="leaflet-bottom leaflet-right" style={{ pointerEvents: 'auto' }}>
        <div className="leaflet-control bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-3 mb-4 mr-3 text-[10px] text-slate-600 min-w-[160px] space-y-2.5">
          <div className="font-bold text-[11px] text-slate-900 border-b border-slate-200 pb-1.5 uppercase tracking-wider">Map Legend</div>

          {/* AQI Station section */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm flex-shrink-0" />
              <span>AQI Station</span>
            </div>
            <div className="ml-5 space-y-1 text-[9px]">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#10b981'}} /><span>Good (0–50)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#84cc16'}} /><span>Satisfactory (51–100)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#eab308'}} /><span>Moderate (101–200)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#f97316'}} /><span>Poor (201–300)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#ef4444'}} /><span>Very Poor (301–400)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#a855f7'}} /><span>Severe (400+)</span></div>
            </div>
          </div>

          {/* Emission Source section */}
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-800 border-2 flex-shrink-0" style={{ borderColor: '#f59e0b' }}>
                <span className="block w-1 h-1 rounded-full mx-auto mt-[3px]" style={{ backgroundColor: '#f59e0b' }} />
              </span>
              <span>Emission Source</span>
            </div>
            <div className="ml-5 space-y-1 text-[9px]">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#d97706'}} /><span>Brick Kiln</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#f59e0b'}} /><span>Construction</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#ef4444'}} /><span>Industrial</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#cbd5e1'}} /><span>Waste Burning</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:'#3b82f6'}} /><span>Traffic</span></div>
            </div>
          </div>
        </div>
      </div>
    </MapContainer>
  );
});
