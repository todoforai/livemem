import { test, expect } from 'bun:test'
import { emptyState, observe, render, day, tok } from './src/core'
import { parseItems } from './src/extract'

const e = (x: number) => { const v = Array(8).fill(0); v[x % 8] = 1; return v }

test('observe dedups identical text', () => {
  const st = emptyState()
  observe(st, 'The user owns a red bike.', 'fact', [], e(0), 19000)
  observe(st, 'the user owns a red  bike.', 'fact', [], e(0), 19100)
  expect(Object.keys(st.items).length).toBe(1)
})

test('render stays under budget (real-token proxy: chars <= B*4)', () => {
  const st = emptyState()
  for (let k = 0; k < 300; k++)
    observe(st, `The user did activity ${k} costing $${k * 7 % 900} at place ${k % 37}.`, 'episode', [], e(k), 19000 + k)
  for (const B of [500, 1500, 5000]) expect(render(st, B).length).toBeLessThanOrEqual(B * 4)
})

test('query conditioning ranks by cosine (tight budget keeps only the relevant fact)', () => {
  const st = emptyState()
  observe(st, 'The user deploys with bun run deploy.', 'procedure', [], e(1), 19000)
  observe(st, 'The user has a cat named Miso.', 'fact', [], e(2), 19000)
  const block = render(st, 60, e(2))  // fits one item after header — cosine decides which
  expect(block).toContain('Miso')
  expect(block).not.toContain('deploy')
})

test('parseItems salvages truncated arrays', () => {
  expect(parseItems('[{"text":"a","type":"fact","ctx":[]},{"text":"b","ty')).toHaveLength(1)
})

test('day labels are dates', () => {
  const st = emptyState()
  observe(st, 'The user visited Rome.', 'episode', [], e(0), day(Date.parse('2026-08-01')))
  expect(render(st, 500)).toContain('[2026-08-01]')
})
