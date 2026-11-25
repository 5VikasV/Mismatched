# ScrapLoop

A local material-research application: sourced facility records, a trained specialist image classifier, editable reviewed material records, and a selectable pool planner. Facility listings are research leads, not available stock.

## Start the website

Requires Node.js 24+. From this directory:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173 for the published landing page, then choose **Open workspace**. The connected application is at http://127.0.0.1:4173/workspace. No account or sign-in is required. The server binds only to this computer. Restart `npm run dev` after backend changes. SQLite data is saved in ignored `data/research.sqlite`; restarting preserves your records. No old browser demo data is imported.

Import the public bundle explicitly using **Import public records**. It currently contains 40 sourced facilities across three states, with dates, source references and coverage gaps. Imports are idempotent. Coordinates are shown only when available from sources. See [public-data documentation](data/README.md).

## Workspace experience

The workspace uses a horizontal material desk with numbered navigation, a responsive mobile menu and a transparent Blender exhibit on Overview. The landing page keeps its existing carousel design.

- **Find anything** (Ctrl+K / Cmd+K) searches pages, imported facilities, saved material records and booking requests. Opening a result applies its search to the real feature page. Closing the finder preserves the current form draft.
- **Overview** shows actual counts, recent reviewed records, source coverage and workflow entry points.
- **Material analysis** separates capture, evidence and review, groups fields by purpose, and displays the original classification score with its review limitations.
- **Pool planner** shows quantity fulfilment, eligible/excluded lots and an estimate summary alongside the inputs. Estimates and CSV exports use the same calculations.
- **Model results** adds per-class F1 bars backed by the evaluation report. **Evidence & numbers** adds sourced case studies, bounded emissions scenarios and business projections. Directory provenance stays with each facility; installation/provider instructions remain below in this README.

The redesign is on `feat/workspace-redesign`, based on `feat/fullstack-integration`. It changes presentation and adds workspace search; it does not change backend data, API schemas or model weights. No account is required.

## Enable the local specialist model

This machine's model has already been trained and is available locally. A fresh clone needs its own environment and checkpoint. Requires Python 3.14+ for the pinned CPU wheels, internet for initial downloads, and approximately 2 GB free disk space:

```sh
python3 -m venv .venv
.venv/bin/pip install -r ml/requirements.txt
npm run ml:prepare
npm run ml:train
npm run dev
```

Training/inference do not require an OpenAI key, API payments, or a GPU. Inference uses a persistent local Python worker. `ML_PYTHON` can override the interpreter path. Detailed methodology, source terms and commands are in [ml/README.md](ml/README.md).

The specialist is MobileNetV3 Small, initialized from ImageNet weights and trained for six categories: **cardboard, glass, metal, paper, plastic, other**. Preparation verifies the original author's resized TrashNet archive, removes exact duplicates, quarantines 3 conflicting-label pixel groups, and groups near duplicates before splitting. This run used 2,521 retained images: 1,778 training, 367 validation, 376 held-out test. Labels are dataset-provided, not expert-confirmed factory labels.

Measured held-out test accuracy: **89.1%**; macro-F1: **86.6%**. The weakest test class is `other`, with **61.9% recall**. Training took approximately 119 seconds on this computer. See **Model results** in the website or [the actual report](reports/model/latest.json) for the baseline, validation selection, confidence threshold, confusion matrix, class metrics and mistakes. Timing is machine-specific. Repeated training may differ across hardware/library versions.

These results describe TrashNet's mostly isolated household objects. They do not establish performance on factory scrap piles, mixed loads, unseen categories, or contamination. TACO remains a separate candidate pending per-image permissions and category mapping. ZeroWaste is noncommercial research-only and excluded from this model. Photos, checkpoints and caches stay out of Git; the reproducible manifest and compact report are committed.

## Material review workflow

1. Open **Material analysis**, upload or drop a JPG, PNG or WebP photo up to 10 MB, and select **Analyse**.
2. Inspect the category suggestion, score, model version and original evidence. Low-confidence/experimental outputs are flagged. Every prediction needs review; scores are not quality guarantees.
3. Correct fields and supply supporting details. The classifier leaves grade, condition, quantity and price unknown. Confirm every populated field before saving.
4. Search saved records, select **Review / edit**, correct details, confirm again and save. IDs, creation times and original analysis evidence remain unchanged. Delete requires a second explicit action.

A record field can be an AI suggestion, user-confirmed or unknown. User confirmation is not expert certification. The photo/document review queue identifies records awaiting future expert review; no AI prediction is presented as expert ground truth. Original uploads are processed transiently, not retained. Only suggestions, filenames, evidence and reviewed record fields are stored.

PDFs can be selected for manual review. The existing optional paid document extraction remains available only when a server key is configured and the user explicitly chooses it. Configure a private `.env` from `.env.example` using `OPENAI_API_KEY` and optionally `OPENAI_MODEL`, then restart. Never commit `.env`. The key stays server-side. No paid provider calls were made during this implementation; automated provider checks use mocks.

## Pool planner

Enter material, confirmed grade, exact required quantity in kg or metric tonnes, and a comparison rate. Commission is fixed at 5%, 4% or 3% by total material value, split 70:30 between buyer and sellers. Set a vehicle provider, payer and proposed cost for every contributing pickup. Choose individual records or **Select eligible**. Only confirmed clean records with matching material/grade and positive known quantities/prices contribute; exclusions are explained. An ML prediction of `plastic` does not establish PP or HDPE compatibility.

The planner uses cheapest-first allocation, partial final lots, six-decimal kg precision and two-decimal currency rounding. It shows shortages and delivered costs; savings appear only for a complete requirement and complete transport decisions. Currency values outside supported precision are rejected. **Export estimate CSV** downloads the exact displayed selection, allocations, costs, calculation timestamp and assumptions, with proper CSV escaping and spreadsheet-formula protection.

The result starts as a planning estimate. Complete pools can be saved as local **Pending agreement** booking requests, with immutable commercial and pickup snapshots. Booking requests can be viewed, exported and cancelled. They create no payment, inventory reservation, carrier dispatch, government submission or certified environmental claim. Pickup costs and comparison prices are user inputs, not live market quotes or price predictions.

See [commission, quantity and transport rules](docs/ORDER_COMMISSION_QUANTITY_TRANSPORT.md) for the exact tiers, examples, categories, request workflow and APIs. Restart the server after this update to load the new endpoints and additive SQLite table.

## Integrated matching and planned impact

The final website integrates `srushtisp09`’s matching explanations, pool suggestions, shared transport split, confidence indicators, Planned impact and Loop graph. Optional buyer coordinates enable a 50 km straight-line matching limit; unknown coordinates remain unknown. Impact derives from pending booking snapshots, not completed deliveries. See [the feature integration notes](docs/SRUSHTI_FEATURE_INTEGRATION.md) for source commits, adaptations, carbon methodology and exclusions.

## Verification

```sh
npm test
npm run test:ml
npm run ml:evaluate
npx playwright install chromium
npm run test:browser
```

- Node checks cover server validation, SQLite persistence, original evidence, partial edits, uploads, mocked providers, application handlers, selection, precision and CSV.
- Python checks cover group split isolation, real-manifest duplicate/conflict exclusion, all-class coverage, metrics and confidence selection.
- Landing checks cover the original carousel, keyboard access, reduced motion, workspace entry and legacy redirects. Browser walkthroughs use a disposable database and no provider key at 360, 768 and 1366 pixels: import/source inspection, local classification when a checkpoint is installed, manual correction, save/edit/reload, complete/incomplete/uneconomical plans, CSV downloads, report rendering, overflow and keyboard focus.
- Browser tests never use your production database. Actual checkpoint inference was also exercised directly. Factory-expert validation and TACO/ZeroWaste evaluations remain pending.

The combined application is on `feat/fullstack-integration`; `main` is not automatically merged. It combines the published landing frontend, sourced directory, specialist model, material review, pool planner and Blender exhibit. See [the integration notes](docs/FULLSTACK_INTEGRATION.md) for branch provenance, routes and scope.

## Blender material-loop exhibit

The Overview includes an original Blender-built factory and circular conveyor carrying recovered copper, polymer offcuts and cardboard. Its authored eight-second animation repeats seamlessly. The model sits directly on the page with a transparent background and no surrounding labels or playback controls. Drag to rotate. Reduced-motion users start paused, and the animation pauses when off-screen or the tab is hidden. A rendered WebP poster is the loading/error fallback. The existing overview map remains visible.

The GLB and locally hosted viewer work without Blender installed. The editable scene is [design/blender/material-loop.blend](design/blender/material-loop.blend); the generator and rebuild instructions are in [design/blender/README.md](design/blender/README.md). This is an illustrative sculpture, not live facility or inventory data.

### Evidence for pitches

Open `/workspace#evidence` for published precedents, project measurements, emissions scenarios, commission projections and browser printing. See [Pitch evidence and methodology](docs/PITCH_EVIDENCE.md) for source links, calculation boundaries and pilot proof requirements. Legacy `#sources` links redirect to the evidence page.
