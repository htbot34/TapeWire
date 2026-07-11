"use client";

import { useEffect, useState } from "react";
import { newsProvider } from "@/lib/news";
import type { NewsItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { briefingDate, dateTimeStamp, relativeTime } from "@/lib/time";
import { ImpactTag, ReactionChip, SourceTag, TickerChip } from "./atoms";
import ExplainerPanel from "./ExplainerPanel";
import JournalButton from "./JournalButton";

function useWatchlistCheck() {
  const watchlist = usePrefs((s) => s.watchlist);
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  return (s: string) => watch.has(s.toUpperCase());
}

function firstSentence(text?: string): string | null {
  if (!text) return null;
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

function TopItem({
  item,
  rank,
  onExplain,
}: {
  item: NewsItem;
  rank: number;
  onExplain: (i: NewsItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inWatchlist = useWatchlistCheck();
  const byWatchlist = (a: string, b: string) =>
    Number(inWatchlist(b)) - Number(inWatchlist(a));
  const direct = [...getDirectTickers(item), ...(item.pairs ?? [])].sort(byWatchlist);
  const correlated = [...getCorrelatedTickers(item)].sort(byWatchlist);

  return (
    <li className="border border-ink-800 bg-ink-900/60">
      <div
        className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="tnum w-6 shrink-0 pt-0.5 text-right font-mono text-lg font-bold text-text-low">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <ImpactTag impact={item.impact} />
            <span className="tnum font-mono text-2xs text-text-low">
              {relativeTime(item.timestamp)} · {dateTimeStamp(item.timestamp)}
            </span>
            <SourceTag source={item.source} sourceType={item.sourceType} />
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-text-hi">
            {item.headline}
          </p>
          {firstSentence(item.body) && (
            <p className="mt-1 text-xs leading-relaxed text-text-mid">
              {firstSentence(item.body)}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.marketReaction?.map((r) => (
              <ReactionChip key={r.instrument} reaction={r} />
            ))}
            {direct.slice(0, 4).map((s) => (
              <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} />
            ))}
            {correlated.slice(0, 3).map((s) => (
              <TickerChip key={s} symbol={s} inWatchlist={inWatchlist(s)} variant="correlated" />
            ))}
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <JournalButton item={item} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain(item);
            }}
            className="shrink-0 rounded-sm border border-ink-700 px-1.5 font-mono text-2xs uppercase tracking-wide text-text-low hover:border-phos hover:text-phos"
            title="Intelligence about this event — definition, history, AI context"
            aria-label={`Explain: ${item.headline}`}
          >
            Explain
          </button>
        </span>
      </div>

      {expanded && (
        <div className="border-t border-ink-800 px-4 pb-3 pt-2 sm:px-5">
          <div className="tnum font-mono text-2xs text-text-low">
            {dateTimeStamp(item.timestamp)} · {item.eventType}
          </div>
          {item.body && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-mid">
              {item.body}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block font-mono text-2xs text-phos/80 underline decoration-phos/30 hover:text-phos"
            >
              View source →
            </a>
          )}
        </div>
      )}
    </li>
  );
}

function CompactItem({
  item,
  onExplain,
}: {
  item: NewsItem;
  onExplain: (i: NewsItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="border-b border-ink-800/70">
      <div
        className="flex cursor-pointer items-baseline gap-2 px-3 py-[7px] hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <span className="w-[46px] shrink-0">
          <ImpactTag impact={item.impact} compact />
        </span>
        <span className="tnum w-9 shrink-0 font-mono text-2xs text-text-low">
          {relativeTime(item.timestamp)}
        </span>
        <span className="tnum w-[92px] shrink-0 font-mono text-2xs text-text-low">
          {dateTimeStamp(item.timestamp)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-text-mid">
          {item.headline}
        </span>
        <JournalButton item={item} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplain(item);
          }}
          className="shrink-0 rounded-sm border border-ink-700 px-1.5 font-mono text-2xs uppercase tracking-wide text-text-low hover:border-phos hover:text-phos"
          title="Intelligence about this event — definition, history, AI context"
          aria-label={`Explain: ${item.headline}`}
        >
          Explain
        </button>
      </div>
      {expanded && (
        <div className="border-l-2 border-ink-700 bg-ink-900/60 px-4 pb-3 pt-2 sm:ml-4">
          {item.body && (
            <p className="max-w-3xl text-[13px] leading-relaxed text-text-mid">
              {item.body}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.marketReaction?.map((r) => (
              <ReactionChip key={r.instrument} reaction={r} />
            ))}
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block font-mono text-2xs text-phos/80 underline decoration-phos/30 hover:text-phos"
            >
              View source →
            </a>
          )}
        </div>
      )}
    </li>
  );
}

export default function BriefingView() {
  const { watchlist, assetClasses } = usePrefs();
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [explaining, setExplaining] = useState<NewsItem | null>(null);

  useEffect(() => {
    newsProvider
      .getOvernightBriefing({ watchlist, assetClasses, watchlistOnly: true })
      .then(setItems);
  }, [watchlist, assetClasses]);

  const highCount = items?.filter((i) => i.impact === "high").length ?? 0;
  const quietNight = items !== null && items.length > 0 && highCount === 0;
  // No cap: everything overnight shows, ranked high → low. Top 4 get the
  // prominent treatment, the rest list compact below.
  const top = items?.slice(0, 4) ?? [];
  const rest = items?.slice(4) ?? [];

  return (
    <>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <header>
          <div className="font-mono text-2xs uppercase tracking-[0.25em] text-phos">
            Morning briefing
          </div>
          <h1 className="mt-1 text-xl font-semibold text-text-hi">
            While you were out
          </h1>
          <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
            {briefingDate()} ·{" "}
            {quietNight ? (
              <span className="font-semibold text-impact-med">
                Quiet overnight — no Critical events
              </span>
            ) : (
              <>
                {highCount} Critical event{highCount === 1 ? "" : "s"} overnight
              </>
            )}{" "}
            · ranked for your watchlist
          </p>
          {quietNight && (
            <p className="mt-1 text-xs text-text-mid">
              The items below are the most notable of a slow session — Relevant
              and Context only, nothing at red-folder level.
            </p>
          )}
        </header>

        {items === null ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-text-mid">
            Quiet night — nothing ranked for your watchlist. Try widening your
            symbols in settings.
          </p>
        ) : (
          <>
            <ol className="mt-4 space-y-2">
              {top.map((item, i) => (
                <TopItem
                  key={item.id}
                  item={item}
                  rank={i + 1}
                  onExplain={setExplaining}
                />
              ))}
            </ol>

            {rest.length > 0 && (
              <>
                <h2 className="mt-6 border-b border-ink-800 pb-1 font-mono text-2xs uppercase tracking-[0.25em] text-text-low">
                  Also overnight
                </h2>
                <ul>
                  {rest.map((item) => (
                    <CompactItem key={item.id} item={item} onExplain={setExplaining} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>

      {explaining && (
        <ExplainerPanel item={explaining} onClose={() => setExplaining(null)} />
      )}
    </>
  );
}
