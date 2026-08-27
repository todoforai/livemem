# bench — reproduce the numbers

Every number in the README comes from the [AMB harness](https://github.com/vectorize-io/agent-memory-benchmark)
— an independent runner that holds the dataset, answerer and judge fixed for every
memory provider. Nothing here is self-graded.

## Reproduce the hosted numbers

The harness talks to the hosted API over HTTP (`/v1/live/ingest` + `/v1/live/render`)
— the same endpoints production agents use, no benchmark-only code path.

```bash
git clone https://github.com/vectorize-io/agent-memory-benchmark amb && cd amb
cp /path/to/livemem/bench/livemem_http.py src/memory_bench/memory/
export LIVEMEM_HTTP_URL=https://api.todofor.ai LIVEMEM_HTTP_KEY=<your key>
uv run amb run --dataset longmemeval --split s --memory livemem-http
```

## Measure the OSS core

`bench/serve.ts` exposes this repo's `Memory` class on the same two endpoints, so the
**identical provider** measures both tiers:

```bash
bun run bench/serve.ts &                     # OSS core on :8900
export LIVEMEM_HTTP_URL=http://localhost:8900 LIVEMEM_HTTP_KEY=oss
uv run amb run --dataset longmemeval --split s --memory livemem-http
```

## Published results

`results/` contains raw AMB output for each README row: per-question answers, judge
verdicts and context-token counts (large files gzipped). Run configs (answerer, judge,
budget, dataset revision) are in each `meta.json`.

| README row | Result dir |
|---|---|
| LongMemEval_S 500q — ensemble 92.2% | `results/longmemeval-s500/ensemble-vote2/` |
| LongMemEval_S 500q — single-pass 87.8% | `results/longmemeval-s500/single-pass/` |
| LoCoMo 1540q — ensemble 94.7% | `results/locomo-1540q/ensemble-vote2/` |
| LoCoMo 1540q — single-pass 92.4% | `results/locomo-1540q/single-pass/` |
| bm25 @5k baseline | `results/longmemeval-s500/baseline-bm25-5k/` |
| Hosted HTTP API today (s94, live extraction) | `results/longmemeval-s94/hosted-http/` |
| gpt-5-answerer control (s94) | `results/longmemeval-s94/v4-gpt5-answerer/` |

Answerer and judge for all rows: `gemini-flash-lite` — deliberately cheap, so the
memory system carries the score, not the answerer. The gpt-5-answerer control shows
why that matters: swapping only the answerer moves the same memory +7pts (85.1→92.6
on s94), which is most of the headline gap between published systems.
