"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { dateTimeStamp, relativeTime } from "@/lib/time";
import { ImpactDot, ReactionChip, SourceTag, TickerChip } from "./atoms";

/**
 * One dense, scannable tape row. Tap anywhere to expand inline (accordion,
 * no navigation); the "?" affordance opens the AI explainer.
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
  // Watchlist symbols sort first so "this touches MY symbols" survives the +N cut.
  const symbols = [...item.tickers, ...(item.pairs ?? [])].sort(
    (a, b) => Number(inWatchlist(b)) - Number(inWatchlist(a)),
  );

  return (
    <li className="border-b border-ink-800/70">
      <div
        className="group flex cursor-pointer items-baseline gap-2 px-3 py-[7px] hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="translate-y-[-1px]">
          <ImpactDot impact={item.impact} />
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
          {symbols.slice(0, 3).map((s) => (
            <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} />
          ))}
          {symbols.length > 3 && (
            <span className="font-mono text-2xs text-text-low">
              +{symbols.length - 3}
            </span>
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplain(item);
          }}
          className="shrink-0 rounded-sm border border-ink-700 px-1.5 font-mono text-2xs text-text-low opacity-70 hover:border-phos hover:text-phos group-hover:opacity-100"
          title="What does this mean? (AI)"
          aria-label={`Explain: ${item.headline}`}
        >
          ?
        </button>
      </div>

      {expanded && (
        <div className="border-l-2 border-ink-700 bg-ink-900/60 px-4 pb-3 pt-2 sm:ml-4 sm:px-5">
          <div className="tnum font-mono text-2xs text-text-low">
            {dateTimeStamp(item.timestamp)} · {item.source} · {item.eventType}
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
            {symbols.map((s) => (
              <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} />
            ))}
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
              className="font-mono text-2xs text-text-low hover:text-phos"
            >
              ? explain
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
