import type { MarketReaction, NewsItem } from "@/lib/news/types";

// Data contracts for the trade journal. Mirrors the news layer's pattern:
// UI consumes these types plus the JournalProvider interface only.

export interface JournalFolder {
  id: string;
  name: string;
  /** Default folders ship with the app (CPI, FOMC…); custom are user-created. */
  kind: "default" | "custom";
}

/** What the trader did on the event. Optional — "observed only" is valid. */
export interface JournalTrade {
  instrument: string;
  direction: "long" | "short";
  note?: string;
}

/** Did the recorded move hold, fade, or a bit of both. */
export type JournalOutcome = "held" | "faded" | "mixed";

export const OUTCOME_LABEL: Record<JournalOutcome, string> = {
  held: "Held",
  faded: "Faded",
  mixed: "Mixed",
};

/** Default tag chips offered in the save sheet; free tags are always allowed. */
export const SUGGESTED_TAGS = [
  "CPI",
  "FOMC",
  "NFP",
  "earnings",
  "geopolitics",
  "company news",
] as const;

export interface JournalEntry {
  id: string;
  folderId: string;
  /** When the entry was saved (ISO). */
  createdAt: string;
  /**
   * Denormalized snapshot of the news item at save time, so entries survive
   * independently of the feed's mock data (and, in production, of feed
   * retention windows).
   */
  item: NewsItem;
  /**
   * The market reaction the trader recorded — pre-filled from the item's
   * marketReaction but user-editable, e.g. { instrument: "NQ", move: "+200 pts", interval: "5m" }.
   */
  reactions: MarketReaction[];
  /** Free-text notes ("came in hotter than forecast, NQ pumped 200 into the open"). */
  notes: string;
  /** What the trader did — optional, observed-only entries are first-class. */
  trade?: JournalTrade;
  /** Whether the recorded move held or faded (often set after the fact). */
  outcome?: JournalOutcome;
  /** Free tags plus suggested defaults (CPI, FOMC, earnings…). */
  tags: string[];
  /**
   * Keys into the historical event provider (e.g. "us-cpi"), auto-suggested
   * from the item's event type at save time — links this entry to all past
   * occurrences of the same event.
   */
  relatedHistorical?: string[];
}

/** Everything needed to create an entry; id/createdAt are assigned by the provider. */
export type NewJournalEntry = Omit<JournalEntry, "id" | "createdAt">;

/** The folders every journal starts with, in display order. */
export const DEFAULT_FOLDER_NAMES = [
  "CPI",
  "NFP",
  "FOMC",
  "Earnings",
  "Fed Speak",
  "Geopolitical",
  "Tweets",
  "Other",
] as const;

export function folderIdForName(name: string): string {
  return `jf-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/**
 * Suggests the default folder for a news item — headline keywords first
 * (CPI/NFP/FOMC are all eventType "econ-release"), then event type.
 */
export function suggestFolderName(item: NewsItem): (typeof DEFAULT_FOLDER_NAMES)[number] {
  const h = item.headline.toUpperCase();
  if (/\bCPI\b/.test(h)) return "CPI";
  if (/\bNFP\b|NONFARM|PAYROLLS/.test(h)) return "NFP";
  if (/\bFOMC\b/.test(h)) return "FOMC";
  switch (item.eventType) {
    case "earnings":
      return "Earnings";
    case "fed-speak":
      return "Fed Speak";
    case "geopolitical":
      return "Geopolitical";
    case "tweet":
      return "Tweets";
    default:
      return "Other";
  }
}
