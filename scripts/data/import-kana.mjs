// Run against a clean checkout of the pinned AnimCJK revision.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { JSDOM } from 'jsdom'
import assert from 'node:assert/strict'

const revision = 'c63765b150cbd567c71d05cf4a4f8d00b57045c9'
if (!process.argv[2]) throw new Error('Pass the path to a pinned AnimCJK checkout.')
const upstream = resolve(process.argv[2])
const root = fileURLToPath(new URL('../../', import.meta.url))
const git = (...args) => execFileSync('git', ['-C', upstream, ...args], { encoding: 'utf8' })
assert.equal(git('rev-parse', 'HEAD').trim(), revision)
const rows = JSON.parse(readFileSync(join(root, 'src/features/kana/rows.json'), 'utf8'))
const characters = new Set()
for (const group of Object.values(rows)) {
  for (const [, letters, readings] of group) {
    const tokens = letters.split(' ')
    const roman = readings.split(' ')
    assert.equal(tokens.length, roman.length)
    tokens.forEach((token, index) => {
      assert.equal(token === '.', roman[index] === '.')
      if (token === '.') return
      assert.match(token, /^[ぁ-ゖ]+$/u)
      assert.equal(token.normalize('NFC'), token)
      for (const char of token) characters.add(char)
    })
  }
}

function safePath(element) {
  const d = element.getAttribute('d')
  assert.ok(d && d.length < 50000 && /^M[MLHVCSQTAZmlhvcsqtaz0-9., +\-\s]+$/.test(d), 'Unexpected path grammar')
  return d
}

function extract(svg, code) {
  const dom = new JSDOM(svg, { contentType: 'image/svg+xml' })
  try {
    const doc = dom.window.document
    assert.equal(doc.documentElement.id, 'z' + code)
    assert.equal(doc.documentElement.getAttribute('viewBox'), '0 0 1024 1024')
    const strokes = []
    for (const pen of doc.querySelectorAll('svg > path[clip-path]')) {
      const clip = pen.getAttribute('clip-path').match(/^url\(#(z\d+c(\d+)[a-z]?)\)$/)
      assert.ok(clip && clip[1].startsWith('z' + code + 'c'))
      const reference = doc.getElementById(clip[1])?.firstElementChild?.getAttribute('href')
      assert.equal(reference, '#' + clip[1].replace('c', 'd'))
      const outline = doc.getElementById(reference.slice(1))
      assert.equal(outline?.localName, 'path')
      const index = Number(clip[2]) - 1
      assert.ok(index === strokes.length || index === strokes.length - 1)
      if (index === strokes.length) strokes.push([])
      strokes[index].push({ outline: safePath(outline), pen: safePath(pen) })
    }
    assert.ok(strokes.length > 0)
    return strokes
  } finally { dom.window.close() }
}

const sources = {}
const bundles = {}
for (const script of ['Hiragana', 'Katakana']) {
  const glyphs = {}
  for (const hira of characters) {
    const code = hira.codePointAt(0) + (script === 'Katakana' ? 0x60 : 0)
    const filename = 'svgsJaKana/' + code + '.svg'
    // Read committed bytes, independent of worktree edits and newline conversion.
    sources[filename] = git('show', revision + ':' + filename)
    glyphs[String.fromCodePoint(code)] = extract(sources[filename], code)
  }
  bundles[script] = glyphs
}
const dataDir = join(root, 'src/features/kana/data')
const licenses = join(root, 'public/licenses/animcjk')
mkdirSync(dataDir, { recursive: true })
mkdirSync(licenses, { recursive: true })
for (const [name, glyphs] of Object.entries(bundles)) {
  writeFileSync(join(dataDir, name + '.json'), JSON.stringify(glyphs) + '\n')
  console.log(name, Object.keys(glyphs).length, 'verified glyphs')
}
for (const file of ['COPYING.txt', 'LGPL.txt']) writeFileSync(join(licenses, file), git('show', revision + ':licenses/' + file))
const archive = gzipSync(JSON.stringify(sources))
writeFileSync(join(licenses, 'kana-svg-source.json.gz'), archive)
console.log('Corresponding source SHA-256:', createHash('sha256').update(archive).digest('hex'))
