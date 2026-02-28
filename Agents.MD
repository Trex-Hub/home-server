# devs-home-server — Agent Instructions

This repository maintains and version-controls a self-hosted homeserver. The goal is to **keep things stable**, **document decisions**, and treat infrastructure as code.

## Project Overview

- **Stack**: K3s (bare metal), ArgoCD (GitOps), Helm, Cloudflare Tunnels
- **Migration**: Migrated from Dokploy (Docker Swarm) to bare K3s for full control and learning

## Dev Environment Tips

- **Kubernetes**: Use `kubectl` with the cluster context in `k3.access.yaml` (if present). Never assume cluster access.
- **Helm**: Charts live in `charts/`. Use `helmfile` for releases (e.g. `charts/argocd.helmfile.yaml`, `charts/cloudflare-tunnel.helmfile.yaml`).
- **ArgoCD**: Applications are managed via GitOps. Changes to manifests/charts are synced by ArgoCD—avoid manual `kubectl apply` for managed resources.
- **Skills**: Use `.agents/skills/devops-engineer`, `kubernetes-specialist`, and `argocd-expert` when working on CI/CD, K8s manifests, or ArgoCD.

## Testing & Validation

- **Helm**: Run `helm template` or `helm upgrade --dry-run` before applying chart changes.
- **ArgoCD**: After pushing, verify sync status in ArgoCD UI or via `argocd app get <app-name>`.
- **Stability**: Prefer small, incremental changes. Document rollback steps for risky changes.
- **Secrets**: Never commit secrets. Use Kubernetes Secrets, Sealed Secrets, or external secret managers.

## PR & Change Instructions

- **Commit format**: Use clear, descriptive messages. Prefer `feat:`, `fix:`, `docs:`, `chore:` prefixes.
- **Document decisions**: For non-obvious changes, add or update `.MD` docs (e.g. migration notes, setup guides).
- **Stability first**: Avoid breaking changes without a migration path. Prefer additive changes over removals.
- **Review**: For infrastructure changes, verify that ArgoCD can sync and that no manual drift is introduced.

## Coding Conventions

- **YAML**: Use consistent indentation (2 spaces). Validate with `yamllint` when available.
- **Helm values**: Keep values in `values.yaml`; avoid hardcoding in templates.
- **Resource limits**: Always set `requests` and `limits` on containers (see `kubernetes-specialist` skill).
- **GitOps**: All deployable config should live in Git. No manual cluster changes for managed resources.

## Key Files & References

| Purpose              | Location                                      |
|----------------------|-----------------------------------------------|
| ArgoCD config        | `charts/argocd/values.yaml`                   |
| Cloudflare Tunnel    | `charts/cloudflare-tunnel/`                   |
| Helmfile definitions | `charts/*.helmfile.yaml`                     |
| Migration rationale  | `migration-to-kubernetes.MD`                  |
| DevOps patterns      | `.agents/skills/devops-engineer/SKILL.md`    |
| K8s best practices   | `.agents/skills/kubernetes-specialist/SKILL.md` |
| ArgoCD workflows     | `.agents/skills/argocd-expert/SKILL.md`       |

## Constraints

### MUST DO

- Document significant infrastructure or architectural decisions in `.MD` files
- Use declarative manifests; prefer Helm/Helmfile over raw `kubectl apply`
- Keep the repo as the single source of truth for cluster state
- Reference existing skills when working on DevOps, K8s, or ArgoCD tasks

### MUST NOT DO

- Commit secrets, API keys, or credentials
- Make manual cluster changes that bypass GitOps
- Remove or change resources without documenting the impact
- Use `latest` image tags in production manifests
