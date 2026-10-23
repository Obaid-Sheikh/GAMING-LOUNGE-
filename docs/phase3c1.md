# Phase 3C.1 - Shared Gaming Lounge theme

## Scope and original differences

Presentation-only alignment with the original public site and customer dashboard.
The admin previously replaced the shared charcoal/olive background and lime accent
with navy surfaces, teal actions, blue-gray text, and blue occupied-station markers.
Hardcoded variations also appeared in navigation, forms, previews, and native dialogs.

Read AGENTS.md, BRD.md, architecture.md, phase3a1.md, phase3b.md, phase3c.md,
the repository frontend/testing-security skills, and the public/customer/admin styles
and relevant components before implementation.

## Theme architecture and changes

- Admin shell and native dialogs now inherit the existing `--bg`, `--surface`,
  `--accent`, and `--muted` variables: #10110F, #191B17, #C2F65A, and #A7ABA0.
- Promoted the existing #F2F3ED text and #D5FF83 public button-hover colors to
  shared `--color-lounge-text` and `--color-lounge-accent-hover` tokens. Their public
  rendered values remain the same.
- Local admin tokens derive borders, elevated/hover surfaces, and restrained accent
  tints from the shared colors using color-mix. No independent brand palette remains.
- Updated sidebar/header, brand mark, selected navigation, overview cards, headings,
  lists, search/filter inputs, forms, buttons, empty states, activity details, tags,
  management dialogs/backdrops, confirmation notes, chart accents, and commerce views.
- Floor uses charcoal grid/walkway surfaces, uniform zone boundaries, readable station
  IDs, lime interaction highlights, and matching previews and station drawer.
- Semantic exceptions remain green available/success, red occupied/failure,
  amber reserved/pending/partial, and purple maintenance. Status text and icons remain.

Only src/index.css and src/styles/admin.css change application presentation.
No React components, application logic, routing, auth, persistence, calculations,
station coordinates, dependencies, or existing tests/browser scripts were changed.
The additional scripts/verify-phase3c1.mjs provides repeatable browser theme checks.

## Browser and responsive verification

Used installed headless Edge with isolated temporary profiles and browser storage.
Inspected screenshots of the original home/customer dashboard and a side-by-side
1440px-per-frame comparison of the public home and admin overview. Also inspected
desktop/tablet/mobile overview, floor, station drawer, menu dialog, and populated
orders screenshots. The original typography and management layout are retained.
An additional temporary browser harness reused the Phase 3C workflow to capture
populated payment forms, transaction reviews, order confirmations, analytics, and the
payment ledger at all four widths. Page/dialog overflow and runtime-error checks
passed; mobile payment forms, desktop payment reviews, mobile order confirmations,
and desktop analytics screenshots were visually inspected.

The dedicated browser script passed all eleven requested routes, including a real
fixture booking detail URL, at **390, 768, 1280, and 1440px**:

- No horizontal page overflow; admin backgrounds resolve to #10110F at every width.
- Station, walk-in, and menu dialogs fit their viewports and use charcoal backgrounds.
- Escape closes dialogs and restores the launching button's focus.
- Keyboard station previews remain visible; the drawer fits and restores station focus.
- Mobile navigation opens and restores toggle focus on Escape.
- Reduced-motion mode removes station transitions.
- All four semantic status colors resolve distinctly; no application runtime errors.

Desktop sidebar, map positions, compact station grid, responsive cards/lists, native
modal focus behavior, and visible lime focus styling remain intact. Existing management
screens use cards and lists rather than an additional table component; their shared
record surfaces, borders, controls, and empty states receive the same theme.

## Regression results and reproduction

- `npm.cmd test`: **91 passed**, zero failures.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.
- `node scripts/verify-phase3b.mjs`: passed all existing workflows, cross-tab/stale-form
  checks, customer regressions, responsive checks, and runtime-error checks.
- `node scripts/verify-phase3c.mjs`: passed menu/order workflows, partial/full mock
  payments, explicit refund, analytics, settings, floor drawer, customer food behavior,
  cross-tab changes, responsive checks, and runtime-error checks.
- `node scripts/verify-phase3c1.mjs`: passed the additional four-width theme checks.

Start Vite with `npm.cmd run dev -- --host 127.0.0.1`, then run the browser scripts.
They use installed Edge or BROWSER_PATH. The new theme script uses debug port 9352
and saves `phase3c1-*.png` screenshots plus `phase3c1-verification.log` under the OS
temporary directory. The initial Phase 3C attempt raced a cold Vite load at login;
the unchanged script passed after the server warmed up.

## Remaining design differences

No navy/teal admin theme inconsistencies were found in the verified scope. Admin keeps
its existing dashboard card radii, denser type hierarchy, and functional semantic colors;
public marketing illustrations retain their existing zone artwork colors. Games Catalog
and notification placeholders remain unchanged. No theme library or switcher was added.
The payment summary's existing literal question-mark separators remain as pre-existing
copy; this task does not revise that text.
No commit/push or Phase 4 work was performed.
