"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { usePrefs } from "@/lib/store";
import { shortTime } from "@/lib/time";

type Status = "loading" | "streaming" | "done" | "error";

/**
 * Compact side panel (desktop) / bottom sheet (mobile) that streams the AI
 * explanation for one headline. AI text lives only in here — never in the
 * feed itself.
 */
export default function ExplainerPanel({
  item,
  onClose,
}: {
  item: NewsItem;
  onClose: () => void;
}) {
  const watchlist = usePrefs((s) => s.watchlist);
  const [status, setStatus] = useState<Status>("loading");
  const [text, setText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setText("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, watchlist }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      setStatus("streaming");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + decoder.decode(value, { stream: true }));
      }
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  }, [item, watchlist]);

  useEffect(() => {
    run();
    return () => abortRef.current?.abort();
  }, [run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* click-away scrim */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <aside
        className="fixed z-50 flex flex-col border-ink-700 bg-ink-900
                   inset-x-0 bottom-0 max-h-[72vh] border-t
                   md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[400px] md:border-l md:border-t-0"
        role="dialog"
        aria-label="AI explainer"
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
              {shortTime(item.timestamp)} · {item.source}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {status === "loading" && (
            <div className="space-y-2.5" aria-label="Loading explanation">
              <div className="skeleton h-3 w-11/12" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
              <div className="skeleton h-3 w-2/3" />
              <div className="mt-4 font-mono text-2xs text-text-low">
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
                onClick={run}
                className="mt-3 border border-phos/50 bg-phos-faint px-3 py-1.5 text-xs font-medium text-phos hover:border-phos"
              >
                Retry
              </button>
            </div>
          )}

          {(status === "streaming" || status === "done") && (
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-hi">
              {text}
              {status === "streaming" && (
                <span className="ml-0.5 inline-block h-3.5 w-[7px] translate-y-0.5 bg-phos/70" />
              )}
            </div>
          )}
        </div>

        <div className="border-t border-ink-800 px-4 py-2">
          <p className="font-mono text-2xs text-text-low">
            AI interpretation is opt-in and never mixed into the feed.
          </p>
        </div>
      </aside>
    </>
  );
}
