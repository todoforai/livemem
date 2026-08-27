// extract.ts — conversation text → fact candidates + embeddings.
// One LLM call per ingest; embeddings in a single batch call.

export type FactType = 'procedure' | 'preference' | 'fact' | 'episode'
export interface Candidate { text: string; type: FactType; ctx: string[] }

const PROMPT = `Extract the factual claims from this conversation that could answer a future question about the user, the project, or what happened.
Include user-specific details, quantities and dates as stated, events with when they happened, preferences and standing rules.
Types:
- procedure: how something is done or accessed here
- preference: standing rule or user taste
- fact: durable user/project-specific attribute
- episode: dated one-off event
Each item: ONE self-contained sentence understandable without the chat; name the subject explicitly (say "the user", not "he/she/I"). ctx = 1-4 lowercase topic tags.
Return ONLY a JSON array: [{"text":"...","type":"procedure|preference|fact|episode","ctx":["tag"]}]. Empty array if the conversation contains no user- or project-specific information.`

export async function extract(chat: string): Promise<Candidate[]> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LIVEMEM_EXTRACT_MODEL ?? 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages: [{ role: 'user', content: `${PROMPT}\n\n<conversation>\n${chat.slice(0, 60000)}\n</conversation>` }],
    }),
  })
  if (!r.ok) throw new Error(`extract: ${r.status} ${await r.text()}`)
  return parseItems((await r.json()).content[0].text)
}

// Tolerant parse: output may be truncated mid-array — salvage complete leading objects.
export function parseItems(txt: string): Candidate[] {
  const start = txt.indexOf('[')
  if (start < 0) return []
  try { return JSON.parse(txt.slice(start, txt.lastIndexOf(']') + 1 || undefined)) } catch {}
  const cut = txt.slice(start).lastIndexOf('}')
  if (cut < 0) return []
  try { return JSON.parse(txt.slice(start).slice(0, cut + 1) + ']') } catch { return [] }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', dimensions: 512, input: texts.map(t => t.trim() || '(empty)') }),
  })
  if (!r.ok) throw new Error(`embed: ${r.status} ${await r.text()}`)
  return (await r.json()).data.map((d: { embedding: number[] }) => d.embedding)
}
