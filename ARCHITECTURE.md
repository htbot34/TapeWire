# TapeWire — Architecture

The prototype is structured so that swapping mock data for real feeds touches
**only the data layer**, never the UI.

## The provider boundary

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI (app/, components/)                                              │
│  FeedView · BriefingView · CalendarView · JournalView                │
│  BreakingBanner · ExplainerPanel · SaveToJournalSheet                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  imports ONLY interfaces + instances
        ┌───────────────┬───────┴───────┬────────────────┐
        ▼               ▼               ▼                ▼
  lib/news/       lib/calendar/    lib/history/     lib/journal/
  NewsProvider    CalendarProvider HistoricalEvent- JournalProvider
                                   Provider
  getFeed         getEvents        getContext       folders/entries CRUD
  getOvernight-   (range query)    (item → facts)   + subscribe
  Briefing
  subscribeTo-
  Breaking
        ▲               ▲               ▲                ▲
  MockNewsProvider MockCalendar-  MockHistorical-  LocalStorage-
  ~60 seeded items Provider       EventProvider    JournalProvider
  canned breaking  ±1 day of      curated CPI/NFP/ localStorage blob,
  pool             entries        FOMC/earnings    seeded demo entries
                                  occurrences
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
