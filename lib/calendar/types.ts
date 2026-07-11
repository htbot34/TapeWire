import type { AssetClass, EventType, Impact, NewsItem } from "@/lib/news/types";

// Data contracts for the economic calendar. Same provider pattern as news:
// UI consumes CalendarProvider + these types only, never the mock data.

export interface CalendarEvent {
  id: string;
  /** Scheduled time (ISO). */
  timestamp: string;
  /** Event name as a calendar prints it, e.g. "US CPI m/m (Jun)". */
  name: string;
  /** Currency / market label, e.g. "USD", "EUR", or a ticker for earnings. */
  currency: string;
  /** Red/amber/gray folder convention, same as the feed. */
  impact: Impact;
  forecast?: string;
  previous?: string;
  /** Filled for past events, blank for upcoming. */
  actual?: string;
  /** Related tickers (earnings rows, watchlist relevance). */
  tickers?: string[];
  assetClasses: AssetClass[];
  eventType: EventType;
}

export interface CalendarProvider {
  /** Events scheduled between the two ISO instants, ordered by time. */
  getEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]>;
}

/**
 * Adapts a calendar row into the NewsItem shape so the explainer panel (and
 * its historical matcher) work unchanged from the calendar.
 */
export function calendarEventToNewsItem(e: CalendarEvent): NewsItem {
  const upcoming = new Date(e.timestamp).getTime() > Date.now();
  const parts = [
    e.forecast ? `Forecast ${e.forecast}` : null,
    e.previous ? `Previous ${e.previous}` : null,
    e.actual ? `Actual ${e.actual}` : null,
  ].filter(Boolean);
  return {
    id: `cal-${e.id}`,
    headline: e.name,
    source: "Econ calendar",
    sourceType: "econ-calendar",
    timestamp: e.timestamp,
    impact: e.impact,
    directTickers: e.tickers ?? [],
    correlatedTickers: [],
    assetClasses: e.assetClasses,
    eventType: e.eventType,
    body: `${upcoming ? "Scheduled release" : "Released"} · ${e.currency}${
      parts.length ? ` · ${parts.join(" · ")}` : ""
    }.`,
    url: "https://www.forexfactory.com/calendar",
  };
}
