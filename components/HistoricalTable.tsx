import type { HistoricalEventContext } from "@/lib/history";
import { MoveText } from "./atoms";

/**
 * The dated occurrences table (date · surprise · move with interval) from
 * the curated event database — shared by the Explain panel and the journal's
 * related-historical cross-links. Never rendered from model output.
 */
export default function HistoricalTable({
  history,
}: {
  history: HistoricalEventContext;
}) {
  return (
    <div className="mt-1">
      {history.occurrences.map((o, i) => (
        <div
          key={o.date}
          className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-ink-800/50 py-1 ${
            i === 0 ? "border-l-2 border-l-phos bg-phos-faint/40 pl-2" : "pl-2.5"
          }`}
        >
          <span className="tnum w-[74px] shrink-0 font-mono text-2xs text-text-hi">
            {o.date}
          </span>
          {i === 0 && (
            <span className="shrink-0 rounded-sm bg-phos/20 px-1 font-mono text-2xs font-semibold uppercase text-phos">
              last
            </span>
          )}
          <span className="tnum min-w-0 font-mono text-2xs text-text-mid">
            {o.actual
              ? `${o.actual}${o.consensus ? ` vs ${o.consensus} exp` : ""}`
              : ""}
            {o.surprise ? ` (${o.surprise})` : ""}
          </span>
          <span className="ml-auto flex shrink-0 flex-wrap justify-end gap-x-2">
            {o.reactions.map((r) => (
              <MoveText key={r.instrument} reaction={r} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
