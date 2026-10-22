# Phase 3B - Shared inventory, reservations, and session management

## Delivered scope

The Phase 3A.1 design is retained. Stations & Zones and Bookings now have working
management pages; the existing floor drawer and booking details share the same controls.
Authentication remains the existing demo identity/role model. No backend, database,
new state-management context, or dependency was introduced.

Routes:

- `/admin/stations`: station search, zone/state filters, station forms, zone tab,
  maintenance/archive confirmations, maintenance history, and admin activity.
- `/admin/bookings`: all saved customer and walk-in reservations plus labeled read-only
  fixtures; search, status/zone/date filters, start-time sorting, walk-in creation.
- `/admin/bookings/:id`: shared booking details, session/cancellation/rescheduling controls,
  actual timestamps, original schedule history, food snapshots, and target activity.
- `/admin/floor`: existing configurable spatial map, with current shared inventory and controls.

Other management sections remain upcoming for Phase 3C. Nothing was committed or pushed.

## Shared repository and safe migration

The authoritative key is `gaming-lounge:repository:v1`:

```text
schemaVersion: 1
revision: monotonic integer
inventory:
  zones: stable IDs, editable names/descriptions, active/archived, order, grid metadata
  stations: stable IDs, name, zoneId, equipment, rate, capacity, games, amenities,
            active/archived, [row, column] position
  maintenance: records with id, stationId, reason, startedAt, optional endedAt
bookings: normalized persisted customer and walk-in records
activity: admin action records with actor, timestamp, target, before/after
```

`mockRepository.js` reads and validates this envelope. `inventory.js` contains bootstrap
and inventory validation; `bookingSchema.js` handles booking normalization and validation.
`useLoungeData` supplies the same data to public catalog, customer booking/history, admin
overview, floor, and management pages. The original useBookings API now delegates to it.
Static catalogs remain bootstrap fixtures, not a separate editable admin inventory.

Initialization performs no writes. With no repository key, defaults are assembled in memory
and the original `gaming-lounge:demo-bookings:v1` records are read and normalized. The first
successful mutation writes one envelope containing that existing inventory and every saved
booking. The old key is retained unchanged as a migration backup and is no longer the active
write target. Missing add-ons normalize to an empty list; missing price snapshots are derived
from the booked amount, not from subsequently edited station rates.

Unknown versions, malformed JSON, missing referenced inventory, invalid values, duplicate IDs,
position collisions, inconsistent totals, or conflicting scheduled/actual reservation intervals
fail closed. They are not silently reset or discarded. Default station and zone IDs cannot be
removed. The data error message advises retaining/backing up the data rather than clearing it.
A failed write leaves the previous persisted envelope intact.

Every mutation re-reads the latest envelope under the same Web Lock and commits a validated
clone with one localStorage write. The lock callback returns a promise so rejected operations
also release the lock. The synchronous fallback protects one tab only. Form revision checks
reject stale edits; the revision is captured when the form opens (or at walk-in review).

Successful writes emit `demo-lounge-changed`; hooks also subscribe to native cross-tab storage
events for the repository/legacy keys and clear events. Clocks refresh after mutations/events,
so actual starts appear immediately. This is same-browser consistency, not cross-device realtime
or production multi-user conflict protection.

## Station and zone workflows

Station IDs are unique, lowercase, permanent identifiers, including archived stations.
Forms validate required name/equipment, nonnegative INR rates with two-decimal precision,
whole-number capacity 1-50, zone-compatible games, bounded amenities, and available positions.
Existing stations can be renamed, repriced, assigned to a zone, configured, or made inactive.
New stations receive the next free row/column in their zone. Existing positions can be edited
with collision and column-bound checks. Crowded zones trigger the existing grid fallback.

Active or future saved reservations must be explicitly cancelled/rescheduled before archive,
deactivation, zone reassignment, maintenance, or removal of a required game. The service refuses
those changes and identifies the reservations. Maintenance dialogs link to booking resolution;
there is no override that silently cancels bookings. A station save with maintenance selected
commits both changes atomically.

Archiving is soft deletion. IDs and history remain available to booking details. Archived
stations disappear from customer choices and the active floor; restore chooses a free position.
Maintenance has a reason, start time, and retained restoration timestamp/history. Restoring
maintenance does not implicitly activate a station that was independently marked inactive.
Inactive station/zone status is separate from maintenance in the floor and KPI counts.

Zones keep the initial four IDs. Names, descriptions, availability, and display order can change.
Station reassignment occurs in the station form. Disabling a zone requires resolving its saved
reservations. Archiving a zone also requires archiving/reassigning its non-archived stations.
Public and customer zone lists use shared order/availability; floor coordinates remain configurable.

## Booking and walk-in rules

Customer reserve/cancel and every admin operation use the same persisted records and availability
rules. Intervals are half-open; adjacent reservations are allowed. Confirmed/pending overlapping
reservations are refused. Inactive, archived, or maintained resources and unavailable zones cannot
receive new reservations. Date horizon and demo hours remain 10:00-22:00 IST, up to 30 days ahead.
Customer initial durations remain 1, 2, or 3 hours.

Walk-ins require the existing demo admin identity both at the route and service boundary.
The form includes display name, optional admin-only contact, zone/station/date/hour/duration,
optional game, the existing food picker, a summary, review, and confirmation. A walk-in may use
an already-started hourly interval today only if it has not ended and is conflict-free; its full
scheduled hourly charge applies. The record source is `walk-in`, with no customer login required.
Contact information is not rendered in customer history or station previews and is omitted from
activity before/after values. Customer-owned records retain their userId during admin changes.

Cancellation requires confirmation and a reason, retains the record/history, and releases its
scheduled interval. Only unstarted, unelapsed confirmed/pending reservations can be cancelled or
rescheduled. Rescheduling checks the latest resource state, compatible game, time, and conflicts;
keeps owner, food unit-price snapshots and payment metadata; and saves the previous schedule in
history. Same-station changes retain the booked hourly rate. A different station uses its current
rate, shown before confirmation. Existing reservations never reprice merely because a rate changes.

## Sessions: scheduled versus actual

New customer and walk-in bookings use `sessionMode: manual`. A confirmed future reservation is
Reserved, not physically Occupied. A confirmed interval awaiting manual start is also Reserved.
Start is eligible during the confirmed scheduled interval, on an operational station, with no
conflicting actual session or reservation. It records actualStart and never replaces start/end.
An actual start later than the viewed snapshot cannot produce occupied status at that snapshot.

End requires a recorded start, records actualEnd, sets completed status, and releases physical
occupancy. Scheduled start/end, charges, ownership, food, and action history remain intact.
Early completion deliberately retains the scheduled block until its scheduled end: the floor
shows Reserved rather than Occupied, and another booking cannot reuse that interval. Subsequent
reservations are preserved. An overdue actual session stays physically active until manually
ended; the next reservation cannot start while it is still active.

Extension supports active or eligible upcoming confirmed sessions. The new end is an hourly
boundary after both current end and current time, on the same scheduled date and no later than
22:00 IST. Conflicts are rechecked. Gaming totals use the original hourly-rate snapshot; food
snapshots and payment status are retained. Confirmation displays the before/after total. Earlier
scheduled times and actual timestamps stay in per-booking history.

Older records without manual session metadata retain their Phase 3A time-derived simulated
interpretation. Actual timestamps are not fabricated during migration. Recording an explicit
start is required before the new End action can create an actual completion for such a record.
Recurring fixtures remain labeled read-only simulated sessions, never editable customer records.

## Fixtures, payments, and logging

Daily fixtures still come from the shared recurring fixture helper; their IDs include the date.
They remain separate from persisted bookings and retain seed hourly-price snapshots after inventory repricing. Start/end/extend/cancel/reschedule reject fixture
IDs. Maintenance/archive resolution concerns saved reservations; recurring catalog fixtures are
not real customer obligations and cannot be cancelled or converted into saved records. Their
station rows may remain visible as labeled fixtures even after a resource is archived.

Booking status, actual session state, payment status, and food fulfillment status remain separate.
Missing payment/order metadata remains unknown. Editing a reservation does not claim payment was
collected. Existing paid records acquire a paidAmount snapshot when normalized; increases in booking
total do not invent additional paid revenue. Full balances, refunds, and payment/order workflows
are deferred to Phase 3C.

Activity records cover station create/edit/archive/restore, zone edits, maintenance start/end,
walk-in creation, cancellation/rescheduling, and session start/end/extension. Each includes a UTC
timestamp, admin ID, target, and relevant before/after snapshots. Per-booking history additionally
retains previous scheduled/actual values. Activity can be inspected from management pages or a
booking detail. This is a local demo log, not tamper-proof audit infrastructure.

## Files created

- `src/lib/inventory.js`, `bookingSchema.js`, `mockRepository.js`, `adminManagement.js`
- `src/lib/management.test.mjs`, `repository.test.mjs`
- `src/hooks/useLoungeData.js`
- `src/components/admin/ManagementDialog.jsx`, `ActivityLog.jsx`, `ReservationFields.jsx`
- `src/components/admin/StationForm.jsx`, `ZoneForm.jsx`, `StationActionDialog.jsx`
- `src/components/admin/WalkInForm.jsx`, `BookingActions.jsx`
- `src/pages/admin/AdminStationsPage.jsx`, `AdminBookingsPage.jsx`
- `scripts/verify-phase3b.mjs`
- `docs/phase3b.md`

## Files modified for Phase 3B

- `src/App.jsx`, `src/data/adminLayout.js`, `src/data/bookingCatalog.js`
- `src/lib/bookingRules.js`, `bookingStore.js`, `adminSelectors.js`, `demoStorage.js`
- `src/hooks/useBookings.js`, `useNow.js`
- `src/components/admin/AdminLayout.jsx`, `BookingInfo.jsx`, `StationDrawer.jsx`, `StationNode.jsx`
- `src/components/booking/StationPicker.jsx`, `BookingSummary.jsx`, `BookingCard.jsx`
- `src/pages/BookingPage.jsx`, `DashboardPage.jsx`, `MyBookingsPage.jsx`, `HomePage.jsx`
- `src/pages/admin/AdminBookingPage.jsx`, `AdminFloorPage.jsx`, `AdminOverviewPage.jsx`, `AdminUpcomingPage.jsx`
- `src/styles/admin.css` (management patterns using existing tokens)

Existing uncommitted Phase 3A.1 files/design changes were preserved as the implementation baseline.
AuthProvider, default inventory IDs, menu data, authentication keys, and dependencies were preserved.

## Verification

- `npm.cmd test`: 59 passing tests, including all 24 original tests unchanged.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.
- Tests cover station add/duplicate/edit/archive/restore, maintenance and zone protections,
  pricing, owner preservation, food snapshots, cancellation/rescheduling, actual starts/ends,
  early completion, overtime conflicts, extensions/closing, fixture rejection, inactive states,
  malformed storage, read-only initialization, safe migration, failed writes, lock serialization,
  native-event selection, stale forms, and paid-amount preservation.
- Headless Edge verified all requested workflows through actual UI forms: add station, floor and
  customer visibility, maintenance/restoration, customer food booking, protected maintenance
  resolution, walk-in with food, reserved-before-start, start/occupied, extend, end, preserved
  timestamps, reschedule/cancel, customer history, archive/restore, zone/station edits, and activity.
- A real second browser tab observed maintenance updates through native storage events. A stale
  open station form correctly refused saving after a second-tab edit.
- Responsive checks passed at 390, 768, and 1440 pixels for stations, bookings, floor, and forms.
- Existing customer food regressions passed: popup, increment/decrement/remove/zero boundary,
  Escape/back/cancel/draft preservation, skipping, totals, confirmation, history, and persistence.
- No application runtime or console errors remained in the successful browser runs.

Reproduce the Phase 3B browser smoke test with the Vite server running on 127.0.0.1:5173:

```text
npm.cmd run dev -- --host 127.0.0.1
node scripts/verify-phase3b.mjs
```

The dependency-free smoke script uses installed Edge by default (Windows path) or BROWSER_PATH.
It launches an isolated temporary browser profile and a test-only advancing 2030 clock so session
controls are testable regardless of the real hour. It never uses the customer's normal browser
profile or changes the application's actual clock behavior.

## Limitations and Phase 3C

All authorization, storage, clocks, and conflict checks are frontend demonstrations. Web Locks
coordinate cooperating tabs on one origin; the fallback is not cross-tab atomic. There is no
server authority, real multi-user protection, cross-device synchronization, or tamper-proof log.
Browser storage remains finite; quota errors fail without discarding the prior state. Legacy-key
writes from an older running application version are not merged after the new repository exists.
The sample floor can use an automatic grid fallback; it is not a drag-and-drop editor. Session
scheduling/extension uses hourly boundaries and existing demo hours, with no automatic refund or
prorating for early completion. Menu CRUD, fulfillment, payment balances/refunds, notifications,
customer analytics, and further settings remain deferred to Phase 3C.
