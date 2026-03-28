# Requirements: TCP-over-WebSocket Bridge (Deno/TypeScript)

## Overview

A custom two-component bridge that tunnels Minecraft Java Edition's raw TCP traffic through WebSocket so it can transit the existing Cloudflare Tunnel infrastructure. This eliminates the dependency on playit.gg while retaining the use of an owned domain (`mc.dev8s.io`).

**Tech stack:** Deno + TypeScript (server and client)

---

## Components

| Component | Runtime | Where it runs |
|---|---|---|
| `ws-bridge` (server) | Deno | Kubernetes cluster — `minecraft` namespace |
| `bridge` (client) | Deno | Friend's local machine |

---

## Functional Requirements

### Server — `ws-bridge`

| ID | Requirement |
|----|-------------|
| S-01 | Accept incoming WebSocket connections on port `8080` |
| S-02 | On each new WebSocket connection, open a raw TCP connection to `minecraft.minecraft.svc.cluster.local:25565` |
| S-03 | Bidirectionally pipe bytes between the WebSocket connection and the TCP socket |
| S-04 | Close both the WebSocket and TCP socket when either side disconnects or errors |
| S-05 | Handle multiple concurrent connections (one WebSocket↔TCP pair per player) |
| S-06 | Log connection open, close, and error events with timestamp and remote address |
| S-07 | Respond to HTTP `GET /healthz` with `200 OK` (for Kubernetes liveness/readiness probes) |

### Client — `bridge`

| ID | Requirement |
|----|-------------|
| C-01 | Accept a configurable target WebSocket URL (default: `wss://mc.dev8s.io`) via CLI argument or environment variable |
| C-02 | Listen for incoming TCP connections on `localhost:25565` |
| C-03 | On each new TCP connection from the Minecraft launcher, open a WebSocket connection to the configured URL |
| C-04 | Bidirectionally pipe bytes between the local TCP socket and the WebSocket connection |
| C-05 | Close both the TCP socket and WebSocket when either side disconnects or errors |
| C-06 | Support multiple concurrent connections (i.e. do not block on one connection) |
| C-07 | Print clear startup message indicating the listening address and target URL |
| C-08 | Print connection open/close events to stdout for basic user visibility |

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-01 | Both components must be written in TypeScript and run under Deno (no Node.js) |
| NF-02 | No third-party Deno modules; use only Deno standard library and built-in APIs (`Deno.listen`, `Deno.connect`, `WebSocket`, `Deno.serve`) |
| NF-03 | Server binary/image must be minimal — target under 50 MB container image |
| NF-04 | Client must be distributable as a single `.ts` file runnable with `deno run` |
| NF-05 | Client must be compilable to a standalone executable via `deno compile` to remove the Deno install requirement for friends |
| NF-06 | Latency overhead introduced by the bridge must be negligible for Minecraft gameplay (framing overhead only, no buffering delay) |
| NF-07 | Server must support at least 10 simultaneous player connections without degradation |
| NF-08 | Server must not crash on a single connection error; errors must be isolated per-connection |

---

## Architecture

```
Friend's machine                         Kubernetes cluster (home server)
─────────────────────────────────────    ─────────────────────────────────────────
Minecraft Launcher                       ws-bridge pod (Deno)
  connects to localhost:25565              Deno.serve on :8080 (WebSocket upgrade)
        │                                        │
bridge (Deno client)                      unwraps WebSocket → raw TCP
  Deno.listen on TCP :25565                      │
  wraps bytes into WebSocket frames       minecraft Service (ClusterIP)
        │                                  minecraft.minecraft.svc.cluster.local:25565
        └──── wss://mc.dev8s.io ──────────────────┘
                    │
          Cloudflare Tunnel
          (existing HTTP/WS tunnel — no changes needed)
```

---

## Server Implementation Details

- **Entry point:** `server/main.ts`
- **WebSocket upgrade:** Use `Deno.serve` with `Deno.upgradeWebSocket` to upgrade HTTP requests to WebSocket
- **TCP connection:** Use `Deno.connect({ hostname, port })` per accepted WebSocket
- **Piping:** Use `ReadableStream` / `WritableStream` or manual async loops to relay bytes in both directions
- **Health endpoint:** `GET /healthz` → `200 OK`, handled before WebSocket upgrade check
- **Target host/port:** Configurable via environment variables `MINECRAFT_HOST` (default: `minecraft.minecraft.svc.cluster.local`) and `MINECRAFT_PORT` (default: `25565`)
- **Listen port:** Configurable via `PORT` env var (default: `8080`)

---

## Client Implementation Details

- **Entry point:** `client/bridge.ts`
- **TCP listener:** `Deno.listen({ port: 25565 })`
- **WebSocket connection:** Native `WebSocket` API (available in Deno)
- **Target URL:** Configurable via first CLI arg or `WS_TARGET` env var (default: `wss://mc.dev8s.io`)
- **Binary mode:** WebSocket messages must use `Blob`/`ArrayBuffer` (binary), not text frames
- **Compilation target:** `deno compile --target` for Windows, macOS, and Linux

---

## Deployment Requirements

### Kubernetes (server)

| ID | Requirement |
|----|-------------|
| D-01 | Deploy as a new Helm chart at `charts/ws-bridge/` following the existing chart conventions in this repo |
| D-02 | Create `charts/ws-bridge.helmfile.yaml` targeting the `minecraft` namespace |
| D-03 | Set `replicaCount: 2` for basic availability |
| D-04 | Define `resources.requests` and `resources.limits` (CPU and memory) on the container |
| D-05 | Configure a `ClusterIP` Service exposing port `8080` |
| D-06 | Add liveness and readiness probes pointing to `GET /healthz` |
| D-07 | Use a specific, pinned image tag — no `latest` |
| D-08 | Cloudflare Tunnel public hostname: `mc.dev8s.io → http://ws-bridge.minecraft.svc.cluster.local:8080` (configured in Cloudflare dashboard or via existing tunnel Helm values) |

### Client distribution

| ID | Requirement |
|----|-------------|
| D-09 | Provide pre-compiled binaries for Windows (`.exe`), macOS, and Linux via `deno compile` |
| D-10 | Document the one-command run instructions: `./bridge` (compiled) or `deno run --allow-net client/bridge.ts` |

---

## Permissions (Deno)

| Component | Required Deno permissions |
|-----------|--------------------------|
| Server | `--allow-net` |
| Client | `--allow-net` |

No filesystem, env (unless reading env vars), or subprocess permissions required beyond `--allow-net` and optionally `--allow-env`.

---

## Out of Scope

- UDP/Bedrock Edition support (Java Edition TCP only)
- Authentication or TLS termination at the bridge level (Cloudflare handles TLS)
- Rate limiting or DDoS protection (delegated to Cloudflare)
- A custom launcher or Minecraft mod — friends use the standard Minecraft launcher unchanged
