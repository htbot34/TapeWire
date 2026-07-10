"use client";

import { useEffect, useState } from "react";
import type { MarketReaction, NewsItem } from "@/lib/news/types";
import type { JournalFolder } from "@/lib/journal";
import {
  folderIdForName,
  journalProvider,
  suggestFolderName,
} from "@/lib/journal";
import { dateTimeStamp } from "@/lib/time";

const NEW_FOLDER = "__new__";

/**
 * Compact capture sheet: folder (auto-suggested from the item's event type),
 * recorded market reaction rows (pre-filled from the item, editable), notes.
 * Modal on desktop, bottom sheet on mobile.
 */
export default function SaveToJournalSheet({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<JournalFolder[] | null>(null);
  const [folderId, setFolderId] = useState<string>(
    folderIdForName(suggestFolderName(item)),
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [reactions, setReactions] = useState<MarketReaction[]>(
    item.marketReaction?.length
      ? item.marketReaction.map((r) => ({ ...r }))
      : [{ instrument: "", move: "" }],
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    journalProvider.listFolders().then(setFolders);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setReaction = (i: number, patch: Partial<MarketReaction>) =>
    setReactions((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let targetId = folderId;
      if (folderId === NEW_FOLDER) {
        const name = newFolderName.trim();
        if (!name) {
          setSaving(false);
          return;
        }
        targetId = (await journalProvider.createFolder(name)).id;
      }
      await journalProvider.saveEntry({
        folderId: targetId,
        item,
        reactions: reactions.filter((r) => r.instrument.trim() && r.move.trim()),
        notes: notes.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="cursor-default text-left">
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed z-50 flex max-h-[85vh] flex-col overflow-y-auto border-ink-700 bg-ink-900
                   inset-x-0 bottom-0 border-t
                   sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border"
        role="dialog"
        aria-label="Save to journal"
      >
        <div className="flex items-start gap-3 border-b border-ink-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-phos">
              Save to journal
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-text-mid">
              {item.headline}
            </p>
            <div className="tnum mt-0.5 font-mono text-2xs text-text-low">
              {dateTimeStamp(item.timestamp)} · {item.source}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 font-mono text-text-low hover:text-text-hi"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Folder */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              Folder
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="mt-1.5 w-full border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-text-hi focus:border-phos focus:outline-none"
            >
              {(folders ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.id === folderIdForName(suggestFolderName(item)) ? " · suggested" : ""}
                </option>
              ))}
              <option value={NEW_FOLDER}>New folder…</option>
            </select>
            {folderId === NEW_FOLDER && (
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name — e.g. BOJ, OPEX, Gold"
                className="mt-1.5 w-full border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
              />
            )}
          </div>

          {/* Recorded market reaction */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              Recorded market reaction
            </label>
            <div className="mt-1.5 space-y-1.5">
              {reactions.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={r.instrument}
                    onChange={(e) => setReaction(i, { instrument: e.target.value.toUpperCase() })}
                    placeholder="NQ"
                    className="tnum w-24 border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                    aria-label={`Instrument ${i + 1}`}
                  />
                  <input
                    value={r.move}
                    onChange={(e) => setReaction(i, { move: e.target.value })}
                    placeholder="+200 pts"
                    className="tnum min-w-0 flex-1 border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                    aria-label={`Move ${i + 1}`}
                  />
                  <button
                    onClick={() =>
                      setReactions((rs) =>
                        rs.length > 1 ? rs.filter((_, idx) => idx !== i) : [{ instrument: "", move: "" }],
                      )
                    }
                    className="shrink-0 px-1 font-mono text-xs text-text-low hover:text-impact-high"
                    aria-label={`Remove reaction ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setReactions((rs) => [...rs, { instrument: "", move: "" }])}
              className="mt-1.5 font-mono text-2xs text-phos/80 hover:text-phos"
            >
              + add instrument
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Came in hotter than forecast, NQ pumped 200 points into the open…"
              className="mt-1.5 w-full resize-y border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs leading-relaxed text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-800 px-4 py-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 font-mono text-xs text-text-low hover:text-text-mid"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || (folderId === NEW_FOLDER && !newFolderName.trim())}
            className="border border-phos/50 bg-phos-faint px-4 py-1.5 text-sm font-medium text-phos hover:border-phos disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
