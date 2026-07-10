"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider } from "@/lib/history";
import { usePrefs } from "@/lib/store";
import { dateTimeStamp } from "@/lib/time";
import { mockExplanation } from "@/lib/explainFallback";
import { TickerChip } from "./atoms";

type Status = "loading" | "streaming" | "done" | "error";
/** "api" = route exists (live or canned server-side); "static" = GitHub Pages. */
type Mode = "api" | "static";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function MoveText({ instrument, move }: { instrument: string; move: string }) {
  const negative = move.trim().startsWith("-");
  return (
    <span className="tnum whitespace-nowrap font-mono text-2xs">
      <span className="text-text-low">{instrument}&nbsp;</span>
      <span className={negative ? "text-neg" : "text-pos"}>{move}</span>
    </span>
  );
}

/**
 * Structured facts first — definition, affected symbols, historical
 * reactions from the curated dataset (never LLM-generated) — then the AI
 * conversation below. No dataset → no table; the AI section stands alone.
 */
function HistoricalFacts({
  history,
  watchlist,
}: {
  history: HistoricalEventContext;
  watchlist: string[];
}) {
  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  return (
    <div className="border-b border-ink-800 px-4 py-3">
      <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
        What it is
      </div>
      <p className="mt-1 text-xs leading-relaxed text-text-hi">
        <span className="font-medium">{history.name}.</span> {history.definition}
      </p>

      <div className="mt-2.5 font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
        Affects
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {history.symbols.map((s) => (
          <TickerChip key={s} symbol={s} inWatchlist={watch.has(s.toUpperCase())} />
        ))}
      </div>

      <div className="mt-2.5 font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
        Historical reactions
      </div>
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
                <MoveText key={r.instrument} instrument={r.instrument} move={r.move} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-2xs text-text-low">
        Curated dataset — mock data in the prototype; production uses a real
        historical events database.
      </p>
    </div>
  );
}

export default function ExplainerPanel({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const watchlist = usePrefs((s) => s.watchlist);
  const [history, setHistory] = useState<HistoricalEventContext | null>(null);
  const [mode, setMode] = useState<Mode>("api");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const request = useCallback(
    async (thread: ChatMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setStreamingText("");
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item, watchlist, messages: thread }),
          signal: controller.signal,
        });
        // Static hosting (GitHub Pages) has no API route at all — fall back
        // to the canned client-side explanation; follow-ups are disabled.
        if (res.status === 404 || res.status === 405) {
          const h = await historicalEventProvider.getContext(item);
          setMode("static");
          setMessages([
            ...thread,
            { role: "assistant", content: mockExplanation(item, watchlist, h) },
          ]);
          setStatus("done");
          return;
        }
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        setStatus("streaming");
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setStreamingText(acc);
        }
        setStreamingText("");
        setMessages([...thread, { role: "assistant", content: acc }]);
        setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    },
    [item, watchlist],
  );

  // New item → reset the thread, load structured facts, auto-generate the
  // initial explanation.
  useEffect(() => {
    setMessages([]);
    setInput("");
    historicalEventProvider.getContext(item).then(setHistory);
    request([]);
    return () => abortRef.current?.abort();
  }, [item, request]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    // Follow the thread only once a conversation is underway — scrolling on
    // the initial explanation would yank the facts section out of view.
    if (messages.length > 1 || (messages.length === 1 && streamingText)) {
      threadEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, streamingText]);

  const busy = status === "loading" || status === "streaming";

  const ask = () => {
    const q = input.trim();
    if (!q || busy || mode === "static") return;
    const thread: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(thread);
    setInput("");
    request(thread);
  };

  return (
    <>
      {/* click-away scrim */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <aside
        className="fixed z-50 flex flex-col border-ink-700 bg-ink-900
                   inset-x-0 bottom-0 max-h-[80vh] border-t
                   md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[440px] md:border-l md:border-t-0"
        role="dialog"
        aria-label="Explainer"
      >
        <div className="flex items-start gap-3 border-b border-ink-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-phos">
              What does this mean?
            </div>
            <p className="mt-1 line-clamp-3 text-xs leading-snug text-text-mid">
              {item.headline}
            </p>
            <div className="tnum mt-1 font-mono text-2xs text-text-low">
              {dateTimeStamp(item.timestamp)} · {item.source}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 font-mono text-text-low hover:text-text-hi"
            aria-label="Close explainer"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {history && <HistoricalFacts history={history} watchlist={watchlist} />}

          <div className="px-4 py-3">
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
              AI explainer
            </div>

            <div className="mt-2 space-y-3">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <p
                    key={i}
                    className="border-l-2 border-phos/40 pl-2 text-[13px] leading-relaxed text-phos/90"
                  >
                    {m.content}
                  </p>
                ) : (
                  <div
                    key={i}
                    className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-hi"
                  >
                    {m.content}
                  </div>
                ),
              )}

              {status === "streaming" && (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-hi">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-phos/70" />
                </div>
              )}

              {status === "loading" && (
                <div className="space-y-2.5" aria-label="Loading explanation">
                  <div className="skeleton h-3 w-11/12" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-4/5" />
                  <div className="mt-3 font-mono text-2xs text-text-low">
                    Asking the model…
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="border border-impact-high/30 bg-impact-high/5 p-3">
                  <p className="text-sm text-text-hi">
                    Couldn&apos;t get an explanation.
                  </p>
                  <p className="mt-1 text-xs text-text-mid">
                    The explainer service didn&apos;t respond. The raw headline
                    above is unaffected.
                  </p>
                  <button
                    onClick={() => request(messages)}
                    className="mt-3 border border-phos/50 bg-phos-faint px-3 py-1.5 text-xs font-medium text-phos hover:border-phos"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
            <div ref={threadEndRef} />
          </div>
        </div>

        <div className="border-t border-ink-800 px-4 py-2.5">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={mode === "static"}
              placeholder={
                mode === "static"
                  ? "Live AI available in the full deployment"
                  : "Ask a follow-up — “what happened to gold last time?”"
              }
              className="min-w-0 flex-1 border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none disabled:opacity-50"
              aria-label="Ask a follow-up question"
            />
            <button
              type="submit"
              disabled={mode === "static" || busy || !input.trim()}
              className="shrink-0 border border-phos/50 bg-phos-faint px-3 py-1.5 font-mono text-xs font-medium text-phos hover:border-phos disabled:opacity-40"
            >
              Ask
            </button>
          </form>
          <p className="mt-1.5 font-mono text-2xs text-text-low">
            AI interpretation is opt-in and never mixed into the feed.
          </p>
        </div>
      </aside>
    </>
  );
}
