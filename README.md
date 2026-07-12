# TapeWire

**A clickable prototype of a personalized news terminal for day traders —
and a personal database of what repeatedly matters to *this* trader.**
Raw headlines first, filtered to your watchlist, with an opt-in AI Explain
panel, a flagship Journal/Replay system ("trading is just data and
statistical analysis"), a ForexFactory-style econ calendar, and a preview of
Move Detective. Competitors are built around what is happening now; TapeWire
is also the trader's own record of what happened every time before.
Built for validation sessions with real stock/options/futures/FX traders —
the UI and interactions are real; the news data is a realistic mock layer
(see [ARCHITECTURE.md](./ARCHITECTURE.md) for how the real thing drops in).
The ten-rule product doctrine lives in [TRUST.md](./TRUST.md) and in-app
under Settings → Trust rules.

## Live demo (GitHub Pages)

Every push to `main` deploys a static build to
**https://htbot34.github.io/TapeWire/** via the workflow in
`.github/workflows/deploy-pages.yml`.

Because this repo's Pages configuration serves the root of `main`, the
workflow commits the built site (`index.html`, `_next/`, route dirs,
`404.html`, `.nojekyll`) into the repo root — those files are generated;
don't edit them by hand. The build is also mirrored to the `gh-pages` branch.

Pages is static hosting, so the one server feature — the live AI
conversation behind the Explain panel — runs in canned demo mode there
(clearly labeled; the follow-up input is disabled with a "Live AI available
in the full deployment" note). Everything else is identical, including the
structured historical tables, which come from a curated dataset rather than
the model. For live AI, deploy to Vercel with `ANTHROPIC_API_KEY` set, or
run locally with a `.env`.

## Setup

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it — **no env vars required for the demo path.** The AI explainer
degrades gracefully to canned explanations (in the same labeled-section
format, so the panel renders identically) without a key.

To enable live AI conversations, add a key:

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
```

The explainer calls Claude (`claude-sonnet-4-6`) through a server-side API
route; the key never reaches the browser. The system prompt enforces strict
neutrality — facts, definitions, historical data and mechanics only — plus a
fact-vs-inference contract (statements are labeled `Fact:` / `Inference:`).
Asking "should I short NQ?" gets a context-not-advice redirect; this holds
in the canned path too — try it.

## 3-minute v3 demo script

Run this in front of a design partner, in order:

1. **Onboarding (0:00–0:30).** Fresh start (Settings → *Reset demo* —
   reseeds everything). Pick what they trade, add symbols (`NVDA`,
   `EUR/USD`), then the new **How you trade** step: session
   (Asia/London/New York), style, and **alert sensitivity** — point out it
   actually gates the banner. Merge-add a source or @handle they follow.
2. **The feed (0:30–0:50).** Dense raw tape. Call out: **CRIT/REL/CTX
   labels next to every dot** (never color alone), explicit `Jul 10 · 14:32`
   stamps, **reactions with measurement windows** (`ES +0.9% in 5m` — a move
   without a window is meaningless), **Direct vs. via-correlation chip
   groups**, the **CORRECTED** tag on the TSLA recall tweet, and the quiet
   **⋯ feedback control** (Useful · Not relevant · Wrong asset · Wrong
   catalyst — the future ranking engine's training data).
3. **⚡ Breaking, both modes (0:50–1:10).** Press ⚡: the **two-line
   default** — BREAKING · time · instruments, then the headline, double
   flash, auto-settles in ~45s. Flip **Focus Alert mode** in Settings, press
   ⚡ again: full takeover. The first scenario is the semiconductor
   export-restrictions headline.
4. **Explain panel (1:10–1:40).** Hit **Explain** on the CPI print. Walk
   the fixed section order: Raw event (with source latency line) → What it
   is → Why markets care → Instruments affected (direct/correlated) →
   Observed reaction → What to monitor next → **Historical reactions
   table** → Sources → **Confidence & limitations**. Ask "should I short
   NQ?" for the neutrality redirect; point at the Fact:/Inference: labels.
5. **Move Detective preview (1:40–1:55).** Expand the ⚡ item: the
   **MOVE DETECTIVE** block — "Likely catalyst · 82% confidence" with the
   cross-asset reasoning. Then expand the "NQ DROPS 0.6%… NO HEADLINE"
   signals item: **"No verified news catalyst"** — the honest negative is
   the trust feature. Both badged PREVIEW.
6. **Save to journal (1:55–2:15).** → on the CPI row: folder suggested,
   reactions + intervals pre-filled, tap **Long**, tap **Held/Faded**, tag
   chips, save — under 10 seconds, and "observed only" is valid.
7. **Journal → Replay (2:15–2:40).** *The flagship.* Journal tab (second
   in the nav) → open **CPI**: the **Replay** view — stats header computed
   only from recorded entries ("Avg |NQ| 1.2% across 3 · Held/Faded split ·
   biggest move with date"), dense table (date · surprise · reactions ·
   outcome · tags), and inside an entry the **related-historical table** —
   "the last soft CPIs and how NQ reacted" next to what *you* recorded.
8. **Your Focus briefing (2:40–2:55).** Briefing tab: "Your Focus — ranked
   for your market", 3–7 items by score threshold (never padded), each with
   its deterministic **"Ranked #N because…"** line, actual/exp/prev inline,
   Scheduled/Unscheduled tags. Quiet-night handling intact.
9. **Calendar + pricing (2:55–3:00).** Calendar with the same impact
   labels and Explain buttons. Finish on **Pro**: "Would you use TapeWire at
   $39/month?" — Core $39 / Pro $79 / **Founding Trader $24 locked
   (first 100)**, per-tier interest capture. This is a fake-door pricing
   test for design-partner sessions; nothing is charged.

## What's real vs. mock

| Real | Mock |
| --- | --- |
| All interactions, filters, persistence (localStorage) | All news items (~60 realistic seeds, timestamps relative to page load) |
| AI Explain conversation (live Claude call when key is set) | "Breaking" events (fired on demand via ⚡; six scenarios) |
| Journal/Replay (create/edit/delete, folders, stats, outcome tracking — persists) | Historical reactions dataset (curated, plausible, internally consistent) |
| Feedback capture (⋯ control → localStorage, counts in Settings) | Move Detective analyses (hand-written, badged PREVIEW — simulated) |
| Breaking audio tick (WebAudio, works on static build) | Econ calendar entries (±1 day, consistent with feed figures) |
| Onboarding / settings / per-tier pricing interest capture | Source links, latency lines, verification badges (plausible, not live) |

## Judgment calls made without asking

**v3 decisions:**

- **"Replay" naming — open for founder review.** The tab stays **Journal**
  (trader-familiar); the folder-detail view is titled **Replay** with the
  subtitle "your event history, replayable". Swap is one string if the
  concept doesn't land.
- **Explain sections come from one model reply parsed defensively.** The
  route asks for four labeled sections (WHAT IT IS / WHY MARKETS CARE /
  OBSERVED REACTION / WHAT TRADERS MAY MONITOR NEXT); an unlabeled reply
  renders under a single "Context" section. When the event database has a
  definition, it is shown and the AI's "What it is" is not (no duplication);
  the AI's observed-reaction sentence renders *below* the structured chips.
- **Focus threshold, not fixed count.** `score ≥ 70`, capped at 7 — the
  mock night yields ~7; a quiet night yields fewer and is never padded.
- **Interval vocabulary** is free-text but seeded with a convention:
  durations (`1m`, `5m`, `30m`) render as "in 5m"; phrases
  (`since release`, `on day`, `overnight`) render verbatim. Legacy journal
  entries without an interval render as a bare move — never an invented
  window.
- **Correlated tickers only match the watchlist filter on Critical items** —
  otherwise every macro headline matches everything. Red-folder macro
  (CPI/NFP/FOMC) still always passes via the asset-class rule.
- **The "TapeWire Signals" feed item** (NQ drop, no headline) is a
  system-generated observation, not a wire headline — it exists so the Move
  Detective's honest-negative case is demoable. Production would visually
  segregate signals from the raw tape.
- **Scheduled flags:** calendar-driven releases, earnings and scheduled
  official remarks are `scheduled: true`; tweets, surprise corporate news
  and geopolitical items are false. The Powell breaking scenario is
  explicitly "UNSCHEDULED REMARKS".
- **Sensitivity gates only the banner takeover** — filtered items still land
  on the tape. Critical-only is the default.
- **Readability pass is token-level:** the `2xs` type step went 11px → 12px
  and secondary text colors gained contrast, so every timestamp/source/chip
  lifted one step without touching layout density. Verified at 1440px.
- **Reset demo now clears journal + feedback blobs too** and hard-reloads,
  so a demo always starts from the fully-seeded v3 state.
- **Trust rules are duplicated** in TRUST.md and the in-app modal (hand-kept
  in sync; a build step would single-source them in production).
- **Pricing is a fake-door test.** Interest is captured per tier to
  localStorage; no checkout exists and the modal says so.

**Carried over from v2:**

- **"Market open" = 09:30 local time** for the briefing-first landing, once
  per browser session.
- **Overnight window = 2h–16h old**; mock timestamps are relative to page
  load so the briefing demos at any hour.
- **Journal entries denormalize a full item snapshot** at save time; legacy
  snapshots (pre-v3 fields) are migrated on load (`tags: []`,
  `interval: ""`) and render through tolerant accessors.
- **Historical dataset, journal seeds and calendar figures are mutually
  consistent** (the June 11 CPI is the same print with the same intervals in
  all three) so testers can cross-check without contradictions.
- **Explainer historical section only renders when the dataset covers the
  event type** — no table is ever fabricated.
- **Custom sources synthesize one clearly-labeled sample item**; real
  ingestion is future work.
- **System font stacks, tabular numerals, Zustand v5 + persist** — unchanged.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
