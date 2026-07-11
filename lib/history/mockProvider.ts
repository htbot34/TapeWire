import type { NewsItem } from "@/lib/news/types";
import type { HistoricalEventContext, HistoricalEventProvider } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATASET — hand-built, plausible, internally consistent (dates/figures
// line up with the journal seeds and the mock calendar). NOT real market data.
// Production replaces this with a real events database of
// (event, date, consensus, actual, per-instrument reaction) rows.
// ─────────────────────────────────────────────────────────────────────────────

const CONTEXTS: HistoricalEventContext[] = [
  {
    key: "us-cpi",
    name: "US CPI (Consumer Price Index)",
    definition:
      "Monthly US consumer-inflation print (BLS, 08:30 ET). The market trades the gap between actual and consensus, not the level itself.",
    symbols: ["ES", "NQ", "10Y", "DXY", "GLD", "SPY", "QQQ", "TLT"],
    occurrences: [
      {
        date: "2026-06-11",
        actual: "+0.1% m/m",
        consensus: "+0.2% m/m",
        surprise: "cooler",
        reactions: [
          { instrument: "NQ", move: "+1.6%", interval: "5m" },
          { instrument: "ES", move: "+1.1%", interval: "5m" },
          { instrument: "10Y", move: "-9bp", interval: "30m" },
        ],
      },
      {
        date: "2026-05-13",
        actual: "+0.3% m/m",
        consensus: "+0.3% m/m",
        surprise: "in line",
        reactions: [
          { instrument: "NQ", move: "+0.2%", interval: "5m" },
          { instrument: "ES", move: "+0.1%", interval: "5m" },
        ],
      },
      {
        date: "2026-04-10",
        actual: "+0.4% m/m",
        consensus: "+0.3% m/m",
        surprise: "hotter",
        reactions: [
          { instrument: "NQ", move: "-1.8%", interval: "5m" },
          { instrument: "ES", move: "-1.2%", interval: "5m" },
          { instrument: "DXY", move: "+0.6%", interval: "30m" },
        ],
      },
      {
        date: "2026-03-12",
        actual: "+0.4% m/m",
        consensus: "+0.3% m/m",
        surprise: "hotter",
        reactions: [
          { instrument: "NQ", move: "-1.1%", interval: "5m" },
          { instrument: "ES", move: "-0.8%", interval: "5m" },
          { instrument: "10Y", move: "+7bp", interval: "30m" },
        ],
      },
      {
        date: "2026-02-12",
        actual: "+0.3% m/m",
        consensus: "+0.2% m/m",
        surprise: "hotter",
        reactions: [
          { instrument: "NQ", move: "-0.9%", interval: "5m" },
          { instrument: "ES", move: "-0.6%", interval: "5m" },
        ],
      },
      {
        date: "2026-01-14",
        actual: "+0.2% m/m",
        consensus: "+0.3% m/m",
        surprise: "cooler",
        reactions: [
          { instrument: "NQ", move: "+1.2%", interval: "5m" },
          { instrument: "ES", move: "+0.8%", interval: "5m" },
          { instrument: "10Y", move: "-6bp", interval: "30m" },
        ],
      },
    ],
  },
  {
    key: "us-nfp",
    name: "US Nonfarm Payrolls (NFP)",
    definition:
      "Monthly US jobs report (BLS, first Friday, 08:30 ET): payrolls, unemployment rate and wages — the highest-profile scheduled macro release.",
    symbols: ["ES", "NQ", "10Y", "DXY", "GLD", "EUR/USD", "USD/JPY"],
    occurrences: [
      {
        date: "2026-06-05",
        actual: "+139K",
        consensus: "+130K",
        surprise: "slight beat",
        reactions: [
          { instrument: "ES", move: "+0.3%", interval: "5m" },
          { instrument: "10Y", move: "+4bp", interval: "30m" },
        ],
      },
      {
        date: "2026-05-01",
        actual: "+177K",
        consensus: "+138K",
        surprise: "beat",
        reactions: [
          { instrument: "ES", move: "+1.0%", interval: "5m" },
          { instrument: "DXY", move: "+0.4%", interval: "30m" },
        ],
      },
      {
        date: "2026-04-03",
        actual: "+228K",
        consensus: "+140K",
        surprise: "hot",
        reactions: [
          { instrument: "ES", move: "-0.5%", interval: "5m" },
          { instrument: "10Y", move: "+10bp", interval: "30m" },
          { instrument: "DXY", move: "+0.6%", interval: "30m" },
        ],
      },
      {
        date: "2026-03-06",
        actual: "+151K",
        consensus: "+160K",
        surprise: "slight miss",
        reactions: [
          { instrument: "ES", move: "+0.4%", interval: "5m" },
          { instrument: "10Y", move: "-5bp", interval: "30m" },
        ],
      },
      {
        date: "2026-02-06",
        actual: "+143K",
        consensus: "+175K",
        surprise: "miss",
        reactions: [
          { instrument: "ES", move: "-0.2%", interval: "5m" },
          { instrument: "10Y", move: "-8bp", interval: "30m" },
        ],
      },
    ],
  },
  {
    key: "fomc",
    name: "FOMC (Federal Open Market Committee)",
    definition:
      "The Fed's rate-setting meeting: decision 14:00 ET, press conference 14:30 ET. Statement wording, the dot plot and the presser all move rates, FX and equities. Minutes of each meeting follow three weeks later.",
    symbols: ["ES", "NQ", "2Y", "10Y", "DXY", "GLD", "SPY", "QQQ", "TLT"],
    occurrences: [
      {
        date: "2026-06-17",
        actual: "hold at 3.75–4.00%",
        consensus: "hold",
        surprise: "dovish dots (2 cuts)",
        reactions: [
          { instrument: "ES", move: "+0.6%", interval: "30m" },
          { instrument: "NQ", move: "+0.9%", interval: "30m" },
          { instrument: "10Y", move: "-6bp", interval: "30m" },
        ],
      },
      {
        date: "2026-04-29",
        actual: "hold at 3.75–4.00%",
        consensus: "hold",
        surprise: "hawkish presser",
        reactions: [
          { instrument: "ES", move: "-1.1%", interval: "30m" },
          { instrument: "NQ", move: "-1.5%", interval: "30m" },
          { instrument: "DXY", move: "+0.5%", interval: "30m" },
        ],
      },
      {
        date: "2026-03-18",
        actual: "cut 25bp to 3.75–4.00%",
        consensus: "cut 25bp",
        surprise: "as expected",
        reactions: [
          { instrument: "ES", move: "+0.4%", interval: "30m" },
          { instrument: "10Y", move: "-3bp", interval: "30m" },
        ],
      },
      {
        date: "2026-01-28",
        actual: "hold at 4.00–4.25%",
        consensus: "hold",
        surprise: "as expected",
        reactions: [
          { instrument: "ES", move: "-0.3%", interval: "30m" },
          { instrument: "2Y", move: "+2bp", interval: "30m" },
        ],
      },
    ],
  },
  {
    key: "us-jobless-claims",
    name: "US Initial Jobless Claims",
    definition:
      "Weekly count of new US unemployment filings (DOL, Thursday 08:30 ET) — a fast but noisy read on the labor market.",
    symbols: ["ES", "10Y", "DXY"],
    occurrences: [
      {
        date: "2026-07-02",
        actual: "222K",
        consensus: "224K",
        surprise: "in line",
        reactions: [{ instrument: "ES", move: "+0.1%", interval: "5m" }],
      },
      {
        date: "2026-06-25",
        actual: "231K",
        consensus: "220K",
        surprise: "soft",
        reactions: [
          { instrument: "ES", move: "-0.2%", interval: "5m" },
          { instrument: "10Y", move: "-4bp", interval: "30m" },
        ],
      },
      {
        date: "2026-06-18",
        actual: "218K",
        consensus: "225K",
        surprise: "firm",
        reactions: [{ instrument: "ES", move: "+0.1%", interval: "5m" }],
      },
      {
        date: "2026-06-11",
        actual: "226K",
        consensus: "223K",
        surprise: "in line",
        reactions: [{ instrument: "ES", move: "0.0%", interval: "5m" }],
      },
    ],
  },
  {
    key: "nvda-earnings",
    name: "NVDA Earnings (Nvidia quarterly results)",
    definition:
      "Nvidia's quarterly report (after the close): EPS/revenue vs. estimates and — above all — data-center revenue and the next-quarter guide drive the reaction across the whole AI complex.",
    symbols: ["NVDA", "SMH", "NQ", "QQQ", "AMD", "TSM"],
    occurrences: [
      {
        date: "2026-05-27",
        actual: "EPS $0.96, DC rev +73% y/y",
        consensus: "EPS $0.93",
        surprise: "beat + raised guide",
        reactions: [
          { instrument: "NVDA", move: "+6.4%", interval: "since release" },
          { instrument: "NQ", move: "+1.1%", interval: "since release" },
        ],
      },
      {
        date: "2026-02-25",
        actual: "EPS/rev beat, Q1 guide light",
        consensus: "guide in line",
        surprise: "guide miss",
        reactions: [
          { instrument: "NVDA", move: "-8.5%", interval: "since release" },
          { instrument: "NQ", move: "-1.3%", interval: "since release" },
        ],
      },
      {
        date: "2025-11-19",
        actual: "EPS $0.81 vs $0.75, rev beat",
        consensus: "EPS $0.75",
        surprise: "beat",
        reactions: [
          { instrument: "NVDA", move: "+5.1%", interval: "since release" },
          { instrument: "NQ", move: "+0.8%", interval: "since release" },
        ],
      },
      {
        date: "2025-08-27",
        actual: "EPS/rev beat, margins flat q/q",
        consensus: "beat expected",
        surprise: "sell-the-news",
        reactions: [
          { instrument: "NVDA", move: "-3.0%", interval: "since release" },
          { instrument: "NQ", move: "-0.4%", interval: "since release" },
        ],
      },
    ],
  },
  {
    key: "jpm-earnings",
    name: "JPM Earnings (JPMorgan quarterly results)",
    definition:
      "JPMorgan reports before the open and unofficially opens every earnings season; net interest income guidance and credit commentary set the tone for financials.",
    symbols: ["JPM", "XLF", "ES", "KRE"],
    occurrences: [
      {
        date: "2026-04-14",
        actual: "EPS $4.72 vs $4.55 est",
        consensus: "EPS $4.55",
        surprise: "beat",
        reactions: [
          { instrument: "JPM", move: "+2.2%", interval: "since release" },
          { instrument: "XLF", move: "+0.8%", interval: "since release" },
        ],
      },
      {
        date: "2026-01-15",
        actual: "EPS $4.81 vs $4.64 est, NII guide flat",
        consensus: "EPS $4.64",
        surprise: "beat, cautious guide",
        reactions: [
          { instrument: "JPM", move: "-1.4%", interval: "since release" },
          { instrument: "XLF", move: "-0.5%", interval: "since release" },
        ],
      },
      {
        date: "2025-10-14",
        actual: "EPS $4.37 vs $4.11 est",
        consensus: "EPS $4.11",
        surprise: "beat",
        reactions: [
          { instrument: "JPM", move: "+3.0%", interval: "since release" },
          { instrument: "XLF", move: "+1.1%", interval: "since release" },
        ],
      },
      {
        date: "2025-07-15",
        actual: "EPS $4.48 vs $4.48 est",
        consensus: "EPS $4.48",
        surprise: "in line",
        reactions: [{ instrument: "JPM", move: "-0.3%", interval: "since release" }],
      },
    ],
  },
  {
    key: "tsmc-earnings",
    name: "TSMC Results (Taiwan Semiconductor)",
    definition:
      "TSMC's monthly revenue and quarterly results are the demand read for the entire chip complex — US semis trade off them pre-market.",
    symbols: ["TSM", "NVDA", "AMD", "SMH", "NQ"],
    occurrences: [
      {
        date: "2026-04-17",
        actual: "rev +42% y/y",
        consensus: "+35% y/y",
        surprise: "beat",
        reactions: [
          { instrument: "TSM", move: "+4.1%", interval: "since release" },
          { instrument: "SMH", move: "+2.0%", interval: "since release" },
        ],
      },
      {
        date: "2026-01-16",
        actual: "rev +37% y/y, capex guide raised",
        consensus: "+33% y/y",
        surprise: "beat",
        reactions: [
          { instrument: "TSM", move: "+2.9%", interval: "since release" },
          { instrument: "NQ", move: "+0.5%", interval: "since release" },
        ],
      },
      {
        date: "2025-10-17",
        actual: "rev +36% y/y",
        consensus: "+34% y/y",
        surprise: "slight beat",
        reactions: [{ instrument: "TSM", move: "+1.2%", interval: "since release" }],
      },
      {
        date: "2025-07-17",
        actual: "rev +33% y/y, guide trimmed on FX",
        consensus: "+32% y/y",
        surprise: "mixed",
        reactions: [
          { instrument: "TSM", move: "-2.1%", interval: "since release" },
          { instrument: "SMH", move: "-0.9%", interval: "since release" },
        ],
      },
    ],
  },
];

const byKey = new Map(CONTEXTS.map((c) => [c.key, c]));

/**
 * Maps a news item to a dataset key via headline keywords (CPI/NFP/FOMC are
 * all eventType "econ-release") and ticker+eventType for earnings. Returns
 * null when the dataset has nothing — the UI then shows no table.
 */
export function historyKeyFor(
  item: Pick<NewsItem, "headline" | "eventType" | "directTickers" | "correlatedTickers">,
): string | null {
  const h = item.headline.toUpperCase();
  // Direct + correlated, tolerant of legacy journal snapshots that predate
  // the split (they carry a plain `tickers` array instead).
  const tickers = [
    ...(item.directTickers ?? []),
    ...(item.correlatedTickers ?? []),
    ...((item as unknown as { tickers?: string[] }).tickers ?? []),
  ];
  // US CPI only — the feed also carries UK/NZ/India/euro-zone prints the
  // dataset doesn't cover.
  if (/\bCPI\b/.test(h) && !/(UK|NEW ZEALAND|NZ\b|INDIA|EURO|CHINA|JAPAN|GERMAN)/.test(h)) {
    return "us-cpi";
  }
  if (/\bNFP\b|NONFARM|PAYROLLS/.test(h)) return "us-nfp";
  if (/\bFOMC\b/.test(h)) return "fomc";
  if (/JOBLESS CLAIMS/.test(h)) return "us-jobless-claims";
  if (item.eventType === "earnings" || /EARNINGS|BEATS|REVENUE/.test(h)) {
    if (tickers.includes("NVDA") && /NVDA|NVIDIA/.test(h)) return "nvda-earnings";
    if (tickers.includes("JPM") && /JPM|JPMORGAN/.test(h)) return "jpm-earnings";
    if (tickers.includes("TSM") || /TSMC/.test(h)) return "tsmc-earnings";
  }
  return null;
}

export class MockHistoricalEventProvider implements HistoricalEventProvider {
  async getContext(item: NewsItem): Promise<HistoricalEventContext | null> {
    const key = historyKeyFor(item);
    return key ? (byKey.get(key) ?? null) : null;
  }

  async getByKey(key: string): Promise<HistoricalEventContext | null> {
    return byKey.get(key) ?? null;
  }
}
