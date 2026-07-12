import type { NewsItem } from "@/lib/news/types";
import type { MoveAnalysis, MoveDetectiveProvider } from "./types";

// Hand-written analyses keyed to specific mock events by headline fragment.
// Everything here is simulated — the UI badges it "PREVIEW — simulated
// analysis". Production requirements are documented in ARCHITECTURE.md.

const ANALYSES: { headlineIncludes: string; analysis: MoveAnalysis }[] = [
  {
    headlineIncludes: "EXPANDED SEMICONDUCTOR EXPORT RESTRICTIONS",
    analysis: {
      label: "Likely catalyst",
      confidence: 82,
      move: { instrument: "NQ", move: "-0.9%", interval: "2m" },
      narrative:
        "NQ −0.9% in 2m on elevated volume. A semiconductor-export headline appeared 11 seconds before the move. NVDA and SOXX declined simultaneously, NQ underperformed ES, and 10Y yields were stable — consistent with a technology-specific catalyst rather than a broad rates move.",
    },
  },
  {
    headlineIncludes: "US CPI M/M +0.2% VS +0.3% EXPECTED",
    analysis: {
      label: "Confirmed catalyst",
      confidence: 97,
      move: { instrument: "NQ", move: "+1.3%", interval: "5m" },
      narrative:
        "NQ +1.3% in 5m starting within one second of the 08:30:00 ET scheduled release timestamp. Rates, the dollar and index futures repriced simultaneously in the direction implied by the cooler print, and no competing headline appeared in the window — a scheduled release with a synchronized cross-asset response is the strongest causal signature the system recognizes.",
    },
  },
  {
    headlineIncludes: "THE TIME HAS COME FOR POLICY TO ADJUST",
    analysis: {
      label: "Confirmed catalyst",
      confidence: 95,
      move: { instrument: "ES", move: "+1.1%", interval: "2m" },
      narrative:
        "ES +1.1% in 2m with 2Y yields down 9bp in the same window. The move began mid-quote as the attributed Powell remark crossed the wire, led by rate-sensitive assets and confirmed by a simultaneous dollar drop — the classic signature of a policy-language catalyst.",
    },
  },
  {
    headlineIncludes: "TSMC JUNE-QUARTER REVENUE",
    analysis: {
      label: "Possible contributor",
      confidence: 45,
      move: { instrument: "NQ", move: "+0.4%", interval: "overnight" },
      narrative:
        "NQ ground higher overnight while US-listed chip names were bid after TSMC's revenue beat. The drift began roughly 40 minutes after the print and overlapped with broader risk-on flows in Asia — the beat plausibly contributed, but the move is too diffuse and too delayed to attribute with confidence.",
    },
  },
  {
    // The honest-negative case — the trust feature. No invented story.
    headlineIncludes: "NO HEADLINE ON WIRES",
    analysis: {
      label: "No verified news catalyst",
      move: { instrument: "NQ", move: "-0.6%", interval: "3m" },
      narrative:
        "NQ −0.6% in 3m on elevated volume. No headline appeared on any monitored wire, calendar or tracked social account within ±120 seconds of the move, and no correlated single-name led it. TapeWire will not attach a story where none is verified — the honest answer is that no news catalyst was found.",
    },
  },
];

export class MockMoveDetectiveProvider implements MoveDetectiveProvider {
  async getAnalysis(item: NewsItem): Promise<MoveAnalysis | null> {
    const h = item.headline.toUpperCase();
    return (
      ANALYSES.find((a) => h.includes(a.headlineIncludes.toUpperCase()))?.analysis ??
      null
    );
  }
}
