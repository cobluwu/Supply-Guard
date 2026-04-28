import React, { useState, useEffect } from 'react';
import { ShieldAlert, Map as MapIcon, Package, Activity, Settings, Terminal, Ship } from 'lucide-react';
import { useStore } from './store';
import Dashboard from './components/Dashboard';
import AgentPanel from './components/AgentPanel';
import FleetStatus from './components/FleetStatus';
import GeoNetwork from './components/GeoNetwork';
import WMSNodes from './components/WMSNodes';
import SysConfig from './components/SysConfig';
import LandingPage from './components/LandingPage';

export default function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [alerts, setAlerts] = useState<string>('SYSTEM NOMINAL // NO ACTIVE CRITICAL ALERTS //');
  const auditLog = useStore(state => state.auditLog);

  useEffect(() => {
    if (auditLog && auditLog.length > 0) {
      const recentLogs = auditLog.slice(0, 5);
      const alertString = recentLogs.map((log: any) => {
        const severity = log.decision_type === 'escalate' ? '[CRITICAL]' : '[INFO]';
        return `${severity} ${log.disruption_summary.toUpperCase()} -> ${log.decision_type === 'escalate' ? 'ESCALATED TO HUMAN' : `REROUTED VIA ${log.plan_selected.toUpperCase()}`} //`;
      }).join(' ');
      setAlerts(alertString);
    } else {
      setAlerts('SYSTEM NOMINAL // NO ACTIVE CRITICAL ALERTS //');
    }
  }, [auditLog]);

  if (!isLaunched) {
    return <LandingPage onLaunch={() => setIsLaunched(true)} />;
  }

  return (
    <div className="flex h-screen text-[#1a1a1a] font-sans overflow-hidden bg-transparent">
      {/* Sidebar - Paper Style */}
      <aside className="w-72 border-r-2 border-[#1a1a1a] flex flex-col bg-[#f4f1ea] relative z-10 paper-edge z-20">
        <div className="p-6 border-b-2 border-[#1a1a1a] flex items-center gap-4 bg-[#f4f1ea]">
          <div className="border-2 border-[#da312e] rounded-full p-2 text-[#da312e]">
            <ShieldAlert className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl tracking-tight text-[#1a1a1a] uppercase leading-none">SupplyGuard</h1>
            <div className="text-[10px] text-[#1a4c8a] mt-1 tracking-widest font-mono uppercase flex items-center gap-2 font-bold">
              <span className="w-2 h-2 bg-[#1a4c8a] rounded-full block"></span>
              Sys_Active
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <div className="text-[10px] text-[#666] uppercase tracking-widest mb-2 font-mono font-bold border-b border-[#d5d1c8] pb-1">Modules</div>
          <NavItem icon={<Activity />} label="Live_Telemetry" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Terminal />} label="Agent_Terminal" active={activeTab === 'disruptions'} onClick={() => setActiveTab('disruptions')} badge="3_CRIT" />
          <NavItem icon={<MapIcon />} label="Geo_Network" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
          <NavItem icon={<Ship />} label="Active_Fleet" active={activeTab === 'fleet'} onClick={() => setActiveTab('fleet')} />
          <NavItem icon={<Package />} label="WMS_Nodes" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
        </nav>
        <div className="p-4 border-t-2 border-[#1a1a1a] bg-[#f4f1ea]">
          <NavItem icon={<Settings />} label="Sys_Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 bg-transparent">
        <header className="h-14 border-b-2 border-[#1a1a1a] flex items-center justify-between px-6 bg-[#f4f1ea] z-10 paper-edge">
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap w-2/3">
            <span className="text-[#da312e] text-xs font-bold border-2 border-[#da312e] px-2 py-0.5 uppercase transform -rotate-1 font-mono">Alert_Feed</span>
            <div className={`text-xs uppercase font-mono font-bold tracking-widest overflow-hidden relative w-full h-4 ${alerts.includes('CRITICAL') ? 'text-[#da312e]' : 'text-[#1a4c8a]'}`}>
              <span className="animate-marquee absolute whitespace-nowrap">
                {alerts}
              </span>
            </div>
          </div>
          <div className="text-xs text-[#1a1a1a] font-mono font-bold uppercase tracking-widest">
            UTC: {new Date().toISOString().split('T')[1].slice(0, 8)}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-transparent">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'disruptions' && <AgentPanel />}
          {activeTab === 'fleet' && <FleetStatus />}
          {activeTab === 'map' && <GeoNetwork />}
          {activeTab === 'inventory' && <WMSNodes />}
          {activeTab === 'settings' && <SysConfig />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 transition-all font-mono font-bold ${
        active ? 'border-2 border-[#1a4c8a] bg-[#1a4c8a]/5 text-[#1a4c8a] transform rotate-[0.5deg] paper-edge shadow-sm' : 'border-2 border-transparent text-[#1a1a1a] hover:border-[#d5d1c8] hover:bg-white/50'
      }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
      {badge && (
        <span className="bg-[#da312e] text-white py-0.5 px-2 text-[10px] font-bold uppercase tracking-wider transform rotate-2">
          {badge}
        </span>
      )}
    </button>
  );
}
