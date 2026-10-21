---
name: testing-security
description: Use when writing or reviewing tests, preventing regressions, checking authorization, validating secure configuration, or testing booking edge cases and concurrent reservations.
---

# Testing and Security

## Scope
Verify code quality, functional correctness, and security for the Gaming Lounge. Read only changed files, related tests, and directly relevant configuration. Follow `AGENTS.md`.

## Risk-first workflow
1. Identify changed behavior, trust boundaries, and highest-impact failure modes.
2. Select the smallest useful test layer: unit for pure logic, integration for API/database, end-to-end for core user flows.
3. Add or update tests before declaring a feature complete; do not replace meaningful assertions with snapshots alone.
4. Run targeted checks first, then broader lint/typecheck/build/test suites as appropriate.
5. Report results accurately, including tests not run and residual risks.

## Essential cases
- Authentication: unauthenticated requests denied; expired sessions rejected.
- Authorization: customer cannot access another customer's bookings; non-admin cannot change resources/prices.
- Validation: malformed inputs, negative prices/durations, oversized fields, invalid dates, timezones.
- Booking: overlap, adjacent slots, concurrent requests, stale availability, cancellations, expired holds, maintenance blocks, duplicate retries.
- Frontend: loading, empty, error, responsive layout, keyboard navigation, focus and form labels.
- Security: no secrets in client bundles or git, no sensitive data in logs, safe CORS/cookie settings where applicable, dependency review.

## Test hygiene
- Use isolated test data and disposable environments; never run destructive tests against production.
- Mock external services only where appropriate; preserve database integration tests for transaction behavior.
- Treat a passing test suite as evidence, not a guarantee of security; recommend human review for payment/auth changes.
- Do not silently weaken tests to make CI pass.

## Completion report
State files changed, checks executed, pass/fail outcomes, gaps, and any deployment blockers.
