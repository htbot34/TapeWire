import type { NewsProvider } from "./provider";
import { MockNewsProvider } from "./mockProvider";

// The single provider instance the UI talks to. Swapping mock → live means
// changing this one assignment (e.g. to `new LiveNewsProvider(...)`).
const mockProvider = new MockNewsProvider();

export const newsProvider: NewsProvider = mockProvider;

/** Dev/demo-only hook for the "simulate breaking news" button. Mock-only. */
export function simulateBreakingNews() {
  return mockProvider.simulateBreakingNews();
}

export type { NewsProvider } from "./provider";
export type * from "./types";
// Display-side helper for the compressed pillar-1 card line — deterministic,
// same inputs as the provider's rationale computation.
export { compressedInstruments } from "./rationale";
