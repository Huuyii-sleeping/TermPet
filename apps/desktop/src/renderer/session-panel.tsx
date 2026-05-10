import type { TermPetAuditRecord, TermPetBridgeState, TermPetEvent, TermPetSession } from "@termpet/protocol";
import type { DesktopSettings } from "./use-desktop-settings";

interface SessionPanelProps {
  auditRecords: TermPetAuditRecord[];
  bridgeState?: TermPetBridgeState;
  isLoading: boolean;
  settings: DesktopSettings;
  selectedEvents: TermPetEvent[];
  selectedSession?: TermPetSession;
  selectedSessionId?: string;
  onClose(): void;
  onSelectSession(sessionId: string): void;
  onToggleShowSuccessToast(showSuccessToast: boolean): void;
  onUpdateReminderMode(reminderMode: DesktopSettings["reminderMode"]): void;
}

export function SessionPanel({
  auditRecords,
  bridgeState,
  isLoading,
  settings,
  selectedEvents,
  selectedSession,
  selectedSessionId,
  onClose,
  onSelectSession,
  onToggleShowSuccessToast,
  onUpdateReminderMode,
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
          <span className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500">设置已启用</span>
          <button
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100"
            onClick={onClose}
            type="button"
          >
            收起
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3">
          <p className="text-sm font-semibold text-zinc-900">提醒偏好</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                settings.reminderMode === "all"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
              onClick={() => onUpdateReminderMode("all")}
              type="button"
            >
              全部提醒
            </button>
            <button
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                settings.reminderMode === "critical_only"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
              onClick={() => onUpdateReminderMode("critical_only")}
              type="button"
            >
              仅关键提醒
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">完成提醒</p>
              <p className="text-xs text-zinc-500">控制 success 状态的 toast 是否展示。</p>
            </div>
            <button
              className={`rounded-full border px-3 py-1 text-xs transition ${
                settings.showSuccessToast
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-zinc-100 text-zinc-500"
              }`}
              onClick={() => onToggleShowSuccessToast(!settings.showSuccessToast)}
              type="button"
            >
              {settings.showSuccessToast ? "已开启" : "已关闭"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3">
          <p className="text-sm font-semibold text-zinc-900">降级状态</p>
          <div className="mt-3 space-y-2 text-sm text-zinc-600">
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
              桥接离线时，桌宠会保留最近一次同步状态并显示离线说明。
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
              当前角色仍处于二维占位模式，后续接入真实模型后会替换为正式角色运行时。
            </div>
          </div>
        </section>
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

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/90 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900">最近审计</p>
          <span className="text-xs text-zinc-500">仅本地保存</span>
        </div>
        <div className="mt-3 max-h-36 space-y-2 overflow-auto pr-1">
          {auditRecords.length > 0 ? (
            auditRecords.map((record) => (
              <article className="rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2" key={record.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-900">
                    {record.actionKind} · {record.ok ? "成功" : "失败"}
                  </p>
                  <span className="text-[11px] text-zinc-500">{formatTimestamp(record.timestamp)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  来源：{record.source}
                  {record.workspace ? ` · ${record.workspace}` : ""}
                </p>
                <p className="mt-1 text-sm text-zinc-600">{record.message ?? "当前记录没有额外说明。"}</p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
              当前还没有可展示的本地动作审计。
            </div>
          )}
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
