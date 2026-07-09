"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrefs } from "@/lib/store";
import Header from "./Header";
import BreakingBanner from "./BreakingBanner";

/**
 * Shared chrome for the feed and briefing screens: header + breaking banner.
 * Also gates on onboarding — first-run users are sent to /onboarding.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { onboarded, _hasHydrated } = usePrefs();

  useEffect(() => {
    if (_hasHydrated && !onboarded) router.replace("/onboarding");
  }, [_hasHydrated, onboarded, router]);

  if (!_hasHydrated || !onboarded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-mono text-xs tracking-[0.3em] text-text-low">
          TAPEWIRE
        </span>
      </div>
    );
  }

  return (
    <>
      <Header />
      <BreakingBanner />
      {children}
    </>
  );
}
