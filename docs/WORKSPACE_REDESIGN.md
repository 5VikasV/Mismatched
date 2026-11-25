# Workspace redesign

Branch: `feat/workspace-redesign`, based on the connected `feat/fullstack-integration` branch. The landing carousel and its latest sizing/readability changes are retained. Backend endpoints, database, trained model and source data are unchanged.

## What changed

- Replace the fixed sidebar with a material-desk masthead, numbered horizontal navigation and mobile disclosure menu.
- Rebuild Overview around an asymmetric editorial headline and the existing transparent Blender animation. Actual counts, three workflow entry points, recently updated records and attributed state coverage replace the old dashboard arrangement.
- Add a keyboard-accessible native search dialog for pages, real imported facilities and reviewed materials. Selecting a facility/material opens its module with a matching search. Escape closes search and restores focus; opening and closing the dialog leaves form drafts intact.
- Reorganize analysis into capture, evidence and review, with material identity, quantity/value and supporting-information groups. Add an original model-score meter; preserve all uncertainty and confirmation rules.
- Redesign the pool planner as a worksheet with a sticky desktop estimate, a real quantity progress indicator, eligibility explanations and the existing CSV export.
- Restyle directory master/detail, filters, coverage mode, sources, setup and model tables consistently. Add report-derived per-class F1 bars.
- Correct skip-to-content navigation to focus the current page without routing to Overview.

All six routes and existing options remain available. No generated records, fake stock, fabricated impact metrics, accounts, booking or compliance automation are introduced.

## Implementation

`dist/workspace.css` is the final workspace presentation layer after base utilities, feature styles and the Blender stylesheet. This keeps feature styles independently reusable. The shared shell owns navigation and search. Feature initial-search values are passed through the mount context without modifying stored records or API contracts. All displayed user/source strings are escaped.

The Blender asset and lifecycle code are unchanged: transparent surface, drag rotation, reduced-motion and visibility suspension, and the rendered error/loading fallback. No pause control is added.

## Verification

Completed: 49 Node tests and all 27 browser scenarios at 360, 768 and 1366 pixels, run in viewport batches. Search/recent-record/skip-link checks and the final mobile-menu correction were rerun successfully.

Node coverage includes record evidence, SQLite persistence, save retry and feature lifecycle. Existing Playwright workflows continue to cover actual local classification, save/edit/reload, planner totals, CSV, the landing entry and Blender lifecycle. New browser tests cover finder keyboard/focus/draft behaviour, real facility/material result routing, mobile navigation, six-page overflow and screenshots at 360, 768 and 1366 pixels. Test data lives in disposable databases, with no paid provider key.
