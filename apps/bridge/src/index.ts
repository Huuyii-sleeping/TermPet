import { createServer } from "node:http";
import { normalizeEvent } from "@termpet/protocol";
import type {
  TermPetBridgeEventMessage,
  TermPetBridgeSessionDetail,
  TermPetBridgeSnapshotMessage,
  TermPetBridgeState,
  TermPetEvent,
  TermPetSession,
} from "@termpet/protocol";
import { WebSocket, WebSocketServer } from "ws";

const host = "127.0.0.1";
const port = Number(process.env.TERM_PET_BRIDGE_PORT ?? 47631);
const maxRecentEvents = Number(process.env.TERM_PET_RECENT_EVENTS_LIMIT ?? 100);
const recentEvents: TermPetEvent[] = [];
const eventIds = new Set<string>();
const sessions = new Map<string, TermPetSession>();
let updatedAt = Date.now();

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        ok: true,
        activeSessionId: getActiveSessionId(),
        sessions: sessions.size,
      }),
    );
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/state") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(getBridgeState()));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/sessions") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        activeSessionId: getActiveSessionId(),
        sessions: getOrderedSessions(),
        updatedAt,
      }),
    );
    return;
  }

  if (request.method === "GET" && requestUrl.pathname.startsWith("/sessions/")) {
    const sessionId = decodeURIComponent(requestUrl.pathname.slice("/sessions/".length));
    const detail = getSessionDetail(sessionId);

    if (!detail) {
      response.writeHead(404, {
        "access-control-allow-origin": "*",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ error: "session_not_found" }));
      return;
    }

    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(detail));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/events") {
    const sessionId = requestUrl.searchParams.get("sessionId") ?? undefined;
    const limit = parseLimit(requestUrl.searchParams.get("limit"));
    const events = sessionId ? getRecentEventsForSession(sessionId) : [...recentEvents];
    const result = typeof limit === "number" ? events.slice(-limit) : events;

    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(result));
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/events") {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    const event = normalizeEvent(payload);

    if (eventIds.has(event.id)) {
      response.writeHead(202, {
        "access-control-allow-origin": "*",
        "content-type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          accepted: true,
          duplicated: true,
          eventId: event.id,
          activeSessionId: getActiveSessionId(),
        }),
      );
      return;
    }

    recordEvent(event);
    broadcastEvent(event);

    response.writeHead(202, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(
      JSON.stringify({
        accepted: true,
        eventId: event.id,
        activeSessionId: getActiveSessionId(),
      }),
    );
    return;
  }

  response.writeHead(404, {
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify({ error: "not_found" }));
});

const webSocketServer = new WebSocketServer({ server, path: "/events" });

webSocketServer.on("connection", (client) => {
  sendMessage(client, {
    type: "snapshot",
    state: getBridgeState(),
  });
});

function recordEvent(event: TermPetEvent) {
  eventIds.add(event.id);
  recentEvents.push(event);
  trimRecentEvents();
  upsertSession(event);
  updatedAt = Date.now();
}

function trimRecentEvents() {
  while (recentEvents.length > maxRecentEvents) {
    const removed = recentEvents.shift();
    if (removed) {
      eventIds.delete(removed.id);
    }
  }
}

function upsertSession(event: TermPetEvent) {
  const existing = sessions.get(event.sessionId);

  if (!existing) {
    sessions.set(event.sessionId, {
      id: event.sessionId,
      source: event.source,
      sourceKind: event.sourceKind,
      workspace: event.workspace,
      title: event.title,
      currentState: event.state,
      latestEventId: event.id,
      latestActivityAt: event.timestamp,
      createdAt: event.timestamp,
    });
    return;
  }

  if (event.timestamp >= existing.latestActivityAt) {
    sessions.set(event.sessionId, {
      ...existing,
      source: event.source,
      sourceKind: event.sourceKind,
      workspace: event.workspace ?? existing.workspace,
      title: event.title,
      currentState: event.state,
      latestEventId: event.id,
      latestActivityAt: event.timestamp,
    });
    return;
  }

  sessions.set(event.sessionId, existing);
}

function getOrderedSessions(): TermPetSession[] {
  return [...sessions.values()].sort((left, right) => {
    return right.latestActivityAt - left.latestActivityAt || right.createdAt - left.createdAt;
  });
}

function getActiveSessionId(): string | undefined {
  return getOrderedSessions()[0]?.id;
}

function getBridgeState(): TermPetBridgeState {
  const orderedSessions = getOrderedSessions();
  const activeSessionId = orderedSessions[0]?.id;

  return {
    activeSessionId,
    activeSession: orderedSessions[0],
    sessions: orderedSessions,
    recentEvents: [...recentEvents],
    updatedAt,
  };
}

function getRecentEventsForSession(sessionId: string): TermPetEvent[] {
  return recentEvents.filter((event) => event.sessionId === sessionId);
}

function getSessionDetail(sessionId: string): TermPetBridgeSessionDetail | undefined {
  const session = sessions.get(sessionId);
  if (!session) {
    return undefined;
  }

  return {
    session,
    recentEvents: getRecentEventsForSession(sessionId),
    isActive: getActiveSessionId() === sessionId,
  };
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function broadcastEvent(event: TermPetEvent) {
  const message: TermPetBridgeEventMessage = {
    type: "event",
    event,
    activeSessionId: getActiveSessionId(),
    updatedAt,
  };

  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      sendMessage(client, message);
    }
  }
}

function sendMessage(client: WebSocket, message: TermPetBridgeEventMessage | TermPetBridgeSnapshotMessage) {
  client.send(JSON.stringify(message));
}

server.listen(port, host, () => {
  console.log(`桌宠桥接服务已启动：http://${host}:${port}`);
});
