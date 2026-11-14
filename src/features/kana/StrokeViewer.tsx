import { useEffect, useId, useState } from 'react'
import { StrokePlayback } from '../../components/StrokePlayback'
import type { Script } from './catalog'

interface Segment { outline: string; pen: string }
type Glyph = Segment[][]
type Bundle = Record<string, Glyph>

export function StrokeViewer({ text, script }: { text: string; script: Script }) {
  const [glyphs, setGlyphs] = useState<Glyph[] | null>()
  useEffect(() => {
    let active = true
    const request = script === 'Hiragana' ? import('./data/Hiragana.json') : import('./data/Katakana.json')
    request.then(module => {
      const data: Bundle = module.default
      const found = Array.from(text, char => data[char])
      if (active) setGlyphs(found.every(Boolean) ? found : null)
    }).catch(() => { if (active) setGlyphs(null) })
    return () => { active = false }
  }, [text, script])
  if (!glyphs) return <p role="status">{glyphs === null ? 'Stroke order unavailable.' : 'Loading stroke order…'}</p>
  return <StrokePlayer text={text} glyphs={glyphs} />
}

function StrokePlayer({ text, glyphs }: { text: string; glyphs: Glyph[] }) {
  const id = useId()
  const total = glyphs.reduce((sum, glyph) => sum + glyph.length, 0)
  return <StrokePlayback total={total}>{progress => {
    let offset = 0
    return <div className="stroke-paper">
      {glyphs.map((glyph, charIndex) => {
        const first = offset
        offset += glyph.length
        return <svg className="stroke-cell" viewBox="0 0 1024 1024" key={charIndex} role="img" aria-label={'Stroke order for ' + text[charIndex]}>
          {glyph.map((stroke, index) => {
            const fill = Math.max(0, Math.min(1, progress - first - index))
            return stroke.map(({ outline, pen }, part) => {
              const clip = id + '-' + charIndex + '-' + index + '-' + part
              return <g key={clip}>
                <path d={outline} fill={fill === 1 ? 'currentColor' : 'var(--stroke-guide)'} />
                {fill > 0 && fill < 1 && <>
                  <clipPath id={clip}><path d={outline} /></clipPath>
                  <path d={pen} fill="none" stroke="currentColor" strokeWidth="128" strokeLinecap="round"
                    clipPath={'url(#' + clip + ')'} pathLength="1" strokeDasharray="1 1" strokeDashoffset={1 - fill} />
                </>}
              </g>
            })
          })}
        </svg>
      })}
    </div>
  }}</StrokePlayback>
}
