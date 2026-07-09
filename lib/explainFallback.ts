import type { NewsItem } from "@/lib/news/types";

// Canned explainer text used wherever the live Anthropic call is unavailable:
// server-side when ANTHROPIC_API_KEY is missing, and client-side on static
// hosting (GitHub Pages) where the /api/explain route doesn't exist at all.
export function mockExplanation(item: NewsItem, watchlist: string[]): string {
  const symbols = [...item.tickers, ...(item.pairs ?? [])];
  const watchHits = symbols.filter((s) => watchlist.includes(s));
  const reaction = item.marketReaction
    ?.map((r) => `${r.instrument} ${r.move}`)
    .join(", ");

  const eventBlurb: Record<string, string> = {
    "econ-release":
      "This is a scheduled economic release — the market reaction is driven by how the actual number compares with consensus, not the level itself.",
    earnings:
      "This is a company results item — the move typically depends on the beat/miss versus estimates and on any change to forward guidance.",
    "fed-speak":
      "This is central-bank commentary — traders parse the language for shifts in the policy path, and rate-sensitive assets usually react first.",
    geopolitical:
      "This is a geopolitical development — these tend to move energy, safe havens and risk sentiment before individual equities.",
    "company-news":
      "This is company-specific news — the read-through is usually to the named stock first, then peers and suppliers.",
    tweet:
      "This came from a social account — traders treat these as fast but unconfirmed, watching for wire-service confirmation before sizing conviction.",
    analyst:
      "This is an analyst rating action — these matter most when they carry new information or shift the consensus narrative.",
    other:
      "This is a general market development — the reaction depends on positioning and how surprising the news is.",
  };

  return [
    `${eventBlurb[item.eventType] ?? eventBlurb.other}`,
    ``,
    `${item.body ?? item.headline}`,
    ``,
    watchHits.length
      ? `Watchlist relevance: this item is tagged to ${watchHits.join(", ")} on your watchlist${reaction ? ` — the initial reaction was ${reaction}` : ""}.`
      : `Watchlist relevance: none of your watchlist symbols are tagged directly${symbols.length ? `, though ${symbols.join(", ")} moved on it` : ""}.`,
    ``,
    `What traders typically watch next: wire-service follow-ups or official confirmation, the reaction in the most-affected instruments${reaction ? ` (${reaction})` : ""}, and whether the move holds or fades over the following sessions.`,
    ``,
    `Context only — not financial advice.`,
    ``,
    `[Demo mode: live AI explanations need a server deployment with ANTHROPIC_API_KEY]`,
  ].join("\n");
}
