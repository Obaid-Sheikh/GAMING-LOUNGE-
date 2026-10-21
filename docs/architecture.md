# Gaming Lounge — Technical Architecture

**Status:** Proposed design; validate against `BRD.md` before implementation.  
**Project:** Multi-zone gaming lounge discovery, reservations, and operations.  
**Approach:** Modular monolith, API-first, incremental delivery.

## 1. Goals and scope
Build a responsive customer-facing website and secure admin interface for gaming lounge operations. Customers can browse zones (PlayStation, Xbox, PC, and group entertainment/Netflix-style zone), view supported games and amenities, see availability, and reserve time slots. Staff can manage resources, availability, reservations, schedules, and games. Real-time updates should keep clients informed of changes.

Business details such as exact pricing, deposits, cancellation windows, session durations, opening hours, and group capacity must be confirmed from the BRD or product owner. Do not invent them.

## 2. Architecture decisions (proposed)
| Layer | Choice | Why |
| --- | --- | --- |
| Customer and admin UI | React + Vite + TypeScript + Tailwind CSS | Familiar ecosystem, reusable components, type safety |
| Routing | React Router | Customer and protected admin routes |
| Data fetching | TanStack Query + fetch/typed client | Caching, invalidation, loading/error handling |
| Backend | Node.js + TypeScript + Express | Explicit server-side business rules and REST API |
| Database | PostgreSQL | Transactions, constraints, relational booking model |
| ORM/migrations | Prisma or Drizzle (choose before implementation) | Typed access and repeatable migrations |
| Real-time transport | Server-Sent Events initially, or WebSockets if bidirectional requirements arise | Push availability updates without excessive polling |
| Auth | Secure server-managed sessions or a trusted auth provider (decision pending) | Server-enforced identity and roles |
| Hosting | Managed frontend, API, and PostgreSQL services (decision pending) | Separate deployable components |
| Testing | Vitest, React Testing Library, API integration tests, Playwright | Multi-layer verification |

A React + Vite frontend is not itself a secure booking backend. Keep privileged operations in the API. The backend and database are the authoritative source of availability.

## 3. High-level data flow
```text
Customer browser / Admin browser
          |
      React + Vite
          |
   HTTPS REST API  <------ server-sent availability events
          |
 Node/Express modular backend
  |       |         |
 Auth   Catalog   Booking / Pricing / Admin
                    |
               PostgreSQL
```

A booking mutation follows: authenticate/validate request -> verify operating rules and resource capacity -> begin transaction -> atomically prevent overlapping confirmed/held reservations -> commit -> publish availability event -> invalidate/refetch relevant client queries. A broadcast is never the authority for successful booking.

## 4. Domain model
- **Zone:** category such as PlayStation, Xbox, PC, or group entertainment.
- **Resource:** individually bookable console, PC station, room, or group area, with capacity and active status.
- **Game:** title with metadata and supported platforms; join table maps games to zones/resources as appropriate.
- **Schedule:** opening hours, exceptions, maintenance blocks, and resource-specific availability.
- **Booking:** customer, resource, start/end timestamps, status, price snapshot, timestamps, and audit metadata.
- **Customer/User:** identity and contact details, with privacy controls.
- **Role:** customer, staff, admin; permissions enforced server-side.
- **PricingRule:** zone/resource rates, time-based or group pricing as business rules require.
- **Payment:** optional future module; provider and checkout policy not yet selected.

Use UTC for persisted timestamps; present times in the lounge's configured local time zone. Define explicit rules for time rounding, buffers, overnight sessions, capacity, expiration of temporary holds, and maintenance conflicts before implementing booking.

## 5. Reservation integrity and concurrency
**Invariant:** For a resource with exclusive capacity, two active reservations cannot overlap. Define which statuses count as active (for example, confirmed and unexpired held). PostgreSQL range/exclusion constraints or transactional locking can enforce this; choose a concrete implementation and test concurrent requests. Group areas with capacity >1 need a separate capacity-safe algorithm.

Suggested lifecycle: `pending/held -> confirmed -> completed`, with `cancelled`, `expired`, and `no_show` branches as required. Status transitions must be validated on the server. Availability search is advisory; booking confirmation is authoritative. Make mutation retries idempotent using a request key where appropriate.

## 6. Proposed API boundaries
| Endpoint concept | Method | Notes |
| --- | --- | --- |
| `/api/zones` | GET | Zone types, facilities, images |
| `/api/resources` | GET | Filter by zone, capacity, status |
| `/api/games` | GET | Games and platform availability |
| `/api/availability` | GET | Time window, resource/zone filters; advisory result |
| `/api/bookings` | POST | Auth, validation, atomic conflict protection |
| `/api/bookings/:id` | GET | Owner or authorized staff only |
| `/api/bookings/:id/cancel` | POST | Apply cancellation policy and permissions |
| `/api/admin/*` | Various | Staff/admin-only management operations |
| `/api/events/availability` | GET | Auth-aware SSE stream if selected |

These are proposed contracts, **not implemented endpoints**. Finalize request/response schemas and error codes before frontend integration.

## 7. Frontend organization (proposed)
```text
src/
  app/           # providers, router, global setup
  components/    # reusable visual components
  features/
    catalog/     # zones, games, amenities
    availability/# calendars and time slots
    bookings/    # reservation workflow
    admin/       # operational dashboard
    auth/        # sign-in and account flows
  lib/           # API client, utilities
  styles/        # global styles
```

Keep business validation on the server. The UI should handle loading, empty, error, and stale-availability states. Admin route guards improve UX but never replace API authorization.

## 8. Security, reliability, and operations
- TLS/HTTPS; secure cookie settings if using sessions; CSRF protection where applicable.
- Input validation, authorization per resource, rate limits, login abuse protection, and safe error messages.
- Environment-specific secrets, least-privilege DB credentials, audited migrations, and tested backups/restores.
- Structured server logs with request IDs; error tracking and basic availability/booking metrics.
- CI checks: typecheck, lint, unit tests, integration tests, build, and migration checks.
- Accessible and responsive UI; reasonable performance budgets and image optimization.
- Privacy-aware retention and deletion rules for customer data.

## 9. Incremental delivery plan
1. **Foundation:** React/Vite setup, TypeScript, Tailwind, routing, shared UI, repo conventions.
2. **Catalog:** zones, supported games, resource descriptions, responsive discovery UI.
3. **Availability:** schedule model, backend availability query, customer slot selection.
4. **Booking MVP:** identity requirements, transactional reservation creation, conflict tests, cancellation.
5. **Admin:** resource/schedule/game management, booking operations, role permissions.
6. **Real-time:** publish availability changes, client invalidation/reconciliation, reconnect behavior.
7. **Production readiness:** E2E tests, observability, backups, security review, CI/CD, staged rollout.

Avoid implementing payments until business policy and provider selection are settled. Deploy a minimal vertical slice before building every screen.

## 10. Open decisions before implementation
- Exact BRD scope and MVP priorities; booking without account vs mandatory login.
- Number of physical stations/rooms and resource capacities.
- Pricing, taxes, discounts, deposits, refunds, and cancellation policies.
- Time-slot increments, operating hours, time zone, buffers, and maintenance blocks.
- Authentication provider/session design, email/SMS notifications, and payment provider.
- ORM choice, hosting, media storage, and real-time transport.
- Staff roles and audit/retention requirements.

Update this document with decisions as they are approved. Avoid adding speculative complexity before it is needed.
