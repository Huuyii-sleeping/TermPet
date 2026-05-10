import type { InterruptLevel, TermPetAction, TermPetEvent, TermPetState } from "@termpet/protocol";

interface RawCodexHookPayload {
  hook_event_name?: string;
  hookEventName?: string;
  session_id?: string;
  sessionId?: string;
  cwd?: string;
  tool_name?: string;
  toolName?: string;
  timestamp?: number;
  success?: boolean;
  exit_code?: number;
  exitCode?: number;
  stop_reason?: string;
  stopReason?: string;
  permission_risk?: "low" | "medium" | "high";
  permissionRisk?: "low" | "medium" | "high";
  command?: string;
  summary?: string;
  detail?: string;
  source?: string;
  model?: string;
  agent_id?: string;
  agentId?: string;
  agent_type?: string;
  agentType?: string;
}

export interface CodexHookPayload {
  hookEventName: string;
  sessionId: string;
  cwd?: string;
  toolName?: string;
  timestamp: number;
  success?: boolean;
  exitCode?: number;
  stopReason?: string;
  permissionRisk?: "low" | "medium" | "high";
  command?: string;
  summary?: string;
  detail?: string;
  source?: string;
  model?: string;
  agentId?: string;
  agentType?: string;
}

export function mapCodexHookToEvent(input: unknown): TermPetEvent {
  const payload = normalizeCodexPayload(input);
  const state = mapHookNameToState(payload);

  return {
    protocolVersion: "1.0",
    id: buildEventId(payload),
    source: "codex",
    sourceKind: "agent",
    sessionId: payload.sessionId,
    workspace: payload.cwd,
    state,
    interruptLevel: interruptLevelByState(state),
    title: titleByState(state, payload.stopReason),
    summary: summaryByPayload(payload, state),
    detail: detailByState(state, payload),
    severity: severityByState(state),
    requiresAction: state === "waiting_approval",
    actions: actionsByState(state, payload),
    timestamp: payload.timestamp,
    metadata: {
      hookName: payload.hookEventName,
      toolName: payload.toolName,
      stopReason: payload.stopReason,
      exitCode: payload.exitCode,
      command: payload.command,
      source: payload.source,
      model: payload.model,
      agentId: payload.agentId,
      agentType: payload.agentType,
    },
  };
}

export function normalizeCodexPayload(input: unknown): CodexHookPayload {
  const payload = typeof input === "object" && input !== null ? (input as RawCodexHookPayload) : {};

  return {
    hookEventName: firstString(payload.hook_event_name, payload.hookEventName) ?? "Unknown",
    sessionId: firstString(payload.session_id, payload.sessionId) ?? "codex_default",
    cwd: optionalString(payload.cwd),
    toolName: firstString(payload.tool_name, payload.toolName),
    timestamp: typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),
    success: typeof payload.success === "boolean" ? payload.success : undefined,
    exitCode: firstNumber(payload.exit_code, payload.exitCode),
    stopReason: firstString(payload.stop_reason, payload.stopReason),
    permissionRisk: firstRisk(payload.permission_risk, payload.permissionRisk),
    command: optionalString(payload.command),
    summary: optionalString(payload.summary),
    detail: optionalString(payload.detail),
    source: optionalString(payload.source),
    model: optionalString(payload.model),
    agentId: firstString(payload.agent_id, payload.agentId),
    agentType: firstString(payload.agent_type, payload.agentType),
  };
}

function buildEventId(payload: CodexHookPayload): string {
  const detailSegment = sanitizeIdSegment(payload.toolName ?? payload.stopReason ?? String(payload.exitCode ?? "event"));
  return `codex_${sanitizeIdSegment(payload.sessionId)}_${sanitizeIdSegment(payload.hookEventName)}_${payload.timestamp}_${detailSegment}`;
}

function mapHookNameToState(payload: CodexHookPayload): TermPetState {
  const hookName = payload.hookEventName;

  if (/error|fail|denied|abort/i.test(hookName)) {
    return "error";
  }

  switch (hookName) {
    case "SessionStart":
      return "listening";
    case "UserPromptSubmit":
      return "thinking";
    case "PreToolUse":
      return "working";
    case "PermissionRequest":
      return "waiting_approval";
    case "Stop":
      return resolveStopState(payload);
    case "PostToolUse":
      return resolvePostToolUseState(payload);
    default:
      return "idle";
  }
}

function titleByState(state: TermPetState, stopReason?: string): string {
  if (state === "idle" && stopReason && /interrupt|cancel|abort/i.test(stopReason)) {
    return "Codex session interrupted";
  }

  const titleMap: Record<TermPetState, string> = {
    idle: "Codex idle",
    listening: "Codex connected",
    thinking: "Codex thinking",
    working: "Codex using tools",
    waiting_approval: "Codex waiting for approval",
    success: "Codex completed",
    error: "Codex failed",
  };

  return titleMap[state];
}

function summaryByPayload(payload: CodexHookPayload, state: TermPetState): string {
  if (payload.summary) {
    return payload.summary;
  }

  const hookName = payload.hookEventName;
  const toolName = payload.toolName;

  if (hookName === "PreToolUse" && toolName) {
    return `Using tool ${toolName}`;
  }

  if (hookName === "PostToolUse" && toolName && payload.success === false) {
    return `Tool ${toolName} failed. Check the terminal for details.`;
  }

  if (hookName === "PostToolUse" && toolName) {
    return `Tool ${toolName} completed. Codex is preparing the result.`;
  }

  if (hookName === "PermissionRequest") {
    return toolName ? `Tool ${toolName} requires approval before it can continue.` : "Codex requires approval before it can continue.";
  }

  if (hookName === "Stop") {
    if (state === "success") {
      return "The current task has completed.";
    }

    if (state === "error") {
      return "The current task failed. Check the terminal for the reason.";
    }

    return "The current task was interrupted.";
  }

  if (/error|fail|denied|abort/i.test(hookName)) {
    return "The current task failed. Check the terminal for details.";
  }

  return "Received a new Codex status event.";
}

function interruptLevelByState(state: TermPetState): InterruptLevel {
  switch (state) {
    case "waiting_approval":
    case "error":
      return "modal";
    case "success":
      return "toast";
    case "listening":
    case "thinking":
    case "working":
      return "bubble";
    default:
      return "silent";
  }
}

function severityByState(state: TermPetState): TermPetEvent["severity"] {
  switch (state) {
    case "waiting_approval":
      return "warning";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return "info";
  }
}

function detailByState(state: TermPetState, payload: CodexHookPayload): string | undefined {
  switch (state) {
    case "waiting_approval":
      return [
        "In-app approval is not supported yet. Return to the Codex terminal to approve or deny the action.",
        payload.cwd ? `Workspace: ${payload.cwd}` : undefined,
        payload.command ? `Action: ${payload.command}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");
    case "error":
      return [
        payload.detail ?? "The current task is marked as failed. Return to the terminal for full details and recent output.",
        payload.cwd ? `Workspace: ${payload.cwd}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");
    case "success":
      return "The current task is complete. The notification can be safely dismissed.";
    default:
      return undefined;
  }
}

function actionsByState(state: TermPetState, payload: CodexHookPayload): TermPetAction[] | undefined {
  switch (state) {
    case "waiting_approval":
      return [
        {
          id: "approve-request",
          label: "Approve",
          kind: "approve",
          enabled: true,
          requiresTerminalFallback: true,
          risk: payload.permissionRisk ?? "medium",
          metadata: {
            fallbackCommand: payload.command,
          },
        },
        {
          id: "deny-request",
          label: "Deny",
          kind: "deny",
          enabled: true,
          requiresTerminalFallback: true,
          risk: payload.permissionRisk ?? "medium",
          metadata: {
            fallbackCommand: payload.command,
          },
        },
        {
          id: "view-approval-detail",
          label: "View detail",
          kind: "open_detail",
          enabled: true,
        },
      ];
    case "error":
      return [
        {
          id: "view-error-detail",
          label: "View detail",
          kind: "open_detail",
          enabled: true,
        },
        {
          id: "terminal-fallback",
          label: "Open terminal",
          kind: "open_terminal",
          enabled: true,
          requiresTerminalFallback: true,
          risk: "medium",
        },
      ];
    case "success":
      return [
        {
          id: "dismiss-success",
          label: "Dismiss",
          kind: "dismiss",
          enabled: true,
        },
      ];
    default:
      return undefined;
  }
}

function resolveStopState(payload: CodexHookPayload): TermPetState {
  if (payload.success === false || (typeof payload.exitCode === "number" && payload.exitCode !== 0)) {
    return "error";
  }

  if (payload.stopReason && /interrupt|cancel|abort/i.test(payload.stopReason)) {
    return "idle";
  }

  return "success";
}

function resolvePostToolUseState(payload: CodexHookPayload): TermPetState {
  if (payload.success === false || (typeof payload.exitCode === "number" && payload.exitCode !== 0)) {
    return "error";
  }

  return "thinking";
}

function firstString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function firstNumber(...values: Array<number | undefined>): number | undefined {
  return values.find((value) => typeof value === "number");
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function firstRisk(...values: Array<"low" | "medium" | "high" | undefined>): "low" | "medium" | "high" | undefined {
  return values.find((value) => value === "low" || value === "medium" || value === "high");
}

function sanitizeIdSegment(value: string): string {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized.length > 0 ? sanitized.slice(0, 32) : "event";
}
