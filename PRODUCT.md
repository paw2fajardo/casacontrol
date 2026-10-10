# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Shared household members (family members across varying levels of tech proficiency) viewing and interacting with the dashboard from shared wall-mounted or counter tablets in common areas.

## Product Purpose
Deliver an ultra-responsive, glanceable, LAN-only household dashboard that aggregates home controls, shared family schedule/reminders, and the live grocery list into a single reliable touch display.

## Positioning
A dedicated, appliance-like tablet interface running strictly on the local home network with zero external cloud dependencies for local controls, decoupling household daily essentials from individual mobile devices or complex Home Assistant administrative views.

## Operating Context
- Stationary or handheld tablets in kitchen, hallway, or living spaces (landscape & portrait).
- Primary interaction: quick touch toggles, passing glances at today's schedule, and checking items on the grocery list.
- Network: Local Area Network (LAN only). Completely unreachable from the public internet.

## Capabilities and Constraints
- **Home Assistant:** Read state of entities, group by domain/area, execute actions with strict server-side two-step confirmations on high-impact devices (locks, garage doors, alarm panels).
- **Google Calendar & Tasks:** Read-only chronological feed of household calendar events and active tasks from a single shared household account.
- **CartSync:** Read-only live grocery list from the local CartSync container.
- **Security:** Open access on the primary household LAN; guest network is isolated at router level.
- **Privacy:** Credentials and tokens are stored server-side and never exposed to client browsers or logs.

## Brand Commitments
- Name: CasaControl
- Persona: Calm, dependable, glanceable household appliance. High legibility, dark and light ambient modes, high-contrast states.
- Affordance: Touch targets strictly $\ge 48\text{px}$ with immediate tactile feedback on tap.

## Evidence on Hand
- Working Node/Fastify backend with CartSync, HA, and Google adapters (`src/`).
- Touch-optimized frontend shell (`public/index.html`, `public/app.css`, `public/app.js`).
- Portainer stack definitions and deployment runbook (`build_docs/`).

## Product Principles
1. **Glanceable & Calm:** Prioritize high-information legibility at distance over visual clutter or flashy animations.
2. **Fail Safely & Independently:** An outage in an upstream service (Google or CartSync) must never crash or disable the dashboard's other cards.
3. **Guard High-Impact Actions:** Critical security actions (locks, garage doors, alarms) always require two distinct physical taps to prevent accidental triggers.
4. **Appliance Reliability:** Zero maintenance required by end users during daily operation.

## Accessibility & Inclusion
- Large touch targets for all family members.
- High contrast status badges (active vs. inactive device states).
- Clear, unambiguous iconography and labels.
