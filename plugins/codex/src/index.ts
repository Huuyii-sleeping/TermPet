import type { TermPetPlugin, PluginContext } from "@termpet/plugin-sdk";
import type { InterruptLevel, TermPetAction, TermPetEvent, TermPetState } from "@termpet/protocol";

interface CodexHookPayload {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  timestamp?: number;
  success?: boolean;
  exit_code?: number;
  stop_reason?: string;
  permission_risk?: "low" | "medium" | "high";
  command?: string;
  summary?: string;
  detail?: string;
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
  const state = mapHookNameToState(payload);

  return {
    protocolVersion: "1.0",
    id: `codex_${Date.now()}`,
    source: "codex",
    sourceKind: "agent",
    sessionId: payload.session_id ?? "codex_default",
    workspace: payload.cwd,
    state,
    interruptLevel: interruptLevelByState(state),
    title: titleByState(state, payload.stop_reason),
    summary: summaryByPayload(payload, state),
    detail: detailByState(state, payload),
    severity: severityByState(state),
    requiresAction: state === "waiting_approval",
    actions: actionsByState(state, payload),
    timestamp: payload.timestamp ?? Date.now(),
    metadata: {
      hookName: payload.hook_event_name ?? "Unknown",
      toolName: payload.tool_name,
      stopReason: payload.stop_reason,
      exitCode: payload.exit_code,
      command: payload.command,
    },
  };
}

function asCodexPayload(input: unknown): CodexHookPayload {
  return typeof input === "object" && input !== null ? (input as CodexHookPayload) : {};
}

function mapHookNameToState(payload: CodexHookPayload): TermPetState {
  const hookName = payload.hook_event_name ?? "Unknown";

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
    return "代码代理已中断";
  }

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

function summaryByPayload(payload: CodexHookPayload, state: TermPetState): string {
  if (payload.summary) {
    return payload.summary;
  }

  const hookName = payload.hook_event_name ?? "Unknown";
  const toolName = payload.tool_name;

  if (hookName === "PreToolUse" && toolName) {
    return `正在使用工具：${toolName}`;
  }

  if (hookName === "PostToolUse" && toolName && payload.success === false) {
    return `工具 ${toolName} 执行失败，请优先查看终端输出。`;
  }

  if (hookName === "PostToolUse" && toolName) {
    return `工具 ${toolName} 执行完成，正在整理结果。`;
  }

  if (hookName === "PermissionRequest") {
    return toolName ? `工具 ${toolName} 需要你确认后才能继续。` : "代码代理需要你确认后才能继续。";
  }

  if (hookName === "Stop") {
    return state === "success" ? "当前任务已经完成。" : state === "error" ? "当前任务已失败结束，请回终端查看原因。" : "当前任务已被人工中断。";
  }

  if (/error|fail|denied|abort/i.test(hookName)) {
    return "当前任务执行失败，请优先回终端查看。";
  }

  return "收到新的代码代理状态。";
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
      return `当前版本暂不支持在桌宠内直接确认，请返回终端完成允许或拒绝。${payload.cwd ? `\n工作目录：${payload.cwd}` : ""}${
        payload.command ? `\n动作摘要：${payload.command}` : ""
      }`;
    case "error":
      return `${payload.detail ?? "当前任务已标记为失败，请优先回到终端查看错误详情和最近输出。"}${
        payload.cwd ? `\n工作目录：${payload.cwd}` : ""
      }`;
    case "success":
      return "当前任务已经完成，桌宠会短暂提醒后自动收起。";
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
          label: "允许执行",
          kind: "approve",
          enabled: true,
          requiresTerminalFallback: true,
          risk: payload.permission_risk ?? "medium",
          metadata: {
            fallbackCommand: payload.command,
          },
        },
        {
          id: "deny-request",
          label: "拒绝执行",
          kind: "deny",
          enabled: true,
          requiresTerminalFallback: true,
          risk: payload.permission_risk ?? "medium",
          metadata: {
            fallbackCommand: payload.command,
          },
        },
        {
          id: "view-approval-detail",
          label: "查看详情",
          kind: "open_detail",
          enabled: true,
        },
      ];
    case "error":
      return [
        {
          id: "view-error-detail",
          label: "查看详情",
          kind: "open_detail",
          enabled: true,
        },
        {
          id: "terminal-fallback",
          label: "回终端查看",
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
          label: "收起提醒",
          kind: "dismiss",
          enabled: true,
        },
      ];
    default:
      return undefined;
  }
}

function resolveStopState(payload: CodexHookPayload): TermPetState {
  if (payload.success === false || (typeof payload.exit_code === "number" && payload.exit_code !== 0)) {
    return "error";
  }

  if (payload.stop_reason && /interrupt|cancel|abort/i.test(payload.stop_reason)) {
    return "idle";
  }

  return "success";
}

function resolvePostToolUseState(payload: CodexHookPayload): TermPetState {
  if (payload.success === false || (typeof payload.exit_code === "number" && payload.exit_code !== 0)) {
    return "error";
  }

  return "thinking";
}

export default codexPlugin;
