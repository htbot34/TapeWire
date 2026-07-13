# TapeWire — Trust Rules

The ten-rule product doctrine. Every feature ships against these; where the
prototype can't honor a rule yet, it says so explicitly. These rules are
also rendered in-app (Settings → Trust rules, and the page footer).

1. **Raw information always appears before AI interpretation.**
   Current build: the feed is raw headlines only; AI lives behind the
   opt-in Explain panel, and even there the Raw event section renders first.

2. **Every event must have a source.**
   Current build: every mock item carries a named source, source type and a
   "View source →" link; the Explain panel has a dedicated Sources section.

3. **AI must distinguish fact from inference.**
   Current build: the explainer's system prompt enforces Fact:/Inference:
   labeling, and the canned no-API-key fallback follows the same contract.

4. **A catalyst is never labeled confirmed without evidence.**
   Current build: Move Detective (preview) uses a five-label taxonomy with
   honest negatives; "No verified news catalyst" is a first-class output,
   and time-proximity alone never yields "Confirmed".

5. **No fabricated historical reactions.**
   Current build: historical tables render only from the curated event
   database; when it has no coverage, no table renders. The AI is grounded
   on that dataset and instructed to say "not covered" rather than invent.

6. **Corrections are visible.**
   Current build: corrected items show a CORRECTED tag plus the correction
   text; the original headline is preserved, never silently rewritten (see
   the seeded @DeItaone recall item).

7. **Critical information is never delayed while waiting for AI.**
   Current build: the breaking banner and feed render entirely without any
   AI call; the Explain panel loads its AI sections after the structured
   facts are already on screen.

8. **AI does not secretly change or rewrite source headlines.**
   Current build: headlines render verbatim from the data layer everywhere;
   the AI receives them as context and never supplies display text for them.

9. **Users can view why an event was ranked.**
   Current build: every Your Focus item carries the deterministic
   three-pillar rationale (your instruments / market impact / why now, plus
   relevance chains) computed from item data, user preferences and the
   correlation dataset — an item with nothing specific to the user gets no
   rationale and ranks low; generic reasons are never emitted.

10. **Advertising or affiliate relationships never influence rankings.**
    Production commitment: the prototype has no advertising; the production
    ranking engine's inputs are documented in ARCHITECTURE.md and contain
    no commercial terms.

## The banner takeover rule

The full-screen breaking takeover fires on a deterministic rule, stated here
exactly as implemented (`lib/news/takeover.ts`):

> An alert takes over the banner when the item is **Critical impact** AND
> (it is a **red-folder scheduled release** — scheduled econ release — OR it
> carries a **recorded market reaction** of at least **0.5% on an index**
> (ES/NQ/YM/RTY/SPX/NDX/SPY/QQQ/DIA/IWM), **5bp on rates**, or **0.75% on an
> FX pair or DXY**). Relevant and Context items never take over.

No model, no heuristics, no exceptions: the same item always produces the
same decision. Traders can opt out to a compact two-line alert in Settings;
the thresholds themselves are product constants. The **False alarm /
Useful** buttons on the takeover write feedback records tagged
`surface: "banner"` — that user-recorded data, and nothing else, governs how
these thresholds evolve.

## Relevance chains and watchlist impact

"Relevant through: NVDA → semiconductors → NQ" chains and the
"Impact on your watchlist" label are computed from TapeWire's maintained
correlation dataset plus the user's own watchlist — deterministic data, in
production never AI-generated at request time, and never rendered inside
AI-labeled blocks. Replay folder stats remain computed from user-recorded
data only.
