# Gaming Lounge — Agent Instructions

## Purpose
This file defines repository-wide engineering rules for AI coding agents. Keep it short. Task-specific details belong in the relevant documentation, skill, or source file.

## Context budget and file-reading policy
1. Start with the user's current task and the files explicitly referenced in the prompt.
2. Read only the smallest relevant set of files needed to understand dependencies and implement safely. Do **not** automatically read the full BRD, all documentation, all skills, or the entire source tree.
3. Inspect related imports, types, tests, API contracts, or configuration only when necessary. Expand context incrementally; briefly explain unexpected broad exploration.
4. Read `docs/BRD.md` only for relevant business requirements; read `docs/architecture.md` for architectural decisions or cross-layer changes. Read `README.md` for setup commands or onboarding.
5. Load a skill only when it is relevant and supported by the current agent. For frontend UI work, consider `.agents/skills/frontend/SKILL.md`; for reservations, availability, and concurrency, consider `.agents/skills/booking/SKILL.md`. These paths are planned; do not assume files exist until created.
6. Avoid repeatedly rereading unchanged documents within the same task. Use concise summaries in handoffs, but verify critical details against source when necessary.
7. The context policy is a preference, not a prohibition on reading files required for correctness, security, tests, or debugging. Never conceal skipped verification.

## Engineering workflow
1. **Understand:** restate the requested behavior and acceptance criteria. Identify ambiguities that block safe implementation.
2. **Plan:** propose a short plan for nontrivial changes; identify affected files and risks. Obtain approval before major architecture or dependency changes.
3. **Implement:** make focused, minimal changes. Follow existing conventions; do not rewrite unrelated code.
4. **Verify:** run relevant checks and tests, inspect failures, and report what passed, failed, or could not run.
5. **Handoff:** summarize files changed, behavior, verification, and remaining risks. Do not claim completion without evidence.

## Non-negotiable safety and quality rules
- Never commit credentials, API keys, private tokens, or `.env` files. Use `.env.example` for placeholders.
- Do not expose privileged database credentials or server-only secrets through Vite `VITE_` environment variables.
- Enforce authentication and authorization on the server; frontend checks are not security boundaries.
- Treat client input as untrusted. Validate on the server.
- Booking availability must be authoritative on the backend and protected by transactional database constraints or equivalent concurrency controls. A real-time UI alone is insufficient.
- Never invent API endpoints, database tables, package scripts, or features; inspect the repository first.
- Avoid destructive commands, schema resets, and production deployments without explicit approval.
- Prefer small, reviewable changes and dedicated branches for substantial work. Avoid concurrent edits to the same files by multiple agents.
- Add or update tests for important behavior and regressions, especially booking conflicts, cancellations, and authorization.

## Source of truth and conflict resolution
- The user's latest explicit request controls the current task, unless it would create an unsafe or contradictory implementation.
- `docs/BRD.md` describes business requirements; `docs/architecture.md` describes proposed technical design and decisions.
- Existing tested code and actual configuration describe current implementation, which may differ from plans. Surface discrepancies instead of silently choosing.
- Ask for clarification when a material business rule or architecture choice is undecided.

## Suggested task prompt
"Task: [specific outcome]. Scope: [files/features]. Read: [relevant docs]. Do not change: [boundaries]. Acceptance criteria: [observable behavior]. Verify: [tests/checks]. First inspect the minimum required context and propose a brief plan."
