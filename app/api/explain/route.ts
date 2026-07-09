import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/lib/news/types";

export const runtime = "nodejs";

interface ExplainRequest {
  item: NewsItem;
  watchlist: string[];
}

const SYSTEM_PROMPT = `You are the explainer inside a news terminal used by active stock, options, futures and FX day traders. Given one raw wire headline and its context, explain it for a trader who just glanced at it between trades.

Structure your answer as three short parts, in plain language:
1. What this news actually says.
2. Why it matters for the tickers/pairs tagged on the item and for the symbols on the user's watchlist (name them explicitly when relevant; say so plainly if it is not relevant to their watchlist).
3. What traders typically watch next after news like this (follow-up data, related symbols, key levels of attention, official confirmations).

Hard rules: provide context, never trade advice — no "buy", "sell", "long", "short" recommendations, no price targets. Keep it under 180 words. End with exactly one line: "Context only — not financial advice."`;

function buildUserPrompt(item: NewsItem, watchlist: string[]): string {
  const parts = [
    `HEADLINE: ${item.headline}`,
    `SOURCE: ${item.source} (${item.sourceType})`,
    `TIMESTAMP: ${item.timestamp}`,
    `EVENT TYPE: ${item.eventType} | IMPACT: ${item.impact}`,
  ];
  if (item.tickers.length) parts.push(`TAGGED TICKERS: ${item.tickers.join(", ")}`);
  if (item.pairs?.length) parts.push(`TAGGED FX PAIRS: ${item.pairs.join(", ")}`);
  if (item.marketReaction?.length) {
    parts.push(
      `MARKET REACTION: ${item.marketReaction.map((r) => `${r.instrument} ${r.move}`).join(", ")}`,
    );
  }
  if (item.body) parts.push(`ARTICLE BODY: ${item.body}`);
  parts.push(`USER WATCHLIST: ${watchlist.length ? watchlist.join(", ") : "(empty)"}`);
  return parts.join("\n");
}

// Canned fallback so the demo never breaks in front of testers when no
// ANTHROPIC_API_KEY is configured.
function mockExplanation(item: NewsItem, watchlist: string[]): string {
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
    `[Demo mode: set ANTHROPIC_API_KEY for live AI explanations]`,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: ExplainRequest;
  try {
    body = (await req.json()) as ExplainRequest;
    if (!body?.item?.headline) throw new Error("missing item");
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const { item, watchlist = [] } = body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key → canned explanation, demo keeps working.
  if (!apiKey) {
    return new Response(mockExplanation(item, watchlist), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(item, watchlist) }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // API construction/auth failure → degrade to mock rather than erroring.
    return new Response(mockExplanation(item, watchlist), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
