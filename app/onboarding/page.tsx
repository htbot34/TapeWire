"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrefs, DEFAULT_WATCHLIST, DEFAULT_ASSET_CLASSES } from "@/lib/store";
import {
  AlertSensitivityEditor,
  AssetClassPicker,
  SourcesEditor,
  TradingProfileEditor,
  WatchlistEditor,
} from "@/components/prefs-editors";

// Four short steps, all skippable to defaults, total well under 3 minutes.
const STEPS = [
  {
    title: "What do you trade?",
    sub: "We use this to keep macro headlines relevant to your instruments.",
  },
  {
    title: "Your watchlist",
    sub: "The feed and Your Focus briefing are filtered to these symbols.",
  },
  {
    title: "How you trade",
    sub: "Session and style shape your ranking; sensitivity decides which alerts take over the banner.",
  },
  {
    title: "Sources & personalities you follow",
    sub: "Pick the feeds that make up your tape — and add any account or site we missed (@handle or URL).",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const prefs = usePrefs();
  const [step, setStep] = useState(0);

  const finish = () => {
    // Backfill sensible defaults for anything left empty so the demo feed is
    // never blank on first run.
    if (prefs.assetClasses.length === 0) {
      DEFAULT_ASSET_CLASSES.forEach((a) => prefs.toggleAssetClass(a));
    }
    if (prefs.watchlist.length === 0) {
      DEFAULT_WATCHLIST.forEach((s) => prefs.addSymbol(s));
    }
    prefs.setOnboarded(true);
    router.replace("/");
  };

  const skip = () => {
    prefs.applyDefaults();
    router.replace("/");
  };

  const canAdvance =
    step === 0 ? prefs.assetClasses.length > 0 : step === 1 ? prefs.watchlist.length > 0 : true;

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-sm font-bold tracking-[0.25em] text-text-hi">
            TAPE<span className="text-phos">WIRE</span>
          </span>
          <button
            onClick={skip}
            className="font-mono text-2xs uppercase tracking-widest text-text-low hover:text-text-mid"
          >
            Skip — use defaults
          </button>
        </div>

        {/* progress */}
        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 ${i <= step ? "bg-phos" : "bg-ink-800"}`}
            />
          ))}
          <span className="tnum ml-1 font-mono text-2xs text-text-low">
            {step + 1}/{STEPS.length}
          </span>
        </div>

        <div className="mt-6 border border-ink-800 bg-ink-900 p-5 sm:p-6">
          <h1 className="text-lg font-semibold text-text-hi">
            {STEPS[step].title}
          </h1>
          <p className="mt-1 text-sm text-text-mid">{STEPS[step].sub}</p>

          <div className="mt-5">
            {step === 0 && <AssetClassPicker />}
            {step === 1 && <WatchlistEditor />}
            {step === 2 && (
              <div className="space-y-5">
                <TradingProfileEditor />
                <AlertSensitivityEditor />
              </div>
            )}
            {step === 3 && <SourcesEditor />}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-2 py-2 font-mono text-xs uppercase tracking-widest text-text-low hover:text-text-mid disabled:invisible"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance}
              className="border border-phos/50 bg-phos-faint px-5 py-2 text-sm font-medium text-phos hover:border-phos disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              className="border border-phos/50 bg-phos-faint px-5 py-2 text-sm font-medium text-phos hover:border-phos"
            >
              Open the tape →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
