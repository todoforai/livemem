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
export LIVEMEM_URL=https://api.todofor.ai LIVEMEM_KEY=<your key>
uv run amb run --dataset longmemeval --split s --memory livemem-http
```

## Measure the OSS core

`bench/oss_provider.py` wraps this repo's `Memory` class in the same provider
interface — run the identical command with `--memory livemem-oss` and compare.

## Published results

`results/` contains the raw AMB output JSON for each README row: per-question
answers, judge verdicts and context-token counts. Run configs (answerer, judge,
budget, dataset revision) are in each `meta.json`.

| Result | File |
|---|---|
| LongMemEval_S 500q — hosted 92.2% | `results/longmemeval-s500/` |
| LoCoMo 1540q — hosted 94.7% | `results/locomo-1540q/` |
| Baselines (bm25 @5k) | `results/*/baseline-bm25-5k/` |

Answerer and judge for all rows: `gemini-flash-lite` — deliberately cheap, so the
memory system carries the score, not the answerer. (For reference: several vendors'
headline numbers use a `gpt-5` answerer *and* judge; on those settings our hosted
pipeline measures 90–93% on the LongMemEval subset we re-ran. Both configs' raw
outputs are in `results/`.)
