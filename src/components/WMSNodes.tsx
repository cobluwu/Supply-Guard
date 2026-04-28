import React, { useState, useEffect } from 'react';
import { Warehouse, Box, Truck, AlertTriangle, Activity, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useStore } from '../store';

// Demo Data Interface
interface WMSNode {
  id: string;
  name: string;
  region: string;
  capacity_pct: number;
  status: 'optimal' | 'warning' | 'critical';
  active_docks: number;
  total_docks: number;
  inbound_shipments: number;
  outbound_shipments: number;
  last_updated: string;
}

const DEFAULT_WMS_STATE: WMSNode[] = [
  {
    id: "WMS-SHG-01",
    name: "Shanghai Primary Hub",
    region: "APAC",
    capacity_pct: 92,
    status: 'critical',
    active_docks: 42,
    total_docks: 45,
    inbound_shipments: 1250,
    outbound_shipments: 890,
    last_updated: new Date().toISOString()
  },
  {
    id: "WMS-LAX-02",
    name: "Los Angeles DC",
    region: "NA-WEST",
    capacity_pct: 65,
    status: 'optimal',
    active_docks: 28,
    total_docks: 50,
    inbound_shipments: 450,
    outbound_shipments: 620,
    last_updated: new Date().toISOString()
  },
  {
    id: "WMS-RTD-01",
    name: "Rotterdam Cross-Dock",
    region: "EMEA",
    capacity_pct: 81,
    status: 'warning',
    active_docks: 30,
    total_docks: 35,
    inbound_shipments: 880,
    outbound_shipments: 850,
    last_updated: new Date().toISOString()
  },
  {
    id: "WMS-DXB-01",
    name: "Dubai Fulfillment",
    region: "MENA",
    capacity_pct: 45,
    status: 'optimal',
    active_docks: 12,
    total_docks: 30,
    inbound_shipments: 210,
    outbound_shipments: 340,
    last_updated: new Date().toISOString()
  }
];

export default function WMSNodes() {
  const nodes = useStore(state => state.wmsState);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'critical': return 'text-[#da312e] border-2 border-[#da312e] bg-[#da312e]/5 paper-edge transform -rotate-1';
      case 'warning': return 'text-[#b45309] border-2 border-[#b45309] bg-[#b45309]/5 paper-edge transform rotate-1';
      default: return 'text-[#228b22] border-2 border-[#228b22] bg-[#228b22]/5 paper-edge transform -rotate-1';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-4">
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">WMS_Nodes</h2>
        <div className="text-xs text-[#1a4c8a] border-2 border-[#1a4c8a] px-3 py-1 uppercase tracking-widest flex items-center gap-2 font-bold transform rotate-1 paper-edge bg-white">
          <span className="w-2 h-2 bg-[#1a4c8a] animate-blink block rounded-full"></span>
          Live_Sync
        </div>
      </div>

      {/* Global WMS Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 paper-edge shadow-sm transform -rotate-[0.5deg]">
          <div className="text-[#666] text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 font-bold border-b-2 border-transparent hover:border-[#d5d1c8] transition-colors inline-flex">
            <Warehouse className="w-3 h-3" /> Total_Nodes
          </div>
          <div className="text-3xl font-mono text-[#1a1a1a] font-bold">{nodes.length}</div>
        </div>
        <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 paper-edge shadow-sm transform rotate-[0.5deg]">
          <div className="text-[#666] text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 font-bold border-b-2 border-transparent hover:border-[#d5d1c8] transition-colors inline-flex">
            <Activity className="w-3 h-3" /> Avg_Capacity
          </div>
          <div className="text-3xl font-mono text-[#1a4c8a] font-bold">
            {Math.round(nodes.reduce((acc, n) => acc + n.capacity_pct, 0) / nodes.length)}%
          </div>
        </div>
        <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 paper-edge shadow-sm transform -rotate-[0.5deg]">
          <div className="text-[#666] text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 font-bold border-b-2 border-transparent hover:border-[#d5d1c8] transition-colors inline-flex">
            <ArrowDownToLine className="w-3 h-3" /> Global_Inbound
          </div>
          <div className="text-3xl font-mono text-[#1a1a1a] font-bold">
            {nodes.reduce((acc, n) => acc + n.inbound_shipments, 0).toLocaleString()}
          </div>
        </div>
        <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 paper-edge shadow-sm transform rotate-[0.5deg]">
          <div className="text-[#666] text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 font-bold border-b-2 border-transparent hover:border-[#d5d1c8] transition-colors inline-flex">
            <ArrowUpFromLine className="w-3 h-3" /> Global_Outbound
          </div>
          <div className="text-3xl font-mono text-[#1a1a1a] font-bold">
            {nodes.reduce((acc, n) => acc + n.outbound_shipments, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <div key={node.id} className="border-2 border-[#1a1a1a] bg-[#f4f1ea] flex flex-col paper-edge shadow-sm">
            {/* Card Header */}
            <div className="p-4 border-b-2 border-[#1a1a1a] flex justify-between items-start bg-[#f9f8f6]">
              <div>
                <div className="text-[#1a4c8a] font-mono text-xs mb-1 font-bold">{node.id}</div>
                <h3 className="text-[#1a1a1a] font-bold uppercase tracking-widest flex items-center gap-2">
                  {node.name}
                  {node.capacity_pct >= 90 && (
                     <span className="text-[9px] px-1.5 py-0.5 bg-[#da312e] text-white animate-pulse font-bold paper-edge">CRITICAL LOAD</span>
                  )}
                </h3>
                <div className="text-[#666] text-[10px] font-bold uppercase tracking-widest mt-1">Region: {node.region}</div>
              </div>
              <div className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold ${getStatusColor(node.status)}`}>
                {node.status}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 grid grid-cols-2 gap-6">
              {/* Capacity Meter */}
              <div className="col-span-2">
                <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest mb-2">
                  <span className="text-[#666] flex items-center gap-2"><Box className="w-3 h-3"/> Storage_Capacity</span>
                  <span className={node.capacity_pct > 90 ? 'text-[#da312e]' : 'text-[#1a1a1a]'}>{node.capacity_pct}%</span>
                </div>
                <div className="h-3 w-full bg-[#d5d1c8] overflow-hidden border-2 border-[#1a1a1a] paper-edge">
                  <div 
                    className={`h-full transition-all duration-1000 ${node.capacity_pct > 90 ? 'bg-[#da312e]' : node.capacity_pct > 75 ? 'bg-[#b45309]' : 'bg-[#228b22]'}`}
                    style={{ width: `${node.capacity_pct}%` }}
                  ></div>
                </div>
              </div>

              {/* Docks */}
              <div>
                <div className="text-[#666] text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Truck className="w-3 h-3" /> Dock_Utilization
                </div>
                <div className="font-mono text-lg text-[#1a1a1a] font-bold">
                  {node.active_docks} <span className="text-[#a0a0a0] text-sm">/ {node.total_docks}</span>
                </div>
              </div>

              {/* Flow */}
              <div className="space-y-2 font-bold border-l-2 border-dashed border-[#d5d1c8] pl-4">
                <div className="flex justify-between items-center border-b-2 border-dashed border-[#d5d1c8] pb-1">
                  <span className="text-[#666] text-[10px] uppercase tracking-widest">Inbound</span>
                  <span className="font-mono text-xs text-[#1a4c8a]">{node.inbound_shipments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#666] text-[10px] uppercase tracking-widest">Outbound</span>
                  <span className="font-mono text-xs text-[#228b22]">{node.outbound_shipments}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
