import type { MarketReaction, NewsItem } from "@/lib/news/types";

// Data contracts for structured historical event context. This exists
// because an LLM cannot be trusted to produce accurate historical dates or
// magnitudes — the explainer renders these facts from a curated dataset and
// the AI is instructed to ground on them. Production requires a real events
// database (see ARCHITECTURE.md).

export interface HistoricalOccurrence {
  /** ISO date of the occurrence, e.g. "2026-06-11". */
  date: string;
  /** Released figure where applicable, e.g. "+0.1% m/m". */
  actual?: string;
  /** Consensus estimate where applicable, e.g. "+0.2% m/m". */
  consensus?: string;
  /** Short surprise label: "cooler", "hotter", "in line", "beat", "miss"… */
  surprise?: string;
  /** Recorded per-instrument market reaction. */
  reactions: MarketReaction[];
}

export interface HistoricalEventContext {
  /** Stable key, e.g. "us-cpi", "fomc", "nvda-earnings". */
  key: string;
  /** Display name, e.g. "US CPI (Consumer Price Index)". */
  name: string;
  /** One-line glossary definition of what this event is. */
  definition: string;
  /** Symbols/markets that typically react. */
  symbols: string[];
  /** Past occurrences, newest first. The first entry is the last recorded one. */
  occurrences: HistoricalOccurrence[];
}

export interface HistoricalEventProvider {
  /**
   * Structured context for a news item's event type, or null when the
   * dataset has nothing for it — the UI must then show no table rather than
   * fabricate one.
   */
  getContext(item: NewsItem): Promise<HistoricalEventContext | null>;

  /**
   * Context by stable key (e.g. "us-cpi") — used by journal entries whose
   * relatedHistorical links were resolved at save time.
   */
  getByKey(key: string): Promise<HistoricalEventContext | null>;
}
