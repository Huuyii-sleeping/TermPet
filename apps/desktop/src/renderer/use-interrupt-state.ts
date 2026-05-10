import type { InterruptLevel, TermPetAction, TermPetActionResult, TermPetEvent } from "@termpet/protocol";
import { useEffect, useMemo, useState } from "react";
import { invokeBridgeAction } from "./bridge-client";

export interface InterruptStateView {
  activeLevel: InterruptLevel;
  actionPendingId?: string;
  actionResult?: TermPetActionResult;
  bubbleEvent?: TermPetEvent;
  detailActions: TermPetAction[];
  isDetailExpanded: boolean;
  modalEvent?: TermPetEvent;
  showTerminalFallback: boolean;
  toastEvent?: TermPetEvent;
  dismissModal(): void;
  dismissToast(): void;
  runAction(action: TermPetAction): void;
  toggleDetail(): void;
}

const toastDurationMs = 3600;

export function useInterruptState(activeEvent?: TermPetEvent): InterruptStateView {
  const [dismissedModalId, setDismissedModalId] = useState<string>();
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [toastEvent, setToastEvent] = useState<TermPetEvent>();
  const [actionPendingId, setActionPendingId] = useState<string>();
  const [actionResult, setActionResult] = useState<TermPetActionResult>();

  useEffect(() => {
    if (!activeEvent) {
      setIsDetailExpanded(false);
      setActionPendingId(undefined);
      setActionResult(undefined);
      return;
    }

    setIsDetailExpanded(false);
    setActionPendingId(undefined);
    setActionResult(undefined);

    if (activeEvent.interruptLevel === "modal") {
      setDismissedModalId(undefined);
    }

    if (activeEvent.interruptLevel === "toast") {
      setToastEvent(activeEvent);
    }
  }, [activeEvent?.id]);

  useEffect(() => {
    if (!toastEvent) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastEvent((current) => (current?.id === toastEvent.id ? undefined : current));
    }, toastDurationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toastEvent?.id]);

  return useMemo(() => {
    const activeLevel = activeEvent?.interruptLevel ?? "silent";
    const bubbleEvent = activeLevel === "bubble" ? activeEvent : undefined;
    const modalEvent = activeLevel === "modal" && activeEvent?.id !== dismissedModalId ? activeEvent : undefined;
    const detailActions = activeEvent?.actions ?? [];
    const showTerminalFallback = Boolean(
      activeEvent?.requiresAction ||
        activeEvent?.actions?.some((action) => action.requiresTerminalFallback || action.kind === "open_terminal"),
    );

    return {
      activeLevel,
      actionPendingId,
      actionResult,
      bubbleEvent,
      detailActions,
      isDetailExpanded,
      modalEvent,
      showTerminalFallback,
      toastEvent,
      dismissModal() {
        if (activeEvent?.id) {
          setDismissedModalId(activeEvent.id);
        }
      },
      dismissToast() {
        setToastEvent(undefined);
      },
      runAction(action: TermPetAction) {
        if (!activeEvent) {
          return;
        }

        if (action.kind === "open_detail") {
          setIsDetailExpanded((current) => !current);
          return;
        }

        if (action.kind === "dismiss") {
          if (activeEvent.interruptLevel === "toast") {
            setToastEvent(undefined);
          } else {
            setDismissedModalId(activeEvent.id);
          }
          setActionResult(undefined);
          return;
        }

        setActionPendingId(action.id);

        void invokeBridgeAction({
          protocolVersion: "1.0",
          actionId: action.id,
          eventId: activeEvent.id,
          sessionId: activeEvent.sessionId,
          source: activeEvent.source,
          kind: action.kind,
          metadata: action.metadata,
        })
          .then((result) => {
            setActionResult(result);
            setActionPendingId(undefined);
          })
          .catch((error) => {
            setActionResult({
              protocolVersion: "1.0",
              actionId: action.id,
              eventId: activeEvent.id,
              sessionId: activeEvent.sessionId,
              source: activeEvent.source,
              kind: action.kind,
              ok: false,
              handledBy: "bridge",
              message: error instanceof Error ? error.message : "动作请求失败。",
              timestamp: Date.now(),
            });
            setActionPendingId(undefined);
          });
      },
      toggleDetail() {
        setIsDetailExpanded((current) => !current);
      },
    };
  }, [activeEvent, actionPendingId, actionResult, dismissedModalId, isDetailExpanded, toastEvent]);
}
