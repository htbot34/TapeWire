"use client";

import { useEffect, useRef, useState } from "react";
import { newsProvider } from "@/lib/news";
import type { NewsItem } from "@/lib/news/types";
import { relativeTime } from "@/lib/time";
import { ReactionChip } from "./atoms";

/**
 * Two states:
 *  - slim: a quiet one-line ticker cycling the most recent high-impact items.
 *  - takeover: when subscribeToBreaking fires, the bar flashes like a squawk
 *    light and pins the raw headline + timestamp + market-reaction chips
 *    until dismissed.
 */
export default function BreakingBanner() {
  const [recentHigh, setRecentHigh] = useState<NewsItem[]>([]);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [breaking, setBreaking] = useState<NewsItem | null>(null);
  // Key forces the flash animation to replay if a second alert lands while
  // the takeover is already showing.
  const [alertKey, setAlertKey] = useState(0);
  const [, forceTick] = useState(0);
  const dismissed = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const load = () =>
      newsProvider
        .getFeed({
          watchlist: [],
          assetClasses: [],
          watchlistOnly: false,
          impacts: ["high"],
        })
        .then((items) => {
          if (alive) setRecentHigh(items.slice(0, 6));
        });
    load();

    const unsub = newsProvider.subscribeToBreaking((item) => {
      setBreaking(item);
      setAlertKey((k) => k + 1);
      load();
    });

    const cycle = setInterval(() => setCycleIdx((i) => i + 1), 7000);
    const tick = setInterval(() => forceTick((n) => n + 1), 30_000); // refresh rel-times
    return () => {
      alive = false;
      unsub();
      clearInterval(cycle);
      clearInterval(tick);
    };
  }, []);

  // ── Takeover state ──────────────────────────────────────────────────────
  if (breaking && !dismissed.current.has(breaking.id)) {
    return (
      <div
        key={alertKey}
        className="breaking-takeover border-b border-breaking-edge/60"
        role="alert"
      >
        <div className="breaking-edge-pulse h-[3px] w-full bg-breaking-edge" />
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-3 py-2.5 sm:px-4">
          <span className="mt-0.5 shrink-0 bg-breaking-edge px-1.5 py-0.5 font-mono text-2xs font-bold uppercase tracking-[0.2em] text-white">
            Breaking
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-text-hi sm:text-[15px]">
              {breaking.headline}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="tnum font-mono text-2xs text-text-mid">
                {relativeTime(breaking.timestamp)} · {breaking.source}
              </span>
              {breaking.marketReaction?.map((r) => (
                <ReactionChip key={r.instrument} reaction={r} />
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              dismissed.current.add(breaking.id);
              setBreaking(null);
            }}
            className="shrink-0 p-1 font-mono text-sm text-text-mid hover:text-text-hi"
            aria-label="Dismiss breaking alert"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // ── Slim ticker state ───────────────────────────────────────────────────
  const current = recentHigh.length
    ? recentHigh[cycleIdx % recentHigh.length]
    : null;

  return (
    <div className="border-b border-ink-800 bg-ink-900">
      <div className="mx-auto flex h-7 max-w-6xl items-center gap-2 overflow-hidden px-3 sm:px-4">
        <span className="shrink-0 font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-impact-high/80">
          Wire
        </span>
        {current ? (
          <>
            <span className="tnum shrink-0 font-mono text-2xs text-text-low">
              {relativeTime(current.timestamp)}
            </span>
            <span className="truncate text-xs text-text-mid">
              {current.headline}
            </span>
          </>
        ) : (
          <span className="text-xs text-text-low">No high-impact items</span>
        )}
      </div>
    </div>
  );
}
