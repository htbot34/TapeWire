"use client";

// Squawk-style audio tick for breaking alerts. Pure WebAudio (no assets), so
// it works on the static GitHub Pages build too. Browsers block audio until
// the page has seen a user gesture — we lazily create the context and try to
// resume it; if the browser refuses (a real wire alert landing before any
// interaction), we fail silently rather than throw.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Two short high blips, ~0.2s total — sharp enough for peripheral attention. */
export function playBreakingTick(): void {
  try {
    const ac = getContext();
    if (!ac) return;
    if (ac.state === "suspended") {
      // resume() only succeeds after a user gesture; ignore rejection.
      void ac.resume().catch(() => {});
    }
    const t0 = ac.currentTime;
    for (const offset of [0, 0.12]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.07);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.09);
    }
  } catch {
    // Audio is best-effort; never let an alert sound break the banner.
  }
}
