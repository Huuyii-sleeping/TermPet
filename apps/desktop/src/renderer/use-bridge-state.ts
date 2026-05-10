import type { TermPetBridgeEventMessage, TermPetBridgeState, TermPetEvent, TermPetSession } from "@termpet/protocol";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { type BridgeConnectionState, createBridgeClient, fetchBridgeState } from "./bridge-client";

interface BridgeStoreState {
  bridgeState?: TermPetBridgeState;
  connectionState: BridgeConnectionState;
  errorMessage?: string;
}

export interface BridgeStateView {
  activeEvent?: TermPetEvent;
  activeSession?: TermPetSession;
  bridgeState?: TermPetBridgeState;
  connectionState: BridgeConnectionState;
  errorMessage?: string;
}

const maxRecentEvents = 100;

const initialState: BridgeStoreState = {
  connectionState: "connecting",
};

export function useBridgeState(): BridgeStateView {
  const [state, setState] = useState<BridgeStoreState>(initialState);

  const applySnapshot = useEffectEvent((bridgeState: TermPetBridgeState) => {
    startTransition(() => {
      setState((previous) => ({
        bridgeState,
        connectionState: previous.connectionState,
        errorMessage: undefined,
      }));
    });
  });

  const applyEvent = useEffectEvent((message: TermPetBridgeEventMessage) => {
    startTransition(() => {
      setState((previous) => {
        const fallbackState = createBridgeStateFromEvent(message);
        const nextBridgeState = previous.bridgeState ? mergeBridgeEvent(previous.bridgeState, message) : fallbackState;

        return {
          bridgeState: nextBridgeState,
          connectionState: "connected",
          errorMessage: undefined,
        };
      });
    });
  });

  const applyConnectionState = useEffectEvent((connectionState: BridgeConnectionState) => {
    startTransition(() => {
      setState((previous) => ({
        ...previous,
        connectionState,
        errorMessage: connectionState === "connected" ? undefined : previous.errorMessage,
      }));
    });
  });

  const applyConnectionError = useEffectEvent((error: Error) => {
    startTransition(() => {
      setState((previous) => ({
        ...previous,
        connectionState: "offline",
        errorMessage: error.message,
      }));
    });
  });

  useEffect(() => {
    const abortController = new AbortController();
    let connectTimer: number | undefined;

    const client = createBridgeClient({
      onConnectionStateChange: applyConnectionState,
      onError: applyConnectionError,
      onEvent: applyEvent,
      onSnapshot: applySnapshot,
    });

    async function initialize() {
      try {
        const bridgeState = await fetchBridgeState({ signal: abortController.signal });
        applySnapshot(bridgeState);
        client.connect();
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        applyConnectionError(asError(error));
        connectTimer = window.setTimeout(() => {
          client.connect();
        }, 1500);
      }
    }

    void initialize();

    return () => {
      abortController.abort();
      if (typeof connectTimer === "number") {
        window.clearTimeout(connectTimer);
      }

      client.disconnect();
    };
  }, []);

  const activeSession = state.bridgeState?.activeSession;
  const activeEvent = activeSession
    ? [...(state.bridgeState?.recentEvents ?? [])].reverse().find((event) => event.sessionId === activeSession.id)
    : undefined;

  return {
    activeEvent,
    activeSession,
    bridgeState: state.bridgeState,
    connectionState: state.connectionState,
    errorMessage: state.errorMessage,
  };
}

export function createBridgeStateFromEvent(message: TermPetBridgeEventMessage): TermPetBridgeState {
  const session = createSessionFromEvent(message.event);

  return {
    activeSessionId: message.activeSessionId ?? session.id,
    activeSession: session,
    sessions: [session],
    recentEvents: [message.event],
    updatedAt: message.updatedAt,
  };
}

export function mergeBridgeEvent(previous: TermPetBridgeState, message: TermPetBridgeEventMessage): TermPetBridgeState {
  const nextEvents = orderEvents([...previous.recentEvents.filter((event) => event.id !== message.event.id), message.event]).slice(
    -maxRecentEvents,
  );
  const nextSessions = upsertSessions(previous.sessions, message.event);
  const activeSessionId = message.activeSessionId ?? nextSessions[0]?.id;
  const activeSession = nextSessions.find((session) => session.id === activeSessionId);

  return {
    activeSessionId,
    activeSession,
    sessions: nextSessions,
    recentEvents: nextEvents,
    updatedAt: message.updatedAt,
  };
}

function upsertSessions(sessions: TermPetSession[], event: TermPetEvent): TermPetSession[] {
  const nextSessions = new Map(sessions.map((session) => [session.id, session]));
  const existing = nextSessions.get(event.sessionId);

  if (!existing) {
    nextSessions.set(event.sessionId, createSessionFromEvent(event));
    return orderSessions([...nextSessions.values()]);
  }

  nextSessions.set(event.sessionId, {
    ...existing,
    currentState: event.state,
    latestActivityAt: Math.max(existing.latestActivityAt, event.timestamp),
    latestEventId: event.id,
    source: event.source,
    sourceKind: event.sourceKind,
    title: event.title,
    workspace: event.workspace ?? existing.workspace,
  });

  return orderSessions([...nextSessions.values()]);
}

function createSessionFromEvent(event: TermPetEvent): TermPetSession {
  return {
    id: event.sessionId,
    source: event.source,
    sourceKind: event.sourceKind,
    workspace: event.workspace,
    title: event.title,
    currentState: event.state,
    latestEventId: event.id,
    latestActivityAt: event.timestamp,
    createdAt: event.timestamp,
  };
}

function orderSessions(sessions: TermPetSession[]): TermPetSession[] {
  return [...sessions].sort((left, right) => {
    return right.latestActivityAt - left.latestActivityAt || right.createdAt - left.createdAt;
  });
}

function orderEvents(events: TermPetEvent[]): TermPetEvent[] {
  return [...events].sort((left, right) => left.timestamp - right.timestamp || left.id.localeCompare(right.id));
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
