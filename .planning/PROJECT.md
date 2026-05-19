# FNF Network Monitor (FNF NMS)

## What This Is

A dedicated Network Monitoring System (NMS) for FNF ISP. The platform will provide real-time monitoring and alerting for both the MikroTik Core Network (bandwidth, CPU, uptime) and the OLT Fiber Network (ONU/ONT optical Rx/Tx signal levels). 

## Core Value

Proactive network fault detection—enabling the FNF support team to identify and resolve weak fiber signals or overloaded routers before they cause customer downtime.

## Requirements

### Validated

- [x] Connect to MikroTik routers via API/SNMP to fetch live bandwidth traffic.
- [x] Monitor MikroTik Core Router health metrics.
- [x] Monitor ONU/ONT optical power signals.
- [x] Implement automated Telegram alert system.
- [x] Create a unified real-time dashboard.

### Active

(None - V1 completed)


### Out of Scope

- ISP Billing and User Creation — The company already uses a separate dedicated billing and CRM software for managing users and payments.
- Customer Self-Service Portal — This system is strictly for internal NOC (Network Operations Center) monitoring and support staff.

## Context

- **Environment:** The ISP relies on a mix of MikroTik routers for core routing/traffic shaping, various switches, and Optical Line Terminals (OLTs) for fiber delivery. 
- **Current Issue:** Without centralized signal monitoring, fiber cuts or degradation are often reported by users after an outage occurs. Proactive monitoring will reduce reaction time.

## Constraints

- **Compatibility**: Must support SNMP reading for various OLT vendors and API access for MikroTik.
- **Performance**: Real-time polling shouldn't overload the core routers or OLT management interfaces.
- **Security**: SNMP community strings and MikroTik API credentials must be securely stored. Read-only access should be preferred where configuration changes are not needed.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Develop both MikroTik & OLT monitoring concurrently | The user determined both aspects are equally critical to their day-to-day operations. | Validated in v1.0 |
| Exclude billing/CRM features | Existing software already handles this, keeping the NMS focused and lightweight. | Validated in v1.0 |

## Current State
**v1.0 (Shipped 2026-05-19):** Core router integration, fiber OLT optical monitoring, realtime glassmorphism dashboard, and Telegram alerting successfully deployed.

## Next Milestone Goals
**v2.0 (Planned):** Visual Network Topology Map and Weekly Summary Reports.

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-19 after initialization*
