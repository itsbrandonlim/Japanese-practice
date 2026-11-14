import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { dataRoot, prepareSearch, search, type Detail, type IndexEntry } from './catalog'

const root = join(process.cwd(), 'public', dataRoot)
function json<T>(name: string): T {
  return JSON.parse(readFileSync(join(root, name), 'utf8'))
}
const rows = json<IndexEntry[]>('index.json')
const index = prepareSearch(rows)

it('finds literal, English, half-width kana, and readings with okurigana', () => {
  for (const query of ['水', ' WATER ', 'ﾐｽﾞ', 'スイ']) {
    expect(search(index, query, '1', '4').map(row => row.char)).toContain('水')
  }
  expect(search(index, 'たべる', '', '').map(row => row.char)).toContain('食')
  expect(search(index, '水', '2', '')).toHaveLength(0)
  expect(search(index, '水', '', '5')).toHaveLength(0)
  expect(search(index, '', 'none', '').every(row => row.grade === null)).toBe(true)
})

it('resolves exact compatibility ideographs and supplementary characters as distinct identifiers', () => {
  for (const char of [rows.find(r => r.char.length === 2)!.char, '﨑']) {
    expect(search(index, char, '', '')[0].char).toBe(char)
  }
})

it('joins every search result to one detail and validates all published diagrams and examples', () => {
  const chars = new Set(rows.map(r => r.char))
  const manifest = json<{ characters: number; coverage: Record<string, number> }>('manifest.json')
  const drawingFiles = new Set(readdirSync(join(root, 'strokes')))
  let visited = 0
  let diagrams = 0
  let withExamples = 0
  for (const file of readdirSync(join(root, 'details'))) {
    const entries = json<Record<string, Detail>>('details/' + file)
    const paths = drawingFiles.has(file) ? json<Record<string, string[]>>('strokes/' + file) : {}
    for (const [char, entry] of Object.entries(entries)) {
      if (!chars.delete(char) || entry.char !== char || (char.codePointAt(0)! >> 8).toString(16) + '.json' !== file) {
        throw new Error('Detail mapping mismatch for ' + char)
      }
      visited++
      if (entry.diagram === 'available') {
        if (paths[char]?.length !== entry.strokes[0]) throw new Error('Stroke count mismatch for ' + char)
        delete paths[char]
        diagrams++
      }
      if (entry.examples.length) withExamples++
      if (entry.examples.some(([id, spelling, reading, gloss]) => !id || !spelling.includes(char) || !reading || !gloss)) {
        throw new Error('Invalid vocabulary for ' + char)
      }
    }
    expect(Object.keys(paths)).toHaveLength(0)
    drawingFiles.delete(file)
  }
  expect(drawingFiles.size).toBe(0)
  expect(chars.size).toBe(0)
  expect(visited).toBe(rows.length)
  expect(visited).toBe(manifest.characters)
  expect(diagrams).toBe(manifest.coverage.available)
  expect(withExamples).toBe(manifest.coverage.withVocabulary)
})
