import type { TermPetPlugin, PluginContext } from "@termpet/plugin-sdk";
import type { InterruptLevel, TermPetAction, TermPetEvent, TermPetState } from "@termpet/protocol";

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
    interruptLevel: interruptLevelByState(state),
    title: titleByState(state),
    summary: summaryByHookName(hookName, payload.tool_name),
    detail: detailByState(state, payload.cwd),
    severity: severityByState(state),
    requiresAction: state === "waiting_approval",
    actions: actionsByState(state),
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
    return toolName ? `工具 ${toolName} 需要你确认后才能继续。` : "代码代理需要你确认后才能继续。";
  }

  if (hookName === "Stop") {
    return "当前任务已经完成。";
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

function detailByState(state: TermPetState, workspace?: string): string | undefined {
  switch (state) {
    case "waiting_approval":
      return `当前版本暂不支持在桌宠内直接确认，请返回终端完成允许或拒绝。${workspace ? `\n工作目录：${workspace}` : ""}`;
    case "error":
      return `当前任务已标记为失败，请优先回到终端查看错误详情和最近输出。${workspace ? `\n工作目录：${workspace}` : ""}`;
    case "success":
      return "当前任务已经完成，桌宠会短暂提醒后自动收起。";
    default:
      return undefined;
  }
}

function actionsByState(state: TermPetState): TermPetAction[] | undefined {
  switch (state) {
    case "waiting_approval":
      return [
        {
          id: "terminal-fallback",
          label: "回终端确认",
          kind: "open_terminal",
          enabled: true,
          requiresTerminalFallback: true,
          risk: "medium",
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
    default:
      return undefined;
  }
}

export default codexPlugin;
