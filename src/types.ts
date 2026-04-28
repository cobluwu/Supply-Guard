export type PipelineStage = 'idle' | 'ingesting' | 'detecting' | 'planning' | 'gating' | 'executing' | 'auditing' | 'complete' | 'error';

export type DisruptionJSON = {
  type: string;
  severity: string;
  risk_score: number;
  affected_shipments?: string[];
  estimated_delay_hours?: number;
  root_cause?: string;
  confidence?: string;
  time_to_sla_breach_hours?: number;
  description?: string;
  origin_coords?: number[];
  dest_coords?: number[];
  disruption_coords?: number[];
};

export type PlanOption = {
  carrier: string;
  route: string;
  waypoints?: number[][];
  cost_delta: number;
  delay_h: number;
  sla_compliant: boolean;
  reliability: number;
};

export type GateDecision = {
  decision: 'auto_execute' | 'escalate';
  failed_conditions: string[];
  reason: string;
  urgency: string;
};

export type ExecutionResult = {
  status: 'running' | 'complete' | 'failed';
  steps_completed: string[];
};

export type AuditEntry = {
  audit_id: string;
  timestamp: string;
  disruption_type: string;
  disruption_summary: string;
  plan_selected: string;
  decision_type: string;
  cost_delta_usd: number;
  delay_hours: number;
  sla_preserved: boolean;
  steps_completed: string[];
  asset_id?: string;
};

export type PipelineState = {
  stage: PipelineStage;
  disruption: DisruptionJSON | null;
  agentReasoning: string;
  plans: PlanOption[] | null;
  gate: GateDecision | null;
  execution: ExecutionResult | null;
  auditId: string | null;
  error?: string | null;
};
