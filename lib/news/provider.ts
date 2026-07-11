import type { NewsItem, RankedBriefingItem, UserFilters } from "./types";

/**
 * The seam between the UI and any news backend.
 *
 * The prototype ships a MockNewsProvider behind this interface. The real
 * product swaps in a LiveNewsProvider (websocket + REST ingestion) without
 * touching a single component. See ARCHITECTURE.md for the roadmap.
 */
export interface NewsProvider {
  /** Newest-first feed, filtered to the user's preferences. */
  getFeed(filters: UserFilters): Promise<NewsItem[]>;

  /**
   * Ranked digest of the overnight session, most important first. Items
   * above the Focus threshold (3–7 on a typical night, never padded) carry
   * focus: true plus deterministic ranked-because reasons.
   */
  getOvernightBriefing(filters: UserFilters): Promise<RankedBriefingItem[]>;

  /**
   * Subscribe to high-impact breaking items — powers the banner takeover.
   * Returns an unsubscribe function.
   */
  subscribeToBreaking(cb: (item: NewsItem) => void): () => void;
}
