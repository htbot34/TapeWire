"use client";

import { useEffect, useRef, useState } from "react";
import { newsProvider } from "@/lib/news";
import type { NewsItem } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { playBreakingTick } from "@/lib/audio";
import { dateTimeStamp, relativeTime } from "@/lib/time";
import { ReactionChip } from "./atoms";

/**
 * Two states:
 *  - slim: a one-line ticker cycling the most recent high-impact items —
 *    kept just loud enough that the top strip always reads as "the breaking
 *    zone" on a second monitor.
 *  - takeover: when subscribeToBreaking fires, the bar flashes hard like a
 *    squawk light (two pulses, then steady on a deep red field) and pins the
 *    raw headline + timestamp + market-reaction chips until dismissed.
 *    Optional audio tick (settings, off by default).
 */
export default function BreakingBanner() {
  const breakingAudio = usePrefs((s) => s.breakingAudio);
  const [recentHigh, setRecentHigh] = useState<NewsItem[]>([]);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [breaking, setBreaking] = useState<NewsItem | null>(null);
  // Key forces the flash animation to replay if a second alert lands while
  // the takeover is already showing.
  const [alertKey, setAlertKey] = useState(0);
  const [, forceTick] = useState(0);
  const dismissed = useRef<Set<string>>(new Set());
  const audioRef = useRef(breakingAudio);
  audioRef.current = breakingAudio;

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
      if (audioRef.current) playBreakingTick();
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
        className="breaking-takeover border-b-2 border-breaking-edge"
        role="alert"
      >
        <div className="breaking-edge-pulse h-1 w-full bg-breaking-edge" />
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-3 py-4 sm:px-4 sm:py-5">
          <span className="mt-1 shrink-0 bg-breaking-edge px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white">
            Breaking
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight text-white sm:text-2xl">
              {breaking.headline}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="tnum font-mono text-xs font-medium text-white/80">
                {relativeTime(breaking.timestamp)} ·{" "}
                {dateTimeStamp(breaking.timestamp)} · {breaking.source}
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
            className="shrink-0 p-1.5 font-mono text-base text-white/70 hover:text-white"
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
    <div className="border-b border-impact-high/25 bg-ink-900">
      <div className="mx-auto flex h-7 max-w-6xl items-center gap-2 overflow-hidden px-3 sm:px-4">
        <span className="shrink-0 font-mono text-2xs font-bold uppercase tracking-[0.2em] text-impact-high">
          Wire
        </span>
        {current ? (
          <>
            <span className="tnum shrink-0 font-mono text-2xs text-text-low">
              {relativeTime(current.timestamp)}
            </span>
            <span className="truncate text-xs text-text-hi/90">
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
