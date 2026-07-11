import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/lib/news/types";
import { formatReaction } from "@/lib/news/types";
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

For the initial explanation, answer with EXACTLY these four labeled sections, each label on its own line followed by 1–3 sentences (the panel parses these labels and renders each section under its own quiet heading):
WHAT IT IS:
WHY MARKETS CARE:
OBSERVED REACTION:
WHAT TRADERS MAY MONITOR NEXT:
In WHAT IT IS, define the event plainly; when the HISTORICAL DATA block already carries a definition the trader sees it above your text, so keep this to one sentence. In WHY MARKETS CARE, tie it to the tickers/pairs tagged on the item and to the symbols on the user's watchlist (name them explicitly when relevant; say so plainly if it is not relevant to their watchlist). In OBSERVED REACTION, comment only on the reaction data provided. In WHAT TRADERS MAY MONITOR NEXT, list follow-up data, related symbols, official confirmations.

STRICT NEUTRALITY — non-negotiable:
- Provide facts, definitions, historical data, and market mechanics only.
- Never give predictions, directional opinions, price targets, or trade recommendations — no "buy", "sell", "long", "short", "I'd expect", "likely to rally/fall".
- If asked "should I buy/sell/hold", for a prediction, or for any directional view: reply that TapeWire provides context, not advice, and redirect to the relevant historical data (the HISTORICAL DATA block below, which the trader can also see as a table in their panel).
- Ground every historical date and magnitude you cite on the HISTORICAL DATA block. If it does not contain what is asked (e.g. a different instrument or period), say the dataset does not cover it — never invent numbers, dates, or reactions.
- End your FIRST reply of each conversation with the single line: "Context, not financial advice." Do not append that line to later replies.

FACT VS INFERENCE — non-negotiable:
- Explicitly separate fact from inference in every reply. State facts with a "Fact:" prefix and interpretation with an "Inference:" prefix whenever a sentence goes beyond the provided data (e.g. "Fact: CPI printed +0.1% vs +0.2% expected. Inference: traders often read this as easing pressure on yields.").
- Facts are only: the headline/body content, the tagged data, the MARKET REACTION figures, and the HISTORICAL DATA block. Everything else — typical readings, usual mechanics, what "often" happens — is inference and must be labeled as such.`;

function formatHistory(history: HistoricalEventContext | null): string {
  if (!history) {
    return "HISTORICAL DATA: none available for this event type. Do not fabricate any historical dates or figures.";
  }
  const rows = history.occurrences
    .map(
      (o) =>
        `  ${o.date}${o.actual ? ` · ${o.actual}${o.consensus ? ` vs ${o.consensus} exp` : ""}` : ""}${o.surprise ? ` (${o.surprise})` : ""} → ${o.reactions.map(formatReaction).join(", ")}`,
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
      `MARKET REACTION (each move with its measurement window): ${item.marketReaction.map(formatReaction).join(", ")}`,
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
