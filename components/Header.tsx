"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clockTime } from "@/lib/time";
import { simulateBreakingNews } from "@/lib/news";
import ProModal from "./ProModal";

function NavTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`border-b-2 px-1 pb-1 pt-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
        active
          ? "border-phos text-text-hi"
          : "border-transparent text-text-low hover:text-text-mid"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const [now, setNow] = useState<string>("");
  const [proOpen, setProOpen] = useState(false);

  useEffect(() => {
    setNow(clockTime());
    const t = setInterval(() => setNow(clockTime()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
    {/* Note: the Pro modal must be a sibling of <header>, not a child — the
        header's backdrop-blur creates a containing block that would trap the
        fixed-position modal inside the 44px bar. */}
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex h-11 max-w-6xl items-center gap-4 px-3 sm:gap-6 sm:px-4">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-mono text-sm font-bold tracking-[0.25em] text-text-hi">
            TAPE<span className="text-phos">WIRE</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-4">
          <NavTab href="/" label="Feed" />
          <NavTab href="/briefing" label="Briefing" />
          <NavTab href="/journal" label="Journal" />
          <NavTab href="/calendar" label="Calendar" />
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setProOpen(true)}
            className="rounded-sm border border-impact-med/40 px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-widest text-impact-med hover:border-impact-med"
            title="TapeWire Pro — coming soon"
          >
            Pro
          </button>

          <span className="tnum hidden font-mono text-xs text-text-mid sm:inline" suppressHydrationWarning>
            {now}
          </span>

          <Link
            href="/settings"
            className="text-text-low hover:text-text-mid"
            title="Settings"
            aria-label="Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {/* Dev-only: fires a canned high-impact item through the breaking
              pipeline so the banner takeover can be demoed on command. */}
          <button
            onClick={() => simulateBreakingNews()}
            className="text-text-low/60 hover:text-impact-high"
            title="Simulate breaking news (dev)"
            aria-label="Simulate breaking news"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    {proOpen && <ProModal onClose={() => setProOpen(false)} />}
    </>
  );
}
