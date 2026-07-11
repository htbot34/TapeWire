import type { NewsItem } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";

// Canned explainer text used wherever the live Anthropic call is unavailable:
// server-side when ANTHROPIC_API_KEY is missing, and client-side on static
// hosting (GitHub Pages) where the /api/explain route doesn't exist at all.
// The canned path enforces the same neutrality contract as the live prompt.

export function mockExplanation(
  item: NewsItem,
  watchlist: string[],
  history?: HistoricalEventContext | null,
): string {
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

  const last = history?.occurrences[0];
  const lastLine = last
    ? `Fact: the last recorded ${history!.name} was ${last.date}${
        last.actual ? ` · ${last.actual}${last.consensus ? ` vs ${last.consensus} exp` : ""}` : ""
      } · ${last.reactions.map((r) => `${r.instrument} ${r.move}`).join(", ")} — see the Historical reactions table.`
    : null;

  // Same labeled-section format the live prompt requires, so the panel's
  // section parser is exercised on the canned path too.
  return [
    `WHAT IT IS:`,
    `${eventBlurb[item.eventType] ?? eventBlurb.other}`,
    ``,
    `WHY MARKETS CARE:`,
    `Fact: ${item.body ?? item.headline}`,
    watchHits.length
      ? `Fact: this item is tagged to ${watchHits.join(", ")} on your watchlist.`
      : `Fact: none of your watchlist symbols are tagged directly${symbols.length ? ` (tagged: ${symbols.join(", ")})` : ""}.`,
    ``,
    `OBSERVED REACTION:`,
    reaction
      ? `Fact: the recorded reaction was ${reaction}. Inference: traders typically compare a first reaction like this against how the same event type resolved historically before treating it as durable.`
      : `Fact: no market reaction is recorded on this item yet.`,
    ``,
    `WHAT TRADERS MAY MONITOR NEXT:`,
    ...(lastLine ? [lastLine] : []),
    `Inference: traders typically watch wire-service follow-ups or official confirmation, the reaction in the most-affected instruments${reaction ? ` (${reaction})` : ""}, and whether the move holds or fades over the following sessions.`,
    ``,
    `Context, not financial advice.`,
    ``,
    `[Demo mode: live AI needs a server deployment with ANTHROPIC_API_KEY]`,
  ].join("\n");
}

const ADVICE_PATTERN =
  /\b(should i|buy|sell|short|long|hold|dump|load up|price target|predict|forecast|will (it|this|the market)|going (up|down)|bullish or bearish|good (trade|entry)|take profit|stop loss)\b/i;

/**
 * Canned reply for follow-up questions when no API key is configured. Applies
 * the same neutrality contract as the live system prompt: advice-seeking
 * questions get the context-not-advice redirect.
 */
export function mockFollowUpReply(
  question: string,
  item: NewsItem,
  history?: HistoricalEventContext | null,
): string {
  if (ADVICE_PATTERN.test(question)) {
    const redirect = history?.occurrences?.length
      ? `What the record shows: the last ${Math.min(history.occurrences.length, 3)} occurrences of ${history.name} are in the Historical reactions table above (most recent: ${history.occurrences[0].date}, ${history.occurrences[0].reactions.map((r) => `${r.instrument} ${r.move}`).join(", ")}). How you position around that is your call.`
      : `The recorded market reaction on this item${item.marketReaction?.length ? ` (${item.marketReaction.map((r) => `${r.instrument} ${r.move}`).join(", ")})` : ""} is the factual reference point. How you position around it is your call.`;
    return [
      `TapeWire provides context, not advice — no buy/sell/hold calls and no predictions.`,
      ``,
      redirect,
      ``,
      `[Demo mode: live AI needs a server deployment with ANTHROPIC_API_KEY]`,
    ].join("\n");
  }

  const historyLine = history?.occurrences?.length
    ? `The curated dataset for ${history.name} covers ${history.occurrences.length} past occurrences (most recent ${history.occurrences[0].date}); the Historical reactions table above lists each date, surprise and recorded move.`
    : `There's no curated historical dataset for this event type in the prototype, so the demo can't ground a deeper answer here.`;

  return [
    `Canned demo response — the live deployment answers follow-ups with the full thread, your watchlist and the structured historical data as grounding.`,
    ``,
    historyLine,
    ``,
    `[Demo mode: live AI needs a server deployment with ANTHROPIC_API_KEY]`,
  ].join("\n");
}
