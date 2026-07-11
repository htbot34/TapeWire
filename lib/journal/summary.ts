import type { JournalEntry } from "./types";

const pctOfMove = (move: string): number | null => {
  const m = move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
  return m ? parseFloat(m[0]) : null;
};

export interface FolderStats {
  entryCount: number;
  /** Per-instrument average absolute % move, most-recorded instruments first. */
  avgMoves: { instrument: string; avgAbsPct: number; count: number }[];
  /** Outcome split over entries where the trader recorded one. */
  outcomes: { held: number; faded: number; mixed: number; recorded: number };
  /** Largest recorded absolute % move across all entries, with its date. */
  biggest: { instrument: string; move: string; interval: string; date: string } | null;
}

/**
 * The Replay stats header — computed strictly from what the user recorded,
 * never from data they didn't enter. Returns null under 3 entries (the UI
 * shows "record more entries to unlock stats" instead of thin math).
 */
export function folderStats(entries: JournalEntry[]): FolderStats | null {
  if (entries.length < 3) return null;

  // Average |move| per instrument, % recordings only (bp/pts are skipped —
  // averaging mixed units would be invented math).
  const byInstrument = new Map<string, number[]>();
  let biggest: FolderStats["biggest"] = null;
  let biggestAbs = -1;
  for (const e of entries) {
    for (const r of e.reactions) {
      const pct = pctOfMove(r.move);
      if (pct === null) continue;
      if (!byInstrument.has(r.instrument)) byInstrument.set(r.instrument, []);
      byInstrument.get(r.instrument)!.push(pct);
      if (Math.abs(pct) > biggestAbs) {
        biggestAbs = Math.abs(pct);
        biggest = {
          instrument: r.instrument,
          move: r.move,
          interval: r.interval,
          date: e.item.timestamp,
        };
      }
    }
  }
  const avgMoves = Array.from(byInstrument.entries())
    .map(([instrument, pcts]) => ({
      instrument,
      avgAbsPct: pcts.reduce((s, p) => s + Math.abs(p), 0) / pcts.length,
      count: pcts.length,
    }))
    .sort((a, b) => b.count - a.count || b.avgAbsPct - a.avgAbsPct)
    .slice(0, 3);

  const outcomes = { held: 0, faded: 0, mixed: 0, recorded: 0 };
  for (const e of entries) {
    if (e.outcome) {
      outcomes[e.outcome] += 1;
      outcomes.recorded += 1;
    }
  }

  return { entryCount: entries.length, avgMoves, outcomes, biggest };
}

/**
 * Per-folder mini-summary derived strictly from what the user recorded —
 * counts and averages of their own reaction entries, nothing invented.
 * Example: "Last 5 entries: 4 moved NQ ≥ 1% · avg |NQ| 1.4%".
 */
export function folderSummary(entries: JournalEntry[]): string | null {
  if (entries.length === 0) return null;
  const recent = entries.slice(0, 5); // entries arrive newest-first

  // The folder's most-recorded instrument across recent entries.
  const freq = new Map<string, number>();
  for (const e of recent) {
    for (const r of e.reactions) {
      freq.set(r.instrument, (freq.get(r.instrument) ?? 0) + 1);
    }
  }
  if (freq.size === 0) return null;
  const inst = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0];

  const pctOf = (move: string): number | null => {
    const m = move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
    return m ? parseFloat(m[0]) : null;
  };
  const withInst = recent.filter((e) =>
    e.reactions.some((r) => r.instrument === inst),
  );
  const pcts = withInst
    .map((e) => pctOf(e.reactions.find((r) => r.instrument === inst)!.move))
    .filter((p): p is number => p !== null);

  if (pcts.length === 0) {
    // Non-% recordings (bp, pts) — just report the count, no invented math.
    return `${withInst.length} of last ${recent.length} entries recorded a ${inst} reaction`;
  }
  const big = pcts.filter((p) => Math.abs(p) >= 1).length;
  const avg = pcts.reduce((s, p) => s + Math.abs(p), 0) / pcts.length;
  return `Last ${recent.length} entries: ${big} moved ${inst} ≥ 1% · avg |${inst}| ${avg.toFixed(1)}%`;
}
