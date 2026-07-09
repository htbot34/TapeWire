"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { newsProvider } from "@/lib/news";
import type { NewsItem } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import FilterBar, { type FeedFilterState } from "./FilterBar";
import NewsRow from "./NewsRow";
import ExplainerPanel from "./ExplainerPanel";

const INITIAL_FILTERS: FeedFilterState = {
  watchlistOnly: true,
  impacts: [],
  eventType: "all",
  symbols: [],
};

export default function FeedView() {
  const { watchlist, assetClasses } = usePrefs();
  const [filters, setFilters] = useState<FeedFilterState>(INITIAL_FILTERS);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [explaining, setExplaining] = useState<NewsItem | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(() => {
    newsProvider
      .getFeed({
        watchlist,
        assetClasses,
        watchlistOnly: filters.watchlistOnly,
        impacts: filters.impacts.length ? filters.impacts : undefined,
        eventTypes: filters.eventType === "all" ? undefined : [filters.eventType],
        symbols: filters.symbols.length ? filters.symbols : undefined,
      })
      .then(setItems);
  }, [watchlist, assetClasses, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Breaking items land on the tape immediately; relative times refresh on a
  // 30s cadence (stands in for the real provider's feed polling).
  useEffect(() => {
    const unsub = newsProvider.subscribeToBreaking(() => load());
    const tick = setInterval(() => {
      setNow(Date.now());
      load();
    }, 30_000);
    return () => {
      unsub();
      clearInterval(tick);
    };
  }, [load]);

  return (
    <>
      <FilterBar filters={filters} watchlist={watchlist} onChange={setFilters} />

      <main className="mx-auto max-w-6xl">
        {items === null ? (
          <div className="space-y-2 px-4 py-6" aria-label="Loading feed">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-4" style={{ width: `${90 - i * 4}%` }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <div className="font-mono text-2xs uppercase tracking-[0.25em] text-text-low">
              No news matching your filters
            </div>
            <p className="mt-2 max-w-sm text-sm text-text-mid">
              Widen the impact/event filters, switch to{" "}
              <button
                className="text-phos underline decoration-phos/30"
                onClick={() => setFilters(INITIAL_FILTERS)}
              >
                defaults
              </button>
              , or{" "}
              <Link href="/settings" className="text-phos underline decoration-phos/30">
                add symbols
              </Link>{" "}
              to your watchlist.
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item) => (
              <NewsRow key={item.id} item={item} onExplain={setExplaining} now={now} />
            ))}
          </ul>
        )}
      </main>

      {explaining && (
        <ExplainerPanel item={explaining} onClose={() => setExplaining(null)} />
      )}
    </>
  );
}
