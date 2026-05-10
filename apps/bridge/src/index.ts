import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { normalizeEvent } from "@termpet/protocol";
import type {
  TermPetAction,
  TermPetActionRequest,
  TermPetActionResult,
  TermPetAuditRecord,
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
const maxRecentSessions = Number(process.env.TERM_PET_RECENT_SESSIONS_LIMIT ?? 50);
const maxAuditRecords = Number(process.env.TERM_PET_AUDIT_LIMIT ?? 200);
const persistenceFilePath =
  process.env.TERM_PET_BRIDGE_STORE_FILE ?? path.join(process.cwd(), ".termpet", "bridge-store.json");

const recentEvents: TermPetEvent[] = [];
const auditRecords: TermPetAuditRecord[] = [];
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

  if (request.method === "GET" && requestUrl.pathname === "/audit") {
    const limit = parseLimit(requestUrl.searchParams.get("limit"));
    const result = typeof limit === "number" ? auditRecords.slice(-limit).reverse() : [...auditRecords].reverse();

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

  if (request.method === "POST" && requestUrl.pathname === "/actions") {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Partial<TermPetActionRequest>;
    const actionRequest = normalizeActionRequest(payload);
    const actionResult = routeAction(actionRequest);

    response.writeHead(actionResult.ok ? 200 : 400, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(actionResult));
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

export async function loadPersistedBridgeStore() {
  try {
    const content = await readFile(persistenceFilePath, "utf8");
    const parsed = JSON.parse(content) as Partial<{
      recentEvents: TermPetEvent[];
      sessions: TermPetSession[];
      auditRecords: TermPetAuditRecord[];
      updatedAt: number;
    }>;

    recentEvents.length = 0;
    eventIds.clear();
    sessions.clear();
    auditRecords.length = 0;

    for (const event of parsed.recentEvents ?? []) {
      recentEvents.push(event);
      eventIds.add(event.id);
    }

    for (const session of parsed.sessions ?? []) {
      sessions.set(session.id, session);
    }

    for (const record of parsed.auditRecords ?? []) {
      auditRecords.push(record);
    }

    updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now();
    trimRecentEvents();
    trimSessions();
    trimAuditRecords();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("桥接历史恢复失败，已回退为空状态。", error);
    }
  }
}

export async function persistBridgeStore() {
  try {
    await mkdir(path.dirname(persistenceFilePath), { recursive: true });
    await writeFile(
      persistenceFilePath,
      JSON.stringify(
        {
          recentEvents,
          sessions: getOrderedSessions(),
          auditRecords,
          updatedAt,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (error) {
    console.warn("桥接历史持久化失败。", error);
  }
}

function persistBridgeStoreSoon() {
  void persistBridgeStore();
}

export function recordEvent(event: TermPetEvent) {
  eventIds.add(event.id);
  recentEvents.push(event);
  trimRecentEvents();
  upsertSession(event);
  updatedAt = Date.now();
  persistBridgeStoreSoon();
}

function trimRecentEvents() {
  while (recentEvents.length > maxRecentEvents) {
    const removed = recentEvents.shift();
    if (removed) {
      eventIds.delete(removed.id);
    }
  }
}

function trimSessions() {
  const orderedSessions = getOrderedSessions();
  if (orderedSessions.length <= maxRecentSessions) {
    return;
  }

  for (const session of orderedSessions.slice(maxRecentSessions)) {
    sessions.delete(session.id);
  }
}

function trimAuditRecords() {
  while (auditRecords.length > maxAuditRecords) {
    auditRecords.shift();
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
    trimSessions();
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
    trimSessions();
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

export function getBridgeState(): TermPetBridgeState {
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

export function getAuditRecords(): TermPetAuditRecord[] {
  return [...auditRecords];
}

export function routeAction(actionRequest: TermPetActionRequest): TermPetActionResult {
  const event = recentEvents.find((item) => item.id === actionRequest.eventId && item.sessionId === actionRequest.sessionId);
  if (!event) {
    return {
      protocolVersion: "1.0",
      actionId: actionRequest.actionId,
      eventId: actionRequest.eventId,
      sessionId: actionRequest.sessionId,
      source: actionRequest.source,
      kind: actionRequest.kind,
      ok: false,
      handledBy: "bridge",
      message: "未找到对应事件，当前动作无法执行。",
      timestamp: Date.now(),
    };
  }

  const action = event.actions?.find((item) => item.id === actionRequest.actionId);
  if (!action) {
    return {
      protocolVersion: "1.0",
      actionId: actionRequest.actionId,
      eventId: actionRequest.eventId,
      sessionId: actionRequest.sessionId,
      source: actionRequest.source,
      kind: actionRequest.kind,
      ok: false,
      handledBy: "bridge",
      message: "未找到对应动作定义，当前动作无法执行。",
      timestamp: Date.now(),
    };
  }

  const result = createActionResult(actionRequest, action, event);
  recordActionAudit(actionRequest, result, event);
  return result;
}

export function createActionResult(actionRequest: TermPetActionRequest, action: TermPetAction, event: TermPetEvent): TermPetActionResult {
  switch (action.kind) {
    case "open_detail":
      return {
        protocolVersion: "1.0",
        actionId: actionRequest.actionId,
        eventId: actionRequest.eventId,
        sessionId: actionRequest.sessionId,
        source: actionRequest.source,
        kind: actionRequest.kind,
        ok: true,
        handledBy: "bridge",
        message: "详情已在桌宠内展开，可直接查看当前摘要。",
        timestamp: Date.now(),
      };
    case "dismiss":
      return {
        protocolVersion: "1.0",
        actionId: actionRequest.actionId,
        eventId: actionRequest.eventId,
        sessionId: actionRequest.sessionId,
        source: actionRequest.source,
        kind: actionRequest.kind,
        ok: true,
        handledBy: "bridge",
        message: "当前提醒已在本地收起。",
        timestamp: Date.now(),
      };
    default:
      return {
        protocolVersion: "1.0",
        actionId: actionRequest.actionId,
        eventId: actionRequest.eventId,
        sessionId: actionRequest.sessionId,
        source: actionRequest.source,
        kind: actionRequest.kind,
        ok: true,
        handledBy: "terminal_fallback",
        message: buildTerminalFallbackMessage(action, event),
        requiresTerminalFallback: true,
        timestamp: Date.now(),
      };
  }
}

function recordActionAudit(actionRequest: TermPetActionRequest, actionResult: TermPetActionResult, event: TermPetEvent) {
  auditRecords.push({
    id: `audit_${actionRequest.actionId}_${actionResult.timestamp}`,
    actionId: actionRequest.actionId,
    actionKind: actionRequest.kind,
    eventId: actionRequest.eventId,
    sessionId: actionRequest.sessionId,
    source: actionRequest.source,
    workspace: event.workspace,
    ok: actionResult.ok,
    handledBy: actionResult.handledBy,
    message: actionResult.message,
    requiresTerminalFallback: actionResult.requiresTerminalFallback,
    timestamp: actionResult.timestamp,
  });
  trimAuditRecords();
  persistBridgeStoreSoon();
}

function buildTerminalFallbackMessage(action: TermPetAction, event: TermPetEvent): string {
  const base = action.kind === "open_terminal" ? "请返回终端继续处理当前操作。" : `当前动作“${action.label}”暂不支持桌宠内直接回传。`;
  return `${base}${event.workspace ? ` 工作目录：${event.workspace}` : ""}`;
}

export function normalizeActionRequest(input: Partial<TermPetActionRequest>): TermPetActionRequest {
  return {
    protocolVersion: "1.0",
    actionId: typeof input.actionId === "string" ? input.actionId : "unknown_action",
    eventId: typeof input.eventId === "string" ? input.eventId : "unknown_event",
    sessionId: typeof input.sessionId === "string" ? input.sessionId : "default",
    source: typeof input.source === "string" ? input.source : "unknown",
    kind: asActionKind(input.kind),
    metadata: typeof input.metadata === "object" && input.metadata !== null ? input.metadata : undefined,
  };
}

function asActionKind(value: TermPetActionRequest["kind"] | undefined): TermPetAction["kind"] {
  const kinds: TermPetAction["kind"][] = ["approve", "deny", "open_detail", "open_terminal", "dismiss", "rerun", "stop"];
  return kinds.includes(value as TermPetAction["kind"]) ? (value as TermPetAction["kind"]) : "open_detail";
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

export function resetBridgeStateForTest() {
  recentEvents.length = 0;
  auditRecords.length = 0;
  eventIds.clear();
  sessions.clear();
  updatedAt = Date.now();
}

export const bridgeReady = (async () => {
  await loadPersistedBridgeStore();

  if (process.env.TERM_PET_BRIDGE_DISABLE_SERVER !== "1") {
    server.listen(port, host, () => {
      console.log(`桌宠桥接服务已启动：http://${host}:${port}`);
    });
  }
})();
