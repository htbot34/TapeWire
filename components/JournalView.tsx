"use client";

import { useCallback, useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider, historyKeyFor } from "@/lib/history";
import type { JournalEntry, JournalFolder, JournalOutcome } from "@/lib/journal";
import {
  OUTCOME_LABEL,
  folderStats,
  folderSummary,
  journalProvider,
} from "@/lib/journal";
import { dateTimeStamp, shortDate } from "@/lib/time";
import { ImpactTag, MoveText, TickerChip } from "./atoms";
import ExplainerPanel from "./ExplainerPanel";
import HistoricalTable from "./HistoricalTable";

const OUTCOMES: JournalOutcome[] = ["held", "faded", "mixed"];

function outcomeColor(o: JournalOutcome): string {
  return o === "held" ? "text-pos" : o === "faded" ? "text-neg" : "text-impact-med";
}

/** "Actual +0.1% vs +0.2% exp" — the surprise cell, only when recorded. */
function surpriseText(item: NewsItem): string | null {
  if (!item.econ?.actual) return null;
  return item.econ.forecast
    ? `${item.econ.actual} vs ${item.econ.forecast} exp`
    : item.econ.actual;
}

/**
 * Related-historical cross-link: the curated occurrences table for this
 * entry's event type, so the trader can compare their recorded reaction
 * against the historical pattern ("show me the last soft CPIs and how NQ
 * reacted"). Renders nothing when the dataset has no coverage.
 */
function RelatedHistorical({ entry }: { entry: JournalEntry }) {
  const [history, setHistory] = useState<HistoricalEventContext | null>(null);

  useEffect(() => {
    const key = entry.relatedHistorical?.[0] ?? historyKeyFor(entry.item);
    if (!key) {
      setHistory(null);
      return;
    }
    let alive = true;
    historicalEventProvider.getByKey(key).then((h) => {
      if (alive) setHistory(h);
    });
    return () => {
      alive = false;
    };
  }, [entry]);

  if (!history) return null;
  return (
    <div className="mt-3 border-t border-ink-800/60 pt-2">
      <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
        Related historical — {history.name}
      </div>
      <HistoricalTable history={history} />
      <p className="mt-1 text-2xs text-text-low">
        Compare your recorded reaction above against the pattern. Curated
        dataset — mock data in the prototype.
      </p>
    </div>
  );
}

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

  const setOutcome = (o: JournalOutcome) =>
    journalProvider.updateEntry(entry.id, {
      outcome: entry.outcome === o ? undefined : o,
    });

  const surprise = surpriseText(entry.item);

  return (
    <li className="border-b border-ink-800/70">
      {/* Dense table row: date · surprise · reactions · outcome · tags */}
      <div
        className="flex cursor-pointer items-baseline gap-2 px-3 py-[7px] hover:bg-ink-900 sm:px-4"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        aria-expanded={expanded}
        title={entry.item.headline}
      >
        <span className="tnum w-[52px] shrink-0 font-mono text-2xs text-text-hi">
          {shortDate(entry.item.timestamp)}
        </span>
        <span className="tnum hidden w-[168px] shrink-0 truncate font-mono text-2xs text-text-mid sm:inline-block">
          {surprise ?? "—"}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {entry.reactions.length ? (
            entry.reactions.map((r, i) => <MoveText key={`${r.instrument}-${i}`} reaction={r} />)
          ) : (
            <span className="font-mono text-2xs text-text-low">no reaction recorded</span>
          )}
        </span>
        <span
          className={`w-[46px] shrink-0 text-right font-mono text-2xs font-semibold uppercase ${
            entry.outcome ? outcomeColor(entry.outcome) : "text-text-low"
          }`}
        >
          {entry.outcome ? OUTCOME_LABEL[entry.outcome] : "—"}
        </span>
        <span className="hidden w-[136px] shrink-0 items-baseline justify-end gap-1 overflow-hidden md:flex">
          {entry.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="truncate rounded-sm border border-ink-700 px-1 font-mono text-2xs text-text-low"
            >
              {t}
            </span>
          ))}
          {entry.tags.length > 2 && (
            <span className="font-mono text-2xs text-text-low">+{entry.tags.length - 2}</span>
          )}
        </span>
      </div>

      {expanded && (
        <div className="border-l-2 border-ink-700 bg-ink-900/60 px-4 pb-3 pt-2 sm:ml-4 sm:px-5">
          {/* Full event context */}
          <div className="flex flex-wrap items-baseline gap-2">
            <ImpactTag impact={entry.item.impact} compact />
            <span className="tnum font-mono text-2xs text-text-low">
              {dateTimeStamp(entry.item.timestamp)} · {entry.item.source}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium leading-snug text-text-hi">
            {entry.item.headline}
          </p>

          {/* Trade record */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {entry.trade ? (
              <span className="font-mono text-2xs">
                <span
                  className={`font-semibold uppercase ${
                    entry.trade.direction === "long" ? "text-pos" : "text-neg"
                  }`}
                >
                  {entry.trade.direction}
                </span>{" "}
                <span className="text-text-hi">{entry.trade.instrument}</span>
                {entry.trade.note && (
                  <span className="text-text-mid"> — {entry.trade.note}</span>
                )}
              </span>
            ) : (
              <span className="font-mono text-2xs text-text-low">observed only — no trade recorded</span>
            )}
            <span
              className="ml-auto flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-mono text-2xs text-text-low">outcome:</span>
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`rounded-sm border px-1.5 py-px font-mono text-2xs uppercase ${
                    entry.outcome === o
                      ? `border-current ${outcomeColor(o)}`
                      : "border-ink-700 text-text-low hover:text-text-mid"
                  }`}
                  aria-pressed={entry.outcome === o}
                  title={`Mark move as ${OUTCOME_LABEL[o]}${entry.outcome === o ? " (click to clear)" : ""}`}
                >
                  {OUTCOME_LABEL[o]}
                </button>
              ))}
            </span>
          </div>

          {entry.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-sm border border-ink-700 px-1 font-mono text-2xs text-text-low"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {editing ? (
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
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
                    <input
                      value={r.interval}
                      onChange={(e) =>
                        setReactions((rs) =>
                          rs.map((x, idx) =>
                            idx === i ? { ...x, interval: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="in 5m"
                      title="Measurement window — 1m, 5m, 30m, since release…"
                      className="tnum w-20 border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
                      aria-label={`Interval ${i + 1}`}
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
                    setReactions((rs) => [...rs, { instrument: "", move: "", interval: "" }])
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
              {entry.notes && (
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-text-mid">
                  {entry.notes}
                </p>
              )}
              {entry.item.body && (
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-text-mid/80">
                  {entry.item.body}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {getDirectTickers(entry.item).map((t) => (
                  <TickerChip key={t} symbol={t} />
                ))}
                {getCorrelatedTickers(entry.item).map((t) => (
                  <TickerChip key={t} symbol={t} variant="correlated" />
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
                  className="font-mono text-2xs uppercase tracking-wide text-text-low hover:text-phos"
                >
                  Explain
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
              <RelatedHistorical entry={entry} />
            </>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The Replay stats header — the "trading is data and statistical analysis"
 * payoff, computed honestly from recorded entries only. Under 3 entries the
 * folder shows an unlock hint instead of thin math.
 */
function StatsHeader({ entries }: { entries: JournalEntry[] }) {
  const stats = folderStats(entries);
  if (!stats) {
    return entries.length > 0 ? (
      <p className="mt-3 border border-ink-800 bg-ink-900/60 px-3 py-2 font-mono text-2xs text-text-low">
        Record {3 - entries.length} more entr{3 - entries.length === 1 ? "y" : "ies"} to
        unlock folder stats ({entries.length} of 3).
      </p>
    ) : null;
  }
  const { avgMoves, outcomes, biggest } = stats;
  return (
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border border-ink-800 bg-ink-900/60 px-3 py-2.5">
      <div>
        <div className="font-mono text-2xs uppercase tracking-widest text-text-low">Entries</div>
        <div className="tnum mt-0.5 font-mono text-sm font-semibold text-text-hi">
          {stats.entryCount}
        </div>
      </div>
      {avgMoves.slice(0, 2).map((m) => (
        <div key={m.instrument}>
          <div className="font-mono text-2xs uppercase tracking-widest text-text-low">
            Avg |{m.instrument}|
          </div>
          <div className="tnum mt-0.5 font-mono text-sm font-semibold text-text-hi">
            {m.avgAbsPct.toFixed(1)}%
            <span className="ml-1 text-2xs font-normal text-text-low">
              across {m.count}
            </span>
          </div>
        </div>
      ))}
      {outcomes.recorded > 0 && (
        <div>
          <div className="font-mono text-2xs uppercase tracking-widest text-text-low">
            Held / Faded
          </div>
          <div className="tnum mt-0.5 font-mono text-sm font-semibold">
            <span className="text-pos">{outcomes.held}</span>
            <span className="text-text-low"> / </span>
            <span className="text-neg">{outcomes.faded}</span>
            {outcomes.mixed > 0 && (
              <span className="text-2xs font-normal text-text-low"> +{outcomes.mixed} mixed</span>
            )}
          </div>
        </div>
      )}
      {biggest && (
        <div>
          <div className="font-mono text-2xs uppercase tracking-widest text-text-low">
            Biggest move
          </div>
          <div className="tnum mt-0.5 font-mono text-sm font-semibold text-text-hi">
            <MoveText reaction={biggest} />
            <span className="ml-1 text-2xs font-normal text-text-low">
              {shortDate(biggest.date)}
            </span>
          </div>
        </div>
      )}
      <p className="w-full font-mono text-2xs text-text-low">
        Computed from your recorded entries only — nothing invented.
      </p>
    </div>
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
                Your event database — how news moved your markets
              </h1>
              <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
                {entries.length} entr{entries.length === 1 ? "y" : "ies"} · saved
                from the tape with the → button · open a folder to replay it
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
                  const summary = folderSummary(fe);
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
                        {summary && (
                          <span className="tnum hidden truncate font-mono text-2xs text-text-low lg:inline">
                            {summary}
                          </span>
                        )}
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
              <div className="mt-1 font-mono text-2xs uppercase tracking-[0.25em] text-phos">
                Replay
              </div>
              <h1 className="mt-0.5 text-xl font-semibold text-text-hi">
                {selectedFolder.name}
              </h1>
              <p className="tnum mt-0.5 font-mono text-xs text-text-mid">
                your event history, replayable
              </p>
              <StatsHeader entries={entriesFor(selectedFolder.id)} />
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
              <>
                {/* column headers for the dense entry table */}
                <div className="mt-4 flex items-baseline gap-2 border-b border-ink-800 px-3 py-1.5 font-mono text-2xs uppercase tracking-wider text-text-low sm:px-4">
                  <span className="w-[52px] shrink-0">Date</span>
                  <span className="hidden w-[168px] shrink-0 sm:inline">Surprise</span>
                  <span className="min-w-0 flex-1">Recorded reactions</span>
                  <span className="w-[46px] shrink-0 text-right">Move</span>
                  <span className="hidden w-[136px] shrink-0 text-right md:inline">Tags</span>
                </div>
                <ul>
                  {entriesFor(selectedFolder.id).map((e) => (
                    <EntryRow key={e.id} entry={e} onExplain={setExplaining} />
                  ))}
                </ul>
              </>
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
