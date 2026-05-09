import { createServer } from "node:http";
import { normalizeEvent } from "@termpet/protocol";
import type { TermPetEvent } from "@termpet/protocol";
import { WebSocket, WebSocketServer } from "ws";

const host = "127.0.0.1";
const port = Number(process.env.TERM_PET_BRIDGE_PORT ?? 47631);
const recentEvents: TermPetEvent[] = [];

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "GET" && request.url === "/events") {
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(recentEvents));
    return;
  }

  if (request.method === "POST" && request.url === "/events") {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    const event = normalizeEvent(payload);
    recentEvents.push(event);
    recentEvents.splice(0, Math.max(0, recentEvents.length - 100));
    broadcast(event);

    response.writeHead(202, {
      "access-control-allow-origin": "*",
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ accepted: true, eventId: event.id }));
    return;
  }

  response.writeHead(404, {
    "access-control-allow-origin": "*",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify({ error: "not_found" }));
});

const webSocketServer = new WebSocketServer({ server, path: "/events" });

function broadcast(event: TermPetEvent) {
  const message = JSON.stringify(event);

  for (const client of webSocketServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

server.listen(port, host, () => {
  console.log(`桌宠桥接服务已启动：http://${host}:${port}`);
});
