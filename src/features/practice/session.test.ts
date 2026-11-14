import { expect, it } from 'vitest'
import { advance, answer, bank, matches, reveal, start } from './session'
import { decks, resultId } from './results'
import { decodeBackup, encodeBackup } from '../progress/backup'

it('uses the exact spelling and accepts its alternate readings without erasing mora distinctions', () => {
  const pool = bank('Kanji vocabulary')
  const japan = pool.find(c => c.text === '日本')!
  for (const valid of ['にほん', 'にっぽん', ' ﾆｯﾎﾟﾝ ']) expect(matches(japan, valid)).toBe(true)
  for (const invalid of ['にぽん', 'ひ', '', 'nihon']) expect(matches(japan, invalid)).toBe(false)
  expect(matches(pool.find(c => c.text === '学校')!, 'がっこ')).toBe(false)
  expect(new Set(pool.map(c => c.text)).size).toBe(42)
})

it.each(decks)('deals distinct prompts for %s and unambiguous kana choices', deck => {
  const s = start(deck, 'Quiz', 10)
  expect(new Set(s.queue.map(q => q.text)).size).toBe(10)
  for (const q of s.queue) {
    if (deck !== 'Kanji vocabulary') {
      expect(new Set(q.choices).size).toBe(4)
      expect(q.choices.filter(choice => matches(q, choice))).toHaveLength(1)
    } else expect(q.choices).toEqual([])
  }
})

it('locks the first answer and scores only submitted questions', () => {
  let s = start('Katakana', 'Quiz', 5)
  expect(advance(s)).toBe(s)
  expect(answer(s, '  ')).toBe(s)
  const first = s.queue[0]
  s = answer(s, 'wrong')
  expect(answer(s, first.readings[0])).toBe(s)
  s = advance(s)
  while (s.queue.length) s = advance(answer(s, s.queue[0].readings[0]))
  expect(s.correct).toBe(4)
  expect(s.missed).toEqual([first])
})

it('defers only revealed flashcards and counts the extra review separately', () => {
  let s = start('Hiragana', 'Flashcards', 5)
  const first = s.queue[0]
  expect(advance(s, true)).toBe(s)
  s = advance(reveal(s), true)
  expect(s.queue.at(-1)).toBe(first)
  while (s.queue.length) s = advance(reveal(s))
  expect([s.total, s.again, s.correct]).toEqual([5, 1, 0])
})

it('round-trips sessions, rejects impossible scores and duplicate IDs, and reads legacy files', async () => {
  const r = { id: resultId(), finished: new Date().toISOString(), mode: 'Quiz' as const, deck: 'Hiragana' as const, count: 4, total: 5 }
  const read = (text: string) => decodeBackup({ size: text.length, text: async () => text } as File)
  expect((await read(encodeBackup([], [r]))).results).toEqual([r])
  for (const changes of [{ count: 6 }, { count: -1 }, { count: 1.5 }, { id: '' }, { finished: 'invalid' }, { total: 0 }]) {
    await expect(read(encodeBackup([], [{ ...r, ...changes }]))).rejects.toThrow('invalid practice')
  }
  await expect(read(encodeBackup([], [r, r]))).rejects.toThrow('invalid practice')
  expect(await read('{"format":"japanese-study-progress","version":1,"entries":[]}')).toEqual({ entries: [], results: [] })
})
