"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import FeedView from "@/components/FeedView";
import Landing from "@/components/Landing";
import { usePrefs } from "@/lib/store";
import { isPreMarket } from "@/lib/time";

export default function FeedPage() {
  const router = useRouter();
  const { onboarded, _hasHydrated } = usePrefs();

  // Before market open (09:30 local), the first landing of a session goes to
  // the morning briefing — the daily-habit anchor. Only once per browser
  // session so navigating back to the feed sticks.
  useEffect(() => {
    if (!_hasHydrated || !onboarded) return;
    if (isPreMarket() && !sessionStorage.getItem("tw-landed")) {
      sessionStorage.setItem("tw-landed", "1");
      router.replace("/briefing");
    } else {
      sessionStorage.setItem("tw-landed", "1");
    }
  }, [_hasHydrated, onboarded, router]);

  // Pre-hydration placeholder avoids a landing-page flash for returning
  // users (prefs live in localStorage).
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-mono text-xs tracking-[0.3em] text-text-low">
          TAPEWIRE
        </span>
      </div>
    );
  }

  // First-run visitors get the landing; onboarding's finish()/skip() set the
  // persisted flag that flips this to the product.
  if (!onboarded) return <Landing />;

  return (
    <AppShell>
      <FeedView />
    </AppShell>
  );
}
