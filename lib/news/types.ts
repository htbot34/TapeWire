// Core data contracts for TapeWire.
// UI components consume these types plus the NewsProvider interface only —
// never mock data directly. See ARCHITECTURE.md.

export type Impact = "high" | "medium" | "low";

export type SourceType = "wire" | "outlet" | "social" | "econ-calendar";

export type AssetClass = "equities" | "options" | "futures" | "forex" | "crypto";

export type TradingSession = "asia" | "london" | "new-york" | "all";

export const SESSION_LABEL: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  "new-york": "New York",
  all: "All sessions",
};

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
  /**
   * Instruments the event directly reprices — named entities, the released
   * series' own market (e.g. NVDA/AMD/SMH on a chip-export headline).
   */
  directTickers: string[];
  /**
   * Read-through / correlation exposure — sector ETFs, index futures, peers
   * (e.g. NQ/ES on the same chip-export headline). Rendered muted; the
   * watchlist filter only matches these on Critical items.
   */
  correlatedTickers: string[];
  assetClasses: AssetClass[];
  pairs?: string[]; // ["EUR/USD"] for FX items
  eventType: EventType;
  /**
   * True when the event was on a known calendar (econ release, earnings,
   * scheduled speech/testimony); false for tweets, surprise headlines and
   * geopolitical developments.
   */
  scheduled: boolean;
  /**
   * Actual / consensus / prior figures for econ releases and earnings —
   * shared with the calendar dataset so feed, briefing and calendar rows
   * carry the same values for the same print.
   */
  econ?: { actual?: string; forecast?: string; previous?: string };
  body?: string; // expanded article text (mock)
  url?: string;
  marketReaction?: MarketReaction[];
  /**
   * Source-latency line, e.g. "received 0.8s after release" — a brand trust
   * element rendered subtly on expanded views and Explain panels.
   */
  latency?: string;
  /** True when the source is an authenticated/known feed (gov, wire, outlet). */
  sourceVerified?: boolean;
  /** When a correction was issued (ISO). The original headline is never rewritten. */
  correctedAt?: string;
  /** The correction text, rendered under a visible CORRECTED tag. */
  correction?: string;
}

/**
 * One briefing row: the item plus the rank score and the deterministic,
 * template-generated components of its "Ranked #N because…" line. Reasons
 * are derived only from item data + user filters — no AI call, renders
 * instantly, never fabricates.
 */
export interface RankedBriefingItem {
  item: NewsItem;
  score: number;
  /** True when the item cleared the Focus threshold (top 3–7 treatment). */
  focus: boolean;
  reasons: string[];
}

// Journal entries denormalize NewsItem snapshots at save time, so items
// persisted before the direct/correlated split may still carry a legacy
// `tickers` array. These accessors are the one tolerated compatibility seam —
// live provider data always has the new shape.

export function getDirectTickers(item: NewsItem): string[] {
  return (
    item.directTickers ??
    (item as unknown as { tickers?: string[] }).tickers ??
    []
  );
}

export function getCorrelatedTickers(item: NewsItem): string[] {
  return item.correlatedTickers ?? [];
}

/** Direct + correlated (deduped) — for contexts that don't distinguish. */
export function allTickers(item: NewsItem): string[] {
  return Array.from(new Set([...getDirectTickers(item), ...getCorrelatedTickers(item)]));
}

export interface UserFilters {
  /** Symbols on the user's watchlist — tickers and FX pairs, e.g. ["NVDA", "EUR/USD"]. */
  watchlist: string[];
  /** Asset classes the user trades. */
  assetClasses: AssetClass[];
  /** Trading session preference — flavors the ranked-because rationale. */
  tradingSession?: TradingSession;
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
