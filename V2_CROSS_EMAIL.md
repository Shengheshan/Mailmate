# V2 Phase 1 — Cross-email candidate retrieval

This is a **candidate retrieval** milestone, not transaction-state tracking or full semantic RAG.

- Inputs: normalized emails from Outlook; the current message and a historical set.
- Rank: explicit conversation/reply reference first, followed by corroborated subject, participant and course evidence.
- Output: IDs, score, explanatory evidence, confirmed-thread vs unconfirmed candidate, and bounded untrusted source text.
- Limitations: no embedding/reranker; cross-thread recalls are intentionally conservative; email with sparse metadata may be missed; chronological ordering requires valid received timestamps.
- Never interpret the numeric score as probability of same task. Even `confirmed_thread` means the same conversation, **not** guaranteed same action.
- The V1 single-email analyzer is unchanged. Human-reviewed gold relationship labels are required before choosing thresholds.

Run: `python -m unittest discover -s tests -p 'test_cross_email_context.py'`

Next integration steps: request Graph `internetMessageId` and `internetMessageHeaders`; paginate and store historical mail; call rank_related; compare V1 with contextualized V2 inference on a separate multi-email benchmark; validate citations and temporal changes. Keep raw emails and tokens out of Git.
