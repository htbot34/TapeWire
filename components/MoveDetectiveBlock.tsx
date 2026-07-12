"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { formatMove } from "@/lib/news/types";
import type { CatalystLabel, MoveAnalysis } from "@/lib/moveDetective";
import { moveDetectiveProvider } from "@/lib/moveDetective";

function labelColor(label: CatalystLabel): string {
  switch (label) {
    case "Confirmed catalyst":
      return "text-pos border-pos/40";
    case "Likely catalyst":
      return "text-phos border-phos/40";
    case "Possible contributor":
      return "text-impact-med border-impact-med/40";
    default:
      // The honest negatives — deliberately quiet.
      return "text-text-mid border-ink-700";
  }
}

/**
 * PREVIEW teaser of the future flagship: "the market moved — what caused
 * it?". All content is hand-written mock from MoveDetectiveProvider, keyed
 * to specific mock events, and badged as simulated. Doctrine: proximity in
 * time is never sufficient to claim causation — the five-label taxonomy
 * includes honest negatives, and most items render no block at all.
 */
export default function MoveDetectiveBlock({ item }: { item: NewsItem }) {
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);

  useEffect(() => {
    let alive = true;
    moveDetectiveProvider.getAnalysis(item).then((a) => {
      if (alive) setAnalysis(a);
    });
    return () => {
      alive = false;
    };
  }, [item]);

  if (!analysis) return null;

  const negative = analysis.move.move.trim().startsWith("-");

  return (
    <div className="mt-3 border border-ink-700 bg-ink-950/60 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-2xs font-bold uppercase tracking-[0.2em] text-text-hi">
          Move Detective
        </span>
        <span
          className={`rounded-sm border px-1.5 py-px font-mono text-2xs font-semibold ${labelColor(analysis.label)}`}
        >
          {analysis.label}
          {analysis.confidence !== undefined && ` · ${analysis.confidence}% confidence`}
        </span>
        <span
          className="ml-auto rounded-sm border border-impact-med/40 px-1.5 py-px font-mono text-2xs uppercase tracking-wide text-impact-med"
          title="Move Detective is a concept preview — this analysis is hand-written mock content, not a live engine"
        >
          Preview — simulated analysis
        </span>
      </div>
      <div className="tnum mt-1.5 font-mono text-2xs">
        <span className="text-text-low">{analysis.move.instrument}&nbsp;</span>
        <span className={negative ? "text-neg" : "text-pos"}>
          {formatMove(analysis.move)}
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-mid">
        {analysis.narrative}
      </p>
    </div>
  );
}
