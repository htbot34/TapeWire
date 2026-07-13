import type { JournalProvider } from "./provider";
import type { JournalEntry, JournalFolder, NewJournalEntry } from "./types";
import {
  DEFAULT_FOLDER_NAMES,
  LEGACY_OUTCOME_TO_BEHAVIOR,
  folderIdForName,
} from "./types";
import { seedEntries, seedFolders } from "./seeds";

const STORAGE_KEY = "tapewire-journal";

/**
 * Thrown when localStorage is out of quota on save — screenshots as data
 * URLs hit this fast. The save sheet catches it and shows a friendly
 * "storage full" message instead of losing the entry silently.
 */
export class JournalStorageFullError extends Error {
  constructor() {
    super("Journal storage is full");
    this.name = "JournalStorageFullError";
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22)
  );
}

interface JournalData {
  folders: JournalFolder[];
  entries: JournalEntry[];
}

/**
 * Forward-migrates blobs persisted by earlier prototype versions — no data
 * loss, ever:
 *  - reactions saved before measurement intervals existed get interval ""
 *    (rendered as a bare move — never an invented window);
 *  - entries saved before the Replay fields get an empty tag list;
 *  - the v3 binary `outcome` (held/faded/mixed) maps onto the v4 behavior
 *    taxonomy (sustained / spike-reversal / unclear). An entry that already
 *    carries a behavior wins over its legacy outcome.
 */
function migrate(data: JournalData): JournalData {
  return {
    ...data,
    entries: data.entries.map((e) => {
      const legacyOutcome = (e as unknown as { outcome?: string }).outcome;
      return {
        ...e,
        reactions: (e.reactions ?? []).map((r) => ({ ...r, interval: r.interval ?? "" })),
        tags: e.tags ?? [],
        behavior:
          e.behavior ??
          (legacyOutcome ? LEGACY_OUTCOME_TO_BEHAVIOR[legacyOutcome] : undefined),
      };
    }),
  };
}

const defaultFolders = (): JournalFolder[] =>
  DEFAULT_FOLDER_NAMES.map((name) => ({
    id: folderIdForName(name),
    name,
    kind: "default" as const,
  }));

/**
 * localStorage-backed journal. Seeds demo folders/entries on first run; the
 * stored blob is the source of truth after that. Production swaps this class
 * for an API-backed provider behind the same JournalProvider interface.
 *
 * PRODUCTION NOTE — screenshots: entries may carry chart screenshots as
 * data URLs, which is a prototype constraint of localStorage (quota ~5MB,
 * hence the client-side downscale and the JournalStorageFullError path).
 * In production screenshots move to object storage with the entry keeping
 * only a reference.
 */
export class LocalStorageJournalProvider implements JournalProvider {
  private data: JournalData | null = null;
  private listeners = new Set<() => void>();

  private load(): JournalData {
    if (this.data) return this.data;
    // SSR/prerender never reaches here through the UI (all access is inside
    // effects), but guard anyway so a stray server call can't crash.
    if (typeof window === "undefined") {
      return { folders: [...defaultFolders(), ...seedFolders], entries: [...seedEntries] };
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.data = migrate(JSON.parse(raw) as JournalData);
        return this.data;
      }
    } catch {
      // Corrupt blob → fall through to re-seed.
    }
    this.data = {
      folders: [...defaultFolders(), ...seedFolders],
      entries: [...seedEntries],
    };
    this.persist();
    return this.data;
  }

  /**
   * `throwOnQuota` is set by user-initiated writes (save/update) so the UI
   * can surface a friendly "storage full" message; background persists keep
   * the old swallow-and-continue behavior (private mode, etc.).
   */
  private persist(throwOnQuota = false) {
    if (!this.data || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      if (throwOnQuota && isQuotaError(err)) throw new JournalStorageFullError();
      // Other quota/private-mode failures shouldn't take the UI down.
    }
    this.listeners.forEach((cb) => cb());
  }

  async listFolders(): Promise<JournalFolder[]> {
    return [...this.load().folders];
  }

  async createFolder(name: string): Promise<JournalFolder> {
    const data = this.load();
    const trimmed = name.trim();
    const id = folderIdForName(trimmed);
    const existing = data.folders.find((f) => f.id === id);
    if (existing) return existing;
    const folder: JournalFolder = { id, name: trimmed, kind: "custom" };
    data.folders = [...data.folders, folder];
    this.persist();
    return folder;
  }

  async listEntries(folderId?: string): Promise<JournalEntry[]> {
    const entries = this.load().entries.filter(
      (e) => !folderId || e.folderId === folderId,
    );
    return entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async saveEntry(input: NewJournalEntry): Promise<JournalEntry> {
    const data = this.load();
    const entry: JournalEntry = {
      ...input,
      id: `je-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const prev = data.entries;
    data.entries = [entry, ...data.entries];
    try {
      this.persist(true);
    } catch (err) {
      data.entries = prev; // roll back the in-memory write on quota failure
      throw err;
    }
    return entry;
  }

  async updateEntry(
    id: string,
    patch: Partial<
      Pick<
        JournalEntry,
        | "notes"
        | "reactions"
        | "folderId"
        | "trade"
        | "behavior"
        | "effectDuration"
        | "initialMovePoints"
        | "reversalPoints"
        | "screenshots"
        | "tags"
      >
    >,
  ): Promise<JournalEntry | null> {
    const data = this.load();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated = { ...data.entries[idx], ...patch };
    const prev = data.entries;
    data.entries = data.entries.map((e, i) => (i === idx ? updated : e));
    try {
      this.persist(true);
    } catch (err) {
      data.entries = prev;
      throw err;
    }
    return updated;
  }

  async deleteEntry(id: string): Promise<void> {
    const data = this.load();
    data.entries = data.entries.filter((e) => e.id !== id);
    this.persist();
  }

  async getJournaledNewsIds(): Promise<Set<string>> {
    return new Set(this.load().entries.map((e) => e.item.id));
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
