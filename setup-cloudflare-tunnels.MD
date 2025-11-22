# Setup Cloudflare Tunnels

## Prerequisites
- **Cloudflare Account**: Create an account if you haven't already.
- **Domain**: Register a domain and update Nameservers to point to Cloudflare (propagation may take 2-3 hours).
- **Cloudflare One Account**: Set up at [Cloudflare One](https://one.dash.cloudflare.com/) (requires billing setup).

## 1. Create a Tunnel
1. Log in to the [Cloudflare One Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** > **Connectors** > **Cloudflare Tunnels**.
3. Click **Create a tunnel**.
4. Select **Cloudflared** for the connector type and click **Next**.
5. Enter a name for your tunnel (e.g., `home-server`, `enterprise-VPC-01`) and click **Save tunnel**.

## 2. Install and Run Connector
1. Under **Choose an environment**, select your server's operating system.
2. Copy the installation command provided in the box.
3. Paste and run the command in your server's terminal.
   > **Tip**: Ensure the service is installed to start at boot (usually handled by the install command).
4. Once the command finishes, verify that your connector appears as *Connected* in the Cloudflare One dashboard.

## 3. Publish Application
1. Click **Next** to go to the **Published application routes** tab.
2. Configure the public hostname:
   - **Subdomain**: Enter your desired subdomain (e.g., `app`).
   - **Domain**: Select your domain from the dropdown.
   - *Note: If using a multi-level subdomain (e.g., `dev.app.example.com`), you must order an Advanced Certificate.*
3. Configure the **Service**:
   - **Type**: `HTTP`
   - **URL**: `localhost:8000` (Replace `8000` with your app's port).
4. (Optional) Configure **Additional application settings** if needed.
5. Click **Complete setup**.

## References
- [Create Remote Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)
