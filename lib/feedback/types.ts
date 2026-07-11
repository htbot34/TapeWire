// Data contracts for row-level relevance feedback — the training input for
// the production ranking engine (see ARCHITECTURE.md). Mirrors the journal
// pattern: UI consumes these types plus the FeedbackProvider interface only.

export type FeedbackKind =
  | "useful"
  | "not-relevant"
  | "wrong-asset"
  | "wrong-catalyst";

export const FEEDBACK_KINDS: FeedbackKind[] = [
  "useful",
  "not-relevant",
  "wrong-asset",
  "wrong-catalyst",
];

export const FEEDBACK_LABEL: Record<FeedbackKind, string> = {
  useful: "Useful",
  "not-relevant": "Not relevant",
  "wrong-asset": "Wrong asset mapping",
  "wrong-catalyst": "Wrong catalyst",
};

export interface FeedbackRecord {
  /** News item id the feedback applies to. */
  itemId: string;
  /** Headline snapshot — context for the eventual ranking-engine training set. */
  headline: string;
  kind: FeedbackKind;
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
  setFeedback(itemId: string, headline: string, kind: FeedbackKind): Promise<void>;
  clearFeedback(itemId: string): Promise<void>;
  clearAll(): Promise<void>;
  /** Change notifications so open views stay in sync. Returns unsubscribe. */
  subscribe(cb: () => void): () => void;
}
