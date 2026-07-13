import type { NewsItem } from "./types";

// The deterministic banner-takeover rule, in one place (stated verbatim in
// TRUST.md). Conservative by design — the bar is zero false alarms AND zero
// misses: a takeover requires Critical impact AND either a red-folder
// scheduled release or a recorded market reaction above the thresholds
// below. Relevant/Context items never take over (they still land on the
// tape and, sensitivity permitting, the compact alert). The False alarm /
// Useful feedback captured on the banner (lib/feedback, surface "banner")
// is the dataset that will eventually tune these thresholds.

/** Instruments treated as indices for TAKEOVER_INDEX_MOVE_PCT. */
export const TAKEOVER_INDEX_INSTRUMENTS = new Set([
  "ES",
  "NQ",
  "YM",
  "RTY",
  "SPX",
  "NDX",
  "SPY",
  "QQQ",
  "DIA",
  "IWM",
]);

/** Recorded index move (absolute %) at or above this qualifies. */
export const TAKEOVER_INDEX_MOVE_PCT = 0.5;

/** Recorded rates move (absolute bp, any instrument) at or above this qualifies. */
export const TAKEOVER_RATES_MOVE_BP = 5;

/** Recorded FX move (absolute %, pairs or DXY) at or above this qualifies. */
export const TAKEOVER_FX_MOVE_PCT = 0.75;

/**
 * The exact rule: Critical impact AND (red-folder scheduled release OR a
 * recorded market reaction ≥ the named thresholds). Pure function of item
 * data — no model, no heuristics, reproducible.
 */
export function qualifiesForTakeover(item: NewsItem): boolean {
  if (item.impact !== "high") return false; // Relevant/Context never take over
  if (item.scheduled && item.eventType === "econ-release") return true; // red folder
  return (item.marketReaction ?? []).some((r) => {
    const bpMatch = r.move.match(/-?\d+(?:\.\d+)?(?=\s*bp)/i);
    if (bpMatch && Math.abs(parseFloat(bpMatch[0])) >= TAKEOVER_RATES_MOVE_BP) {
      return true;
    }
    const pctMatch = r.move.match(/-?\d+(?:\.\d+)?(?=\s*%)/);
    if (!pctMatch) return false;
    const pct = Math.abs(parseFloat(pctMatch[0]));
    const inst = r.instrument.toUpperCase();
    if (TAKEOVER_INDEX_INSTRUMENTS.has(inst) && pct >= TAKEOVER_INDEX_MOVE_PCT) {
      return true;
    }
    if ((inst === "DXY" || inst.includes("/")) && pct >= TAKEOVER_FX_MOVE_PCT) {
      return true;
    }
    return false;
  });
}
