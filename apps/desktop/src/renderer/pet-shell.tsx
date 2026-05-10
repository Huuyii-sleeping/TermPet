import type { TermPetBridgeState, TermPetState } from "@termpet/protocol";
import { getMotionForState } from "@termpet/live2d-runtime";
import { startTransition, useEffect, useState } from "react";
import { createBridgeClient, fetchBridgeState } from "./bridge-client";

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
  summary: "正在等待桥接服务的状态同步。",
  title: "桌宠待命中",
};

export function PetShell() {
  const [viewModel, setViewModel] = useState<PetShellViewModel>(idleViewModel);
  const motion = getMotionForState(viewModel.currentState);

  useEffect(() => {
    let cancelled = false;

    async function syncState() {
      try {
        const state = await fetchBridgeState();
        if (cancelled) {
          return;
        }

        const nextViewModel = mapBridgeStateToViewModel(state);
        startTransition(() => {
          setViewModel(nextViewModel);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn("桥接状态同步失败", error);
        startTransition(() => {
          setViewModel((previous) => ({
            ...previous,
            connectionState: "offline",
            summary: "暂时无法连接桥接服务，桌宠会在恢复后自动刷新。",
            title: "桥接服务暂时离线",
          }));
        });
      }
    }

    const client = createBridgeClient(
      () => {
        void syncState();
      },
      (state) => {
        if (cancelled) {
          return;
        }

        const nextViewModel = mapBridgeStateToViewModel(state);
        startTransition(() => {
          setViewModel(nextViewModel);
        });
      },
    );

    void syncState();
    client.connect();

    return () => {
      cancelled = true;
      client.disconnect();
    };
  }, []);

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

function mapBridgeStateToViewModel(state: TermPetBridgeState): PetShellViewModel {
  const activeSession = state.activeSession;
  const latestEvent = activeSession
    ? [...state.recentEvents].reverse().find((event) => event.sessionId === activeSession.id)
    : undefined;

  return {
    activeSessionId: state.activeSessionId,
    connectionState: "connected",
    currentState: activeSession?.currentState ?? "idle",
    sessionCount: state.sessions.length,
    summary: latestEvent?.summary ?? "正在等待新的状态事件。",
    title: activeSession?.title ?? "桌宠待命中",
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
