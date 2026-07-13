import type {
  FeedbackKind,
  FeedbackProvider,
  FeedbackRecord,
  FeedbackSurface,
} from "./types";

const STORAGE_KEY = "tapewire-feedback";

/**
 * localStorage-backed feedback store. Production swaps this for an
 * API-backed provider behind the same interface, feeding the ranking
 * engine's per-user training data.
 */
export class LocalStorageFeedbackProvider implements FeedbackProvider {
  private records: FeedbackRecord[] | null = null;
  private listeners = new Set<() => void>();

  private load(): FeedbackRecord[] {
    if (this.records) return this.records;
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      this.records = raw ? (JSON.parse(raw) as FeedbackRecord[]) : [];
    } catch {
      this.records = [];
    }
    return this.records;
  }

  private persist() {
    if (this.records === null || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch {
      // Quota/private-mode failures shouldn't take the UI down.
    }
    this.listeners.forEach((cb) => cb());
  }

  async getAll(): Promise<FeedbackRecord[]> {
    return [...this.load()];
  }

  async getForItem(itemId: string): Promise<FeedbackKind | null> {
    return this.load().find((r) => r.itemId === itemId)?.kind ?? null;
  }

  async setFeedback(
    itemId: string,
    headline: string,
    kind: FeedbackKind,
    surface: FeedbackSurface = "row",
  ): Promise<void> {
    const records = this.load();
    this.records = [
      ...records.filter((r) => r.itemId !== itemId),
      { itemId, headline, kind, surface, at: new Date().toISOString() },
    ];
    this.persist();
  }

  async clearFeedback(itemId: string): Promise<void> {
    this.records = this.load().filter((r) => r.itemId !== itemId);
    this.persist();
  }

  async clearAll(): Promise<void> {
    this.records = [];
    this.persist();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
