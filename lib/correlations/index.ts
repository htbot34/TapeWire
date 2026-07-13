import type { CorrelationProvider } from "./provider";
import { MockCorrelationProvider } from "./mockProvider";

// The single correlation-graph instance. Swapping mock → the maintained
// production dataset is one assignment here, mirroring lib/news/index.ts.
export const correlationProvider: CorrelationProvider = new MockCorrelationProvider();

export type { CorrelationProvider } from "./provider";
export type * from "./types";
