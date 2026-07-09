# TapeWire — Architecture

The prototype is structured so that swapping mock data for real feeds touches
**only the data layer**, never the UI.

## The provider boundary

```
┌────────────────────────────────────────────────────────────┐
│  UI (app/, components/)                                    │
│  FeedView · BriefingView · BreakingBanner · ExplainerPanel │
└──────────────────────────┬─────────────────────────────────┘
                           │  imports ONLY the interface + instance
                           ▼
        lib/news/provider.ts — interface NewsProvider
          getFeed(filters): Promise<NewsItem[]>
          getOvernightBriefing(filters): Promise<NewsItem[]>   // ranked
          subscribeToBreaking(cb): () => void                  // banner
                           ▲
          ┌────────────────┴───────────────────┐
          │                                    │
  lib/news/mockProvider.ts             (future) liveProvider.ts
  MockNewsProvider                     LiveNewsProvider
  ~60 seeded items,                    websocket + REST ingestion
  relative timestamps,                 behind the same interface
  canned breaking pool
```

- `lib/news/types.ts` — `NewsItem`, `UserFilters`, and enums. The `NewsItem`
  shape is the wire contract: raw headline, source + source type, ISO
  timestamp, impact tier, ticker/pair tags, event type, optional body and
  `marketReaction`.
- `lib/news/index.ts` — exports the single `newsProvider: NewsProvider`
  instance. **Swapping mock → live is one assignment in this file.**
- Components never import `mockData.ts`. The one dev-only exception is
  `simulateBreakingNews()` (the header ⚡ button), which is exported from
  `lib/news/index.ts` and documented as mock-only.
- User preferences live in a Zustand store persisted to localStorage
  (`lib/store.ts`); the provider receives them as `UserFilters` on every call
  and stays stateless with respect to the user.
- The AI explainer is already "real": `app/api/explain/route.ts` calls the
  Anthropic API server-side (streaming), with a canned fallback when no
  `ANTHROPIC_API_KEY` is configured.

## What the real `LiveNewsProvider` needs

1. **Feed ingestion.** Wire/outlet REST + websocket sources (licensed vendor
   feeds, RSS for outlets, filtered X/Twitter firehose, econ-calendar APIs
   à la ForexFactory). Server-side ingestion workers normalize everything into
   the `NewsItem` shape; clients subscribe over a websocket and hydrate via
   REST. The prototype's "custom source" input (URL/@handle) currently just
   stores the entry — real ingestion of arbitrary user sources is future work
   (fetch, parse, classify pipeline per source type).
2. **Dedup.** The same story arrives from multiple wires seconds apart.
   Cluster by fuzzy headline similarity + entity overlap within a sliding
   window; keep the earliest wire print as canonical, attach the rest as
   confirmations (which is itself a signal traders want).
3. **Ticker tagging.** NER + a symbology map (company → tickers, macro topic →
   index/FX/rates instruments). This powers watchlist filtering, so precision
   matters more than recall — a mis-tagged headline erodes trust fast.
4. **Impact scoring.** Start rule-based, exactly like the red-folder
   convention traders already know: source tier × event type × calendar
   red-folder status × entity market cap, upgraded by realized market reaction
   (a headline that moved ES is retroactively high-impact). ML ranking can
   come later; v1 must be explainable.
5. **Latency targets.**
   - Breaking banner: **< 5s from wire print** to banner takeover
     (websocket push; `subscribeToBreaking` is already shaped for this).
   - Feed refresh: **< 60s** (the UI already re-polls `getFeed` on a 30s
     cadence, so only the backend has to keep up).
6. **Briefing ranking.** The mock's scoring (impact weight + watchlist bonus +
   recency + has-reaction) is a reasonable v1 seed for the server-side ranker;
   the interface (`getOvernightBriefing`) doesn't change.

## Future work (explicitly out of prototype scope)

- **Push notifications** for breaking items matching the watchlist (service
  worker + Web Push; the `subscribeToBreaking` seam is where it plugs in).
- Real ingestion of user-added custom sources (see above).
- The Pro features behind the fake door: AI news journal, unlimited custom
  sources, faster refresh tiers.
- Auth/accounts — everything is localStorage today by design.

## Key business risk: content licensing

Redistributing wire headlines (Reuters, Bloomberg, Dow Jones) is a licensed
activity, and headline-level redistribution rights are exactly what services
like this pay for. Options, roughly in ascending cost: econ-calendar and
government-release data (mostly free), social sources (platform API terms),
aggregator/API resellers (e.g. Benzinga-style feeds), direct wire licenses
(expensive, but the latency and trust the product promises ultimately live
here). This is the largest COGS line and should be validated against
willingness-to-pay early — it's the reason the $12/mo fake-door test exists in
the prototype.
