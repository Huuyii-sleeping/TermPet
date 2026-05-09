import type { TermPetEvent } from "@termpet/protocol";

export type BridgeEventHandler = (event: TermPetEvent) => void;

export interface BridgeClient {
  connect(): void;
  disconnect(): void;
}

export function createBridgeClient(onEvent: BridgeEventHandler): BridgeClient {
  let socket: WebSocket | undefined;

  return {
    connect() {
      socket = new WebSocket("ws://127.0.0.1:47631/events");
      socket.addEventListener("message", (message) => {
        onEvent(JSON.parse(String(message.data)) as TermPetEvent);
      });
    },
    disconnect() {
      socket?.close();
      socket = undefined;
    },
  };
}
