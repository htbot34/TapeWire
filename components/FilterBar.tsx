"use client";

import type { EventType, Impact } from "@/lib/news/types";

export interface FeedFilterState {
  watchlistOnly: boolean;
  impacts: Impact[];
  eventType: EventType | "all";
  symbols: string[];
}

const EVENT_TYPES: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "econ-release", label: "Econ releases" },
  { value: "earnings", label: "Earnings" },
  { value: "fed-speak", label: "Fed / CB speak" },
  { value: "geopolitical", label: "Geopolitical" },
  { value: "company-news", label: "Company news" },
  { value: "tweet", label: "Tweets" },
  { value: "analyst", label: "Analyst" },
  { value: "other", label: "Other" },
];

const IMPACTS: { value: Impact; label: string; on: string }[] = [
  { value: "high", label: "High", on: "border-impact-high/60 text-impact-high" },
  { value: "medium", label: "Med", on: "border-impact-med/60 text-impact-med" },
  { value: "low", label: "Low", on: "border-text-low/60 text-text-mid" },
];

export default function FilterBar({
  filters,
  watchlist,
  onChange,
}: {
  filters: FeedFilterState;
  watchlist: string[];
  onChange: (next: FeedFilterState) => void;
}) {
  const toggleImpact = (i: Impact) => {
    const has = filters.impacts.includes(i);
    const next = has
      ? filters.impacts.filter((x) => x !== i)
      : [...filters.impacts, i];
    onChange({ ...filters, impacts: next });
  };

  const toggleSymbol = (s: string) => {
    const has = filters.symbols.includes(s);
    onChange({
      ...filters,
      symbols: has ? filters.symbols.filter((x) => x !== s) : [...filters.symbols, s],
    });
  };

  return (
    <div className="border-b border-ink-800 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
        {/* Watchlist / All toggle */}
        <div className="flex overflow-hidden rounded-sm border border-ink-700 font-mono text-2xs uppercase tracking-wider">
          <button
            onClick={() => onChange({ ...filters, watchlistOnly: true })}
            className={`px-2 py-1 ${
              filters.watchlistOnly
                ? "bg-phos-faint text-phos"
                : "text-text-low hover:text-text-mid"
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => onChange({ ...filters, watchlistOnly: false })}
            className={`border-l border-ink-700 px-2 py-1 ${
              !filters.watchlistOnly
                ? "bg-phos-faint text-phos"
                : "text-text-low hover:text-text-mid"
            }`}
          >
            All news
          </button>
        </div>

        {/* Impact chips */}
        <div className="flex items-center gap-1">
          {IMPACTS.map((i) => {
            const active = filters.impacts.includes(i.value);
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

        {/* Event type */}
        <select
          value={filters.eventType}
          onChange={(e) =>
            onChange({ ...filters, eventType: e.target.value as EventType | "all" })
          }
          className="rounded-sm border border-ink-700 bg-ink-950 px-1.5 py-1 font-mono text-2xs text-text-mid focus:border-phos focus:outline-none"
          aria-label="Filter by event type"
        >
          {EVENT_TYPES.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>

        {/* Watchlist symbol chips */}
        {watchlist.length > 0 && (
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {watchlist.map((s) => {
              const active = filters.symbols.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSymbol(s)}
                  className={`tnum shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-2xs ${
                    active
                      ? "border-phos/60 bg-phos-faint text-phos"
                      : "border-ink-700 text-text-low hover:text-text-mid"
                  }`}
                >
                  {s}
                </button>
              );
            })}
            {filters.symbols.length > 0 && (
              <button
                onClick={() => onChange({ ...filters, symbols: [] })}
                className="shrink-0 px-1 font-mono text-2xs text-text-low hover:text-text-mid"
              >
                clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
