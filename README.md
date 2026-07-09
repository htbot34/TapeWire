# TapeWire

**A clickable prototype of a personalized news terminal for day traders.**
Raw headlines first, filtered to your watchlist, with an opt-in AI explainer.
Built for validation sessions with real stock/options/futures/FX traders — the
UI and interactions are real; the news data is a realistic mock layer (see
[ARCHITECTURE.md](./ARCHITECTURE.md) for how the real thing drops in).

## Live demo (GitHub Pages)

Every push to `main` deploys a static build to
**https://htbot34.github.io/TapeWire/** via the workflow in
`.github/workflows/deploy-pages.yml`.

Pages is static hosting, so the one server feature — the live AI call behind
the "?" explainer — runs in canned demo mode there (clearly labeled in the
panel). Everything else is identical. For live AI explanations, deploy to
Vercel with `ANTHROPIC_API_KEY` set, or run locally with a `.env`.

## Setup

```bash
npm install
npm run dev
# open http://localhost:3000
```

That's it — **no env vars required for the demo path.** The AI explainer
degrades gracefully to a canned explanation without a key.

To enable live AI explanations (the "?" button), add a key:

```bash
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
```

The explainer calls Claude (`claude-sonnet-4-6`) through a server-side API
route; the key never reaches the browser.

Deploys as-is to the Vercel free tier (`ANTHROPIC_API_KEY` as an optional
project env var).

## 60-second demo script

Run this in front of a tester, in order:

1. **Onboarding (0:00–0:20).** Open the app fresh (or Settings → *Reset
   demo*). Pick what they trade, add 3–5 symbols they actually watch (typeahead
   works — try `NVDA`, `EUR/USD`), glance at sources, hit **Open the tape**.
   Point out it took under a minute.
2. **The feed (0:20–0:30).** Scroll the tape. Call out: raw headlines exactly
   as the wire prints them, red/amber/gray impact dots, relative timestamps,
   ticker chips. Flip **Watchlist ⇄ All news** to show the filtering.
3. **Expand + explain (0:30–0:40).** Tap a headline — it expands inline with
   the body and market-reaction chips. Then hit the **?** on the CPI print:
   the AI panel opens and explains what it means for *their* watchlist. Stress
   that AI is opt-in and never mixed into the feed.
4. **⚡ Simulate breaking (0:40–0:50).** *The money moment.* Press the small
   lightning bolt in the top-right of the header. The banner takes over with a
   squawk-style flash — headline, timestamp, `ES +1.1%` chips. This is the
   "why did price just move" glance. Dismiss it; note the item is now on the
   tape. (Press ⚡ again for a different scenario — there are five.)
5. **Briefing (0:50–1:00).** Click **Briefing**: "While you were out", the
   top-4 ranked overnight events for their watchlist, everything else compact
   below. Mention this is the view they'd wake up to (it's the default landing
   before 09:30 local). If time allows, click **Pro** for the $12/mo teaser.

## What's real vs. mock

| Real | Mock |
| --- | --- |
| All interactions, filters, persistence (localStorage) | All news items (~60 realistic seeds, timestamps relative to page load) |
| AI explainer (live Claude call when key is set) | "Breaking" events (fired on demand via the ⚡ button) |
| Onboarding / settings / Pro interest capture | Source links (stubs), custom-source ingestion (stored, not fetched) |

## Judgment calls made without asking

- **"Market open" = 09:30 local time** for the briefing-first landing (spec
  said "local time before market open"). The redirect happens once per browser
  session so navigating back to the feed sticks.
- **Overnight window = 2h–16h old.** Since mock timestamps are relative to
  page load, the briefing treats items 2–16 hours old as "while you were out,"
  which demos correctly at any time of day.
- **Broad macro items leak into a watchlist-filtered feed** when they're
  high-impact and match an asset class the user trades (a CPI print with no
  ticker overlap still belongs on an equities trader's tape). Symbol-tagged
  filtering stays strict for medium/low items.
- **Briefing ranks watchlist-first, not watchlist-only** — a high-impact
  overnight event the user *should* know about still appears, just ranked
  below watchlist matches. Score = impact weight + watchlist bonus + recency.
- **System font stacks** (semi-mono for data, system sans for headlines)
  instead of webfonts — zero-latency load, works offline, and reads
  terminal-native. Tabular numerals are enforced on all timestamps/data.
- **The ⚡ simulate button lives in the header** (right side, low-contrast)
  rather than a dev menu — one press, no fumbling mid-demo. It cycles through
  five canned scenarios (Powell, NVDA halt, NFP, Musk tweet, BOJ intervention).
- **Zustand v5 + `persist`** for preferences; the store is the only writer to
  localStorage. Pro interest emails are stored in the same place.
- **Explainer streams** when a key is present; the mock fallback returns
  instantly and is labeled `[Demo mode]` on its last line.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
