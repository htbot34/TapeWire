import type { JournalProvider } from "./provider";
import { LocalStorageJournalProvider } from "./localProvider";

// The single journal instance the UI talks to. Swapping localStorage → real
// backend is one assignment here, mirroring lib/news/index.ts.
export const journalProvider: JournalProvider = new LocalStorageJournalProvider();

export type { JournalProvider } from "./provider";
export type * from "./types";
export { DEFAULT_FOLDER_NAMES, folderIdForName, suggestFolderName } from "./types";
export { folderSummary } from "./summary";
