"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { getCorrelatedTickers, getDirectTickers } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider } from "@/lib/history";
import { usePrefs } from "@/lib/store";
import { exactDateTimeStamp, tzLabel } from "@/lib/time";
import { mockExplanation } from "@/lib/explainFallback";
import {
  isUnstructured,
  parseExplainSections,
  type ExplainSections,
} from "@/lib/explainSections";
import { MoveText, TickerChip } from "./atoms";
import HistoricalTable from "./HistoricalTable";

type Status = "loading" | "streaming" | "done" | "error";
/** "api" = route exists (live or canned server-side); "static" = GitHub Pages. */
type Mode = "api" | "static";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Quiet section label — the panel's structure should whisper, not shout. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
      {children}
    </div>
  );
}

function AiText({ text }: { text: string }) {
  return (
    <div className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text-hi">
      {text}
    </div>
  );
}

function AiSkeleton() {
  return (
    <div className="mt-1 space-y-2" aria-label="Loading">
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-4/5" />
    </div>
  );
}

/**
 * The Explain panel. Fixed section order (see the v3 spec):
 *   1 Raw event · 2 What it is · 3 Why markets care · 4 Instruments affected
 *   · 5 Observed reaction · 6 What traders may monitor next · 7 Historical
 *   reactions · 8 Sources · 9 Confidence & limitations · 10 Chat.
 * Sections 3 and 6 (and 2 when the event database has no definition) come
 * from the AI reply, parsed defensively — an unlabeled reply renders under a
 * single "Context" section instead of breaking. Structured facts (chips,
 * reactions, the historical table) never come from the model.
 */
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
    // Follow the thread only once a follow-up conversation is underway —
    // scrolling on the initial explanation would yank the sections out of view.
    if (messages.length > 1) {
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

  // The first assistant message is the initial explanation, distributed into
  // the panel's sections; everything after it is the follow-up chat thread.
  const initialText =
    messages[0]?.role === "assistant"
      ? messages[0].content
      : status === "streaming" && messages.length === 0
        ? streamingText
        : "";
  const initialLoading = messages.length === 0 && status === "loading";
  const initialError = messages.length === 0 && status === "error";
  const sections: ExplainSections = parseExplainSections(initialText);
  const unstructured = initialText !== "" && isUnstructured(sections);
  const chat = messages.slice(1);
  const followUpStreaming = status === "streaming" && messages.length > 0;

  const watch = new Set(watchlist.map((s) => s.toUpperCase()));
  const direct = [...getDirectTickers(item), ...(item.pairs ?? [])];
  const correlated = getCorrelatedTickers(item);
  // History-typical symbols not already tagged on the item render as a muted
  // "also typically reacts" line, never mixed into the item's own tags.
  const shown = new Set([...direct, ...correlated].map((s) => s.toUpperCase()));
  const typical = (history?.symbols ?? []).filter((s) => !shown.has(s.toUpperCase()));

  const aiSlot = (text: string | undefined) =>
    text ? (
      <AiText text={text} />
    ) : initialLoading || (status === "streaming" && messages.length === 0) ? (
      <AiSkeleton />
    ) : (
      <p className="mt-1 text-2xs text-text-low">—</p>
    );

  return (
    <>
      {/* click-away scrim */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <aside
        className="fixed z-50 flex flex-col border-ink-700 bg-ink-900
                   inset-x-0 bottom-0 max-h-[80vh] border-t
                   md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[440px] md:border-l md:border-t-0"
        role="dialog"
        aria-label="Explain"
      >
        {/* ── 1 · Raw event ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 border-b border-ink-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <SectionLabel>Raw event</SectionLabel>
            <p className="mt-1 text-[13px] font-medium leading-snug text-text-hi">
              {item.headline}
            </p>
            <div className="tnum mt-1 font-mono text-2xs text-text-mid">
              {item.source} · {exactDateTimeStamp(item.timestamp)} {tzLabel()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 font-mono text-text-low hover:text-text-hi"
            aria-label="Close Explain panel"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* ── 2 · What it is ──────────────────────────────────────────── */}
          <div className="border-b border-ink-800/60 px-4 py-3">
            <SectionLabel>What it is</SectionLabel>
            {history ? (
              <p className="mt-1 text-xs leading-relaxed text-text-hi">
                <span className="font-medium">{history.name}.</span>{" "}
                {history.definition}
              </p>
            ) : (
              aiSlot(sections.whatItIs)
            )}
          </div>

          {initialError ? (
            <div className="border-b border-ink-800/60 px-4 py-3">
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
            </div>
          ) : unstructured ? (
            /* Defensive path: unlabeled reply → one "Context" section. */
            <div className="border-b border-ink-800/60 px-4 py-3">
              <SectionLabel>Context</SectionLabel>
              <AiText text={sections.context ?? initialText} />
            </div>
          ) : (
            /* ── 3 · Why markets care ──────────────────────────────────── */
            <div className="border-b border-ink-800/60 px-4 py-3">
              <SectionLabel>Why markets care</SectionLabel>
              {aiSlot(sections.whyMarketsCare)}
            </div>
          )}

          {/* ── 4 · Instruments affected ────────────────────────────────── */}
          <div className="border-b border-ink-800/60 px-4 py-3">
            <SectionLabel>Instruments affected</SectionLabel>
            {direct.length > 0 && (
              <div className="mt-1.5">
                <span className="mr-1.5 font-mono text-2xs text-text-mid">Direct</span>
                <span className="inline-flex flex-wrap gap-1 align-middle">
                  {direct.map((s) => (
                    <TickerChip key={s} symbol={s} inWatchlist={watch.has(s.toUpperCase())} />
                  ))}
                </span>
              </div>
            )}
            {correlated.length > 0 && (
              <div className="mt-1.5">
                <span className="mr-1.5 font-mono text-2xs text-text-low">
                  Via correlation
                </span>
                <span className="inline-flex flex-wrap gap-1 align-middle">
                  {correlated.map((s) => (
                    <TickerChip
                      key={s}
                      symbol={s}
                      inWatchlist={watch.has(s.toUpperCase())}
                      variant="correlated"
                    />
                  ))}
                </span>
              </div>
            )}
            {direct.length === 0 && correlated.length === 0 && (
              <p className="mt-1 text-2xs text-text-low">
                No instruments tagged on this item.
              </p>
            )}
            {typical.length > 0 && (
              <p className="mt-1.5 text-2xs text-text-low">
                Also typically reacts: {typical.join(", ")}
              </p>
            )}
          </div>

          {/* ── 5 · Observed reaction ───────────────────────────────────── */}
          <div className="border-b border-ink-800/60 px-4 py-3">
            <SectionLabel>Observed reaction</SectionLabel>
            {item.marketReaction?.length ? (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {item.marketReaction.map((r) => (
                  <MoveText key={r.instrument} reaction={r} />
                ))}
              </div>
            ) : (
              <p className="mt-1 text-2xs text-text-low">
                No market reaction recorded on this item.
              </p>
            )}
            {!unstructured && sections.observedReaction && (
              <AiText text={sections.observedReaction} />
            )}
          </div>

          {/* ── 6 · What traders may monitor next ───────────────────────── */}
          {!unstructured && !initialError && (
            <div className="border-b border-ink-800/60 px-4 py-3">
              <SectionLabel>What traders may monitor next</SectionLabel>
              {aiSlot(sections.monitorNext)}
            </div>
          )}

          {/* ── 7 · Historical reactions ────────────────────────────────── */}
          {history && (
            <div className="border-b border-ink-800/60 px-4 py-3">
              <SectionLabel>Historical reactions</SectionLabel>
              <HistoricalTable history={history} />
              <p className="mt-1.5 text-2xs text-text-low">
                Curated dataset — mock data in the prototype; production uses a
                real historical events database.
              </p>
            </div>
          )}

          {/* ── 8 · Sources ─────────────────────────────────────────────── */}
          <div className="border-b border-ink-800/60 px-4 py-3">
            <SectionLabel>Sources</SectionLabel>
            <div className="mt-1 space-y-0.5">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-2xs text-phos/80 underline decoration-phos/30 hover:text-phos"
                  title={item.url}
                >
                  {item.source} — original source →
                </a>
              ) : (
                <p className="font-mono text-2xs text-text-mid">{item.source}</p>
              )}
              {history && (
                <p className="text-2xs text-text-low">
                  Definition &amp; historical table: TapeWire event database.
                </p>
              )}
            </div>
          </div>

          {/* ── 9 · Confidence & limitations ────────────────────────────── */}
          <div className="border-b border-ink-800/60 px-4 py-3">
            <SectionLabel>Confidence &amp; limitations</SectionLabel>
            <p className="mt-1 text-2xs leading-relaxed text-text-mid">
              Definition and historical table come from TapeWire&apos;s event
              database{history ? "" : " (no coverage for this event type)"}.
              AI commentary is model-generated context — labeled fact vs.
              inference, but it may be incomplete. All data in this prototype
              is mock.
            </p>
            {sections.footer.length > 0 && (
              <p className="mt-1 font-mono text-2xs text-text-low">
                {sections.footer.join(" · ")}
              </p>
            )}
          </div>

          {/* ── 10 · Follow-up chat thread ──────────────────────────────── */}
          {(chat.length > 0 || followUpStreaming) && (
            <div className="px-4 py-3">
              <SectionLabel>Follow-ups</SectionLabel>
              <div className="mt-2 space-y-3">
                {chat.map((m, i) =>
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
                {followUpStreaming && (
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-hi">
                    {streamingText}
                    <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-phos/70" />
                  </div>
                )}
                {status === "loading" && messages.length > 0 && (
                  <div className="font-mono text-2xs text-text-low">
                    Asking the model…
                  </div>
                )}
                {status === "error" && messages.length > 0 && (
                  <div className="border border-impact-high/30 bg-impact-high/5 p-2.5">
                    <p className="text-xs text-text-mid">
                      No reply — the explainer service didn&apos;t respond.
                    </p>
                    <button
                      onClick={() => request(messages)}
                      className="mt-2 border border-phos/50 bg-phos-faint px-2.5 py-1 text-xs font-medium text-phos hover:border-phos"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
              <div ref={threadEndRef} />
            </div>
          )}
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
