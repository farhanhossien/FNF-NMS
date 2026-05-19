---
phase: 01-core-router-setup
plan: 01
subsystem: api
tags: [nodejs, dotenv, node-routeros, mikrotik, routeros]
requires: []
provides:
  - Connection to MikroTik core router using API
  - Fetching router resource metrics (CPU, Memory, Uptime)
  - Fetching router interface bandwidth metrics (rx/tx speed)
  - Unit tests mocking RouterOS API
affects: [02-fiber-monitoring-integration, 03-dashboard-alerts]
tech-stack:
  added: [dotenv, node-routeros]
  patterns: [Service module class wrapper for RouterOSAPI, built-in node:test and node:assert mock testing]
key-files:
  created: [src/config/env.js, src/services/mikrotik.js, src/index.js, tests/mikrotik.test.js, .env, .env.example, .gitignore]
  modified: [package.json]
key-decisions:
  - "Use node-routeros as API wrapper as planned, with custom mock implementation for unit testing."
  - "Used standard ES6 class structure for MikroTikService to ensure reusable and testable API client logic."
patterns-established:
  - "MikroTikService Class pattern: Encapsulates connection lifecycle, API commands, and metric formatting."
  - "Built-in Node.js Mock Testing pattern: Injecting mocks into require.cache to unit test third-party binaries."
requirements-completed: [CORE-01, CORE-02, CORE-03]
duration: 25min
completed: 2026-05-19
---

# Phase 1: Core Router Setup Plan 1 Summary

**MikroTik API integration with environment configurations, system resource mapping, traffic monitor interface execution, and unit tests using built-in node:test mocks.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-19T16:25:33+06:00
- **Completed:** 2026-05-19T16:50:00+06:00
- **Tasks:** 5 completed
- **Files modified:** 8 total files created or modified

## Accomplishments
- **MikroTik Connection Wrapper:** Built robust class-based API connection logic supporting custom timeouts and error recovery under `src/services/mikrotik.js`.
- **System Health Engine:** Created `getSystemResources()` mapping CPU, uptime, firmware versions, free/total memory, and hardware details.
- **Bandwidth Monitor:** Implemented `getInterfaceTraffic(interfaceName)` utilizing the API `/interface/monitor-traffic` command with a single snapshot fetch (`=once`).
- **Comprehensive Unit Testing:** Designed automated mocking for `node-routeros` inside `tests/mikrotik.test.js` using Node's standard test runner, verifying all success, connection fail, and fetch-before-connect states.

## Files Created/Modified
- `src/config/env.js` - Dynamic environment config loader using `dotenv`.
- `src/services/mikrotik.js` - Main MikroTik service containing all query logic.
- `src/index.js` - Demonstration entry point executing health and traffic checks.
- `tests/mikrotik.test.js` - Comprehensive mocked test suite.
- `.env` & `.env.example` - Local credentials template.
- `.gitignore` - Safeguarding credentials and modules.
- `package.json` - Registered npm start, npm test scripts, and dependencies.

## Decisions Made
- **Built-in Test Runner:** Used Node's built-in `node:test` and `node:assert` instead of installing heavy frameworks like Jest, keeping dependencies extremely lean.
- **Dependency Cache Mocking:** Mocked the third-party binary wrapper directly inside Node's `require.cache` in the test file, ensuring tests are 100% reliable without local router hardware.
- **Bps Conversion:** Retained raw bits-per-second (bps) returned by the router API, providing flexible raw data that can be formatted cleanly in the console and the future dashboard.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- **Empty Connection Errors:** Encountered empty socket errors during unreachable router connections because `error.message` was empty. Enhanced the catch blocks to log `error.message || error` to ensure full socket object debugging visibility.

## User Setup Required
None - no external service configuration required yet. The `.env` template is provided for manual environment tuning.

## Next Phase Readiness
- Core network metrics fetching and connection wrappers are fully validated and unit tested.
- Fully ready for Phase 2: Fiber Monitoring Integration (polling OLT SNMP for optical power signals).
