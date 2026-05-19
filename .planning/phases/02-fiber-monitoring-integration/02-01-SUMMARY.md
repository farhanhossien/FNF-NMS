# Phase 02-01: Summary

**Plan**: 02-01 Fiber Monitoring Integration
**Date**: 2026-05-19

## What We Built
- Installed and integrated `net-snmp` library for polling OLT parameters.
- Implemented `OltService` in `src/services/olt.js` to manage SNMP connections.
- Mocked the OLT interaction allowing us to securely verify our business logic (warning thresholds).
- Added logic to filter and emit warnings when ONU signal falls below `-27dBm` or goes offline.
- Created unit tests in `tests/olt.test.js` to guarantee logic validity.
- Unified the main run script (`src/index.js`) to test connecting to the Core Router and then the OLT in sequence.

## Lessons Learned
- Using `net-snmp` is straightforward, but it operates slightly lower-level than `node-routeros`. There's no explicit `connect()` promise without issuing an actual SNMP request, which we handled by initiating a generic sysDescr poll during initialization.
- Threshold detection successfully extracts warnings making the code ready to be wired up to the Telegram alerting phase.

## Next Steps
- Implement UI Dashboard and Telegram Alerts in Phase 3.
