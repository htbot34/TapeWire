import type { Impact, MarketReaction } from "@/lib/news/types";

export function ImpactDot({ impact }: { impact: Impact }) {
  const cls =
    impact === "high"
      ? "bg-impact-high"
      : impact === "medium"
        ? "bg-impact-med"
        : "bg-impact-low/60";
  return (
    <span
      className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${cls}`}
      title={`${impact} impact`}
    />
  );
}

/**
 * Ticker tag on a row. `inWatchlist` gets the filled accent treatment so the
 * trader sees "this touches MY symbols" at a glance; other affected tickers
 * stay outlined/muted.
 */
export function TickerChip({
  symbol,
  inWatchlist = false,
}: {
  symbol: string;
  inWatchlist?: boolean;
}) {
  return (
    <span
      className={`tnum inline-flex shrink-0 items-center rounded-sm border px-1 py-px font-mono text-2xs ${
        inWatchlist
          ? "border-phos/60 bg-phos-faint font-semibold text-phos"
          : "border-ink-700 bg-ink-850 text-text-mid"
      }`}
      title={inWatchlist ? `${symbol} — on your watchlist` : symbol}
    >
      {symbol}
    </span>
  );
}

export function ReactionChip({ reaction }: { reaction: MarketReaction }) {
  const negative = reaction.move.trim().startsWith("-");
  return (
    <span
      className={`tnum inline-flex shrink-0 items-center gap-1 rounded-sm border px-1.5 py-px font-mono text-2xs ${
        negative
          ? "border-neg/30 bg-neg/10 text-neg"
          : "border-pos/30 bg-pos/10 text-pos"
      }`}
    >
      <span className="text-text-mid">{reaction.instrument}</span>
      {reaction.move}
    </span>
  );
}

export function SourceTag({
  source,
  sourceType,
}: {
  source: string;
  sourceType: string;
}) {
  const social = sourceType === "social";
  return (
    <span
      className={`inline-block max-w-full shrink-0 truncate align-baseline font-mono text-2xs uppercase tracking-wide ${
        social ? "text-phos/80" : "text-text-low"
      }`}
    >
      {source}
    </span>
  );
}
