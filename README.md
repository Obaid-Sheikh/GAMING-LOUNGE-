# Gaming Lounge

A planned web platform for browsing gaming zones, discovering available games, checking time slots, and booking gaming sessions. It also includes a planned staff/admin workspace for managing lounge operations.

> **Project status:** Planning / foundation. Features and endpoints described below are planned, not claims of existing implementation.

## Planned experience
- Browse PlayStation, Xbox, PC, and group entertainment zones.
- See available games, amenities, resource details, and capacity.
- View time-slot availability and book sessions.
- Receive updated availability when bookings or schedules change.
- Admin/staff tools for managing resources, games, schedules, and bookings.

## Proposed technology
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router.
- **Backend:** Node.js, TypeScript, Express.
- **Database:** PostgreSQL.
- **Data fetching:** TanStack Query.
- **Real-time:** SSE initially, subject to requirements.
- **Tests:** Vitest, React Testing Library, API integration tests, Playwright.

These choices are proposed in [`docs/architecture.md`](docs/architecture.md); final versions and providers are not yet fixed.

## Repository layout
```text
gaming-lounge/
├── AGENTS.md                  # Repo-wide instructions for coding agents
├── README.md                  # This file
├── docs/
│   ├── BRD.md                 # Business requirements (add existing BRD)
│   └── architecture.md        # Proposed technical architecture
├── .agents/
│   └── skills/
│       ├── frontend/SKILL.md  # To be created and verified for chosen agent
│       └── booking/SKILL.md   # To be created and verified for chosen agent
├── src/                       # Vite frontend source
├── public/                    # Vite static assets
└── tests/                     # Tests, added as features are built
```

The backend may be added later under `server/` or moved into a workspace/monorepo after confirming deployment needs. The example structure is a target, not a statement that every file already exists.

## Local development
If starting from scratch, create a Vite React + TypeScript app and then add these documents to its root. If you already have a Vite project, **do not overwrite** `package.json`, `vite.config.*`, `index.html`, or `src/` when copying these files.

```bash
npm install
npm run dev
```

Run those commands from the directory containing `package.json`. Additional scripts (`test`, `lint`, `typecheck`) should only be used after they are configured; check `package.json` for actual commands. Backend/database setup instructions will be added when those components exist.

## Documentation and AI agent workflow
- [`AGENTS.md`](AGENTS.md): concise repository-wide agent rules, including minimal-context reading and verification.
- [`docs/BRD.md`](docs/BRD.md): business goals, scope, and requirements. Copy the approved BRD here.
- [`docs/architecture.md`](docs/architecture.md): proposed components, data model, booking safety, and open decisions.
- `.agents/skills/`: optional reusable workflows; verify discovery conventions for each coding tool before relying on automatic activation.

When assigning tasks, specify the goal, affected area, relevant document section, constraints, and acceptance criteria. Prefer one primary coding agent and small, reviewable changes. Never paste secrets into prompts or commit them to the repository.

## Suggested first milestone
Build a responsive, static catalog of gaming zones and supported games using reusable components and sample data. Review it before introducing backend APIs, authentication, or booking transactions.

## Production readiness checklist
Before launch: enforce server-side authorization and booking conflict protection, validate inputs, configure secure secrets, add automated tests, implement backups, monitoring, deployment checks, and test cancellation/concurrency edge cases.

## License
Not yet selected.
