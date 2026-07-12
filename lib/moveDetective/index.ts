import type { MoveDetectiveProvider } from "./types";
import { MockMoveDetectiveProvider } from "./mockProvider";

// The single Move Detective instance the UI talks to. Production swaps in a
// provider backed by real-time price/volume anomaly detection + a
// catalyst-ranking engine (see ARCHITECTURE.md) — one assignment here.
export const moveDetectiveProvider: MoveDetectiveProvider =
  new MockMoveDetectiveProvider();

export type * from "./types";
export { CATALYST_LABELS } from "./types";
