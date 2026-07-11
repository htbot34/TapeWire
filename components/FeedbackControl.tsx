"use client";

import { useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import type { FeedbackKind } from "@/lib/feedback";
import { FEEDBACK_KINDS, FEEDBACK_LABEL, feedbackProvider } from "@/lib/feedback";

/**
 * Quiet per-row relevance control (the "⋯" in the action cluster): Useful ·
 * Not relevant · Wrong asset mapping · Wrong catalyst. Deliberately a
 * power-user affordance, not a social button — no thumbs, no counts on the
 * row. One judgment per item; selecting the same option again clears it.
 * Selections persist behind FeedbackProvider (ranking-engine training data).
 */
export default function FeedbackControl({ item }: { item: NewsItem }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FeedbackKind | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      feedbackProvider.getForItem(item.id).then((k) => {
        if (alive) setSelected(k);
      });
    refresh();
    const unsub = feedbackProvider.subscribe(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [item.id]);

  // Close on click-away.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = async (kind: FeedbackKind) => {
    if (selected === kind) {
      await feedbackProvider.clearFeedback(item.id);
    } else {
      await feedbackProvider.setFeedback(item.id, item.headline, kind);
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 1200);
    }
    setOpen(false);
  };

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`shrink-0 rounded-sm border px-1.5 font-mono text-2xs ${
          selected
            ? "border-ink-700 text-text-mid"
            : "border-ink-700 text-text-low opacity-70 hover:border-phos hover:text-phos group-hover:opacity-100"
        }`}
        title={
          selected
            ? `Your feedback: ${FEEDBACK_LABEL[selected]}`
            : "Rate this item's relevance (trains your ranking)"
        }
        aria-label={`Feedback: ${item.headline}`}
        aria-expanded={open}
      >
        {confirmed ? "✓" : selected ? "✓" : "⋯"}
      </button>

      {open && (
        <span
          className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col border border-ink-700 bg-ink-900 py-1 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {FEEDBACK_KINDS.map((kind) => (
            <button
              key={kind}
              onClick={() => choose(kind)}
              className={`px-2.5 py-1 text-left font-mono text-2xs ${
                selected === kind
                  ? "bg-phos-faint text-phos"
                  : "text-text-mid hover:bg-ink-850 hover:text-text-hi"
              }`}
            >
              {FEEDBACK_LABEL[kind]}
              {selected === kind ? " · clear" : ""}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
