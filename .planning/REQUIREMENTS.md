# Requirements: FNF NMS

**Defined:** 2026-05-19
**Core Value:** Proactive network fault detection—enabling the FNF support team to identify and resolve weak fiber signals or overloaded routers before they cause customer downtime.

## v1 Requirements

### Core Network Monitoring
- [ ] **CORE-01**: Connect to MikroTik routers via API/SNMP.
- [ ] **CORE-02**: Fetch live bandwidth traffic for the MikroTik core router.
- [ ] **CORE-03**: Monitor MikroTik Core Router health metrics (CPU, Memory, Uptime).

### Fiber Monitoring
- [ ] **FIBR-01**: Connect to OLT via SNMP.
- [ ] **FIBR-02**: Read ONU/ONT optical power signals (Rx/Tx).
- [ ] **FIBR-03**: Detect rogue ONUs or ONUs with dangerously low signal levels (below -27dBm).

### Alerts & UI
- [ ] **ALRT-01**: Implement automated Telegram alerts for device downtime.
- [ ] **ALRT-02**: Send Telegram alerts when fiber signals drop below threshold.
- [ ] **UI-01**: Create a unified dashboard displaying real-time network health and traffic.

## v2 Requirements
- **TOPO-01**: Visual Network Topology Map.
- **RPRT-01**: Weekly summary reports of fiber degradation.

## Out of Scope
| Feature | Reason |
|---------|--------|
| Billing System | Existing separate software handles billing and CRM. |
| Customer Portal | System is internal-only for the FNF NOC/Support Team. |

## Traceability
| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 1 | Pending |
| FIBR-01 | Phase 2 | Pending |
| FIBR-02 | Phase 2 | Pending |
| FIBR-03 | Phase 2 | Pending |
| UI-01   | Phase 3 | Pending |
| ALRT-01 | Phase 3 | Pending |
| ALRT-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0
