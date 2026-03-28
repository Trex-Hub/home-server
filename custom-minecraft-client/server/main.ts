/**
 * main.ts — TCP-over-WebSocket bridge server
 *
 * Accepts WebSocket connections and pipes bytes to/from the Minecraft server
 * via raw TCP, allowing Minecraft traffic to transit Cloudflare Tunnel.
 *
 * Environment variables:
 *   PORT            - WebSocket listen port (default: 8080)
 *   MINECRAFT_HOST  - Minecraft server hostname
 *                     (default: minecraft.minecraft.svc.cluster.local)
 *   MINECRAFT_PORT  - Minecraft server port (default: 25565)
 */

const PORT = parseInt(Deno.env.get("PORT") ?? "8080");
const MINECRAFT_HOST =
  Deno.env.get("MINECRAFT_HOST") ?? "minecraft.minecraft.svc.cluster.local";
const MINECRAFT_PORT = parseInt(Deno.env.get("MINECRAFT_PORT") ?? "25565");

Deno.serve(
  {
    port: PORT,
    onListen: ({ hostname, port }) => {
      console.log(`[ws-bridge] Listening on http://${hostname}:${port}`);
      console.log(
        `[ws-bridge] Minecraft target: ${MINECRAFT_HOST}:${MINECRAFT_PORT}`,
      );
    },
  },
  (req: Request): Response => {
    const url = new URL(req.url);

    // Health check for Kubernetes liveness/readiness probes
    if (url.pathname === "/healthz") {
      return new Response("OK", { status: 200 });
    }

    // WebSocket upgrade — idleTimeout sends RFC-6455 pings every 60s,
    // keeping the connection alive below Cloudflare's 100s idle cutoff.
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req, {
        idleTimeout: 60,
      });

      const clientId =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for") ??
        crypto.randomUUID().slice(0, 8);

      // Fire and forget — errors are isolated per connection
      handleConnection(socket, clientId).catch((err) => {
        console.error(`[ws-bridge] [${clientId}] Unhandled error:`, err);
      });

      return response;
    }

    return new Response("Not Found", { status: 404 });
  },
);

async function handleConnection(
  socket: WebSocket,
  clientId: string,
): Promise<void> {
  let closed = false;
  let conn: Deno.TcpConn | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  function cleanup(reason: string): void {
    if (closed) return;
    closed = true;
    console.log(`[ws-bridge] [${clientId}] Closed (${reason})`);
    try {
      writer?.releaseLock();
    } catch { /* ignore */ }
    try {
      conn?.close();
    } catch { /* ignore */ }
    try {
      socket.close();
    } catch { /* ignore */ }
  }

  await new Promise<void>((resolve) => {
    socket.onopen = () => {
      console.log(`[ws-bridge] [${clientId}] WebSocket connected`);

      (async () => {
        try {
          conn = await Deno.connect({
            hostname: MINECRAFT_HOST,
            port: MINECRAFT_PORT,
          });
          console.log(`[ws-bridge] [${clientId}] Minecraft TCP connected`);

          // Acquire writer once for this connection's lifetime
          writer = conn.writable.getWriter();

          // WebSocket → TCP: forward incoming binary frames to Minecraft
          socket.onmessage = async (e: MessageEvent) => {
            if (closed || !writer) return;
            try {
              await writer.write(new Uint8Array(e.data as ArrayBuffer));
            } catch {
              cleanup("TCP write error");
              resolve();
            }
          };

          // TCP → WebSocket: forward Minecraft bytes back to the client
          try {
            for await (const chunk of conn.readable) {
              if (socket.readyState !== WebSocket.OPEN) break;
              socket.send(chunk);
            }
            socket.close(1000, "TCP EOF");
          } catch {
            socket.close(1011, "TCP read error");
          } finally {
            cleanup("TCP closed");
            resolve();
          }
        } catch (err) {
          console.error(
            `[ws-bridge] [${clientId}] Failed to connect to Minecraft:`,
            err,
          );
          socket.close(1011, "Minecraft unavailable");
          resolve();
        }
      })();
    };

    socket.onclose = (e: CloseEvent) => {
      cleanup(`WebSocket closed (code=${e.code})`);
      resolve();
    };

    socket.onerror = () => {
      cleanup("WebSocket error");
      resolve();
    };
  });
}
