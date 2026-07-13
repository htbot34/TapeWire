import type { JournalProvider } from "./provider";
import { LocalStorageJournalProvider } from "./localProvider";

// The single journal instance the UI talks to. Swapping localStorage → real
// backend is one assignment here, mirroring lib/news/index.ts.
export const journalProvider: JournalProvider = new LocalStorageJournalProvider();

export type { JournalProvider } from "./provider";
export { JournalStorageFullError } from "./localProvider";
export type * from "./types";
export {
  BEHAVIOR_DESCRIPTION,
  BEHAVIOR_LABEL,
  BEHAVIOR_TAG,
  DEFAULT_FOLDER_NAMES,
  MOVE_BEHAVIORS,
  SUGGESTED_TAGS,
  folderIdForName,
  suggestFolderName,
} from "./types";
export { behaviorSentence, folderStats, folderSummary, pointsSentence } from "./summary";
export type { FolderStats } from "./summary";
