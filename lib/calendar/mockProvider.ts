import type { CalendarEvent, CalendarProvider } from "./types";

// ~3 days of calendar entries (yesterday / today / tomorrow), timed relative
// to page load like the feed's mock items so the demo always shows a live
// day. Rows that overlap the feed carry the SAME figures (today's CPI,
// claims, EIA, UK CPI, JPM…) so the two views corroborate each other.

const NOW = Date.now();
const ts = (minutesFromNow: number) =>
  new Date(NOW + minutesFromNow * 60_000).toISOString();

type Seed = Omit<CalendarEvent, "id" | "timestamp"> & { minutesFromNow: number };

const seeds: Seed[] = [
  // ───────────────────────── yesterday ─────────────────────────
  {
    minutesFromNow: -1830, // ~30.5h ago
    name: "China CPI y/y (Jun)",
    currency: "CNY",
    impact: "low",
    forecast: "0.3%",
    previous: "0.2%",
    actual: "0.4%",
    assetClasses: ["forex", "futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -1740, // ~29h ago
    name: "German CPI final y/y (Jun)",
    currency: "EUR",
    impact: "low",
    forecast: "2.1%",
    previous: "2.1%",
    actual: "2.1%",
    assetClasses: ["forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -1590, // ~26.5h ago
    name: "US ISM Services PMI (Jun)",
    currency: "USD",
    impact: "medium",
    forecast: "52.5",
    previous: "51.9",
    actual: "52.8",
    tickers: ["SPY"],
    assetClasses: ["equities", "futures", "forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -1560, // ~26h ago
    name: "API Crude Oil Stock Change",
    currency: "USD",
    impact: "low",
    forecast: "-0.8M",
    previous: "+0.7M",
    actual: "+1.9M",
    tickers: ["USO", "XLE"],
    assetClasses: ["futures", "equities"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -1470, // ~24.5h ago
    name: "US 3-Year Note Auction",
    currency: "USD",
    impact: "low",
    previous: "3.58%",
    actual: "3.61%",
    tickers: ["TLT"],
    assetClasses: ["futures"],
    eventType: "econ-release",
  },

  // ───────────────────────── today (past — figures match the feed) ─────────
  {
    minutesFromNow: -720,
    name: "New Zealand CPI q/q → y/y (Q2)",
    currency: "NZD",
    impact: "low",
    forecast: "2.7%",
    previous: "2.6%",
    actual: "2.9%",
    assetClasses: ["forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -600,
    name: "RBA Cash Rate Decision",
    currency: "AUD",
    impact: "medium",
    forecast: "3.35%",
    previous: "3.60%",
    actual: "3.60%",
    assetClasses: ["forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -870,
    name: "Euro-zone Composite PMI final (Jun)",
    currency: "EUR",
    impact: "low",
    forecast: "50.1",
    previous: "49.7",
    actual: "50.4",
    assetClasses: ["forex", "futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -480,
    name: "FOMC Meeting Minutes",
    currency: "USD",
    impact: "high",
    tickers: ["SPY", "QQQ", "TLT"],
    assetClasses: ["equities", "options", "futures", "forex"],
    eventType: "econ-release",
    actual: "released",
  },
  {
    minutesFromNow: -410,
    name: "China Trade Balance — Exports y/y (Jun)",
    currency: "CNY",
    impact: "medium",
    forecast: "+5.0%",
    previous: "+4.8%",
    actual: "+7.6%",
    tickers: ["FXI", "BABA"],
    assetClasses: ["equities", "forex", "futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -320,
    name: "TSMC June-Quarter Revenue",
    currency: "TSM",
    impact: "medium",
    forecast: "+31% y/y",
    previous: "+35% y/y",
    actual: "+38% y/y",
    tickers: ["TSM", "NVDA", "AMD", "SMH"],
    assetClasses: ["equities", "options"],
    eventType: "earnings",
  },
  {
    minutesFromNow: -260,
    name: "German Factory Orders m/m (May)",
    currency: "EUR",
    impact: "low",
    forecast: "+0.5%",
    previous: "-1.4%",
    actual: "-2.1%",
    assetClasses: ["forex", "futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -205,
    name: "UK CPI y/y (Jun)",
    currency: "GBP",
    impact: "medium",
    forecast: "2.9%",
    previous: "3.0%",
    actual: "3.1%",
    assetClasses: ["forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -175,
    name: "JPM Q2 Earnings (pre-market)",
    currency: "JPM",
    impact: "high",
    forecast: "EPS $4.61",
    previous: "EPS $4.72",
    actual: "EPS $4.87",
    tickers: ["JPM", "XLF"],
    assetClasses: ["equities", "options"],
    eventType: "earnings",
  },
  {
    minutesFromNow: -160,
    name: "US Initial Jobless Claims",
    currency: "USD",
    impact: "medium",
    forecast: "225K",
    previous: "222K",
    actual: "219K",
    tickers: ["SPY"],
    assetClasses: ["equities", "futures", "forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -145,
    name: "US CPI m/m (Jun)",
    currency: "USD",
    impact: "high",
    forecast: "+0.3%",
    previous: "+0.1%",
    actual: "+0.2%",
    tickers: ["SPY", "QQQ", "TLT", "GLD"],
    assetClasses: ["equities", "options", "futures", "forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -90,
    name: "US 10-Year Note Auction",
    currency: "USD",
    impact: "medium",
    previous: "b/c 2.55",
    actual: "b/c 2.42",
    tickers: ["TLT"],
    assetClasses: ["futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: -12,
    name: "EIA Crude Oil Inventories",
    currency: "USD",
    impact: "medium",
    forecast: "-1.2M",
    previous: "-3.4M",
    actual: "-2.8M",
    tickers: ["USO", "XLE", "XOM"],
    assetClasses: ["futures", "equities"],
    eventType: "econ-release",
  },

  // ───────────────────────── today (upcoming) ─────────────────────────
  {
    minutesFromNow: 170, // ~3h out
    name: "Fed's Bostic Speaks on Economic Outlook",
    currency: "USD",
    impact: "medium",
    tickers: ["SPY", "TLT"],
    assetClasses: ["equities", "futures", "forex"],
    eventType: "fed-speak",
  },
  {
    minutesFromNow: 300,
    name: "US Federal Budget Balance (Jun)",
    currency: "USD",
    impact: "low",
    forecast: "-$41B",
    previous: "-$316B",
    assetClasses: ["futures"],
    eventType: "econ-release",
  },

  // ───────────────────────── tomorrow ─────────────────────────
  {
    minutesFromNow: 1210, // ~20h out → morning tomorrow
    name: "US Retail Sales m/m (Jun)",
    currency: "USD",
    impact: "high",
    forecast: "+0.2%",
    previous: "+0.9%",
    tickers: ["SPY", "QQQ"],
    assetClasses: ["equities", "options", "futures", "forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: 1215,
    name: "US PPI m/m (Jun)",
    currency: "USD",
    impact: "medium",
    forecast: "+0.2%",
    previous: "+0.4%",
    tickers: ["SPY", "TLT"],
    assetClasses: ["equities", "futures", "forex"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: 1330,
    name: "UoM Consumer Sentiment prelim (Jul)",
    currency: "USD",
    impact: "medium",
    forecast: "61.5",
    previous: "60.7",
    tickers: ["SPY"],
    assetClasses: ["equities", "futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: 1400,
    name: "ECB's Schnabel Speaks",
    currency: "EUR",
    impact: "low",
    assetClasses: ["forex"],
    eventType: "fed-speak",
  },
  {
    minutesFromNow: 1500,
    name: "US 30-Year Bond Auction",
    currency: "USD",
    impact: "medium",
    previous: "4.61%",
    tickers: ["TLT"],
    assetClasses: ["futures"],
    eventType: "econ-release",
  },
  {
    minutesFromNow: 1720, // after tomorrow's close
    name: "TSLA Q2 Earnings (after-hours)",
    currency: "TSLA",
    impact: "high",
    forecast: "EPS $0.52",
    previous: "EPS $0.40",
    tickers: ["TSLA"],
    assetClasses: ["equities", "options"],
    eventType: "earnings",
  },
];

let seq = 0;
const events: CalendarEvent[] = seeds
  .map(({ minutesFromNow, ...rest }) => ({
    ...rest,
    id: `cal-${(++seq).toString().padStart(3, "0")}`,
    timestamp: ts(minutesFromNow),
  }))
  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

export class MockCalendarProvider implements CalendarProvider {
  async getEvents(fromISO: string, toISO: string): Promise<CalendarEvent[]> {
    const from = new Date(fromISO).getTime();
    const to = new Date(toISO).getTime();
    return events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= from && t <= to;
    });
  }
}
