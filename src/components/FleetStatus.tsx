import React, { useState, useEffect } from 'react';
import { Ship, Truck, Plane, Activity, Navigation } from 'lucide-react';
import { useStore } from '../store';

export default function FleetStatus() {
  const fleetState = useStore(state => state.fleetState);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-4">
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">Active_Fleet_Status</h2>
        <div className="text-xs text-[#1a4c8a] border-2 border-[#1a4c8a] px-3 py-1 uppercase tracking-widest font-bold transform rotate-1 paper-edge">
          Module: Live_Sync
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FleetCard 
          title="Ocean_Freight" 
          icon={<Ship />} 
          active={fleetState.ocean.active} 
          volume={fleetState.ocean.volume} 
          trend={fleetState.ocean.trend} 
          color="#1a4c8a" 
        />
        <FleetCard 
          title="Air_Cargo" 
          icon={<Plane />} 
          active={fleetState.air.active} 
          volume={fleetState.air.volume} 
          trend={fleetState.air.trend} 
          color="#da312e" 
        />
        <FleetCard 
          title="Ground_Transport" 
          icon={<Truck />} 
          active={fleetState.ground.active} 
          volume={fleetState.ground.volume} 
          trend={fleetState.ground.trend} 
          color="#228b22" 
        />
      </div>

      {/* Active Routes Table */}
      <div className="border-2 border-[#1a1a1a] paper-edge bg-[#f9f8f6] p-6 relative shadow-[4px_4px_0_rgba(26,26,26,0.1)]">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#1a4c8a]"></div>
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#1a4c8a]"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#1a4c8a]"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#1a4c8a]"></div>
        
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] mb-6 flex items-center gap-2 border-b-2 border-[#d5d1c8] pb-2 inline-flex">
          <Navigation className="w-5 h-5 text-[#1a4c8a]" /> Live_Transit_Manifest
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#1a1a1a] text-[10px] uppercase tracking-widest text-[#1a1a1a] font-bold">
                <th className="pb-3 pl-2">Asset_ID</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Origin</th>
                <th className="pb-3">Destination</th>
                <th className="pb-3">ETA (UTC)</th>
                <th className="pb-3 text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs font-bold">
              {fleetState.activeRoutes.map((route, idx) => (
                <tr key={idx} className="border-b border-dashed border-[#d5d1c8] hover:bg-white transition-colors">
                  <td className="py-4 pl-2 text-[#1a1a1a]">{route.id}</td>
                  <td className="py-4 text-[#666]">{route.type}</td>
                  <td className="py-4 text-[#1a4c8a]">{route.origin}</td>
                  <td className="py-4 text-[#1a4c8a]">{route.dest}</td>
                  <td className="py-4 text-[#666]">{route.eta}</td>
                  <td className="py-4 text-right pr-2" style={{ color: route.color === '#00ff41' ? '#228b22' : route.color === '#ff5500' ? '#da312e' : route.color === '#00e5ff' ? '#1a4c8a' : route.color }}>
                    [{route.status}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FleetCard({ title, icon, active, volume, trend, color }: any) {
  const isCritical = active < 5;

  return (
    <div className={`border-2 paper-edge p-5 relative group transition-colors shadow-sm ${isCritical ? 'border-[#da312e] bg-[#da312e]/5' : 'border-[#1a1a1a] bg-[#f9f8f6] hover:bg-white'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <div className={`text-[10px] uppercase tracking-widest font-mono font-bold border-b-2 border-transparent group-hover:border-[#d5d1c8] transition-colors ${isCritical ? 'text-[#da312e]' : 'text-[#666]'}`}>{title}</div>
          {isCritical && <span className="text-[9px] px-1.5 py-0.5 bg-[#da312e] text-white animate-pulse font-bold">LOW ASSET</span>}
        </div>
        <div style={{ color: isCritical ? '#da312e' : color }} className="opacity-80">{React.cloneElement(icon, { className: 'w-6 h-6' })}</div>
      </div>
      <div className="flex items-end gap-3 mb-2">
        <div className={`font-mono text-4xl font-bold tracking-tight leading-none ${isCritical ? 'text-[#da312e]' : 'text-[#1a1a1a]'}`}>{active}</div>
        <div className={`text-xs uppercase tracking-widest font-bold mb-1 ${isCritical ? 'text-[#da312e]' : 'text-[#666]'}`}>Active</div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-[#d5d1c8]">
        <div className="text-[10px] text-[#1a1a1a] font-bold uppercase tracking-widest font-sans">Vol: {volume}</div>
        <div style={{ color: isCritical ? '#da312e' : color }} className="text-[10px] font-bold uppercase tracking-widest">
          {trend}
        </div>
      </div>
    </div>
  );
}
