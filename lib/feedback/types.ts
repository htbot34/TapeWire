// Data contracts for row-level relevance feedback — the training input for
// the production ranking engine (see ARCHITECTURE.md). Mirrors the journal
// pattern: UI consumes these types plus the FeedbackProvider interface only.

export type FeedbackKind =
  | "useful"
  | "not-relevant"
  | "wrong-asset"
  | "wrong-catalyst"
  | "false-alarm";

/** Kinds offered by the per-row ⋯ control (false-alarm is banner-only). */
export const FEEDBACK_KINDS: FeedbackKind[] = [
  "useful",
  "not-relevant",
  "wrong-asset",
  "wrong-catalyst",
];

/** Every kind, for aggregate views (Settings → Your feedback). */
export const ALL_FEEDBACK_KINDS: FeedbackKind[] = [...FEEDBACK_KINDS, "false-alarm"];

export const FEEDBACK_LABEL: Record<FeedbackKind, string> = {
  useful: "Useful",
  "not-relevant": "Not relevant",
  "wrong-asset": "Wrong asset mapping",
  "wrong-catalyst": "Wrong catalyst",
  "false-alarm": "False alarm",
};

/** Where the judgment was given — banner feedback tunes the takeover rule. */
export type FeedbackSurface = "row" | "banner";

export interface FeedbackRecord {
  /** News item id the feedback applies to. */
  itemId: string;
  /** Headline snapshot — context for the eventual ranking-engine training set. */
  headline: string;
  kind: FeedbackKind;
  /**
   * Which surface captured it. "banner" records (False alarm / Useful on the
   * takeover) are the data that will eventually tune the deterministic
   * takeover thresholds in lib/news/takeover.ts. Absent on legacy records —
   * treat as "row".
   */
  surface?: FeedbackSurface;
  /** When the feedback was given (ISO). */
  at: string;
}

/**
 * One judgment per item (re-selecting replaces it, selecting the same kind
 * again clears it). Nothing consumes this data yet — it is deliberately
 * write-only in the prototype.
 */
export interface FeedbackProvider {
  getAll(): Promise<FeedbackRecord[]>;
  getForItem(itemId: string): Promise<FeedbackKind | null>;
  setFeedback(
    itemId: string,
    headline: string,
    kind: FeedbackKind,
    surface?: FeedbackSurface,
  ): Promise<void>;
  clearFeedback(itemId: string): Promise<void>;
  clearAll(): Promise<void>;
  /** Change notifications so open views stay in sync. Returns unsubscribe. */
  subscribe(cb: () => void): () => void;
}
