import { calendarProvider } from "@/lib/calendar";
import type { NewsProvider } from "./provider";
import type { Impact, NewsItem, RankedBriefingItem, UserFilters } from "./types";
import { buildBreakingItem, buildCustomSourceItem, mockNewsItems } from "./mockData";
import { analyzeUserFit, biggestReaction, buildRationale, reactionPct } from "./rationale";

const IMPACT_WEIGHT: Record<Impact, number> = { high: 100, medium: 40, low: 10 };

/** Briefing window: items between 2h and 16h old count as "overnight". */
const BRIEFING_MIN_AGE_MS = 2 * 60 * 60 * 1000;
const BRIEFING_MAX_AGE_MS = 16 * 60 * 60 * 1000;

/**
 * Rank-score threshold for the "Your Focus" section. On a typical mock night
 * this yields 5–6 items; the cap is 7 and the list is never padded — a quiet
 * night simply shows fewer (the quiet-night header handles the empty case).
 */
const FOCUS_THRESHOLD = 70;
const FOCUS_MAX = 7;

function matchesWatchlist(item: NewsItem, filters: UserFilters): boolean {
  const watch = new Set(filters.watchlist.map((s) => s.toUpperCase()));
  if (item.directTickers.some((t) => watch.has(t.toUpperCase()))) return true;
  if (item.pairs?.some((p) => watch.has(p.toUpperCase()))) return true;
  // Correlated exposure only matches on Critical items — otherwise every
  // macro headline correlates with everything and the filter means nothing.
  if (
    item.impact === "high" &&
    item.correlatedTickers.some((t) => watch.has(t.toUpperCase()))
  ) {
    return true;
  }
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
    if (filters.scheduled !== undefined && item.scheduled !== filters.scheduled) {
      return false;
    }
    if (filters.symbols?.length) {
      const wanted = new Set(filters.symbols.map((s) => s.toUpperCase()));
      // Same rule as the watchlist gate: direct always, correlated only on
      // Critical items.
      const hit =
        item.directTickers.some((t) => wanted.has(t.toUpperCase())) ||
        item.pairs?.some((p) => wanted.has(p.toUpperCase())) ||
        (item.impact === "high" &&
          item.correlatedTickers.some((t) => wanted.has(t.toUpperCase())));
      if (!hit) return false;
    }
    if (filters.sourceNames?.length || filters.sourceTypes?.length) {
      const nameHit = filters.sourceNames?.some(
        (n) => n.toLowerCase() === item.source.toLowerCase(),
      );
      const typeHit = filters.sourceTypes?.includes(item.sourceType);
      if (!nameHit && !typeHit) return false;
    }
    return true;
  });
}

export class MockNewsProvider implements NewsProvider {
  private items: NewsItem[] = [...mockNewsItems];
  private listeners = new Set<(item: NewsItem) => void>();
  private breakingIndex = 0;

  async getFeed(filters: UserFilters): Promise<NewsItem[]> {
    // One labeled sample item per enabled custom source, so user-added feeds
    // visibly land on the tape (real ingestion is future work). A source the
    // user explicitly added is relevant by definition — it bypasses the
    // watchlist gate but still honors the narrowing filters.
    const customItems = applyFilters(
      (filters.customSources ?? []).map(buildCustomSourceItem),
      { ...filters, watchlistOnly: false },
    );
    const filtered = [...applyFilters(this.items, filters), ...customItems];
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  async getOvernightBriefing(filters: UserFilters): Promise<RankedBriefingItem[]> {
    const now = Date.now();
    const overnight = this.items.filter((item) => {
      const age = now - new Date(item.timestamp).getTime();
      return age >= BRIEFING_MIN_AGE_MS && age <= BRIEFING_MAX_AGE_MS;
    });
    // Watchlist-first, but never impact-blind: score = impact + user fit +
    // recency. Items with nothing specific to this user are demoted and can
    // never carry a rationale — the no-generic-reasons rule is structural.
    const scored = applyFilters(overnight, { ...filters, watchlistOnly: false }).map(
      (item) => {
        const fit = analyzeUserFit(item, filters);
        let score = IMPACT_WEIGHT[item.impact];
        if (fit.kind === "direct" || fit.kind === "correlated") score += 30;
        else if (fit.kind === "asset-class") score += 15;
        else score -= 20; // not specific to this user → ranks low
        const ageHours = (now - new Date(item.timestamp).getTime()) / 3_600_000;
        score += Math.max(0, 16 - ageHours); // mild recency bonus
        if (item.marketReaction?.length) score += 5;
        return { item, score, fit };
      },
    );
    const ranked = scored.sort((a, b) => b.score - a.score);

    // The pillar-2 comparative clause ("largest reaction across your ranked
    // briefing") attaches to exactly one item: the biggest recorded |%| move.
    let largestId: string | null = null;
    let largestPct = 0;
    for (const { item } of ranked) {
      const r = biggestReaction(item);
      const pct = r ? reactionPct(r) : -1;
      if (pct > largestPct) {
        largestPct = pct;
        largestId = item.id;
      }
    }

    // Upcoming calendar events feed pillar 3's "next follow-on" clause.
    const upcoming = await calendarProvider.getEvents(
      new Date(now).toISOString(),
      new Date(now + 24 * 3_600_000).toISOString(),
    );

    return Promise.all(
      ranked.map(async ({ item, score, fit }, i) => {
        const focus =
          score >= FOCUS_THRESHOLD && i < FOCUS_MAX && fit.kind !== "none";
        const rationale = focus
          ? await buildRationale(item, filters, fit, {
              largestInSet: item.id === largestId,
              upcoming,
            })
          : null;
        return { item, score, focus, rationale: rationale ?? undefined };
      }),
    );
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
