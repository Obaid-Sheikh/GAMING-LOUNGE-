# Phase 3C - Food, orders, mock payments, and reporting

## Delivered features and routes

The Phase 3A.1 design, existing authentication, Phase 3B services, and CSS Grid floor
are retained. No dependencies, backend services, or payment provider were added.

- `/admin/food`: shared menu search, category/state filters, add/edit descriptions,
  INR prices, stock availability, archive and restore. Menu IDs remain permanent.
- `/admin/orders`: booking-generated orders, item snapshots, delivery station,
  customer display name, timestamps, search/status filters, confirmed fulfillment
  transitions, history, and cancelled-booking resolution alerts.
- `/admin/payments`: mock transaction ledger, method/status/IST-date filters,
  booking balances, partial/multiple receipts and explicit refunds, two-step review,
  actor identity and notes. This page never collects or returns actual money.
- `/admin/analytics`: Today, last 7/30 inclusive calendar days, or custom IST dates;
  booking counts/value, collected receipts/refunds, outstanding amounts, current
  zone occupancy, actual session utilization, station frequency and popular food.
  Charts use React/CSS/native progress elements; booking CSV export needs no package.
- `/admin/customers`: directory derived only from saved reservations, account IDs,
  separate walk-in identities, booking histories, counts and payment summaries.
- `/admin/settings`: lounge display name, contact details and policy display text.
  Operational rules are explicitly read-only and use existing booking constants.
- `/admin`: shared food/order alerts, unpaid/partial bookings, outstanding balances,
  today's collected receipts/refunds, recent transactions and analytics navigation.
- Existing booking details and floor drawers show the same order and payment data.
  Hover/focus station previews use ledger-derived payment and order status.

Games Catalog remains an upcoming section; it is outside this phase's requested scope.

## Files created

- `src/lib/commerceSchema.js`: menu/settings defaults, migration, schema validation,
  order generation, transitions, rounding and payment-balance selector.
- `src/lib/commerceManagement.js`: menu, order, ledger and settings operations under
  the existing admin authorization, revision and transaction boundary.
- `src/lib/commerceSelectors.js`: reporting periods, operational commerce summary,
  analytics, customer directory and spreadsheet-safe CSV serialization.
- `src/lib/commerce.test.mjs`: commerce/migration/accounting regression tests.
- `src/components/admin/CommerceControls.jsx`: confirmation, payment review form,
  order controls and transaction list using the existing native modal dialog.
- `src/components/admin/CommerceSummary.jsx`: overview cash desk and order alerts.
- `src/pages/admin/AdminFoodPage.jsx`, `AdminOrdersPage.jsx`, `AdminPaymentsPage.jsx`,
  `AdminAnalyticsPage.jsx`, `AdminCustomersPage.jsx`, `AdminSettingsPage.jsx`.
- `scripts/verify-phase3c.mjs`: dependency-free headless Edge browser workflow.
- `docs/phase3c.md`.

## Existing files modified

- `src/lib/mockRepository.js`: version 1/2 read validation, in-memory migration,
  atomic booking/order reconciliation and version-2 writes; same key and Web Lock.
- `src/lib/adminManagement.js`: commerce dispatch and shared menu walk-in validation.
- `src/lib/bookingRules.js`, `bookingStore.js`: menu lookup and final reviewed-price
  validation for newly saved customer/walk-in reservations. Existing pure snapshot
  helpers still derive trusted prices from catalog entries, preserving their API.
- `src/lib/adminSelectors.js`: optional shared commerce input derives payment/order
  preview states and excludes fixtures from saved-ledger food/revenue totals.
- `src/hooks/useLoungeData.js`: extended snapshot/error fallback; unchanged events.
- `src/components/booking/FoodModal.jsx`: shared menu, stock restrictions and explicit
  refresh/review for stale prices or unavailable selections; existing draft behavior.
- `src/pages/BookingPage.jsx`: shared display-policy/contact text in booking review.
- `src/components/admin/AdminLayout.jsx`, `BookingInfo.jsx`: shared context, configured
  lounge name, booking ledger/order sections and mock payment controls.
- `src/pages/admin/AdminOverviewPage.jsx`: saved-ledger KPIs and commerce summary.
- `src/App.jsx`, `src/data/adminLayout.js`: new protected admin routes/navigation.
- `src/styles/admin.css`: focused responsive management/chart/status styling.

## Repository versioning and compatibility

The key remains `gaming-lounge:repository:v1`; its suffix is the established storage
namespace. The envelope's explicit `schemaVersion` is now **2**:

```text
schemaVersion: 2
revision
inventory: existing zones, stations and maintenance, unchanged IDs
bookings: existing normalized reservation snapshots and histories
activity: existing admin log plus new commerce actions
menu: id, name, description, category, price, available, archived
orders: id, bookingId, items, total, status, createdAt, legacy, unverified, history
transactions: id, bookingId, amount, method, type, status, at, adminId,
              reference, note, optional legacy/dateEstimated
settings: displayName, contact, cancellationPolicy
```

On a version-1 read, existing inventory, bookings, payment metadata, add-on snapshots,
and activity are preserved. Static food defaults seed only the newly introduced menu.
Saved version-2 menus are never reseeded. With no repository, the previous booking-key
migration remains supported; that old key is not overwritten. Reads perform no writes.

The first successful mutation validates and persists the entire version-2 envelope in
one write. Failed validation/quota writes leave the exact previous envelope unchanged.
Malformed/unsupported data fails closed rather than silently resetting. Version downgrade
mutations are rejected. The existing shared Web Lock, revision checks, same-window
`demo-lounge-changed` event and native cross-tab storage events remain in use. Browsers
without Web Locks retain the existing single-tab fallback limitation.

Older running Phase 3B tabs cannot understand version 2 and must reload the updated app.
Legacy-key writes are not merged once an authoritative repository exists. This is local
same-browser consistency, not cross-device or production multi-user synchronization.

## Menu and booking snapshots

Menu IDs are unique including archived items. Validate category, nonempty name, description
length, finite nonnegative two-decimal INR price and boolean availability/archive state.
New customer and walk-in saves check the current menu inside the locked transaction.
Unavailable/archived items fail; changed names/prices require reopening the picker and
reviewing the current selection. Quantity remains bounded to 1-99 per stored add-on.

Editing menu names/prices never edits booked item names, unit prices or reservation totals.
The modal exposes explicit refresh to remove unavailable items/reprice a stale draft.
Skip, quantity controls, removal, Back, Cancel, Escape and focus restoration are retained.

## Food order lifecycle and cancellation policy

Each saved booking with add-ons has exactly one deterministic `order-<bookingId>` record.
Its items are snapshots identical to the booking's food items; total is their subtotal.
Order creation and booking persistence are atomic. The order adds **no additional charge**.
Recurring fixtures remain read-only and never create persisted food orders or transactions.

Transitions:

```text
placed -> preparing -> ready -> delivered
placed / preparing / ready -> cancelled
```

Delivered and cancelled are terminal. Every transition records from/to, UTC time and admin.
Legacy pending/preparing/fulfilled/cancelled map to placed/preparing/delivered/cancelled.
Unknown legacy fulfillment starts as `placed` with a prominent `unverified` migration flag;
this is a review queue, not an assertion that food was previously prepared or delivered.
An explicit first admin transition acknowledges that review and clears the flag.

Cancelling a reservation retains its food order, charges, receipts and history. An
undelivered order on a cancelled booking is flagged in Orders, overview and booking details;
its only permitted next action is explicit order cancellation. Already delivered orders
remain historical deliveries. Neither cancellation action issues a refund. Any agreed
mock refund is a separate confirmed ledger operation.

## Mock payment accounting

Transactions are append-only through the UI: cash, UPI, card or other; payment/refund;
successful/pending/failed. All have a unique ID, booking reference, positive two-decimal
amount, actor, timestamp and bounded optional reference/note. No payment credentials are
requested. Pending/failed transactions are informational attempts and are not receipts;
there is no later status-edit feature, so a subsequent success is a distinct record.

```text
successful payments = sum(successful payment transactions)
successful refunds = sum(successful refund transactions)
net collected = successful payments - successful refunds
outstanding = booking total - successful payments + successful refunds
```

Payments cannot exceed current outstanding or be added to cancelled bookings. Refunds
cannot exceed current net collected, including when recording a pending/failed refund
attempt. Validation rechecks the latest ledger under the shared transaction lock.
Extending a paid booking keeps its original ledger and food snapshots; the increased
booking amount becomes additional outstanding. Rescheduling may reduce a total below
net collected: a negative balance is displayed as credit due, not an automatic refund.
Cancelled balances remain inspectable but are excluded from active outstanding KPIs.

Only explicit legacy `paymentStatus: paid` imports a successful receipt, once, with stable
`legacy-payment-<bookingId>` ID. Use saved `paidAmount`, or the original booking total when
missing. Zero amounts create no receipt. Preserve all original metadata. A finite paidAt
supplies the receipt date; otherwise createdAt is an **estimated** placeholder, clearly
flagged and excluded from dated revenue while included in booking balances. Unknown,
failed, pending or refunded metadata cannot prove an original receipt and therefore
creates no transaction. Legacy refunded records need manual reconciliation if receipt
history is required. No receipt/refund is inferred from booking status or cancellation.

Derived payment state is independent of booking and order status: unknown, unpaid,
partial, paid or refunded. Legacy metadata is compatibility data, not a second ledger.

## Analytics rules

- All calendar periods use Asia/Kolkata, midnight inclusive to next midnight exclusive.
  Last 7/30 days includes today. Custom ranges are ordered and bounded to 367 days.
- Booking counts use scheduled start dates, include separate cancelled/walk-in counts;
  booked value excludes cancelled reservations and includes food once.
- Collected/refund/net metrics use successful transaction timestamps, exclude estimated
  legacy dates and future transactions. Recurring simulated fixtures are excluded.
- Outstanding is the current positive balance of non-cancelled bookings scheduled in
  the selected period; cancelled/negative credit balances remain visible in the ledger.
- Food order value and popularity use non-cancelled orders by creation date, including
  pending fulfillment. It is ordered value, not payment revenue or delivered-only sales.
- Station booking frequency includes archived stations' history, excluding cancellations.
- Current occupancy uses explicitly manually started saved sessions divided by currently
  operational, non-archived stations in each zone. It is a live snapshot independent
  of date filtering; it excludes fixtures and inferred legacy physical sessions.
- Utilization uses recorded actual session intervals clipped to elapsed reporting time
  and 10:00-22:00 IST operating hours, divided by those elapsed hours for each current
  non-archived station. Scheduled reservations alone never invent usage. Historical
  downtime/station creation history is not reconstructed; no trend data is fabricated.
- Empty charts report insufficient data. Charts have readable numeric text. CSV exports
  booked values with explicit INR headers and escapes quotes/formula-leading cells.

Customer grouping uses saved userId for authenticated bookings. Walk-ins use individual
booking IDs, preventing accidental merging by name. Optional contact information remains
in admin booking details only, not public components, station previews or directory rows.

## Settings boundaries

Display name updates admin branding; contact and cancellation-policy text appear in
customer booking review. Policy is display-only and does not alter eligibility or issue
refunds. Duration choices, horizon, operating hours and timezone are displayed from the
same existing constants used by booking validation. Editing operational rules is deferred
to avoid silently invalidating existing reservations.

## Verification

- `npm.cmd test`: **91 passed**, including all 59 original tests unchanged.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.
- Tests cover menu CRUD/states/validation, current-price checks, historical snapshots,
  order generation/transitions/cancellation, partial/multiple/pending/failed payments,
  overpayment/refund limits, extension balances, legacy payment migration, reporting
  boundaries and totals, actual utilization, archived history, empty data, customer
  identities, settings validation, malformed storage, schema downgrade, failed atomic
  writes, cross-tab event selection and concurrent payment revalidation under Web Locks.
- Headless Edge exercised Phase 3C through UI forms: new menu item, customer selection,
  admin repricing with old snapshot preservation, out-of-stock restriction, restoring
  availability, food booking/order creation, preparing/ready/delivered transitions,
  partial/full payments, extension balance, explicit refund, analytics and floor drawer.
- A second real tab observed an updated menu price through a native storage event.
- Repeated settings saves and shared branding/contact display were verified. Food
  quantity decrease/zero bound/removal/back/skip and gaming-only total were checked.
- Overview and all new pages plus floor checked at 390, 768 and 1440 pixels with no
  horizontal page overflow; menu dialog Escape and focus restoration checked at each.
- Existing `scripts/verify-phase3b.mjs` passed: customer flow, food walk-in, session
  start/end/extension/history, maintenance, archive/restore, reschedule/cancel, customer
  ownership/contact privacy, stale edits, native cross-tab updates and responsive views.
- Desktop and mobile order screenshots were visually inspected.
- No application runtime or console errors remained in the successful runs.

Reproduce browser verification with installed Edge, or set BROWSER_PATH:

```text
npm.cmd run dev -- --host 127.0.0.1
node scripts/verify-phase3c.mjs
node scripts/verify-phase3b.mjs
```

Scripts use isolated temporary browser profiles and a test-only advancing 2030 clock;
they do not access the user's normal browser storage or change the actual application clock.

## Remaining limitations

Frontend-only role checks, browser clocks/storage and local Web Locks are demonstration
mechanisms. No real authorization, payments, refunds, accounting/tax integration, backend,
database or cross-device synchronization exists. Storage is finite and not tamper-proof.
Legacy records with unknown payment dates/receipts or fulfillment require human review.
No stock-quantity tracking, kitchen hardware, food-only extra orders, full account CRUD,
operational-rule editing, advanced accounting or Games Catalog management is included.
No automatic commit or push was performed for Phase 3C.
