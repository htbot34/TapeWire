"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProModal from "@/components/ProModal";
import {
  AssetClassPicker,
  SourcesEditor,
  WatchlistEditor,
} from "@/components/prefs-editors";
import { usePrefs } from "@/lib/store";

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
  const router = useRouter();
  const { resetAll, proInterestEmail, breakingAudio, toggleBreakingAudio } = usePrefs();
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

        <Section title="Sources">
          <SourcesEditor />
        </Section>

        <Section title="Alerts">
          <label className="flex cursor-pointer items-center gap-2.5">
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
            A short squawk-style blip when a breaking headline takes over the
            banner. Browsers only allow sound after you&apos;ve interacted with
            the page.
          </p>
        </Section>

        <Section title="TapeWire Pro">
          <p className="text-sm text-text-mid">
            AI news journal, unlimited custom sources, faster refresh.
          </p>
          <button
            onClick={() => setProOpen(true)}
            className="mt-3 border border-impact-med/50 px-4 py-2 text-sm font-medium text-impact-med hover:border-impact-med"
          >
            {proInterestEmail ? "You're on the Pro list" : "Learn about Pro — $12/mo"}
          </button>
        </Section>

        <Section title="Demo">
          <p className="text-sm text-text-mid">
            Clears all preferences and restarts onboarding.
          </p>
          <button
            onClick={() => {
              resetAll();
              sessionStorage.removeItem("tw-landed");
              router.replace("/onboarding");
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
