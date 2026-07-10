import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/lib/news/types";
import type { HistoricalEventContext } from "@/lib/history";
import { historicalEventProvider } from "@/lib/history";
import { mockExplanation, mockFollowUpReply } from "@/lib/explainFallback";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExplainRequest {
  item: NewsItem;
  watchlist: string[];
  /** Conversation so far. Empty/absent → generate the initial explanation. */
  messages?: ChatMessage[];
}

const SYSTEM_PROMPT_BASE = `You are the explainer inside TapeWire, a news terminal used by active stock, options, futures and FX day traders. The trader has opened one raw wire headline and may ask follow-up questions. Explain in plain language, tight and scannable, under 180 words per reply.

For the initial explanation, structure your answer as three short parts:
1. What this news actually says.
2. Why it matters for the tickers/pairs tagged on the item and for the symbols on the user's watchlist (name them explicitly when relevant; say so plainly if it is not relevant to their watchlist).
3. What traders typically watch next after news like this (follow-up data, related symbols, official confirmations).

STRICT NEUTRALITY — non-negotiable:
- Provide facts, definitions, historical data, and market mechanics only.
- Never give predictions, directional opinions, price targets, or trade recommendations — no "buy", "sell", "long", "short", "I'd expect", "likely to rally/fall".
- If asked "should I buy/sell/hold", for a prediction, or for any directional view: reply that TapeWire provides context, not advice, and redirect to the relevant historical data (the HISTORICAL DATA block below, which the trader can also see as a table in their panel).
- Ground every historical date and magnitude you cite on the HISTORICAL DATA block. If it does not contain what is asked (e.g. a different instrument or period), say the dataset does not cover it — never invent numbers, dates, or reactions.
- End your FIRST reply of each conversation with the single line: "Context, not financial advice." Do not append that line to later replies.`;

function formatHistory(history: HistoricalEventContext | null): string {
  if (!history) {
    return "HISTORICAL DATA: none available for this event type. Do not fabricate any historical dates or figures.";
  }
  const rows = history.occurrences
    .map(
      (o) =>
        `  ${o.date}${o.actual ? ` · ${o.actual}${o.consensus ? ` vs ${o.consensus} exp` : ""}` : ""}${o.surprise ? ` (${o.surprise})` : ""} → ${o.reactions.map((r) => `${r.instrument} ${r.move}`).join(", ")}`,
    )
    .join("\n");
  return [
    `HISTORICAL DATA for ${history.name} (curated dataset; the trader sees this same table in the panel):`,
    `Definition: ${history.definition}`,
    `Typically affects: ${history.symbols.join(", ")}`,
    `Past occurrences (newest first; the first is the last recorded occurrence):`,
    rows,
  ].join("\n");
}

function buildItemContext(item: NewsItem, watchlist: string[]): string {
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

const INITIAL_USER_TURN =
  "Explain what this headline means for a trader who just glanced at it between trades.";

export async function POST(req: Request) {
  let body: ExplainRequest;
  try {
    body = (await req.json()) as ExplainRequest;
    if (!body?.item?.headline) throw new Error("missing item");
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const { item, watchlist = [], messages = [] } = body;
  const history = await historicalEventProvider.getContext(item);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key → canned replies, demo keeps working (initial + follow-ups, with
  // the same neutrality contract).
  if (!apiKey) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const text = lastUser
      ? mockFollowUpReply(lastUser.content, item, history)
      : mockExplanation(item, watchlist, history);
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const system = [
    SYSTEM_PROMPT_BASE,
    "",
    "NEWS ITEM CONTEXT:",
    buildItemContext(item, watchlist),
    "",
    formatHistory(history),
  ].join("\n");

  const thread: ChatMessage[] = messages.length
    ? messages
    : [{ role: "user", content: INITIAL_USER_TURN }];

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system,
      messages: thread,
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
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const text = lastUser
      ? mockFollowUpReply(lastUser.content, item, history)
      : mockExplanation(item, watchlist, history);
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
