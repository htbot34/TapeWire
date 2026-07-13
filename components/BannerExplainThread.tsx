"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { exactDateTimeStamp, tzLabel } from "@/lib/time";
import { mockBannerBrief } from "@/lib/explainFallback";
import { ReactionChip, SourceLatencyLine } from "./atoms";

type Status = "loading" | "streaming" | "done" | "error";
/** "api" = route exists (live or canned server-side); "static" = GitHub Pages. */
type Mode = "api" | "static";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The lightweight chat thread behind the breaking banner's Explain button:
 * right-side panel on desktop, bottom sheet on narrow viewports. First
 * message is an automatic CONCISE AI briefing (2–3 sentences, facts only —
 * the route gets an explicit brevity instruction for this context); below it
 * the trader can ask follow-ups, with prior turns sent as context. Same
 * neutral system prompt as the full Explain panel; explainFallback behavior
 * preserved when the API is unavailable.
 */
export default function BannerExplainThread({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const watchlist = usePrefs((s) => s.watchlist);
  const assetClasses = usePrefs((s) => s.assetClasses);
  const tradingSession = usePrefs((s) => s.tradingSession);
  const tradingStyle = usePrefs((s) => s.tradingStyle);
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
          body: JSON.stringify({
            item,
            watchlist,
            messages: thread,
            profile: { tradingSession, tradingStyle, assetClasses, watchlist },
            context: "banner",
          }),
          signal: controller.signal,
        });
        // Static hosting (GitHub Pages) has no API route at all — fall back
        // to the canned concise brief; follow-ups are disabled.
        if (res.status === 404 || res.status === 405) {
          setMode("static");
          setMessages([
            ...thread,
            { role: "assistant", content: mockBannerBrief(item) },
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
    [item, watchlist, assetClasses, tradingSession, tradingStyle],
  );

  // New item → reset the thread, auto-generate the concise brief.
  useEffect(() => {
    setMessages([]);
    setInput("");
    request([]);
    return () => abortRef.current?.abort();
  }, [item, request]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
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

  return (
    <>
      {/* click-away scrim */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <aside
        className="fixed z-50 flex flex-col border-ink-700 bg-ink-900
                   inset-x-0 bottom-0 max-h-[75vh] border-t
                   md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[400px] md:border-l md:border-t-0"
        role="dialog"
        aria-label="Breaking event briefing"
      >
        {/* Raw event header — raw information before AI (trust rule 1) */}
        <div className="flex items-start gap-3 border-b border-ink-800 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-2xs font-bold uppercase tracking-[0.25em] text-impact-high">
              Breaking · brief
            </div>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-text-hi">
              {item.headline}
            </p>
            <div className="tnum mt-1 font-mono text-2xs text-text-mid">
              {exactDateTimeStamp(item.timestamp)} {tzLabel()}
            </div>
            <div className="tnum mt-0.5">
              <SourceLatencyLine item={item} />
            </div>
            {item.marketReaction && item.marketReaction.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.marketReaction.map((r) => (
                  <ReactionChip key={r.instrument} reaction={r} />
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 font-mono text-text-low hover:text-text-hi"
            aria-label="Close briefing"
          >
            ✕
          </button>
        </div>

        {/* Thread */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.length === 0 && status === "loading" && (
            <div className="space-y-2" aria-label="Loading briefing">
              <div className="skeleton h-3 w-11/12" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          )}
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
          {status === "loading" && messages.length > 0 && (
            <div className="font-mono text-2xs text-text-low">Asking the model…</div>
          )}
          {status === "error" && (
            <div className="border border-impact-high/30 bg-impact-high/5 p-2.5">
              <p className="text-xs text-text-mid">
                No reply — the explainer service didn&apos;t respond. The raw
                headline above is unaffected.
              </p>
              <button
                onClick={() => request(messages)}
                className="mt-2 border border-phos/50 bg-phos-faint px-2.5 py-1 text-xs font-medium text-phos hover:border-phos"
              >
                Retry
              </button>
            </div>
          )}
          <div ref={threadEndRef} />
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
                  : "Ask a follow-up — “which names have the most exposure?”"
              }
              className="min-w-0 flex-1 border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none disabled:opacity-50"
              aria-label="Ask a follow-up question about this breaking event"
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
            AI briefing — facts only, never advice. Raw headline unaffected.
          </p>
        </div>
      </aside>
    </>
  );
}
