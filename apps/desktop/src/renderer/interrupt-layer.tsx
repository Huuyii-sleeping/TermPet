import type { TermPetAction, TermPetEvent } from "@termpet/protocol";

export interface InterruptLayerProps {
  bubbleEvent?: TermPetEvent;
  detailActions: TermPetAction[];
  isDetailExpanded: boolean;
  modalEvent?: TermPetEvent;
  showTerminalFallback: boolean;
  toastEvent?: TermPetEvent;
  onDismissModal(): void;
  onDismissToast(): void;
  onToggleDetail(): void;
}

export function InterruptLayer({
  bubbleEvent,
  detailActions,
  isDetailExpanded,
  modalEvent,
  showTerminalFallback,
  toastEvent,
  onDismissModal,
  onDismissToast,
  onToggleDetail,
}: InterruptLayerProps) {
  return (
    <>
      {toastEvent ? (
        <section className="pointer-events-auto absolute left-1/2 top-4 z-30 w-[min(20rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 text-sm text-emerald-950 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">完成提醒</p>
              <p className="mt-1 font-semibold">{toastEvent.title}</p>
              <p className="mt-1 text-emerald-900/80">{toastEvent.summary}</p>
            </div>
            <button
              className="rounded-full border border-emerald-300 px-2 py-1 text-xs text-emerald-800 transition hover:bg-emerald-100"
              onClick={onDismissToast}
              type="button"
            >
              收起
            </button>
          </div>
        </section>
      ) : null}

      {bubbleEvent ? (
        <section className="pointer-events-none absolute right-4 top-8 z-20 max-w-[12rem] rounded-2xl border border-sky-200 bg-white/96 px-3 py-2 text-sm text-sky-950 shadow-lg backdrop-blur">
          <p className="font-semibold">{bubbleEvent.title}</p>
          <p className="mt-1 text-sky-900/80">{bubbleEvent.summary}</p>
        </section>
      ) : null}

      {modalEvent ? (
        <section className="pointer-events-auto absolute inset-x-4 bottom-4 z-40 rounded-3xl border border-amber-300 bg-white/96 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {modalEvent.state === "error" ? "失败提醒" : "等待确认"}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">{modalEvent.title}</h2>
            </div>
            <button
              className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100"
              onClick={onDismissModal}
              type="button"
            >
              稍后处理
            </button>
          </div>

          <dl className="mt-3 grid gap-2 text-sm text-zinc-700">
            <div className="flex gap-2">
              <dt className="min-w-16 text-zinc-500">来源工具</dt>
              <dd>{modalEvent.source}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="min-w-16 text-zinc-500">工作目录</dt>
              <dd className="break-all">{modalEvent.workspace ?? "未提供"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="min-w-16 text-zinc-500">动作摘要</dt>
              <dd>{modalEvent.summary}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p className="font-medium">风险信息</p>
            <p className="mt-1">
              {modalEvent.state === "error"
                ? "当前任务已失败，请优先回终端查看错误详情和最近输出。"
                : "当前任务等待你确认，继续前请回终端完成允许或拒绝。"}
            </p>
          </div>

          {showTerminalFallback ? (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              当前版本暂不支持桌宠内直接回传动作，请返回终端继续处理。
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100"
              onClick={onToggleDetail}
              type="button"
            >
              {isDetailExpanded ? "收起详情" : "查看详情"}
            </button>
            {detailActions.map((action) => (
              <span
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600"
                key={action.id}
              >
                {action.label}
              </span>
            ))}
          </div>

          {isDetailExpanded ? (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              <p>{modalEvent.detail ?? "当前事件没有提供更详细的说明。"}</p>
              {modalEvent.metadata ? (
                <div className="mt-3 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
                  <p>附加信息：{formatMetadata(modalEvent.metadata)}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function formatMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" · ");
}
