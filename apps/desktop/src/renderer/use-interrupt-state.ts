import type { InterruptLevel, TermPetAction, TermPetEvent } from "@termpet/protocol";
import { useEffect, useMemo, useState } from "react";

export interface InterruptStateView {
  activeLevel: InterruptLevel;
  bubbleEvent?: TermPetEvent;
  detailActions: TermPetAction[];
  isDetailExpanded: boolean;
  modalEvent?: TermPetEvent;
  showTerminalFallback: boolean;
  toastEvent?: TermPetEvent;
  dismissModal(): void;
  dismissToast(): void;
  toggleDetail(): void;
}

const toastDurationMs = 3600;

export function useInterruptState(activeEvent?: TermPetEvent): InterruptStateView {
  const [dismissedModalId, setDismissedModalId] = useState<string>();
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [toastEvent, setToastEvent] = useState<TermPetEvent>();

  useEffect(() => {
    if (!activeEvent) {
      setIsDetailExpanded(false);
      return;
    }

    setIsDetailExpanded(false);

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
      toggleDetail() {
        setIsDetailExpanded((current) => !current);
      },
    };
  }, [activeEvent, dismissedModalId, isDetailExpanded, toastEvent]);
}
