# Roadmap: FNF NMS

## Overview
Developing a proactive Network Monitoring System focusing on MikroTik core routing health, followed by OLT fiber signal monitoring, and unified in a real-time dashboard with Telegram alerts.

## Phases

- [ ] **Phase 1: Core Router Setup** - Integrate MikroTik API/SNMP to monitor traffic and health.
- [ ] **Phase 2: Fiber Monitoring Integration** - Integrate OLT SNMP to monitor ONU optical signals.
- [ ] **Phase 3: Dashboard & Alerts** - Build the UI dashboard and Telegram alert system.

## Phase Details

### Phase 1: Core Router Setup
**Goal**: Connect to the MikroTik core router and continuously fetch health and traffic data.
**Depends on**: Nothing
**Requirements**: CORE-01, CORE-02, CORE-03
**Success Criteria** (what must be TRUE):
  1. System successfully authenticates with MikroTik via API/SNMP.
  2. System retrieves CPU, memory, uptime, and bandwidth data.
  3. Data is logged or temporarily displayed for verification.
**Plans**: 1 plan

Plans:
- [ ] 01-01: Implement MikroTik API connection and fetch logic.

### Phase 2: Fiber Monitoring Integration
**Goal**: Connect to OLTs via SNMP and read optical signal metrics.
**Depends on**: Phase 1
**Requirements**: FIBR-01, FIBR-02, FIBR-03
**Success Criteria** (what must be TRUE):
  1. System polls OLT via SNMP successfully.
  2. ONU/ONT Rx/Tx power levels are retrieved.
  3. Logic implemented to detect thresholds (e.g., -27dBm).
**Plans**: TBD

### Phase 3: Dashboard & Alerts
**Goal**: Visualize the data and notify the team of critical issues.
**Depends on**: Phase 2
**Requirements**: UI-01, ALRT-01, ALRT-02
**Success Criteria** (what must be TRUE):
  1. A web dashboard displays live charts for Core traffic and OLT health.
  2. When a device drops offline or a signal degrades, a message is sent to Telegram.
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Router Setup | 1/1 | Complete | 2026-05-19 |
| 2. Fiber Monitoring Integration | 0/TBD | In progress | - |
| 3. Dashboard & Alerts | 0/TBD | Not started | - |
