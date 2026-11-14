import { afterEach, expect, it, vi } from 'vitest'
import { decodeBackup, encodeBackup, maxBackupBytes } from './backup'

function file(text: string, size = text.length): File {
  return { size, text: async () => text } as File
}
const kana = { char: 'きゃ', favorite: true, learned: false }
afterEach(() => vi.unstubAllGlobals())

it('round-trips both scripts, supplementary kanji, and exact compatibility characters', async () => {
  const entries = [kana, ...['キャ', '𠮟', '﨑', '崎'].map(char => ({ char, favorite: false, learned: true }))]
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ['𠮟', '﨑', '崎'].map(char => ({ char })) })))
  expect(await decodeBackup(file(encodeBackup(entries)))).toEqual({ entries, results: [] })
})

it('validates kana-only and empty backups without loading the kanji catalog', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(await decodeBackup(file(encodeBackup([])))).toEqual({ entries: [], results: [] })
  expect(await decodeBackup(file(encodeBackup([kana])))).toEqual({ entries: [kana], results: [] })
  expect(fetch).not.toHaveBeenCalled()
})

it('rejects oversized files before reading them', async () => {
  const text = vi.fn()
  await expect(decodeBackup({ size: maxBackupBytes + 1, text } as unknown as File)).rejects.toThrow('2 MiB')
  expect(text).not.toHaveBeenCalled()
})

it.each([
  ['malformed JSON', '{'],
  ['different application', '{"format":"other","version":1,"entries":[]}'],
  ['future version', encodeBackup([]).replace('"version":2', '"version":3')],
  ['duplicate', encodeBackup([kana, kana])],
  ['extra fields', encodeBackup([kana]).replace('"learned":false', '"learned":false,"extra":1')],
  ['non-boolean flag', encodeBackup([kana]).replace('true', '"true"')],
  ['unmarked record', encodeBackup([{ ...kana, favorite: false }])],
  ['unknown combination', encodeBackup([{ ...kana, char: 'ああ' }])],
])('rejects %s', async (_, text) => {
  await expect(decodeBackup(file(text))).rejects.toThrow()
})

it('rejects unknown kanji and distinguishes a failed catalog request', async () => {
  const backup = file(encodeBackup([{ ...kana, char: '水' }]))
  vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => [] }))
  await expect(decodeBackup(backup)).rejects.toThrow('outside the catalog')
  vi.stubGlobal('fetch', async () => ({ ok: false }))
  await expect(decodeBackup(backup)).rejects.toThrow('could not load')
})
