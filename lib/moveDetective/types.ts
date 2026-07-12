import type { NewsItem } from "@/lib/news/types";

// Move Detective — the future flagship: when the market moves, what caused
// it? PREVIEW-ONLY in this prototype: every analysis is hand-written mock
// keyed to specific mock events. Doctrine rule (see TRUST.md /
// ARCHITECTURE.md): proximity in time is NEVER sufficient to claim
// causation — hence the five-label taxonomy with honest negatives.

export type CatalystLabel =
  | "Confirmed catalyst"
  | "Likely catalyst"
  | "Possible contributor"
  | "No verified news catalyst"
  | "Technical/positioning move suspected";

export const CATALYST_LABELS: CatalystLabel[] = [
  "Confirmed catalyst",
  "Likely catalyst",
  "Possible contributor",
  "No verified news catalyst",
  "Technical/positioning move suspected",
];

export interface MoveAnalysis {
  label: CatalystLabel;
  /** 0–100. Omitted for the honest-negative labels — no false precision. */
  confidence?: number;
  /** The detected move being explained, with its measurement window. */
  move: { instrument: string; move: string; interval: string };
  /** Hand-written narrative (mock). Production: catalyst-ranking engine output. */
  narrative: string;
}

export interface MoveDetectiveProvider {
  /**
   * Static preview analysis for a mock event, or null — most items have
   * none, and the UI renders nothing rather than inventing an analysis.
   */
  getAnalysis(item: NewsItem): Promise<MoveAnalysis | null>;
}
