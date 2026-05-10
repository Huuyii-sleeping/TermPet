import type { TermPetBridgeSessionDetail, TermPetBridgeState, TermPetEvent, TermPetSession } from "@termpet/protocol";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { fetchBridgeSession } from "./bridge-client";

interface SessionPanelState {
  isOpen: boolean;
  isLoading: boolean;
  selectedSessionDetail?: TermPetBridgeSessionDetail;
  selectedSessionId?: string;
}

export interface SessionPanelView {
  isLoading: boolean;
  isOpen: boolean;
  selectedEvents: TermPetEvent[];
  selectedSession?: TermPetSession;
  selectedSessionId?: string;
  closePanel(): void;
  openPanel(): void;
  selectSession(sessionId: string): void;
  togglePanel(): void;
}

const initialState: SessionPanelState = {
  isLoading: false,
  isOpen: false,
};

export function useSessionPanel(bridgeState?: TermPetBridgeState): SessionPanelView {
  const [state, setState] = useState<SessionPanelState>(initialState);

  const syncActiveSession = useEffectEvent((nextBridgeState?: TermPetBridgeState) => {
    const activeSession = nextBridgeState?.activeSession;
    if (!nextBridgeState || !activeSession) {
      return;
    }

    startTransition(() => {
      setState((previous) => {
        if (previous.selectedSessionId && previous.selectedSessionId !== nextBridgeState.activeSessionId) {
          return previous;
        }

        return {
          ...previous,
          selectedSessionId: nextBridgeState.activeSessionId,
          selectedSessionDetail: createDetailFromBridgeState(nextBridgeState, activeSession.id),
        };
      });
    });
  });

  useEffect(() => {
    syncActiveSession(bridgeState);
  }, [bridgeState, syncActiveSession]);

  useEffect(() => {
    if (!state.isOpen || !state.selectedSessionId || !bridgeState) {
      return;
    }

    const activeDetail = bridgeState.activeSession
      ? createDetailFromBridgeState(bridgeState, state.selectedSessionId)
      : undefined;

    if (activeDetail) {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isLoading: false,
          selectedSessionDetail: activeDetail,
        }));
      });
      return;
    }

    let cancelled = false;

    startTransition(() => {
      setState((previous) => ({
        ...previous,
        isLoading: true,
      }));
    });

    void fetchBridgeSession(state.selectedSessionId)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            isLoading: false,
            selectedSessionDetail: detail,
          }));
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setState((previous) => ({
            ...previous,
            isLoading: false,
          }));
        });
      });

    return () => {
      cancelled = true;
    };
  }, [bridgeState, state.isOpen, state.selectedSessionId]);

  return {
    isLoading: state.isLoading,
    isOpen: state.isOpen,
    selectedEvents: state.selectedSessionDetail?.recentEvents ?? [],
    selectedSession: state.selectedSessionDetail?.session,
    selectedSessionId: state.selectedSessionId,
    closePanel() {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isOpen: false,
        }));
      });
    },
    openPanel() {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isOpen: true,
          selectedSessionId: previous.selectedSessionId ?? bridgeState?.activeSessionId,
          selectedSessionDetail:
            previous.selectedSessionDetail ??
            (bridgeState?.activeSession ? createDetailFromBridgeState(bridgeState, bridgeState.activeSession.id) : undefined),
        }));
      });
    },
    selectSession(sessionId: string) {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isLoading: previous.selectedSessionId === sessionId ? previous.isLoading : true,
          selectedSessionId: sessionId,
        }));
      });
    },
    togglePanel() {
      startTransition(() => {
        setState((previous) => ({
          ...previous,
          isOpen: !previous.isOpen,
          selectedSessionId: previous.selectedSessionId ?? bridgeState?.activeSessionId,
          selectedSessionDetail:
            previous.selectedSessionDetail ??
            (bridgeState?.activeSession ? createDetailFromBridgeState(bridgeState, bridgeState.activeSession.id) : undefined),
        }));
      });
    },
  };
}

export function createDetailFromBridgeState(
  bridgeState: TermPetBridgeState,
  sessionId: string,
): TermPetBridgeSessionDetail | undefined {
  const session = bridgeState.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return undefined;
  }

  return {
    session,
    recentEvents: bridgeState.recentEvents.filter((event) => event.sessionId === sessionId).slice(-8).reverse(),
    isActive: bridgeState.activeSessionId === sessionId,
  };
}
