# CasaControl - Portainer Deployment & Operations Runbook

This runbook provides step-by-step instructions for packaging, deploying, verifying, and rolling back **CasaControl** using Portainer on the household server.

---

## 1. Environment & Architecture Overview

CasaControl is deployed as a Portainer-managed Docker stack providing a responsive household dashboard for wall-mounted tablets.

### Verified Portainer Context
- **Host IP:** `192.168.10.200`
- **Portainer Stack ID 87 (`cartsync`):** Container port `3001` published to host port `9090`. Reachable at `http://192.168.10.200:9090` (or `http://cartsync:3001` if bridged).
- **Portainer Stack ID 60 (`homeassistant`):** Container running on host network or port `8123`. Reachable at `http://192.168.10.200:8123` (or `http://homeassistant:8123` if bridged).
- **CasaControl Dashboard Port:** Published on host port `3000` (`http://192.168.10.200:3000`).
- **Security Boundary:** LAN-only. Tablets access the web UI without passwords over trusted Wi-Fi. All external tokens (Home Assistant, CartSync, Google OAuth) reside exclusively in the server backend and are never sent to browsers.

---

## 2. Prerequisites

Before creating the stack in Portainer, collect the following credentials and configuration values:

1. **Portainer Access:** Administrator or stack operator access to the Portainer instance at `192.168.10.200`.
2. **Home Assistant Long-Lived Access Token:**
   - Log into Home Assistant at `http://192.168.10.200:8123`.
   - Go to **Profile** (bottom left) -> **Security** -> **Long-Lived Access Tokens**.
   - Create a new token named `casacontrol-dashboard` and copy the generated token string.
3. **CartSync Authentication Token (if required):**
   - Check the `cartsync` stack environment variables in Portainer.
   - If `HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN` is configured, copy the secret value for `CARTSYNC_AUTH_TOKEN`.
   - If authentication is disabled in CartSync, leave `CARTSYNC_AUTH_TOKEN` empty.
4. **Google Cloud OAuth 2.0 Credentials:**
   - Client ID and Client Secret from Google Cloud Console.
   - Long-lived Refresh Token authorized for the household account with read-only scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/tasks.readonly`
   - *Note: Ensure the Google OAuth app is set to "In production" status in Google Cloud Console so refresh tokens do not expire after 7 days.*

---

## 3. Step-by-Step Portainer Stack Deployment

You can deploy CasaControl via Portainer using either **Method A (Git Repository - Recommended)** or **Method B (Web Editor)**.

### Method A: Deploy via Git Repository (Recommended)

1. Open Portainer in your browser (`http://192.168.10.200:9000` or configured Portainer URL).
2. Select the target environment (e.g., `local` or endpoint `3`).
3. Click **Stacks** in the left sidebar, then click **+ Add stack**.
4. Name the stack: `casacontrol`.
5. Under **Build method**, select **Repository**.
6. Enter the Git repository configuration:
   - **Repository URL:** `https://github.com/paw2fajardo/casacontrol.git`
   - **Repository reference:** `refs/heads/main`
   - **Compose path:** `docker-compose.yml`
7. Enable **Automatic updates** (optional):
   - Choose **Polling** or **Webhook** to trigger rebuilds when changes are pushed to `main`.
8. Scroll down to **Environment variables**:
   - Click **Add environment variable** or paste values using **Advanced mode** (see Section 4 for values).
9. Click **Deploy the stack**.
   - Portainer clones the repository, builds the multi-stage Docker image, creates the container network, and starts the container.

---

### Method B: Deploy via Web Editor

1. Open Portainer -> **Stacks** -> **+ Add stack**.
2. Name the stack: `casacontrol`.
3. Under **Build method**, select **Web editor**.
4. Paste the contents of `docker-compose.yml`:
   ```yaml
   services:
     casacontrol:
       build:
         context: .
         dockerfile: Dockerfile
       image: casacontrol:latest
       container_name: casacontrol
       restart: unless-stopped
       ports:
         - "${PORT:-3000}:3000"
       environment:
         - NODE_ENV=production
         - PORT=3000
         - HOST=0.0.0.0
         - CARTSYNC_BASE_URL=${CARTSYNC_BASE_URL:-http://192.168.10.200:9090}
         - CARTSYNC_AUTH_TOKEN=${CARTSYNC_AUTH_TOKEN:-}
         - HOMEASSISTANT_BASE_URL=${HOMEASSISTANT_BASE_URL:-http://192.168.10.200:8123}
         - HOMEASSISTANT_AUTH_TOKEN=${HOMEASSISTANT_AUTH_TOKEN:-}
         - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
         - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
         - GOOGLE_REFRESH_TOKEN=${GOOGLE_REFRESH_TOKEN:-}
       networks:
         - casacontrol_network

   networks:
     casacontrol_network:
       name: casacontrol_network
       driver: bridge
   ```
5. In the **Environment variables** section, input the environment variables.
6. Click **Deploy the stack**.

---

## 4. Environment Variables Reference

Configure the following variables in Portainer's stack environment variable editor:

| Variable | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3000` | Port exposed on the host for tablet browser access. |
| `HOST` | Optional | `0.0.0.0` | Container network interface binding. |
| `NODE_ENV` | Optional | `production` | Node runtime environment mode. |
| `CARTSYNC_BASE_URL` | **Yes** | `http://192.168.10.200:9090` | Base URL of the CartSync service (Stack ID 87). |
| `CARTSYNC_AUTH_TOKEN` | Conditional | *(empty)* | Bearer token if `HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN` is enabled in CartSync. |
| `HOMEASSISTANT_BASE_URL` | **Yes** | `http://192.168.10.200:8123` | Base URL of Home Assistant (Stack ID 60). |
| `HOMEASSISTANT_AUTH_TOKEN` | **Yes** | *(empty)* | Long-Lived Access Token generated from Home Assistant profile. |
| `GOOGLE_CLIENT_ID` | **Yes** | *(empty)* | Google Cloud OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | **Yes** | *(empty)* | Google Cloud OAuth 2.0 Web Client Secret. |
| `GOOGLE_REFRESH_TOKEN` | **Yes** | *(empty)* | Google OAuth 2.0 Refresh Token for the household account. |

---

## 5. Post-Deployment Verification Checklist

Once Portainer shows the stack as deployed, perform the following verification checks:

### 1. Container Status & Health Check
- In Portainer, navigate to **Containers** and find `casacontrol`.
- Confirm status is **running** and health indicator displays **healthy** (green).
- The built-in Docker `HEALTHCHECK` periodically tests `http://127.0.0.1:3000/healthz`.

### 2. Log Verification
- Click the logs icon for container `casacontrol`.
- Verify the following log lines appear:
  ```json
  {"level":30,"pid":1,"hostname":"...","config":{...},"msg":"Starting server with configuration"}
  {"level":30,"pid":1,"hostname":"...","msg":"Server listening at http://127.0.0.1:3000"}
  {"level":30,"pid":1,"hostname":"...","msg":"Server listening at http://0.0.0.0:3000"}
  ```
- **Security Check:** Confirm all tokens and secrets in the config printout are masked as `***`.

### 3. HTTP Endpoints Smoke Test
From any workstation on the same LAN (or from the host terminal), test the endpoints:

```bash
# 1. Healthcheck endpoint
curl -f http://192.168.10.200:3000/healthz
# Expected output: {"status":"ok","timestamp":"..."}

# 2. Readiness endpoint
curl -f http://192.168.10.200:3000/readyz
# Expected output: {"status":"ok","timestamp":"..."}

# 3. CartSync Grocery List integration
curl http://192.168.10.200:3000/api/groceries
# Expected output: {"status":"healthy","items":[...]}

# 4. Home Assistant entities integration
curl http://192.168.10.200:3000/api/homeassistant/entities
# Expected output: {"status":"healthy","entities":[...]}

# 5. Schedule & Tasks integration
curl http://192.168.10.200:3000/api/schedule
# Expected output: {"status":"healthy","items":[...]}
```

### 4. Tablet Touch UI Smoke Test
- Open `http://192.168.10.200:3000` on a household tablet.
- Confirm Home Control cards, Schedule/Tasks, and Grocery lists render correctly.
- Test touch interactions: tapping an entity card, opening the Action Confirmation Modal for sensitive controls (e.g., garage doors/locks), and verifying cancel/confirm actions.

---

## 6. Rollback & Troubleshooting Procedures

### Immediate Rollback via Portainer

If a new deployment causes issues or fails health checks:

#### Method 1: Git-Managed Stack Rollback
1. In Portainer, go to **Stacks** -> `casacontrol`.
2. Click **Editor**.
3. Under **Repository reference**, change `refs/heads/main` to the previous stable Git commit SHA or tag (e.g., `v1.0.0`).
4. Click **Update the stack** and ensure **Re-pull image and redeploy** is checked.
5. Click **Update**.

#### Method 2: Image Rollback (if pre-tagged images are used)
1. In the Stack Editor, update the image tag to the previous version (e.g., `image: casacontrol:1.0.0`).
2. Click **Update the stack**.

#### Method 3: Emergency Stop
If the service must be taken offline immediately:
1. In Portainer, go to **Containers** -> select `casacontrol`.
2. Click **Stop** (or in **Stacks** -> `casacontrol` -> click **Stop this stack**).

---

### Troubleshooting Common Issues

#### Problem: Container fails health check (`unhealthy`)
- **Cause:** Fastify server failed to bind to port 3000 or crashed on startup.
- **Diagnostic:** Inspect container logs in Portainer.
- **Resolution:** Verify `PORT=3000` and `HOST=0.0.0.0` are set. Ensure no host port collision exists on port 3000.

#### Problem: CartSync panel shows `degraded` or `unreachable`
- **Cause:** Network path to host port `9090` blocked or CartSync container offline.
- **Diagnostic:** From host terminal, run `curl http://192.168.10.200:9090/api/health`.
- **Resolution:** Verify Portainer stack 87 (`cartsync`) is running. If CartSync uses authentication, ensure `CARTSYNC_AUTH_TOKEN` is configured.

#### Problem: Home Assistant returns 401 Unauthorized
- **Cause:** Expired, revoked, or incorrect Home Assistant token.
- **Diagnostic:** Check server logs for `401 Unauthorized` responses from HA.
- **Resolution:** Generate a new Long-Lived Access Token in Home Assistant and update `HOMEASSISTANT_AUTH_TOKEN` in the Portainer stack environment variables. Click **Update the stack**.

#### Problem: Google Schedule returns 401 or token expired
- **Cause:** OAuth consent revoked or refresh token expired (e.g., app still in "Testing" mode in Google Cloud Console).
- **Diagnostic:** Server logs will show token refresh error from Google OAuth client.
- **Resolution:** Ensure app status in Google Cloud Console is "In production", re-authorize the household account, and update `GOOGLE_REFRESH_TOKEN` in Portainer.
