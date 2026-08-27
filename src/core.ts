// core.ts — the memory state and the two operations on it:
//   observe(state, fact)          store a dated fact (dedup by text/embedding)
//   render(state, budget, qEmb?)  select facts under a hard token budget → markdown block
//
// Selection is pure math (cosine + greedy knapsack) — no LLM on the retrieval path.

import type { FactType } from './extract'

export interface Item {
  id: string
  text: string
  type: FactType
  ctx: string[]
  born: number          // day number (unix days) the fact was first observed
  emb?: number[]
}

export interface State { items: Record<string, Item> }

export const emptyState = (): State => ({ items: {} })

export const day = (ms = Date.now()) => Math.floor(ms / 86400000)
export const dayLabel = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10)

// ---- token accounting: budget is a promise about the DELIVERED block ----
export const tok = (s: string) => Math.ceil(s.length / 4)
const LINE_TOK = 10   // "- [YYYY-MM-DD] " renders to ~10 tokens (dates are token-dense)
const HEAD_TOK = 40   // section headers

export const cos = (a: number[], b: number[]) => {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2 }
  return d / (Math.sqrt(na * nb) || 1)
}

const SIM_MERGE = 0.99  // same sentence modulo trivia — everything less similar is a distinct fact

export const observe = (st: State, text: string, type: FactType, ctx: string[], emb?: number[], t = day()): Item => {
  const n = text.toLowerCase().replace(/\s+/g, ' ').trim()
  const dup = Object.values(st.items).find(i =>
    i.text.toLowerCase().replace(/\s+/g, ' ').trim() === n ||
    (emb && i.emb && cos(i.emb, emb) > SIM_MERGE))
  if (dup) return dup
  const it: Item = { id: crypto.randomUUID().slice(0, 8), text, type, ctx, born: t, emb }
  st.items[it.id] = it
  return it
}

// Query-conditioned selection: rank by cos(qEmb, emb), fill the budget greedily.
// Without a query: most recent first (recency is the best query-free prior).
const select = (st: State, B: number, qEmb?: number[]): Item[] => {
  const pool = Object.values(st.items)
  const ranked = qEmb
    ? pool.filter(i => i.emb).sort((a, b) => cos(b.emb!, qEmb) - cos(a.emb!, qEmb))
    : pool.sort((a, b) => b.born - a.born)
  const M: Item[] = []
  let used = 0
  for (const i of ranked) {
    const c = tok(i.text) + LINE_TOK
    if (used + c > B) continue
    M.push(i); used += c
  }
  return M
}

// Render: facts grouped by type, chronological within section, day-labelled.
export const render = (st: State, B: number, qEmb?: number[]): string => {
  const M = select(st, Math.max(B - HEAD_TOK, 0), qEmb)
  const sec = (ty: FactType, title: string) => {
    const xs = M.filter(i => i.type === ty).sort((a, b) => a.born - b.born)
    return xs.length ? `\n## ${title}\n` + xs.map(i => `- [${dayLabel(i.born)}] ${i.text}`).join('\n') : ''
  }
  return `# LIVE MEMORY  (${M.length} items, budget ${B} tok)${
    sec('procedure', 'Procedures (how things are done)')}${
    sec('preference', 'Preferences & standing rules')}${
    sec('fact', 'Facts')}${
    sec('episode', 'Episodes')}`
}
