import { chart, type Group, type Kana, type Script } from '../kana/catalog'
import { dataRoot, type IndexEntry } from '../kanji/catalog'
import { historyLimit, isResult, type Result } from '../practice/results'

export interface Mark {
  char: string
  favorite: boolean
  learned: boolean
}
export type Flag = 'favorite' | 'learned'
export const maxBackupBytes = 2 * 1024 * 1024
const format = 'japanese-study-progress'

export const kanaByText = new Map<string, { kana: Kana; script: Script }>()
for (const script of ['Hiragana', 'Katakana'] as const) {
  for (const group of ['Basic', 'Voiced', 'Combined'] as Group[]) {
    for (const { cells } of chart(script, group)) {
      for (const kana of cells) if (kana) kanaByText.set(kana.text, { kana, script })
    }
  }
}

export function encodeBackup(entries: Mark[], results: Result[] = []) {
  return JSON.stringify({ format, version: 2, entries, results })
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function decodeBackup(file: File): Promise<{ entries: Mark[]; results: Result[] }> {
  if (file.size > maxBackupBytes) throw new Error('Choose a backup smaller than or equal to 2 MiB.')
  let value: unknown
  try { value = JSON.parse(await file.text()) } catch { throw new Error('The file could not be read as JSON.') }
  if (!object(value) || value.format !== format) throw new Error('Choose a Kotoba Study progress backup.')
  if (value.version !== 1 && value.version !== 2) throw new Error('This backup version is unsupported.')
  if (!Array.isArray(value.entries) || value.entries.length > 20000 || Object.keys(value).length !== (value.version === 1 ? 3 : 4)) {
    throw new Error('The backup has an invalid structure.')
  }
  const results: unknown = value.version === 1 ? [] : value.results
  if (!Array.isArray(results) || results.length > historyLimit || !results.every(isResult) ||
    new Set(results.map(r => r.id)).size !== results.length) throw new Error('The backup contains invalid practice results.')
  const seen = new Set<string>()
  const kanji = new Set<string>()
  const entries: Mark[] = []
  for (const row of value.entries) {
    if (!object(row) || typeof row.char !== 'string' || typeof row.favorite !== 'boolean' ||
        typeof row.learned !== 'boolean' || (!row.favorite && !row.learned) || Object.keys(row).length !== 3) {
      throw new Error('The backup contains an invalid character record.')
    }
    if (seen.has(row.char)) throw new Error('The backup contains a duplicate character.')
    seen.add(row.char)
    if (!kanaByText.has(row.char)) {
      if (!/^\p{Script=Han}$/u.test(row.char)) throw new Error('The backup contains an unknown character.')
      kanji.add(row.char)
    }
    entries.push({ char: row.char, favorite: row.favorite, learned: row.learned })
  }
  if (kanji.size) {
    let catalog: IndexEntry[]
    try {
      const response = await fetch(dataRoot + '/index.json')
      if (!response.ok) throw new Error()
      catalog = await response.json()
    } catch { throw new Error('The kanji catalog could not load to verify this backup. Try again.') }
    for (const entry of catalog) kanji.delete(entry.char)
    if (kanji.size) throw new Error('The backup contains a kanji outside the catalog.')
  }
  return { entries, results }
}
