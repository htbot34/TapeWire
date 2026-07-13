"use client";

import { useEffect, useState } from "react";

// The ten-rule doctrine, mirrored from TRUST.md (kept in sync by hand in the
// prototype — a build step would single-source this in production).
const RULES: { rule: string; how: string }[] = [
  {
    rule: "Raw information always appears before AI interpretation.",
    how: "The feed is raw headlines only; AI lives behind the opt-in Explain panel, where the Raw event section renders first.",
  },
  {
    rule: "Every event must have a source.",
    how: "Every item carries a named source, source type and a View source link; the Explain panel has a dedicated Sources section.",
  },
  {
    rule: "AI must distinguish fact from inference.",
    how: "The explainer prompt enforces Fact:/Inference: labeling; the canned fallback follows the same contract.",
  },
  {
    rule: "A catalyst is never labeled confirmed without evidence.",
    how: "Move Detective (preview) uses a five-label taxonomy with honest negatives — time-proximity alone never yields Confirmed.",
  },
  {
    rule: "No fabricated historical reactions.",
    how: "Historical tables render only from the curated event database; no coverage means no table, never an invented one.",
  },
  {
    rule: "Corrections are visible.",
    how: "Corrected items show a CORRECTED tag plus the correction text; the original headline is never silently rewritten.",
  },
  {
    rule: "Critical information is never delayed while waiting for AI.",
    how: "The banner and feed render with zero AI calls; Explain loads AI sections after the structured facts are on screen.",
  },
  {
    rule: "AI does not secretly change or rewrite source headlines.",
    how: "Headlines render verbatim from the data layer everywhere.",
  },
  {
    rule: "Users can view why an event was ranked.",
    how: "Every Your Focus item carries the deterministic three-pillar rationale (your instruments / market impact / why now, plus relevance chains) — generic reasons are never emitted.",
  },
  {
    rule: "Advertising or affiliate relationships never influence rankings.",
    how: "Production commitment — the prototype has no advertising; ranking-engine inputs are documented and contain no commercial terms.",
  },
];

function TrustRulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="TapeWire trust rules"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto border border-ink-700 bg-ink-900 p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-phos">
              Product doctrine
            </div>
            <h2 className="mt-1 text-lg font-semibold text-text-hi">
              TapeWire trust rules
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-low hover:text-text-hi"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {RULES.map((r, i) => (
            <li key={i} className="border-l-2 border-ink-700 pl-3">
              <div className="text-sm font-medium leading-snug text-text-hi">
                {i + 1}. {r.rule}
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-text-mid">
                {r.how}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-2xs leading-relaxed text-text-mid">
          <span className="font-mono text-2xs uppercase tracking-wide text-text-low">
            Banner takeover rule ·{" "}
          </span>
          An alert takes over only when it is Critical AND (a red-folder
          scheduled release OR a recorded reaction ≥ 0.5% on an index / 5bp
          on rates / 0.75% on FX). Deterministic, no exceptions; your False
          alarm / Useful feedback is what tunes these thresholds.
        </p>

        <p className="mt-3 text-2xs text-text-low">
          Full text lives in TRUST.md in the repository. Where a rule isn&apos;t
          applicable to the prototype yet, it&apos;s marked a production
          commitment — never quietly skipped.
        </p>
      </div>
    </div>
  );
}

/** Quiet "Trust rules" link that opens the doctrine modal. */
export default function TrustRulesLink({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          className ??
          "font-mono text-2xs uppercase tracking-wide text-text-low hover:text-text-mid"
        }
      >
        Trust rules
      </button>
      {open && <TrustRulesModal onClose={() => setOpen(false)} />}
    </>
  );
}
