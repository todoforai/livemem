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
| LongMemEval 500q — ensemble 92.2% | `results/longmemeval-s500/ensemble-vote2/` | 2× flash-lite runs + arbitration / flash-lite |
| LongMemEval 500q — single-pass 87.8% | `results/longmemeval-s500/single-pass/` | flash-lite / flash-lite |
| LongMemEval — bm25 @5k control 58.6% | `results/longmemeval-s500/baseline-bm25-5k/` | flash-lite / flash-lite |
| LongMemEval s94 — hosted API 81.9% / 77.7% | `results/longmemeval-s94/hosted-http/` | flash-lite / flash-lite |
| LongMemEval s94 — gpt-5 answerer control 92.6% | `results/longmemeval-s94/v4-gpt5-answerer/` | **gpt-5** / flash-lite |
| LoCoMo 1540q — ensemble 95.0% (94.7% flash-lite-judged) | `results/locomo-1540q/ensemble-vote2/` | flash/haiku vote / **gpt-4o-mini** (Mem0 prompt) |
| LoCoMo 1540q — single-pass 92.4% | `results/locomo-1540q/single-pass/` | **gemini-flash** / flash-lite |

Two caveats we'd rather state than have found:

- The **ensemble** directories contain derived artifacts (two runs combined by an
  arbitration rule), not a single raw AMB run.
- The LoCoMo ensemble was judged twice: **95.0%** by gpt-4o-mini with Mem0's own accuracy
  prompt (chosen so the judge matches Mem0's published setup), and **94.7%** by flash-lite
  on identical answers. Both verdict sets are in the result file.

## Why the answerer matters more than you'd think

`results/longmemeval-s94/v4-gpt5-answerer/` is a control, not a headline: the same memory
state and the same rendered context, with only the answering model swapped from
flash-lite to gpt-5, scores **85.1% → 92.6%**. Re-judging those identical answers with
gpt-5 gives **90.4%** — the stronger judge was stricter.

We answer with `gemini-flash-lite` for our main rows on purpose: a weak answerer reasons
around fewer gaps, so retrieval failures show up in the score instead of being repaired.
It has a cost — flash-lite also fails arithmetic on facts that *are* in context, which is
our largest remaining error family — so it stresses retrieval, it does not isolate it.
