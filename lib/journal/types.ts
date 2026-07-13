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

/**
 * What the move DID over time — the trader-feedback taxonomy that replaces
 * the v3 held/faded/mixed outcome. Duration-behavior, not direction: the
 * advisor thinks in "manipulated 30 points then reversed 140" terms.
 */
export type MoveBehavior =
  | "spike-reversal" // moved on the drop, reversed within minutes
  | "reversal-return" // reversed for ~30m+, then returned to the level later in the day
  | "sustained" // move continued through the session
  | "day-bias" // set the directional bias for the whole day (NFP-style)
  | "no-lasting-effect"
  | "unclear";

export const BEHAVIOR_LABEL: Record<MoveBehavior, string> = {
  "spike-reversal": "Spike & reversal",
  "reversal-return": "Reversal, then return",
  sustained: "Sustained",
  "day-bias": "Set the day's bias",
  "no-lasting-effect": "No lasting effect",
  unclear: "Unclear",
};

/** Compact mono tags for dense table rows. */
export const BEHAVIOR_TAG: Record<MoveBehavior, string> = {
  "spike-reversal": "SPIKE-REV",
  "reversal-return": "REV-RETURN",
  sustained: "SUSTAINED",
  "day-bias": "DAY BIAS",
  "no-lasting-effect": "NO EFFECT",
  unclear: "UNCLEAR",
};

/** Plain-language descriptions shown next to the options in the save sheet. */
export const BEHAVIOR_DESCRIPTION: Record<MoveBehavior, string> = {
  "spike-reversal": "moved on the drop, reversed within minutes",
  "reversal-return": "reversed for ~30m+, then returned to the level later in the day",
  sustained: "move continued through the session",
  "day-bias": "set the directional bias for the whole day (NFP-style)",
  "no-lasting-effect": "no meaningful follow-through either way",
  unclear: "hard to call — chopped or overlapped with other drivers",
};

export const MOVE_BEHAVIORS: MoveBehavior[] = [
  "spike-reversal",
  "reversal-return",
  "sustained",
  "day-bias",
  "no-lasting-effect",
  "unclear",
];

/**
 * v3 → v4 migration of persisted entries (no data loss): the binary outcome
 * maps onto the closest behavior.
 */
export const LEGACY_OUTCOME_TO_BEHAVIOR: Record<string, MoveBehavior> = {
  held: "sustained",
  faded: "spike-reversal",
  mixed: "unclear",
};

/** One attached chart screenshot, downscaled client-side at attach time. */
export interface JournalScreenshot {
  dataUrl: string;
  addedAt: string; // ISO
  caption?: string;
}

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
  /** What the move did over time (often set after the fact). */
  behavior?: MoveBehavior;
  /** How long the effect lasted — free interval like "5m", "30m", "all day". */
  effectDuration?: string;
  /** Points the move ran on the drop — the advisor's unit ("moved 30 pts"). */
  initialMovePoints?: number;
  /** Points it then reversed ("…then reversed 140"). */
  reversalPoints?: number;
  /**
   * Attached chart screenshots (≤3, downscaled to ≤1280px / JPEG ~0.8).
   * Stored as data URLs through the local provider — a prototype constraint;
   * production moves these to object storage (see localProvider.ts).
   */
  screenshots?: JournalScreenshot[];
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
