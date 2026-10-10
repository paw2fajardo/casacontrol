# CasaControl - Agent Work Distribution & Task Breakdown

This document outlines the targeted, modular task breakdown designed for parallel or sequential multi-agent execution. 

Each agent has a strictly delineated scope, explicit inputs/outputs, mockable interfaces, and clear acceptance criteria to prevent merge conflicts and scope creep.

---

## Architecture Overview & Boundaries

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   Frontend (Agent 3)                   │
                    │   Responsive Touch UI (Tablet optimized, Cards, Modals)│
                    └───────────────────────────┬────────────────────────────┘
                                                │ REST / SSE
                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                         Core Backend API (Agent 2)                         │
│             App Server, Config/Secrets Loader, Aggregated Endpoints        │
└────────────┬──────────────────────────┬──────────────────────────┬─────────┘
             │                          │                          │
             ▼                          ▼                          ▼
┌─────────────────────────┐┌─────────────────────────┐┌─────────────────────────┐
│  HA Adapter (Agent 4)   ││ CartSync Adapter (Agent 1)││ Google Adapter (Agent 5) │
│ - Entity state reader   ││ - GET /api/v1/items      ││ - OAuth token refresh   │
│ - Strict action allowlist││ - Read-only groceries   ││ - Calendar events pull  │
│ - 2-step confirmations  ││ - Resilient fallback    ││ - Tasks & Reminders pull│
└─────────────────────────┘└─────────────────────────┘└─────────────────────────┘
```

---

## Agent Task Matrix

| Agent ID | Specialization / Scope | Dependencies | Primary Deliverable |
| :--- | :--- | :--- | :--- |
| **Agent 0** | **Reconnaissance & Infra Inspector** | None | Environment report, Portainer stack definition, container network mappings |
| **Agent 1** | **CartSync Client Integration** | Agent 0 (ports/tokens) | Standalone CartSync client adapter + unit/mock tests |
| **Agent 2** | **Core Backend Framework & BFF** | None | Server bootstrap, configuration/secrets validation, health check, aggregated API routes |
| **Agent 3** | **Frontend Tablet UI & Shell** | Agent 2 API contract | Responsive touch UI, panel layout, status badges, confirmation modals |
| **Agent 4** | **Home Assistant Integration** | Agent 0 (HA entities) | HA REST/WebSocket client, domain/area parser, safe action validator with confirmation logic |
| **Agent 5** | **Google Calendar & Tasks Integration** | None | Google OAuth token manager, Calendar event fetcher, Tasks reader |
| **Agent 6** | **Docker & Portainer Packaging** | Agents 1–5 | Multi-stage Dockerfile, `docker-compose.yml` for Portainer, deployment runbook |

---

## Detailed Agent Task Descriptions

### Agent 0: Reconnaissance & Portainer/Network Verification
* **Scope:** Inspect live environment without making modifications.
* **Targeted Tasks:**
  1. Inspect Portainer stack `cartsync` (ID 87) and `homeassistant` (ID 60) to verify internal Docker networks, IPs, and port bindings.
  2. Confirm CartSync auth requirement (`HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN` active or open) and test `GET /api/health` against live container.
  3. Inspect Home Assistant entity catalog structure and confirm token authorization requirements.
  4. Generate a network map and environment variable template (`.env.example`) documenting target hostnames/ports.
* **Acceptance Criteria:** A concrete environment report documenting verified endpoints, reachable network names, and secret variable names.

---

### Agent 1: CartSync Adapter Module
* **Scope:** Dedicated, isolated client for CartSync.
* **Targeted Tasks:**
  1. Implement `CartSyncClient` class with support for configurable base URL, timeout, and optional Bearer token.
  2. Implement `getItems()` fetching `GET /api/v1/items?status=active&completed=false`.
  3. Map responses to normalized dashboard types (`id`, `name`, `quantity`, `unit`, `category`, `completed`).
  4. Implement robust error handling (timeout, 401 Unauthorized, 5xx, malformed payload) returning degraded panel status instead of throwing crashes.
  5. Write unit tests with 100% mocked HTTP responses (success, empty list, network error, 401).
* **Acceptance Criteria:** Self-contained module with tests passing, zero UI code, read-only.

---

### Agent 2: Core Backend Engine & Aggregation API
* **Scope:** Server bootstrap, config management, and BFF endpoint definitions.
* **Targeted Tasks:**
  1. Initialize backend project structure (e.g., Node/Fastify or Python/FastAPI based on repo preference).
  2. Implement configuration loader reading environment variables safely (validates required vars, masks secrets in logs).
  3. Create health and readiness endpoints (`/healthz`, `/readyz`).
  4. Establish standard JSON response schema and per-integration status schema (`healthy`, `degraded`, `unreachable`).
  5. Define and wire up routes:
     * `GET /api/groceries` (calls Agent 1's adapter)
     * `GET /api/homeassistant/entities` & `POST /api/homeassistant/action` (calls Agent 4's adapter)
     * `GET /api/schedule` (calls Agent 5's adapter)
* **Acceptance Criteria:** Backend starts cleanly with mocked adapters, health checks pass, all routes return uniform envelope responses.

---

### Agent 3: Frontend Tablet UI & Layout Shell
* **Scope:** Responsive, touch-first dashboard frontend.
* **Targeted Tasks:**
  1. Build tablet-optimized layout (designed for landscape and portrait wall/counter tablets).
  2. Create 3 main view sections/cards:
     * **Home Control:** Grid grouped by Room/Area and Domain.
     * **Schedule & Tasks:** Combined Calendar events and Tasks list.
     * **Grocery List:** Clean checkable checklist (rendered read-only in v1 with clear badge).
  3. Create universal **Action Confirmation Modal** for sensitive controls (locks, garage doors, alarms) with clear "Cancel" and "Confirm" touch buttons.
  4. Implement per-card status indicators (e.g., green dot, warning banner if CartSync or Google is offline).
  5. Build mock UI harness to run and verify UI in browser using mock API data.
* **Acceptance Criteria:** Responsive UI rendering smoothly on 1024x768 and 1920x1200 screens, no raw integration tokens in frontend code, confirmations require 2 distinct taps.

---

### Agent 4: Home Assistant Client & Safety-Guarded Controls
* **Scope:** Home Assistant communication and server-side safety enforcement.
* **Targeted Tasks:**
  1. Implement `HomeAssistantClient` using HA REST / WebSocket API with long-lived access token.
  2. Fetch states (`/api/states`) and map entity domains (`light`, `switch`, `lock`, `cover`, `climate`, `alarm_control_panel`).
  3. Implement **Safety Guard Allowlist**:
     * Classify high-impact entities (`lock.*`, `cover.*` for garage doors, `alarm_control_panel.*`).
     * Expose endpoint requiring an explicit `confirmation: true` payload to execute high-impact service calls (`/api/services/<domain>/<service>`).
     * Reject unauthorized or non-allowlisted service calls.
  4. Handle HA connection disconnects with auto-reconnect and state refresh.
  5. Write unit tests with mocked HA API responses verifying read parsing and execution safety blocks.
* **Acceptance Criteria:** High-impact entities cannot be triggered without verified confirmation flag; reads handle missing/unreachable HA safely.

---

### Agent 5: Google Calendar & Tasks Integration
* **Scope:** Google OAuth handling and data fetchers for single household account.
* **Targeted Tasks:**
  1. Implement Google OAuth token refresher using client ID, client secret, and refresh token (stored server-side only).
  2. Implement `GoogleCalendarClient` fetching primary and shared calendar events for the next $N$ days (`calendar.readonly`).
  3. Implement `GoogleTasksClient` fetching active task lists and uncompleted tasks (`tasks.readonly`).
  4. Aggregate and normalize events and tasks into a unified chronological schedule item list.
  5. Implement error caching and token refresh retry logic.
  6. Unit tests with mocked Google API responses covering expired tokens, empty calendars, and API quotas.
* **Acceptance Criteria:** Calendar and Tasks parsed cleanly into unified chronological items without throwing unhandled exceptions when Google is unreachable.

---

### Agent 6: Packaging, Dockerfile & Portainer Deployment
* **Scope:** Containerization and deployment readiness.
* **Targeted Tasks:**
  1. Create lean, multi-stage `Dockerfile` (optimized layer caching, non-root user).
  2. Author `docker-compose.yml` configured for Portainer stack deployment.
  3. Ensure network configuration bridges the existing Portainer container networks (`homeassistant`, `cartsync`).
  4. Verify no secret defaults are hardcoded in compose files.
  5. Write deployment & rollback verification runbook.
* **Acceptance Criteria:** Container builds and runs locally without errors; compose stack matches Portainer requirements.
