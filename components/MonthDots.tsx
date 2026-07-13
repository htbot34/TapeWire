"use client";

import { useEffect, useMemo, useState } from "react";
import { calendarProvider, calendarEventToNewsItem } from "@/lib/calendar";
import type { JournalEntry } from "@/lib/journal";
import { suggestFolderName } from "@/lib/journal";
import { shortTime } from "@/lib/time";

interface DayMark {
  /** e.g. "CPI · 8:30" — the accessible text behind each dot. */
  labels: string[];
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthTitle(d: Date): string {
  return d.toLocaleDateString([], { month: "long", year: "numeric" });
}

/**
 * Month calendar with red occurrence dots for one Replay folder — when did
 * this event hit, at a glance, with prev/next month cycling. Dots come from
 * the user's own entry timestamps plus the calendar provider's scheduled
 * occurrences; each dot carries an accessible title/text (impact color is
 * never the only signal). The day-list CalendarView elsewhere is unrelated.
 */
export default function MonthDots({
  folderName,
  entries,
}: {
  folderName: string;
  entries: JournalEntry[];
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [scheduled, setScheduled] = useState<Map<number, string[]>>(new Map());

  const monthStart = month;
  const monthEnd = useMemo(
    () => new Date(month.getFullYear(), month.getMonth() + 1, 1),
    [month],
  );

  // Scheduled occurrences of this folder's event inside the shown month —
  // matched through the same folder-suggestion mapping the save sheet uses.
  useEffect(() => {
    let alive = true;
    calendarProvider
      .getEvents(monthStart.toISOString(), monthEnd.toISOString())
      .then((events) => {
        if (!alive) return;
        const next = new Map<number, string[]>();
        for (const e of events) {
          if (suggestFolderName(calendarEventToNewsItem(e)) !== folderName) continue;
          const day = new Date(e.timestamp).getDate();
          const label = `${e.name} · ${shortTime(e.timestamp)}`;
          next.set(day, [...(next.get(day) ?? []), label]);
        }
        setScheduled(next);
      });
    return () => {
      alive = false;
    };
  }, [folderName, monthStart, monthEnd]);

  const marks = useMemo(() => {
    const map = new Map<number, DayMark>();
    const add = (day: number, label: string) => {
      const cur = map.get(day) ?? { labels: [] };
      if (!cur.labels.includes(label)) cur.labels.push(label);
      map.set(day, cur);
    };
    for (const e of entries) {
      const t = new Date(e.item.timestamp);
      if (t < monthStart || t >= monthEnd) continue;
      add(t.getDate(), `${folderName} · ${shortTime(e.item.timestamp)}`);
    }
    for (const [day, labels] of Array.from(scheduled.entries())) {
      for (const label of labels) add(day, label);
    }
    return map;
  }, [entries, scheduled, folderName, monthStart, monthEnd]);

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = month.getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <div className="mt-6 border border-ink-800 bg-ink-900/60 p-3">
      <div className="flex items-center justify-between">
        <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
          When {folderName} hits
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="px-1.5 font-mono text-xs text-text-low hover:text-text-hi"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="tnum w-32 text-center font-mono text-xs text-text-hi">
            {monthTitle(month)}
          </span>
          <button
            onClick={() => shift(1)}
            className="px-1.5 font-mono text-xs text-text-low hover:text-text-hi"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-px text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={`${d}-${i}`} className="py-1 font-mono text-2xs text-text-low">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const mark = day !== null ? marks.get(day) : undefined;
          return (
            <div
              key={i}
              className={`flex h-9 flex-col items-center justify-center border border-ink-800/40 ${
                day === null ? "bg-transparent" : "bg-ink-950/40"
              }`}
              title={mark ? mark.labels.join("\n") : undefined}
            >
              {day !== null && (
                <>
                  <span
                    className={`tnum font-mono text-2xs ${
                      mark ? "font-semibold text-text-hi" : "text-text-low"
                    }`}
                  >
                    {day}
                  </span>
                  {mark && (
                    <span
                      className="mt-0.5 inline-block h-[6px] w-[6px] rounded-full bg-impact-high"
                      role="img"
                      aria-label={mark.labels.join("; ")}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-2xs text-text-low">
        Red dots: days this event occurred — from your entries plus the
        calendar&apos;s scheduled occurrences. Hover a dot for the event and
        time.
      </p>
    </div>
  );
}
