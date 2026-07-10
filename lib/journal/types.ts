import type { MarketReaction, NewsItem } from "@/lib/news/types";

// Data contracts for the trade journal. Mirrors the news layer's pattern:
// UI consumes these types plus the JournalProvider interface only.

export interface JournalFolder {
  id: string;
  name: string;
  /** Default folders ship with the app (CPI, FOMC…); custom are user-created. */
  kind: "default" | "custom";
}

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
   * marketReaction but user-editable, e.g. { instrument: "NQ", move: "+200 pts" }.
   */
  reactions: MarketReaction[];
  /** Free-text notes ("came in hotter than forecast, NQ pumped 200 into the open"). */
  notes: string;
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
