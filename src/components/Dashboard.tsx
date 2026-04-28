import React, { useMemo } from 'react';
import { TrendingUp, AlertCircle, Clock, CheckCircle2, Activity, DollarSign, Leaf, Zap } from 'lucide-react';
import { useStore } from '../store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Dashboard() {
  const audits = useStore(state => state.auditLog);
  const fleetState = useStore(state => state.fleetState);
  const wmsState = useStore(state => state.wmsState);

  const baseShipments = 7260;
  const baseAlerts = 6;
  const baseSLA = 97.4;

  const activeShipments = fleetState ? baseShipments + fleetState.activeRoutes.length - 5 : baseShipments + audits.length;
  
  const resolvedAlerts = audits.filter(a => a.decision_type === 'auto_execute').length;
  const escalatedAlerts = audits.filter(a => a.decision_type === 'escalate').length;
  const criticalAlerts = Math.max(0, baseAlerts - resolvedAlerts + escalatedAlerts);

  // Mathematically sound delay average across disruptions
  const totalDelayHours = audits.reduce((acc, audit) => acc + (Number(audit.delay_hours) || 0), 0);
  const avgDelay = audits.length > 0 ? (totalDelayHours / audits.length).toFixed(1) : "1.8";

  // Accurate SLA Compliance calculation
  const slaBreaches = audits.filter(a => a.sla_preserved === false).length;
  const totalTracked = 100 + audits.length; // Baseline of 100 recent shipments for percentage
  const successfulShipments = 100 * (baseSLA / 100) + (audits.length - slaBreaches);
  const slaCompliance = ((successfulShipments / totalTracked) * 100).toFixed(1);

  const alertsTrend = criticalAlerts > baseAlerts ? "ESCALATING" : criticalAlerts < baseAlerts ? "RESOLVING" : "ACTION REQ";
  const delayTrend = totalDelayHours > 0 ? `+${totalDelayHours}H CUMULATIVE` : "NOMINAL";
  const slaTrend = slaBreaches > 0 ? `-${slaBreaches} BREACHES` : "TGT: 98.0%";

  // Carbon Tracking Logic
  let carbonTons = 0;
  audits.forEach(a => {
    const carrier = (a.plan_selected || "").toLowerCase();
    if (carrier.includes('air') || carrier.includes('flight')) carbonTons += 145;
    else if (carrier.includes('ocean') || carrier.includes('sea')) carbonTons += 22;
    else carbonTons += 8;
  });

  // Generate Chart Data based on Audit Logs (Simulating ROI: $10,000 SLA penalty avoided vs Reroute Cost)
  const financialData = useMemo(() => {
    let cumulativeSavings = 0;
    let totalRerouteCost = 0;
    let totalPenaltyAvoided = 0;

    const baseData = [
      { name: '08:00', rerouteCost: 1200, penaltyAvoided: 10000, savings: 8800 },
      { name: '10:00', rerouteCost: 4500, penaltyAvoided: 10000, savings: 5500 },
      { name: '12:00', rerouteCost: 800, penaltyAvoided: 10000, savings: 9200 },
    ];
    
    const realData = audits.map((a, i) => {
      const time = new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
      const penalty = a.sla_preserved !== false ? 10000 : 0; // Simulated flat $10k SLA penalty avoidance if preserved
      const cost = a.cost_delta_usd || 0;
      const savings = Math.max(0, penalty - cost);
      return {
        name: time,
        rerouteCost: cost,
        penaltyAvoided: penalty,
        savings: savings
      };
    }).reverse();

    const merged = [...baseData, ...realData];
    merged.forEach(data => {
      cumulativeSavings += data.savings;
      totalRerouteCost += data.rerouteCost;
      totalPenaltyAvoided += data.penaltyAvoided;
    });

    return { 
      chart: merged, 
      cumulativeSavings, 
      totalRerouteCost, 
      totalPenaltyAvoided 
    };
  }, [audits]);

  // Dynamic Subsystem Status
  const isFleetCritical = fleetState.air.active < 5 || fleetState.ocean.active < 5;
  const criticalWmsNodes = wmsState.filter(n => n.capacity_pct >= 90).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-4 shrink-0">
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">Live_Telemetry</h2>
        <div className="text-xs font-bold text-[#1a4c8a] border-2 border-[#1a4c8a] px-3 py-1 uppercase tracking-widest flex items-center gap-2 transform rotate-1 paper-edge">
          <span className="w-2 h-2 rounded-full bg-[#1a4c8a] animate-blink block"></span>
          Status: {criticalAlerts > 5 ? 'Elevated_Risk' : 'Nominal'}
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Active_Shipments" value={activeShipments.toLocaleString()} icon={<TrendingUp />} trend="+12% VOL" color="#1a4c8a" />
        <StatCard title="Critical_Alerts" value={criticalAlerts.toString().padStart(2, '0')} icon={<AlertCircle />} trend={alertsTrend} color={criticalAlerts > 0 ? "#da312e" : "#1a1a1a"} alert={criticalAlerts > 0} />
        <StatCard title="Avg_Transit_Delay" value={`${avgDelay}H`} icon={<Clock />} trend={delayTrend} color="#da312e" />
        <StatCard title="SLA_Compliance" value={`${slaCompliance}%`} icon={<CheckCircle2 />} trend={slaTrend} color={Number(slaCompliance) < 95 ? "#da312e" : "#1a4c8a"} />
      </div>

      {/* Executive Financial & ESG Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border-2 border-[#1a1a1a] paper-edge p-5 relative overflow-hidden group shadow-sm bg-[#f4f1ea]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(26,76,138,0.05), rgba(26,76,138,0.05) 2px, transparent 2px, transparent 8px)' }}>
          <div className="text-[10px] uppercase tracking-widest text-[#1a4c8a] mb-2 font-bold flex items-center gap-2 relative z-10">
            <DollarSign className="w-4 h-4" /> Penalties_Avoided
          </div>
          <div className="font-mono text-4xl font-bold tracking-tight text-[#1a1a1a] mb-1 relative z-10">
            ${(financialData.totalPenaltyAvoided / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-[#666] uppercase tracking-widest relative z-10 font-bold">SLA breach avoidance value</div>
          <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-[#1a4c8a] opacity-10 group-hover:scale-110 transition-transform" />
        </div>

        <div className="border-2 border-[#1a1a1a] paper-edge p-5 relative overflow-hidden group shadow-sm bg-[#f4f1ea]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(218,49,46,0.05), rgba(218,49,46,0.05) 2px, transparent 2px, transparent 8px)' }}>
          <div className="text-[10px] uppercase tracking-widest text-[#da312e] mb-2 font-bold flex items-center gap-2 relative z-10">
            <Activity className="w-4 h-4" /> Reroute_Spend
          </div>
          <div className="font-mono text-4xl font-bold tracking-tight text-[#1a1a1a] mb-1 relative z-10">
            ${(financialData.totalRerouteCost / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-[#666] uppercase tracking-widest relative z-10 font-bold">Additional carrier Opex</div>
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-[#da312e] opacity-10 group-hover:scale-110 transition-transform" />
        </div>

        <div className="border-2 border-[#1a1a1a] paper-edge p-5 relative overflow-hidden group shadow-sm bg-[#f4f1ea]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(44,44,44,0.05), rgba(44,44,44,0.05) 2px, transparent 2px, transparent 8px)' }}>
          <div className="text-[10px] uppercase tracking-widest text-[#666] mb-2 font-bold flex items-center gap-2 relative z-10">
            <Leaf className="w-4 h-4 text-[#2c2c2c]" /> Network_Carbon_Delta
          </div>
          <div className="font-mono text-4xl font-bold tracking-tight text-[#1a1a1a] mb-1 relative z-10">
            +{carbonTons}<span className="text-xl text-[#2c2c2c] ml-1">t/CO2</span>
          </div>
          <div className="text-[10px] text-[#666] uppercase tracking-widest relative z-10 font-bold">Incremental emissions from diversions</div>
          <Leaf className="absolute -right-4 -bottom-4 w-24 h-24 text-[#2c2c2c] opacity-10 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* ROI Chart Section */}
      <div className="border-2 border-[#1a1a1a] paper-edge bg-[#f9f8f6] p-6 relative">
        <div className="flex items-center justify-between mb-6 border-b-2 border-[#d5d1c8] pb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#1a4c8a]" /> AI_Net_Value_Creation (ROI)
          </h3>
          <div className="text-[#1a4c8a] font-mono text-2xl font-bold underline decoration-2 decoration-[#1a4c8a]">
            +${financialData.cumulativeSavings.toLocaleString()} NET
          </div>
        </div>
        
        <div className="h-48 w-full font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={financialData.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a4c8a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#1a4c8a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#da312e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#da312e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5d1c8" vertical={false} />
              <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
              <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#f4f1ea', borderColor: '#1a1a1a', borderWidth: '2px', fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
                itemStyle={{ color: '#1a1a1a', fontWeight: 'bold' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#1a1a1a', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="penaltyAvoided" name="SLA Penalty Avoided" stroke="#1a4c8a" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
              <Area type="monotone" dataKey="rerouteCost" name="Reroute Spend" stroke="#da312e" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border-2 border-[#1a1a1a] paper-edge bg-[#f4f1ea] p-6 relative shadow-[4px_4px_0_rgba(26,26,26,0.1)]">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#1a4c8a]"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#1a4c8a]"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#1a4c8a]"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#1a4c8a]"></div>
          
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] mb-6 flex items-center gap-2 border-b-2 border-[#d5d1c8] pb-2 inline-flex">
            <Activity className="w-5 h-5 text-[#1a4c8a]" /> Network_Events_Log
          </h3>
          <div className="space-y-1 font-mono text-xs font-bold">
            {audits.slice().reverse().slice(0, 5).map(audit => {
              const time = new Date(audit.timestamp).toLocaleTimeString('en-US', { hour12: false });
              return (
                <EventRow 
                  key={audit.audit_id} 
                  time={time} 
                  type="AGENT_ACT" 
                  desc={`Dispatched ${audit.asset_id || 'Asset'} (${audit.plan_selected}) for ${audit.disruption_type} disruption. Cost: $${audit.cost_delta_usd}.`} 
                  color="#1a4c8a" 
                />
              );
            })}
            {audits.length < 5 && (
              <>
                <EventRow time="10:42:05" type="WX_WARN" desc="Severe squall warning near Port of Shanghai. Expect 12-24h delays for outbound vessels." color="#da312e" />
                <EventRow time="09:15:22" type="CAP_CON" desc="Memphis Air Hub reporting 95% capacity utilization. Routing overflow to Louisville." color="#da312e" />
                <EventRow time="08:00:01" type="CST_CLR" desc="Customs clearance completed for 45 containers at USLGB. En route to Inland Empire DC." color="#2c2c2c" />
                <EventRow time="07:45:10" type="SYS_UPD" desc="Global WMS inventory sync completed successfully. 1.2M SKUs updated across 42 nodes." color="#1a4c8a" />
                <EventRow time="06:30:00" type="ROU_OPT" desc="Agent SupplyGuard optimized 142 LTL ground routes for fuel efficiency." color="#1a4c8a" />
              </>
            )}
          </div>
        </div>

        <div className="border-2 border-[#1a1a1a] paper-edge bg-[#f9f8f6] p-6 relative shadow-[4px_4px_0_rgba(26,26,26,0.1)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a] mb-6 border-b-2 border-[#d5d1c8] pb-2 inline-flex">Subsystem_Status</h3>
          <div className="space-y-4 font-mono font-bold">
            <StatusRow label="ERP_Sync_SAP" status="ONLINE" color="#1a4c8a" />
            <StatusRow label="WMS_Integrations" status={criticalWmsNodes > 0 ? "STRESSED" : "ONLINE"} color={criticalWmsNodes > 0 ? "#da312e" : "#1a4c8a"} />
            <StatusRow label="Carrier_API" status={isFleetCritical ? "DEGRADED" : "ONLINE"} color={isFleetCritical ? "#da312e" : "#1a4c8a"} />
            <StatusRow label="Weather_NOAA" status="ONLINE" color="#2c2c2c" />
            <StatusRow label="Agent_SupplyGuard" status="ACTIVE" color="#1a4c8a" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, alert }: any) {
  return (
    <div className={`border-2 paper-edge p-5 relative group ${alert ? 'border-[#da312e] bg-[#da312e]/5' : 'border-[#1a1a1a] bg-[#f9f8f6] hover:bg-white'} transition-colors shadow-sm`}>
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: color }}></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: color }}></div>
      <div className="flex justify-between items-start mb-6">
        <div className="text-[10px] uppercase tracking-widest text-[#666] font-mono font-bold inline-block border-b-2 border-transparent group-hover:border-[#d5d1c8] transition-colors">{title}</div>
        <div style={{ color }}>{React.cloneElement(icon, { className: 'w-6 h-6' })}</div>
      </div>
      <div className={`font-mono text-4xl font-bold tracking-tight mb-2 ${alert ? 'text-[#da312e]' : 'text-[#1a1a1a]'}`}>{value}</div>
      <div style={{ color }} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
        {alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></span>}
        {trend}
      </div>
    </div>
  );
}

function EventRow({ time, type, desc, color }: any) {
  return (
    <div className="flex items-start gap-4 py-2 hover:bg-black/5 transition-colors px-2 border-l-4 my-1" style={{ borderLeftColor: color }}>
      <div className="text-[#666] w-20 shrink-0 font-mono text-[10px]">&gt; {time}</div>
      <div style={{ color }} className="shrink-0 font-bold uppercase tracking-widest text-[10px]">[{type}]</div>
      <div className="text-[#1a1a1a] text-xs leading-tight font-sans font-medium">{desc}</div>
    </div>
  );
}

function StatusRow({ label, status, color }: any) {
  const getBars = () => {
    if (status === "ONLINE" || status === "ACTIVE") return "[██████████]";
    if (status === "STRESSED") return "[██████░░░░]";
    if (status === "DEGRADED") return "[███░░░░░░░]";
    return "[░░░░░░░░░░]";
  };

  return (
    <div className="flex items-center justify-between py-3 border-b-2 border-[#d5d1c8] last:border-0 hover:bg-black/5 transition-colors px-2 -mx-2">
      <div className="text-xs text-[#1a1a1a] font-bold uppercase tracking-widest flex items-center gap-2 truncate">
        <div className="w-2 h-4 shrink-0" style={{ backgroundColor: color }}></div>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-2">
        <span style={{ color }} className="font-mono text-[10px] tracking-tighter opacity-80 hidden xl:inline-block">{getBars()}</span>
        <span style={{ color }} className="text-[10px] font-bold uppercase tracking-widest w-12 xl:w-16 text-right shrink-0">
          {status}
        </span>
      </div>
    </div>
  );
}
