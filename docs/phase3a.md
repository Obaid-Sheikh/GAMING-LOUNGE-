# Phase 3A implementation

## Access and routes

Use `/login` and choose **Continue as demo administrator** (admin@example.test).
Both roles share AuthProvider, the existing session storage key, and logout behavior.
Older `{ id: 'demo-customer' }` sessions continue to resolve to the customer profile.
The identity determines the mock role; a supplied role field does not promote a customer.
Unauthenticated admin requests resume through login. A customer receives an access-denied
screen with a dashboard link and an explicit logout option for switching demo roles.
Admin users also receive an access-denied screen on customer-only booking routes.
These client-side checks are demonstration behavior, not production authorization.

Implemented routes:

- `/admin`: operational overview.
- `/admin/floor`: interactive lounge map and station grid.
- `/admin/bookings/:id`: read-only booking details for a shared reservation.

Upcoming placeholders: `/admin/stations`, `/admin/bookings`, `/admin/games`,
`/admin/food`, `/admin/orders`, `/admin/payments`, `/admin/customers`, `/admin/settings`.
Unknown admin paths have an admin page-not-found state.

## Shared data and state

`operationalSnapshot` reads the existing useBookings snapshot plus the recurring fixtures
expanded by `demoReservationsForDate`. Customer availability uses that same fixture helper.
Fixture IDs include the local date and fixture index. Fixtures are read-only and never
seeded over localStorage reservations. Existing station/zone IDs, menu prices, booking
price snapshots, and normalization are reused.

The existing catalog fixtures now include explicitly simulated payment and food-order
metadata. The PS-01 lunch fixture contains fries and cold coffee from the shared menu.
Fixtures have an unassigned demo identity; no real customer is invented for these rows.
Older customer bookings with missing metadata display unknown payment/fulfillment status.
Missing add-ons normalize to an empty list. Reading the admin UI does not write bookings.

States remain separate:

| Concern | Source and interpretation |
| --- | --- |
| Station | Maintenance takes precedence; Occupied requires a confirmed interval containing the snapshot time; Reserved means a pending hold at that time or an upcoming reservation today; otherwise Available. |
| Booking | Existing confirmed, pending, cancelled reservation status. |
| Payment | Explicit paid, pending, refunded, failed metadata; absent/unrecognized values are unknown. |
| Food order | Explicit pending, preparing, fulfilled, cancelled metadata; absent/unrecognized values are unknown. |

Intervals remain half-open. A pending reservation never invents an active session.
A station may be Available now while having a later reservation on another date; the drawer
still shows that future reservation. Cancelled records do not occupy a station.
Today's bookings counts reservations by session date, including the labeled recurring fixtures.
Pending payments counts non-cancelled records with explicit pending payment metadata.
Revenue sums booking totals only for explicit paid records whose paidAt timestamp falls on
the snapshot's IST calendar day and is no later than the snapshot time. Unknown payment
metadata never becomes revenue. Refund accounting is deferred.

The admin layout owns a common snapshot selector: current time (refreshed every 30 seconds),
today at 12:30, or today at 14:30. Preview modes are clearly labeled and never change records.
Overview and floor retain that shared selection while navigating. Existing browser storage
events and booking-change events provide same-browser consistency; no cross-device realtime
service is claimed.

## Floor plan

`src/data/adminLayout.js` contains zone grid areas, station row/column coordinates, and
sidebar configuration. Inventory is always mapped from the existing station catalog.
CSS Grid renders four zone boundaries, central walkways, reception, and entrance.
No maps API, canvas package, or drag-and-drop library is used. Compact layouts automatically
show a station grid; admins can also select a grid view or filter by zone.

Station buttons expose status text, equipment icons, stable IDs, and visible focus.
Hover and focus display a compact preview without customer identity; Escape dismisses it.
Click/tap opens a native modal drawer with focus containment, close control, Escape support,
and focus restoration. The drawer includes catalog details, actual matching reservation
metadata, food snapshots, payment/fulfillment states, remaining time, and a read-only
booking link. Missing sessions have an explicit empty state.

## Files

Created:

- `src/components/admin/AdminLayout.jsx`, `AdminIcon.jsx`, `StatusBadge.jsx`
- `src/components/admin/DashboardPanel.jsx`, `StationNode.jsx`, `StationDrawer.jsx`, `BookingInfo.jsx`
- `src/pages/admin/AdminOverviewPage.jsx`, `AdminFloorPage.jsx`, `AdminBookingPage.jsx`, `AdminUpcomingPage.jsx`
- `src/data/adminLayout.js`
- `src/lib/adminSelectors.js`, `adminSelectors.test.mjs`, `demoAuth.js`, `demoAuth.test.mjs`
- `src/styles/admin.css`
- `docs/phase3a.md`

Modified:

- `src/App.jsx`, `src/components/Navbar.jsx`, `src/components/RouteEffects.jsx`
- `src/components/auth/ProtectedRoute.jsx`, `src/context/AuthProvider.jsx`, `src/pages/LoginPage.jsx`
- `src/data/bookingCatalog.js`, `src/lib/bookingRules.js`

## Verification

- Node test suite: 24 tests passed, including operational selectors, role resolution,
  shared fixtures, time boundaries, legacy persistence, conflicts, and food totals.
- ESLint and Vite production build passed.
- Headless Edge checks: login/logout, customer denial, admin/customer route isolation,
  all configured stations, occupied/reserved/maintenance/available states, shared overview
  totals, hover/focus previews, tooltip Escape, modal focus containment and restoration,
  readonly booking navigation, zone filtering, grid mode, mobile navigation, and overflow.
- Customer regression browser checks: session selection, conflicts, food popup,
  quantity increase/decrease/removal, zero bound, Escape/back/cancel, preserved draft,
  skipping food, combined totals, confirmation, history, and localStorage snapshots.
- A browser-created customer reservation remained visible with matching food snapshots
  after switching to admin; admin reads preserved the exact stored JSON.
- Responsive browser checks included 320, 390, 768, 1024, and 1440 pixel widths.
- No application runtime or console errors were detected during these flows.

## Limitations and Phase 3B

The layout is illustrative; coordinates need the actual lounge plan later. Fixtures recur
daily and may show no occupied sessions outside fixture hours. Optional unknown payment/order
metadata remains unknown. Real authentication, authoritative conflict prevention, device
synchronization, and transactional payment/order accounting require future backend work.
Station editing, maintenance mutations, extensions, ending sessions, walk-ins, complete booking
management, menu/catalog CRUD, order fulfillment, payments, analytics, customers, settings,
notifications, and a floor-plan editor are not implemented. Deferred actions are labeled text,
not controls that pretend to save changes. No new dependencies, commits, or pushes were made.
