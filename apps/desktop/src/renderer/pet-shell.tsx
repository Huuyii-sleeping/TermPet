import type { TermPetState } from "@termpet/protocol";
import { getMotionForState } from "@termpet/live2d-runtime";
import { useBridgeState } from "./use-bridge-state";

interface PetShellViewModel {
  activeSessionId?: string;
  connectionState: "connecting" | "connected" | "offline";
  currentState: TermPetState;
  sessionCount: number;
  summary: string;
  title: string;
}

const idleViewModel: PetShellViewModel = {
  connectionState: "connecting",
  currentState: "idle",
  sessionCount: 0,
  summary: "正在连接桥接服务并同步当前会话状态。",
  title: "桌宠待命中",
};

export function PetShell() {
  const bridgeState = useBridgeState();
  const viewModel = mapBridgeStateToViewModel(bridgeState);
  const motion = getMotionForState(viewModel.currentState);

  return (
    <main className="min-h-screen bg-transparent text-zinc-950">
      <section className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <div className="h-44 w-44 rounded-full border border-zinc-200 bg-white/85 shadow-xl backdrop-blur">
          <div className="flex h-full items-center justify-center text-center text-sm font-medium text-zinc-700">
            二维动态角色占位
          </div>
        </div>

        <div className="w-full rounded-lg border border-zinc-200 bg-white/90 p-4 shadow-lg backdrop-blur">
          <p className="text-xs text-zinc-500">
            当前状态
            {viewModel.sessionCount > 0 ? ` · ${viewModel.sessionCount} 个会话` : ""}
          </p>
          <h1 className="mt-1 text-lg font-semibold">{labelForState(viewModel.currentState)}</h1>
          <p className="mt-2 text-sm text-zinc-700">{viewModel.title}</p>
          <p className="mt-2 text-sm text-zinc-600">{viewModel.summary}</p>
          <p className="mt-2 text-sm text-zinc-600">
            动作：{motion.motion}，表情：{motion.expression}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            连接：{labelForConnectionState(viewModel.connectionState)}
            {viewModel.activeSessionId ? ` · 会话 ${viewModel.activeSessionId}` : ""}
          </p>
        </div>
      </section>
    </main>
  );
}

function mapBridgeStateToViewModel(state: ReturnType<typeof useBridgeState>): PetShellViewModel {
  if (!state.bridgeState || !state.activeSession) {
    if (state.connectionState === "offline") {
      return {
        ...idleViewModel,
        connectionState: "offline",
        summary: "暂时无法连接桥接服务，桌宠会在恢复后自动重新同步。",
        title: "桥接服务暂时离线",
      };
    }

    return {
      ...idleViewModel,
      connectionState: state.connectionState,
    };
  }

  if (state.connectionState === "offline") {
    return {
      activeSessionId: state.bridgeState.activeSessionId,
      connectionState: "offline",
      currentState: state.activeSession.currentState,
      sessionCount: state.bridgeState.sessions.length,
      summary: "当前展示最近一次同步状态，桥接服务恢复后会自动刷新。",
      title: state.activeSession.title,
    };
  }

  return {
    activeSessionId: state.bridgeState.activeSessionId,
    connectionState: state.connectionState,
    currentState: state.activeSession.currentState,
    sessionCount: state.bridgeState.sessions.length,
    summary: state.activeEvent?.summary ?? "正在等待新的状态事件。",
    title: state.activeSession.title,
  };
}

function labelForState(state: TermPetState): string {
  const labels: Record<TermPetState, string> = {
    idle: "空闲",
    listening: "监听",
    thinking: "思考",
    working: "工作",
    waiting_approval: "等待确认",
    success: "完成",
    error: "失败",
  };

  return labels[state];
}

function labelForConnectionState(state: PetShellViewModel["connectionState"]): string {
  const labels: Record<PetShellViewModel["connectionState"], string> = {
    connecting: "连接中",
    connected: "已连接",
    offline: "离线",
  };

  return labels[state];
}
