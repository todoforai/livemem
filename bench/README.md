# bench — reproduce the numbers

Our rows in the README come from the [AMB harness](https://github.com/vectorize-io/agent-memory-benchmark)
— an independent runner that holds the dataset, answerer and judge fixed across memory
providers. The other rows are published numbers from papers and vendor blogs, run on
*their* harnesses; they are cited, not reproduced here.

## Measure the OSS core

`bench/serve.ts` exposes this repo's `Memory` class on the same two endpoints the hosted
API serves, so one provider measures either tier:

```bash
bun run bench/serve.ts &                     # OSS core on :8900
cp bench/livemem_http.py /path/to/amb/src/memory_bench/memory/
export LIVEMEM_HTTP_URL=http://localhost:8900 LIVEMEM_HTTP_KEY=oss
uv run amb run --dataset longmemeval --split s --memory livemem-http
```

## Measure the hosted API

Same provider, different URL and a real key:

```bash
export LIVEMEM_HTTP_URL=https://api.todofor.ai LIVEMEM_HTTP_KEY=<your key>
uv run amb run --dataset longmemeval --split s --memory livemem-http
```

## Leaderboards

Published results from papers and vendor blogs, plus ours. **These are not one
apples-to-apples leaderboard** — each row carries its own harness, answerer, judge and
token budget, and those are worth several points each. External sources as collected by
AMB's `external_results.json`; they are cited, not reproduced here.

### LoCoMo

| System | Acc. | Answerer / judge | Source |
|---|---|---|---|
| Mem0 (Apr 2026 algorithm) | 92.5% @ 7.0K tok | per repo | [mem0ai/mem0](https://github.com/mem0ai/mem0) |
| **livemem** (single pass) | **92.4%** @ 5.0K tok | gemini-flash / claude-haiku-4-5 | [`results/`](results/locomo-1540q/single-pass/) |
| MemMachine v0.2 | 91.7% | gpt-4.1-mini | [MemMachine blog, Dec 2025](https://memmachine.ai/blog/2025/12/memmachine-v0.2-delivers-top-scores-and-efficiency-on-locomo-benchmark/) |
| Honcho | 89.9% | per blog | [Plastic Labs](https://blog.plasticlabs.ai/research/Benchmarking-Honcho) |
| MemMachine | 84.9% | per blog | [MemMachine blog, Sep 2025](https://memmachine.ai/blog/2025/09/memmachine-reaches-new-heights-on-locomo/) |
| Mem0 (gpt-4.1-mini) | 80.0% | gpt-4.1-mini | [MemMachine blog, Dec 2025](https://memmachine.ai/blog/2025/12/memmachine-v0.2-delivers-top-scores-and-efficiency-on-locomo-benchmark/) |
| Memobase / Zep | 75.8 / 75.1% | per blog | [MemMachine blog, Sep 2025](https://memmachine.ai/blog/2025/09/memmachine-reaches-new-heights-on-locomo/) |
| Letta | 74.0% | per blog | [Letta blog](https://www.letta.com/blog/benchmarking-ai-agent-memory) |
| Mem0 | 66.9% | per blog | [MemMachine blog, Sep 2025](https://memmachine.ai/blog/2025/09/memmachine-reaches-new-heights-on-locomo/) |
| LangMem | 58.1% | per blog | [MemMachine blog, Sep 2025](https://memmachine.ai/blog/2025/09/memmachine-reaches-new-heights-on-locomo/) |
| OpenAI memory | 52.9% | per blog | [MemMachine blog, Sep 2025](https://memmachine.ai/blog/2025/09/memmachine-reaches-new-heights-on-locomo/) |

Mem0's April 2026 algorithm is 0.1 above us at 7.0K context tokens versus our 5.0K. Our
answerer (gemini-flash) also differs from the other rows', and the control below shows
that alone is worth several points — so read any gap of this size as "comparable", not as
a ranking.

### LongMemEval_S

| System | Acc. | Answerer / judge | Source |
|---|---|---|---|
| Chronos | 95.6% | per paper | [arXiv:2603.16862](https://arxiv.org/abs/2603.16862) |
| Mem0 (Apr 2026 algorithm) | 94.4% @ 6.8K tok | per repo | [mem0ai/mem0](https://github.com/mem0ai/mem0) |
| Mastra | 92.8% | per paper | [Chronos, arXiv:2603.16862](https://arxiv.org/abs/2603.16862) |
| Honcho | 90.4% | per blog | [Plastic Labs](https://blog.plasticlabs.ai/research/Benchmarking-Honcho) |
| SmartSearch | 88.4% | per paper | [arXiv:2603.15599](https://arxiv.org/abs/2603.15599) |
| **livemem** | **87.8%** @ 4.2k tok | flash-lite / flash-lite | [`results/`](results/longmemeval-s500/single-pass/) |
| Memora | 87.4% | per paper | [arXiv:2602.03315](https://arxiv.org/abs/2602.03315) |
| Supermemory (Gemini-3) | 85.2% | per paper | [Hindsight, arXiv:2512.12818](https://arxiv.org/abs/2512.12818) |
| EMem-G | 84.9% | per paper | [arXiv:2511.17208](https://arxiv.org/abs/2511.17208) |
| EverMemOS | 83.0% | per paper | [SmartSearch, arXiv:2603.15599](https://arxiv.org/abs/2603.15599) |
| **livemem hosted API today** (s94) | **81.9%** @ 5.7k tok | flash-lite / flash-lite | [`results/`](results/longmemeval-s94/hosted-http/) |
| Supermemory | 81.6% | per paper | [Hindsight, arXiv:2512.12818](https://arxiv.org/abs/2512.12818) |
| TiMem | 79.0% | per paper | [arXiv:2601.02845](https://arxiv.org/abs/2601.02845) |
| CoM | 76.4% | per paper | [arXiv:2601.14287](https://arxiv.org/abs/2601.14287) |
| Nemori / LiCoMemory / MemOS | 74.6 / 73.8 / 73.1% | per paper | [Nemori](https://arxiv.org/abs/2508.03341), [LiCoMemory](https://arxiv.org/abs/2511.01448), [TiMem](https://arxiv.org/abs/2601.02845) |
| ENGRAM / Zep | 71.4 / 71.2% | per paper | [ENGRAM](https://arxiv.org/abs/2511.12960), [Zep](https://arxiv.org/abs/2501.13956) |
| Mem0 (third-party eval) | 67.6% | per paper | [TiMem, arXiv:2601.02845](https://arxiv.org/abs/2601.02845) |
| Full-context GPT-4o | 60.2% | gpt-4o | [LongMemEval, arXiv:2410.10813](https://arxiv.org/abs/2410.10813) |
| **bm25 @5k** (our control) | 58.6% | flash-lite / flash-lite | [`results/`](results/longmemeval-s500/baseline-bm25-5k/) |
| MemoryBank | 22.9% | per paper | [TiMem, arXiv:2601.02845](https://arxiv.org/abs/2601.02845) |

Note the two Mem0 rows: **94.4% self-reported, 67.6% in a third-party paper.** Same
system, 27 points apart. That spread is the whole problem with reading these as a ranking.

Context size is the other hidden axis: we run at ~4–5k tokens per question, measured after
rendering; the AMB leaderboard's Hindsight run reports 43.6k — ~9× more.

## Published results

`results/` holds per-question artifacts for **our** rows: answers, judge verdicts and
context-token counts (large files gzipped). Each `meta.json` states its answerer, judge,
budget and configuration — they are **not** uniform across rows, so read it before
comparing.

| README row | Directory | Answerer / judge |
|---|---|---|
| LoCoMo 1540q — **92.4%** | `results/locomo-1540q/single-pass/` | gemini-flash / claude-haiku-4-5 |
| LoCoMo 1540q — same answers, Mem0's judge — 95.6% | `results/locomo-1540q/single-pass-mem0judge/` | gemini-flash / **gpt-4o-mini, Mem0 ACCURACY_PROMPT** |
| LongMemEval 500q — **87.8%** | `results/longmemeval-s500/single-pass/` | flash-lite / flash-lite |
| LongMemEval — bm25 @5k control 58.6% | `results/longmemeval-s500/baseline-bm25-5k/` | flash-lite / flash-lite |
| LongMemEval s94 — hosted API 81.9% / 77.7% | `results/longmemeval-s94/hosted-http/` | flash-lite / flash-lite |
| LongMemEval s94 — answerer control, baseline 85.1% | `results/longmemeval-s94/v4-flashlite-answerer/` | flash-lite / flash-lite |
| LongMemEval s94 — answerer control, gpt-5 92.6% | `results/longmemeval-s94/v4-gpt5-answerer/` | **gpt-5** / flash-lite |

The two LoCoMo directories hold the **same 1540 answers** graded by different judges
(verified byte-identical answer strings) — 92.4% under `claude-haiku-4-5`, 95.6% under
`gpt-4o-mini`. The prompts are near-identical (AMB's LoCoMo judge prompt is derived from
Mem0's `ACCURACY_PROMPT`, "be generous" clause included), so the 3.2pt is the judge
*model*: haiku applies that clause much more conservatively. We quote the lower one.

Our LongMemEval rows use a `gemini-flash-lite` judge, so judges are **not** uniform across
benchmarks here; each `meta.json` states its own.

## Why the answerer matters more than you'd think

`v4-flashlite-answerer/` and `v4-gpt5-answerer/` are a control pair, not a headline: same
memory state, same rendered context, only the answering model swapped —
**85.1% → 92.6%**. Re-judging those identical answers with
gpt-5 gives **90.4%** — the stronger judge was stricter.

We answer with `gemini-flash-lite` for our main rows on purpose: a weak answerer reasons
around fewer gaps, so retrieval failures show up in the score instead of being repaired.
It has a cost — flash-lite also fails arithmetic on facts that *are* in context, which is
our largest remaining error family — so it stresses retrieval, it does not isolate it.
