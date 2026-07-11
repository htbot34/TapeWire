import type { JournalProvider } from "./provider";
import { LocalStorageJournalProvider } from "./localProvider";

// The single journal instance the UI talks to. Swapping localStorage → real
// backend is one assignment here, mirroring lib/news/index.ts.
export const journalProvider: JournalProvider = new LocalStorageJournalProvider();

export type { JournalProvider } from "./provider";
export type * from "./types";
export {
  DEFAULT_FOLDER_NAMES,
  OUTCOME_LABEL,
  SUGGESTED_TAGS,
  folderIdForName,
  suggestFolderName,
} from "./types";
export { folderStats, folderSummary } from "./summary";
export type { FolderStats } from "./summary";
