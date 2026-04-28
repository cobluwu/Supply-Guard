import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Cpu, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useStore } from '../store';
import { AuditEntry, DisruptionJSON, PlanOption, GateDecision } from '../types';

const GLOBAL_ROUTES_CONTEXT = `
REFERENCE DATA - STANDARD GLOBAL SUPPLY CHAIN ROUTES:
Ocean Freight (Major):
- Transpacific: Shanghai/Shenzhen/Ningbo/Busan/Yokohama -> Los Angeles/Long Beach/Seattle/Oakland/Vancouver
- Asia-Europe: Shanghai/Shenzhen/Singapore/Port Klang/Colombo/Mumbai -> Rotterdam/Hamburg/Antwerp/Felixstowe/Valencia
- Transatlantic: Rotterdam/Antwerp/Hamburg/Le Havre -> New York/Houston/Charleston/Montreal
- Intra-Asia/ME: Shanghai/Shenzhen/Busan -> Singapore/Jebel Ali/Ho Chi Minh

Air Cargo (Major Hubs & Routes):
- Transpacific/Asia-Europe: HKG/PVG/ICN/TPE/NRT/PEK -> MEM/ANC/LAX/FRA/SDF/ORD/LEJ
- Transatlantic/ME: FRA/LHR/CDG/AMS/DXB/DOH -> ORD/JFK/MEM/ATL
- Emerging: HKG->SIN, MIA->BOG/VCP, LGG->HGH, NBO->AMS, ADD->LGG

Ground & Rail (Major Corridors):
- North America: LA->Chicago (Rail/I-15), Laredo->Monterrey, Chicago->NY, Dallas->Atlanta, Windsor->Detroit, Vancouver->Toronto
- Europe: Rotterdam->Ruhr, Antwerp->Paris, Hamburg->Prague, Milan->Munich, Madrid->Paris, Warsaw->Berlin
- Eurasia: Yiwu->Madrid, Chongqing->Duisburg, Chengdu->Lodz (Eurasian Rail)
- Intra-Asia: Shenzhen->HK, Shanghai->Beijing, Mumbai->Delhi, Hanoi->Pingxiang, Bangkok->KL

When formulating rerouting plans or estimating coordinates, use these established corridors. For example, if the Strait of Malacca is blocked for an Ocean route from China to Europe, consider rerouting via the Cape of Good Hope (Ocean), or switching to Eurasian Rail (Chongqing -> Duisburg), or Air Cargo (PVG -> FRA). Ensure your waypoints reflect these realistic geographic paths.`;

import { PipelineStage, ExecutionResult } from '../types';

export default function AgentPanel() {
  const { pipeline, setPipeline, auditLog, setAuditLog, setMapState, fleetState, setFleetState, config, wmsState, setWmsState } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [ingestMode, setIngestMode] = useState<'manual' | 'autonomous'>('manual');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [pipeline, auditLog, isProcessing]);

  const extractJSON = (text: string | undefined) => {
    if (!text) return "{}";
    const withoutThinking = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    const jsonBlock = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlock && jsonBlock[1]) {
      return jsonBlock[1].trim();
    }
    const match = withoutThinking.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? match[0] : withoutThinking;
  };

  const generateWithRetry = async (ai: any, config: any, maxRetries = 5) => {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await ai.models.generateContent(config);
      } catch (e: any) {
        attempt++;
        const errorStr = typeof e === 'string' ? e : (e?.message || JSON.stringify(e));
        const isRateLimit = errorStr.includes('429') || errorStr.toLowerCase().includes('quota') || errorStr.toLowerCase().includes('exhausted') || errorStr.includes('503');
        if (isRateLimit && attempt < maxRetries) {
          let waitTimeMs = attempt * 2000;
          const retryMatch = errorStr.match(/retry in (\d+(?:\.\d+)?)s/i);
          if (retryMatch && retryMatch[1]) {
            waitTimeMs = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 1000; // Add 1s buffer
          } else {
            waitTimeMs = 5000 * attempt; // Default fallback backoff
          }
          console.warn(`Rate limit hit. Retrying in ${waitTimeMs / 1000}s... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        } else {
          throw e;
        }
      }
    }
    throw new Error("Max retries exceeded");
  };

  const handleIngest = async (data: any, isRaw: boolean = false) => {
    setPipeline({ stage: 'ingesting', disruption: null, agentReasoning: '', plans: null, gate: null, execution: null, auditId: null });
    setIsProcessing(true);
    
    let prompt = '';
    if (isRaw) {
      prompt = `Raw Incoming Telemetry/EDI Payload:\n${data}`;
    } else {
      prompt = `User Input:
Origin: "${data.origin}"
Destination: "${data.destination}"
Disruption Location: "${data.disruptionLocation}"
Description: "${data.description}"`;
    }

    const systemInstruction = `You are the SupplyGuard Ingestion Agent. Your responsibility is to extract critical supply chain disruption data from unstructured reports, raw API payloads, or EDI messages, and output it into the exact JSON schema provided.
You must classify the severity on a scale of 1 (Low) to 5 (Critical).
You MUST identify the origin and destination of the shipment from the text.
You MUST output the approximate geographic coordinates [longitude, latitude] for the origin, destination, and the disruption location. Use your internal knowledge to estimate these coordinates accurately based on the provided names.

Few-Shot Examples :
User Input:
Origin: "Shenzhen"
Destination: "Los Angeles"
Disruption Location: "Port of Miami"
Description: "Shipment is delayed because of a massive category 4 hurricane approaching the Port of Miami where it was supposed to transit."
Model Output: {"incident_type": "Extreme Weather", "severity_level": 5, "impacted_node": "Port of Miami", "estimated_delay_hours": 48, "origin_coords": [114.05, 22.54], "dest_coords": [-118.24, 34.05], "disruption_coords": [-80.19, 25.76]}

${GLOBAL_ROUTES_CONTEXT}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await generateWithRetry(ai, {
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              incident_type: { type: "STRING" },
              severity_level: { type: "INTEGER" },
              impacted_node: { type: "STRING" },
              estimated_delay_hours: { type: "INTEGER" },
              origin_coords: { type: "ARRAY", items: { type: "NUMBER" }, description: "[longitude, latitude] of the shipment origin" },
              dest_coords: { type: "ARRAY", items: { type: "NUMBER" }, description: "[longitude, latitude] of the shipment destination" },
              disruption_coords: { type: "ARRAY", items: { type: "NUMBER" }, description: "[longitude, latitude] of the disruption location" }
            },
            required: ["incident_type", "severity_level", "impacted_node", "estimated_delay_hours", "origin_coords", "dest_coords", "disruption_coords"]
          },
          temperature: 0.2,
        }
      });
      
      const parsed = JSON.parse(response.text);
      
      // Map to the schema expected by the rest of the application
      const disruption = {
        type: parsed.incident_type,
        severity: parsed.severity_level >= 4 ? 'critical' : parsed.severity_level === 3 ? 'high' : 'medium',
        risk_score: parsed.severity_level / 5,
        affected_shipments: ["PO-8821", "PO-9910"],
        estimated_delay_hours: parsed.estimated_delay_hours,
        root_cause: parsed.incident_type,
        confidence: "high",
        time_to_sla_breach_hours: 12,
        description: parsed.impacted_node + " - " + (isRaw ? 'Raw Payload Auto-Parsed' : data.description),
        origin_coords: parsed.origin_coords,
        dest_coords: parsed.dest_coords,
        disruption_coords: parsed.disruption_coords
      };

      // Update Map State immediately with original route and disruption
      const mapStatePending = {
        disruption_coords: parsed.disruption_coords,
        origin_coords: parsed.origin_coords,
        dest_coords: parsed.dest_coords,
        options: []
      };
      setMapState(mapStatePending);
      
      setPipeline(p => ({ ...p, stage: 'detecting', disruption }));
      setIsProcessing(false);
      
      setTimeout(() => handlePlan(disruption), 1000);
    } catch (e: any) {
      console.error("AgentPanel Ingestion Error:", e);
      setIsProcessing(false);
      setPipeline(p => ({ ...p, stage: 'error', error: e.message || "Failed to ingest disruption data" }));
    }
  };

  const handlePlan = async (disruption: any) => {
    setPipeline(p => ({ ...p, stage: 'planning' }));
    setIsProcessing(true);
    setSelectedPlanIndex(0);
    
    const isCritical = disruption.severity === 'critical';
    
    let fleetContext = `\nCURRENT FLEET CAPACITY:\n- Ocean Freight: ${fleetState.ocean.active} active vessels (${fleetState.ocean.status})\n- Air Cargo: ${fleetState.air.active} active flights (${fleetState.air.status})\n- Ground Transport: ${fleetState.ground.active} active trucks (${fleetState.ground.status})\n`;
    
    // Inject Strategic Constraints
    let constraintsContext = `\nSTRATEGIC CONSTRAINTS (MANDATORY):
- Avoid Red Sea: ${config.avoidRedSea ? 'ACTIVE - Do not route any vessels through the Red Sea/Suez.' : 'INACTIVE'}
- Avoid Panama Canal: ${config.avoidPanamaCanal ? 'ACTIVE - Do not route via the Panama Canal.' : 'INACTIVE'}
- Strict Carbon Limits: ${config.strictCarbon ? 'ACTIVE - Heavily penalize Air Freight. Prefer Ocean/Rail even if SLA is breached.' : 'INACTIVE'}
`;

    let systemInstruction = "";
    if (isCritical) {
      systemInstruction = `You are the SupplyGuard Logistics Planner. You receive structured disruption data including the origin, destination, and disruption coordinates.
Your task is to formulate an optimal rerouting plan to bypass the disruption.
Rules:
1. You MUST use the find_nearest_facilities tool to discover actual physical Distribution Centers near the origin or destination.
2. You must use the get_wms_capacity tool to check warehouse availability before finalizing a destination. If the tool returns a capacity > 90%, you CANNOT use that node as a destination or waypoint. You must route to a different facility to prevent cascading bottlenecks.
3. You must use the get_fleet_status tool to ensure transport assets are available. If available_assets is returning 0 or critically low, you MUST force an alternative transport method (e.g., Ocean or Ground instead of Air), regardless of SLA delays.
4. You MUST use your internal geographic knowledge to find accurate coordinates for intermediate transit hubs or safe passages to avoid the disruption zone.
5. Generate three alternative routing options detailing the required asset, the new route, and the estimated cost.
6. For each option, you MUST provide an array of 'waypoints' ([longitude, latitude]) that the new route will take. The first waypoint MUST be the origin, the last MUST be the destination, and intermediate points MUST route around the disruption.
7. MULTI-MODAL LOGIC: If the disruption is located exactly at the Origin or Destination node (e.g., an airport closure or port strike), you CANNOT originate or terminate the main transport leg there. You MUST use the find_nearest_facilities tool to locate an alternative regional hub as a waypoint and assume ground transport connects the original node to this new hub. Let the waypoints array reflect this realistic physical detour.

${constraintsContext}

${GLOBAL_ROUTES_CONTEXT}

Before outputting JSON, you MUST output a <thinking> block detailing your step-by-step reasoning.
Then, you MUST output the final result in JSON matching this schema:
{
  "options": [
    {
      "carrier": "string",
      "route": "string",
      "waypoints": [[0.0, 0.0], [0.0, 0.0]],
      "cost_delta": 0,
      "delay_h": 0,
      "sla_compliant": true,
      "reliability": 0.9
    }
  ]
}`;
    } else {
      systemInstruction = `You are the SupplyGuard Logistics Planner. You receive structured disruption data including the origin, destination, and disruption coordinates.
Your task is to formulate an optimal rerouting plan to bypass the disruption.
Rules:
1. You MUST use the find_nearest_facilities tool to discover actual physical Distribution Centers near the origin or destination.
2. You must use the get_wms_capacity tool to check warehouse availability before finalizing a destination. If the tool returns a capacity > 90%, you CANNOT use that node as a destination or waypoint. You must route to a different facility to prevent cascading bottlenecks.
3. You must use the get_fleet_status tool to ensure transport assets are available. If available_assets is returning 0 or critically low, you MUST force an alternative transport method (e.g., Ocean or Ground instead of Air), regardless of SLA delays.
4. You MUST use your internal geographic knowledge to find accurate coordinates for intermediate transit hubs or safe passages to avoid the disruption zone.
5. Generate EXACTLY ONE optimal routing option detailing the required asset, the new route, and the estimated cost.
6. For each option, you MUST provide an array of 'waypoints' ([longitude, latitude]) that the new route will take. The first waypoint MUST be the origin, the last MUST be the destination, and intermediate points MUST route around the disruption.
7. MULTI-MODAL LOGIC: If the disruption is located exactly at the Origin or Destination node (e.g., an airport closure or port strike), you CANNOT originate or terminate the main transport leg there. You MUST use the find_nearest_facilities tool to locate an alternative regional hub as a waypoint and assume ground transport connects the original node to this new hub. Let the waypoints array reflect this realistic physical detour.

${constraintsContext}

${GLOBAL_ROUTES_CONTEXT}

Before outputting JSON, you MUST output a <thinking> block detailing your step-by-step reasoning.
Then, you MUST output the final result in JSON matching this schema:
{
  "options": [
    {
      "carrier": "string",
      "route": "string",
      "waypoints": [[0.0, 0.0], [0.0, 0.0]],
      "cost_delta": 0,
      "delay_h": 0,
      "sla_compliant": true,
      "reliability": 0.9
    }
  ]
}`;
    }

    const tools: any = [
      {
        functionDeclarations: [
          {
            name: "find_nearest_facilities",
            description: "Find the nearest active WMS distribution centers by geographic coordinates.",
            parameters: {
              type: "OBJECT",
              properties: { 
                lat: { type: "NUMBER" }, 
                lng: { type: "NUMBER" },
                max_radius_miles: { type: "NUMBER" }
              },
              required: ["lat", "lng"]
            }
          },
          {
            name: "get_wms_capacity",
            description: "Check warehouse availability and capacity for a given node ID.",
            parameters: {
              type: "OBJECT",
              properties: { node_id: { type: "STRING" } },
              required: ["node_id"]
            }
          },
          {
            name: "get_fleet_status",
            description: "Check transport asset availability for a given region and transport type.",
            parameters: {
              type: "OBJECT",
              properties: { region: { type: "STRING" }, transport_type: { type: "STRING" } },
              required: ["region", "transport_type"]
            }
          }
        ]
      }
    ];

    const contents: any[] = [
      { role: 'user', parts: [{ text: `Structured Disruption Data:\n${JSON.stringify(disruption)}\n${fleetContext}\nPlease formulate a routing plan.` }] }
    ];

    // Helper for Haversine distance
    const getMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3958.8; // Radius of earth in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      let response = await generateWithRetry(ai, {
        model: 'gemini-3.1-flash-lite-preview',
        contents,
        config: {
          systemInstruction,
          tools,
          temperature: 0.2,
        }
      });
      
      let callCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && callCount < 5) {
        callCount++;
        contents.push(response.candidates?.[0]?.content);
        const functionResponses = response.functionCalls.map(call => {
          if (call.name === 'find_nearest_facilities') {
            const args = call.args as any;
            const wmsNodes = useStore.getState().wmsState;
            const radius = args.max_radius_miles || 1000;
            const nearest = wmsNodes
              .map(n => ({...n, distance: getMiles(args.lat, args.lng, n.lat, n.lng)}))
              .filter(n => n.distance <= radius)
              .sort((a, b) => a.distance - b.distance)
              .slice(0, 3)
              .map(n => ({ id: n.id, name: n.name, distance_miles: Math.round(n.distance), capacity_pct: n.capacity_pct }));
            return { functionResponse: { id: call.id, name: call.name, response: { nearest_facilities: nearest } } };
          } else if (call.name === 'get_wms_capacity') {
            const args = call.args as any;
            const wmsNodes = useStore.getState().wmsState;
            const node = wmsNodes.find(n => n.id === args.node_id || n.region === args.node_id || n.name.includes(args.node_id));
            if (node) {
              return { functionResponse: { id: call.id, name: call.name, response: { capacity: `${node.capacity_pct}%`, status: node.status, active_docks: node.active_docks } } };
            }
            return { functionResponse: { id: call.id, name: call.name, response: { capacity: "unknown", status: "Node not found. Recommend falling back to nearest hub." } } };
          } else if (call.name === 'get_fleet_status') {
             const args = call.args as any;
             const currentFleet = useStore.getState().fleetState;
             let count = 0; let status = "Unknown";
             if (args.transport_type && args.transport_type.toLowerCase().includes('air')) {
               count = currentFleet.air.active; status = currentFleet.air.status;
             } else if (args.transport_type && args.transport_type.toLowerCase().includes('ocean')) {
               count = currentFleet.ocean.active; status = currentFleet.ocean.status;
             } else {
               count = currentFleet.ground.active; status = currentFleet.ground.status;
             }
            return { functionResponse: { id: call.id, name: call.name, response: { available_assets: count > 0 ? Math.max(1, Math.floor(count * 0.05)) : 0, status: status } } };
          }
          return { functionResponse: { id: call.id, name: call.name, response: { error: "Unknown function" } } };
        });
        contents.push({ role: 'user', parts: functionResponses });
        
        response = await generateWithRetry(ai, {
          model: 'gemini-3.1-flash-lite-preview',
          contents,
          config: {
            systemInstruction,
            tools,
            temperature: 0.2
          }
        });
      }
      
      const rawText = response.text;
      const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/);
      const thinkingText = thinkingMatch ? thinkingMatch[1].trim() : "No reasoning provided by model.";
      
      const jsonStr = extractJSON(response.text);
      const parsed = JSON.parse(jsonStr);
      const plans = parsed.options || [];
      
      // Update Map State
      const mapStatePending = {
        disruption_coords: disruption.disruption_coords,
        origin_coords: disruption.origin_coords,
        dest_coords: disruption.dest_coords,
        options: plans
      };
      setMapState(mapStatePending);
      
      setPipeline(p => ({ ...p, stage: 'gating', plans, agentReasoning: isCritical ? thinkingText : '' }));
      setIsProcessing(false);
      
      if (isCritical) {
        setTimeout(() => handleGate(disruption, plans), 1000);
      } else {
        const autoGate: GateDecision = {
          decision: "auto_execute",
          failed_conditions: [],
          reason: "Non-critical scenario. Auto-executing generated plan.",
          urgency: "low"
        };
        setPipeline(p => ({ ...p, gate: autoGate }));
        setTimeout(() => handleExecute(disruption, plans[0], autoGate), 1000);
      }
    } catch (e: any) {
      console.error("AgentPanel Planning Error:", e);
      setIsProcessing(false);
      setPipeline(p => ({ ...p, stage: 'error', error: e.message || "Failed to generate plan" }));
    }
  };

  const handleGate = async (disruption: any, plans: any[]) => {
    setIsProcessing(true);
    
    const systemInstruction = `You are the SupplyGuard Governance Gatekeeper. You must review the primary routing plan proposed by the Logistics Planner.
Compare the proposed plan against the current administrative thresholds: Max Allowed Cost = $${config.maxCost} and Max Allowed Delay = ${config.maxDelay} hours.

If the plan exceeds these thresholds, or if the initial disruption severity is a Level 5 (or 'critical'), you must output a decision of "escalate" and provide a 2-sentence justification for the human operator.
If the plan is within thresholds and severity is below 5 (or not 'critical'), you must output a decision of "auto_execute" and summarize the action.

Return <thinking> block then JSON: {"decision": "auto_execute" | "escalate", "failed_conditions": [], "reason": "...", "urgency": "high" | "medium" | "low"}`;

    const prompt = `Evaluate and Gate this action.
PLAN (rank 1): ${JSON.stringify(plans[0])}
DISRUPTION: ${JSON.stringify(disruption)}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await generateWithRetry(ai, {
        model: 'gemini-3.1-flash-lite-preview',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1
        }
      });
      
      const jsonStr = extractJSON(response.text);
      const gate = JSON.parse(jsonStr);
      
      setPipeline(p => ({ ...p, gate }));
      setIsProcessing(false);
      
      if (gate.decision === 'auto_execute') {
        setTimeout(() => handleExecute(disruption, plans[0], gate), 1500);
      }
    } catch (e: any) {
      console.error("AgentPanel Gating Error:", e);
      setIsProcessing(false);
      setPipeline(p => ({ ...p, stage: 'error', error: e.message || "Failed to evaluate gate decision" }));
    }
  };

  const handleExecute = async (disruption: any, plan: any, gate: any) => {
    if (!plan) {
      plan = { carrier: "Unknown Carrier", route: "Unknown Route", delay_h: 0, cost_delta: 0 };
    }
    setPipeline(p => ({ ...p, stage: 'executing', execution: { status: 'running', steps_completed: [] } }));
    const steps = ["book_carrier","update_tms","write_erp","reserve_wms_dock","notify_customer","write_audit"];
    
    const completed: string[] = [];
    for (const step of steps) {
      await new Promise(r => setTimeout(r, 1500));
      completed.push(step);
      setPipeline(p => ({ ...p, execution: { status: 'running', steps_completed: [...completed] } }));
    }
    
    // Mutate Map State to show confirmed route
    useStore.setState(state => {
      if (state.mapState) {
        return { mapState: { ...state.mapState, options: [plan] } };
      }
      return state;
    });

    // Mutate Fleet State
    let generatedAssetId = "UNKNOWN";
    const f = JSON.parse(JSON.stringify(fleetState)); // Deep copy
    const carrierLower = (plan.carrier || "").toLowerCase();
    let type = "GROUND";
    let color = "#00ff41";
    let prefix = "TRK";
    
    if (carrierLower.includes("air") || carrierLower.includes("flight")) {
      type = "AIR"; color = "#ff5500"; prefix = "FLT";
      f.air.active -= 1; // DECREMENT indicating an asset has been consumed
      if (f.air.active < 0) f.air.active = 0;
    } else if (carrierLower.includes("ocean") || carrierLower.includes("sea") || carrierLower.includes("vessel") || carrierLower.includes("ship")) {
      type = "OCEAN"; color = "#00e5ff"; prefix = "VSL";
      f.ocean.active -= 1;
      if (f.ocean.active < 0) f.ocean.active = 0;
    } else {
      f.ground.active -= 1;
      if (f.ground.active < 0) f.ground.active = 0;
    }

    generatedAssetId = `${prefix}-${Math.floor(Math.random() * 9000) + 1000}`;

    const newRoute = {
      id: generatedAssetId,
      type: type,
      origin: disruption.description.split(' ')[0] || "Disruption Zone",
      dest: "Reroute Dest",
      eta: new Date(Date.now() + (plan.delay_h || 24) * 3600000).toISOString().split('.')[0] + "Z",
      status: "REROUTED",
      color: color
    };

    f.activeRoutes.unshift(newRoute);
    setFleetState(f);

    // Mutate WMS State
    const wmsNodes = JSON.parse(JSON.stringify(wmsState)); // Deep copy
    // Find the node that closely matches the new destination (or just grab the one with the lowest capacity to simulate load spreading)
    const targetNode = wmsNodes.sort((a: any, b: any) => a.capacity_pct - b.capacity_pct)[0];
    if (targetNode) {
      const incomingVolume = (disruption.affected_shipments?.length || 1) * 200;
      targetNode.inbound_shipments += incomingVolume;
      targetNode.capacity_pct = Math.min(100, targetNode.capacity_pct + Math.floor(Math.random() * 15) + 10); // CRITICAL: Spike capacity significantly to force constraints on next run
      
      if (targetNode.capacity_pct >= 90) {
        targetNode.status = 'critical';
      } else if (targetNode.capacity_pct >= 80) {
        targetNode.status = 'warning';
      }

      targetNode.last_updated = new Date().toISOString();
    }
    setWmsState(wmsNodes);

    setPipeline(p => ({ ...p, execution: { status: 'complete', steps_completed: completed }, stage: 'auditing' }));
    
    setTimeout(() => handleAudit(disruption, plan, gate, completed, generatedAssetId), 1000);
  };

  const handleAudit = (disruption: any, plan: any, gate: any, steps: string[], asset_id?: string) => {
    const entry: AuditEntry = {
      audit_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      disruption_type: disruption.type || 'unknown',
      disruption_summary: disruption.root_cause || disruption.description || 'Unknown',
      plan_selected: plan.carrier || 'Unknown',
      decision_type: gate.decision || 'unknown',
      cost_delta_usd: plan.cost_delta || 0,
      delay_hours: plan.delay_h || 0,
      sla_preserved: plan.sla_compliant || false,
      steps_completed: steps,
      asset_id: asset_id || 'UNKNOWN'
    };
    
    const newLogs = [entry, ...auditLog];
    setAuditLog(newLogs);
    
    setPipeline(p => ({ ...p, stage: 'complete', auditId: entry.audit_id }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto border-2 border-[#1a1a1a] paper-edge bg-[#f4f1ea] relative shadow-md">
      {/* Terminal Header */}
      <div className="p-3 border-b-2 border-[#1a1a1a] bg-[#f9f8f6] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-4 h-4 text-[#1a1a1a]" />
          <h3 className="font-mono font-bold uppercase tracking-widest text-[#1a1a1a] text-sm">Agent_Terminal // Core_Logic</h3>
        </div>
        <div className="text-[10px] px-2 py-1 bg-[#da312e]/10 text-[#da312e] border-2 border-[#da312e] uppercase tracking-widest flex items-center gap-2 transform rotate-1 font-bold">
          <AlertTriangle className="w-3 h-3" />
          Auto_Exec_Enabled
        </div>
      </div>

      {/* Progress Bar */}
      {pipeline.stage !== 'idle' && (
        <div className="p-4 bg-transparent border-b-2 border-[#d5d1c8]">
          <StageProgressBar stage={pipeline.stage} />
        </div>
      )}

      {/* Terminal Output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-6 font-mono text-xs">
        {pipeline.stage === 'idle' && auditLog.length > 0 && (
          <div className="space-y-2">
            <div className="text-[#666] font-bold uppercase tracking-widest text-[10px] mb-4">Previous Session Audit Logs Restored</div>
            {auditLog.map(entry => <AuditEntryRow key={entry.audit_id} entry={entry} />)}
          </div>
        )}

        {pipeline.stage === 'idle' && (
          <div className="space-y-4">
            <div className="flex bg-[#f9f8f6] border-2 border-[#1a1a1a] w-fit font-bold paper-edge">
              <button 
                onClick={() => setIngestMode('manual')}
                className={`text-[10px] uppercase tracking-widest font-bold px-4 py-2 transition-colors border-r-2 border-[#1a1a1a] ${ingestMode === 'manual' ? 'bg-[#1a4c8a] text-white' : 'text-[#666] hover:bg-black/5'}`}
              >
                Manual Interface
              </button>
              <button 
                onClick={() => setIngestMode('autonomous')}
                className={`text-[10px] uppercase tracking-widest font-bold px-4 py-2 transition-colors ${ingestMode === 'autonomous' ? 'bg-[#2c2c2c] text-white' : 'text-[#666] hover:bg-black/5'}`}
              >
                Autonomous API Listener
              </button>
            </div>

            {ingestMode === 'manual' ? (
              <IntakeForm onSubmit={(data) => handleIngest(data, false)} />
            ) : (
              <AutonomousListener onSubmit={(data) => handleIngest(data, true)} />
            )}
          </div>
        )}

        {pipeline.disruption && (
          <DisruptionCard disruption={pipeline.disruption} />
        )}

        {pipeline.agentReasoning && (
          <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 space-y-2 paper-edge font-bold shadow-sm">
            <h4 className="text-[#1a1a1a] uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 border-b-2 border-[#d5d1c8] pb-2 inline-flex">
              <Cpu className="w-3 h-3" /> Agent Reasoning Core
            </h4>
            <pre className="text-[#1a4c8a] font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
              {pipeline.agentReasoning}
            </pre>
          </div>
        )}

        {pipeline.plans && (
          <div className="flex gap-4">
            {pipeline.plans.map((plan, i) => (
              <PlanOptionCard 
                key={i} 
                plan={plan} 
                rank={i + 1}
                selectable={pipeline.gate?.decision === 'escalate' && pipeline.stage === 'gating'}
                selected={pipeline.gate?.decision === 'escalate' && pipeline.stage === 'gating' && selectedPlanIndex === i}
                onClick={() => setSelectedPlanIndex(i)}
              />
            ))}
          </div>
        )}

        {pipeline.gate && (
          <GateBanner gate={pipeline.gate} />
        )}

        {pipeline.gate?.decision === 'escalate' && pipeline.stage === 'gating' && (
          <ApprovalCard 
            onApprove={() => handleExecute(pipeline.disruption, pipeline.plans![selectedPlanIndex], pipeline.gate)}
            onReject={() => setPipeline(p => ({ ...p, stage: 'idle' }))}
            onRequestAlt={() => handlePlan(pipeline.disruption)}
          />
        )}

        {pipeline.execution && (
          <ExecutionChecklist execution={pipeline.execution} />
        )}

        {pipeline.stage === 'complete' && (
          <div className="border-2 border-[#2c2c2c] bg-[#2c2c2c]/5 p-4 text-[#2c2c2c] flex justify-between items-center font-bold paper-edge shadow-sm">
            <div>PIPELINE COMPLETE. AUDIT LOG WRITTEN.</div>
            <button onClick={() => setPipeline({ stage: 'idle', disruption: null, agentReasoning: '', plans: null, gate: null, execution: null, auditId: null, error: null })} className="bg-[#2c2c2c] text-white px-4 py-2 uppercase font-bold text-xs hover:bg-[#1a1a1a]">New Scenario</button>
          </div>
        )}

        {pipeline.stage === 'error' && (
          <div className="border-2 border-[#da312e] bg-[#da312e]/5 p-4 text-[#da312e] flex flex-col gap-4 font-bold paper-edge shadow-sm">
            <div className="font-bold uppercase tracking-widest text-xs flex items-center justify-between">
              <div><AlertTriangle className="w-4 h-4 inline mr-2" /> Pipeline Error</div>
            </div>
            <div className="text-[#1a1a1a]">{pipeline.error}</div>
            <button onClick={() => setPipeline({ stage: 'idle', disruption: null, agentReasoning: '', plans: null, gate: null, execution: null, auditId: null, error: null })} className="bg-transparent border-2 border-[#da312e] text-[#da312e] px-4 py-2 uppercase font-bold text-xs hover:bg-[#da312e]/10 w-fit">Dismiss</button>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-3 text-[#1a4c8a] font-bold p-4 border-l-4 border-[#1a4c8a] bg-[#1a4c8a]/5">
            <span className="animate-blink">_</span> Processing telemetry data...
          </div>
        )}
      </div>
    </div>
  );
}

// 1. IntakeForm
function IntakeForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [form, setForm] = useState({ type: 'weather', severity: 'high', origin: '', destination: '', disruptionLocation: '', description: '' });

  const DEMO_SCENARIOS = [
    // --- 60% Auto-Executable (Medium severity, easily re-routable, low delay/cost) ---
    { type: 'weather', severity: 'medium', origin: 'Chicago, IL', destination: 'New York, NY', disruptionLocation: 'Cleveland, OH', description: 'Minor snow squall slowing down I-80. 4 hour expected delay.' },
    { type: 'port', severity: 'medium', origin: 'Shanghai, China', destination: 'Los Angeles, USA', disruptionLocation: 'Port of Long Beach', description: 'Temporary congestion at gate 4. 8 hour loading delay expected.' },
    { type: 'carrier', severity: 'medium', origin: 'Dallas, TX', destination: 'Atlanta, GA', disruptionLocation: 'Shreveport, LA', description: 'Truck breakdown on I-20. Replacement cab dispatched, 6 hour delay.' },
    { type: 'customs', severity: 'medium', origin: 'Monterrey, Mexico', destination: 'Detroit, MI', disruptionLocation: 'Laredo Border', description: 'Routine intensive customs checks. 5 hour border crossing delays.' },
    { type: 'weather', severity: 'medium', origin: 'Miami, FL', destination: 'Atlanta, GA', disruptionLocation: 'Orlando, FL', description: 'Heavy thunderstorms reducing I-95 speeds. 3 hour transit delay.' },
    { type: 'port', severity: 'medium', origin: 'Busan, South Korea', destination: 'Seattle, WA', disruptionLocation: 'Port of Seattle', description: 'Crane maintenance at terminal. Container unloading capacity reduced by 10%.' },
    { type: 'carrier', severity: 'medium', origin: 'Mumbai, India', destination: 'Dubai, UAE', disruptionLocation: 'Arabian Sea', description: 'Minor engine issue on feeder vessel. Speed reduced, 12 hour delay.' },
    { type: 'customs', severity: 'medium', origin: 'Toronto, Canada', destination: 'Buffalo, NY', disruptionLocation: 'Peace Bridge', description: 'Shift changes and staffing shortages. 6-hour commercial wait times.' },
    { type: 'carrier', severity: 'medium', origin: 'Sao Paulo, Brazil', destination: 'Miami, FL', disruptionLocation: 'VCP Airport', description: 'Minor fuel shortage at origin airport. Cargo flights delayed by 8 hours.' },
    { type: 'weather', severity: 'medium', origin: 'Denver, CO', destination: 'Dallas, TX', disruptionLocation: 'Amarillo, TX', description: 'High winds along US-287. Trucks advised to reduce speed, 4 hr delay.' },
    { type: 'port', severity: 'medium', origin: 'Rotterdam, Netherlands', destination: 'London, UK', disruptionLocation: 'Port of Dover', description: 'Ferry schedule readjustments. Next crossing delayed by 6 hours.' },
    { type: 'weather', severity: 'medium', origin: 'Sydney, Australia', destination: 'Melbourne, Australia', disruptionLocation: 'Hume Highway', description: 'Localized flooding. Detour required adding 5 hours to transit.' },
    
    // --- 40% Human Intervention / Escalation (Critical severity, major delays, un-routable within 24hr/$5k) ---
    { type: 'weather', severity: 'critical', origin: 'Long Beach, CA', destination: 'Chicago, IL', disruptionLocation: 'I-80 Wyoming', description: 'Massive snowstorm blocking I-80. All ground transport halted for 48 hours.' },
    { type: 'geopolitical', severity: 'critical', origin: 'Singapore', destination: 'Rotterdam', disruptionLocation: 'Suez Canal', description: 'Blockade at the Suez Canal delaying all Asia-Europe maritime traffic indefinitely.' },
    { type: 'carrier', severity: 'critical', origin: 'Dallas, TX', destination: 'New York, NY', disruptionLocation: 'DFW Hub', description: 'Primary carrier bankrupt overnight. 50 shipments stranded at DFW hub.' },
    { type: 'port', severity: 'critical', origin: 'Antwerp, Belgium', destination: 'New York, NY', disruptionLocation: 'Port of NY/NJ', description: 'Cyberattack on terminal operating system. Complete halt to gate operations.' },
    { type: 'weather', severity: 'critical', origin: 'Houston, TX', destination: 'Denver, CO', disruptionLocation: 'Texas Panhandle', description: 'Unprecedented ice storm. Power outages affecting regional distribution centers.' },
    { type: 'geopolitical', severity: 'critical', origin: 'Odesa, Ukraine', destination: 'Istanbul, Turkey', disruptionLocation: 'Black Sea', description: 'Closure of safe shipping corridor due to regional conflict escalation.' },
    { type: 'carrier', severity: 'critical', origin: 'Frankfurt, Germany', destination: 'Chicago, IL', disruptionLocation: 'FRA Airport', description: 'Air cargo ground handlers strike at FRA. No freight loading or unloading.' },
    { type: 'geopolitical', severity: 'critical', origin: 'Taipei, Taiwan', destination: 'San Francisco, CA', disruptionLocation: 'Taiwan Strait', description: 'Military exercises restricting commercial airspace and maritime routes around the island.' }
  ];

  const loadRandomScenario = () => {
    const randomIndex = Math.floor(Math.random() * DEMO_SCENARIOS.length);
    setForm(DEMO_SCENARIOS[randomIndex]);
  };

  return (
    <div className="border-2 border-[#1a1a1a] p-4 bg-[#f9f8f6] flex flex-col gap-4 paper-edge shadow-sm">
      <div className="flex justify-between items-center border-b-2 border-[#d5d1c8] pb-2">
        <div className="text-[#1a4c8a] font-bold uppercase tracking-widest text-xs">New Disruption Report</div>
        <div className="flex gap-2">
          <button onClick={loadRandomScenario} className="text-[10px] px-4 py-1 border-2 border-[#1a4c8a] text-[#1a4c8a] hover:bg-[#1a4c8a]/10 transition-colors font-bold">Launch Demo Scenario</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <select className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase font-mono shadow-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="weather">Weather</option>
          <option value="port">Port</option>
          <option value="carrier">Carrier</option>
          <option value="customs">Customs</option>
          <option value="geopolitical">Geopolitical</option>
        </select>
        <select className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase font-mono shadow-sm" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input type="text" placeholder="ORIGIN (e.g. Shanghai)" className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase font-mono shadow-sm placeholder:text-[#a0a0a0]" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} />
        <input type="text" placeholder="DESTINATION (e.g. Rotterdam)" className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase font-mono shadow-sm placeholder:text-[#a0a0a0]" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} />
      </div>
      <input type="text" placeholder="DISRUPTION LOCATION (e.g. Strait of Malacca)" className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase font-mono shadow-sm placeholder:text-[#a0a0a0]" value={form.disruptionLocation} onChange={e => setForm({...form, disruptionLocation: e.target.value})} />
      <textarea placeholder="DESCRIPTION..." className="bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] p-2 text-xs uppercase h-20 resize-none font-mono shadow-sm placeholder:text-[#a0a0a0]" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
      <button onClick={() => onSubmit(form)} className="bg-[#1a4c8a] text-white font-bold uppercase text-xs py-2 hover:bg-[#1a1a1a] transition-colors paper-edge transform -rotate-1 mt-2">Submit Report</button>
    </div>
  );
}

// 1.5 AutonomousListener
function AutonomousListener({ onSubmit }: { onSubmit: (data: string) => void }) {
  const [payload, setPayload] = useState('');
  const [isListening, setIsListening] = useState(true);

  const DEMO_PAYLOADS = [
    `{
  "event_source": "CARRIER_API_WEBHOOK",
  "carrier_id": "MAERSK_LINE",
  "timestamp": "${new Date().toISOString()}",
  "shipment_status": "EXCEPTION",
  "origin_port": "NGB (Ningbo)",
  "destination_port": "LGB (Long Beach)",
  "vessel_imo": "9811000",
  "exception_details": {
    "code": "WX_TYPHOON",
    "description": "Vessel halting transit mid-Pacific due to unforecasted Super Typhoon approach. Expected stationary holding pattern.",
    "estimated_delay_hrs": 72
  }
}`,
    `EDI/X12/214
ISA*00*          *00*          *ZZ*123456789      *ZZ*987654321      *260421*1234*U*00401*000000001*0*P*>~
GS*QM*123456789*987654321*260421*1234*1*X*004010~
ST*214*0001~
B10*123456789*12345*SCAC~
LX*1~
AT7*X6*NS***260421*1234~
MS1*CHICAGO*IL*US~
MS2*SCAC*BNSF_RAIL_YARD~
NTE*GEN*TRAIN DERAILMENT AHEAD ON ROUTE. COMPLETE TRACK CLOSURE. DETOUR ROUTING PENDING BUT EXPECT 36+ HOURS DELAY TO IL~
SE*8*0001~
GE*1*1~
IEA*1*000000001~`,
    `FROM: no-reply@customs.gov.uk
SUBJECT: HIGH PRIORITY - PORT OF DOVER BORDER SYSTEM OUTAGE
BODY:
Please be advised that the digital clearance infrastructure at the Port of Dover has suffered a catastrophic failure. 
All inbound and outbound commercial freight processing is suspended.
Origin affected: London/South East UK.
Destination affected: Paris/Calais.
Est. downtime is 12-18 hours. Traffic is backed up on M20. Re-route strongly advised.`
  ];

  const loadRandomPayload = () => {
    const randomIndex = Math.floor(Math.random() * DEMO_PAYLOADS.length);
    setPayload(DEMO_PAYLOADS[randomIndex]);
  };

  return (
    <div className="border-2 border-[#2c2c2c] p-4 bg-[#f4f1ea] flex flex-col gap-4 relative overflow-hidden group paper-edge shadow-sm">
      <div className="absolute inset-0 bg-[#f9f8f6]/50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(44,44,44,0.05), rgba(44,44,44,0.05) 2px, transparent 2px, transparent 8px)' }}></div>
      <div className="flex justify-between items-center border-b-2 border-[#2c2c2c]/30 pb-2 relative z-10">
        <div className="text-[#2c2c2c] font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2c2c2c] animate-pulse"></span>
          Listening: WSS // API // EDI_X12
        </div>
        <div className="flex gap-2">
          <button onClick={loadRandomPayload} className="text-[10px] px-4 py-1 border-2 border-[#2c2c2c] text-[#2c2c2c] hover:bg-[#2c2c2c]/10 transition-colors font-bold">
            Inject Simulated Payload
          </button>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col gap-2">
        <div className="text-[#666] font-bold text-[10px] uppercase tracking-widest flex justify-between">
          <span>PORT 3000 /api/v1/telemetry/ingest</span>
          <span>AWAITING INBOUND CONNECTIONS...</span>
        </div>
        
        <textarea 
          placeholder="RAW PAYLOAD WILL APPEAR HERE..." 
          className="bg-white border-2 border-[#2c2c2c] focus:border-[#1a4c8a] text-[#1a1a1a] p-3 text-[10px] font-mono h-48 resize-none focus:outline-none transition-colors shadow-sm" 
          value={payload} 
          onChange={e => setPayload(e.target.value)} 
          spellCheck={false}
        />
        
        <button 
          onClick={() => { if (payload) onSubmit(payload); }} 
          disabled={!payload}
          className={`font-bold uppercase text-xs py-3 transition-colors mt-2 paper-edge transform rotate-1 ${payload ? 'bg-[#2c2c2c] text-white hover:bg-[#1a1a1a] cursor-pointer' : 'bg-transparent text-[#a0a0a0] border-2 border-[#d5d1c8] cursor-not-allowed'}`}
        >
          {payload ? 'Process Payload Automatically' : 'Awaiting Data...'}
        </button>
      </div>
    </div>
  );
}

// 2. StageProgressBar
function StageProgressBar({ stage }: { stage: PipelineStage }) {
  const stages = ['ingesting', 'detecting', 'planning', 'gating', 'executing', 'auditing', 'complete'];
  const currentIndex = stages.indexOf(stage);
  
  return (
    <div className="flex items-center justify-between">
      {['INGEST', 'DETECT', 'PLAN', 'GATE', 'EXECUTE', 'AUDIT'].map((s, i) => {
        const isActive = currentIndex === i;
        const isPast = currentIndex > i;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-2 ${isActive ? 'border-[#1a4c8a] text-[#1a4c8a] bg-[#1a4c8a]/10 transform -rotate-1 paper-edge' : isPast ? 'border-[#1a1a1a] text-[#1a1a1a] bg-black/5' : 'border-[#d5d1c8] text-[#a0a0a0] border-dashed'}`}>
              {isPast ? <Check className="w-3 h-3 inline mr-1" /> : null}
              {s}
            </div>
            {i < 5 && <ArrowRight className={`w-3 h-3 ${isPast ? 'text-[#00ff41]' : 'text-[#333]'}`} />}
          </div>
        );
      })}
    </div>
  );
}

// 3. DisruptionCard
function DisruptionCard({ disruption }: { disruption: DisruptionJSON }) {
  return (
    <div className="border-2 border-[#da312e] bg-[#da312e]/5 p-4 mb-4 paper-edge shadow-sm transform -rotate-[0.5deg]">
      <div className="flex justify-between items-start mb-4 border-b-2 border-[#da312e]/30 pb-2">
        <div className="text-[#da312e] font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Disruption Detected
        </div>
        <div className="text-[10px] border-2 border-[#da312e] px-2 py-1 text-[#da312e] uppercase font-bold bg-white">
          Confidence: {disruption.confidence || 'UNKNOWN'}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs mb-4 font-mono font-bold">
        <div><span className="text-[#666]">TYPE:</span> <span className="text-[#1a1a1a]">{disruption.type}</span></div>
        <div><span className="text-[#666]">SEVERITY:</span> <span className="text-[#1a1a1a]">{disruption.severity}</span></div>
        <div><span className="text-[#666]">RISK SCORE:</span> <span className="text-[#1a1a1a]">{((disruption.risk_score || 0) * 100).toFixed(0)}%</span></div>
        <div><span className="text-[#666]">SLA BREACH IN:</span> <span className="text-[#1a1a1a]">{disruption.time_to_sla_breach_hours || 0}H</span></div>
      </div>
      <div className="text-xs text-[#1a1a1a] mb-4 font-bold">
        <span className="text-[#666] font-mono">ROOT CAUSE:</span> {disruption.root_cause || disruption.description}
      </div>
      <div className="text-[10px] text-[#1a1a1a] font-bold uppercase border-t-2 border-[#da312e]/30 pt-2">
        <span className="text-[#666] font-mono">AFFECTED SHIPMENTS:</span> {(disruption.affected_shipments || []).join(', ')}
      </div>
    </div>
  );
}

// 4. PlanOptionCard
function PlanOptionCard({ plan, rank, selectable, selected, onClick }: { plan: PlanOption, rank: number, selectable?: boolean, selected?: boolean, onClick?: () => void }) {
  if (!plan) return null;
  return (
    <div 
      className={`p-4 flex-1 transition-all paper-edge border-2 shadow-sm ${selectable ? 'cursor-pointer hover:border-[#1a4c8a] hover:bg-[#1a4c8a]/5' : ''} ${selected ? 'border-[#1a4c8a] bg-[#1a4c8a]/10 transform rotate-1' : 'border-[#1a1a1a] bg-[#f9f8f6]'}`}
      onClick={selectable ? onClick : undefined}
    >
      <div className="text-[#1a4c8a] font-bold text-xs mb-2 border-b-2 border-[#1a1a1a] pb-2 inline-flex">
        OPTION 0{rank} {selected && '(SELECTED)'}
      </div>
      <div className="text-xs space-y-2 font-mono font-bold">
        <div><span className="text-[#666]">CARRIER:</span> <span className="text-[#1a1a1a]">{plan.carrier || 'Unknown'}</span></div>
        <div><span className="text-[#666]">ROUTE:</span> <span className="text-[#1a1a1a]">{plan.route || 'Unknown'}</span></div>
        <div><span className="text-[#666]">COST DELTA:</span> <span className="text-[#1a1a1a]">+${plan.cost_delta || 0}</span></div>
        <div><span className="text-[#666]">DELAY:</span> <span className="text-[#1a1a1a]">+{plan.delay_h || 0}H</span></div>
        <div>
          <span className="text-[#666]">SLA:</span> 
          <span className={plan.sla_compliant ? 'text-[#228b22] ml-1' : 'text-[#da312e] ml-1'}>
            {plan.sla_compliant ? 'COMPLIANT' : 'BREACH'}
          </span>
        </div>
      </div>
    </div>
  );
}

// 5. GateBanner
function GateBanner({ gate }: { gate: GateDecision }) {
  const isAuto = gate.decision === 'auto_execute';
  const color = isAuto ? '#228b22' : '#da312e';
  return (
    <div className={`border-2 paper-edge p-4 mb-4 stamp`} style={{ borderColor: color, backgroundColor: `${color}10`, transform: 'rotate(-0.5deg)' }}>
      <div className="font-bold uppercase tracking-widest text-xs mb-2 border-b-2 pb-2 inline-flex" style={{ color, borderColor: color }}>
        {isAuto ? 'AUTO-EXECUTE APPROVED' : 'APPROVAL REQUIRED: ESCALATED'}
      </div>
      <div className="text-xs text-[#1a1a1a] mb-2 font-bold font-sans">{gate.reason}</div>
      {!isAuto && gate.failed_conditions?.length > 0 && (
        <ul className="text-[10px] text-[#da312e] list-disc list-inside font-bold border-t-2 border-[#da312e]/30 pt-2">
          {gate.failed_conditions.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      )}
    </div>
  );
}

// 6. ApprovalCard
function ApprovalCard({ onApprove, onReject, onRequestAlt }: any) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 flex gap-4 mt-4 paper-edge shadow-sm">
      <button onClick={onApprove} className="flex-1 bg-[#228b22] border-2 border-[#1a1a1a] text-white font-bold text-xs py-2 uppercase hover:bg-green-700 paper-edge transform 1">Approve</button>
      <button onClick={onReject} className="flex-1 bg-[#da312e] border-2 border-[#1a1a1a] text-white font-bold text-xs py-2 uppercase hover:bg-red-700 paper-edge transform -rotate-1">Reject</button>
      <button onClick={onRequestAlt} className="flex-1 bg-white border-2 border-[#1a1a1a] text-[#1a1a1a] font-bold text-xs py-2 uppercase hover:bg-black/5 paper-edge">Request Alt</button>
    </div>
  );
}

// 7. ExecutionChecklist
function ExecutionChecklist({ execution }: { execution: ExecutionResult }) {
  const allSteps = ["book_carrier","update_tms","write_erp","reserve_wms_dock","notify_customer","write_audit"];
  return (
    <div className="border-2 border-[#1a1a1a] bg-[#f9f8f6] p-4 mb-4 paper-edge shadow-sm transform -rotate-1">
      <div className="text-[#1a4c8a] font-bold text-xs mb-4 uppercase border-b-2 border-[#1a1a1a] pb-2 inline-flex">Execution Sequence</div>
      <div className="space-y-2 font-mono font-bold">
        {allSteps.map((step, i) => {
          const isDone = execution.steps_completed.includes(step);
          const isCurrent = execution.status === 'running' && execution.steps_completed.length === i;
          return (
            <div key={step} className={`text-xs flex items-center gap-2 ${isDone ? 'text-[#228b22]' : isCurrent ? 'text-[#1a4c8a]' : 'text-[#a0a0a0]'}`}>
              {isDone ? <Check className="w-3 h-3" /> : isCurrent ? <span className="animate-blink w-3 h-3 block bg-[#1a4c8a]"></span> : <div className="w-3 h-3 border-2 border-[#a0a0a0]"></div>}
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 8. AuditEntryRow
function AuditEntryRow({ entry }: { entry: AuditEntry }) {
  return (
    <div className="border-b-2 border-dashed border-[#d5d1c8] bg-transparent p-3 text-[10px] flex items-center justify-between hover:bg-white transition-colors mb-2 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-[#666] font-bold">{entry.timestamp.split('T')[1].slice(0, 8)}</div>
        <div className={`px-2 py-0.5 border-2 uppercase font-bold transform -rotate-1 ${entry.decision_type === 'auto_execute' ? 'border-[#228b22] text-[#228b22] bg-[#228b22]/5' : 'border-[#da312e] text-[#da312e] bg-[#da312e]/5'}`}>
          {entry.decision_type}
        </div>
        <div className="text-[#1a1a1a] w-48 truncate font-sans font-bold">{entry.disruption_summary}</div>
        <div className="text-[#666] font-bold">PLAN: <span className="text-[#1a1a1a]">{entry.plan_selected}</span></div>
      </div>
      <div className="flex items-center gap-4 text-[#1a1a1a] font-bold">
        <div>+${entry.cost_delta_usd}</div>
        <div>+{entry.delay_hours}H</div>
        <div className={entry.sla_preserved ? 'text-[#228b22]' : 'text-[#da312e]'}>
          {entry.sla_preserved ? 'SLA_MET' : 'SLA_BREACH'}
        </div>
      </div>
    </div>
  );
}
