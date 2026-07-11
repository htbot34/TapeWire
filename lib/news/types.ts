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
  /**
   * Measurement window for the move — a move without its period is
   * meaningless to a trader. Duration form ("1m", "5m", "30m") or a phrase
   * ("since release", "on day", "overnight"). Empty string = unknown window
   * (legacy journal entries); rendered without an interval.
   */
  interval: string;
}

/**
 * "+0.3% in 1m" / "-7bp since release" — durations get "in", phrases render
 * as written, and an empty interval falls back to the bare move.
 */
export function formatMove(r: Pick<MarketReaction, "move" | "interval">): string {
  if (!r.interval) return r.move;
  return /^\d+(s|m|h|d)$/.test(r.interval)
    ? `${r.move} in ${r.interval}`
    : `${r.move} ${r.interval}`;
}

/** "ES +0.3% in 1m" — the full reaction string used in text contexts. */
export function formatReaction(r: MarketReaction): string {
  return `${r.instrument} ${formatMove(r)}`;
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
  /** Restrict to specific source names (e.g. "Reuters", or a custom source's stored name). */
  sourceNames?: string[];
  /** Restrict to whole source types (e.g. all social accounts). */
  sourceTypes?: SourceType[];
  /**
   * User-added custom sources (enabled ones only). The mock provider
   * synthesizes a labeled sample item per source so added feeds visibly land
   * on the tape; a live provider would ingest them for real.
   */
  customSources?: string[];
}
