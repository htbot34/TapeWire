"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import type { JournalEntry, JournalFolder } from "@/lib/journal";
import { folderSummary, journalProvider } from "@/lib/journal";
import { dateTimeStamp, shortDate } from "@/lib/time";
import { ImpactDot, ReactionChip, TickerChip } from "./atoms";
import ExplainerPanel from "./ExplainerPanel";

function EntryRow({
  entry,
  onExplain,
}: {
  entry: JournalEntry;
  onExplain: (item: NewsItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(entry.notes);
  const [reactions, setReactions] = useState(entry.reactions);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveEdits = async () => {
    await journalProvider.updateEntry(entry.id, {
      notes: notes.trim(),
      reactions: reactions.filter((r) => r.instrument.trim() && r.move.trim()),
    });
    setEditing(false);
  };

  return (
    <li className="border-b border-ink-800/70">
      <div
        className="flex cursor-pointer items-baseline gap-2 px-3 py-2 hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
      >
        <ImpactDot impact={entry.item.impact} />
        <span className="tnum w-[92px] shrink-0 font-mono text-2xs text-text-low">
          {dateTimeStamp(entry.item.timestamp)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-snug text-text-hi">
            {entry.item.headline}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {entry.reactions.map((r, i) => (
              <ReactionChip key={`${r.instrument}-${i}`} reaction={r} />
            ))}
          </div>
          {entry.notes && !editing && (
            <p className="mt-1 text-xs leading-relaxed text-text-mid">
              {entry.notes}
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-l-2 border-ink-700 bg-ink-900/60 px-4 pb-3 pt-2 sm:ml-4 sm:px-5">
          {editing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-1.5">
                {reactions.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={r.instrument}
                      onChange={(e) =>
                        setReactions((rs) =>
                          rs.map((x, idx) =>
                            idx === i ? { ...x, instrument: e.target.value.toUpperCase() } : x,
                          ),
                        )
                      }
                      className="tnum w-24 border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-text-hi focus:border-phos focus:outline-none"
                      aria-label={`Instrument ${i + 1}`}
                    />
                    <input
                      value={r.move}
                      onChange={(e) =>
                        setReactions((rs) =>
                          rs.map((x, idx) => (idx === i ? { ...x, move: e.target.value } : x)),
                        )
                      }
                      className="tnum min-w-0 flex-1 border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-text-hi focus:border-phos focus:outline-none"
                      aria-label={`Move ${i + 1}`}
                    />
                    <button
                      onClick={() => setReactions((rs) => rs.filter((_, idx) => idx !== i))}
                      className="px-1 font-mono text-xs text-text-low hover:text-impact-high"
                      aria-label={`Remove reaction ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setReactions((rs) => [...rs, { instrument: "", move: "" }])
                  }
                  className="font-mono text-2xs text-phos/80 hover:text-phos"
                >
                  + add instrument
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full resize-y border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs leading-relaxed text-text-hi focus:border-phos focus:outline-none"
                aria-label="Notes"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdits}
                  className="border border-phos/50 bg-phos-faint px-3 py-1 text-xs font-medium text-phos hover:border-phos"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setNotes(entry.notes);
                    setReactions(entry.reactions);
                    setEditing(false);
                  }}
                  className="px-2 py-1 font-mono text-xs text-text-low hover:text-text-mid"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {entry.item.body && (
                <p className="max-w-3xl text-[13px] leading-relaxed text-text-mid">
                  {entry.item.body}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {entry.item.tickers.map((t) => (
                  <TickerChip key={t} symbol={t} />
                ))}
              </div>
              <div
                className="mt-2 flex flex-wrap items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {entry.item.url && (
                  <a
                    href={entry.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-2xs text-phos/80 underline decoration-phos/30 hover:text-phos"
                  >
                    View source →
                  </a>
                )}
                <button
                  onClick={() => onExplain(entry.item)}
                  className="font-mono text-2xs text-text-low hover:text-phos"
                >
                  ? explain
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="font-mono text-2xs text-text-low hover:text-phos"
                >
                  edit
                </button>
                {confirmDelete ? (
                  <span className="flex items-center gap-2 font-mono text-2xs">
                    <button
                      onClick={() => journalProvider.deleteEntry(entry.id)}
                      className="text-impact-high hover:underline"
                    >
                      confirm delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-text-low hover:text-text-mid"
                    >
                      keep
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="font-mono text-2xs text-text-low hover:text-impact-high"
                  >
                    delete
                  </button>
                )}
                <span className="tnum ml-auto font-mono text-2xs text-text-low">
                  saved {shortDate(entry.createdAt)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function JournalView() {
  const [folders, setFolders] = useState<JournalFolder[] | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [explaining, setExplaining] = useState<NewsItem | null>(null);

  const load = useCallback(() => {
    journalProvider.listFolders().then(setFolders);
    journalProvider.listEntries().then(setEntries);
  }, []);

  useEffect(() => {
    load();
    return journalProvider.subscribe(load);
  }, [load]);

  const entriesFor = (folderId: string) =>
    entries.filter((e) => e.folderId === folderId);

  const selectedFolder = folders?.find((f) => f.id === selected);

  return (
    <>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        {!selectedFolder ? (
          <>
            <header>
              <div className="font-mono text-2xs uppercase tracking-[0.25em] text-phos">
                Journal
              </div>
              <h1 className="mt-1 text-xl font-semibold text-text-hi">
                How news moved your markets
              </h1>
              <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
                {entries.length} entr{entries.length === 1 ? "y" : "ies"} · saved
                from the tape with the → button
              </p>
            </header>

            {folders === null ? (
              <div className="mt-6 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-10" />
                ))}
              </div>
            ) : (
              <ul className="mt-4">
                {folders.map((f) => {
                  const fe = entriesFor(f.id);
                  const latest = fe[0];
                  return (
                    <li key={f.id} className="border-b border-ink-800/70">
                      <button
                        onClick={() => setSelected(f.id)}
                        className="flex w-full items-baseline gap-3 px-3 py-2.5 text-left hover:bg-ink-900 sm:px-4"
                      >
                        <span
                          className={`min-w-0 flex-none text-sm font-medium ${
                            fe.length ? "text-text-hi" : "text-text-mid"
                          }`}
                        >
                          {f.name}
                        </span>
                        {f.kind === "custom" && (
                          <span className="font-mono text-2xs uppercase text-impact-med">
                            custom
                          </span>
                        )}
                        <span className="tnum font-mono text-2xs text-text-low">
                          {fe.length} entr{fe.length === 1 ? "y" : "ies"}
                        </span>
                        <span className="tnum ml-auto shrink-0 font-mono text-2xs text-text-low">
                          {latest ? `last ${shortDate(latest.item.timestamp)}` : "—"}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-text-low">
                          ›
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <>
            <header>
              <button
                onClick={() => setSelected(null)}
                className="font-mono text-2xs uppercase tracking-widest text-text-low hover:text-text-mid"
              >
                ← Journal
              </button>
              <h1 className="mt-1 text-xl font-semibold text-text-hi">
                {selectedFolder.name}
              </h1>
              {(() => {
                const fe = entriesFor(selectedFolder.id);
                const summary = folderSummary(fe);
                return (
                  <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
                    {fe.length} entr{fe.length === 1 ? "y" : "ies"}
                    {summary ? ` · ${summary}` : ""}
                  </p>
                );
              })()}
            </header>

            {entriesFor(selectedFolder.id).length === 0 ? (
              <div className="mt-10 text-center">
                <p className="font-mono text-2xs uppercase tracking-[0.25em] text-text-low">
                  No entries yet
                </p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-text-mid">
                  Save headlines here with the → button on any feed or briefing
                  row. Recorded reactions build your own history of how this
                  event type moves your markets.
                </p>
              </div>
            ) : (
              <ul className="mt-4">
                {entriesFor(selectedFolder.id).map((e) => (
                  <EntryRow key={e.id} entry={e} onExplain={setExplaining} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {explaining && (
        <ExplainerPanel item={explaining} onClose={() => setExplaining(null)} />
      )}
    </>
  );
}
