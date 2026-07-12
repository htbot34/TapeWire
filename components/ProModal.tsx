"use client";

import { useState } from "react";
import { usePrefs } from "@/lib/store";

// Fake-door pricing test for design-partner sessions (see README). Interest
// is captured per tier to localStorage; nothing is charged, and the modal
// says so.

interface Tier {
  id: string;
  name: string;
  price: string;
  cadence: string;
  features: string[];
  highlight?: boolean;
  note?: string;
}

const TIERS: Tier[] = [
  {
    id: "founding",
    name: "Founding Trader",
    price: "$24",
    cadence: "/mo locked for 1 year",
    features: [
      "Everything in Pro",
      "First 100 users only",
      "Direct line to the founders",
    ],
    highlight: true,
    note: "The design-partner offer",
  },
  {
    id: "core",
    name: "Core",
    price: "$39",
    cadence: "/mo",
    features: ["Your Focus briefing", "Personalized feed", "Journal & Replay", "Limited AI explainers"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79",
    cadence: "/mo",
    features: [
      "Move Detective",
      "Full historical reactions",
      "Unlimited AI",
      "Advanced alerts",
    ],
  },
];

export default function ProModal({ onClose }: { onClose: () => void }) {
  const {
    proInterestEmail,
    setProInterestEmail,
    proTierInterest,
    toggleProTierInterest,
  } = usePrefs();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const emailDone = submitted || !!proInterestEmail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="TapeWire pricing"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-ink-700 bg-ink-900 p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-2xs uppercase tracking-[0.2em] text-impact-med">
              Pricing · validation test
            </div>
            <h2 className="mt-1 text-lg font-semibold text-text-hi">
              Would you use TapeWire at $39/month?
            </h2>
            <p className="mt-1 text-xs text-text-mid">
              Every plan starts with a free 14-day trial of the full product.
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-text-low hover:text-text-hi"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TIERS.map((t) => {
            const interested = proTierInterest.includes(t.id);
            return (
              <div
                key={t.id}
                className={`flex flex-col border p-3.5 ${
                  t.highlight
                    ? "border-phos/60 bg-phos-faint/40"
                    : "border-ink-700 bg-ink-950/40"
                }`}
              >
                {t.note && (
                  <div className="mb-1 font-mono text-2xs uppercase tracking-wide text-phos">
                    {t.note}
                  </div>
                )}
                <div className="text-sm font-semibold text-text-hi">{t.name}</div>
                <div className="mt-0.5">
                  <span className="tnum font-mono text-xl font-bold text-text-hi">
                    {t.price}
                  </span>
                  <span className="ml-1 font-mono text-2xs text-text-mid">
                    {t.cadence}
                  </span>
                </div>
                <ul className="mt-2 flex-1 space-y-1">
                  {t.features.map((f) => (
                    <li key={f} className="text-xs leading-snug text-text-mid">
                      · {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => toggleProTierInterest(t.id)}
                  className={`mt-3 border px-3 py-1.5 text-xs font-medium ${
                    interested
                      ? "border-phos bg-phos-faint text-phos"
                      : t.highlight
                        ? "border-phos/50 text-phos hover:border-phos"
                        : "border-ink-700 text-text-mid hover:border-phos hover:text-phos"
                  }`}
                  aria-pressed={interested}
                >
                  {interested ? "✓ Interested" : "I'd pay this"}
                </button>
              </div>
            );
          })}
        </div>

        {emailDone ? (
          <div className="mt-4 border border-phos/30 bg-phos-faint px-3 py-2 text-sm text-phos">
            You&apos;re on the list — we&apos;ll email you when plans launch.
          </div>
        ) : (
          <form
            className="mt-4 flex gap-2"
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
              aria-label="Email for launch notification"
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
          Prototype note: this is a pricing validation test, not a checkout —
          nothing is charged and no card is ever requested.
        </p>
      </div>
    </div>
  );
}
