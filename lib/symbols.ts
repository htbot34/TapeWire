import type { AssetClass } from "@/lib/news/types";

export interface SymbolInfo {
  symbol: string;
  name: string;
  kind: AssetClass;
}

// Static symbol universe for the watchlist typeahead. Real product replaces
// this with a reference-data service.
export const SYMBOLS: SymbolInfo[] = [
  // Index ETFs / broad market
  { symbol: "SPY", name: "SPDR S&P 500 ETF", kind: "equities" },
  { symbol: "QQQ", name: "Invesco Nasdaq-100 ETF", kind: "equities" },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", kind: "equities" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", kind: "equities" },
  { symbol: "TLT", name: "iShares 20+ Yr Treasury ETF", kind: "equities" },
  { symbol: "GLD", name: "SPDR Gold Shares", kind: "equities" },
  { symbol: "USO", name: "United States Oil Fund", kind: "equities" },
  { symbol: "XLE", name: "Energy Select SPDR", kind: "equities" },
  { symbol: "XLF", name: "Financial Select SPDR", kind: "equities" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", kind: "equities" },
  { symbol: "KRE", name: "SPDR Regional Banking ETF", kind: "equities" },
  { symbol: "GDX", name: "VanEck Gold Miners ETF", kind: "equities" },
  { symbol: "FXI", name: "iShares China Large-Cap ETF", kind: "equities" },
  { symbol: "EWJ", name: "iShares MSCI Japan ETF", kind: "equities" },
  { symbol: "EWZ", name: "iShares MSCI Brazil ETF", kind: "equities" },
  { symbol: "INDA", name: "iShares MSCI India ETF", kind: "equities" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust", kind: "equities" },
  // Large caps
  { symbol: "NVDA", name: "Nvidia", kind: "equities" },
  { symbol: "AAPL", name: "Apple", kind: "equities" },
  { symbol: "TSLA", name: "Tesla", kind: "equities" },
  { symbol: "AMD", name: "Advanced Micro Devices", kind: "equities" },
  { symbol: "META", name: "Meta Platforms", kind: "equities" },
  { symbol: "MSFT", name: "Microsoft", kind: "equities" },
  { symbol: "AMZN", name: "Amazon", kind: "equities" },
  { symbol: "GOOGL", name: "Alphabet", kind: "equities" },
  { symbol: "NFLX", name: "Netflix", kind: "equities" },
  { symbol: "ORCL", name: "Oracle", kind: "equities" },
  { symbol: "AVGO", name: "Broadcom", kind: "equities" },
  { symbol: "TSM", name: "TSMC (ADR)", kind: "equities" },
  { symbol: "MU", name: "Micron Technology", kind: "equities" },
  { symbol: "JPM", name: "JPMorgan Chase", kind: "equities" },
  { symbol: "BA", name: "Boeing", kind: "equities" },
  { symbol: "XOM", name: "Exxon Mobil", kind: "equities" },
  { symbol: "CVX", name: "Chevron", kind: "equities" },
  { symbol: "LLY", name: "Eli Lilly", kind: "equities" },
  { symbol: "NVO", name: "Novo Nordisk (ADR)", kind: "equities" },
  { symbol: "COIN", name: "Coinbase", kind: "equities" },
  { symbol: "HOOD", name: "Robinhood", kind: "equities" },
  { symbol: "PLTR", name: "Palantir", kind: "equities" },
  { symbol: "GM", name: "General Motors", kind: "equities" },
  { symbol: "F", name: "Ford Motor", kind: "equities" },
  { symbol: "FCX", name: "Freeport-McMoRan", kind: "equities" },
  { symbol: "BABA", name: "Alibaba (ADR)", kind: "equities" },
  { symbol: "ZIM", name: "ZIM Integrated Shipping", kind: "equities" },
  { symbol: "FDX", name: "FedEx", kind: "equities" },
  { symbol: "ARM", name: "Arm Holdings", kind: "equities" },
  // Futures (symbols used in marketReaction chips too)
  { symbol: "ES", name: "E-mini S&P 500", kind: "futures" },
  { symbol: "NQ", name: "E-mini Nasdaq-100", kind: "futures" },
  { symbol: "CL", name: "Crude Oil WTI", kind: "futures" },
  { symbol: "GC", name: "Gold", kind: "futures" },
  { symbol: "ZN", name: "10-Yr T-Note", kind: "futures" },
  // FX pairs
  { symbol: "EUR/USD", name: "Euro / US Dollar", kind: "forex" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", kind: "forex" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", kind: "forex" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", kind: "forex" },
  { symbol: "NZD/USD", name: "NZ Dollar / US Dollar", kind: "forex" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", kind: "forex" },
  { symbol: "EUR/GBP", name: "Euro / British Pound", kind: "forex" },
  { symbol: "USD/CNH", name: "US Dollar / Offshore Yuan", kind: "forex" },
  { symbol: "USD/INR", name: "US Dollar / Indian Rupee", kind: "forex" },
  { symbol: "USD/BRL", name: "US Dollar / Brazilian Real", kind: "forex" },
  // Crypto
  { symbol: "BTC", name: "Bitcoin", kind: "crypto" },
  { symbol: "ETH", name: "Ethereum", kind: "crypto" },
  { symbol: "SOL", name: "Solana", kind: "crypto" },
];

export const POPULAR_SYMBOLS = [
  "SPY",
  "QQQ",
  "NVDA",
  "TSLA",
  "AAPL",
  "AMD",
  "META",
  "EUR/USD",
  "USD/JPY",
  "BTC",
];

export function searchSymbols(query: string, limit = 8): SymbolInfo[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const starts = SYMBOLS.filter((s) => s.symbol.toUpperCase().startsWith(q));
  const contains = SYMBOLS.filter(
    (s) =>
      !s.symbol.toUpperCase().startsWith(q) &&
      (s.symbol.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)),
  );
  return [...starts, ...contains].slice(0, limit);
}
