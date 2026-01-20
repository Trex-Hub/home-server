# Migration from Dokploy to Bare K3 Kubernetes

## Overview

I migrated from **Dokploy** (a Docker Swarm-based PaaS) to **bare K3 Kubernetes** for my self-hosted homelab. This document outlines why I made this switch.

## What is Dokploy?

Dokploy is a self-hosted Platform-as-a-Service (PaaS) built on **Docker and Docker Swarm**, using Traefik as the default reverse proxy. It provides a web-based interface for deploying applications, databases, and Docker Compose files, abstracting away the complexity of container orchestration.

## What is K3s?

K3s is a lightweight, fully compliant Kubernetes distribution designed for resource-constrained environments like homelabs. It packages everything needed to run Kubernetes into a single binary, making it ideal for bare metal servers.

## Reasons for Migration

### 1. Lack of Control

Dokploy operates as an abstraction layer over Docker Swarm, which limits my ability to:
- Customize deployment configurations beyond what the UI allows
- Fine-tune networking, resource allocation, or service discovery
- Debug issues directly—I'm stuck debugging through Dokploy's interface rather than the underlying infrastructure

With bare K3s, I have full control over the cluster through `kubectl` and can configure everything exactly how I need it.

### 2. Traefik Lock-In

Most home networks don't have a public IP address, making port forwarding impossible. Dokploy's tight integration with Traefik assumes you can expose services directly, which doesn't work well for homelab setups behind NAT. I had to use **Cloudflare Tunnels** to expose my application.

With K3s, I can use **Cloudflare Tunnels** or any other ingress solution that works with my network constraints. I'm not locked into a single reverse proxy configuration.

### 3. No Learning

The primary goal of this homelab is **learning**. Dokploy's abstraction layer hides how things actually work, preventing me from learning the kinks of managing self hosted servers.

Bare K3s forces me to learn Kubernetes properly and allows full control over the servers.


## Current Setup

After migration, my homelab uses:
- **K3s**: Lightweight Kubernetes distribution
- **ArgoCD**: GitOps continuous delivery
- **Helm**: Package management
- **Cloudflare Tunnels**: Secure ingress without port forwarding
- **Custom Helm Charts**: Infrastructure as code

## References

- [Setup Dokploy](setup-dokploy.MD) - Original setup documentation
- [Setup Ubuntu Server](setup-ubuntu-server.MD) - Server setup guide
- [Setup Cloudflare Tunnels](setup-cloudflare-tunnels.MD) - Network connectivity setup
- [Dokploy Documentation](https://docs.dokploy.com/)
- [K3s Documentation](https://k3s.io/)
