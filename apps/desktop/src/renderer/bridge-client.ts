import type {
  TermPetActionRequest,
  TermPetActionResult,
  TermPetBridgeEventMessage,
  TermPetBridgeMessage,
  TermPetBridgeSessionDetail,
  TermPetBridgeState,
  TermPetEvent,
} from "@termpet/protocol";

export type BridgeConnectionState = "connecting" | "connected" | "offline";

export interface BridgeClientHandlers {
  onConnectionStateChange?: (state: BridgeConnectionState) => void;
  onError?: (error: Error) => void;
  onEvent?: (message: TermPetBridgeEventMessage) => void;
  onSnapshot?: (state: TermPetBridgeState) => void;
  reconnectDelayMs?: number;
}

export interface BridgeClient {
  connect(): void;
  disconnect(): void;
}

const bridgeBaseUrl = "http://127.0.0.1:47631";
const defaultReconnectDelayMs = 1500;

export function createBridgeClient({
  onConnectionStateChange,
  onError,
  onEvent,
  onSnapshot,
  reconnectDelayMs = defaultReconnectDelayMs,
}: BridgeClientHandlers): BridgeClient {
  let disposed = false;
  let reconnectTimer: number | undefined;
  let socket: WebSocket | undefined;

  function clearReconnectTimer() {
    if (typeof reconnectTimer === "number") {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function scheduleReconnect() {
    if (disposed || typeof reconnectTimer === "number") {
      return;
    }

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = undefined;
      openSocket();
    }, reconnectDelayMs);
  }

  function openSocket() {
    if (disposed) {
      return;
    }

    clearReconnectTimer();
    onConnectionStateChange?.("connecting");

    const nextSocket = new WebSocket("ws://127.0.0.1:47631/events");
    socket = nextSocket;

    nextSocket.addEventListener("open", () => {
      if (socket !== nextSocket || disposed) {
        return;
      }

      onConnectionStateChange?.("connected");
    });

    nextSocket.addEventListener("message", (message) => {
      const payload = JSON.parse(String(message.data)) as TermPetBridgeMessage | TermPetEvent;

      if (isBridgeEventMessage(payload)) {
        onEvent?.(payload);
        return;
      }

      if (isBridgeSnapshotMessage(payload)) {
        onSnapshot?.(payload.state);
        return;
      }

      if (isTermPetEvent(payload)) {
        onEvent?.({
          type: "event",
          event: payload,
          updatedAt: payload.timestamp,
        });
      }
    });

    nextSocket.addEventListener("error", () => {
      onError?.(new Error("bridge_socket_error"));
    });

    nextSocket.addEventListener("close", () => {
      if (socket === nextSocket) {
        socket = undefined;
      }

      if (disposed) {
        return;
      }

      onConnectionStateChange?.("offline");
      scheduleReconnect();
    });
  }

  return {
    connect() {
      disposed = false;
      if (socket) {
        return;
      }

      openSocket();
    },
    disconnect() {
      disposed = true;
      clearReconnectTimer();
      socket?.close();
      socket = undefined;
    },
  };
}

export async function fetchBridgeState(options?: { signal?: AbortSignal }): Promise<TermPetBridgeState> {
  const response = await fetch(`${bridgeBaseUrl}/state`, { signal: options?.signal });
  if (!response.ok) {
    throw new Error(`bridge_state_request_failed:${response.status}`);
  }

  return (await response.json()) as TermPetBridgeState;
}

export async function fetchBridgeSession(sessionId: string): Promise<TermPetBridgeSessionDetail> {
  const response = await fetch(`${bridgeBaseUrl}/sessions/${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error(`bridge_session_request_failed:${response.status}`);
  }

  return (await response.json()) as TermPetBridgeSessionDetail;
}

export async function invokeBridgeAction(request: TermPetActionRequest): Promise<TermPetActionResult> {
  const response = await fetch(`${bridgeBaseUrl}/actions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`bridge_action_request_failed:${response.status}`);
  }

  return (await response.json()) as TermPetActionResult;
}

function isBridgeEventMessage(value: TermPetBridgeMessage | TermPetEvent): value is Extract<TermPetBridgeMessage, { type: "event" }> {
  return typeof value === "object" && value !== null && "type" in value && value.type === "event" && "event" in value;
}

function isBridgeSnapshotMessage(value: TermPetBridgeMessage | TermPetEvent): value is Extract<TermPetBridgeMessage, { type: "snapshot" }> {
  return typeof value === "object" && value !== null && "type" in value && value.type === "snapshot" && "state" in value;
}

function isTermPetEvent(value: TermPetBridgeMessage | TermPetEvent): value is TermPetEvent {
  return typeof value === "object" && value !== null && "protocolVersion" in value && "sessionId" in value;
}
