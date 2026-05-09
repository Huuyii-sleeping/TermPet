import type { TermPetPlugin, PluginContext } from "@termpet/plugin-sdk";
import type { TermPetEvent, TermPetState } from "@termpet/protocol";

interface CodexHookPayload {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  timestamp?: number;
}

export const codexPlugin: TermPetPlugin = {
  id: "codex",
  name: "代码代理适配器",
  version: "0.1.0",
  type: "hook",
  async handleEvent(input: unknown, _context: PluginContext) {
    return [mapCodexHookToEvent(input)];
  },
};

export function mapCodexHookToEvent(input: unknown): TermPetEvent {
  const payload = asCodexPayload(input);
  const hookName = payload.hook_event_name ?? "Unknown";
  const state = mapHookNameToState(hookName);

  return {
    protocolVersion: "1.0",
    id: `codex_${Date.now()}`,
    source: "codex",
    sourceKind: "agent",
    sessionId: payload.session_id ?? "codex_default",
    workspace: payload.cwd,
    state,
    title: titleByState(state),
    summary: summaryByHookName(hookName, payload.tool_name),
    severity: state === "error" ? "error" : state === "success" ? "success" : "info",
    requiresAction: state === "waiting_approval",
    timestamp: payload.timestamp ?? Date.now(),
    metadata: {
      hookName,
      toolName: payload.tool_name,
    },
  };
}

function asCodexPayload(input: unknown): CodexHookPayload {
  return typeof input === "object" && input !== null ? (input as CodexHookPayload) : {};
}

function mapHookNameToState(hookName: string): TermPetState {
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
      return "success";
    case "PostToolUse":
      return "working";
    default:
      return "idle";
  }
}

function titleByState(state: TermPetState): string {
  const titleMap: Record<TermPetState, string> = {
    idle: "代码代理空闲",
    listening: "代码代理已启动",
    thinking: "代码代理正在思考",
    working: "代码代理正在工作",
    waiting_approval: "代码代理需要确认",
    success: "代码代理已完成",
    error: "代码代理遇到错误",
  };

  return titleMap[state];
}

function summaryByHookName(hookName: string, toolName?: string): string {
  if (hookName === "PreToolUse" && toolName) {
    return `正在使用工具：${toolName}`;
  }

  if (hookName === "PermissionRequest") {
    return "这里需要你确认一下。";
  }

  return "收到新的代码代理状态。";
}

export default codexPlugin;
