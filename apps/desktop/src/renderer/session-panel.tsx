import type { TermPetBridgeState, TermPetEvent, TermPetSession } from "@termpet/protocol";

interface SessionPanelProps {
  bridgeState?: TermPetBridgeState;
  isLoading: boolean;
  selectedEvents: TermPetEvent[];
  selectedSession?: TermPetSession;
  selectedSessionId?: string;
  onClose(): void;
  onSelectSession(sessionId: string): void;
}

export function SessionPanel({
  bridgeState,
  isLoading,
  selectedEvents,
  selectedSession,
  selectedSessionId,
  onClose,
  onSelectSession,
}: SessionPanelProps) {
  const sessions = bridgeState?.sessions ?? [];

  return (
    <section className="w-full rounded-[1.75rem] border border-zinc-200 bg-white/96 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">上下文面板</p>
          <h2 className="mt-1 text-base font-semibold text-zinc-950">{selectedSession?.title ?? "当前暂无会话详情"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500">设置入口占位</span>
          <button
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100"
            onClick={onClose}
            type="button"
          >
            收起
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3">
        <p className="text-xs text-zinc-500">当前查看会话</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-zinc-900">{selectedSession?.title ?? "暂无标题"}</p>
            <p className="mt-1 text-sm text-zinc-600">{selectedEvents[0]?.summary ?? "当前会话还没有可展示的活动摘要。"}</p>
          </div>
          <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500">
            {selectedSession ? labelForState(selectedSession.currentState) : "空闲"}
          </span>
        </div>
        <p className="mt-3 text-xs text-zinc-500">工作目录：{selectedSession?.workspace ?? "未提供"}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">最近活动</p>
            {isLoading ? <span className="text-xs text-zinc-500">加载中</span> : null}
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-auto pr-1">
            {selectedEvents.length > 0 ? (
              selectedEvents.map((event) => (
                <article className="rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2" key={event.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-900">{event.title}</p>
                    <span className="text-[11px] text-zinc-500">{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">{event.summary}</p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
                当前会话暂无最近活动摘要。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/90 p-3">
          <p className="text-sm font-semibold text-zinc-900">最近会话</p>
          <div className="mt-3 max-h-52 space-y-2 overflow-auto pr-1">
            {sessions.map((session) => {
              const isSelected = session.id === selectedSessionId;

              return (
                <button
                  className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                      : "border-zinc-100 bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                  }`}
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{session.title}</p>
                    <span className={`text-[11px] ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                      {labelForState(session.currentState)}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>{session.id}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function labelForState(state: TermPetSession["currentState"]): string {
  const labels: Record<TermPetSession["currentState"], string> = {
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

function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}
