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
  partial: Pick<
    NewsItem,
    | "headline"
    | "source"
    | "timestamp"
    | "impact"
    | "directTickers"
    | "correlatedTickers"
    | "eventType"
  > &
    Partial<NewsItem>,
): NewsItem => ({
  id: `seed-${partial.timestamp}`,
  sourceType: "econ-calendar",
  assetClasses: ["equities", "options", "futures"],
  scheduled: true, // all seeded entries are calendar events (CPI/FOMC/earnings)
  ...partial,
});

let n = 0;
const entry = (
  folderId: string,
  item: NewsItem,
  reactions: JournalEntry["reactions"],
  notes: string,
  extras: Partial<Pick<JournalEntry, "trade" | "outcome" | "tags" | "relatedHistorical">> = {},
): JournalEntry => ({
  id: `seed-entry-${++n}`,
  folderId,
  createdAt: item.timestamp,
  item,
  reactions,
  notes,
  tags: [],
  ...extras,
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
      directTickers: ["SPY", "QQQ", "TLT"],
      correlatedTickers: [],
      eventType: "econ-release",
      econ: { actual: "+0.1% m/m", forecast: "+0.2% m/m", previous: "+0.3% m/m" },
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "+1.6%", interval: "5m" },
      { instrument: "ES", move: "+1.1%", interval: "5m" },
      { instrument: "10Y", move: "-9bp", interval: "30m" },
    ],
    "Cooler print, shelter finally rolling over. NQ ripped ~120 pts in the first 5 minutes, faded half of it by the open. Bought the retest of the spike low — worked.",
    {
      trade: { instrument: "NQ", direction: "long", note: "bought retest of the spike low" },
      outcome: "mixed",
      tags: ["CPI", "inflation"],
      relatedHistorical: ["us-cpi"],
    },
  ),
  entry(
    folderIdForName("CPI"),
    snap({
      headline: "US CPI M/M +0.3% VS +0.3% EXPECTED; Y/Y 2.6%, IN LINE",
      source: "BLS",
      timestamp: "2026-05-13T12:30:00.000Z",
      impact: "high",
      directTickers: ["SPY", "QQQ", "TLT"],
      correlatedTickers: [],
      eventType: "econ-release",
      econ: { actual: "+0.3% m/m", forecast: "+0.3% m/m", previous: "+0.4% m/m" },
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "+0.2%", interval: "5m" },
      { instrument: "ES", move: "+0.1%", interval: "5m" },
    ],
    "Dead inline. Two-sided chop for 20 minutes, then back to the pre-print range. No trade — inline CPI is a skip unless positioning is stretched.",
    {
      // observed only — no trade recorded, and that's a first-class entry
      outcome: "faded",
      tags: ["CPI"],
      relatedHistorical: ["us-cpi"],
    },
  ),
  entry(
    folderIdForName("CPI"),
    snap({
      headline: "US CPI M/M +0.4% VS +0.3% EXPECTED; CORE ALSO HOT AT +0.4%",
      source: "BLS",
      timestamp: "2026-04-10T12:30:00.000Z",
      impact: "high",
      directTickers: ["SPY", "QQQ", "TLT", "GLD"],
      correlatedTickers: [],
      eventType: "econ-release",
      econ: { actual: "+0.4% m/m", forecast: "+0.3% m/m", previous: "+0.4% m/m" },
      url: "https://www.bls.gov/news.release/cpi.htm",
    }),
    [
      { instrument: "NQ", move: "-1.8%", interval: "5m" },
      { instrument: "ES", move: "-1.2%", interval: "5m" },
      { instrument: "DXY", move: "+0.6%", interval: "30m" },
    ],
    "Hot on headline AND core — gapped down hard, no bounce until ~11:00. Lesson: on a double-hot print don't knife-catch the first flush; wait for the 10am range to break.",
    {
      trade: { instrument: "NQ", direction: "short", note: "short the 10am range break" },
      outcome: "held",
      tags: ["CPI", "inflation"],
      relatedHistorical: ["us-cpi"],
    },
  ),

  // ── FOMC ─────────────────────────────────────────────────────────────────
  entry(
    folderIdForName("FOMC"),
    snap({
      headline: "FOMC HOLDS RATES; DOT PLOT SHIFTS TO TWO CUTS THIS YEAR",
      source: "Federal Reserve",
      timestamp: "2026-06-17T18:00:00.000Z",
      impact: "high",
      directTickers: ["SPY", "QQQ", "TLT"],
      correlatedTickers: [],
      eventType: "econ-release",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    }),
    [
      { instrument: "ES", move: "+0.6%", interval: "30m" },
      { instrument: "NQ", move: "+0.9%", interval: "30m" },
      { instrument: "10Y", move: "-6bp", interval: "30m" },
    ],
    "Dots moved dovish. Statement pop got sold, then the real move was the grind up through Powell's presser. FOMC pattern again: fade the 2:00 spike, trade the 2:30 direction.",
    {
      trade: { instrument: "NQ", direction: "long", note: "faded the 2:00 spike, long through the presser" },
      outcome: "held",
      tags: ["FOMC", "rates"],
      relatedHistorical: ["fomc"],
    },
  ),
  entry(
    folderIdForName("FOMC"),
    snap({
      headline: "FOMC HOLDS; POWELL: 'NO URGENCY TO ADJUST POLICY' — HAWKISH PRESSER",
      source: "Federal Reserve",
      timestamp: "2026-04-29T18:00:00.000Z",
      impact: "high",
      directTickers: ["SPY", "QQQ", "TLT"],
      correlatedTickers: [],
      eventType: "econ-release",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    }),
    [
      { instrument: "ES", move: "-1.1%", interval: "30m" },
      { instrument: "NQ", move: "-1.5%", interval: "30m" },
      { instrument: "DXY", move: "+0.5%", interval: "30m" },
    ],
    "Statement neutral but presser hawkish — 'no urgency' killed the cut trade. Faded the initial statement pop, held through the presser. Best FOMC trade this year.",
    {
      trade: { instrument: "ES", direction: "short", note: "short the statement pop into the presser" },
      outcome: "held",
      tags: ["FOMC", "rates"],
      relatedHistorical: ["fomc"],
    },
  ),

  // ── NVDA Earnings (custom folder) ────────────────────────────────────────
  entry(
    NVDA_FOLDER_ID,
    snap({
      headline: "NVDA Q1 BEATS: EPS $0.96 VS $0.93 EST; DATA CENTER +73% Y/Y; GUIDES ABOVE",
      source: "Reuters",
      timestamp: "2026-05-27T20:20:00.000Z",
      impact: "high",
      directTickers: ["NVDA"],
      correlatedTickers: ["SMH", "QQQ"],
      eventType: "earnings",
      sourceType: "wire",
      assetClasses: ["equities", "options"],
      econ: { actual: "EPS $0.96", forecast: "EPS $0.93" },
      url: "https://www.reuters.com/markets/nvda-q1-earnings/",
    }),
    [
      { instrument: "NVDA", move: "+6.4%", interval: "since release" },
      { instrument: "NQ", move: "+1.1%", interval: "since release" },
    ],
    "Beat and raise, DC revenue +73%. Stock +6% AH and held into next day. IV crush still ate most of the straddle even with the move — options into NVDA prints only pay on >8% moves.",
    {
      // straddle = non-directional, so recorded as observed-only
      outcome: "held",
      tags: ["earnings", "NVDA", "AI"],
      relatedHistorical: ["nvda-earnings"],
    },
  ),
  entry(
    NVDA_FOLDER_ID,
    snap({
      headline: "NVDA Q4 BEATS ON EPS AND REV BUT Q1 GUIDE LIGHT ON EXPORT OVERHANG",
      source: "Reuters",
      timestamp: "2026-02-25T21:20:00.000Z",
      impact: "high",
      directTickers: ["NVDA"],
      correlatedTickers: ["SMH", "QQQ"],
      eventType: "earnings",
      sourceType: "wire",
      assetClasses: ["equities", "options"],
      url: "https://www.reuters.com/markets/nvda-q4-earnings/",
    }),
    [
      { instrument: "NVDA", move: "-8.5%", interval: "since release" },
      { instrument: "NQ", move: "-1.3%", interval: "since release" },
    ],
    "Quarter fine, guide light on export-license overhang. Gap down dragged the whole semi complex. Note: NVDA guide > NVDA print for the market reaction.",
    {
      trade: { instrument: "NVDA", direction: "short", note: "shorted the first gap-fill bounce" },
      outcome: "held",
      tags: ["earnings", "NVDA", "export controls"],
      relatedHistorical: ["nvda-earnings"],
    },
  ),
  entry(
    NVDA_FOLDER_ID,
    snap({
      headline: "NVDA Q3 BEATS: EPS $0.81 VS $0.75 EST; REVENUE BEAT; SHARES UP AH",
      source: "Reuters",
      timestamp: "2025-11-19T21:20:00.000Z",
      impact: "high",
      directTickers: ["NVDA"],
      correlatedTickers: ["SMH", "QQQ"],
      eventType: "earnings",
      sourceType: "wire",
      assetClasses: ["equities", "options"],
      econ: { actual: "EPS $0.81", forecast: "EPS $0.75" },
      url: "https://www.reuters.com/markets/nvda-q3-earnings/",
    }),
    [
      { instrument: "NVDA", move: "+5.1%", interval: "since release" },
      { instrument: "NQ", move: "+0.8%", interval: "since release" },
    ],
    "Clean beat, AH pop. Bought the AH momentum — gave most of it back into next morning as year-end sellers used the liquidity. Sell-the-news risk is real even on beats.",
    {
      trade: { instrument: "NVDA", direction: "long", note: "bought AH momentum" },
      outcome: "faded",
      tags: ["earnings", "NVDA"],
      relatedHistorical: ["nvda-earnings"],
    },
  ),
];
