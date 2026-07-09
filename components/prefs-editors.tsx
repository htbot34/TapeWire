"use client";

import { useRef, useState } from "react";
import type { AssetClass } from "@/lib/news/types";
import { POPULAR_SYMBOLS, searchSymbols } from "@/lib/symbols";
import { usePrefs } from "@/lib/store";

// Shared preference editors used by both onboarding and settings.

const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "equities", label: "Stocks" },
  { value: "options", label: "Options" },
  { value: "futures", label: "Futures" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
];

export function AssetClassPicker() {
  const { assetClasses, toggleAssetClass } = usePrefs();
  return (
    <div className="flex flex-wrap gap-2">
      {ASSET_CLASSES.map((a) => {
        const active = assetClasses.includes(a.value);
        return (
          <button
            key={a.value}
            onClick={() => toggleAssetClass(a.value)}
            className={`rounded-sm border px-3 py-1.5 text-sm ${
              active
                ? "border-phos/60 bg-phos-faint text-phos"
                : "border-ink-700 text-text-mid hover:border-ink-800 hover:text-text-hi"
            }`}
            aria-pressed={active}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

export function WatchlistEditor() {
  const { watchlist, addSymbol, removeSymbol } = usePrefs();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchSymbols(query);

  const pick = (symbol: string) => {
    addSymbol(symbol);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) {
              e.preventDefault();
              pick(results[0].symbol);
            }
          }}
          placeholder="Search tickers or pairs — NVDA, EUR/USD…"
          className="w-full border border-ink-700 bg-ink-950 px-3 py-2 font-mono text-sm text-text-hi placeholder:font-sans placeholder:text-text-low focus:border-phos focus:outline-none"
          aria-label="Search symbols"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full border border-ink-700 bg-ink-900 shadow-xl">
            {results.map((r) => (
              <li key={r.symbol}>
                <button
                  onClick={() => pick(r.symbol)}
                  className="flex w-full items-baseline gap-3 px-3 py-1.5 text-left hover:bg-ink-850"
                >
                  <span className="tnum w-20 font-mono text-sm text-text-hi">
                    {r.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-text-mid">
                    {r.name}
                  </span>
                  <span className="font-mono text-2xs uppercase text-text-low">
                    {r.kind}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {watchlist.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {watchlist.map((s) => (
            <span
              key={s}
              className="tnum inline-flex items-center gap-1.5 rounded-sm border border-phos/40 bg-phos-faint px-2 py-1 font-mono text-xs text-phos"
            >
              {s}
              <button
                onClick={() => removeSymbol(s)}
                className="text-phos/60 hover:text-phos"
                aria-label={`Remove ${s}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <div className="font-mono text-2xs uppercase tracking-widest text-text-low">
          Popular
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {POPULAR_SYMBOLS.filter((s) => !watchlist.includes(s)).map((s) => (
            <button
              key={s}
              onClick={() => addSymbol(s)}
              className="tnum rounded-sm border border-ink-700 px-2 py-1 font-mono text-xs text-text-mid hover:border-phos/50 hover:text-phos"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SourcesEditor() {
  const { sources, toggleSource, addCustomSource, removeSource } = usePrefs();
  const [custom, setCustom] = useState("");

  return (
    <div>
      <ul className="space-y-1.5">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5">
            <label className="flex flex-1 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={() => toggleSource(s.id)}
                className="h-3.5 w-3.5 accent-[#4fb8a6]"
              />
              <span className="text-sm text-text-hi">{s.name}</span>
              {s.kind === "custom" && (
                <span className="font-mono text-2xs uppercase text-impact-med">
                  custom
                </span>
              )}
            </label>
            {s.kind === "custom" && (
              <button
                onClick={() => removeSource(s.id)}
                className="font-mono text-2xs text-text-low hover:text-impact-high"
                aria-label={`Remove ${s.name}`}
              >
                remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addCustomSource(custom);
          setCustom("");
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add source — URL or @handle"
          className="min-w-0 flex-1 border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
          aria-label="Add custom source"
        />
        <button
          type="submit"
          className="shrink-0 border border-ink-700 px-3 py-2 text-sm text-text-mid hover:border-phos hover:text-phos"
        >
          Add
        </button>
      </form>
      <p className="mt-1.5 text-2xs text-text-low">
        Prototype stores custom sources; real ingestion is future work.
      </p>
    </div>
  );
}
