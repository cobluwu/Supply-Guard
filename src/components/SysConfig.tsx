import React, { useState } from 'react';
import { Settings, ShieldAlert, Sliders, RotateCcw, AlertTriangle, ToggleLeft, ToggleRight, Save, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';

export default function SysConfig() {
  const { config, setConfig, resetStore } = useStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = () => {
    setConfig(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const executeReset = () => {
    resetStore();
    window.location.reload();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-4">
        <h2 className="font-display text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">Sys_Config</h2>
        <div className="text-xs text-[#da312e] border-2 border-[#da312e] font-bold px-3 py-1 uppercase tracking-widest flex items-center gap-2 transform rotate-1 paper-edge bg-white">
          <ShieldAlert className="w-3 h-3" />
          Admin_Access
        </div>
      </div>

      {/* Agent Guardrails */}
      <div className="border-2 border-[#1a1a1a] bg-[#f4f1ea] paper-edge shadow-sm">
        <div className="p-4 border-b-2 border-[#1a1a1a] flex items-center gap-3 bg-[#f9f8f6]">
          <Sliders className="w-5 h-5 text-[#1a4c8a]" />
          <h3 className="text-[#1a1a1a] font-bold uppercase tracking-widest">Agent Guardrails</h3>
        </div>
        <div className="p-6 space-y-8">
          
          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-[#d5d1c8] pb-4">
            <div>
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-1">Autonomous Execution</div>
              <div className="text-[#666] text-xs font-mono font-bold tracking-widest">Allow AI to auto-execute plans within thresholds</div>
            </div>
            <button 
              onClick={() => setConfig({...config, autoMode: !config.autoMode})}
              className={`flex items-center gap-2 px-4 py-2 border-2 uppercase tracking-widest text-sm font-bold transition-colors paper-edge ${config.autoMode ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5 transform rotate-1' : 'border-[#da312e] text-[#da312e] bg-[#da312e]/5 transform -rotate-1'}`}
            >
              {config.autoMode ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {config.autoMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Max Cost Slider */}
          <div className="border-b-2 border-dashed border-[#d5d1c8] pb-4">
            <div className="flex justify-between mb-2">
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest text-sm">Max Auto-Execute Cost (USD)</div>
              <div className="text-[#1a4c8a] font-mono font-bold underline decoration-2 decoration-[#1a4c8a] underline-offset-4">${config.maxCost.toLocaleString()}</div>
            </div>
            <input 
              type="range" 
              min="500" 
              max="20000" 
              step="500"
              value={localConfig.maxCost}
              onChange={(e) => setLocalConfig({...localConfig, maxCost: parseInt(e.target.value)})}
              className="w-full h-2 bg-[#d5d1c8] rounded-lg appearance-none cursor-pointer accent-[#1a4c8a]"
            />
            <div className="flex justify-between text-[#666] text-[10px] font-bold font-mono tracking-widest mt-2">
              <span>$500</span>
              <span>$20,000</span>
            </div>
          </div>

          {/* Max Delay Slider */}
          <div className="border-b-2 border-dashed border-[#d5d1c8] pb-4">
            <div className="flex justify-between mb-2">
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest text-sm">Max Auto-Execute Delay (Hours)</div>
              <div className="text-[#1a4c8a] font-mono font-bold underline decoration-2 decoration-[#1a4c8a] underline-offset-4">{localConfig.maxDelay}h</div>
            </div>
            <input 
              type="range" 
              min="6" 
              max="72" 
              step="6"
              value={localConfig.maxDelay}
              onChange={(e) => setLocalConfig({...localConfig, maxDelay: parseInt(e.target.value)})}
              className="w-full h-2 bg-[#d5d1c8] rounded-lg appearance-none cursor-pointer accent-[#1a4c8a]"
            />
            <div className="flex justify-between text-[#666] text-[10px] font-bold font-mono tracking-widest mt-2">
              <span>6h</span>
              <span>72h</span>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-3 border-2 uppercase tracking-widest text-sm font-bold transition-all paper-edge ${saved ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/10 transform rotate-1' : 'border-[#1a4c8a] text-white bg-[#1a4c8a] hover:bg-[#113a6d] transform -rotate-1'}`}
            >
              {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? 'Config_Saved' : 'Save_Config'}
            </button>
          </div>

        </div>
      </div>

      {/* Geopolitical Guardrails */}
      <div className="border-2 border-[#1a1a1a] paper-edge bg-[#f4f1ea] shadow-sm transform rotate-[0.5deg]">
        <div className="p-4 border-b-2 border-[#1a1a1a] flex items-center gap-3 bg-[#f9f8f6]">
          <Settings className="w-5 h-5 text-[#1a4c8a]" />
          <h3 className="text-[#1a1a1a] font-bold uppercase tracking-widest">Strategic routing Constraints</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-dashed border-[#d5d1c8] pb-4">
            <div>
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-1">Avoid Red Sea Context</div>
              <div className="text-[#666] text-xs font-mono font-bold tracking-widest">Force AI to route strictly around South Africa.</div>
            </div>
            <button 
              onClick={() => {
                const updated = {...localConfig, avoidRedSea: !localConfig.avoidRedSea};
                setLocalConfig(updated);
                setConfig(updated); // Sync global right away for faster UX
              }}
              className={`flex items-center gap-2 px-4 py-2 border-2 uppercase tracking-widest text-sm font-bold transition-colors paper-edge ${localConfig.avoidRedSea ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5 transform rotate-1' : 'border-[#d5d1c8] text-[#666] hover:border-[#a0a0a0] bg-white transform -rotate-1'}`}
            >
              {localConfig.avoidRedSea ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {localConfig.avoidRedSea ? 'Active' : 'Bypass'}
            </button>
          </div>

          <div className="flex items-center justify-between border-b-2 border-dashed border-[#d5d1c8] pb-4">
            <div>
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-1">Avoid Panama Canal</div>
              <div className="text-[#666] text-xs font-mono font-bold tracking-widest">Enforce overland/alternative ocean paths globally.</div>
            </div>
            <button 
              onClick={() => {
                const updated = {...localConfig, avoidPanamaCanal: !localConfig.avoidPanamaCanal};
                setLocalConfig(updated);
                setConfig(updated);
              }}
              className={`flex items-center gap-2 px-4 py-2 border-2 uppercase tracking-widest text-sm font-bold transition-colors paper-edge ${localConfig.avoidPanamaCanal ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5 transform rotate-1' : 'border-[#d5d1c8] text-[#666] hover:border-[#a0a0a0] bg-white transform -rotate-1'}`}
            >
              {localConfig.avoidPanamaCanal ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {localConfig.avoidPanamaCanal ? 'Active' : 'Bypass'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-[#1a1a1a] font-bold uppercase tracking-widest mb-1">Strict Carbon Limits</div>
              <div className="text-[#666] text-xs font-mono font-bold tracking-widest">Force preference of Rail/Ocean over Air regardless of SLA.</div>
            </div>
            <button 
               onClick={() => {
                const updated = {...localConfig, strictCarbon: !localConfig.strictCarbon};
                setLocalConfig(updated);
                setConfig(updated);
              }}
              className={`flex items-center gap-2 px-4 py-2 border-2 uppercase tracking-widest text-sm font-bold transition-colors paper-edge ${localConfig.strictCarbon ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5 transform rotate-1' : 'border-[#d5d1c8] text-[#666] hover:border-[#a0a0a0] bg-white transform -rotate-1'}`}
            >
              {localConfig.strictCarbon ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {localConfig.strictCarbon ? 'Active' : 'Bypass'}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-2 border-[#da312e] bg-[#f9f8f6] paper-edge shadow-sm transform -rotate-1 mt-8">
        <div className="p-4 border-b-2 border-[#da312e] flex items-center gap-3 bg-[#da312e]/5">
          <AlertTriangle className="w-5 h-5 text-[#da312e]" />
          <h3 className="text-[#da312e] font-bold uppercase tracking-widest">Danger Zone</h3>
        </div>
        <div className="p-6">
          <p className="text-[#1a1a1a] font-sans font-medium text-sm mb-6 max-w-2xl bg-white border-2 border-[#d5d1c8] p-4 paper-edge">
            <span className="font-bold text-[#da312e]">WARNING:</span> Executing a factory reset will purge all simulated data including Fleet states, WMS nodes, Audit logs, and custom configurations. The system will revert to its initial hardcoded state.
          </p>
          
          {!confirmReset ? (
            <button 
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 px-6 py-3 border-2 border-[#da312e] text-[#da312e] uppercase tracking-widest text-sm font-bold hover:bg-[#da312e] hover:text-white transition-colors bg-white paper-edge transform 1"
            >
              <RotateCcw className="w-4 h-4" />
              Factory_Reset
            </button>
          ) : (
            <div className="flex items-center gap-4 p-4 border-2 border-[#da312e] bg-white paper-edge">
              <span className="text-[#da312e] font-bold uppercase tracking-widest text-sm">Are you sure?</span>
              <button 
                onClick={executeReset}
                className="px-6 py-2 bg-[#da312e] text-white font-bold uppercase tracking-widest text-xs hover:bg-red-700 transition-colors border-2 border-[#da312e] paper-edge transform 1"
              >
                Yes_Purge_Data
              </button>
              <button 
                onClick={() => setConfirmReset(false)}
                className="px-6 py-2 border-2 border-[#1a1a1a] text-[#1a1a1a] font-bold uppercase tracking-widest text-xs hover:bg-black/5 transition-colors paper-edge transform -rotate-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
