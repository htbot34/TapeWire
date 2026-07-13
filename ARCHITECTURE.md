# TapeWire — Architecture

The prototype is structured so that swapping mock data for real feeds touches
**only the data layer**, never the UI.

## The provider boundary

```
┌──────────────────────────────────────────────────────────────────────────┐
│  UI (app/, components/)                                                  │
│  FeedView · BriefingView · CalendarView · JournalView (Replay)           │
│  BreakingBanner · ExplainerPanel · SaveToJournalSheet                    │
│  FeedbackControl · MoveDetectiveBlock                                    │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    │  imports ONLY interfaces + instances
    ┌──────────────┬────────────────┼───────────────┬──────────────┬──────┐
    ▼              ▼                ▼               ▼              ▼      ▼
 lib/news/    lib/calendar/   lib/history/    lib/journal/  lib/feedback/ lib/moveDetective/
 NewsProvider CalendarProvider HistoricalEvent- JournalProvider Feedback-  MoveDetective-
                               Provider                        Provider   Provider
 getFeed      getEvents       getContext      folders/entries  per-item   getAnalysis
 getOvernight- (range query)  getByKey        CRUD + subscribe relevance  (item → static
 Briefing                     (item → facts)                   judgments  preview analysis)
 (ranked +
 reasons)
 subscribeTo-
 Breaking
    ▲              ▲                ▲               ▲              ▲      ▲
 MockNews-    MockCalendar-   MockHistorical- LocalStorage-  LocalStorage- MockMove-
 Provider     Provider        EventProvider   JournalProvider Feedback-   DetectiveProvider
 ~60 seeds    ±1 day of       curated CPI/NFP/ seeded demo    Provider    hand-written
 canned       entries         FOMC/earnings   entries                     analyses
 breaking pool                occurrences
```

- Every data domain follows the same rule: `lib/<domain>/index.ts` exports a
  single provider instance, and **swapping mock → live is one assignment in
  that file**. Components never import mock data directly. The one dev-only
  exception is `simulateBreakingNews()` (the header ⚡ button), exported from
  `lib/news/index.ts` and documented as mock-only.
- `lib/news/types.ts` — `NewsItem` is the wire contract: raw headline,
  source + source type, ISO timestamp, impact tier, ticker/pair tags, event
  type, source URL, optional body and `marketReaction`.
- `lib/calendar/types.ts` — `CalendarEvent` (time, name, currency, impact,
  forecast/previous/actual) plus `calendarEventToNewsItem()`, the adapter
  that lets calendar rows reuse the explainer flow unchanged.
- `lib/journal/` — `JournalEntry` denormalizes a full `NewsItem` snapshot at
  save time so entries survive independently of feed retention. Folder
  summaries (`summary.ts`) are computed strictly from user-recorded
  reactions — counts and averages, nothing invented.
- `lib/moveDetective/` — `MoveDetectiveProvider` returns PREVIEW catalyst
  analyses for specific mock events (see the Move Detective section below).
  Most items return null and the UI renders nothing — no invented analyses.
- `lib/feedback/` — `FeedbackProvider` stores per-item relevance judgments
  (Useful · Not relevant · Wrong asset mapping · Wrong catalyst) from the ⋯
  control on feed/briefing rows. **Nothing consumes this data yet by
  design** — it is the training input for the production ranking engine
  (see the ranking-engine roadmap below); the prototype captures it to
  validate that traders will actually provide it.
- User preferences live in a Zustand store persisted to localStorage
  (`lib/store.ts`); providers receive them as `UserFilters` per call and stay
  stateless with respect to the user.
- The AI explainer is already "real": `app/api/explain/route.ts` calls the
  Anthropic API server-side (streaming, multi-turn), with a canned fallback
  when no `ANTHROPIC_API_KEY` is configured. The system prompt carries a
  strict neutrality directive (no predictions, no directional opinions, no
  trade recommendations; advice-seeking questions are redirected to the
  historical data) and grounds the model on the structured
  `HistoricalEventContext` so it cannot invent dates or magnitudes. The
  canned fallback enforces the same contract.

## The historical events database (currently mock — must become real)

`lib/history/MockHistoricalEventProvider` is a hand-built dataset of past
occurrences per recurring event type: `(event, date, consensus, actual,
per-instrument market reaction)`. In production this must become a real,
continuously updated store, because **one engine powers three features**:

1. **Explainer historical tables** — the "?" panel renders definition,
   affected symbols and the dated reaction table from this store, never from
   the LLM (an LLM cannot be trusted to produce accurate historical dates or
   magnitudes).
2. **Journal folder summaries** — per-folder stats become far stronger when
   the user's recorded reactions can be joined against the canonical record.
3. **Accuracy measurement of TapeWire itself** — the trader-requested
   benchmark: log real market reactions to events over time and score the
   app's impact ratings against realized moves. The same
   (event, date, reaction) rows are exactly that log.

Building it means capturing each release as it happens (consensus from the
calendar feed, actual from the wire print, reaction snapshots from market
data at t+1min/t+30min/close) — a natural by-product of the ingestion
pipeline below.

## Ranking-engine roadmap (production)

The prototype's briefing score (impact weight + watchlist bonus + recency +
reaction bonus) is a stand-in for the production weighted model:

| Signal                       | Weight | Prototype status                            |
| ---------------------------- | ------ | ------------------------------------------- |
| Direct watchlist relevance   | 30%    | binary bonus via `directTickers` match      |
| Observed market impact       | 20%    | small bonus when a reaction is recorded     |
| Event importance             | 15%    | the Critical/Relevant/Context tier          |
| Source reliability           | 10%    | `sourceVerified` captured, not yet scored   |
| Recency                      | 10%    | linear age decay in the briefing score      |
| Correlation relevance        | 10%    | `correlatedTickers` match (Critical only)   |
| User behavior                | 5%     | **fed by the FeedbackProvider data** — the  |
|                              |        | ⋯ control's Useful / Not relevant / Wrong   |
|                              |        | asset / Wrong catalyst judgments            |

Two properties are non-negotiable regardless of weights: rankings must stay
explainable per-item (trust rule 9 — the "Ranked #N because…" line is the
contract), and commercial relationships never enter the model (trust
rule 10).

## Data strategy (production sourcing)

Three lanes, in order of certainty:

1. **Public/official APIs — free, legal, authoritative.** BLS (CPI/NFP),
   FRED (rates, macro series), SEC EDGAR (filings), Federal Reserve
   calendars and statements. These cover the scheduled-release backbone of
   the product: the econ calendar, actual/forecast/previous values, and the
   historical events database's ground truth.
2. **Licensed commercial vendor for fast breaking news + market prices** —
   e.g. the Benzinga API (newswire built for redistribution) plus a licensed
   market-data feed for the price/volume side (reaction capture, Move
   Detective). This is the main COGS line and the fastest legal route to a
   credible tape.
3. **What is explicitly NOT a path: scraping or redistributing personal
   subscriptions.** Piping a personal Reuters/Bloomberg terminal, X account,
   or FinancialJuice subscription into a multi-user product violates their
   terms and is not a viable business foundation. Where such sources are
   must-haves (see the sourcing-risk section below), the options are
   official APIs, licensed white-label deals, or building the equivalent
   dataset first-party.

## Move Detective (PREVIEW in the prototype — future flagship)

The prototype's `lib/moveDetective/MockMoveDetectiveProvider` returns
hand-written static analyses keyed to specific mock events, badged
"PREVIEW — simulated analysis" in the UI. Production requires three real
systems behind the same provider interface:

1. **Real-time price/volume feed** — tick-level (or at minimum 1s bar)
   data for the instruments TapeWire tracks, licensed market data.
2. **Anomaly detection** — flagging fast moves on elevated volume against
   rolling baselines (the "NQ −0.9% in 2m on elevated volume" trigger).
3. **Catalyst-ranking engine** — matching detected moves against the news
   ingestion stream: headline timing vs. move start, which instruments led,
   cross-asset signature (did rates move? did a single name lead?), and
   historical event-type fingerprints.

**Doctrine rule (non-negotiable): proximity in time is never sufficient to
claim causation.** The five-label taxonomy — Confirmed catalyst · Likely
catalyst · Possible contributor · No verified news catalyst ·
Technical/positioning move suspected — exists so the honest negatives are
first-class outputs. "No verified news catalyst" is the trust feature: an
engine that always finds a story is indistinguishable from one that makes
them up.

## What the real providers need

1. **Latency target (confirmed by user research): breaking banner within
   2–5 seconds of the wire print.** This is the primary technical challenge
   for production: it requires websocket ingestion end-to-end — a
   squawk-grade pipeline from source to client push — not REST polling.
   `subscribeToBreaking` is already shaped for this seam. Feed refresh can
   lag at < 60s (the UI re-polls `getFeed` on a 30s cadence).
2. **Feed ingestion.** Wire/outlet REST + websocket sources normalized
   server-side into the `NewsItem` shape; clients subscribe over a websocket
   and hydrate via REST. The prototype's "custom source" input (URL/@handle)
   stores the entry and shows a labeled sample item; real ingestion of
   arbitrary user sources is future work (fetch, parse, classify pipeline
   per source type).
3. **Dedup.** The same story arrives from multiple wires seconds apart.
   Cluster by fuzzy headline similarity + entity overlap within a sliding
   window; keep the earliest wire print as canonical, attach the rest as
   confirmations (itself a signal traders want).
4. **Ticker tagging.** NER + a symbology map. Powers watchlist filtering, so
   precision matters more than recall — a mis-tagged headline erodes trust
   fast.
5. **Impact scoring.** Start rule-based, exactly like the red-folder
   convention traders already know: source tier × event type × calendar
   red-folder status × entity market cap, upgraded by realized market
   reaction. v1 must be explainable; the historical events store makes the
   upgrades measurable.
6. **Calendar data.** `CalendarProvider.getEvents(from, to)` maps directly
   onto an econ-calendar dataset (see licensing below — this is a build-or-
   license decision, not a scraping decision).
7. **Journal backend.** `JournalProvider` maps 1:1 onto a trivial CRUD API +
   per-user store; the interface already isolates it.

## Monetization (fake-door validation)

The pricing modal is a fake door: per-tier interest and an email land in
localStorage, nothing is charged. v4 adds a second fake door on the Core
card — **Try the Core demo** — logged under the same interest mechanism
(`"core-demo"`), to measure demand for a try-before-buy path separately
from willingness to pay.

**Production requirement — demo access must be abuse-resistant.** A demo
tier that hands out full Core on a fresh email is a free-tier with extra
steps: gate it per person, not per address (IP + device fingerprinting,
one demo per person, rate-limited issuance), so trials can't be farmed
with disposable emails. This constraint is why the prototype only logs
interest instead of opening a demo.

## Key business risk: content sourcing & licensing (existential — resolve before production build)

User research named two must-have sources: **ForexFactory** (calendar) and
**FinancialJuice** (breaking feed). **Neither offers an official
redistribution API, and piping a personal subscription into a multi-user
product violates their terms of service.** That combination makes sourcing
the existential business risk for TapeWire — the product's two anchor
experiences currently have no legal supply path at multi-user scale.

Production paths to evaluate, roughly in ascending cost:

- **Licensed wire/squawk feeds** — e.g. Benzinga API, Dow Jones Newswires,
  and a Twitter/X API tier for the social layer. These exist precisely to be
  redistributed and are the fastest legal route to a credible tape.
- **First-party econ-calendar construction** — consensus/actual/previous for
  the major releases come from public statistical agencies and forecast
  aggregation; building an own calendar dataset is labor-intensive but
  removes the ForexFactory dependency entirely.
- **Direct partnership outreach** — approach FinancialJuice/ForexFactory (and
  comparable squawk services) about white-label or API partnerships; the
  worst case is a "no" that costs an email.

This is the largest COGS line and should be validated against
willingness-to-pay early — it's the reason the $12/mo fake-door test exists
in the prototype.

## Future work (explicitly out of prototype scope)

- **Push notifications** for breaking items matching the watchlist (service
  worker + Web Push; the `subscribeToBreaking` seam is where it plugs in).
- Real ingestion of user-added custom sources (see above).
- Auth/accounts — everything is localStorage today by design.
- Journal sync/export; joining journal folders against the historical events
  store for richer folder analytics.
