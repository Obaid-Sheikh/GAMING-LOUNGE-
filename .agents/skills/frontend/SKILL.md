---
name: frontend
description: Use when creating or modifying React Vite components, pages, Tailwind CSS layouts, responsive interfaces, accessibility, and UI loading or error states.
---

# Frontend Engineering

## Scope
Build maintainable customer and admin interfaces for the Gaming Lounge. Follow `AGENTS.md` and existing design conventions. Read only task-relevant code and documentation; consult `docs/BRD.md` for affected requirements and `docs/architecture.md` for relevant interfaces. Never scan the whole repository by default.

## Workflow
1. Identify the requested screen, user journey, and acceptance criteria; ask only about blocking ambiguity.
2. Inspect the smallest relevant component, style, route, and type files. Reuse existing patterns.
3. State a short plan before changes that span multiple components.
4. Implement a focused change; avoid unrelated refactors or new dependencies without approval.
5. Run available lint, typecheck, build, and relevant tests; report what ran and what could not run.

## React and styling conventions
- Prefer small function components and descriptive names; extract shared components only when reuse or complexity justifies it.
- Use semantic HTML, stable keys, and explicit props; avoid unnecessary effects, duplicated state, and direct DOM manipulation.
- Follow the project's JavaScript or TypeScript choice; do not migrate languages without permission.
- Use Tailwind utilities and existing design tokens; do not introduce arbitrary colors or a new design system.
- Mobile-first layouts, keyboard access, visible focus, accessible labels, adequate contrast, and reduced-motion support where relevant.
- Include meaningful empty, loading, error, disabled, and success states for asynchronous UI.
- Use placeholder/demo data only when clearly marked; never pretend demo bookings are live.
- Keep booking availability and price authoritative on the server; frontend checks are for UX only.

## Completion checklist
- Responsive at narrow and wide viewports; no overflow.
- Keyboard and screen-reader basics checked.
- Loading/error/empty states handled where applicable.
- No unrelated files changed; no secrets or sensitive data exposed.
- Summarize changed files and verification results.
