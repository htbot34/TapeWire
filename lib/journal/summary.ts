import type { JournalEntry } from "./types";

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
