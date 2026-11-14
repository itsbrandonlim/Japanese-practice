import rows from './rows.json'

export type Script = 'Hiragana' | 'Katakana'
export type Group = keyof typeof rows
export interface Kana { text: string; reading: string; rare: boolean }

export function chart(script: Script, group: Group) {
  return rows[group].map(([label, letters, readings]) => {
    const roman = readings.split(' ')
    const cells = letters.split(' ').map((hira, index): Kana | null => {
      if (hira === '.') return null
      const text = script === 'Hiragana' ? hira : Array.from(hira,
        char => String.fromCodePoint(char.codePointAt(0)! + 0x60)).join('')
      return { text, reading: roman[index], rare: group === 'Combined' && label === 'D' }
    })
    return { label, cells }
  })
}
