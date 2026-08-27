# livemem

**Token-budgeted long-term memory for AI agents.** Distill conversations into dated facts,
then pack the most relevant ones into a fixed token budget at question time — pure math,
no LLM call on the retrieval path.

**[92.4% on LoCoMo](#locomo)** (1540q, single pass, ~5k context tokens per question) —
graded by `claude-haiku-4-5`, the harsher of the two judges we measured.

```
conversations ──extract──▶ dated facts + embeddings ──pack──▶ ≤ N-token memory block
                (1 LLM call,  (stored per user)        (cosine + greedy knapsack,
                 offline)                               ~ms, no LLM)
```

## Why

Agent memory systems fall into two failure modes: stuff the whole history into context
(expensive, distracting) or summarize aggressively (loses the detail the next question
needs). livemem's bet: **extract everything once, select per-question under a hard token
budget**. Selection is cheap math, so you can afford to re-select on every question.

## Benchmarks

Our runs use the [AMB harness](https://github.com/vectorize-io/agent-memory-benchmark)
— an independent runner that fixes the dataset, answerer and judge across providers.
Raw per-question outputs for our rows: [`bench/results/`](bench/results/).

### LoCoMo

**92.4% on all 1540 questions**, single pass, ~5k context tokens — answered by
`gemini-flash`, graded by `claude-haiku-4-5` with AMB's built-in LoCoMo judge prompt. We
report this rather than the higher score the same answers get from the judge model the
published Mem0 rows use (see below).

| System | Acc. | Answerer / judge | Source |
|---|---|---|---|
| **livemem** (single pass) | **92.4%** | gemini-flash / claude-haiku-4-5 | [`bench/`](bench/results/locomo-1540q/single-pass/) |
| MemMachine v0.2 | 91.7% | gpt-4.1-mini | MemMachine blog (Dec 2025) |
| Honcho | 89.9% | per blog | Plastic Labs |
| MemMachine | 84.9% | per blog | MemMachine blog (Sep 2025) |
| Mem0 (gpt-4.1-mini) | 80.0% | gpt-4.1-mini | MemMachine blog (Dec 2025) |
| Memobase / Zep | 75.8 / 75.1% | per blog | MemMachine blog (Sep 2025) |
| Letta | 74.0% | per blog | Letta blog |
| Mem0 | 66.9% | per blog | MemMachine blog (Sep 2025) |
| LangMem | 58.1% | per blog | MemMachine blog (Sep 2025) |
| OpenAI memory | 52.9% | per blog | MemMachine blog (Sep 2025) |

Per category: open-domain 96.2%, temporal 92.5%, single-hop 85.5%, **multi-hop 79.2%** —
the last one is where our remaining work is.

**How much of this is the grader?** We re-graded the identical 1540 answers with
`gpt-4o-mini` running Mem0's own `ACCURACY_PROMPT` — the judge behind the published Mem0
LoCoMo numbers — and got **95.6%** (+53/−4 flips,
[`bench/`](bench/results/locomo-1540q/single-pass-mem0judge/)). The two judge *prompts* are
near-identical (AMB's LoCoMo prompt is itself derived from Mem0's, generosity clause
included), so this is a judge **model** effect: `claude-haiku-4-5` applies that clause far
more conservatively. It rejects "Saturday, May 20" for a gold of "the Sunday before
May 25"; `gpt-4o-mini` accepts it. The same leniency applies to every system graded by
`gpt-4o-mini`, so it is the fair judge for cross-system comparison and the wrong one for
our own iteration. **We lead with the lower number.**

The other caveat we'd rather state than have found: answerer models differ across rows
(ours is gemini-flash, MemMachine's is gpt-4.1-mini). As the LongMemEval control below
shows, that alone is worth several points in either direction — so read a 0.7-point gap
as "comparable", not as a win.

### LongMemEval_S

Published results from the literature, plus ours. **These are not one apples-to-apples
leaderboard** — each row carries its own harness, answerer and judge, and those are worth
several points each (see below). Sources are papers/blogs as collected by AMB's
`external_results.json`.

| System | Acc. | Answerer / judge | Source |
|---|---|---|---|
| Chronos | 95.6% | per paper | Chronos (arXiv:2603.16862) |
| Mem0 (self-reported) | 94.4% | gpt-5 / gpt-5 | Mem0 memory-benchmarks |
| Mastra | 92.8% | per paper | Chronos (arXiv:2603.16862) |
| Honcho | 90.4% | per blog | Plastic Labs |
| SmartSearch | 88.4% | per paper | SmartSearch (arXiv:2603.15599) |
| **livemem** | **87.8%** @ 4.2k tok | flash-lite / flash-lite | [`bench/`](bench/results/longmemeval-s500/single-pass/) |
| Memora | 87.4% | per paper | Memora (arXiv:2602.03315) |
| Supermemory (Gemini-3) | 85.2% | per paper | Hindsight (arXiv:2512.12818) |
| EMem-G | 84.9% | per paper | EMem (arXiv:2511.17208) |
| EverMemOS | 83.0% | per paper | SmartSearch (arXiv:2603.15599) |
| **livemem hosted API today** (s94) | **81.9%** @ 5.7k tok | flash-lite / flash-lite | [`bench/`](bench/results/longmemeval-s94/hosted-http/) |
| Supermemory | 81.6% | per paper | Hindsight (arXiv:2512.12818) |
| TiMem | 79.0% | per paper | TiMem (arXiv:2601.02845) |
| CoM | 76.4% | per paper | CoM (arXiv:2601.14287) |
| Nemori / LiCoMemory / MemOS | 74.6 / 73.8 / 73.1% | per paper | respective papers |
| Zep / ENGRAM | 71.2 / 71.4% | per paper | Zep (arXiv:2501.13956), ENGRAM |
| Mem0 (third-party eval) | 67.6% | per paper | TiMem (arXiv:2601.02845) |
| Full-context GPT-4o | 60.2% | gpt-4o | LongMemEval paper (arXiv:2410.10813) |
| **bm25 @5k** (our control) | 58.6% | flash-lite / flash-lite | [`bench/`](bench/results/longmemeval-s500/baseline-bm25-5k/) |
| MemoryBank | 22.9% | per paper | TiMem (arXiv:2601.02845) |

Note the two Mem0 rows: **94.4% self-reported, 67.6% in a third-party paper.** That
spread is the whole problem with reading these tables as a ranking.

### Why these numbers aren't directly comparable

We ran the control ourselves. Taking **our own memory unchanged** — same extracted facts,
same retrieval, same rendered context — and swapping *only* the answering model:

| Config (94-question LongMemEval subset) | Acc. |
|---|---|
| flash-lite answerer, flash-lite judge | 85.1% |
| **gpt-5 answerer**, flash-lite judge | **92.6%** (+7.4) |
| gpt-5 answerer, **gpt-5 judge** (same answers re-judged) | 90.4% (−2.2) |

The answerer alone moves the same memory system by 7 points; the judge moves it 2 more,
and the stronger judge was *stricter*, not more generous
([`bench/results/longmemeval-s94/v4-gpt5-answerer/`](bench/results/longmemeval-s94/v4-gpt5-answerer/)).
So a difference of a few points between two rows above says more about their harnesses
than about their memory. **Our rows all state their configuration; treat any row that
doesn't with the same caution.**

Context size is the other hidden axis: we run at **~4–5k tokens** per question. Some
published systems use 40k+. Accuracy per token is a different ranking than accuracy.

### What the hosted API serves today

The hosted API runs the single-pass pipeline with **live** extraction over HTTP. On the
94-question subset it measures **81.9%** at a budget-matched 5.7k tokens, or **77.7%**
at a strict 5k budget (4.2k delivered) — below the 87.8% full-500 row, which uses offline
extraction caches. Closing that is in-progress work, tracked openly in
[`bench/`](bench/). Numbers here are what you can reproduce, not aspirations.

## OSS vs hosted

This repo is the **reference implementation**: the full architecture, honestly simplified.
The hosted pipeline adds tuned extraction prompting and retrieval refinements —
number-aware deduplication (two facts with different digits are never duplicates, which
matters for counting questions), entity cards and 3-turn conversation-window excerpts as
retrieval units. Same API surface, so you can develop against OSS and point at hosted
later.

| | OSS (this repo) | Hosted |
|---|---|---|
| Architecture | extract → embed → budget-packed select | same |
| Extraction | generic fact extraction | recall-tuned, reconcile-aware |
| Retrieval | cosine + greedy knapsack, day labels | + cards/windows units, number-aware dedup |
| Answer mode | single pass | single pass |
| Run it | `bun add livemem` | `POST api.todofor.ai/v1/live/ingest` |

The benchmark harness in [`bench/`](bench/) runs against **either** — measure the hosted
API with your own key, or measure your fork of the OSS core.

## Quick start

```ts
import { Memory } from 'livemem'

const mem = new Memory()                                // in-memory; `state` is plain JSON — persist it anywhere
await mem.ingest(userId, chatText, { at: '2026-08-01' })  // 1 LLM call: chat → dated facts
const block = await mem.render(userId, {                 // no LLM: cosine + knapsack
  budget: 1500,
  q: 'what is the user working on?',                     // optional query conditioning
})
// → "# LIVE MEMORY\n## Facts\n- [2026-08-01] The user is building ..."
```

Needs `ANTHROPIC_API_KEY` (extraction) and `OPENAI_API_KEY` (embeddings).

## Design notes

- **Extraction is recall-oriented.** A fact never extracted can never be recalled;
  over-extraction only costs budget at render time. Selectivity belongs to the
  selector, not the extractor.
- **Every fact carries its date.** Day labels anchor relative references ("last
  Saturday") and let the model order evolving values without a reasoning step.
- **The budget covers the rendered block, not just the text.** Date prefixes and
  headers are charged too (`- [2026-08-14] ` is 15 characters but ~10 tokens — dates
  are token-dense). Estimation is a conservative `chars/4` proxy plus per-line and
  header allowances, verified against `cl100k_base` to stay under budget; it is not
  a tokenizer-exact contract.
- **No LLM on the retrieval path.** Cosine against 512-d embeddings plus greedy
  budget packing — tens of milliseconds even on large states. (Query-conditioned
  rendering does make one embedding API call to embed the query, which dominates
  wall-clock at ~200ms.)

## License

MIT
