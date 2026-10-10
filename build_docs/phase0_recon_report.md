# CasaControl - Phase 0 Reconnaissance Report

**Date:** 2026-10-10  
**Host Tested:** `192.168.10.200`  
**Status:** Both backend integrations verified reachable on LAN.

---

## 1. CartSync Service
* **Host Address:** `http://192.168.10.200:9090`
* **Health Check (`GET /api/health`):**
  * HTTP status: `200 OK`
  * Version: `1.0.3` (git commit `1b6199d`)
  * Database: `sqlite3 (cartsync.db)`
* **Authentication Requirement (`GET /api/v1/items`):**
  * HTTP status: `401 Unauthorized` without token:
    ```json
    {"error":"Unauthorized","message":"Invalid or missing household authentication token"}
    ```
  * **Finding:** CartSync **has token authentication enabled** (via `HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN`).
  * **Requirement for Dashboard:** The dashboard backend needs `CARTSYNC_AUTH_TOKEN` supplied via environment configuration to query items.

---

## 2. Home Assistant Service
* **Host Address:** `http://192.168.10.200:8123`
* **API Baseline (`GET /api/`):**
  * HTTP status: `401: Unauthorized`
  * Auth mechanism: Standard Home Assistant Bearer token.
* **Requirement for Dashboard:** A long-lived access token (`HASS_TOKEN`) created in Home Assistant is needed for the dashboard backend.

---

## 3. Recommended Environment Template (`.env.example`)

```bash
# Server Port
PORT=3000
NODE_ENV=development

# CartSync Integration
CARTSYNC_BASE_URL=http://192.168.10.200:9090
CARTSYNC_AUTH_TOKEN=your_household_token_here

# Home Assistant Integration
HASS_BASE_URL=http://192.168.10.200:8123
HASS_TOKEN=your_ha_long_lived_access_token_here

# Google Integration (Single Household Account)
GOOGLE_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REFRESH_TOKEN=your_oauth_refresh_token
```
