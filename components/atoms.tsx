import type { Impact, MarketReaction, NewsItem, WatchlistImpact } from "@/lib/news/types";
import { WATCHLIST_IMPACT_LABEL, formatMove } from "@/lib/news/types";

// Product-wide impact taxonomy: the internal enum stays high/medium/low, the
// UI always says Critical/Relevant/Context — and never color alone (every
// dot travels with a text label or an accessible title).
export const IMPACT_LABEL: Record<Impact, string> = {
  high: "Critical",
  medium: "Relevant",
  low: "Context",
};

/** Compact mono form for dense rows. */
export const IMPACT_TAG: Record<Impact, string> = {
  high: "CRIT",
  medium: "REL",
  low: "CTX",
};

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
      title={`${IMPACT_LABEL[impact]} impact`}
    />
  );
}

/**
 * Dot + text label. `compact` renders the CRIT/REL/CTX mono tag for dense
 * rows; expanded views and the briefing use the full word.
 */
export function ImpactTag({
  impact,
  compact = false,
}: {
  impact: Impact;
  compact?: boolean;
}) {
  const color =
    impact === "high"
      ? "text-impact-high"
      : impact === "medium"
        ? "text-impact-med"
        : "text-text-low";
  return (
    <span
      className="inline-flex shrink-0 items-baseline gap-1"
      title={`${IMPACT_LABEL[impact]} impact`}
    >
      <span className="self-center">
        <ImpactDot impact={impact} />
      </span>
      <span
        className={`font-mono text-2xs font-semibold uppercase tracking-wide ${color}`}
      >
        {compact ? IMPACT_TAG[impact] : IMPACT_LABEL[impact]}
      </span>
    </span>
  );
}

/**
 * Watchlist-impact label — answers "how much does this touch MY symbols?",
 * a different question from the global Critical/Relevant/Context tier, so it
 * gets a visually distinct treatment (sentence-case prefix, no dot, no
 * border). Impact color tokens plus the word — never color alone.
 */
export function WatchlistImpactTag({ impact }: { impact: WatchlistImpact }) {
  const color =
    impact === "high"
      ? "text-impact-high"
      : impact === "medium"
        ? "text-impact-med"
        : "text-impact-low";
  return (
    <span
      className="font-mono text-2xs"
      title={`${WATCHLIST_IMPACT_LABEL[impact]} impact on your watchlist — computed from your watchlist and correlation data`}
    >
      <span className="text-text-low">Impact on your watchlist: </span>
      <span className={`font-semibold ${color}`}>{WATCHLIST_IMPACT_LABEL[impact]}</span>
    </span>
  );
}

/**
 * Ticker tag on a row. `inWatchlist` gets the filled accent treatment so the
 * trader sees "this touches MY symbols" at a glance; other affected tickers
 * stay outlined/muted. `variant="correlated"` renders the quieter dashed
 * treatment for read-through exposure ("via correlation") — watchlist
 * highlighting still applies, just softer.
 */
export function TickerChip({
  symbol,
  inWatchlist = false,
  variant = "direct",
}: {
  symbol: string;
  inWatchlist?: boolean;
  variant?: "direct" | "correlated";
}) {
  const correlated = variant === "correlated";
  const cls = correlated
    ? inWatchlist
      ? "border-dashed border-phos/40 text-phos/80"
      : "border-dashed border-ink-700/80 text-text-low"
    : inWatchlist
      ? "border-phos/60 bg-phos-faint font-semibold text-phos"
      : "border-ink-700 bg-ink-850 text-text-mid";
  return (
    <span
      className={`tnum inline-flex shrink-0 items-center rounded-sm border px-1 py-px font-mono text-2xs ${cls}`}
      title={
        correlated
          ? `${symbol} — exposure via correlation${inWatchlist ? " (on your watchlist)" : ""}`
          : inWatchlist
            ? `${symbol} — on your watchlist`
            : symbol
      }
    >
      {symbol}
    </span>
  );
}

/** Compact instrument + move text (colored by direction), interval included. */
export function MoveText({ reaction }: { reaction: MarketReaction }) {
  const negative = reaction.move.trim().startsWith("-");
  return (
    <span className="tnum whitespace-nowrap font-mono text-2xs">
      <span className="text-text-low">{reaction.instrument}&nbsp;</span>
      <span className={negative ? "text-neg" : "text-pos"}>
        {formatMove(reaction)}
      </span>
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
      {formatMove(reaction)}
    </span>
  );
}

/** Scheduled (calendar-driven) vs. Unscheduled (surprise) tag. */
export function ScheduledTag({ scheduled }: { scheduled: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-sm border px-1 py-px font-mono text-2xs uppercase tracking-wide ${
        scheduled
          ? "border-ink-700 text-text-low"
          : "border-impact-med/40 text-impact-med"
      }`}
      title={
        scheduled
          ? "Scheduled — this event was on the calendar"
          : "Unscheduled — surprise headline, not on any calendar"
      }
    >
      {scheduled ? "Scheduled" : "Unscheduled"}
    </span>
  );
}

/** Inline actual / expected / previous values for econ releases & earnings. */
export function EconValues({
  econ,
}: {
  econ: { actual?: string; forecast?: string; previous?: string };
}) {
  const parts = [
    econ.actual ? `Actual ${econ.actual}` : null,
    econ.forecast ? `Exp ${econ.forecast}` : null,
    econ.previous ? `Prev ${econ.previous}` : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span className="tnum font-mono text-2xs text-text-mid">
      {parts.join(" · ")}
    </span>
  );
}

/**
 * Source trust line: `BLS · verified source · received 0.8s after release`.
 * A brand trust element, rendered subtly on expanded views and the Explain
 * panel — never decoration, never loud.
 */
export function SourceLatencyLine({ item }: { item: NewsItem }) {
  const parts = [
    item.source,
    item.sourceVerified === true
      ? "verified source"
      : item.sourceVerified === false
        ? "unverified account"
        : null,
    item.latency ?? null,
  ].filter(Boolean);
  return (
    <span
      className={`font-mono text-2xs ${
        item.sourceVerified === false ? "text-impact-med/80" : "text-text-low"
      }`}
      title="Source verification and wire-to-terminal latency"
    >
      {parts.join(" · ")}
    </span>
  );
}

/** Visible correction marker — the original headline is never rewritten. */
export function CorrectedTag() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-sm border border-impact-med/60 bg-impact-med/10 px-1 py-px font-mono text-2xs font-semibold uppercase tracking-wide text-impact-med">
      Corrected
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
