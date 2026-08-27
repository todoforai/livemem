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
