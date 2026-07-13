"use client";

import { useEffect, useState } from "react";
import { compressedInstruments, newsProvider } from "@/lib/news";
import type { NewsItem, RankRationale, RankedBriefingItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { briefingDate, dateTimeStamp, relativeTime } from "@/lib/time";
import {
  EconValues,
  ImpactTag,
  ReactionChip,
  ScheduledTag,
  SourceTag,
  TickerChip,
  WatchlistImpactTag,
} from "./atoms";
import ExplainerPanel from "./ExplainerPanel";
import FeedbackControl from "./FeedbackControl";
import JournalButton from "./JournalButton";
import MoveDetectiveBlock from "./MoveDetectiveBlock";

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

/**
 * The three-pillar rationale, fully labeled — expanded view only. All text
 * is deterministic provider output (item data + prefs + correlation graph),
 * never AI.
 */
function RationalePillars({ rationale }: { rationale: RankRationale }) {
  const pillars: { label: string; text: string }[] = [
    { label: "Your instruments", text: rationale.instruments },
    { label: "Market impact", text: rationale.impact },
    { label: "Why now", text: rationale.whyNow },
  ];
  return (
    <div className="mt-2 border border-ink-800 bg-ink-950/40 px-3 py-2">
      <dl className="space-y-1">
        {pillars.map((p) => (
          <div key={p.label} className="flex gap-2">
            <dt className="w-[118px] shrink-0 font-mono text-2xs uppercase tracking-wide text-text-low">
              {p.label}
            </dt>
            <dd className="min-w-0 flex-1 text-2xs leading-relaxed text-text-mid">
              {p.text}
            </dd>
          </div>
        ))}
      </dl>
      {rationale.relevancePaths.map((p) => (
        <p key={p.display} className="tnum mt-1 font-mono text-2xs text-text-low">
          Relevant through: <span className="text-text-mid">{p.display}</span>
        </p>
      ))}
    </div>
  );
}

function TopItem({
  ranked,
  rank,
  onExplain,
}: {
  ranked: RankedBriefingItem;
  rank: number;
  onExplain: (i: NewsItem, rationale?: RankRationale) => void;
}) {
  const item = ranked.item;
  const [expanded, setExpanded] = useState(false);
  const watchlist = usePrefs((s) => s.watchlist);
  const inWatchlist = useWatchlistCheck();
  const byWatchlist = (a: string, b: string) =>
    Number(inWatchlist(b)) - Number(inWatchlist(a));
  const direct = [...getDirectTickers(item), ...(item.pairs ?? [])].sort(byWatchlist);
  const correlated = [...getCorrelatedTickers(item)].sort(byWatchlist);
  const rationale = ranked.rationale;

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
          <div className="flex flex-wrap items-baseline gap-2">
            <ImpactTag impact={item.impact} />
            <ScheduledTag scheduled={item.scheduled} />
            <span className="tnum font-mono text-2xs text-text-low">
              {relativeTime(item.timestamp)} · {dateTimeStamp(item.timestamp)}
            </span>
            <SourceTag source={item.source} sourceType={item.sourceType} />
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-text-hi">
            {item.headline}
          </p>
          {item.econ && (
            <div className="mt-0.5">
              <EconValues econ={item.econ} />
            </div>
          )}
          {rationale && (
            <p className="mt-1 text-2xs leading-relaxed">
              <span className="text-text-mid">
                #{rank} for you: {compressedInstruments(item, watchlist, rationale)}
              </span>
              <span className="text-text-low"> · </span>
              <WatchlistImpactTag impact={rationale.watchlistImpact} />
            </p>
          )}
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
          <FeedbackControl item={item} />
          <JournalButton item={item} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain(item, rationale);
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
          {rationale && <RationalePillars rationale={rationale} />}
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
          <MoveDetectiveBlock item={item} />
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
        <FeedbackControl item={item} />
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
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <ScheduledTag scheduled={item.scheduled} />
            {item.econ && <EconValues econ={item.econ} />}
          </div>
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
  const { watchlist, assetClasses, tradingSession } = usePrefs();
  const [ranked, setRanked] = useState<RankedBriefingItem[] | null>(null);
  const [explaining, setExplaining] = useState<{
    item: NewsItem;
    rationale?: RankRationale;
  } | null>(null);

  useEffect(() => {
    newsProvider
      .getOvernightBriefing({
        watchlist,
        assetClasses,
        tradingSession,
        watchlistOnly: true,
      })
      .then(setRanked);
  }, [watchlist, assetClasses, tradingSession]);

  const highCount = ranked?.filter((r) => r.item.impact === "high").length ?? 0;
  const quietNight = ranked !== null && ranked.length > 0 && highCount === 0;
  // Dynamic Focus count: everything above the provider's rank threshold
  // (3–7 on a typical night), never padded to a fixed number. Everything
  // else stays in "Also overnight" with no cap.
  const top = ranked?.filter((r) => r.focus) ?? [];
  const rest = ranked?.filter((r) => !r.focus).map((r) => r.item) ?? [];

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

        {ranked === null ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <p className="mt-8 text-sm text-text-mid">
            Quiet night — nothing ranked for your watchlist. Try widening your
            symbols in settings, or save events to your Journal from the tape
            so quiet nights still build your event history.
          </p>
        ) : (
          <>
            {top.length > 0 && (
              <h2 className="mt-5 border-b border-ink-800 pb-1 font-mono text-2xs uppercase tracking-[0.25em] text-phos">
                Your Focus — ranked for your market
              </h2>
            )}
            <ol className="mt-3 space-y-2">
              {top.map((r, i) => (
                <TopItem
                  key={r.item.id}
                  ranked={r}
                  rank={i + 1}
                  onExplain={(item, rationale) => setExplaining({ item, rationale })}
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
                    <CompactItem
                      key={item.id}
                      item={item}
                      onExplain={(i) => setExplaining({ item: i })}
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </main>

      {explaining && (
        <ExplainerPanel
          item={explaining.item}
          rationale={explaining.rationale}
          onClose={() => setExplaining(null)}
        />
      )}
    </>
  );
}
