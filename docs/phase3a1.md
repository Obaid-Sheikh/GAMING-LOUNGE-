# Phase 3A.1 - Admin UI refinement

This phase changes presentation only. Authentication, routes, operational selectors,
reservation fixtures, station coordinates, customer components, and persistence behavior
remain in place. No dependencies or management features were added.

## Design changes

- Scoped navy/charcoal surfaces, restrained teal accents, consistent card radii,
  readable type, and clearer foreground/border contrast.
- Sidebar groups separate the working operations screens from upcoming management
  sections, with distinct icons and a stronger active navigation state.
- Header, snapshot control, and page hierarchy adapt without shrinking controls to fit.
  Supporting demo details are available through a native disclosure.
- Eight metric cards retain their existing values and order, with larger numbers,
  readable labels, and meaningful equipment/payment icons instead of numerical indices.
- The floor shortcut includes a compact station-status strip for each existing zone.
  Counts and segments use the same snapshot; no utilization trends or totals are invented.
- Recent reservations sit beside a stack of upcoming sessions, food orders, and
  attention items. Busy desktop side feeds scroll within a bounded area instead of
  generating a long empty adjacent column. Focusable list regions preserve keyboard access.
- Empty states have concise guidance, relevant icons, and consistent spacing.
- Floor controls, equipment icons, station IDs, statuses, session captions, and zone
  headers are easier to scan. The native detail drawer has a sticky close header,
  equipment summary, readable detail rows, and stronger session/total hierarchy.

## Overflow and responsive behavior

All flexible grid columns use minmax(0, 1fr); panels and text containers can shrink and
wrap. Header metadata yields before essential navigation. The sidebar collapses at
1050px; the spatial map becomes a station grid at 1200px. The overview activity grid
stacks at 850px. Touch controls retain practical heights. Long names/references wrap.
No global overflow-x clipping is used to conceal layout errors.

An actual tooltip bug was found at 320px: a PlayStation desktop selector overrode compact
left/right alignment. Compact floor rules now anchor previews according to the displayed
columns, including odd and even stations. Preview controls keep their existing focus,
hover, Escape, and modal behavior. Reduced-motion styling is retained.

## Files changed

- src/components/admin/AdminLayout.jsx
- src/components/admin/AdminIcon.jsx
- src/components/admin/DashboardPanel.jsx
- src/components/admin/StationNode.jsx
- src/components/admin/StationDrawer.jsx
- src/components/admin/EmptyState.jsx (new)
- src/pages/admin/AdminOverviewPage.jsx
- src/pages/admin/AdminFloorPage.jsx
- src/data/adminLayout.js (navigation icons only)
- src/styles/admin.css
- docs/phase3a1.md (new)

## Verification

- Existing 24 Node tests passed.
- ESLint and Vite production build passed.
- Headless Edge checked overview, floor, and upcoming-settings layouts at 320, 390,
  560, 768, 850, 1024, 1050, 1051, 1200, 1250, 1440, and 1920 pixels with no horizontal
  page/content overflow. Six station tooltip positions were checked at each width.
- Desktop, tablet, mobile, and drawer screenshots were visually inspected.
- Busy attention feeds scrolled by keyboard without dropping any records; reduced-motion
  preferences disabled station transitions.
- Existing admin browser checks passed: role protection, login/logout, shared statistics,
  hover/focus previews, Escape dismissal, drawer focus containment/restoration, zone
  filtering, station-grid view, mobile navigation, and readonly booking details.
- Customer booking with food add-ons still confirmed and appeared in admin after a role
  switch, preserving the exact localStorage JSON when viewed. No application runtime
  or console errors were detected in these checks.

The layout remains an illustrative demo. This task does not implement Phase 3B actions.
