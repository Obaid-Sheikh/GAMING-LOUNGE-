# Backend handoff - Phase 4

This document describes the local implementation audited on 2026-10-23. API routes
below are **proposals**, not existing endpoints. Do not replace the mock repository or
install backend/client dependencies until the backend development task is authorized.

## Current architecture and decisions to resolve

The working application is React 19, JavaScript/JSX, Vite 8, React Router 7 and
Tailwind 4 plus scoped CSS. It has no TypeScript, API client, TanStack Query, Express,
ORM, database, real identity provider or payment provider. `App.jsx` defines public,
customer-only and admin-only route groups. `AuthProvider` supplies mock identities;
`useLoungeData` reads validated repository snapshots and subscribes to same-window
and cross-tab events. `useBookings` is a compatibility projection. AdminLayout adds
the operational snapshot and a preview time to its outlet context. Mutations still use
real demo clock time, independently of that preview.

Intended backend direction: Node.js, Express, PostgreSQL and a later ORM decision
(Prisma or an alternative). `architecture.md` and README describe older proposed
technologies, not installed ones. BRD names Firebase/Google and Razorpay, while the
architecture leaves providers undecided. Confirm identity provider, payment provider,
ORM, deployment origin, production policies, tax/refund rules and data import strategy
before implementing those areas. Do not infer approval from a prototype constant.

## Current persistence and entities

`mockRepository.js` owns `gaming-lounge:repository:v1`. The key suffix is a namespace;
the current envelope is `schemaVersion: 2`:

```text
{ schemaVersion, revision,
  inventory: { zones: [...], stations: [...], maintenance: [...] },
  bookings: [...], activity: [...], menu: [...], orders: [...],
  transactions: [...], settings: { displayName, contact, cancellationPolicy } }
```

| Entity | Current fields and relationships |
| --- | --- |
| Identity | `demo-customer` or `demo-admin`; roles resolved from identity, never the stored role field. No user table or expiry exists. |
| Zone | Four permanent IDs: playstation, xbox, pc, entertainment; name, description, active, archived, order, columns, gridArea and public presentation metadata. |
| Station | Permanent ID, zoneId FK, name, equipment, rate, capacity, games[], amenities[], active, archived, position[row,column]. |
| Game | Static catalog in data/catalog.js with supportedGames in inventory.js. Station/game associations must be supported by their zone. No catalog CRUD implementation. |
| Maintenance | id, stationId FK, reason, startedAt, optional endedAt; at most one open record per station. |
| Booking | id, userId, stationId, zoneId, stationName/zoneName snapshots, start/end UTC epoch ms, duration hours, gameId, status, createdAt, source, sessionMode, hourlyRate/gamingPrice/foodSubtotal/price, addOns[], optional customerName/customerContact, actualStart/actualEnd, cancellation metadata, history[]. |
| Food snapshot | `{id, name, quantity, unitPrice}` frozen at booking; menu changes must not reprice history. |
| Menu item | id, name, description, category, price, available, archived. Categories come from data/foodCatalog.js. |
| Order | One per food-bearing saved booking; deterministic `order-<bookingId>` ID, bookingId FK, items identical to booked addOns, total, status, createdAt, optional updatedAt, legacy/unverified flags, history[]. |
| Transaction | id, bookingId FK, amount, method, type(payment/refund), status(successful/pending/failed), at, adminId, note, reference, optional legacy/dateEstimated. Append-only through the UI. |
| Activity | id, action, at, adminId, target, before/after; customerContact is scrubbed recursively. Session/booking history is retained separately. |
| Settings | Display name, public contact and cancellation-policy copy. Operational rules are displayed from constants and cannot be edited. |

Future database entities should normalize users/roles, games/station games, booking
food lines, orders/order lines, sessions/session events, payments, maintenance and
audit records while preserving stable external IDs and historical snapshots. ZoneId
on a booking describes its booked zone, which may differ from a station's later zone.
Archive is soft deletion: do not cascade-delete booking/order/payment history.
Rooms are currently exclusive reservable units even though their guest capacity is >1;
capacity is not permission to sell overlapping seats. No multi-station cart exists.

Reads never write or seed storage. Version-1 envelopes and the older
`gaming-lounge:demo-bookings:v1` key migrate **in memory**, preserving IDs and prices.
The first successful mutation writes validated version 2; legacy storage is retained.
Existing version-2 menu/ledger data is never reseeded. Corrupt/unsupported versions
fail closed; quota/validation failures retain the prior bytes. The auth key is
`gaming-lounge:demo-auth:v1`. Local storage contains all mock data and is not private.

`transact` clones a fresh read, applies the change, reconciles booking orders, validates
the complete envelope, increments revision and performs one write. Web Locks serialize
cooperating same-origin tabs; without them the fallback is single-tab only. Events
`demo-lounge-changed`, legacy `demo-bookings-changed`, and native storage events refresh
views. None of these mechanisms provides cross-device or server concurrency safety.

Recurring `fixture-<date>-<index>` bookings are read-only, expanded on demand, never
persisted, and must never be imported as real reservations or ledger receipts.

## Feature boundaries and proposed API map

Paths are relative to `/api`. C = authenticated customer, O = owning customer,
A = authorized administrator. Staff is not currently an implemented role.

| Area / current UI or hook | Mock boundary | Model | Proposed API / authorization / critical rules |
| --- | --- | --- | --- |
| LoginPage, ProtectedRoute, AuthProvider | demoAuth.resolveDemoSession/loginDestination; demoStorage | Identity/session | `GET /auth/session`, `POST /auth/login`, `POST /auth/logout`; verified server identity, secure session, no caller-selected role. Provider-specific login exchange remains undecided. |
| DashboardPage, AdminCustomersPage | useBookings; customerDirectory | User + booking-derived aggregates | `GET /users/me` C/A; `GET /users` A; `GET /users/:id/bookings` A or self with explicit field filtering; pagination and identity separation. Walk-ins are not automatically registered accounts. |
| HomePage, StationPicker, AdminStationsPage/ZoneForm | readInventory, orderedZones; runAdmin zone.save | Zone | `GET /zones` public safe projection; `PATCH /zones/:id` A; protect unresolved reservations and preserve stable IDs. Zone creation/removal is not a current frontend feature. |
| StationPicker, AdminStationsPage/StationForm, AdminFloorPage | readInventory; runAdmin station.save/archive/restore | Station | `GET /stations`, `GET /stations/:id` public safe inventory; `POST /stations`, `PATCH /stations/:id`, `POST /stations/:id/archive` and `/restore` A; unique IDs/positions, supported games and booking protections. |
| StationPicker, public games section | data/catalog.js, supportedGames | Game + station association | `GET /games?stationId=...` public; future catalog mutations A only, deferred until their UI is authorized. |
| SessionPicker, StationPicker, floor selectors | availability/sessionProblem/stationStatus; operationalSnapshot | Station + blocking booking/session/maintenance | `GET /availability?zoneId&date&hour&duration` public or C, with public-safe station results and server time; advisory only. `GET /stations/status` A for floor summaries; public results must omit customer/contact/payment details. |
| BookingPage, confirmation/history, AdminBookingsPage, WalkInForm | reserveDemo/cancelDemo; runAdmin walk-in.create/booking.cancel/booking.reschedule | Booking + snapshot lines | `GET /bookings` C own/A all, `GET /bookings/:id` O/A, `POST /bookings` C, `POST /bookings/walk-ins` A, `POST /bookings/:id/cancel` O/A, `/reschedule` A; server owner, prices, conflict checks, idempotency and resource versions. |
| BookingActions, StationDrawer | runAdmin session.start/end/extend; extensionQuote | Booking + actual session/history | `POST /sessions` A with bookingId; `POST /sessions/:id/end`, `/extend` A. Current frontend has no separate session ID; return it in the future booking DTO and adapt controls at integration. Actual and scheduled times stay separate. |
| AdminStationsPage, StationActionDialog | runAdmin maintenance.start/end | Maintenance | `GET /maintenance` A, `POST /maintenance` A, `POST /maintenance/:id/end` A; lock station, refuse unresolved reservations, one open record. |
| FoodModal, AdminFoodPage | snapshotAddOns; runAdmin menu.save/archive/restore/availability | Menu + booked snapshots | `GET /menu` public/C safe list; `POST /menu`, `PATCH /menu/:id`, archive/restore A. Validate current availability and reviewed prices again at booking commit. |
| AdminOrdersPage, BookingInfo, floor drawer | syncBookingOrders/orderForBooking; runAdmin order.status | Order + lines/history | `GET /orders` A, `GET /orders/:id` A (owner projection only if later needed), `POST /orders/:id/transitions` A; atomic allowed transition/version check, cancellation review and no double charge. |
| AdminPaymentsPage, CommerceControls, BookingInfo | runAdmin payment.record; paymentSummary | Transaction + balance | `GET /payments` A, `POST /payments` A for explicitly authorized receipts/refunds, `GET /bookings/:id/balance` O/A with filtered details; server money arithmetic, ledger lock, refund/overpayment bounds and idempotency. No live payment provider is selected. |
| AdminAnalyticsPage, overview | reportingRange, analytics, commerceSnapshot, csvText | Derived aggregates | `GET /analytics?from&to`, `GET /analytics/bookings.csv` A; IST boundaries, privacy, CSV escaping and separate booking/receipt/refund measures. |
| AdminSettingsPage, public booking review | defaultSettings; runAdmin settings.save | Settings | `GET /settings/public` public contact/policy projection, `GET /settings` and `PATCH /settings` A; display-only changes, version checks. Operational-rule editing remains deferred. |
| ActivityLog, admin booking history | audit + booking.history | Audit/history | `GET /activity?target&cursor` A; append-only server actors/times, no raw contacts or credentials in logs. |

## Transport conventions (proposed)

Use JSON request bodies and ISO 8601 UTC instants in wire responses. The current
frontend uses epoch milliseconds, so perform explicit DTO conversion at the service
boundary during integration. Return integer minor units for INR (or fixed decimal
strings with a specified scale); never use binary floating point as server accounting.
Do not persist client-calculated totals or trust client-supplied owner/actor IDs.

```json
{ "data": { "id": "...", "version": 4 }, "meta": { "serverTime": "2030-01-02T10:40:00Z" } }
```

Lists: `{data: [...], meta: {nextCursor, serverTime}}`, bounded page size and stable
sorting. Use a per-resource version/If-Match for editing, not a global lounge revision
that rejects unrelated work. Return 201 for creation, 200 for other successful JSON
responses, and 204 for logout if no response DTO is needed.

```json
{ "error": { "code": "BOOKING_CONFLICT", "message": "This station is no longer available.",
  "fieldErrors": {}, "requestId": "opaque-id" } }
```

401 missing/expired session; 403 wrong role; 404 unavailable/nonowned resource without
private enumeration; 422 malformed fields, invalid duration/money/date; 409 overlap,
maintenance, stale quote/version, illegal transition or insufficient balance; 429 rate
limit; 500 generic server error with an internal correlation ID. Never return stack
traces, SQL errors, another customer's booking, or sensitive payment details.

### Booking creation and quotes

Proposed `POST /bookings`, authenticated C, `Idempotency-Key` header:

```json
{ "stationId": "ps-03", "date": "2030-01-03", "hour": 16, "duration": 2,
  "gameId": "fc", "food": [{ "menuItemId": "fries", "quantity": 2 }],
  "quoteId": "server-issued-reviewed-quote" }
```

Add proposed `POST /bookings/quote` with the same selection to return a bounded-lived
quote containing current item/rate versions, server-derived totals and a server time.
A quote does not reserve inventory. The exact quote mechanism is a design decision;
the required behavior is to reject changed reviewed prices rather than silently charge
more. Walk-in creation additionally accepts display name and optional private contact;
userId/source/actor/status are server-derived and the operation requires A.

Creation returns a booking DTO with immutable monetary/name snapshots, UTC start/end,
status `confirmed`, manual-session state, linked order ID (if any), balance summary,
version and server time. Create booking, lines, order and history in one transaction.
Conflicts return 409 without a partial booking or orphan order. An idempotent retry
with the same key/payload returns the original result; changed payload under that key
is a conflict. Scope keys to authenticated actor and operation and define retention.

### Session, booking and maintenance mutations

- Reschedule: `{stationId,date,hour,duration,expectedVersion}`; same-station rate and
  original food snapshots remain; different station uses its current reviewed rate.
  Preserve owner, game, ledger and prior schedule. Reject unsupported game or overlap.
- Cancel: `{reason,expectedVersion}` for admin; customer uses existing future-confirmed
  eligibility. Preserve order and receipts; no automatic refund.
- Start: `{bookingId,expectedVersion}` to `/sessions`; server sets actualStart only
  within the scheduled interval and on an operational station without another active
  session. End: `{expectedVersion}`; server records actualEnd and completion.
- Extend: `{endHour,expectedVersion,quoteId}`; reprice gaming at original booked rate,
  preserve food/receipts, reject closing-time, elapsed, maintenance and overlap conflicts.
- Maintenance: `{stationId,reason,expectedStationVersion}`; refuse unresolved saved
  bookings until explicitly cancelled/rescheduled. Never silently cancel them.

### Order and payment mutation examples

`POST /orders/:id/transitions`: `{status:"preparing",expectedVersion:3}`.
Return updated order/history and version; stale or invalid transitions return 409.

`POST /payments` mock/manual-receipt planning example:

```json
{ "bookingId": "booking-id", "type": "payment", "amountMinor": 10000,
  "method": "cash", "status": "successful", "reference": "", "note": "",
  "expectedBookingVersion": 3 }
```

Return immutable ledger entry, updated balance/version and actor/time from the server.
This models the prototype cash-desk behavior only. A real provider must use separate
intent/verification/webhook contracts; a browser must never declare a provider charge
successful. Verify webhook signatures and provider IDs with idempotent reconciliation.
Provider/refund implementation requires a later explicit decision.

## Booking invariants and database concurrency

Current demo rules: Asia/Kolkata; 10:00-22:00; whole-hour starts; customer durations
1/2/3 hours; horizon through 30 days ahead inclusive; compatible admin extensions up
to closing; walk-ins can use an already-started hourly slot only if it has not ended.
These are demo constants, not approved production operating policy.

Use half-open `[start,end)` intervals so adjacent bookings can succeed. Confirmed and
pending reservations block the station. A manually completed session still retains
its scheduled interval until its original end, even when ended early. Cancelled
bookings do not block. A running actual session that overruns must prevent another
customer being seated until explicitly ended; scheduled availability alone is insufficient.

For every booking, reschedule, extension, maintenance and station-state mutation:

1. Authenticate and authorize, validate bounded inputs, normalize IST selection to UTC.
2. Begin a database transaction and lock the affected station rows in deterministic ID
   order (old and new station for moves). All competing operations must use this rule.
3. Re-read operational state, blocking reservations, running sessions, quote versions
   and applicable rates/menu data; do not trust a preceding availability GET.
4. Enforce a PostgreSQL range exclusion constraint, or an equivalent proven serialized
   allocation design, for blocking station/time intervals. Include early-completed
   allocations until their scheduled end. A plain read-then-insert is insufficient.
   Ensure only one open actual session per station as an additional invariant.
5. Persist booking/order/line/audit changes and idempotency result atomically; commit.
6. Publish safe invalidation events only after commit. Refetch after missed events,
   reconnect and stale-version responses; events do not grant a reservation.

Resolve database constraint or serialization conflicts as 409 with safe retry behavior.
Use bounded retries for serialization/deadlock errors. Pending prototype reservations
have no TTL; if production holds are introduced, define expiry, release jobs and which
states count as blocking before choosing constraints. Do not embed an unstable wall
clock expression into a constraint as a substitute for explicit state transitions.

Backend integration tests must demonstrate exactly one winner for simultaneous
overlapping bookings and valid adjacent bookings, plus races with maintenance,
archive/deactivation, reschedule, session start/extension and duplicate retry keys.
Server time is authoritative; browser time and Web Locks are not enforcement.

## Food, ledger and reporting invariants

Food quantities are whole numbers 1-99. Revalidate current menu availability/archive
state, selected game and reviewed prices under the mutation transaction. Preserve
historical item names/prices; station/menu edits do not reprice existing bookings.
Food order value is already included in booking total and is never charged twice.

Allowed order transitions: `placed -> preparing -> ready -> delivered`, with
`placed/preparing/ready -> cancelled`. Delivered/cancelled are terminal. A cancelled
booking's undelivered order requires explicit order cancellation; further fulfillment
is refused. Never infer refunds from either cancellation or early session completion.

```text
payments = sum(successful payment entries)
refunds = sum(successful refund entries)
net = payments - refunds
outstanding = booked total - net
```

Only successful entries affect money. Pending/failed entries are attempts. New payments
cannot exceed current outstanding or apply to a cancelled booking; refunds cannot
exceed current net receipts. Lock the booking/ledger balance and recompute inside the
transaction to prevent concurrent overpayments/refunds. A shorter reschedule may
create negative outstanding (credit due), which requires explicit refund handling.
Extensions preserve collected receipts and make increased charges outstanding.

Legacy migration imports only explicit paid metadata once; unknown/refunded metadata
does not prove an original receipt. Estimated payment dates count in balances but are
excluded from dated revenue. Unverified legacy orders require explicit review. Do not
import localStorage into production without an authorized validation/reconciliation plan.

Reports use IST calendar start inclusive / next midnight exclusive. Last 7/30 days
include today; custom periods allow up to 367 days. Booked value uses scheduled dates,
excludes cancellations and includes food once. Receipts/refunds use successful actual
transaction timestamps and exclude future/estimated entries. Food popularity/order
value uses noncancelled order creation dates. Current occupancy uses recorded starts
on currently operational stations, independently of report dates. Utilization clips
recorded actual time to elapsed operating hours; current data cannot reconstruct all
historical downtime. Fixtures never become real sales. CSV output must keep formula
prefix neutralization (including whitespace/control prefixes) and quote escaping.

## Authentication, validation and privacy responsibilities

- Verify identity on the server, assign roles explicitly and deny by default at every
  resource operation. Owner comes from the session; preserve it through admin changes.
- Design session expiry/revocation, secure HttpOnly/Secure/SameSite cookies or approved
  provider verification, CSRF protection for cookie mutations, restrictive CORS, TLS,
  rate limits and bounded payloads. Current demo sessions deliberately have no expiry.
- Validate IDs/foreign keys, real dates and timezone, numeric bounds, decimal scale,
  inventory state, game compatibility, version, transitions and ledger balance. Current
  validators support the mock envelope; they are not a complete server schema.
- Public projections must never expose names, contact, booking history, balances,
  internal notes or audit entries. Restrict walk-in contact to authorized admin detail
  views. Redact contact and credentials from events, logs and error payloads.
- React text rendering currently avoids raw HTML. Keep it that way, validate URL fields
  if introduced, and preserve spreadsheet-safe CSV output.
- No application credentials/secrets were found in inspected frontend sources. Add
  explicit `.env`/key exclusions and server-only secret management before backend setup;
  current .gitignore excludes `*.local` but not every `.env` file. Never use VITE_ for
  privileged secrets. Define backups, retention and audited migrations before launch.

## Integration sequence and acceptance gates

1. Finalize the open policies/providers, DTOs, errors, money/time representations and
   database invariants. Add backend migrations, tests and a dedicated test environment.
2. Implement server authentication/session and public catalog/settings reads. Replace
   AuthProvider's internals when endpoints work; retain UI route guards for UX.
3. Add server availability/quotes and transactional booking creation/history/cancellation.
   Replace reserveDemo/readBookings at a clean service boundary; add loading/network/
   conflict states where the synchronous mock previously returned immediately.
4. Integrate admin inventory, maintenance, walk-ins and session commands with versions
   and server time. Keep floor coordinates and existing UI components.
5. Integrate menu/order services and atomic booking-order creation; then ledger and
   reporting under the approved manual/provider payment model. Verify money totals
   and time boundaries against existing domain tests plus real concurrent DB tests.
6. Replace useLoungeData local events with authorized server reads/invalidation and
   reconnect reconciliation. Avoid exposing the full admin repository to customers.
7. Run the five browser journeys against backend test fixtures, ownership/role tests,
   two independent clients, failure/retry tests, migration recovery and production-build
   routing/CORS checks. Never mix recurring demo fixtures with server availability.

Local demo data migration must be explicit, versioned, backed up and validated; do not
silently reset it or upload all browser data. Browser scripts currently import mock
modules and use a 2030 test clock; adapt their test setup for server-controlled fixtures
and authoritative test time rather than changing the production application clock.
