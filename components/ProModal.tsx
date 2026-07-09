"use client";

import { useState } from "react";
import { usePrefs } from "@/lib/store";

const PRO_FEATURES = [
  {
    name: "AI news journal",
    desc: "How news moved your watchlist over time — searchable, day by day.",
  },
  {
    name: "Unlimited custom sources",
    desc: "Any feed, blog, or account ingested into your tape.",
  },
  {
    name: "Faster refresh",
    desc: "Sub-second wire latency and priority feed polling.",
  },
];

export default function ProModal({ onClose }: { onClose: () => void }) {
  const { proInterestEmail, setProInterestEmail } = usePrefs();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const done = submitted || !!proInterestEmail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="TapeWire Pro"
    >
      <div
        className="w-full max-w-md border border-ink-700 bg-ink-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-impact-med">
              Pro · Coming soon
            </div>
            <h2 className="mt-1 text-lg font-semibold text-text-hi">
              TapeWire Pro — $12/mo
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

        <ul className="mt-4 space-y-3">
          {PRO_FEATURES.map((f) => (
            <li key={f.name} className="border-l-2 border-impact-med/40 pl-3">
              <div className="text-sm font-medium text-text-hi">{f.name}</div>
              <div className="text-xs text-text-mid">{f.desc}</div>
            </li>
          ))}
        </ul>

        {done ? (
          <div className="mt-5 border border-phos/30 bg-phos-faint px-3 py-2 text-sm text-phos">
            You&apos;re on the list — we&apos;ll email you when Pro launches.
          </div>
        ) : (
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.includes("@")) return;
              setProInterestEmail(email);
              setSubmitted(true);
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@desk.com"
              className="min-w-0 flex-1 border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-phos focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 border border-phos/50 bg-phos-faint px-4 py-2 text-sm font-medium text-phos hover:border-phos"
            >
              Notify me
            </button>
          </form>
        )}

        <p className="mt-3 text-2xs text-text-low">
          Prototype note: this is an interest list, not a checkout.
        </p>
      </div>
    </div>
  );
}
