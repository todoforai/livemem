// index.ts — the public API. In-memory store by default; bring your own
// persistence by serializing `state` (plain JSON) wherever you like.

import { emptyState, observe, render, day, type State } from './core'
import { extract, embed } from './extract'

export { extract, embed } from './extract'
export * from './core'

export class Memory {
  private states = new Map<string, State>()

  state(userId: string): State {
    let st = this.states.get(userId)
    if (!st) { st = emptyState(); this.states.set(userId, st) }
    return st
  }

  /** One LLM call: conversation text → dated facts merged into the user's state. */
  async ingest(userId: string, chat: string, opts: { at?: string; ctx?: string[] } = {}) {
    const st = this.state(userId)
    const t = opts.at ? day(Date.parse(opts.at)) : day()
    const cands = await extract(chat)
    const embs = cands.length ? await embed(cands.map(c => c.text)) : []
    return cands.map((c, i) => observe(st, c.text, c.type, [...(c.ctx ?? []), ...(opts.ctx ?? [])], embs[i], t))
  }

  /** No LLM: select facts under `budget` tokens, optionally conditioned on a query. */
  async render(userId: string, opts: { budget?: number; q?: string } = {}): Promise<string> {
    const st = this.state(userId)
    const qEmb = opts.q ? (await embed([opts.q]))[0] : undefined
    return render(st, opts.budget ?? 1500, qEmb)
  }
}
