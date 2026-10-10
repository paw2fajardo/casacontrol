# Surface Brief: Tablet Control Panel (`public/index.html`)

<!-- impeccable:surface-brief 1 -->

## 1. Job and Audience
- **Visitor Mode:** `Operate`
- **Audience:** Shared household members passing by or standing in front of stationary landscape tablets (kitchen, living space, entryway).
- **Core Jobs:**
  1. Quick physical toggles for room lights, switches, and scenes without fiddling with complex apps.
  2. Safe, deliberative control of security perimeters (locks, garage door, alarms) with protected confirmation.
  3. At-a-glance scanning of the day's schedule, family tasks, and running grocery count.

## 2. Outcome and Proof
- **Primary Action:** One-tap action for common utilities; two-tap guarded execution for security devices.
- **Success Criteria:** Immediate tactile feedback ($<100\text{ms}$ visual response), zero layout shift, ultra-legible typography from a 3-foot viewing distance.
- **Fail-Safe Integrity:** Independent card/tab degradation—an upstream Google or CartSync disconnect never stalls the Home Assistant controls.

## 3. Selected Direction
- **Topology:** Persistent left navigation sidebar ($72\text{px}$–$88\text{px}$) with dedicated landscape viewport views:
  - 🏠 **Home Controls:** Room/Area filters, quick toggles, domain grouping (Lights, Climate, Switches).
  - 🛡️ **Security & Overview:** Prominent high-impact control center (door locks, garage doors, alarm panel, perimeter state) with built-in modal confirmation.
  - 📅 **Schedule & Routine:** Unified timeline view of Google Calendar events and active family tasks.
  - 🛒 **Groceries:** Clean, high-legibility CartSync checklist with category separation and freshness indicator.
- **Visual Aesthetic:** **Warm Tactile Appliance**
  - Matte slate / graphite dark canvas (`#0f1319`) with soft neutral contrast cards (`#1a202c`).
  - Warm amber / soft emerald ambient glow states when devices are active.
  - Clean, high-contrast typography (Inter / system DIN sans) with generous line heights and distinct tabular numerals.
  - Minimum hit target size: $\ge 54\text{px}$ for all primary touch interaction points.

## 4. Scope and Boundaries
- **Framework & Tooling:** React + Tailwind CSS + Lucide Icons built with Vite into a lean static distribution (`public/`) served by the Fastify backend.
- **In Scope:** Full multi-view landscape dashboard, real-time status badges, universal action confirmation modal, theme-aware palette, live clock/date header.
- **Anti-Goals:** No complex nested settings menus, no direct entity config editor, no external cloud dependencies on the client bundle.

## 5. Interaction and States
- **States:**
  - *Normal / Idle:* High contrast, calm ambient telemetry.
  - *Active / On:* Warm glow badge and filled accent indicator.
  - *Operating / In-Flight:* Subtle inline pulse / spinner on the tapped card.
  - *Guarded Action:* Fullscreen backdrop blur with prominent "Cancel" vs "Confirm & Execute" touch targets.
  - *Degraded Provider:* Non-intrusive amber pill in header/tab indicating degraded upstream without disabling the view.
