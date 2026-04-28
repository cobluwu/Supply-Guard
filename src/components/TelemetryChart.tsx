import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion, MotionValue } from 'motion/react';

const BASE_READINGS = [
  3500, 3100, 2800, 2900, 3400, 4100, 4800, 5200, 
  5500, 5800, 6100, 5900, 5600, 5300, 5100, 4800, 
  4900, 5200, 4700, 4200, 3800, 3400, 3100, 3300
];

export const TelemetryChartInteractive = ({ progress }: { progress: MotionValue<number> }) => {
  const [sensitivity, setSensitivity] = useState(65);
  const [visiblePoints, setVisiblePoints] = useState(24);
  const [isInteracted, setIsInteracted] = useState(false);

  useEffect(() => {
    const unsubscribe = progress.on("change", (v) => {      
      const newVisible = Math.max(4, Math.ceil(v * 24));
      setVisiblePoints(newVisible);
    });
    return () => unsubscribe();
  }, [progress, isInteracted]);

  const data = useMemo(() => {
    return BASE_READINGS.slice(0, visiblePoints).map((baseEvents, i) => {
      // Higher sensitivity = more anomalies caught. Lower sensitivity = fewer.
      const hour = (i * 2).toString().padStart(2, '0') + ':00';
      
      // deterministic randomness based on index
      const noise = Math.sin(i * 13.5) * 500;
      const severityFactor = Math.cos(i * 7);
      
      const rawEvents = Math.max(0, Math.floor(baseEvents + noise));
      
      // Calculate anomalies purely based on sensitivity slider
      let anomalies = 0;
      if (severityFactor > (100 - sensitivity) / 100 - 0.5) {
         anomalies = Math.floor(rawEvents * (sensitivity / 100) * 0.08); 
      }
      // Add a baseline
      anomalies += Math.floor(rawEvents * 0.005);

      return {
        time: hour,
        events: rawEvents,
        anomalies: anomalies,
      };
    });
  }, [visiblePoints, sensitivity]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 relative z-20">
        <div>
            <div className="text-[10px] text-[#1a1a1a] font-bold font-display uppercase tracking-widest border border-[#1a1a1a] px-2 py-1 bg-[#f4f1ea] inline-block shadow-[2px_2px_0_#1a1a1a]">Fig. 1: Dynamic Threat Model</div>
            <div className="mt-2 text-xs font-mono text-[#4a4a4a]">Adjust threat detection threshold</div>
        </div>
        
        <div className="flex gap-4 items-center bg-white p-3 border border-[#d5d1c8] flex-1 sm:flex-none">
           <div className="flex flex-col flex-1">
              <label className="text-[10px] font-mono text-[#1a1a1a] uppercase tracking-wider mb-2 flex justify-between">
                <span>Anomaly Sensitivity</span>
                <span className="text-[#da312e] font-bold">{sensitivity}%</span>
              </label>
              <input 
                type="range" 
                min="10" max="95" 
                value={sensitivity} 
                onChange={(e) => {
                  setSensitivity(parseInt(e.target.value));
                  setIsInteracted(true);
                }}
                className="w-full sm:w-48 h-1 bg-[#d5d1c8] rounded-none outline-none appearance-none cursor-pointer" 
                style={{ accentColor: '#da312e' }}
              />
           </div>
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d5d1c8" vertical={true} />
            <XAxis 
              dataKey="time" 
              stroke="#1a1a1a" 
              tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} 
              tickLine={true} 
              axisLine={true} 
            />
            <YAxis 
              yAxisId="left" 
              stroke="#1a1a1a" 
              tick={{fill: '#4a4a4a', fontSize: 10, fontFamily: 'monospace'}} 
              tickLine={true} 
              axisLine={true} 
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="#da312e" 
              tick={{fill: '#da312e', fontSize: 10, fontFamily: 'monospace'}} 
              tickLine={false} 
              axisLine={false} 
              domain={[0, 'dataMax + 100']}
              hide
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fdfcfa', border: '2px solid #1a1a1a', borderRadius: '0px', padding: '10px', boxShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}
              itemStyle={{ fontSize: 12, textTransform: 'uppercase', fontFamily: 'monospace', color: '#1a1a1a' }}
              labelStyle={{ fontSize: 10, color: '#4a4a4a', fontFamily: 'monospace', marginBottom: '4px' }}
            />
            <Legend 
              iconType="square" 
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#1a1a1a', paddingTop: '10px' }} 
            />
            <Line 
              yAxisId="left" 
              type="step" 
              dataKey="events" 
              stroke="#1a1a1a" 
              strokeWidth={1} 
              strokeOpacity={0.3}
              dot={false} 
              activeDot={false}
              name="Raw Events" 
              isAnimationActive={false}
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="anomalies" 
              stroke="#da312e" 
              strokeWidth={2} 
              dot={{ fill: '#da312e', stroke: '#da312e', strokeWidth: 1, r: 3 }} 
              activeDot={{ r: 6, fill: '#da312e', stroke: '#1a1a1a', strokeWidth: 2 }} 
              name="Critical Anomalies" 
              isAnimationActive={true}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
