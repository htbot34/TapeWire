import type { JournalEntry, MoveBehavior } from "./types";

const pctOfMove = (move: string): number | null => {
  const m = move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
  return m ? parseFloat(m[0]) : null;
};

export interface FolderStats {
  entryCount: number;
  /** Per-instrument average absolute % move, most-recorded instruments first. */
  avgMoves: { instrument: string; avgAbsPct: number; count: number }[];
  /** Behavior counts over entries where the trader recorded one. */
  behaviors: { counts: Partial<Record<MoveBehavior, number>>; recorded: number };
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

  const behaviors: FolderStats["behaviors"] = { counts: {}, recorded: 0 };
  for (const e of entries) {
    if (e.behavior) {
      behaviors.counts[e.behavior] = (behaviors.counts[e.behavior] ?? 0) + 1;
      behaviors.recorded += 1;
    }
  }

  return { entryCount: entries.length, avgMoves, behaviors, biggest };
}

/**
 * The plain-English points sentence — the advisor's language ("manipulated
 * 30 points then reversed 140"), computed strictly from user-recorded
 * `initialMovePoints`/`reversalPoints`. Null under 3 recorded entries; the
 * folder header then falls back to the % stats block.
 */
export function pointsSentence(entries: JournalEntry[]): string | null {
  const withPoints = entries.filter((e) => typeof e.initialMovePoints === "number");
  if (withPoints.length < 3) return null;
  const avgInitial =
    withPoints.reduce((s, e) => s + Math.abs(e.initialMovePoints!), 0) /
    withPoints.length;
  const withReversal = withPoints.filter(
    (e) => typeof e.reversalPoints === "number",
  );
  const avgReversal = withReversal.length
    ? withReversal.reduce((s, e) => s + Math.abs(e.reversalPoints!), 0) /
      withReversal.length
    : null;
  const base = `On the drop this event moves ~${Math.round(avgInitial)} pts on average`;
  const reversal =
    avgReversal !== null ? `, then reverses ~${Math.round(avgReversal)} pts` : "";
  return `${base}${reversal} (based on ${withPoints.length} recorded events).`;
}

/** "set the day's bias" phrasing per behavior, for the distribution sentence. */
const BEHAVIOR_PHRASE: Record<MoveBehavior, string> = {
  "spike-reversal": "spiked and reversed within minutes",
  "reversal-return": "reversed then returned to the level",
  sustained: "sustained through the session",
  "day-bias": "set the day's bias",
  "no-lasting-effect": "had no lasting effect",
  unclear: "were unclear",
};

/**
 * "4 of 6 set the day's bias." — the most-recorded behavior across the
 * folder, user-recorded data only. Null when fewer than 2 entries carry one.
 */
export function behaviorSentence(entries: JournalEntry[]): string | null {
  const counts = new Map<MoveBehavior, number>();
  let recorded = 0;
  for (const e of entries) {
    if (!e.behavior) continue;
    counts.set(e.behavior, (counts.get(e.behavior) ?? 0) + 1);
    recorded += 1;
  }
  if (recorded < 2) return null;
  const [top, n] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return `${n} of ${recorded} ${BEHAVIOR_PHRASE[top]}.`;
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
