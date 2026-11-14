import { expect, it } from 'vitest'
import { chart, type Group } from './catalog'
import hira from './data/Hiragana.json'
import kata from './data/Katakana.json'

for (const script of ['Hiragana', 'Katakana'] as const) {
  it(script + ' has all 107 distinct entries and all required stroke paths', () => {
    const assets: Record<string, { outline: string; pen: string }[][]> = script === 'Hiragana' ? hira : kata
    const seen = new Set<string>()
    const components = new Set<string>()
    for (const [group, count] of Object.entries({ Basic: 46, Voiced: 25, Combined: 36 })) {
      const entries = chart(script, group as Group).flatMap(row => row.cells).filter(cell => cell !== null)
      expect(entries.length).toBe(count)
      for (const entry of entries) {
        seen.add(entry.text)
        expect(entry.text.normalize('NFC')).toBe(entry.text)
        expect(entry.reading).toMatch(/^[a-z]+$/)
        for (const char of entry.text) components.add(char)
      }
    }
    expect(seen.size).toBe(107)
    expect(components.size).toBe(74)
    expect(new Set(Object.keys(assets))).toEqual(components)
    for (const strokes of Object.values(assets)) {
      expect(strokes.length).toBeGreaterThan(0)
      for (const stroke of strokes) {
        expect(stroke.length).toBeGreaterThan(0)
        for (const { outline, pen } of stroke) {
          expect(outline).toMatch(/^M/)
          expect(pen).toMatch(/^M/)
        }
      }
    }
  })
}

it('keeps gaps and duplicate sounds distinct, and labels rare combinations', () => {
  const basic = chart('Hiragana', 'Basic')
  expect(basic.find(row => row.label === 'Y')?.cells.map(cell => cell?.reading)).toEqual(['ya', undefined, 'yu', undefined, 'yo'])
  const voiced = chart('Hiragana', 'Voiced').flatMap(row => row.cells)
  expect(voiced.filter(k => k?.reading === 'ji').map(k => k?.text)).toEqual(['じ', 'ぢ'])
  const combined = chart('Katakana', 'Combined').flatMap(row => row.cells)
  expect(combined.filter(k => k?.rare).map(k => k?.text)).toEqual(['ヂャ', 'ヂュ', 'ヂョ'])
  expect(hira['あ'].map(stroke => stroke.length)).toEqual([1, 1, 2])
})
