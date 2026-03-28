# Custom Minecraft TCP-over-WebSocket Networking Solution

## Problem

Minecraft Java Edition uses raw TCP on port 25565. The server is hosted inside a
Kubernetes cluster (k3s) on a home network with no public IP exposure. The cluster
uses Cloudflare Tunnel for all external access, which acts as an HTTP/HTTPS reverse
proxy — it cannot forward raw TCP traffic to the public internet without a paid
Cloudflare Spectrum subscription.

***

## Prebuilt Solution — playit.gg

[playit.gg](https://playit.gg) is a free game-server tunneling service. A lightweight
agent pod runs inside the cluster, connects outbound to playit's global network, and
playit routes incoming player connections back through the agent to the Minecraft
service.

Players connect to a playit-issued address (e.g. `something.mc.ply.gg`) using the
standard Minecraft client — no extra software required on the client side.

### Limitations

* Dependent on a third-party service (playit.gg uptime, policy changes, free tier limits)

* No control over the relay infrastructure or routing path

* Address is assigned by playit, not a custom domain (e.g. `mc.dev8s.io`)

* Free tier may impose bandwidth or connection limits in the future

* Another external dependency to maintain alongside Cloudflare

***

## Custom Solution — TCP-over-WebSocket Bridge

### Why

* Full ownership: no third-party dependency beyond Cloudflare (already in use)

* Players connect via `mc.dev8s.io` — a real, owned subdomain

* Traffic flows entirely through the existing Cloudflare Tunnel (HTTP/WebSocket),
  which is already set up and free

* Educational: understand the full networking stack end-to-end

* Removes playit.gg as a single point of failure

### How

Cloudflare Tunnel supports HTTP and WebSocket (WS/WSS) traffic natively through
public hostnames. The idea is to wrap Minecraft's raw TCP stream inside a WebSocket
connection so it looks like HTTP traffic to Cloudflare.

#### Architecture

```
Friend's machine                         Kubernetes cluster (home server)
─────────────────────────────────────    ────────────────────────────────────────────
Minecraft Launcher                       WebSocket Bridge Pod
  connects to localhost:25565              listens for WebSocket on :8080
        │                                        │
client-bridge.js (Node)                   unwraps WebSocket frames → raw TCP
  listens on TCP :25565                          │
  wraps bytes into WebSocket frames      minecraft Service (ClusterIP)
        │                                  minecraft.minecraft.svc.cluster.local:25565
        └──── wss://mc.dev8s.io ──────────────────┘
                    │
          Cloudflare Tunnel
          (existing HTTP/WS tunnel)
```

#### Server Side (runs in the cluster)

A small WebSocket server pod deployed in the `minecraft` namespace. When a WebSocket
connection arrives, it opens a raw TCP connection to
`minecraft.minecraft.svc.cluster.local:25565` and pipes bytes bidirectionally between
the WebSocket and the TCP socket.

Exposed via the existing Cloudflare Tunnel using a new public hostname:
`mc.dev8s.io → http://ws-bridge.minecraft.svc.cluster.local:8080`

Estimated ~40 lines of Node.js (using the `ws` package) or \~30 lines of Go
(`golang.org/x/net/websocket` or `gorilla/websocket`).

#### Client Side (friends run this once)

A small Node.js script (`bridge.js`) that:

1. Listens on `localhost:25565` (standard TCP)
2. When Minecraft connects, opens a WebSocket connection to `wss://mc.dev8s.io`
3. Pipes bytes between the local TCP socket and the WebSocket

Friends run `node bridge.js` once before launching TLauncher, then add `localhost`
as a server in Minecraft. No install, no account, single file.

#### Deployment

* Server: a new Helm chart (`charts/templates/ws-bridge/`) following the same
  pattern as `cloudflare-tunnel-remote` and `playit`

* Helmfile: `charts/ws-bridge.helmfile.yaml`, namespace `minecraft`

* Cloudflare dashboard: add public hostname `mc.dev8s.io → http://ws-bridge.minecraft:8080`

### Limitations

* Friends must run `node bridge.js` before every session (one command, but still
  an extra step compared to a direct connection)

* Requires Node.js installed on each friend's machine (or bundle with `pkg`/`nexe`
  into a single executable to remove this requirement)

* WebSocket adds a small framing overhead (\~2-14 bytes per frame) — negligible for
  Minecraft's traffic patterns but technically not zero-cost

* If Cloudflare changes WebSocket support or rate-limits connections, this breaks

* The bridge pod is a single point of failure (mitigated with `replicaCount: 2` and
  a ClusterIP service in front)

* Does not support UDP — fine for Java Edition, would need a different approach for
  Bedrock Edition (QUIC/UDP)

