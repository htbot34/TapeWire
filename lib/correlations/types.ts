// Data contracts for the correlation graph — the maintained dataset behind
// "why is this indirectly relevant to what I trade" chains. Same pattern as
// every other data domain: UI consumes these types plus the
// CorrelationProvider interface only, never the mock data.
//
// PRODUCTION NOTE: this graph is a maintained dataset (curated symbology +
// sector/macro relationships, reviewed like the historical events database).
// It is NEVER AI-generated at request time — every chain shown to a user
// must be traceable data, because a fabricated correlation is a fabricated
// reason to trade.

/** How one node relates to another. Read as `from` --kind--> `to`. */
export type CorrelationKind =
  | "member-of" // NVDA --member-of--> semiconductors
  | "weights" // semiconductors --weights--> NQ (index/ETF weighting)
  | "macro-driver" // CPI --macro-driver--> rates
  | "inverse" // DXY --inverse--> gold
  | "proxy"; // USO --proxy--> crude

export interface CorrelationEdge {
  from: string; // "NVDA" or a group id like "semiconductors"
  to: string;
  kind: CorrelationKind;
  label?: string; // plain-language node label for rendering
}

/** One relevance chain from a source node to a target node. */
export interface RelevancePath {
  nodes: string[]; // ["NVDA", "semiconductors", "NQ"]
  display: string; // "NVDA → semiconductors → NQ"
}
