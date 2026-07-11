# TapeWire

**A clickable prototype of a personalized news terminal for day traders.**
Raw headlines first, filtered to your watchlist, with an opt-in AI explainer,
a trade journal, and a ForexFactory-style econ calendar.
Built for validation sessions with real stock/options/futures/FX traders — the
UI and interactions are real; the news data is a realistic mock layer (see
[ARCHITECTURE.md](./ARCHITECTURE.md) for how the real thing drops in).

## Live demo (GitHub Pages)

Every push to `main` deploys a static build to
**https://htbot34.github.io/TapeWire/** via the workflow in
`.github/workflows/deploy-pages.yml`.

Because this repo's Pages configuration serves the root of `main`, the
workflow commits the built site (`index.html`, `_next/`, route dirs,
`404.html`, `.nojekyll`) into the repo root — those files are generated;
don't edit them by hand. The build is also mirrored to the `gh-pages` branch.

Pages is static hosting, so the one server feature — the live AI conversation
behind the "?" explainer — runs in canned demo mode there (clearly labeled in
the panel; the follow-up input is disabled with a "Live AI available in the
full deployment" note). Everything else is identical, including the
structured historical tables in the explainer, which come from a curated
dataset rather than the model. For live AI, deploy to Vercel with
`ANTHROPIC_API_KEY` set, or run locally with a `.env`.

## Setup

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it — **no env vars required for the demo path.** The AI explainer
degrades gracefully to canned explanations (and canned follow-up replies)
without a key.

To enable live AI conversations (the "?" panel), add a key:

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
```

The explainer calls Claude (`claude-sonnet-4-6`) through a server-side API
route; the key never reaches the browser. The system prompt enforces strict
neutrality — facts, definitions, historical data and mechanics only; asking
"should I short NQ?" gets a context-not-advice redirect (this holds in the
canned path too — try it).

Deploys as-is to the Vercel free tier (`ANTHROPIC_API_KEY` as an optional
project env var).

## 2-minute demo script

Run this in front of a tester, in order:

1. **Onboarding (0:00–0:20).** Open the app fresh (or Settings → *Reset
   demo*). Pick what they trade, add 3–5 symbols they actually watch
   (typeahead works — try `NVDA`, `EUR/USD`), glance at sources — add a
   custom one (`@handle` or URL) and point out it lands on the tape with its
   own tag. Hit **Open the tape**.
2. **The feed (0:20–0:35).** Scroll the tape. Call out: raw headlines exactly
   as the wire prints them, red/amber/gray impact dots, relative time **plus
   an explicit `Jul 10 · 14:32` stamp on every row** (overnight items are
   never ambiguous), and ticker chips where **watchlist symbols are filled
   accent chips** — "this touches MY symbols" at a glance. Flip
   **Watchlist ⇄ All news** and the source filter.
3. **⚡ Simulate breaking (0:35–0:45).** *The money moment.* Press the
   lightning bolt in the header. The banner takes over hard: two squawk
   flashes, deep red field, big headline, reaction chips — built to register
   in peripheral vision on a second monitor. (Optional audio tick lives in
   Settings → Alerts, off by default.) Dismiss it; the item is on the tape.
   Press ⚡ again for a different scenario — there are five.
4. **Expand + source (0:45–0:55).** Tap a headline — it expands inline with
   the body, reaction chips, and a **View source →** link to the original.
5. **"?" explainer (0:55–1:20).** Hit **?** on the CPI print. Structured
   facts render first — what it is, affected symbols, a **historical
   reactions table** (date · surprise · move) with the last occurrence
   highlighted — then the AI explanation below. **Ask a follow-up** ("what
   happened to gold last time?"), then ask "should I short NQ?" and show the
   neutrality redirect. Stress: AI is opt-in, never inline in the feed, and
   the table is curated data, not model output.
6. **→ Journal (1:20–1:45).** Hit the **→** on the CPI row: folder
   auto-suggested (CPI), reaction pre-filled, add a note, save — the arrow
   becomes a check. Open the **Journal** tab: seeded CPI/FOMC/NVDA-Earnings
   folders with entries, per-folder stats line ("Last 5 entries: 4 moved
   NQ ≥ 1%"), notes editable inline. This is the daily-habit loop.
7. **Briefing (1:45–1:55).** Click **Briefing**: "While you were out" — the
   top-4 ranked overnight events, then *everything* else with impact dots
   (no cap). On a slow night the header flags "Quiet overnight — no
   high-impact events" in amber so nothing masquerades as a red folder.
8. **Calendar (1:55–2:00).** Click **Calendar**: today's econ calendar with
   forecast/previous/actual, the **Up next** high-impact highlight,
   impact + my-markets filters, prev/next day. Hit **?** on CPI — same
   explainer, same history. If time allows, click **Pro** for the $12/mo
   teaser.

## What's real vs. mock

| Real | Mock |
| --- | --- |
| All interactions, filters, persistence (localStorage) | All news items (~60 realistic seeds, timestamps relative to page load) |
| AI explainer conversation (live Claude call when key is set) | "Breaking" events (fired on demand via the ⚡ button) |
| Journal (create/edit/delete, folders, stats — persists) | Historical reactions dataset (curated, plausible, internally consistent) |
| Breaking audio tick (WebAudio, works on static build) | Econ calendar entries (±1 day, consistent with feed figures) |
| Onboarding / settings / Pro interest capture | Source links (plausible URLs, not the real articles) · custom-source ingestion (stored; sample item labeled as simulated) |

## Judgment calls made without asking

- **"Market open" = 09:30 local time** for the briefing-first landing. The
  redirect happens once per browser session.
- **Overnight window = 2h–16h old.** Mock timestamps are relative to page
  load, so the briefing demos correctly at any time of day.
- **Broad macro items leak into a watchlist-filtered feed** when high-impact
  and matching a traded asset class; symbol-tagged filtering stays strict for
  medium/low items.
- **Briefing ranks watchlist-first, not watchlist-only.** Score = impact
  weight + watchlist bonus + recency.
- **The breaking audio tick shipped live, not "coming soon".** It's pure
  WebAudio (no assets, no backend), so it works on the static build; the
  browser's autoplay policy is handled by failing silently until the page
  has seen an interaction (the ⚡ press itself counts).
- **Custom sources synthesize one clearly-labeled sample item** on the tape,
  so "my source shows up" is demoable without pretending to ingest it. The
  sample bypasses the watchlist filter (a source you added is relevant by
  definition) but honors the other filters.
- **Journal entries denormalize a full item snapshot** at save time, so they
  survive independently of the feed mocks — and of feed retention in
  production. Folder stats are computed only from user-recorded reactions
  (count ≥ 1% moves + average of the most-recorded instrument); no invented
  math.
- **Historical dataset, journal seeds and calendar figures are mutually
  consistent** (the June 11 CPI is the same print in all three) so testers
  can cross-check without hitting contradictions.
- **Explainer historical section only renders when the dataset covers the
  event type** — no table is ever fabricated; AI-only otherwise. The chat
  thread is per-item, per-session (component state), not persisted.
- **The calendar fetches its whole mock range once** and slices days
  client-side; a live provider would be re-queried per day (the
  `getEvents(from, to)` contract already supports it).
- **System font stacks** (semi-mono for data, system sans for headlines) —
  zero-latency load, terminal-native. Tabular numerals everywhere data
  appears.
- **Zustand v5 + `persist`** for preferences; the journal has its own
  localStorage blob behind `JournalProvider`.
- **Explainer streams** when a key is present; the mock fallback returns
  instantly and is labeled `[Demo mode]` on its last line.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
