import type { RelevancePath } from "./types";

/**
 * The seam between anything that renders relevance chains and the
 * correlation dataset — same pattern as NewsProvider. The prototype ships a
 * MockCorrelationProvider; production swaps in a provider backed by the
 * maintained correlation dataset without touching a caller.
 */
export interface CorrelationProvider {
  /**
   * Shortest relevance chain from any `from` node to each reachable `to`
   * node — one path per reachable target, in `to` order. BFS over the graph,
   * max depth 3 edges; ties are broken deterministically by seed edge order,
   * so the same inputs always produce the same chains (trust rule 9 —
   * rankings and their reasons must be reproducible).
   */
  getPaths(from: string[], to: string[]): Promise<RelevancePath[]>;
}
