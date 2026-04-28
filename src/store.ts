import { create } from 'zustand';
import { PipelineState, AuditEntry } from './types';

export const DEFAULT_FLEET_STATE = {
  ocean: { active: 71, volume: "1.7M TEU", status: "NOMINAL", trend: "+2 VSL" },
  air: { active: 19, volume: "600 TONS", status: "ELEVATED", trend: "+4 FLT" },
  ground: { active: 1728, volume: "22.5K PLT", status: "NOMINAL", trend: "-21 TRK" },
  activeRoutes: [
    { id: "VSL-882", type: "OCEAN", origin: "Shenzhen (CNSZX)", dest: "Los Angeles (USLAX)", eta: "2026-04-18T14:00Z", status: "IN_TRANSIT", color: "#00e5ff" },
    { id: "FLT-109", type: "AIR", origin: "Memphis (MEM)", dest: "London (LHR)", eta: "2026-04-14T22:30Z", status: "APPROACHING", color: "#00ff41" },
    { id: "TRK-9921", type: "GROUND", origin: "Dallas DC", dest: "Austin Hub", eta: "2026-04-14T18:15Z", status: "IN_TRANSIT", color: "#00e5ff" },
    { id: "VSL-411", type: "OCEAN", origin: "Rotterdam (NLRTM)", dest: "New York (USNYC)", eta: "2026-04-22T08:00Z", status: "DELAYED_WX", color: "#ff5500" },
    { id: "TRK-4432", type: "GROUND", origin: "Chicago Hub", dest: "Detroit DC", eta: "2026-04-15T04:20Z", status: "IN_TRANSIT", color: "#00e5ff" },
  ]
};

export const DEFAULT_WMS_STATE = [
  // AMER Tier 1 (Gateways)
  { id: "WMS-LAX-01", name: "LAX Gateway", region: "AMER", tier: 1, lat: 33.94, lng: -118.40, capacity_pct: 92, status: 'critical', active_docks: 40, total_docks: 45, inbound_shipments: 1450, outbound_shipments: 1200, last_updated: new Date().toISOString() },
  { id: "WMS-LGB-01", name: "Long Beach Port Hub", region: "AMER", tier: 1, lat: 33.75, lng: -118.21, capacity_pct: 88, status: 'warning', active_docks: 55, total_docks: 60, inbound_shipments: 2100, outbound_shipments: 1800, last_updated: new Date().toISOString() },
  { id: "WMS-NYK-01", name: "NY/NJ Coastal Hub", region: "AMER", tier: 1, lat: 40.66, lng: -74.11, capacity_pct: 75, status: 'optimal', active_docks: 48, total_docks: 60, inbound_shipments: 1850, outbound_shipments: 1750, last_updated: new Date().toISOString() },
  // AMER Tier 2 (RDCs)
  { id: "WMS-DFW-01", name: "Dallas RDC", region: "AMER", tier: 2, lat: 32.89, lng: -97.04, capacity_pct: 62, status: 'optimal', active_docks: 30, total_docks: 50, inbound_shipments: 900, outbound_shipments: 1100, last_updated: new Date().toISOString() },
  { id: "WMS-ORD-01", name: "Chicago Rail Hub", region: "AMER", tier: 2, lat: 41.97, lng: -87.90, capacity_pct: 85, status: 'warning', active_docks: 38, total_docks: 40, inbound_shipments: 1200, outbound_shipments: 1150, last_updated: new Date().toISOString() },
  { id: "WMS-MEM-01", name: "Memphis Air RDC", region: "AMER", tier: 2, lat: 35.04, lng: -89.97, capacity_pct: 50, status: 'optimal', active_docks: 25, total_docks: 60, inbound_shipments: 600, outbound_shipments: 800, last_updated: new Date().toISOString() },
  // AMER Tier 3 (Cross-docks)
  { id: "WMS-MIA-03", name: "Miami Relay", region: "AMER", tier: 3, lat: 25.79, lng: -80.29, capacity_pct: 95, status: 'critical', active_docks: 12, total_docks: 12, inbound_shipments: 300, outbound_shipments: 290, last_updated: new Date().toISOString() },
  { id: "WMS-LRD-03", name: "Laredo Border Dock", region: "AMER", tier: 3, lat: 27.53, lng: -99.48, capacity_pct: 70, status: 'optimal', active_docks: 15, total_docks: 20, inbound_shipments: 400, outbound_shipments: 380, last_updated: new Date().toISOString() },
  
  // EMEA Tier 1
  { id: "WMS-RTM-01", name: "Rotterdam Gateway", region: "EMEA", tier: 1, lat: 51.92, lng: 4.47, capacity_pct: 71, status: 'warning', active_docks: 28, total_docks: 35, inbound_shipments: 880, outbound_shipments: 850, last_updated: new Date().toISOString() },
  { id: "WMS-HAM-01", name: "Hamburg Port Hub", region: "EMEA", tier: 1, lat: 53.55, lng: 9.99, capacity_pct: 60, status: 'optimal', active_docks: 25, total_docks: 45, inbound_shipments: 750, outbound_shipments: 800, last_updated: new Date().toISOString() },
  { id: "WMS-DXB-01", name: "Dubai Fulfillment", region: "EMEA", tier: 1, lat: 25.20, lng: 55.27, capacity_pct: 45, status: 'optimal', active_docks: 12, total_docks: 30, inbound_shipments: 210, outbound_shipments: 340, last_updated: new Date().toISOString() },
  // EMEA Tier 2
  { id: "WMS-FRA-02", name: "Frankfurt RDC", region: "EMEA", tier: 2, lat: 50.11, lng: 8.68, capacity_pct: 89, status: 'warning', active_docks: 32, total_docks: 35, inbound_shipments: 950, outbound_shipments: 900, last_updated: new Date().toISOString() },
  { id: "WMS-CDG-02", name: "Paris Air Hub", region: "EMEA", tier: 2, lat: 49.00, lng: 2.54, capacity_pct: 55, status: 'optimal', active_docks: 18, total_docks: 40, inbound_shipments: 450, outbound_shipments: 500, last_updated: new Date().toISOString() },
  // EMEA Tier 3
  { id: "WMS-DOV-03", name: "Dover Cross-Dock", region: "EMEA", tier: 3, lat: 51.12, lng: 1.31, capacity_pct: 98, status: 'critical', active_docks: 10, total_docks: 10, inbound_shipments: 200, outbound_shipments: 180, last_updated: new Date().toISOString() },

  // APAC Tier 1
  { id: "WMS-SHG-01", name: "Shanghai Port Hub", region: "APAC", tier: 1, lat: 31.23, lng: 121.47, capacity_pct: 94, status: 'critical', active_docks: 60, total_docks: 65, inbound_shipments: 3000, outbound_shipments: 2800, last_updated: new Date().toISOString() },
  { id: "WMS-SZN-01", name: "Shenzhen Gateway", region: "APAC", tier: 1, lat: 22.54, lng: 114.05, capacity_pct: 82, status: 'warning', active_docks: 45, total_docks: 55, inbound_shipments: 2200, outbound_shipments: 2100, last_updated: new Date().toISOString() },
  { id: "WMS-SIN-01", name: "Singapore Maritime RDC", region: "APAC", tier: 1, lat: 1.35, lng: 103.81, capacity_pct: 68, status: 'optimal', active_docks: 35, total_docks: 50, inbound_shipments: 1500, outbound_shipments: 1600, last_updated: new Date().toISOString() },
  // APAC Tier 2
  { id: "WMS-BOM-02", name: "Mumbai Regional Hub", region: "APAC", tier: 2, lat: 19.07, lng: 72.87, capacity_pct: 88, status: 'warning', active_docks: 28, total_docks: 30, inbound_shipments: 800, outbound_shipments: 750, last_updated: new Date().toISOString() },
  { id: "WMS-TYO-02", name: "Tokyo Central", region: "APAC", tier: 2, lat: 35.67, lng: 139.65, capacity_pct: 40, status: 'optimal', active_docks: 20, total_docks: 45, inbound_shipments: 500, outbound_shipments: 650, last_updated: new Date().toISOString() },
  // APAC Tier 3
  { id: "WMS-ICN-03", name: "Incheon Cross-Dock", region: "APAC", tier: 3, lat: 37.45, lng: 126.44, capacity_pct: 75, status: 'optimal', active_docks: 8, total_docks: 12, inbound_shipments: 150, outbound_shipments: 160, last_updated: new Date().toISOString() }
];

interface StoreState {
  pipeline: PipelineState;
  mapState: any | null;
  fleetState: any;
  wmsState: any[];
  auditLog: AuditEntry[];
  config: { maxCost: number; maxDelay: number; autoMode: boolean; avoidRedSea: boolean; avoidPanamaCanal: boolean; strictCarbon: boolean };

  setPipeline: (pipeline: PipelineState | ((p: PipelineState) => PipelineState)) => void;
  setMapState: (mapState: any) => void;
  setFleetState: (fleetState: any) => void;
  setWmsState: (wmsState: any) => void;
  setAuditLog: (auditLog: AuditEntry[]) => void;
  setConfig: (config: { maxCost: number; maxDelay: number; autoMode: boolean; avoidRedSea: boolean; avoidPanamaCanal: boolean; strictCarbon: boolean; }) => void;
  
  resetStore: () => void;
}

export const useStore = create<StoreState>((set) => ({
  pipeline: { stage: 'idle', disruption: null, agentReasoning: '', plans: null, gate: null, execution: null, auditId: null },
  mapState: null,
  fleetState: DEFAULT_FLEET_STATE,
  wmsState: DEFAULT_WMS_STATE,
  auditLog: [],
  config: { maxCost: 5000, maxDelay: 24, autoMode: true, avoidRedSea: false, avoidPanamaCanal: false, strictCarbon: false },

  setPipeline: (p) => set((state) => ({ pipeline: typeof p === 'function' ? p(state.pipeline) : p })),
  setMapState: (mapState) => set({ mapState }),
  setFleetState: (fleetState) => set({ fleetState }),
  setWmsState: (wmsState) => set({ wmsState }),
  setAuditLog: (auditLog) => set({ auditLog }),
  setConfig: (config) => set({ config }),
  
  resetStore: () => set({
    fleetState: DEFAULT_FLEET_STATE,
    wmsState: DEFAULT_WMS_STATE,
    auditLog: [],
    config: { maxCost: 5000, maxDelay: 24, autoMode: true, avoidRedSea: false, avoidPanamaCanal: false, strictCarbon: false },
    pipeline: { stage: 'idle', disruption: null, agentReasoning: '', plans: null, gate: null, execution: null, auditId: null },
    mapState: null
  })
}));
