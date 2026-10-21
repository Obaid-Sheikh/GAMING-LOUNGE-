---
name: booking
description: Use when designing or changing gaming resource availability, slot reservations, booking states, double-booking prevention, cancellation, or realtime booking updates.
---

# Booking System

## Scope
Own booking correctness for PS/Xbox/PC resources and group entertainment zones. Consult relevant business rules in `docs/BRD.md` and booking architecture only. Ask for unspecified policy (durations, buffers, cancellation, holds, payment) rather than inventing one.

## Core invariants
- A confirmed booking must not overlap another active reservation for the same exclusive resource/time interval.
- The database/backend is the source of truth; UI availability and realtime messages are advisory.
- Validate opening hours, resource capacity, time zone, slot duration, maintenance blocks, and allowed state transitions on the server.
- Use half-open time ranges `[start, end)` so adjacent bookings are possible unless a buffer is required.
- Never assume all zones are single-capacity; model each reservable unit and capacity explicitly.

## Suggested states (confirm with requirements)
`pending` / `held` / `confirmed` / `cancelled` / `completed` / `expired`. Define allowed transitions before coding; do not expose unimplemented states as working features.

## Implementation workflow
1. Define booking inputs, resource identity, interval, capacity, and cancellation/hold policy.
2. Document acceptance cases: valid booking, adjacent booking, overlap, simultaneous requests, stale UI, cancellation, expiry, maintenance.
3. Design atomic enforcement: PostgreSQL exclusion constraint or transactional locking with an appropriate data model; do not rely on read-then-insert without protection.
4. Validate inputs, authorization, and price on the server; consider idempotency keys for retryable create operations.
5. Commit reservation before publishing realtime events; clients refetch/reconcile after reconnect or missed events.
6. Test race conditions with concurrent booking requests and verify exactly one conflicting request succeeds.

## Realtime rules
- Events are notifications, not proof of successful booking.
- Never broadcast private customer details to public subscribers.
- Support reconnect/refetch and stale-state recovery.
- Ensure cancellations release inventory only according to confirmed state and policy.

## Completion checklist
Concurrent booking protection demonstrated, timezone/edge cases tested, permissions checked, clear status and conflict messages.
