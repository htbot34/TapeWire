import type { HistoricalEventProvider } from "./types";
import { MockHistoricalEventProvider } from "./mockProvider";

// The single historical-events instance. Swapping mock → real database is
// one assignment here, mirroring lib/news/index.ts. The same store powers
// the explainer tables, journal folder summaries, and (future) accuracy
// measurement — see ARCHITECTURE.md.
export const historicalEventProvider: HistoricalEventProvider =
  new MockHistoricalEventProvider();

export type * from "./types";
export { historyKeyFor } from "./mockProvider";
