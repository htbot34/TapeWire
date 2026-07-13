"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import ProModal from "@/components/ProModal";
import {
  AlertSensitivityEditor,
  AssetClassPicker,
  SourcesEditor,
  TradingProfileEditor,
  WatchlistEditor,
} from "@/components/prefs-editors";
import type { FeedbackKind } from "@/lib/feedback";
import { ALL_FEEDBACK_KINDS, FEEDBACK_LABEL, feedbackProvider } from "@/lib/feedback";
import TrustRulesLink from "@/components/TrustRulesModal";
import { usePrefs } from "@/lib/store";

function FeedbackSection() {
  const [counts, setCounts] = useState<Record<FeedbackKind, number> | null>(null);

  useEffect(() => {
    const refresh = () =>
      feedbackProvider.getAll().then((records) => {
        const next = Object.fromEntries(
          ALL_FEEDBACK_KINDS.map((k) => [k, 0]),
        ) as Record<FeedbackKind, number>;
        for (const r of records) next[r.kind] += 1;
        setCounts(next);
      });
    refresh();
    return feedbackProvider.subscribe(refresh);
  }, []);

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <p className="text-sm text-text-mid">
        Relevance judgments from the ⋯ control on feed and briefing rows,
        plus Useful / False alarm from the breaking banner. Nothing consumes
        this yet — in production, row feedback trains your personal ranking
        and banner feedback tunes the takeover thresholds.
      </p>
      {counts && (
        <ul className="mt-3 space-y-1">
          {ALL_FEEDBACK_KINDS.map((kind) => (
            <li key={kind} className="flex items-baseline gap-2 font-mono text-xs">
              <span className="text-text-mid">{FEEDBACK_LABEL[kind]}</span>
              <span className="flex-1 border-b border-dotted border-ink-700" />
              <span className="tnum text-text-hi">{counts[kind]}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => feedbackProvider.clearAll()}
        disabled={total === 0}
        className="mt-3 border border-ink-700 px-4 py-2 text-sm text-text-mid hover:border-impact-high hover:text-impact-high/90 disabled:opacity-40"
      >
        Clear all feedback
      </button>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-ink-800 bg-ink-900 p-5">
      <h2 className="font-mono text-2xs uppercase tracking-[0.25em] text-text-low">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const {
    resetAll,
    proInterestEmail,
    breakingAudio,
    toggleBreakingAudio,
    compactBanner,
    toggleCompactBanner,
  } = usePrefs();
  const [proOpen, setProOpen] = useState(false);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl space-y-4 px-3 py-6 sm:px-4">
        <h1 className="text-lg font-semibold text-text-hi">Settings</h1>

        <Section title="What you trade">
          <AssetClassPicker />
        </Section>

        <Section title="Watchlist">
          <WatchlistEditor />
        </Section>

        <Section title="How you trade">
          <TradingProfileEditor />
        </Section>

        <Section title="Sources">
          <SourcesEditor />
        </Section>

        <Section title="Alerts">
          <AlertSensitivityEditor />
          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={compactBanner}
              onChange={toggleCompactBanner}
              className="h-3.5 w-3.5 accent-[#4fb8a6]"
            />
            <span className="text-sm text-text-hi">Compact banner</span>
          </label>
          <p className="mt-1.5 text-2xs text-text-low">
            Qualifying Critical alerts take over the banner by default (the
            exact rule is in Trust rules). Turn this on to use the compact
            two-line alert instead. Try both with the ⚡ button.
          </p>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={breakingAudio}
              onChange={toggleBreakingAudio}
              className="h-3.5 w-3.5 accent-[#4fb8a6]"
            />
            <span className="text-sm text-text-hi">
              Audio tick on breaking alerts
            </span>
          </label>
          <p className="mt-1.5 text-2xs text-text-low">
            A short squawk-style blip when a breaking headline hits the banner
            — applies in both alert modes. Browsers only allow sound after
            you&apos;ve interacted with the page.
          </p>
        </Section>

        <Section title="Your feedback">
          <FeedbackSection />
        </Section>

        <Section title="Plans & pricing">
          <p className="text-sm text-text-mid">
            Core $39/mo · Pro $79/mo · Founding Trader $24/mo locked for a
            year (first 100 users). Free 14-day trial on every plan.
          </p>
          <button
            onClick={() => setProOpen(true)}
            className="mt-3 border border-impact-med/50 px-4 py-2 text-sm font-medium text-impact-med hover:border-impact-med"
          >
            {proInterestEmail ? "You're on the list — view plans" : "View plans"}
          </button>
        </Section>

        <Section title="Trust">
          <p className="text-sm text-text-mid">
            The ten product rules TapeWire is built against — raw before AI,
            fact vs. inference, visible corrections, honest rankings.
          </p>
          <TrustRulesLink className="mt-3 inline-block border border-ink-700 px-4 py-2 font-mono text-xs uppercase tracking-wide text-text-mid hover:border-phos hover:text-phos" />
        </Section>

        <Section title="Demo">
          <p className="text-sm text-text-mid">
            Clears all preferences, journal entries and feedback, reseeds the
            demo data, and restarts onboarding.
          </p>
          <button
            onClick={() => {
              resetAll();
              // Clear the provider-owned blobs too, then hard-reload so the
              // in-memory provider singletons reseed from scratch.
              localStorage.removeItem("tapewire-journal");
              localStorage.removeItem("tapewire-feedback");
              sessionStorage.removeItem("tw-landed");
              window.location.assign(
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/onboarding/`,
              );
            }}
            className="mt-3 border border-impact-high/40 px-4 py-2 text-sm text-impact-high/90 hover:border-impact-high"
          >
            Reset demo
          </button>
        </Section>
      </main>
      {proOpen && <ProModal onClose={() => setProOpen(false)} />}
    </>
  );
}
