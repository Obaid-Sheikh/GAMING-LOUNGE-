---
name: backend
description: Use when implementing or modifying server APIs, request validation, authentication, authorization, database access, or backend error handling for the Gaming Lounge.
---

# Backend Engineering

## Scope
Implement secure APIs and business logic. Consult only affected API routes, service modules, schema/migrations, and relevant sections of `docs/architecture.md` and `docs/BRD.md`. Do not assume an Express server, ORM, or auth provider already exists; inspect first.

## Workflow
1. Confirm contract: method, path, inputs, outputs, permissions, and failure modes.
2. Identify current backend stack and relevant schema; propose major architecture/dependency changes before implementation.
3. Add server-side validation and authorization at every protected operation.
4. Separate transport handlers, business rules, and persistence where practical.
5. Add tests for success, invalid input, forbidden access, and conflict/failure cases.
6. Run relevant checks and summarize migrations, environment changes, and API behavior.

## Rules
- Never trust client-provided price, user role, booking status, or availability.
- Authenticate identities and authorize resource-level actions; deny by default.
- Validate and normalize request bodies, params, and query values with bounded lengths and types.
- Use parameterized queries or safe ORM APIs; avoid SQL string concatenation.
- Do not expose stack traces, tokens, secrets, or private customer data in responses/logs.
- Use consistent error codes and HTTP statuses; distinguish validation (400/422), unauthorized (401), forbidden (403), missing (404), conflict (409), and server failure (500) as appropriate.
- Store secrets only in server-side environment/configuration; never in Vite `VITE_` variables.
- Use migrations for schema changes and document rollback/compatibility concerns.
- Apply pagination/rate limits where needed and keep timestamps timezone-safe (UTC storage, explicit display zone).
- Critical state transitions and inventory reservations must be atomic and idempotent where appropriate.

## Completion checklist
API contract documented, authorization tested, failures handled, no secrets leaked, migration/test commands reported.
