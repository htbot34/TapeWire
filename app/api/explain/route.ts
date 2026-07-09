import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/lib/news/types";
import { mockExplanation } from "@/lib/explainFallback";

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
