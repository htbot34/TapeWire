"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/lib/store";
import TrustRulesLink from "./TrustRulesModal";

const STRIP: { kicker: string; title: string; body: string }[] = [
  {
    kicker: "Before the session",
    title: "Your Focus",
    body: "A ranked overnight briefing scoped to your instruments — every item justifies itself on your watchlist, its market impact, and why it matters right now.",
  },
  {
    kicker: "During the session",
    title: "Live catalyst alerts",
    body: "Breaking headlines take over the banner only on a strict, published rule — with confidence labels, recorded reactions, and a one-click factual AI brief.",
  },
  {
    kicker: "After the session",
    title: "Replay",
    body: "Save the events that moved your markets: outcomes, points, chart screenshots — and see how the same event behaved every time before.",
  },
];

/**
 * Pre-onboarding landing — the only screen a first-run visitor sees
 * (app/page.tsx gates on the persisted onboarded flag). Static-export safe:
 * no data fetches, plain links, dark terminal aesthetic.
 */
export default function Landing() {
  const router = useRouter();
  const applyDefaults = usePrefs((s) => s.applyDefaults);

  const skipToDemo = () => {
    // Same shortcut as onboarding's "Skip — use defaults": sensible default
    // prefs, onboarded=true, straight onto the tape.
    applyDefaults();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-mono text-sm font-bold tracking-[0.25em] text-text-hi">
          TAPE<span className="text-phos">WIRE</span>
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest text-text-low">
          Prototype · mock data
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10">
        <div className="max-w-2xl">
          <div className="font-mono text-2xs uppercase tracking-[0.3em] text-phos">
            A news terminal for day traders
          </div>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-text-hi sm:text-5xl">
            Your market, already filtered.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-text-mid">
            TapeWire ranks the news that matters to what you trade, explains
            unexpected moves, and builds a searchable history of how your
            markets reacted.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding"
              className="border border-phos/60 bg-phos-faint px-5 py-2.5 text-sm font-semibold text-phos hover:border-phos"
            >
              Set up your tape — under 60 seconds
            </Link>
            <button
              onClick={skipToDemo}
              className="px-3 py-2.5 font-mono text-xs uppercase tracking-widest text-text-low hover:text-text-mid"
            >
              Skip to the demo feed →
            </button>
          </div>
        </div>

        {/* Three-part session strip */}
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {STRIP.map((s) => (
            <div key={s.kicker} className="border border-ink-800 bg-ink-900/60 p-4">
              <div className="font-mono text-2xs uppercase tracking-[0.2em] text-text-low">
                {s.kicker}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-text-hi">{s.title}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-text-mid">{s.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-5">
        <span className="font-mono text-2xs text-text-low/70">
          Raw headlines first · AI is opt-in and never mixed into the feed
        </span>
        <TrustRulesLink />
      </footer>
    </div>
  );
}
