import type { TermPetBridgeMessage, TermPetBridgeSessionDetail, TermPetBridgeState, TermPetEvent } from "@termpet/protocol";

export type BridgeEventHandler = (event: TermPetEvent) => void;
export type BridgeSnapshotHandler = (state: TermPetBridgeState) => void;

export interface BridgeClient {
  connect(): void;
  disconnect(): void;
}

const bridgeBaseUrl = "http://127.0.0.1:47631";

export function createBridgeClient(onEvent: BridgeEventHandler, onSnapshot?: BridgeSnapshotHandler): BridgeClient {
  let socket: WebSocket | undefined;

  return {
    connect() {
      socket = new WebSocket("ws://127.0.0.1:47631/events");
      socket.addEventListener("message", (message) => {
        const payload = JSON.parse(String(message.data)) as TermPetBridgeMessage | TermPetEvent;

        if (isBridgeEventMessage(payload)) {
          onEvent(payload.event);
          return;
        }

        if (isBridgeSnapshotMessage(payload)) {
          onSnapshot?.(payload.state);
          return;
        }

        if (isTermPetEvent(payload)) {
          onEvent(payload);
        }
      });
    },
    disconnect() {
      socket?.close();
      socket = undefined;
    },
  };
}

export async function fetchBridgeState(): Promise<TermPetBridgeState> {
  const response = await fetch(`${bridgeBaseUrl}/state`);
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

function isBridgeEventMessage(value: TermPetBridgeMessage | TermPetEvent): value is Extract<TermPetBridgeMessage, { type: "event" }> {
  return typeof value === "object" && value !== null && "type" in value && value.type === "event" && "event" in value;
}

function isBridgeSnapshotMessage(value: TermPetBridgeMessage | TermPetEvent): value is Extract<TermPetBridgeMessage, { type: "snapshot" }> {
  return typeof value === "object" && value !== null && "type" in value && value.type === "snapshot" && "state" in value;
}

function isTermPetEvent(value: TermPetBridgeMessage | TermPetEvent): value is TermPetEvent {
  return typeof value === "object" && value !== null && "protocolVersion" in value && "sessionId" in value;
}
