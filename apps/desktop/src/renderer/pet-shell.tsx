import type { TermPetState } from "@termpet/protocol";
import { getMotionForState } from "@termpet/live2d-runtime";
import { InterruptLayer } from "./interrupt-layer";
import { SessionPanel } from "./session-panel";
import { useAuditLog } from "./use-audit-log";
import { useBridgeState } from "./use-bridge-state";
import { useDesktopSettings } from "./use-desktop-settings";
import { useInterruptState } from "./use-interrupt-state";
import { useSessionPanel } from "./use-session-panel";

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
  const desktopSettings = useDesktopSettings();
  const interruptState = useInterruptState(bridgeState.activeEvent, desktopSettings.settings);
  const sessionPanel = useSessionPanel(bridgeState.bridgeState);
  const auditRecords = useAuditLog(sessionPanel.isOpen, interruptState.actionResult?.timestamp);
  const viewModel = mapBridgeStateToViewModel(bridgeState);
  const motion = getMotionForState(viewModel.currentState);

  return (
    <main className="relative min-h-screen bg-transparent text-zinc-950">
      <InterruptLayer
        actionPendingId={interruptState.actionPendingId}
        actionResult={interruptState.actionResult}
        bubbleEvent={interruptState.bubbleEvent}
        detailActions={interruptState.detailActions}
        isDetailExpanded={interruptState.isDetailExpanded}
        modalEvent={interruptState.modalEvent}
        onDismissModal={interruptState.dismissModal}
        onDismissToast={interruptState.dismissToast}
        onRunAction={interruptState.runAction}
        onToggleDetail={interruptState.toggleDetail}
        showTerminalFallback={interruptState.showTerminalFallback}
        toastEvent={interruptState.toastEvent}
      />
      <section className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 p-6">
        <button
          className="h-44 w-44 rounded-full border border-zinc-200 bg-white/85 shadow-xl backdrop-blur transition hover:scale-[1.01] hover:bg-white"
          onClick={sessionPanel.togglePanel}
          type="button"
        >
          <div className="flex h-full items-center justify-center text-center text-sm font-medium text-zinc-700">
            二维动态角色占位
          </div>
        </button>

        <button
          className="w-full rounded-lg border border-zinc-200 bg-white/90 p-4 text-left shadow-lg backdrop-blur transition hover:bg-white"
          onClick={sessionPanel.togglePanel}
          type="button"
        >
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
          <p className="mt-2 text-xs text-zinc-500">角色：当前为占位模式，真实二维模型尚未接入。</p>
          <p className="mt-2 text-xs text-zinc-500">
            连接：{labelForConnectionState(viewModel.connectionState)}
            {viewModel.activeSessionId ? ` · 会话 ${viewModel.activeSessionId}` : ""}
          </p>
        </button>

        {sessionPanel.isOpen ? (
          <SessionPanel
            auditRecords={auditRecords}
            bridgeState={bridgeState.bridgeState}
            isLoading={sessionPanel.isLoading}
            onToggleShowSuccessToast={desktopSettings.updateShowSuccessToast}
            onUpdateReminderMode={desktopSettings.updateReminderMode}
            onClose={sessionPanel.closePanel}
            onSelectSession={sessionPanel.selectSession}
            settings={desktopSettings.settings}
            selectedEvents={sessionPanel.selectedEvents}
            selectedSession={sessionPanel.selectedSession}
            selectedSessionId={sessionPanel.selectedSessionId}
          />
        ) : null}
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
