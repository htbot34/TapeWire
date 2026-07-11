"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketReaction, NewsItem } from "@/lib/news/types";
import { getDirectTickers } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider, historyKeyFor } from "@/lib/history";
import type { JournalFolder, JournalOutcome } from "@/lib/journal";
import {
  OUTCOME_LABEL,
  SUGGESTED_TAGS,
  folderIdForName,
  journalProvider,
  suggestFolderName,
} from "@/lib/journal";
import { dateTimeStamp } from "@/lib/time";

const NEW_FOLDER = "__new__";

const OUTCOMES: JournalOutcome[] = ["held", "faded", "mixed"];

/** Default tag suggested from the item (matches the folder suggestion). */
function suggestTag(item: NewsItem): string | null {
  switch (suggestFolderName(item)) {
    case "CPI":
      return "CPI";
    case "NFP":
      return "NFP";
    case "FOMC":
      return "FOMC";
    case "Earnings":
      return "earnings";
    case "Geopolitical":
      return "geopolitics";
    default:
      return item.eventType === "company-news" ? "company news" : null;
  }
}

/**
 * Compact capture sheet — the core Replay input. Folder auto-suggested,
 * reactions pre-filled (with intervals), and the v3 fields are all optional
 * one-tap toggles: direction, held/faded, tag chips. Saving stays a <10s
 * action; "observed only" (no trade) is a first-class entry.
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
      : [{ instrument: "", move: "", interval: "" }],
  );
  const [notes, setNotes] = useState("");
  const [direction, setDirection] = useState<"long" | "short" | null>(null);
  const [tradeInstrument, setTradeInstrument] = useState(
    item.marketReaction?.[0]?.instrument ?? getDirectTickers(item)[0] ?? "",
  );
  const [outcome, setOutcome] = useState<JournalOutcome | null>(null);
  const [tags, setTags] = useState<string[]>(() => {
    const t = suggestTag(item);
    return t ? [t] : [];
  });
  const [customTag, setCustomTag] = useState("");
  const [history, setHistory] = useState<HistoricalEventContext | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    journalProvider.listFolders().then(setFolders);
    historicalEventProvider.getContext(item).then(setHistory);
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tagOptions = useMemo(() => {
    const opts = [...SUGGESTED_TAGS] as string[];
    for (const t of tags) if (!opts.includes(t)) opts.push(t);
    return opts;
  }, [tags]);

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const addCustomTag = () => {
    const t = customTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((cur) => [...cur, t]);
    setCustomTag("");
  };

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
      const historyKey = historyKeyFor(item);
      await journalProvider.saveEntry({
        folderId: targetId,
        item,
        reactions: reactions.filter((r) => r.instrument.trim() && r.move.trim()),
        notes: notes.trim(),
        trade:
          direction && tradeInstrument.trim()
            ? { instrument: tradeInstrument.trim().toUpperCase(), direction }
            : undefined,
        outcome: outcome ?? undefined,
        tags,
        relatedHistorical: historyKey ? [historyKey] : undefined,
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
                   sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border"
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
                  <input
                    value={r.interval}
                    onChange={(e) => setReaction(i, { interval: e.target.value })}
                    placeholder="in 5m"
                    title="Measurement window — 1m, 5m, 30m, since release…"
                    className="tnum w-20 border border-ink-700 bg-ink-950 px-2 py-1.5 font-mono text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                    aria-label={`Interval ${i + 1}`}
                  />
                  <button
                    onClick={() =>
                      setReactions((rs) =>
                        rs.length > 1
                          ? rs.filter((_, idx) => idx !== i)
                          : [{ instrument: "", move: "", interval: "" }],
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
              onClick={() =>
                setReactions((rs) => [...rs, { instrument: "", move: "", interval: "" }])
              }
              className="mt-1.5 font-mono text-2xs text-phos/80 hover:text-phos"
            >
              + add instrument
            </button>
          </div>

          {/* What you did — optional; observed-only is valid */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              What you did <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {(["long", "short"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection((cur) => (cur === d ? null : d))}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${
                    direction === d
                      ? d === "long"
                        ? "border-pos/60 bg-pos/10 text-pos"
                        : "border-neg/60 bg-neg/10 text-neg"
                      : "border-ink-700 text-text-low hover:text-text-mid"
                  }`}
                  aria-pressed={direction === d}
                >
                  {d}
                </button>
              ))}
              <input
                value={tradeInstrument}
                onChange={(e) => setTradeInstrument(e.target.value.toUpperCase())}
                placeholder="NQ"
                disabled={!direction}
                className="tnum w-24 border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none disabled:opacity-40"
                aria-label="Traded instrument"
              />
              {!direction && (
                <span className="font-mono text-2xs text-text-low">observed only</span>
              )}
            </div>
          </div>

          {/* Outcome — did the move hold or fade */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              Move outcome <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <div className="mt-1.5 flex items-center gap-1.5">
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome((cur) => (cur === o ? null : o))}
                  className={`rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${
                    outcome === o
                      ? "border-phos/60 bg-phos-faint text-phos"
                      : "border-ink-700 text-text-low hover:text-text-mid"
                  }`}
                  aria-pressed={outcome === o}
                >
                  {OUTCOME_LABEL[o]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              Tags
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {tagOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-sm border px-2 py-0.5 font-mono text-2xs ${
                    tags.includes(t)
                      ? "border-phos/60 bg-phos-faint text-phos"
                      : "border-ink-700 text-text-low hover:text-text-mid"
                  }`}
                  aria-pressed={tags.includes(t)}
                >
                  {t}
                </button>
              ))}
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                onBlur={addCustomTag}
                placeholder="+ tag"
                className="w-16 border border-ink-700 bg-ink-950 px-1.5 py-0.5 font-mono text-2xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                aria-label="Add custom tag"
              />
            </div>
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

          {history && (
            <p className="text-2xs text-text-low">
              Will link to {history.occurrences.length} past {history.name}{" "}
              occurrence{history.occurrences.length === 1 ? "" : "s"} for replay
              comparison.
            </p>
          )}
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
