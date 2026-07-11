import type { JournalEntry, JournalFolder, NewJournalEntry } from "./types";

/**
 * The seam between the journal UI and any journal backend — same pattern as
 * NewsProvider. The prototype ships a LocalStorageJournalProvider; a real
 * product swaps in an API-backed provider without touching a component.
 */
export interface JournalProvider {
  /** All folders, defaults first, in creation order. */
  listFolders(): Promise<JournalFolder[]>;

  /** Creates (or returns an existing) custom folder by name. */
  createFolder(name: string): Promise<JournalFolder>;

  /** Entries, newest first. Scoped to one folder when folderId is given. */
  listEntries(folderId?: string): Promise<JournalEntry[]>;

  /** Saves a new entry; returns it with id/createdAt assigned. */
  saveEntry(input: NewJournalEntry): Promise<JournalEntry>;

  /** Patches user-editable fields on an entry. Returns null when missing. */
  updateEntry(
    id: string,
    patch: Partial<
      Pick<
        JournalEntry,
        "notes" | "reactions" | "folderId" | "trade" | "outcome" | "tags"
      >
    >,
  ): Promise<JournalEntry | null>;

  deleteEntry(id: string): Promise<void>;

  /** News-item ids that have at least one entry — powers the row checkmark. */
  getJournaledNewsIds(): Promise<Set<string>>;

  /** Change notifications so open views stay in sync. Returns unsubscribe. */
  subscribe(cb: () => void): () => void;
}
