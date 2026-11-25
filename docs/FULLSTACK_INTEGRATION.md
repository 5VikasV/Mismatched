# Fullstack integration

Implementation branch: `feat/fullstack-integration`. Target: `main` through a pull request; no automatic merge.

## Branch audit

| Published branch | Use in the combined application |
| --- | --- |
| `main` | Original local SQLite server and research workspace foundation |
| `feat/landing-page` (`3afa875`) | Exact published carousel, images, composition, typography and ticker; root asset paths and real workspace links connected |
| `feat/facility-directory-data` (`f79cb91`) | Actual directory module, source detail, filters, map/coverage view and tests |
| `feat/specialist-vision-benchmark` | Trained local MobileNetV3 Small classifier and measured report, inherited through the Blender branch |
| `feat/material-analysis-records` | Reviewed records, original evidence and persistence, inherited through the Blender branch |
| `feat/pool-planner-release` | Compatible-lot selection, delivered costs and CSV, inherited through the Blender branch |
| `feat/blender-material-loop` (`eeac41e`) | Integration base; transparent animated model only on Overview |
| `feat/standalone-planning-desk` | Inspected, excluded: user explicitly rejected standalone HTML data |
| `feature/index-html` | Inspected, excluded: standalone HTML is not the application entry point |

The supplied `SCRAPLOOP_CHANGES.md` and `IMPLEMENTATION_SUMMARY.md` were read as handoff context. The first mentions `feat/theme-align`, `feat/workspace-ux` and `feat/features`, which were not published on origin at audit time. Those claims are not evidence that their features exist. The actual published landing source uses Instrument Sans and IBM Plex Mono, with an ink primary button and orange marker. The workspace now shares that palette and typography. The landing composition was preserved.

## Routes

| URL | Behaviour |
| --- | --- |
| `/` | Published landing page |
| `/workspace#overview` | Real workspace summary and transparent Blender exhibit |
| `/workspace#directory` | Imported public directory and attributed source detail |
| `/workspace#analysis` | Local classification, manual review and saved records |
| `/workspace#planner` | Pool cost estimates and CSV export |
| `/workspace#results` | Actual local model evaluation report |
| `/workspace#sources` | Source provenance and model/provider setup |
| `/#analysis` and other old workspace hashes | Client redirect to the matching workspace page |
| `/landing`, `/landing/`, `/landing/landing.html` | Redirect to `/` |
| `/index.html`, `/workspace/` | Redirect to `/workspace` |
| `/landing/signin.html`, `/landing/signup.html` | Redirect to Overview; accounts intentionally omitted |

Run `npm run dev` from the repository. Restart an already-running server to activate routing changes. All API calls are same-origin; the app has no hardcoded development port. Existing ignored `data/research.sqlite` and the local model checkpoint are reused without reseeding or migration. A fresh database stays empty until the user explicitly imports the attributed public bundle or saves reviewed materials.

## Connected workflow and boundaries

The shell loads the four real feature modules through their `mountFeature(root, context)` contract. Shared context supplies the API, current data, refresh, navigation and notifications. Route generations and feature cleanup prevent late loads from replacing a different page. Saving refreshes shared state without destroying the current feature form. If a save succeeds but its following refresh fails, retry updates the committed record rather than creating a duplicate.

The public directory contains sourced research leads, not live inventory. Classification runs locally when the checkpoint is installed; missing-model errors remain explicit. Broad categories do not imply alloy, purity, contamination, weight or price. Reviewed material records are the planner inputs. Optional document-provider extraction remains explicit and server-side. No authentication, booking, payment, compliance submission or invented impact metrics are introduced. No standalone HTML data is imported. Existing private keys, database, checkpoints, presentations and handoff files remain outside this change.

The Blender exhibit retains drag rotation, off-screen/tab suspension, reduced-motion behaviour and the rendered error/loading poster. It has no background panel, visible labels or pause control.

## Verification

Completed: 49 Node tests, 5 Python checks, and all 21 browser scenarios across the three viewport sizes (run in viewport batches, with the corrected colour-normalisation assertion rerun). The available Chromium 1243 executable was selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; a fresh setup can install the matching browser using `npx playwright install chromium`. No paid provider calls were made.

- Node tests cover routing/CSP/private-file isolation, the real directory module, SQLite persistence, evidence validation, feature lifecycle, post-save refresh recovery, pool precision and CSV safety.
- Playwright covers landing entry, keyboard and reduced motion, legacy redirects, the Blender lifecycle/fallback and the complete real local-model/review/planner workflow at 360, 768 and 1366 pixels.
- Browser tests use disposable databases and no paid provider key. They do not modify the user's database.
- Directory overflow was also inspected at 900 and 1024 pixels between the mobile and desktop breakpoints.

See README for commands and model installation on a fresh clone. Factory-expert validation remains future work; integrating the UI does not extend the model's measured TrashNet performance to industrial scrap.
