"use client";

import { useEffect, useMemo, useState } from "react";
import type { Impact, NewsItem } from "@/lib/news/types";
import type { CalendarEvent } from "@/lib/calendar";
import { calendarEventToNewsItem, calendarProvider } from "@/lib/calendar";
import { usePrefs } from "@/lib/store";
import { sameLocalDay, shortTime, tzLabel } from "@/lib/time";
import { ImpactTag, TickerChip } from "./atoms";
import ExplainerPanel from "./ExplainerPanel";

const IMPACTS: { value: Impact; label: string; on: string }[] = [
  { value: "high", label: "Critical", on: "border-impact-high/60 text-impact-high" },
  { value: "medium", label: "Relevant", on: "border-impact-med/60 text-impact-med" },
  { value: "low", label: "Context", on: "border-impact-low/60 text-impact-low" },
];

function dayLabel(offset: number, d: Date): string {
  const name = d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  if (offset === 0) return `Today — ${name}`;
  if (offset === -1) return `Yesterday — ${name}`;
  if (offset === 1) return `Tomorrow — ${name}`;
  return name;
}

export default function CalendarView() {
  const { watchlist, assetClasses } = usePrefs();
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [myMarketsOnly, setMyMarketsOnly] = useState(false);
  const [explaining, setExplaining] = useState<NewsItem | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // One provider fetch spanning the mock's whole range; the day view and
  // up-next pointer slice it locally. A live provider would be re-queried
  // per visible day instead.
  useEffect(() => {
    const from = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const to = new Date(Date.now() + 4 * 86_400_000).toISOString();
    calendarProvider.getEvents(from, to).then(setEvents);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const viewDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [now, dayOffset]);

  const upNext = useMemo(
    () =>
      events?.find(
        (e) => e.impact === "high" && new Date(e.timestamp).getTime() > now,
      ) ?? null,
    [events, now],
  );

  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  const relevant = (e: CalendarEvent) =>
    e.tickers?.some((t) => watch.has(t.toUpperCase())) ||
    e.assetClasses.some((a) => assetClasses.includes(a));

  const dayEvents = (events ?? []).filter((e) => {
    if (!sameLocalDay(e.timestamp, viewDate)) return false;
    if (impacts.length && !impacts.includes(e.impact)) return false;
    if (myMarketsOnly && !relevant(e)) return false;
    return true;
  });

  const toggleImpact = (i: Impact) =>
    setImpacts((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i],
    );

  return (
    <>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-2xs uppercase tracking-[0.25em] text-phos">
              Econ calendar
            </div>
            <h1 className="mt-1 text-xl font-semibold text-text-hi">
              {dayLabel(dayOffset, viewDate)}
            </h1>
            <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
              All times {tzLabel()} · CRIT = Critical (red-folder) events
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDayOffset((o) => o - 1)}
              className="border border-ink-700 px-2.5 py-1 font-mono text-xs text-text-mid hover:border-phos hover:text-phos"
              aria-label="Previous day"
            >
              ‹
            </button>
            <button
              onClick={() => setDayOffset(0)}
              disabled={dayOffset === 0}
              className="border border-ink-700 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-text-mid hover:border-phos hover:text-phos disabled:opacity-40"
            >
              Today
            </button>
            <button
              onClick={() => setDayOffset((o) => o + 1)}
              className="border border-ink-700 px-2.5 py-1 font-mono text-xs text-text-mid hover:border-phos hover:text-phos"
              aria-label="Next day"
            >
              ›
            </button>
          </div>
        </header>

        {/* filters */}
        <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-ink-800 pb-2">
          <div className="flex items-center gap-1">
            {IMPACTS.map((i) => {
              const active = impacts.includes(i.value);
              return (
                <button
                  key={i.value}
                  onClick={() => toggleImpact(i.value)}
                  className={`rounded-sm border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wider ${
                    active ? i.on : "border-ink-700 text-text-low/60 hover:text-text-low"
                  }`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setMyMarketsOnly((v) => !v)}
            className={`rounded-sm border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider ${
              myMarketsOnly
                ? "border-phos/60 bg-phos-faint text-phos"
                : "border-ink-700 text-text-low hover:text-text-mid"
            }`}
            aria-pressed={myMarketsOnly}
          >
            My markets
          </button>
          {upNext && (
            <span className="tnum ml-auto font-mono text-2xs text-text-mid">
              Up next:{" "}
              <span className="font-semibold text-impact-high">{upNext.name}</span>{" "}
              · {shortTime(upNext.timestamp)}
              {!sameLocalDay(upNext.timestamp, viewDate) && " tomorrow"}
            </span>
          )}
        </div>

        {/* column headers */}
        <div className="flex items-baseline gap-2 border-b border-ink-800 px-3 py-1.5 font-mono text-2xs uppercase tracking-wider text-text-low sm:px-4">
          <span className="w-12 shrink-0">Time</span>
          <span className="w-[46px] shrink-0">Impact</span>
          <span className="w-11 shrink-0">Ccy</span>
          <span className="min-w-0 flex-1">Event</span>
          <span className="hidden w-20 shrink-0 text-right sm:inline">Actual</span>
          <span className="hidden w-20 shrink-0 text-right sm:inline">Forecast</span>
          <span className="hidden w-20 shrink-0 text-right md:inline">Previous</span>
          <span className="w-[60px] shrink-0" />
        </div>

        {events === null ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-6" />
            ))}
          </div>
        ) : dayEvents.length === 0 ? (
          <p className="mt-8 text-center text-sm text-text-mid">
            No events {impacts.length || myMarketsOnly ? "matching your filters " : ""}
            on this day{" "}
            <span className="text-text-low">(mock data covers ±1 day)</span>.
          </p>
        ) : (
          <ul>
            {dayEvents.map((e) => {
              const isUpNext = upNext?.id === e.id;
              const past = new Date(e.timestamp).getTime() <= now;
              return (
                <li
                  key={e.id}
                  className={`border-b border-ink-800/70 ${
                    isUpNext ? "border-l-2 border-l-impact-high bg-impact-high/5" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-2 px-3 py-[7px] hover:bg-ink-900 sm:px-4">
                    <span
                      className={`tnum w-12 shrink-0 font-mono text-2xs ${
                        past ? "text-text-low" : "text-text-hi"
                      }`}
                    >
                      {shortTime(e.timestamp)}
                    </span>
                    <span className="w-[46px] shrink-0">
                      <ImpactTag impact={e.impact} compact />
                    </span>
                    <span className="tnum w-11 shrink-0 font-mono text-2xs text-text-mid">
                      {e.currency}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`text-[13px] leading-snug ${
                          e.impact === "high"
                            ? "font-semibold text-text-hi"
                            : past
                              ? "text-text-mid"
                              : "text-text-hi/90"
                        }`}
                      >
                        {e.name}
                      </span>
                      {isUpNext && (
                        <span className="ml-2 rounded-sm bg-impact-high/20 px-1 font-mono text-2xs font-semibold uppercase text-impact-high">
                          Up next
                        </span>
                      )}
                      {e.tickers?.some((t) => watch.has(t.toUpperCase())) && (
                        <span className="ml-2 hidden gap-1 lg:inline-flex">
                          {e.tickers
                            .filter((t) => watch.has(t.toUpperCase()))
                            .slice(0, 2)
                            .map((t) => (
                              <TickerChip key={t} symbol={t} inWatchlist />
                            ))}
                        </span>
                      )}
                    </span>
                    <span className="tnum hidden w-20 shrink-0 text-right font-mono text-2xs font-medium text-text-hi sm:inline">
                      {e.actual ?? "—"}
                    </span>
                    <span className="tnum hidden w-20 shrink-0 text-right font-mono text-2xs text-text-mid sm:inline">
                      {e.forecast ?? "—"}
                    </span>
                    <span className="tnum hidden w-20 shrink-0 text-right font-mono text-2xs text-text-low md:inline">
                      {e.previous ?? "—"}
                    </span>
                    <span className="w-[60px] shrink-0 text-right">
                      <button
                        onClick={() => setExplaining(calendarEventToNewsItem(e))}
                        className="rounded-sm border border-ink-700 px-1.5 font-mono text-2xs uppercase tracking-wide text-text-low hover:border-phos hover:text-phos"
                        title="Intelligence about this event — definition, history, AI context"
                        aria-label={`Explain: ${e.name}`}
                      >
                        Explain
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {explaining && (
        <ExplainerPanel item={explaining} onClose={() => setExplaining(null)} />
      )}
    </>
  );
}
