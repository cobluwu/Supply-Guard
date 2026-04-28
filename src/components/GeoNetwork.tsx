import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, CircleMarker, WMSTileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useStore } from '../store';
import { Navigation, Map as MapIcon, Activity, AlertTriangle, Layers, CloudRain, ShieldAlert } from 'lucide-react';

// Custom Icons
const createIcon = (color: string, isPulse: boolean = false) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      width: 12px;
      height: 12px;
      background-color: ${color};
      border-radius: 50%;
      border: 2px solid #1a1a1a;
      ${isPulse ? 'animation: pulse 2s infinite;' : ''}
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
};

const originIcon = createIcon('#1a4c8a'); // Blue for Primary Origin/Dest
const destIcon = createIcon('#1a4c8a');
const disruptionIcon = createIcon('#da312e', true); // Red pulsing for Disruption

const toLatLng = (coords: any): [number, number] => {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return [0, 0];
  return [coords[1], coords[0]]; // Leaflet uses [lat, lng] arrays
};

function MapUpdater({ mapData }: { mapData: any }) {
  const map = useMap();
  useEffect(() => {
    if (mapData && Array.isArray(mapData.origin_coords) && Array.isArray(mapData.dest_coords)) {
      let lng1 = mapData.origin_coords[0];
      let lng2 = mapData.dest_coords[0];
      if (Math.abs(lng2 - lng1) > 180) {
        if (lng2 < lng1) lng2 += 360;
        else lng1 += 360;
      }
      
      const bounds = L.latLngBounds([
        [mapData.origin_coords[1], lng1],
        [mapData.dest_coords[1], lng2]
      ]);
      
      if (Array.isArray(mapData.disruption_coords)) {
        let dLng = mapData.disruption_coords[0];
        if (Math.abs(dLng - lng1) > 180) {
          if (dLng < lng1) dLng += 360;
          else dLng += 360;
        }
        bounds.extend([mapData.disruption_coords[1], dLng]);
      }

      if (mapData.options && mapData.options.length > 0 && mapData.options[0].waypoints) {
        mapData.options[0].waypoints.forEach((wp: any) => {
          let wLng = wp[0];
          if (Math.abs(wLng - lng1) > 180) {
            if (wLng < lng1) wLng += 360;
            else wLng += 360;
          }
          bounds.extend([wp[1], wLng]);
        });
      }

      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [mapData, map]);
  return null;
}

export default function GeoNetwork() {
  const mapData = useStore(state => state.mapState);
  
  const [activeLayers, setActiveLayers] = useState({
    rail: false,
    sea: false,
    weather: false
  });

  useEffect(() => {
    if (!mapData) {
      useStore.getState().setMapState({
        disruption_coords: [121.47, 31.23], // Shanghai
        origin_coords: [121.47, 31.23],
        dest_coords: [-118.24, 34.05], // LA
        options: [
          { carrier: "Air Charter", route: "PVG -> ANC -> LAX", cost_delta: 4500, delay_h: 12 },
          { carrier: "Ocean Freight", route: "Ningbo -> LAX", cost_delta: 500, delay_h: 48 }
        ]
      });
    }
  }, [mapData]);

  const normalizeLng = (refLng: number, curLng: number) => {
    let lng = curLng;
    while (lng - refLng > 180) lng -= 360;
    while (refLng - lng > 180) lng += 360;
    return lng;
  };

  const generateArc = (start: [number, number], end: [number, number], offsetMultiplier = 0.2, segments = 50): [number, number][] => {
    const lat1 = start[0];
    const lng1 = start[1];
    const lat2 = end[0];
    const lng2 = end[1];

    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    
    const ctrlLat = midLat - dLng * offsetMultiplier;
    const ctrlLng = midLng + dLat * offsetMultiplier;

    const points: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = Math.pow(1 - t, 2) * lat1 + 2 * (1 - t) * t * ctrlLat + Math.pow(t, 2) * lat2;
      const lng = Math.pow(1 - t, 2) * lng1 + 2 * (1 - t) * t * ctrlLng + Math.pow(t, 2) * lng2;
      
      points.push([lat, lng]);
    }
    return points;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto h-full flex flex-col">
      <style>{`
        .animated-polyline {
          stroke-dasharray: 10, 15;
          animation: dash 20s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        .leaflet-popup-content-wrapper {
          background-color: #f9f8f6;
          border: 2px solid #1a1a1a;
          border-radius: 0;
          color: #1a1a1a;
          padding: 0;
          box-shadow: 4px 4px 0 rgba(26,26,26,0.1);
        }
        .leaflet-popup-content {
          margin: 0;
          padding: 12px;
          min-width: 180px;
        }
        .leaflet-popup-tip {
          background-color: #f9f8f6;
          border-top: 2px solid #1a1a1a;
          border-left: 2px solid #1a1a1a;
        }
        .leaflet-popup-close-button {
          color: #1a1a1a !important;
          padding: 4px !important;
        }
      `}</style>
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-4 shrink-0">
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">Geo_Network</h2>
        <div className="text-xs text-[#1a4c8a] border-2 border-[#1a4c8a] px-3 py-1 uppercase tracking-widest flex items-center gap-2 font-bold transform rotate-1 paper-edge bg-white">
          <span className="w-2 h-2 bg-[#1a4c8a] animate-blink block rounded-full"></span>
          Live_Tracking
        </div>
      </div>

      <div className="flex-1 border-2 border-[#1a1a1a] bg-[#f4f1ea] paper-edge shadow-sm relative overflow-hidden flex flex-col md:flex-row">
        {/* Map Area */}
        <div className="flex-1 relative bg-white">
          {/* Paper texture overlay */}
          <div className="absolute inset-0 pointer-events-none z-[5]" style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")',
            opacity: 0.5
          }}></div>

          {/* Tactical Layer Controls */}
          <div className="absolute top-4 right-4 z-[400] bg-[#f9f8f6]/95 backdrop-blur-sm border-2 border-[#1a1a1a] paper-edge p-3 shadow-sm flex flex-col gap-2 min-w-[200px] transform rotate-[0.5deg]">
            <div className="text-[10px] text-[#1a1a1a] font-bold uppercase tracking-widest border-b-2 border-dashed border-[#d5d1c8] pb-2 mb-2 flex items-center gap-2">
              <Layers className="w-3 h-3" /> Map Overlays
            </div>
            
            <button 
              onClick={() => setActiveLayers(prev => ({...prev, weather: !prev.weather}))}
              className={`flex items-center justify-between text-xs px-2 py-1.5 transition-colors border-2 paper-edge font-bold ${activeLayers.weather ? 'border-[#1a4c8a] text-[#1a4c8a] bg-[#1a4c8a]/5 transform rotate-1' : 'border-transparent text-[#666] hover:bg-[#1a1a1a]/5'}`}
            >
              <div className="flex items-center gap-2"><CloudRain className="w-3 h-3" /> NEXRAD Radar</div>
              {activeLayers.weather && <span className="w-1.5 h-1.5 rounded-full bg-[#1a4c8a] animate-pulse"></span>}
            </button>

            <button 
              onClick={() => setActiveLayers(prev => ({...prev, sea: !prev.sea}))}
              className={`flex items-center justify-between text-xs px-2 py-1.5 transition-colors border-2 paper-edge font-bold ${activeLayers.sea ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5 transform rotate-1' : 'border-transparent text-[#666] hover:bg-[#1a1a1a]/5'}`}
            >
              <div className="flex items-center gap-2"><Navigation className="w-3 h-3" /> Maritime Marks</div>
              {activeLayers.sea && <span className="w-1.5 h-1.5 rounded-full bg-[#228b22] animate-pulse"></span>}
            </button>

            <button 
              onClick={() => setActiveLayers(prev => ({...prev, rail: !prev.rail}))}
              className={`flex items-center justify-between text-xs px-2 py-1.5 transition-colors border-2 paper-edge font-bold ${activeLayers.rail ? 'border-[#b45309] text-[#b45309] bg-[#b45309]/5 transform rotate-1' : 'border-transparent text-[#666] hover:bg-[#1a1a1a]/5'}`}
            >
              <div className="flex items-center gap-2"><MapIcon className="w-3 h-3" /> Global Rail</div>
              {activeLayers.rail && <span className="w-1.5 h-1.5 rounded-full bg-[#b45309] animate-pulse"></span>}
            </button>
          </div>

          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%', background: '#f4f1ea', zIndex: 1 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Navigational & Weather Overlays */}
            {activeLayers.sea && (
              <TileLayer
                key="sea-layer"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
                zIndex={5}
              />
            )}
            {activeLayers.rail && (
              <TileLayer
                key="rail-layer"
                url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
                zIndex={4}
              />
            )}
            {activeLayers.weather && (
              <WMSTileLayer
                key="weather-layer"
                url="https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi"
                layers="nexrad-n0q-900913"
                format="image/png"
                transparent={true}
                opacity={0.6}
                zIndex={6}
              />
            )}

            <MapUpdater mapData={mapData} />

            {mapData && Array.isArray(mapData.origin_coords) && Array.isArray(mapData.dest_coords) && (() => {
              const oLng = mapData.origin_coords[0];
              const getNormPt = (coords: number[] | undefined): [number, number] | null => 
                coords ? [coords[1], normalizeLng(oLng, coords[0])] : null;

              const originPt = getNormPt(mapData.origin_coords)!;
              const destPt = getNormPt(mapData.dest_coords)!;
              const disPt = mapData.disruption_coords ? getNormPt(mapData.disruption_coords) : null;

              return (
              <>
                {/* Primary Route */}
                <Polyline 
                  positions={
                    disPt 
                      ? [
                          ...generateArc(originPt, disPt, 0.05),
                          ...generateArc(disPt, destPt, 0.05).slice(1) // Avoid duplicate center point
                        ]
                      : generateArc(originPt, destPt, 0.1)
                  } 
                  color="#1a4c8a" weight={3} className="animated-polyline opacity-70"
                />

                {/* Proposed Reroute Arcs */}
                {mapData.options && mapData.options.length > 0 && (() => {
                  let waypoints = mapData.options[0].waypoints || [];
                  if (waypoints.length > 1) {
                    // LLMs often forget to cap the route with exact origin/dest. Force them to ensure a connected graph.
                    const firstWp = waypoints[0];
                    const lastWp = waypoints[waypoints.length - 1];
                    const [oLngBase, oLat] = mapData.origin_coords;
                    const [dLng, dLat] = mapData.dest_coords;

                    if (Math.abs(firstWp[0] - oLngBase) > 1 || Math.abs(firstWp[1] - oLat) > 1) {
                      waypoints = [[oLngBase, oLat], ...waypoints];
                    }
                    if (Math.abs(lastWp[0] - dLng) > 1 || Math.abs(lastWp[1] - dLat) > 1) {
                      waypoints = [...waypoints, [dLng, dLat]];
                    }

                    const normalizedWaypoints = waypoints.map((wp: number[]) => getNormPt(wp)!);

                    return (
                      <>
                        {normalizedWaypoints.slice(0, -1).map((wp: any, idx: number) => {
                          const wpNext = normalizedWaypoints[idx + 1];
                          return (
                            <Polyline 
                              key={`arc-${idx}`}
                              positions={generateArc(wp, wpNext, -0.15)} 
                              color="#228b22" weight={3}
                            />
                          );
                        })}
                        {normalizedWaypoints.map((wp: any, idx: number) => {
                          return (
                            <CircleMarker key={idx} center={wp} radius={4} pathOptions={{ color: '#228b22', fillColor: '#228b22', fillOpacity: 1 }}>
                              <Popup>Waypoint {idx + 1}</Popup>
                            </CircleMarker>
                          );
                        })}
                      </>
                    );
                  } else {
                    return (
                      <Polyline 
                        positions={generateArc(originPt, destPt, -0.3)} 
                        color="#228b22" weight={3}
                      />
                    );
                  }
                })()}

                {/* Origin Marker */}
                <Marker position={originPt} icon={originIcon}>
                  <Popup>Origin</Popup>
                </Marker>

                {/* Destination Marker */}
                <Marker position={destPt} icon={destIcon}>
                  <Popup>Destination</Popup>
                </Marker>

                {/* Disruption Marker */}
                {disPt && (
                  <Marker position={disPt} icon={disruptionIcon}>
                    <Popup>Disruption Zone</Popup>
                  </Marker>
                )}
              </>
              )
            })()}

            {/* Permanent WMS Infrastructure Markers */}
            {useStore.getState().wmsState.map((node: any) => {
              const bLng = mapData?.origin_coords ? mapData.origin_coords[0] : 0;
              const nLng = normalizeLng(bLng, node.lng);
              return (
              <CircleMarker 
                key={node.id} 
                center={[node.lat, nLng]} 
                radius={3} 
                pathOptions={{ 
                  color: node.capacity_pct >= 90 ? '#da312e' : node.capacity_pct >= 80 ? '#b45309' : '#1a1a1a', 
                  fillColor: node.capacity_pct >= 90 ? '#da312e' : node.capacity_pct >= 80 ? '#b45309' : '#1a1a1a', 
                  fillOpacity: 0.7 
                }}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <div className="text-[#1a4c8a] font-bold border-b-2 border-dashed border-[#d5d1c8] pb-1 mb-1">{node.id}</div>
                    <div className="text-[#1a1a1a] uppercase tracking-widest text-[10px] break-words font-bold">{node.name}</div>
                    <div className="text-[#666] text-[10px] font-bold uppercase tracking-widest">Tier {node.tier} • {node.region}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#666] text-[10px] font-bold uppercase tracking-widest">Load:</span>
                      <span className={`text-[10px] font-bold ${node.capacity_pct >= 90 ? 'text-[#da312e] animate-pulse' : node.capacity_pct >= 80 ? 'text-[#b45309]' : 'text-[#228b22]'}`}>
                        {node.capacity_pct}%
                      </span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
              )
            })}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-6 left-6 z-20 bg-[#f9f8f6]/95 backdrop-blur-sm border-2 border-[#1a1a1a] paper-edge p-4 font-mono text-[10px] font-bold uppercase tracking-widest space-y-3 transform rotate-[0.5deg]">
            <div className="flex items-center gap-3">
              <span className="w-4 h-1 bg-[#1a4c8a]"></span>
              <span className="text-[#1a1a1a]">Primary_Route</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-1 bg-[#228b22]"></span>
              <span className="text-[#1a1a1a]">Active_Diverted</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#da312e] animate-pulse"></span>
              <span className="text-[#1a1a1a]">Active_Disruption</span>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-80 border-t-2 md:border-t-0 md:border-l-2 border-[#1a1a1a] bg-[#f9f8f6] p-6 flex flex-col overflow-y-auto">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] mb-6 flex items-center gap-2 border-b-2 border-[#d5d1c8] pb-2">
            <Navigation className="w-4 h-4 text-[#1a4c8a]" /> Route_Analysis
          </h3>

          {!mapData ? (
            <div className="flex-1 flex items-center justify-center text-[#666] font-bold uppercase tracking-widest text-xs text-center">
              Awaiting<br/>Disruption<br/>Data
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(mapData.disruption_coords) && (
                <div className="border-2 border-[#da312e] bg-[#da312e]/5 paper-edge p-4 transform -rotate-1">
                  <div className="text-[10px] text-[#da312e] font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Disruption_Zone
                  </div>
                  <div className="font-mono text-xs text-[#1a1a1a] font-bold">
                    LAT: {mapData.disruption_coords[1]?.toFixed(4)}<br/>
                    LNG: {mapData.disruption_coords[0]?.toFixed(4)}
                  </div>
                </div>
              )}

              {mapData.options && mapData.options.length > 0 && mapData.options[0] && (
                <div>
                  <div className="text-[10px] text-[#228b22] font-bold uppercase tracking-widest mb-2 border-b-2 border-dashed border-[#d5d1c8] pb-1">Confirmed_Diverted_Path</div>
                  <div className="space-y-3">
                    <div className="border-2 border-[#228b22] bg-[#228b22]/5 paper-edge p-3 transform rotate-1 mt-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-xs uppercase tracking-widest text-[#228b22]">
                          Active_Route
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-[#666] font-bold space-y-1">
                        <div>Carrier: <span className="text-[#1a1a1a]">{mapData.options[0].carrier}</span></div>
                        <div>Route: <span className="text-[#1a1a1a]">{mapData.options[0].route}</span></div>
                        <div className="flex justify-between mt-2 pt-2 border-t-2 border-dashed border-[#d5d1c8]">
                          <span className={mapData.options[0].delay_h > 24 ? 'text-[#b45309]' : 'text-[#228b22]'}>+{mapData.options[0].delay_h}H Delay</span>
                          <span className="text-[#da312e]">+{mapData.options[0].cost_delta} USD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
