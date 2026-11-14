import { chart } from '../kana/catalog'
import words from './words.json'
import type { Deck, Mode } from './results'

export interface Card { text: string; readings: string[]; meaning?: string }
export function bank(deck: Deck): Card[] {
  if (deck === 'Kanji vocabulary') return words
  return (['Basic', 'Voiced', 'Combined'] as const).flatMap(group =>
    chart(deck, group).flatMap(row => row.cells.flatMap(k => k && !k.rare ? [{ text: k.text, readings: [k.reading] }] : [])))
}
export function shuffle<T>(items: T[], random = Math.random) {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
export function normalize(answer: string) {
  return answer.trim().normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,
    c => String.fromCharCode(c.charCodeAt(0) - 0x60))
}
export function matches(card: Card, answer: string) {
  return card.readings.some(reading => normalize(reading) === normalize(answer))
}
export interface Question extends Card { choices: string[] }
export interface Session {
  deck: Deck; mode: Mode; total: number; queue: Question[]; correct: number; again: number
  answer: string | null; missed: Question[]
}
export function start(deck: Deck, mode: Mode, size: 5 | 10): Session {
  const pool = bank(deck)
  const readings = [...new Set(pool.flatMap(card => card.readings))]
  const queue = shuffle(pool).slice(0, size).map(card => ({ ...card,
    choices: deck !== 'Kanji vocabulary' && mode === 'Quiz' ?
      shuffle([card.readings[0], ...shuffle(readings.filter(r => !matches(card, r))).slice(0, 3)]) : [] }))
  return { deck, mode, total: queue.length, queue, correct: 0, again: 0, answer: null, missed: [] }
}
export function answer(s: Session, input: string): Session {
  const card = s.queue[0]
  if (s.mode !== 'Quiz' || !card || s.answer !== null || !input.trim()) return s
  const correct = matches(card, input)
  return { ...s, answer: input.trim(), correct: s.correct + Number(correct), missed: correct ? s.missed : [...s.missed, card] }
}
export function reveal(s: Session): Session {
  return s.mode === 'Flashcards' && s.queue.length ? { ...s, answer: s.queue[0].readings[0] } : s
}
export function advance(s: Session, again = false): Session {
  if (!s.queue.length || s.answer === null || (again && s.mode !== 'Flashcards')) return s
  const [first, ...rest] = s.queue
  return { ...s, queue: again ? [...rest, first] : rest, again: s.again + Number(again), answer: null }
}
