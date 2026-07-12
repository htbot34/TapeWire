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
   Current build: every Your Focus item carries a deterministic
   "Ranked #N because…" line generated from item data + user preferences.

10. **Advertising or affiliate relationships never influence rankings.**
    Production commitment: the prototype has no advertising; the production
    ranking engine's inputs are documented in ARCHITECTURE.md and contain
    no commercial terms.
