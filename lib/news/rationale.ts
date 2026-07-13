import type { CalendarEvent } from "@/lib/calendar/types";
import { correlationProvider } from "@/lib/correlations";
import type { RelevancePath } from "@/lib/correlations";
import { historicalEventProvider } from "@/lib/history";
import { relativeTime, shortTime } from "@/lib/time";
import type {
  AssetClass,
  MarketReaction,
  NewsItem,
  RankRationale,
  UserFilters,
  WatchlistImpact,
} from "./types";
import {
  SESSION_LABEL,
  formatReaction,
  getCorrelatedTickers,
  getDirectTickers,
} from "./types";

// The three-pillar rationale engine. Everything here is deterministic:
// template text from item data + user prefs + the correlation graph + the
// curated historical/calendar datasets. No AI call — the rationale renders
// instantly and can never fabricate (trust rule 9). The no-generic-reasons
// rule is structural: an item with no user-specific fit gets NO rationale
// (and the provider ranks it low) rather than a filler sentence.

/** |%| magnitude of a move string, or -1 for non-% recordings (bp, pts). */
export function reactionPct(r: Pick<MarketReaction, "move">): number {
  const m = r.move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
  return m ? Math.abs(parseFloat(m[0])) : -1;
}

/** The reaction with the largest absolute % move (falls back to the first). */
export function biggestReaction(item: NewsItem): MarketReaction | null {
  const rs = item.marketReaction ?? [];
  if (rs.length === 0) return null;
  return rs.reduce((best, r) => (reactionPct(r) > reactionPct(best) ? r : best), rs[0]);
}

export type UserFitKind = "direct" | "correlated" | "asset-class" | "none";

/** How (and how strongly) an item touches this user's setup. */
export interface UserFit {
  kind: UserFitKind;
  directHits: string[];
  corrHits: string[];
  assetHits: AssetClass[];
  watchlistImpact: WatchlistImpact;
}

/**
 * watchlistImpact table (documented in ARCHITECTURE.md):
 *   direct hit on Critical                                  → high
 *   correlated hit on Critical with matching asset class    → high
 *   direct on Relevant · correlated on Critical otherwise   → medium
 *   asset-class-only (and any weaker fit)                   → low
 * Correlated exposure counts only on Critical items — the same gate the
 * feed's watchlist filter applies.
 */
export function analyzeUserFit(item: NewsItem, filters: UserFilters): UserFit {
  const watch = new Set(filters.watchlist.map((s) => s.toUpperCase()));
  const inWatch = (s: string) => watch.has(s.toUpperCase());

  const directHits = [...getDirectTickers(item), ...(item.pairs ?? [])].filter(inWatch);
  const corrHits =
    item.impact === "high" ? getCorrelatedTickers(item).filter(inWatch) : [];
  const assetHits = item.assetClasses.filter((a) => filters.assetClasses.includes(a));

  const kind: UserFitKind = directHits.length
    ? "direct"
    : corrHits.length
      ? "correlated"
      : item.impact === "high" && assetHits.length
        ? "asset-class"
        : "none";

  let watchlistImpact: WatchlistImpact = "low";
  if (directHits.length && item.impact === "high") watchlistImpact = "high";
  else if (corrHits.length && assetHits.length) watchlistImpact = "high";
  else if ((directHits.length && item.impact === "medium") || corrHits.length) {
    watchlistImpact = "medium";
  }

  return { kind, directHits, corrHits, assetHits, watchlistImpact };
}

/**
 * Macro releases are graph nodes too (CPI → rates → 10Y → …), so an indirect
 * chain can start at the event itself, not just its tagged tickers.
 */
function eventNodeFor(item: NewsItem): string | null {
  const h = item.headline.toUpperCase();
  if (/\bCPI\b/.test(h)) return "CPI";
  if (/\bNFP\b|NONFARM|PAYROLLS/.test(h)) return "NFP";
  if (/\bFOMC\b/.test(h)) return "FOMC";
  return null;
}

/** Pillar 1 — why this relates to THIS user's instruments. */
function instrumentsPillar(
  item: NewsItem,
  filters: UserFilters,
  fit: UserFit,
  relevancePaths: RelevancePath[],
): string {
  const session =
    filters.tradingSession && filters.tradingSession !== "all"
      ? SESSION_LABEL[filters.tradingSession]
      : null;
  if (fit.kind === "direct") {
    const syms = fit.directHits.slice(0, 3).join("/");
    return session
      ? `you trade ${syms} during ${session} and this event tags ${syms} directly`
      : `directly tags ${syms} on your watchlist`;
  }
  if (fit.kind === "correlated") {
    const syms = fit.corrHits.slice(0, 2).join("/");
    const chain = relevancePaths[0]?.display;
    return chain
      ? `reaches ${syms} on your watchlist through ${chain}`
      : `hits ${syms} on your watchlist via correlation`;
  }
  // asset-class fit (Critical items only — analyzeUserFit gates this)
  const classes = fit.assetHits.join("/");
  const macro =
    item.eventType === "econ-release" ||
    item.eventType === "fed-speak" ||
    item.eventType === "geopolitical";
  return macro
    ? `Critical macro for the ${classes} markets you trade`
    : `rated Critical for the ${classes} markets you trade`;
}

/**
 * Pillar 2 — market impact produced. Built from the biggest recorded
 * reactions with their intervals; the comparative clause is appended only
 * when this item's move is the largest across the ranked set. Items with no
 * reaction yet fall back to the historical provider's typical-reaction data,
 * clearly phrased as historical — never as a prediction.
 */
async function impactPillar(item: NewsItem, largestInSet: boolean): Promise<string> {
  const rs = [...(item.marketReaction ?? [])].sort(
    (a, b) => reactionPct(b) - reactionPct(a),
  );
  if (rs.length > 0) {
    const shown = rs.slice(0, 2).map(formatReaction).join(" and ");
    const when = item.scheduled ? "after the release" : "on the headline";
    return largestInSet
      ? `${shown} — the largest recorded reaction across your ranked briefing`
      : `${shown} recorded ${when}`;
  }

  const history = await historicalEventProvider.getContext(item);
  if (history) {
    // Most-recorded instrument's average |%| move across the curated
    // occurrences — real dataset rows, phrased as history.
    const byInstrument = new Map<string, { pcts: number[]; intervals: string[] }>();
    for (const occ of history.occurrences) {
      for (const r of occ.reactions) {
        const pct = reactionPct(r);
        if (pct < 0) continue;
        const cur = byInstrument.get(r.instrument) ?? { pcts: [], intervals: [] };
        cur.pcts.push(pct);
        cur.intervals.push(r.interval);
        byInstrument.set(r.instrument, cur);
      }
    }
    const top = Array.from(byInstrument.entries()).sort(
      (a, b) => b[1].pcts.length - a[1].pcts.length,
    )[0];
    if (top) {
      const [inst, { pcts, intervals }] = top;
      const avg = pcts.reduce((s: number, p: number) => s + p, 0) / pcts.length;
      const interval = intervals[0];
      const window = /^\d+(s|m|h|d)$/.test(interval)
        ? ` in the first ${interval}`
        : interval
          ? ` ${interval}`
          : "";
      return `historically moves ${inst} ±${avg.toFixed(1)}%${window} (${pcts.length} recorded occurrences)`;
    }
  }
  return "no market reaction recorded yet";
}

/** The first upcoming calendar event plausibly related to this item. */
function nextRelatedEvent(
  item: NewsItem,
  upcoming: CalendarEvent[],
): CalendarEvent | null {
  const itemTickers = new Set(
    [...getDirectTickers(item), ...getCorrelatedTickers(item)].map((t) =>
      t.toUpperCase(),
    ),
  );
  for (const e of upcoming) {
    const tickerHit = e.tickers?.some((t) => itemTickers.has(t.toUpperCase()));
    const macroHit =
      item.eventType === "econ-release" &&
      e.eventType === "econ-release" &&
      e.impact !== "low" &&
      e.assetClasses.some((a) => item.assetClasses.includes(a));
    const fedHit = item.eventType === "fed-speak" && e.eventType === "fed-speak";
    if (tickerHit || macroHit || fedHit) return e;
  }
  return null;
}

/**
 * Pillar 3 — why it remains important NOW. Deterministic from timestamps and
 * calendar data: minutes since release, the next related scheduled event, or
 * the session-bias framing for red-folder prints.
 */
function whyNowPillar(
  item: NewsItem,
  filters: UserFilters,
  upcoming: CalendarEvent[],
): string {
  const age = relativeTime(item.timestamp);
  const redFolder =
    item.impact === "high" && item.scheduled && item.eventType === "econ-release";
  if (redFolder) {
    const session =
      filters.tradingSession && filters.tradingSession !== "all"
        ? SESSION_LABEL[filters.tradingSession]
        : null;
    return session
      ? `released ${age} ago — a red-folder print that sets the bias for your ${session} session`
      : `released ${age} ago — a red-folder print that sets the session bias`;
  }
  const next = nextRelatedEvent(item, upcoming);
  if (next) {
    return `released ${age} ago · next follow-on: ${next.name} at ${shortTime(next.timestamp)}`;
  }
  if (!item.scheduled && item.impact === "high") {
    return `an unscheduled Critical headline from ${age} ago — it was on no calendar`;
  }
  if (item.marketReaction?.length) {
    return `released ${age} ago with its market reaction on record above`;
  }
  return `released ${age} ago, inside your overnight catch-up window`;
}

/**
 * Builds the full three-pillar rationale for one ranked item, or null when
 * the item has nothing specific to this user (no generic reasons, ever).
 */
export async function buildRationale(
  item: NewsItem,
  filters: UserFilters,
  fit: UserFit,
  opts: { largestInSet: boolean; upcoming: CalendarEvent[] },
): Promise<RankRationale | null> {
  if (fit.kind === "none") return null;

  let relevancePaths: RelevancePath[] = [];
  if (fit.kind === "correlated") {
    const origins = [...getDirectTickers(item), ...(item.pairs ?? [])];
    const node = eventNodeFor(item);
    if (node) origins.unshift(node);
    relevancePaths = (await correlationProvider.getPaths(origins, fit.corrHits)).slice(
      0,
      2,
    );
  }

  return {
    instruments: instrumentsPillar(item, filters, fit, relevancePaths),
    relevancePaths,
    watchlistImpact: fit.watchlistImpact,
    impact: await impactPillar(item, opts.largestInSet),
    whyNow: whyNowPillar(item, filters, opts.upcoming),
  };
}

/**
 * Pillar 1 compressed to card-line length: "direct NQ driver" ·
 * "NQ via semiconductors" · "futures macro". Same deterministic inputs as
 * the full pillar — display-only compression, no new information.
 */
export function compressedInstruments(
  item: NewsItem,
  watchlist: string[],
  rationale: RankRationale,
): string {
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  const inWatch = (s: string) => watch.has(s.toUpperCase());
  const directHits = [...getDirectTickers(item), ...(item.pairs ?? [])].filter(inWatch);
  if (directHits.length) return `direct ${directHits.slice(0, 2).join("/")} driver`;
  const path = rationale.relevancePaths[0];
  if (path) {
    const parts = path.display.split(" → ");
    const target = parts[parts.length - 1];
    const via = parts.length > 2 ? parts.slice(1, -1).join(" → ") : parts[0];
    return `${target} via ${via}`;
  }
  const corrHits =
    item.impact === "high" ? getCorrelatedTickers(item).filter(inWatch) : [];
  if (corrHits.length) return `${corrHits[0]} via correlation`;
  return `${item.assetClasses.join("/")} macro`;
}
