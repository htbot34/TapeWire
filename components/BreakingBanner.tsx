"use client";

import { useEffect, useRef, useState } from "react";
import { newsProvider } from "@/lib/news";
import type { NewsItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import { SENSITIVITY_IMPACTS, usePrefs } from "@/lib/store";
import { playBreakingTick } from "@/lib/audio";
import { exactTime, relativeTime, tzLabel } from "@/lib/time";
import { ReactionChip } from "./atoms";

/** How long an alert pins before settling back into the cycling state. */
const AUTO_SETTLE_MS = 45_000;

/**
 * Three states:
 *  - slim: a one-line ticker cycling the most recent Critical items —
 *    kept just loud enough that the top strip always reads as "the breaking
 *    zone" on a second monitor.
 *  - two-line alert (default): prominent but not screen-dominating —
 *    BREAKING · time · instruments on line one, the raw headline in big
 *    type on line two, on a deep red field with the sharp double-flash
 *    entrance. Dismissable; auto-settles after ~45s.
 *  - Focus Alert takeover (opt-in via settings): the full-size treatment
 *    with reaction chips for traders who want alerts to dominate.
 * The double-flash is the app's one deliberate moment of motion and is
 * disabled under prefers-reduced-motion (globals.css). Optional audio tick
 * (settings, off by default) applies in both alert modes.
 */
export default function BreakingBanner() {
  const breakingAudio = usePrefs((s) => s.breakingAudio);
  const focusAlertMode = usePrefs((s) => s.focusAlertMode);
  const alertSensitivity = usePrefs((s) => s.alertSensitivity);
  const [recentHigh, setRecentHigh] = useState<NewsItem[]>([]);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [breaking, setBreaking] = useState<NewsItem | null>(null);
  // Key forces the flash animation to replay if a second alert lands while
  // the alert is already showing.
  const [alertKey, setAlertKey] = useState(0);
  const [, forceTick] = useState(0);
  const dismissed = useRef<Set<string>>(new Set());
  const audioRef = useRef(breakingAudio);
  audioRef.current = breakingAudio;
  const sensitivityRef = useRef(alertSensitivity);
  sensitivityRef.current = alertSensitivity;

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
      // Alert sensitivity (onboarding/settings) actually gates the banner:
      // filtered items still land on the tape, they just don't take over.
      if (!SENSITIVITY_IMPACTS[sensitivityRef.current].includes(item.impact)) {
        load();
        return;
      }
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

  // Auto-settle: an alert that was never dismissed folds back into the
  // cycling state after ~45s — long enough to read, never a permanent squat.
  useEffect(() => {
    if (!breaking) return;
    const t = setTimeout(() => {
      dismissed.current.add(breaking.id);
      setBreaking(null);
    }, AUTO_SETTLE_MS);
    return () => clearTimeout(t);
  }, [breaking, alertKey]);

  const dismiss = (item: NewsItem) => {
    dismissed.current.add(item.id);
    setBreaking(null);
  };

  // ── Alert states ────────────────────────────────────────────────────────
  if (breaking && !dismissed.current.has(breaking.id)) {
    const instruments = [
      ...getDirectTickers(breaking),
      ...(breaking.pairs ?? []),
      ...getCorrelatedTickers(breaking),
    ].slice(0, 3);
    const meta = [
      `${exactTime(breaking.timestamp)} ${tzLabel()}`,
      instruments.join(" / "),
      breaking.source,
    ]
      .filter(Boolean)
      .join(" · ");

    if (!focusAlertMode) {
      // Default: readable two-line format — prominent, not screen-dominating.
      return (
        <div
          key={alertKey}
          className="breaking-takeover border-b-2 border-breaking-edge"
          role="alert"
        >
          <div className="breaking-edge-pulse h-1 w-full bg-breaking-edge" />
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-3 py-2.5 sm:px-4">
            <div className="min-w-0 flex-1">
              <div className="tnum flex flex-wrap items-baseline gap-x-2 font-mono text-xs font-semibold tracking-wide text-white/85">
                <span className="bg-breaking-edge px-1.5 py-px font-bold uppercase tracking-[0.25em] text-white">
                  Breaking
                </span>
                <span>{meta}</span>
              </div>
              <p className="mt-1 text-base font-bold leading-tight text-white sm:text-xl">
                {breaking.headline}
              </p>
            </div>
            <button
              onClick={() => dismiss(breaking)}
              className="shrink-0 p-1.5 font-mono text-base text-white/70 hover:text-white"
              aria-label="Dismiss breaking alert"
            >
              ✕
            </button>
          </div>
        </div>
      );
    }

    // Focus Alert mode: the full takeover for traders who opted in.
    return (
      <div
        key={alertKey}
        className="breaking-takeover border-b-2 border-breaking-edge"
        role="alert"
      >
        <div className="breaking-edge-pulse h-1 w-full bg-breaking-edge" />
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-3 py-6 sm:px-4 sm:py-8">
          <span className="mt-1 shrink-0 bg-breaking-edge px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.25em] text-white">
            Breaking
          </span>
          <div className="min-w-0 flex-1">
            <div className="tnum font-mono text-xs font-semibold tracking-wide text-white/85">
              {meta}
            </div>
            <p className="mt-1.5 text-xl font-bold leading-tight text-white sm:text-3xl">
              {breaking.headline}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {breaking.marketReaction?.map((r) => (
                <ReactionChip key={r.instrument} reaction={r} />
              ))}
            </div>
          </div>
          <button
            onClick={() => dismiss(breaking)}
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
          <span className="text-xs text-text-low">No Critical items</span>
        )}
      </div>
    </div>
  );
}
