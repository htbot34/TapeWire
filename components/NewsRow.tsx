"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { dateTimeStamp, relativeTime } from "@/lib/time";
import { IMPACT_LABEL, ImpactTag, ReactionChip, SourceTag, TickerChip } from "./atoms";
import JournalButton from "./JournalButton";

/**
 * One dense, scannable tape row. Tap anywhere to expand inline (accordion,
 * no navigation); the "?" affordance opens the AI explainer; the → saves
 * the item to the journal.
 */
export default function NewsRow({
  item,
  onExplain,
  now,
}: {
  item: NewsItem;
  onExplain: (item: NewsItem) => void;
  now: number;
}) {
  const watchlist = usePrefs((s) => s.watchlist);
  const [expanded, setExpanded] = useState(false);
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  const inWatchlist = (s: string) => watch.has(s.toUpperCase());
  const byWatchlist = (a: string, b: string) =>
    Number(inWatchlist(b)) - Number(inWatchlist(a));
  // Watchlist symbols sort first so "this touches MY symbols" survives the +N cut.
  const direct = [...getDirectTickers(item), ...(item.pairs ?? [])].sort(byWatchlist);
  const correlated = [...getCorrelatedTickers(item)].sort(byWatchlist);
  // Dense row: direct chips lead (strong), correlated fill remaining slots (muted).
  const rowDirect = direct.slice(0, 3);
  const rowCorrelated = correlated.slice(0, Math.max(0, 4 - rowDirect.length));
  const overflow = direct.length + correlated.length - rowDirect.length - rowCorrelated.length;

  return (
    <li className="border-b border-ink-800/70">
      <div
        className="group flex cursor-pointer items-baseline gap-2 px-3 py-[7px] hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="w-[46px] shrink-0">
          <ImpactTag impact={item.impact} compact />
        </span>
        <span className="tnum w-9 shrink-0 font-mono text-2xs text-text-low">
          {relativeTime(item.timestamp, now)}
        </span>
        <span className="tnum w-[92px] shrink-0 font-mono text-2xs text-text-low">
          {dateTimeStamp(item.timestamp)}
        </span>
        <span className="hidden w-20 overflow-hidden sm:inline-block">
          <SourceTag source={item.source} sourceType={item.sourceType} />
        </span>
        <span
          className={`min-w-0 flex-1 text-[13px] leading-snug ${
            item.impact === "high"
              ? "font-semibold text-text-hi"
              : item.impact === "medium"
                ? "font-medium text-text-hi/90"
                : "text-text-mid"
          }`}
        >
          {item.headline}
        </span>
        <span className="hidden shrink-0 items-center gap-1 md:flex">
          {rowDirect.map((s) => (
            <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} />
          ))}
          {rowCorrelated.map((s) => (
            <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} variant="correlated" />
          ))}
          {overflow > 0 && (
            <span className="font-mono text-2xs text-text-low">+{overflow}</span>
          )}
        </span>
        <JournalButton item={item} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplain(item);
          }}
          className="shrink-0 rounded-sm border border-ink-700 px-1.5 font-mono text-2xs uppercase tracking-wide text-text-low opacity-70 hover:border-phos hover:text-phos group-hover:opacity-100"
          title="Intelligence about this event — definition, history, AI context"
          aria-label={`Explain: ${item.headline}`}
        >
          Explain
        </button>
      </div>

      {expanded && (
        <div className="border-l-2 border-ink-700 bg-ink-900/60 px-4 pb-3 pt-2 sm:ml-4 sm:px-5">
          <div className="tnum font-mono text-2xs text-text-low">
            {dateTimeStamp(item.timestamp)} · {item.source} · {item.eventType} ·{" "}
            {IMPACT_LABEL[item.impact]}
          </div>
          {item.body && (
            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-text-mid">
              {item.body}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.marketReaction?.map((r) => (
              <ReactionChip key={r.instrument} reaction={r} />
            ))}
            {direct.map((s) => (
              <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} />
            ))}
            {correlated.length > 0 && (
              <span className="ml-1 flex items-center gap-1">
                <span className="font-mono text-2xs text-text-low">via correlation</span>
                {correlated.map((s) => (
                  <TickerChip
                    key={s}
                    symbol={s}
                    inWatchlist={inWatchlist(s)}
                    variant="correlated"
                  />
                ))}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-mono text-2xs text-phos/80 underline decoration-phos/30 hover:text-phos"
                title={item.url}
              >
                View source →
              </a>
            )}
            <button
              onClick={() => onExplain(item)}
              className="font-mono text-2xs uppercase tracking-wide text-text-low hover:text-phos"
            >
              Explain
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
