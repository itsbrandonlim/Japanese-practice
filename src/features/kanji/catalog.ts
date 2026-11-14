export const dataRoot = '/data/kanji/20261109-v1'
export const pageSize = 24

export interface IndexEntry {
  char: string
  meanings: string[]
  readings: string[]
  grade: number | null
  strokes: number
}

export interface Detail {
  char: string
  on: string[]
  kun: string[]
  names: string[]
  meanings: string[]
  strokes: number[]
  radical: number | null
  grade: number | null
  diagram: 'available' | 'no-file' | 'different-count' | 'different-character'
  examples: [id: string, word: string, reading: string, gloss: string][]
}

export function gradeLabel(grade: number | null) {
  if (grade === null) return 'Unclassified'
  if (grade === 8) return 'Other Jōyō'
  if (grade === 9) return 'Jinmeiyō'
  if (grade === 10) return 'Jinmeiyō variants'
  return 'Grade ' + grade
}

function fold(text: string) {
  return text.normalize('NFKC').trim().toLowerCase().replace(/[ァ-ヶ]/g,
    kana => String.fromCharCode(kana.charCodeAt(0) - 0x60))
}

export function prepareSearch(rows: IndexEntry[]) {
  return rows.map(row => ({
    row,
    meaning: row.meanings.map(fold),
    reading: row.readings.map(s => fold(s).replace(/[.\-]/g, '')),
  }))
}

export function search(index: ReturnType<typeof prepareSearch>, query: string, grade: string, strokes: string) {
  const literal = query.trim()
  const term = fold(query)
  const reading = term.replace(/[.\-]/g, '')
  const exact: IndexEntry[] = []
  const partial: IndexEntry[] = []
  for (const item of index) {
    const row = item.row
    if (grade && grade !== String(row.grade ?? 'none')) continue
    if (strokes && strokes !== String(row.strokes)) continue
    if (!term || row.char === literal || item.meaning.includes(term) || item.reading.includes(reading)) exact.push(row)
    else if (item.meaning.some(m => m.includes(term)) || (reading && item.reading.some(r => r.includes(reading)))) partial.push(row)
  }
  return exact.concat(partial)
}
