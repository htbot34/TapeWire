// Defensive parser for the AI explainer's labeled sections.
//
// The API route asks the model to answer with four labeled sections
// (WHAT IT IS / WHY MARKETS CARE / OBSERVED REACTION / WHAT TRADERS MAY
// MONITOR NEXT). Models drift, and the canned fallback must parse too — so
// this parser is tolerant: headings may be any case, with or without a
// trailing colon, inline ("WHY MARKETS CARE: text…") or on their own line.
// When no headings are found at all, everything lands in `context` and the
// panel renders it under a single "Context" label instead of breaking.

export interface ExplainSections {
  whatItIs?: string;
  whyMarketsCare?: string;
  observedReaction?: string;
  monitorNext?: string;
  /** Text outside any recognized section (or the whole reply when unlabeled). */
  context?: string;
  /** Quiet trailing lines: the advice disclaimer and the demo-mode marker. */
  footer: string[];
}

type SectionKey = Exclude<keyof ExplainSections, "footer">;

const HEADING_PATTERNS: [RegExp, SectionKey][] = [
  [/^what (?:it|this) is\b/i, "whatItIs"],
  [/^why (?:the )?markets? cares?\b/i, "whyMarketsCare"],
  [/^why (?:it|this) matters\b/i, "whyMarketsCare"],
  [/^observed (?:market )?reaction\b/i, "observedReaction"],
  [/^what traders (?:may|might|typically|usually)? ?(?:monitor|watch) next\b/i, "monitorNext"],
];

const FOOTER_PATTERN = /^(context, not financial advice\.?|\[demo mode:.*\])$/i;

/** Matches "HEADING:" or "HEADING — " prefixes; returns [key, remainder] or null. */
function matchHeading(line: string): [SectionKey, string] | null {
  const trimmed = line.trim();
  for (const [re, key] of HEADING_PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      const rest = trimmed.slice(m[0].length).replace(/^\s*[:—–-]\s*/, "");
      return [key, rest];
    }
  }
  return null;
}

export function parseExplainSections(text: string): ExplainSections {
  const out: ExplainSections = { footer: [] };
  const buckets = new Map<SectionKey, string[]>();
  let current: SectionKey = "context";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (FOOTER_PATTERN.test(line.trim())) {
      out.footer.push(line.trim());
      continue;
    }
    const heading = matchHeading(line);
    if (heading) {
      current = heading[0];
      if (!buckets.has(current)) buckets.set(current, []);
      if (heading[1]) buckets.get(current)!.push(heading[1]);
      continue;
    }
    if (!buckets.has(current)) buckets.set(current, []);
    buckets.get(current)!.push(line);
  }

  for (const [key, lines] of Array.from(buckets.entries())) {
    const joined = lines.join("\n").trim();
    if (joined) out[key] = joined;
  }
  return out;
}

/** True when the reply carried none of the expected labels — render as one "Context" block. */
export function isUnstructured(s: ExplainSections): boolean {
  return (
    !s.whatItIs && !s.whyMarketsCare && !s.observedReaction && !s.monitorNext
  );
}
