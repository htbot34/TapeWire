import type { NewsProvider } from "./provider";
import type { Impact, NewsItem, UserFilters } from "./types";
import { buildBreakingItem, mockNewsItems } from "./mockData";

const IMPACT_WEIGHT: Record<Impact, number> = { high: 100, medium: 40, low: 10 };

/** Briefing window: items between 2h and 16h old count as "overnight". */
const BRIEFING_MIN_AGE_MS = 2 * 60 * 60 * 1000;
const BRIEFING_MAX_AGE_MS = 16 * 60 * 60 * 1000;

function matchesWatchlist(item: NewsItem, filters: UserFilters): boolean {
  const watch = new Set(filters.watchlist.map((s) => s.toUpperCase()));
  if (item.tickers.some((t) => watch.has(t.toUpperCase()))) return true;
  if (item.pairs?.some((p) => watch.has(p.toUpperCase()))) return true;
  // Broad macro items (Fed, CPI…) tagged to an asset class the user trades
  // still belong on a personalized tape even without a symbol match.
  if (
    item.impact === "high" &&
    item.assetClasses.some((a) => filters.assetClasses.includes(a))
  ) {
    return true;
  }
  return false;
}

function applyFilters(items: NewsItem[], filters: UserFilters): NewsItem[] {
  return items.filter((item) => {
    if (filters.watchlistOnly && !matchesWatchlist(item, filters)) return false;
    if (filters.impacts?.length && !filters.impacts.includes(item.impact)) return false;
    if (filters.eventTypes?.length && !filters.eventTypes.includes(item.eventType)) return false;
    if (filters.symbols?.length) {
      const wanted = new Set(filters.symbols.map((s) => s.toUpperCase()));
      const hit =
        item.tickers.some((t) => wanted.has(t.toUpperCase())) ||
        item.pairs?.some((p) => wanted.has(p.toUpperCase()));
      if (!hit) return false;
    }
    return true;
  });
}

export class MockNewsProvider implements NewsProvider {
  private items: NewsItem[] = [...mockNewsItems];
  private listeners = new Set<(item: NewsItem) => void>();
  private breakingIndex = 0;

  async getFeed(filters: UserFilters): Promise<NewsItem[]> {
    const filtered = applyFilters(this.items, filters);
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async getOvernightBriefing(filters: UserFilters): Promise<NewsItem[]> {
    const now = Date.now();
    const overnight = this.items.filter((item) => {
      const age = now - new Date(item.timestamp).getTime();
      return age >= BRIEFING_MIN_AGE_MS && age <= BRIEFING_MAX_AGE_MS;
    });
    // Watchlist-first, but never impact-blind: score = impact + relevance + recency.
    const scored = applyFilters(overnight, { ...filters, watchlistOnly: false }).map(
      (item) => {
        let score = IMPACT_WEIGHT[item.impact];
        if (matchesWatchlist(item, filters)) score += 30;
        const ageHours = (now - new Date(item.timestamp).getTime()) / 3_600_000;
        score += Math.max(0, 16 - ageHours); // mild recency bonus
        if (item.marketReaction?.length) score += 5;
        return { item, score };
      },
    );
    return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
  }

  subscribeToBreaking(cb: (item: NewsItem) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Dev/demo utility — fires the next canned high-impact item through the
   * breaking pipeline exactly as a live wire event would arrive. The item is
   * also prepended to the feed so it shows up on refresh.
   */
  simulateBreakingNews(): NewsItem {
    const item = buildBreakingItem(this.breakingIndex++);
    this.items = [item, ...this.items];
    this.listeners.forEach((cb) => cb(item));
    return item;
  }
}
