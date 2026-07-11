import type { JournalProvider } from "./provider";
import type { JournalEntry, JournalFolder, NewJournalEntry } from "./types";
import { DEFAULT_FOLDER_NAMES, folderIdForName } from "./types";
import { seedEntries, seedFolders } from "./seeds";

const STORAGE_KEY = "tapewire-journal";

interface JournalData {
  folders: JournalFolder[];
  entries: JournalEntry[];
}

/**
 * Forward-migrates blobs persisted by earlier prototype versions: reactions
 * saved before measurement intervals existed get interval "" (rendered as a
 * bare move — never an invented window), and entries saved before the
 * Replay fields get an empty tag list.
 */
function migrate(data: JournalData): JournalData {
  return {
    ...data,
    entries: data.entries.map((e) => ({
      ...e,
      reactions: (e.reactions ?? []).map((r) => ({ ...r, interval: r.interval ?? "" })),
      tags: e.tags ?? [],
    })),
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

  private persist() {
    if (!this.data || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota/private-mode failures shouldn't take the UI down.
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
    data.entries = [entry, ...data.entries];
    this.persist();
    return entry;
  }

  async updateEntry(
    id: string,
    patch: Partial<
      Pick<
        JournalEntry,
        "notes" | "reactions" | "folderId" | "trade" | "outcome" | "tags"
      >
    >,
  ): Promise<JournalEntry | null> {
    const data = this.load();
    const idx = data.entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    const updated = { ...data.entries[idx], ...patch };
    data.entries = data.entries.map((e, i) => (i === idx ? updated : e));
    this.persist();
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
