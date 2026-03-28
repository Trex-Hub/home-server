/**
 * bridge.ts — TCP-over-WebSocket client bridge
 *
 * Listens on localhost:25565 (standard Minecraft port).
 * For each incoming Minecraft launcher connection, opens a WebSocket tunnel
 * to the ws-bridge server and pipes bytes bidirectionally.
 *
 * Usage:
 *   deno run --allow-net --allow-env client/bridge.ts [wss://mc.example.com]
 *   WS_TARGET=wss://mc.example.com deno run --allow-net --allow-env client/bridge.ts
 */

const DEFAULT_TARGET = "wss://mc.dev8s.io";
const LISTEN_PORT = 25565;
const LISTEN_HOST = "127.0.0.1";

const targetUrl: string =
  Deno.args[0] ?? Deno.env.get("WS_TARGET") ?? DEFAULT_TARGET;

const listener = Deno.listen({ hostname: LISTEN_HOST, port: LISTEN_PORT });

console.log(`[bridge] Listening on ${LISTEN_HOST}:${LISTEN_PORT}`);
console.log(`[bridge] Tunneling to ${targetUrl}`);
console.log(`[bridge] Add "localhost" as a server in Minecraft and connect.`);

for await (const conn of listener) {
  handleClientConn(conn).catch((err) => {
    console.error("[bridge] Unhandled connection error:", err);
  });
}

async function handleClientConn(conn: Deno.TcpConn): Promise<void> {
  const remote = `${(conn.remoteAddr as Deno.NetAddr).hostname}:${(conn.remoteAddr as Deno.NetAddr).port}`;
  console.log(`[bridge] [${remote}] Minecraft connected, opening tunnel...`);

  let closed = false;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  function cleanup(reason: string): void {
    if (closed) return;
    closed = true;
    console.log(`[bridge] [${remote}] Closed (${reason})`);
    try { writer?.releaseLock(); } catch { /* ignore */ }
    try { conn.close(); } catch { /* already closed */ }
  }

  const ws = new WebSocket(targetUrl);
  ws.binaryType = "arraybuffer";

  await new Promise<void>((resolve) => {
    ws.onopen = () => {
      console.log(`[bridge] [${remote}] Tunnel open`);

      // Acquire writer once for the lifetime of this connection
      writer = conn.writable.getWriter();

      // WebSocket → TCP: forward bytes from tunnel back to Minecraft
      ws.onmessage = async (e: MessageEvent) => {
        if (closed || !writer) return;
        try {
          await writer.write(new Uint8Array(e.data as ArrayBuffer));
        } catch {
          cleanup("TCP write error");
          resolve();
        }
      };

      // TCP → WebSocket: forward bytes from Minecraft into the tunnel
      (async () => {
        try {
          for await (const chunk of conn.readable) {
            if (ws.readyState !== WebSocket.OPEN) break;
            ws.send(chunk);
          }
          ws.close(1000, "TCP EOF");
        } catch {
          ws.close(1011, "TCP read error");
        } finally {
          cleanup("TCP closed");
          resolve();
        }
      })();
    };

    ws.onclose = (e: CloseEvent) => {
      cleanup(`WebSocket closed (code=${e.code})`);
      resolve();
    };

    ws.onerror = () => {
      cleanup("WebSocket error");
      resolve();
    };
  });
}
