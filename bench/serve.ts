// serve.ts — expose the OSS Memory class on the same two endpoints the hosted
// API serves, so the identical AMB provider (livemem_http.py) measures both.
//   bun run bench/serve.ts        # listens on :8900
import { Memory } from '../src/index'

const mem = new Memory()
const uid = (req: Request) => req.headers.get('x-act-as') ?? 'bench'

Bun.serve({
  port: Number(process.env.PORT ?? 8900),
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/health') return Response.json({ ok: true })
    if (url.pathname === '/v1/live/ingest' && req.method === 'POST') {
      const { chat, at } = await req.json() as { chat: string; at?: string }
      const items = await mem.ingest(uid(req), chat, { at })
      return Response.json({ items: items.map(i => ({ id: i.id, type: i.type, text: i.text })) })
    }
    if (url.pathname === '/v1/live/render') {
      const budget = Number(url.searchParams.get('budget') ?? 1500)
      const q = url.searchParams.get('q') ?? undefined
      return Response.json({ block: await mem.render(uid(req), { budget, q }) })
    }
    return new Response('not found', { status: 404 })
  },
})
console.log('livemem OSS bench server on :' + (process.env.PORT ?? 8900))
