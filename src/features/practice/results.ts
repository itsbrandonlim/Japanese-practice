export const decks = ['Hiragana', 'Katakana', 'Kanji vocabulary'] as const
export type Deck = typeof decks[number]
export type Mode = 'Quiz' | 'Flashcards'
export const historyLimit = 100
// getRandomValues also works on a local network preview served over HTTP.
export function resultId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}
export interface Result {
  id: string
  finished: string
  deck: Deck
  mode: Mode
  total: number
  /** Correct quiz answers, or the number of flashcard "Study again" choices. */
  count: number
}
export function isResult(v: unknown): v is Result {
  if (!v || typeof v !== 'object') return false
  const r = v as Result
  return Object.keys(v).length === 6 && typeof r.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.id) &&
    typeof r.finished === 'string' && r.finished.length === 24 &&
    Number.isFinite(Date.parse(r.finished)) && new Date(r.finished).toISOString() === r.finished &&
    decks.includes(r.deck) && [5, 10].includes(r.total) && Number.isSafeInteger(r.count) && r.count >= 0 &&
    (r.mode === 'Flashcards' || (r.mode === 'Quiz' && r.count <= r.total))
}
export function recentFirst(a: Result, b: Result) {
  return b.finished.localeCompare(a.finished) || a.id.localeCompare(b.id)
}
export function describe(r: Result) {
  return r.mode === 'Quiz' ? r.count + ' of ' + r.total + ' correct' :
    r.total + ' cards reviewed · ' + r.count + (r.count === 1 ? ' extra review' : ' extra reviews')
}
