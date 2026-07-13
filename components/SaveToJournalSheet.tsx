"use client";

import { useEffect, useMemo, useState } from "react";
import type { MarketReaction, NewsItem } from "@/lib/news/types";
import { getDirectTickers } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider, historyKeyFor } from "@/lib/history";
import type { JournalFolder, JournalScreenshot, MoveBehavior } from "@/lib/journal";
import {
  BEHAVIOR_DESCRIPTION,
  BEHAVIOR_LABEL,
  JournalStorageFullError,
  MOVE_BEHAVIORS,
  SUGGESTED_TAGS,
  folderIdForName,
  journalProvider,
  suggestFolderName,
} from "@/lib/journal";
import { downscaleImageToDataUrl } from "@/lib/image";
import { dateTimeStamp } from "@/lib/time";

const NEW_FOLDER = "__new__";

/** Screenshot cap per entry — a localStorage-quota constraint (see provider). */
const MAX_SCREENSHOTS = 3;

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
 * reactions pre-filled (with intervals), the duration-behavior taxonomy and
 * points fields are optional one-tap/one-number inputs, and the flow ends on
 * notes + chart screenshots. Saving stays a fast action; "observed only"
 * (no trade) is a first-class entry.
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
  const [behavior, setBehavior] = useState<MoveBehavior | null>(null);
  const [effectDuration, setEffectDuration] = useState("");
  const [initialPts, setInitialPts] = useState("");
  const [reversalPts, setReversalPts] = useState("");
  const [screenshots, setScreenshots] = useState<JournalScreenshot[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [storageFull, setStorageFull] = useState(false);
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

  const attachScreenshots = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);
    const room = MAX_SCREENSHOTS - screenshots.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > picked.length) {
      setAttachError(`Up to ${MAX_SCREENSHOTS} screenshots per entry.`);
    }
    for (const file of picked) {
      try {
        const dataUrl = await downscaleImageToDataUrl(file);
        setScreenshots((cur) =>
          cur.length >= MAX_SCREENSHOTS
            ? cur
            : [...cur, { dataUrl, addedAt: new Date().toISOString() }],
        );
      } catch {
        setAttachError(`Couldn't read ${file.name} — is it an image?`);
      }
    }
  };

  const parsePts = (v: string): number | undefined => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? Math.abs(n) : undefined;
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStorageFull(false);
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
        behavior: behavior ?? undefined,
        effectDuration: effectDuration.trim() || undefined,
        initialMovePoints: parsePts(initialPts),
        reversalPoints: parsePts(reversalPts),
        screenshots: screenshots.length ? screenshots : undefined,
        tags,
        relatedHistorical: historyKey ? [historyKey] : undefined,
      });
      onClose();
    } catch (err) {
      // Storage full — keep the sheet open so nothing typed is lost, and
      // suggest removing a screenshot (the usual quota culprit).
      if (err instanceof JournalStorageFullError) setStorageFull(true);
      else throw err;
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

          {/* What the move did — duration-behavior taxonomy */}
          <div>
            <label className="font-mono text-2xs uppercase tracking-widest text-text-low">
              What the move did{" "}
              <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <div className="mt-1.5 space-y-1">
              {MOVE_BEHAVIORS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBehavior((cur) => (cur === b ? null : b))}
                  className={`block w-full border px-2.5 py-1.5 text-left ${
                    behavior === b
                      ? "border-phos/60 bg-phos-faint"
                      : "border-ink-700 hover:border-ink-800"
                  }`}
                  aria-pressed={behavior === b}
                >
                  <span
                    className={`font-mono text-xs font-semibold ${
                      behavior === b ? "text-phos" : "text-text-hi"
                    }`}
                  >
                    {BEHAVIOR_LABEL[b]}
                  </span>
                  <span className="ml-2 text-2xs text-text-mid">
                    {BEHAVIOR_DESCRIPTION[b]}
                  </span>
                </button>
              ))}
            </div>
            {/* Points + duration — the advisor's units */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-2xs text-text-mid">
              <span>moved</span>
              <input
                value={initialPts}
                onChange={(e) => setInitialPts(e.target.value)}
                placeholder="30"
                inputMode="decimal"
                className="tnum w-16 border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                aria-label="Initial move in points"
              />
              <span>pts on the drop · reversed</span>
              <input
                value={reversalPts}
                onChange={(e) => setReversalPts(e.target.value)}
                placeholder="140"
                inputMode="decimal"
                className="tnum w-16 border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                aria-label="Reversal in points"
              />
              <span>pts · effect lasted</span>
              <input
                value={effectDuration}
                onChange={(e) => setEffectDuration(e.target.value)}
                placeholder="5m, 30m, all day"
                className="w-28 border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                aria-label="Effect duration"
              />
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

          {/* Final step: notes + chart screenshots — the save flow ends here */}
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {screenshots.map((s, i) => (
                <span key={s.addedAt + i} className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.dataUrl}
                    alt={`Chart screenshot ${i + 1}`}
                    className="h-14 w-20 border border-ink-700 object-cover"
                  />
                  <button
                    onClick={() =>
                      setScreenshots((cur) => cur.filter((_, idx) => idx !== i))
                    }
                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-ink-700 bg-ink-950 font-mono text-2xs text-text-low hover:text-impact-high"
                    aria-label={`Remove screenshot ${i + 1}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              {screenshots.length < MAX_SCREENSHOTS && (
                <label className="cursor-pointer border border-ink-700 px-2.5 py-1.5 font-mono text-2xs text-text-mid hover:border-phos hover:text-phos">
                  + Attach chart screenshot
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void attachScreenshots(e.target.files);
                      e.target.value = "";
                    }}
                    aria-label="Attach chart screenshot"
                  />
                </label>
              )}
            </div>
            {attachError && (
              <p className="mt-1 text-2xs text-impact-med">{attachError}</p>
            )}
            <p className="mt-1 text-2xs text-text-low">
              Up to {MAX_SCREENSHOTS}, downscaled on-device. Prototype stores
              them locally; production moves screenshots to cloud storage.
            </p>
          </div>

          {history && (
            <p className="text-2xs text-text-low">
              Will link to {history.occurrences.length} past {history.name}{" "}
              occurrence{history.occurrences.length === 1 ? "" : "s"} for replay
              comparison.
            </p>
          )}
        </div>

        {storageFull && (
          <p className="border-t border-impact-med/40 bg-impact-med/10 px-4 py-2 text-xs text-impact-med">
            Local storage is full — this entry couldn&apos;t be saved. Remove a
            screenshot (they take the most space) or delete old entries, then
            save again. Nothing you typed was lost.
          </p>
        )}
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
