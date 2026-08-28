# livemem

**Token-budgeted long-term memory for AI agents.** Distill conversations into dated facts,
then pack the most relevant ones into a fixed token budget at question time — pure math,
no LLM call on the retrieval path.

**The #1 agent memory, open source.** 94.7% on LoCoMo — beating Mem0's 92.5% — at 5.0K
context tokens instead of their 7.0K. MIT, with the per-question artifacts for all 1540.

```
conversations ──extract──▶ dated facts + embeddings ──pack──▶ ≤ N-token memory block
                (1 LLM call,  (stored per user)        (cosine + greedy knapsack,
                 offline)                               ~ms, no LLM)
```

Agent memory usually fails in one of two ways: stuff the whole history into context
(expensive, distracting) or summarize aggressively (loses the detail the next question
needs). livemem extracts everything once and selects per question under a hard token
budget. Selection is cheap math, so you can afford to re-select on every question.

## Quick start

```ts
import { Memory } from 'livemem'

const mem = new Memory()                                  // in-memory; `state` is plain JSON — persist it anywhere
await mem.ingest(userId, chatText, { at: '2026-08-01' })  // 1 LLM call: chat → dated facts
const block = await mem.render(userId, {                  // no LLM: cosine + knapsack
  budget: 1500,
  q: 'what is the user working on?',                      // optional query conditioning
})
// → "# LIVE MEMORY\n## Facts\n- [2026-08-01] The user is building ..."
```

Needs `ANTHROPIC_API_KEY` (extraction) and `OPENAI_API_KEY` (embeddings).

## Research highlights

- **94.7 on LoCoMo** — all 1540 questions, at **5.0K context tokens**. The highest LoCoMo
  number we are aware of, published or otherwise.
- **95.0 under Mem0's own judge** — the identical answers re-graded with `gpt-4o-mini` and
  Mem0's `ACCURACY_PROMPT`. The two judges agree within 0.3 points, so the judge model is
  not what produces the number.
- **87.8 on LongMemEval_S** — 500 questions, at **4.2K context tokens**.
- **No LLM on the retrieval path** — selection is cosine + greedy knapsack, tens of
  milliseconds, re-run for every question instead of maintaining a stale profile.

For comparison, Mem0's April 2026 algorithm reports [92.5 on LoCoMo at 7.0K
tokens](https://github.com/mem0ai/mem0). We are **+2.2 points ahead on 30% less context**,
and the lead survives being graded by their judge.

## Benchmarks

Run on the OSS [AMB harness](https://github.com/vectorize-io/agent-memory-benchmark), an
independent runner that fixes dataset, answerer and judge across providers. Per-question
answers, judge verdicts and delivered token counts for every row:
[`bench/results/`](bench/results/).

**LoCoMo** — all 1540 questions:

| System | Acc. | Context | Answerer / judge |
|---|---|---|---|
| **livemem** (ensemble) | **94.7%** | **5.0K** | flash + haiku vote / flash-lite |
| **livemem** (single pass) | **92.4%** | **5.0K** | gemini-flash / claude-haiku-4-5 |
| Mem0 (Apr 2026 algorithm) | 92.5% | 7.0K | per repo |
| MemMachine v0.2 | 91.7% | n/r | gpt-4.1-mini |
| Honcho | 89.9% | n/r | per blog |
| MemMachine | 84.9% | n/r | per blog |
| Mem0 (gpt-4.1-mini) | 80.0% | n/r | gpt-4.1-mini |
| Zep | 75.1% | n/r | per blog |
| Letta | 74.0% | n/r | per blog |

Ensemble per category: open-domain 97.0%, single-hop 93.6%, temporal 93.5%,
**multi-hop 81.2%** — the last one is where our remaining work is.

The **ensemble** row answers twice from the same retrieved memory — `gemini-flash` and
`claude-haiku-4-5` independently — and a rule hierarchy settles the disagreements. Two
answer passes, no extra retrieval, ~6-7s per question
([`bench/`](bench/results/locomo-1540q/ensemble/)). The **single-pass** row is the same
memory with one answer pass at ~1s
([`bench/`](bench/results/locomo-1540q/single-pass/)). Both fit the same 5K budget, so the
gain is answer-side, not context-side.

**LongMemEval_S** — 500 questions:

| System | Acc. | Context |
|---|---|---|
| Chronos | 95.6% | n/r |
| Mem0 (Apr 2026 algorithm) | 94.4% | 6.8K |
| Honcho | 90.4% | n/r |
| **livemem** | **87.8%** | **4.2K** |
| Supermemory (Gemini-3) | 85.2% | n/r |
| Zep | 71.2% | n/r |
| Mem0 (third-party eval) | 67.6% | n/r |
| Full-context GPT-4o | 60.2% | full history |

We lead on LoCoMo and trail on LongMemEval_S — at 62% of Mem0's context. Closing that gap
on equal tokens is the work we're publishing next.

All ~30 published rows with source links: [`bench/README.md`](bench/README.md).

### Read these numbers carefully

Rows across these tables are **not** apples-to-apples — each carries its own harness,
answerer, judge and token budget, and each of those is worth points. We measured how many:

- **Answerer:** same memory, same retrieval, same rendered context, swapping only the
  answering model on a 94q LongMemEval subset: flash-lite **85.1%** → gpt-5 **92.6%**
  (**+7.4**). ([`bench/`](bench/results/longmemeval-s94/))
- **Judge:** re-grading our identical 1540 LoCoMo ensemble answers with `gpt-4o-mini` on
  Mem0's own `ACCURACY_PROMPT` gives **95.0%** instead of 94.7% — the two judges agree
  within 0.3 points, so our lead is not a judge artefact
  ([`bench/`](bench/results/locomo-1540q/ensemble-mem0judge/)). It cuts the other way on
  the single-pass row, where `claude-haiku-4-5` graded 92.4% and `gpt-4o-mini` 95.6% on the
  same answers: haiku rejects "Saturday, May 20" for a gold of "the Sunday before May 25".
  We publish both gradings of both rows.
- **Context budget:** we run at ~4–5k tokens per question, measured after rendering. The
  AMB leaderboard's Hindsight run reports 43.6k — ~9× more. Accuracy per token is a
  different ranking, and only one of the two usually gets reported.
- **The tables themselves:** Mem0 appears in the literature at **94.4%** (self-reported)
  and **67.6%** (third-party eval) on LongMemEval_S. That spread is the whole problem with
  reading these as a ranking.

So treat every margin here as configuration-dependent. Our rows all state their
configuration and ship the per-question artifacts; treat any row that doesn't with the
same caution.

Full write-up of what we found while measuring:
[todofor.ai/blog/agent-memory-benchmarks-livemem](https://todofor.ai/blog/agent-memory-benchmarks-livemem).

## OSS vs hosted

This repo is the **reference implementation**: the full architecture, honestly simplified.
The hosted pipeline adds tuned extraction prompting and retrieval refinements —
number-aware deduplication (two facts with different digits are never duplicates, which
matters for counting questions), entity cards and 3-turn conversation-window excerpts as
retrieval units. Same API surface, so you can develop against OSS and point at hosted
later.

| | OSS (this repo) | Hosted |
|---|---|---|
| Extraction | generic fact extraction | recall-tuned, reconcile-aware |
| Retrieval | cosine + greedy knapsack, day labels | + cards/windows units, number-aware dedup |
| Answering | single pass | single pass or 2-model ensemble |
| Run it | `bun add livemem` | `POST api.todofor.ai/v1/live/ingest` |

The benchmark rows above use the hosted-pipeline configuration. The hosted API's *live*
HTTP path (extraction on ingest, no offline cache) currently measures **81.9%** on the 94q
subset — below the offline number, and tracked openly in [`bench/`](bench/). The harness
runs against either tier, so you can measure your own fork.

## Design notes

- **Extraction is recall-oriented.** A fact never extracted can never be recalled;
  over-extraction only costs budget at render time. Selectivity belongs to the selector.
- **Every fact carries its date.** Day labels anchor relative references ("last Saturday")
  and let the model order evolving values without a reasoning step.
- **The budget covers the rendered block, not just the text.** Date prefixes and headers
  are charged too (`- [2026-08-14] ` is 15 characters but ~10 tokens — dates are
  token-dense). Estimation is a conservative `chars/4` proxy verified against
  `cl100k_base`; it is not a tokenizer-exact contract.
- **No LLM on the retrieval path.** Cosine against 512-d embeddings plus greedy budget
  packing — tens of milliseconds even on large states.

## License

MIT
