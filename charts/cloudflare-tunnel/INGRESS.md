# Configuring Cloudflare Tunnel Ingress Routes

When using `cloudflare-tunnel-remote` with token-based authentication, ingress routes are **managed remotely through the Cloudflare Zero Trust dashboard**, not through Kubernetes or local configuration files.

## Steps to Configure Ingress Routes

### 1. Access Cloudflare Zero Trust Dashboard

1. Log in to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks** > **Connectors** > **Cloudflare Tunnels**
3. Find your tunnel (the one associated with your tunnel token)

### 2. Configure Public Hostname (Ingress Route)

1. Click on your tunnel name to open its configuration
2. Go to the **Public Hostnames** tab (or **Published application routes**)
3. Click **Add a public hostname** or **Configure**

### 3. Set Up Route for ArgoCD (cd.dev8s.io)

For your ArgoCD service, configure:

**Public Hostname:**
- **Subdomain**: `cd` (or leave empty if using root domain)
- **Domain**: `dev8s.io` (or your domain)
- **Path**: Leave empty for root path, or specify a path like `/argocd`

**Service:**
- **Type**: `HTTP`
- **URL**: `http://argocd-server.argocd.svc.cluster.local:80`
  - Or use: `http://argocd-server.argocd:80`
  - Format: `http://<service-name>.<namespace>.svc.cluster.local:<port>`

**Additional Settings (Optional):**
- **No TLS Verify**: Enable if your service uses self-signed certificates
- **HTTP Host Header**: Set to `cd.dev8s.io` if needed
- **Origin Request Settings**:
  - **Connect Timeout**: `60s` (or higher if needed)
  - **No TLS Verify**: Enable if needed

### 4. Add Additional Routes

You can add multiple public hostnames for different services:

**Example for another service:**
- **Subdomain**: `app`
- **Domain**: `dev8s.io`
- **Service URL**: `http://my-service.default.svc.cluster.local:8080`

### 5. Save and Verify

1. Click **Save** or **Add hostname**
2. The route should appear in your tunnel's public hostnames list
3. Verify the tunnel connector in Kubernetes is running and connected
4. Test access to `https://cd.dev8s.io` (Cloudflare provides HTTPS automatically)

## Important Notes

- **No Local Configuration**: The `cloudflare-tunnel-remote` chart does NOT support local ingress configuration in `values.yaml`. All routes must be configured in the Cloudflare dashboard.

- **Service URLs**: Use Kubernetes internal service DNS format:
  - `http://<service-name>.<namespace>.svc.cluster.local:<port>`
  - Or shorter: `http://<service-name>.<namespace>:<port>`

- **HTTPS**: Cloudflare automatically provides HTTPS for your routes. No TLS configuration needed in Kubernetes.

- **Changes Take Effect Immediately**: Once you save a route in the dashboard, the tunnel connector will fetch the updated configuration automatically.

## Troubleshooting

- **Route not working?** Check that:
  1. The tunnel connector pod is running: `kubectl get pods -n cloudflare`
  2. The service exists and is accessible: `kubectl get svc -n argocd`
  3. The route is configured correctly in the Cloudflare dashboard

- **Connection refused?** Verify the service URL format and that the service is listening on the specified port.

## References

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
- [Configure Public Hostnames](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/configuration-file/ingress/)


