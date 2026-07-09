// Core data contracts for TapeWire.
// UI components consume these types plus the NewsProvider interface only —
// never mock data directly. See ARCHITECTURE.md.

export type Impact = "high" | "medium" | "low";

export type SourceType = "wire" | "outlet" | "social" | "econ-calendar";

export type AssetClass = "equities" | "options" | "futures" | "forex" | "crypto";

export type EventType =
  | "econ-release"
  | "earnings"
  | "fed-speak"
  | "geopolitical"
  | "company-news"
  | "tweet"
  | "analyst"
  | "other";

export interface MarketReaction {
  instrument: string; // e.g. "ES", "NVDA", "EUR/USD"
  move: string; // e.g. "-0.8%", "+12bp"
}

export interface NewsItem {
  id: string;
  headline: string; // raw, unaltered
  source: string; // e.g. "Reuters", "CNBC", "@fedwatcher"
  sourceType: SourceType;
  timestamp: string; // ISO
  impact: Impact; // red/orange/gray folder convention
  tickers: string[]; // ["NVDA", "SPY"] — used for filtering
  assetClasses: AssetClass[];
  pairs?: string[]; // ["EUR/USD"] for FX items
  eventType: EventType;
  body?: string; // expanded article text (mock)
  url?: string;
  marketReaction?: MarketReaction[];
}

export interface UserFilters {
  /** Symbols on the user's watchlist — tickers and FX pairs, e.g. ["NVDA", "EUR/USD"]. */
  watchlist: string[];
  /** Asset classes the user trades. */
  assetClasses: AssetClass[];
  /** When true, restrict to items matching the watchlist / asset classes. */
  watchlistOnly: boolean;
  /** Optional narrowing filters set from the filter bar. */
  impacts?: Impact[];
  eventTypes?: EventType[];
  /** Restrict to specific symbols (subset of watchlist chips clicked in the UI). */
  symbols?: string[];
}
