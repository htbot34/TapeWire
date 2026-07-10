import type { NewsItem } from "@/lib/news/types";
import type { JournalEntry, JournalFolder } from "./types";
import { folderIdForName } from "./types";

// Pre-seeded journal so the demo shows the "look back at past data" value on
// first open: three folders with realistic entries. Dates line up with the
// mock historical dataset in lib/history so the two features corroborate
// each other. Seeds are written to localStorage once; after that the user's
// own data is the source of truth.

const NVDA_FOLDER_ID = folderIdForName("NVDA Earnings");

export const seedFolders: JournalFolder[] = [
  { id: NVDA_FOLDER_ID, name: "NVDA Earnings", kind: "custom" },
];

const snap = (
  partial: Pick<NewsItem, "headline" | "source" | "timestamp" | "impact" | "tickers" | "eventType"> &
    Partial<NewsItem>,
): NewsItem => ({
  id: `seed-${partial.timestamp}`,
  sourceType: "econ-calendar",
  assetClasses: ["equities", "options", "futures"],
  ...partial,
});

let n = 0;
const entry = (
  folderId: string,
  item: NewsItem,
  reactions: JournalEntry["reactions"],
  notes: string,
): JournalEntry => ({
  id: `seed-entry-${++n}`,
  folderId,
  createdAt: item.timestamp,
  item,
  reactions,
  notes,
});

export const seedEntries: JournalEntry[] = [
  // ── CPI ──────────────────────────────────────────────────────────────────
  entry(
    folderIdForName("CPI"),
    snap({
      headline: "US CPI M/M +0.1% VS +0.2% EXPECTED; Y/Y 2.5%; SHELTER SLOWS",
      source: "BLS",
      timestamp: "2026-06-11T12:30:00.000Z",
      impact: "high",
      tickers: ["SPY", "QQQ", "TLT"],
      eventType: "econ-release",
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "+1.6%" },
      { instrument: "ES", move: "+1.1%" },
      { instrument: "10Y", move: "-9bp" },
    ],
    "Cooler print, shelter finally rolling over. NQ ripped ~120 pts in the first 5 minutes, faded half of it by the open. Bought the retest of the spike low — worked.",
  ),
  entry(
    folderIdForName("CPI"),
    snap({
      headline: "US CPI M/M +0.3% VS +0.3% EXPECTED; Y/Y 2.6%, IN LINE",
      source: "BLS",
      timestamp: "2026-05-13T12:30:00.000Z",
      impact: "high",
      tickers: ["SPY", "QQQ", "TLT"],
      eventType: "econ-release",
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "+0.2%" },
      { instrument: "ES", move: "+0.1%" },
    ],
    "Dead inline. Two-sided chop for 20 minutes, then back to the pre-print range. No trade — inline CPI is a skip unless positioning is stretched.",
  ),
  entry(
    folderIdForName("CPI"),
    snap({
      headline: "US CPI M/M +0.4% VS +0.3% EXPECTED; CORE ALSO HOT AT +0.4%",
      source: "BLS",
      timestamp: "2026-04-10T12:30:00.000Z",
      impact: "high",
      tickers: ["SPY", "QQQ", "TLT", "GLD"],
      eventType: "econ-release",
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "-1.8%" },
      { instrument: "ES", move: "-1.2%" },
      { instrument: "DXY", move: "+0.6%" },
    ],
    "Hot on headline AND core — gapped down hard, no bounce until ~11:00. Lesson: on a double-hot print don't knife-catch the first flush; wait for the 10am range to break.",
  ),

  // ── FOMC ─────────────────────────────────────────────────────────────────
  entry(
    folderIdForName("FOMC"),
    snap({
      headline: "FOMC HOLDS RATES; DOT PLOT SHIFTS TO TWO CUTS THIS YEAR",
      source: "Federal Reserve",
      timestamp: "2026-06-17T18:00:00.000Z",
      impact: "high",
      tickers: ["SPY", "QQQ", "TLT"],
      eventType: "econ-release",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    }),
    [
      { instrument: "ES", move: "+0.6%" },
      { instrument: "NQ", move: "+0.9%" },
      { instrument: "10Y", move: "-6bp" },
    ],
    "Dots moved dovish. Statement pop got sold, then the real move was the grind up through Powell's presser. FOMC pattern again: fade the 2:00 spike, trade the 2:30 direction.",
  ),
  entry(
    folderIdForName("FOMC"),
    snap({
      headline: "FOMC HOLDS; POWELL: 'NO URGENCY TO ADJUST POLICY' — HAWKISH PRESSER",
      source: "Federal Reserve",
      timestamp: "2026-04-29T18:00:00.000Z",
      impact: "high",
      tickers: ["SPY", "QQQ", "TLT"],
      eventType: "econ-release",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    }),
    [
      { instrument: "ES", move: "-1.1%" },
      { instrument: "NQ", move: "-1.5%" },
      { instrument: "DXY", move: "+0.5%" },
    ],
    "Statement neutral but presser hawkish — 'no urgency' killed the cut trade. Faded the initial statement pop, held through the presser. Best FOMC trade this year.",
  ),

  // ── NVDA Earnings (custom folder) ────────────────────────────────────────
  entry(
    NVDA_FOLDER_ID,
    snap({
      headline: "NVDA Q1 BEATS: EPS $0.96 VS $0.93 EST; DATA CENTER +73% Y/Y; GUIDES ABOVE",
      source: "Reuters",
      timestamp: "2026-05-27T20:20:00.000Z",
      impact: "high",
      tickers: ["NVDA", "SMH", "QQQ"],
      eventType: "earnings",
      sourceType: "wire",
      assetClasses: ["equities", "options"],
      url: "https://www.reuters.com/markets/nvda-q1-earnings/",
    }),
    [
      { instrument: "NVDA", move: "+6.4%" },
      { instrument: "NQ", move: "+1.1%" },
    ],
    "Beat and raise, DC revenue +73%. Stock +6% AH and held into next day. IV crush still ate most of the straddle even with the move — options into NVDA prints only pay on >8% moves.",
  ),
  entry(
    NVDA_FOLDER_ID,
    snap({
      headline: "NVDA Q4 BEATS ON EPS AND REV BUT Q1 GUIDE LIGHT ON EXPORT OVERHANG",
      source: "Reuters",
      timestamp: "2026-02-25T21:20:00.000Z",
      impact: "high",
      tickers: ["NVDA", "SMH", "QQQ"],
      eventType: "earnings",
      sourceType: "wire",
      assetClasses: ["equities", "options"],
      url: "https://www.reuters.com/markets/nvda-q4-earnings/",
    }),
    [
      { instrument: "NVDA", move: "-8.5%" },
      { instrument: "NQ", move: "-1.3%" },
    ],
    "Quarter fine, guide light on export-license overhang. Gap down dragged the whole semi complex. Note: NVDA guide > NVDA print for the market reaction.",
  ),
];
