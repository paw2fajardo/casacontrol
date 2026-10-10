# Shared Home Dashboard Implementation Plan

> **For developer agents:** Treat this as the approved product direction. Inspect the existing repositories and live Portainer definitions before coding or changing infrastructure. Do not deploy or modify production stacks without Paulo’s approval.

**Goal:** Deliver a responsive, LAN-only household dashboard for Home Assistant controls, Google Calendar and reminders/tasks, and the CartSync grocery list.

**Architecture:** A separate self-hosted web app serves tablet-friendly UI and a server-side backend. The backend talks to Home Assistant, Google APIs, and CartSync; browsers never receive integration credentials. Deploy as a Portainer-managed stack, reachable on the LAN only.

**Tech stack:** Inspect existing project conventions and choose the smallest maintainable stack before implementation. Do not assume a framework or add dependencies without justification.

---

## Product decisions (confirmed)

- Separate self-hosted web application, not a Home Assistant dashboard.
- Primary clients: multiple shared household tablets; interface must be touch-friendly and responsive.
- LAN-only for initial release. Public/remote access is explicitly deferred.
- Everyone using the dashboard can read all available Home Assistant entity state and control all exposed entities.
- High-impact controls (at least locks, garage doors, alarm panels) require an explicit confirmation before execution.
- Google content: calendar and reminders/tasks. Email is out of initial scope.
- CartSync content: grocery list. User has not yet decided whether the dashboard should modify the list; begin read-only, design a small API boundary that can later support writes.
- Gemini-triggered webhook is an idea, not a confirmed v1 requirement. Do not make it a dependency or expose an endpoint until its sender capabilities and security model are verified.

## Verified infrastructure context

- CartSync runs as a healthy container from Portainer stack `cartsync` (stack ID 87, endpoint 3); container port `3001` is published as host port `9090`.
- CartSync API documentation is at `/opt/data/attachments/API.md`. It documents `GET /api/v1/items` with `completed` and `status` filters, returning `{items, count}`; host access example uses `http://192.168.10.200:9090`. `/api/*` uses a shared Bearer token when `HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN` is configured; otherwise API authentication is disabled. `/api/health` is public.
- The dashboard should use the documented CartSync API, not SQLite or the WebSocket protocol. Verify the running CartSync build actually matches the documentation before relying on it.
- Home Assistant runs in the existing Portainer-managed stack `homeassistant` (ID 60).
- All new/changed services must remain Portainer-managed. No ad hoc `docker run` or unmanaged compose deployment.

## Architecture and security constraints

1. **Browser → dashboard backend:** UI calls same-origin backend routes. No HA token, Google refresh token, API key, or CartSync database credentials in browser JavaScript/local storage.
2. **Backend → Home Assistant:** use HA’s supported API with a dedicated long-lived token stored only as a server-side secret. Grant the minimum HA permission possible; verify whether HA supports a restricted user/token sufficient for the required services. Never log tokens.
3. **Backend → Google:** use Google OAuth/API scopes limited to read-only Calendar and Tasks data. Store refresh credentials server-side with restricted file/secret permissions. Avoid write scopes in v1.
4. **Backend → CartSync:** use an explicit versioned HTTP API on an internal Docker network or LAN path. Prefer read-only grocery-list access for v1. Preserve CartSync’s existing UI/WebSocket behavior. Do not publish an unnecessary new host port.
5. **LAN-only:** bind/route the dashboard only for LAN use; no public DNS, Cloudflare Tunnel, Caddy/NPM public proxy, or Internet-facing webhook in v1. Confirm actual container network reachability to each dependency before choosing URLs.
6. **Shared access:** no per-household-user roles are required. Still avoid unauthenticated access outside the LAN; document the chosen LAN trust boundary and ensure state-changing endpoints are not accidentally exposed through a public proxy.
7. **Control safety:** enumerate entities and supported service actions from live HA metadata, not hard-coded assumptions. Require explicit confirmation for lock, garage-door, alarm, and other clearly safety/security-sensitive actions. Confirmation must be server-validated for the requested entity/service, not merely a client-side warning. Avoid duplicate actions on repeated taps.

## Delivery phases

### Phase 0 — Reconnaissance and decisions

- Inspect the CartSync source/repository, current app protocol, data model, and Portainer stack definition. Verify how its UI loads and updates grocery data. Do not print secrets from compose/env.
- Inspect HA API access, current entity counts/domains/areas, and whether the token can be scoped to a restricted HA user. Do not create credentials or change HA configuration during reconnaissance.
- Confirm the intended meaning of “reminders”: Google Tasks, Google Calendar events/reminders, or both. Google’s legacy Calendar reminders are not necessarily equivalent to Tasks; make the source mapping explicit.
- Confirm whether tablet users should be able to add/check off/delete grocery items. Until confirmed, read-only.
- Identify the dashboard code repository and its stack/toolchain. Select framework only after inspecting repo conventions.
- Verify container-network paths from the proposed dashboard service to HA and CartSync. Do not assume published host ports are required.

**Gate:** present findings and any blockers to Paulo before implementation/deployment. In particular, confirm Google OAuth setup and CartSync API ownership.

### Phase 1 — Verify and integrate CartSync API

- No API implementation is planned in this dashboard project; CartSync already documents an API.
- Confirm live `GET /api/health` version/build metadata and compare with the documented API before integration.
- Use `GET /api/v1/items?status=active&completed=false` for the initial grocery view. Parse the documented `{items, count}` response; preserve `id`, `name`, `quantity`, `unit`, `category`, `note`, `completed`, and `status` when supplied.
- Keep the CartSync Bearer token server-side, if configured. Verify whether `HOUSEHOLD_SECRET` or `SYNC_AUTH_TOKEN` is active through Portainer without revealing its value. If API auth is disabled, recommend enabling it before dashboard integration.
- Add a backend CartSync adapter and tests for success, empty list, filtering, 401, network timeout, malformed response, and server errors.
- Poll at a modest interval unless a documented WebSocket mechanism is confirmed preferable. Do not access SQLite directly.
- Do not add grocery mutations until Paulo confirms add/check-off/remove requirements.

**Acceptance:** dashboard reads the live CartSync list through its documented API; errors appear as a panel-level status; credentials remain server-side; existing CartSync clients remain unaffected.

### Phase 2 — Dashboard foundation and deployment definition

- Create the app using the inspected repository’s existing conventions, or create a new repository only with Paulo’s direction.
- Establish a server-side integration/config layer with required URLs and credentials injected through Portainer-managed secrets/environment configuration. Never commit secrets.
- Add health/readiness endpoint that checks app process only; dependency outages should be reported per integration and must not make the whole UI unusable.
- Add responsive tablet layout and navigation/cards for Home, Calendar/Tasks, and Groceries.
- Create a Portainer stack definition; no public ingress. Document LAN URL, required settings, backup/recovery needs, and deployment/rollback steps.
- Add tests for backend routes, configuration validation, and UI layout behavior supported by the selected stack.

**Acceptance:** app starts with integrations disabled/configured independently, displays a useful offline/error state, passes checks, and is not deployed until reviewed/approved.

### Phase 3 — Home Assistant read and control

- Backend fetches HA states plus entity/area metadata through supported HA APIs.
- Show all readable entities; group by area and domain where metadata exists; provide search/filter and a way to hide dashboard clutter without changing HA.
- Render entity-specific controls only where HA metadata exposes a supported action. Avoid pretending every entity is controllable.
- Route service calls through backend allowlist/validation derived from HA metadata. Do not expose arbitrary authenticated proxying to the HA API.
- Add explicit confirmation for high-impact actions, at minimum `lock.*`, `cover.*` entities identified as garage doors, and alarm panels. Confirm actual domain/entity semantics rather than relying on names alone; provide a safe cancel path.
- Show loading, unavailable, and action-failure states; refresh/subscribe after commands and reflect HA’s actual returned state instead of optimistic success.
- Test with mocked HA API responses and validate live read/control behavior only in an approved test window. Do not operate real locks, garage doors, or alarms during tests without Paulo’s explicit confirmation.

**Acceptance:** all readable entities can be browsed; all supported actions are available to dashboard users; sensitive actions require confirmation; backend credentials stay server-side; HA state confirms completed actions.

### Phase 4 — Google Calendar and Tasks

- Register/configure Google OAuth for a server-side web app using the least-privilege read-only scopes required for Calendar and Tasks.
- Complete user consent and token storage through an operator-only setup flow; do not put OAuth client secrets or refresh tokens in the frontend or repository.
- Fetch upcoming events and task/reminder data; define timezone, date range, completed-task handling, and refresh interval.
- Support API quota/errors, expired/revoked consent, and empty data with clear per-panel states. Cache minimally if needed; do not persist Google content longer than required for the UI.
- Keep Google integration read-only for v1. Treat Gemini webhook ingestion as a separate future phase.
- Add mocked API tests for pagination, timezone boundaries, expired credentials, empty results, and provider errors.

**Acceptance:** consented Google account’s calendar and agreed reminder/task source render correctly on tablets; removing/revoking consent fails safely; no write scopes or exposed credentials.

### Phase 5 — CartSync dashboard view and household validation

- Connect dashboard backend to the CartSync API over the verified internal/LAN path.
- Render grocery items with clear checked/unchecked state and freshness/error indicator. Read-only in v1 unless Paulo approves mutations.
- Validate on actual tablet browsers, including screen sizes/orientation, touch target size, reconnect behavior, and simultaneous clients.
- Verify no public exposure; confirm browser network traffic contains no integration secrets.
- Review operational logs and avoid recording calendar/task content, grocery details, or tokens unnecessarily.

**Acceptance:** all three panels work independently; one integration outage does not hide the others; multiple tablets can use the dashboard concurrently; no service is unmanaged.

## Future phase: Gemini-triggered updates/webhook

Only pursue after verifying the specific Gemini product/action supports outbound HTTP requests, custom headers/secrets, retries, and an appropriate execution context. A Google-hosted Gemini action cannot directly reach a LAN-only endpoint. Keep the dashboard LAN-only by using a deliberate outbound-pull/relay design if needed; public ingress is a separate security decision requiring explicit approval. Define a signed/authenticated payload, replay protection/idempotency, schema validation, rate limits, audit logging without sensitive payloads, and retry semantics before exposing any endpoint. Do not treat a hard-to-guess URL as authentication.

## Confirmed design & product decisions

1. **Google Account & Content:**
   - Single shared household account for both Calendar events and Tasks/reminders.
   - Family members can share their personal calendars into this household account or use the household account directly.
   - Dashboard backend uses server-side OAuth with read-only scopes (`calendar.readonly`, `tasks.readonly`). In Google Cloud Console, the OAuth app will be placed in "Production" status so refresh tokens do not expire after 7 days.
   - Outbound API pull is used (keeping the dashboard strictly LAN-only without requiring public webhooks or tunnels).

2. **CartSync Permissions:**
   - Read-only for v1. No item addition, mutation, or completion from the dashboard until requested later.

3. **Dashboard Network & Access:**
   - Main LAN access is open (no PIN/login required on the tablet interface).
   - Network isolation is enforced at the network level (guest Wi-Fi is separated and cannot reach this LAN).

4. **Gemini / Webhooks:**
   - Out of scope for v1.

---

## Cross-cutting tests and release checks

- Unit tests for each API adapter and action validation.
- Integration tests with mocked HA, Google, and CartSync responses; no live destructive actions.
- Security checks: secrets absent from git/build artifacts/browser requests/logs; backend rejects invalid services/entities and malformed webhook data; no unintended public binding.
- Failure tests: each provider unavailable independently; app remains usable and reports correct panel-level status.
- Deployment check through Portainer only; inspect saved stack definition, runtime network/mounts, health, and recent logs.
- Tablet smoke test on LAN, then verify another tablet sees consistent states.
- Capture exact URL, stack name/ID, image/version, and rollback method in the handoff documentation after deployment.

