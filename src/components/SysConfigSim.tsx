import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sliders, ToggleRight, CheckCircle2 } from 'lucide-react';

export const SysConfigSim = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-[#fdfcfa] text-[#1a1a1a] font-sans p-4 sm:p-6 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#1a1a1a] pb-3 mb-4">
        <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2 font-display">
          <Sliders className="w-4 h-4 text-[#1a1a1a]" />
          Agent Guardrails
        </h3>
        <div className="text-[10px] text-[#da312e] border border-[#da312e] px-2 py-0.5 uppercase tracking-widest bg-white">
          Live Sync
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-6 flex-1 font-mono">
        
        {/* Toggle */}
        <div className={`transition-all duration-300 ${activeStep >= 0 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold uppercase tracking-widest text-[#1a1a1a] text-xs mb-1">Autonomous Execution</div>
              <div className="text-[#4a4a4a] text-[10px] uppercase tracking-widest">Allow AI to auto-execute</div>
            </div>
            <motion.div 
              animate={{ 
                backgroundColor: activeStep >= 0 ? 'rgba(218, 49, 46, 0.1)' : 'transparent',
                borderColor: activeStep >= 0 ? '#da312e' : '#d5d1c8',
                color: activeStep >= 0 ? '#da312e' : '#4a4a4a'
              }}
              className="flex items-center gap-1 px-2 py-1 border-2 text-[10px] font-bold uppercase"
            >
              <ToggleRight className="w-3 h-3" />
              Enabled
            </motion.div>
          </div>
        </div>

        {/* Max Cost */}
        <div className={`transition-all duration-300 ${activeStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex justify-between mb-2">
            <div className="font-bold uppercase tracking-widest text-xs text-[#1a1a1a]">Max Auto-Execute Cost</div>
            <motion.div 
              className="font-mono text-xs text-[#1a1a1a]"
              animate={activeStep === 1 ? { color: ["#1a1a1a", "#da312e", "#1a1a1a"] } : {}}
              transition={{ duration: 0.5 }}
            >
              $5,000
            </motion.div>
          </div>
          <div className="w-full h-2 border border-[#1a1a1a] bg-white relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[#1a4c8a]" 
              initial={{ width: "10%" }}
              animate={{ width: activeStep >= 1 ? "25%" : "10%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Max Delay */}
        <div className={`transition-all duration-300 ${activeStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
          <div className="flex justify-between mb-2">
            <div className="font-bold uppercase tracking-widest text-xs text-[#1a1a1a]">Max Auto-Execute Delay</div>
            <motion.div 
              className="font-mono text-xs text-[#1a1a1a]"
              animate={activeStep === 2 ? { color: ["#1a1a1a", "#da312e", "#1a1a1a"] } : {}}
              transition={{ duration: 0.5 }}
            >
              24h
            </motion.div>
          </div>
          <div className="w-full h-2 border border-[#1a1a1a] bg-white relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 h-full bg-[#1a4c8a]" 
              initial={{ width: "10%" }}
              animate={{ width: activeStep >= 2 ? "33%" : "10%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

      </div>

      {/* Decorative dots pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 hover:opacity-10 transition-opacity z-[-1]" 
           style={{ backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
    </div>
  );
};
