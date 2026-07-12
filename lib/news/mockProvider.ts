import type { NewsProvider } from "./provider";
import type { Impact, MarketReaction, NewsItem, RankedBriefingItem, UserFilters } from "./types";
import { SESSION_LABEL, formatMove } from "./types";
import { buildBreakingItem, buildCustomSourceItem, mockNewsItems } from "./mockData";

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

/** The reaction with the largest absolute % move (falls back to the first). */
function biggestReaction(item: NewsItem): MarketReaction | null {
  const rs = item.marketReaction ?? [];
  if (rs.length === 0) return null;
  const pct = (r: MarketReaction) => {
    const m = r.move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
    return m ? Math.abs(parseFloat(m[0])) : -1;
  };
  return rs.reduce((best, r) => (pct(r) > pct(best) ? r : best), rs[0]);
}

/**
 * Deterministic "Ranked #N because…" components — template-based from item
 * data + the user's watchlist/asset classes only. No AI call: this must
 * render instantly and can never fabricate.
 */
function focusReasons(item: NewsItem, filters: UserFilters): string[] {
  const reasons: string[] = [];
  const watch = new Set(filters.watchlist.map((s) => s.toUpperCase()));
  const inWatch = (s: string) => watch.has(s.toUpperCase());

  const directHits = [...item.directTickers, ...(item.pairs ?? [])].filter(inWatch);
  const corrHits = item.correlatedTickers.filter(inWatch);
  const session =
    filters.tradingSession && filters.tradingSession !== "all"
      ? SESSION_LABEL[filters.tradingSession]
      : null;
  if (directHits.length) {
    const syms = directHits.slice(0, 3).join("/");
    reasons.push(
      session
        ? `you trade ${syms} during ${session} and this tags it directly`
        : `it directly tags ${syms} on your watchlist`,
    );
  } else if (corrHits.length && item.impact === "high") {
    reasons.push(`it hits ${corrHits.slice(0, 2).join("/")} you watch via correlation`);
  } else if (
    item.impact === "high" &&
    item.assetClasses.some((a) => filters.assetClasses.includes(a))
  ) {
    const classes = item.assetClasses
      .filter((a) => filters.assetClasses.includes(a))
      .join("/");
    reasons.push(`it's Critical macro for the ${classes} markets you trade`);
  }

  if (item.impact === "high" && item.scheduled && item.eventType === "econ-release") {
    reasons.push("it's a red-folder scheduled release");
  } else if (item.impact === "high" && !item.scheduled) {
    reasons.push("it's an unscheduled Critical headline");
  } else if (item.impact === "high") {
    reasons.push("it's rated Critical");
  }

  const r = biggestReaction(item);
  if (r) {
    // Phrase intervals ("since release", "overnight") already carry their
    // own context — only duration intervals get the trailing clause.
    const suffix = /^\d+(s|m|h|d)$/.test(r.interval)
      ? item.scheduled
        ? " after the release"
        : " on the headline"
      : "";
    reasons.push(`${r.instrument} moved ${formatMove(r)}${suffix}`);
  }
  return reasons.slice(0, 3);
}

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
    const ranked = scored.sort((a, b) => b.score - a.score);
    return ranked.map(({ item, score }, i) => {
      const focus = score >= FOCUS_THRESHOLD && i < FOCUS_MAX;
      return {
        item,
        score,
        focus,
        reasons: focus ? focusReasons(item, filters) : [],
      };
    });
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
