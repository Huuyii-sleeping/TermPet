export type TermPetState =
  | "idle"
  | "listening"
  | "thinking"
  | "working"
  | "waiting_approval"
  | "success"
  | "error";

export type InterruptLevel = "silent" | "bubble" | "toast" | "modal";

export type SourceKind = "agent" | "command" | "system";

export interface TermPetAction {
  id: string;
  label: string;
  kind: "approve" | "deny" | "open_detail" | "open_terminal" | "dismiss" | "rerun" | "stop";
  risk?: "low" | "medium" | "high";
  enabled?: boolean;
  requiresTerminalFallback?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TermPetEvent {
  protocolVersion: "1.0";
  id: string;
  source: string;
  sourceKind: SourceKind;
  sessionId: string;
  workspace?: string;
  state: TermPetState;
  interruptLevel?: InterruptLevel;
  title: string;
  summary: string;
  detail?: string;
  severity?: "info" | "success" | "warning" | "error";
  requiresAction?: boolean;
  actions?: TermPetAction[];
  rawRef?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface TermPetSession {
  id: string;
  source: string;
  sourceKind: SourceKind;
  workspace?: string;
  title: string;
  currentState: TermPetState;
  latestEventId: string;
  latestActivityAt: number;
  createdAt: number;
  pinned?: boolean;
}

export interface TermPetBridgeState {
  activeSessionId?: string;
  activeSession?: TermPetSession;
  sessions: TermPetSession[];
  recentEvents: TermPetEvent[];
  updatedAt: number;
}

export interface TermPetBridgeSessionDetail {
  session: TermPetSession;
  recentEvents: TermPetEvent[];
  isActive: boolean;
}

export interface TermPetBridgeEventMessage {
  type: "event";
  event: TermPetEvent;
  activeSessionId?: string;
  updatedAt: number;
}

export interface TermPetBridgeSnapshotMessage {
  type: "snapshot";
  state: TermPetBridgeState;
}

export type TermPetBridgeMessage = TermPetBridgeEventMessage | TermPetBridgeSnapshotMessage;

export const defaultInterruptLevelByState: Record<TermPetState, InterruptLevel> = {
  idle: "silent",
  listening: "bubble",
  thinking: "bubble",
  working: "bubble",
  waiting_approval: "modal",
  success: "toast",
  error: "modal",
};

export function normalizeEvent(input: unknown): TermPetEvent {
  if (!isRecord(input)) {
    throw new Error("事件载荷必须是对象");
  }

  const state = asState(input.state);

  return {
    protocolVersion: "1.0",
    id: asString(input.id, `evt_${Date.now()}`),
    source: asString(input.source, "unknown"),
    sourceKind: asSourceKind(input.sourceKind),
    sessionId: asString(input.sessionId, "default"),
    workspace: asOptionalString(input.workspace),
    state,
    interruptLevel: asOptionalInterruptLevel(input.interruptLevel) ?? defaultInterruptLevelByState[state],
    title: asString(input.title, "状态更新"),
    summary: asString(input.summary, "收到新的状态事件。"),
    detail: asOptionalString(input.detail),
    severity: asOptionalSeverity(input.severity),
    requiresAction: typeof input.requiresAction === "boolean" ? input.requiresAction : undefined,
    actions: Array.isArray(input.actions) ? (input.actions as TermPetAction[]) : undefined,
    rawRef: asOptionalString(input.rawRef),
    metadata: isRecord(input.metadata) ? input.metadata : undefined,
    timestamp: typeof input.timestamp === "number" ? input.timestamp : Date.now(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asState(value: unknown): TermPetState {
  const states: TermPetState[] = ["idle", "listening", "thinking", "working", "waiting_approval", "success", "error"];
  return states.includes(value as TermPetState) ? (value as TermPetState) : "idle";
}

function asSourceKind(value: unknown): SourceKind {
  const kinds: SourceKind[] = ["agent", "command", "system"];
  return kinds.includes(value as SourceKind) ? (value as SourceKind) : "system";
}

function asOptionalInterruptLevel(value: unknown): InterruptLevel | undefined {
  const levels: InterruptLevel[] = ["silent", "bubble", "toast", "modal"];
  return levels.includes(value as InterruptLevel) ? (value as InterruptLevel) : undefined;
}

function asOptionalSeverity(value: unknown): TermPetEvent["severity"] {
  const severities: NonNullable<TermPetEvent["severity"]>[] = ["info", "success", "warning", "error"];
  return severities.includes(value as NonNullable<TermPetEvent["severity"]>) ? (value as TermPetEvent["severity"]) : undefined;
}
