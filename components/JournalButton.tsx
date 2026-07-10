"use client";

import { useEffect, useState } from "react";
import type { NewsItem } from "@/lib/news/types";
import { journalProvider } from "@/lib/journal";
import SaveToJournalSheet from "./SaveToJournalSheet";

/**
 * The forward-arrow affordance next to "?" on every row: opens the compact
 * "Save to Journal" sheet. Once the item has an entry, the arrow becomes a
 * filled check so the trader can see what's already journaled.
 */
export default function JournalButton({ item }: { item: NewsItem }) {
  const [journaled, setJournaled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      journalProvider.getJournaledNewsIds().then((ids) => {
        if (alive) setJournaled(ids.has(item.id));
      });
    refresh();
    const unsub = journalProvider.subscribe(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [item.id]);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`shrink-0 rounded-sm border px-1.5 font-mono text-2xs ${
          journaled
            ? "border-phos/60 bg-phos-faint text-phos"
            : "border-ink-700 text-text-low opacity-70 hover:border-phos hover:text-phos group-hover:opacity-100"
        }`}
        title={journaled ? "In your journal — save again" : "Save to journal"}
        aria-label={`Save to journal: ${item.headline}`}
      >
        {journaled ? "✓" : "→"}
      </button>
      {open && (
        <SaveToJournalSheet item={item} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
