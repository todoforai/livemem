# livemem

**Token-budgeted long-term memory for AI agents.** Distill conversations into dated facts,
then pack the most relevant ones into a fixed token budget at question time — pure math,
no LLM call on the retrieval path.

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

Measured on the [AMB harness](https://github.com/vectorize-io/agent-memory-benchmark)
(independent runner: same answerer, judge and datasets for every memory provider).

| System | LongMemEval_S (500q) | LoCoMo (1540q) | Avg context |
|---|---|---|---|
| **livemem ensemble** (2-vote) | **92.2%** | **94.7%** | 2 × ~5k tok |
| **livemem single-pass** | **87.8%** | 92.4% | **~5k tok** |
| hindsight | 94.6% | 92.0% | ~43k tok |
| full-history baseline | — | — | 115k tok |
| bm25 @5k baseline | 58.6% | 60.0% | 5k tok |
| **livemem OSS (this repo)** | *run it yourself* | *run it yourself* | 5k tok |

Answerer+judge: `gemini-flash-lite` (deliberately cheap — memory quality has to carry the
score, not the answerer). Mem0 reports 94.4% on LongMemEval with a `gpt-5` answerer **and**
`gpt-5` judge on its own harness; swapping only the answerer to gpt-5 moves our single-pass
by +7pts — most of any headline gap between systems is the answerer model, not the memory.
Full run configs and result JSONs: [`bench/`](bench/).

**What the hosted API serves today** is the single-pass pipeline (live extraction over
HTTP, ~4.2k delivered tokens at a 5k budget, hard-capped): it currently measures
**~78–82%** on LongMemEval s94 depending on budget — the 87.8%/92.2% rows use the same
architecture with offline extraction caches and (for ensemble) two votes. The gap is
convergence work in progress, tracked openly in [`bench/`](bench/); numbers here are what
you can reproduce, not aspirations.

## OSS vs hosted

This repo is the **reference implementation**: the full architecture, honestly simplified.
The hosted pipeline adds tuned extraction prompting, retrieval-unit and deduplication
refinements (number-aware dedup, entity cards + conversation-window excerpts), and will
grow an ensemble answering mode. Same API surface, so you can develop against OSS and
point at hosted later.

| | OSS (this repo) | Hosted |
|---|---|---|
| Architecture | extract → embed → budget-packed select | same |
| Extraction | generic fact extraction | recall-tuned, reconcile-aware |
| Retrieval | cosine + greedy knapsack, day labels | + cards/windows units, number-aware dedup |
| Answer mode | single pass | single pass (ensemble planned) |
| Run it | `bun add livemem` | `POST api.todofor.ai/v1/live/ingest` |

The benchmark harness in [`bench/`](bench/) runs against **either** — measure the hosted
API with your own key, or measure your fork of the OSS core.

## Quick start

```ts
import { Memory } from 'livemem'

const mem = new Memory()                                // in-memory; Redis adapter included
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
- **The budget is a hard, real-token contract.** Selection accounts for rendered
  framing (prefixes, headers), not just fact text — the block you get fits the
  context you promised.
- **Retrieval is pure math.** No LLM, no reranker call: cosine against 512-d
  embeddings plus greedy budget packing, milliseconds per render.

## License

MIT
