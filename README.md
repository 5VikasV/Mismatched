# ScrapLoop Research Workspace

A local research application for India's industrial ecosystem. Public facility records, reviewed material notes and source provenance are stored in SQLite. The directory is not a feed of active offers or buyer requirements.

## Start

Requires Node.js 24 or newer. No production dependencies or separate database service are needed.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4173. The server binds to this computer only. Data is created in `data/research.sqlite`; that database is intentionally excluded from source control. Restarting the app preserves your imported facilities, saved analyses and reviewed material records. The old browser-local demo is not imported.

On first launch the database is empty. Use **Import public records** to load the bundled, attributed public registry snapshot. Importing again updates the same record IDs rather than duplicating them. See [data/README.md](data/README.md) for coverage, record dates, access and reuse terms. Nationwide filtering supports the records we actually have; uncovered states remain gaps.

## Enable OpenAI analysis

Copy `.env.example` to `.env`, then set your key locally:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=4173
```

Restart the server after changing settings. Do not commit `.env` or paste keys into the browser. The Sources & setup screen reports whether analysis is configured without exposing the key. Manual material notes and the directory work without an API key.

Upload a PDF, JPG, PNG or WebP file up to 10 MB and explicitly run analysis. The local server sends it to the OpenAI Responses API using a structured extraction schema. Results include evidence and unknown fields; review and edit suggestions before saving. Photos do not establish exact purity, grade, quantity or price. Original files are processed transiently, not retained by this app; extracted analysis and filename are saved in SQLite. The OpenAI request sets `store:false`; provider processing remains subject to your API account's data controls. API usage is charged to your account.

## Research and planning

- The facility directory displays public registry facts with source links, dates and coverage limitations. A historical listing does not establish current authorisation, participation in ScrapLoop or available material stock.
- Only records with trusted latitude and longitude appear as facility map points. Missing coordinates stay unknown; the app does not geocode or invent them.
- Your team's reviewed material notes are separate from directory records. Confirm them before saving. Missing quantities, grades and prices remain unknown.
- The pool planner uses your recorded material quantities/prices and the buyer assumptions you enter. It produces a planning estimate, not an order, reservation, transport booking or verified savings claim.
- This version runs on one computer. It has no public accounts, payments, trucking, government submissions or emissions certification.

## Test

```sh
npm test
```

Tests cover SQLite persistence, attributed imports, filters, reviewed records, upload validation, mocked OpenAI requests, error handling, planning and application interaction. The AI request is mocked in tests; a live call requires your configured key. DOM checks do not establish responsive browser rendering.

## Project

- `server/`: local HTTP API, SQLite and OpenAI integration.
- `dist/`: responsive browser interface and pure planner.
- `data/public-facilities.json`: reviewed public snapshot, imported only when requested.
- `tests/`: server, planner and application interaction checks.

The earlier Sites configuration remains for project identity only. This local SQLite server is not a static Sites deployment; publishing it would require a separate hosting and persistence adaptation.
