# 🛡️ SupplyGuard

**An autonomous supply chain rerouting agent powered by Google's Gemini.** 

SupplyGuard is an intelligent logistics and supply chain management platform designed to detect transit disruptions (weather, geopolitical, port congestion) and execute or recommend optimal rerouting decisions *before* bottlenecks cascade into delivery failures.

## 🚀 The Core Problem & Solution

Global supply chains are inherently fragile. When a disruption strikes, human reaction time is often too slow to prevent Service Level Agreement (SLA) breaches, resulting in heavy financial penalties and degraded customer trust. 

**SupplyGuard** actively listens to WMS/ERP telemetry, weather alerts, and carrier APIs. When a disruption is detected, the AI agent (powered by Gemini) reasons through available carrier capacities, estimates reroute costs against potential SLA penalties, and either executes the optimal reroute autonomously (within strict guardrails) or escalates it to a human planner for approval.

## ✨ Key Features

- **🧠 Agentic Reasoning Engine:** A 6-stage autonomous pipeline (Ingest → Detect → Plan → Gate → Execute → Audit) that leverages Gemini to make smart, cost-aware logistics decisions.
- **🗺️ Live Geo-Network Mapping:** Real-time visualization of fleet assets, active routes, diverted paths, and disruption zones using Leaflet.
- **📊 Telemetry & Financial Dashboards:** Monitor SLA compliance, critical alerts, ROI (SLA penalties avoided vs. reroute spend), and carbon emissions delta.
- **🏭 WMS Node Management:** Live tracking of global warehouse capacity, dock utilization, and inbound/outbound volume.
- **🛡️ Human-in-the-Loop Guardrails:** Configurable autonomous execution thresholds (e.g., max cost, max delay). High-risk reroutes automatically escalate for human approval.
- **🎨 Custom Tactile UX:** A highly distinctive "paper/tactile" UI aesthetic designed for clarity and focus during high-stress supply chain events.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Framer Motion (for purposeful animation), Lucide React (Icons)
- **Data Visualization:** Recharts (Financial/Telemetry Area Charts)
- **Mapping:** React-Leaflet, Leaflet
- **AI Core:** Google Gemini API

## 🏃‍♂️ Getting Started

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## 🔒 Security & Guardrails

SupplyGuard is designed with safety first. The AI is strictly constrained by rule-based gates. It will **escalate** rather than auto-execute if:
- Reroute cost exceeds the configured threshold (e.g., >$5000).
- Transit delay exceeds SLA tolerances.
- The proposed route enters restricted geopolitical zones (configurable).
- The AI confidence score is not strictly "high".
