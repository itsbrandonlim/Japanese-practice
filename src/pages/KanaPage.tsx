import { useEffect, useRef, useState } from 'react'
import { chart, type Group, type Kana, type Script } from '../features/kana/catalog'
import { StrokeViewer } from '../features/kana/StrokeViewer'
import { Listening } from '../features/kana/Listening'
import { CharacterMarks } from '../features/progress/CharacterMarks'
import '../features/kana/kana.css'

const groups: Record<Group, string> = {
  Basic: 'Gojūon',
  Voiced: 'Dakuten and handakuten',
  Combined: 'Yōon',
}

export function CharacterDetail({ kana, script, onClose }: { kana: Kana; script: Script; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])
  return <dialog ref={dialog} className="kana-detail" aria-labelledby="detail-name" onClose={onClose}>
    <div className="detail-heading">
      <div><p>{script}</p><h2 id="detail-name"><span lang="ja">{kana.text}</span> <span>{kana.reading}</span></h2></div>
      <button type="button" onClick={() => dialog.current?.close()}>Close</button>
    </div>
    {kana.rare && <p>This spelling is rarely used.</p>}
    <CharacterMarks char={kana.text} />
    <StrokeViewer text={kana.text} script={script} />
    <Listening text={kana.text} />
  </dialog>
}

export function KanaPage() {
  const [script, setScript] = useState<Script>('Hiragana')
  const [group, setGroup] = useState<Group>('Basic')
  const [selected, setSelected] = useState<Kana | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const columns = group === 'Combined' ? ['ya', 'yu', 'yo'] : ['a', 'i', 'u', 'e', 'o']
  return <>
    <div className="kana-heading">
      <div><h1 tabIndex={-1}>Kana</h1>
        <p className="intro">Select a character to study its strokes and sound.</p></div>
      <div className="script-switch" role="group" aria-label="Writing system">
        {(['Hiragana', 'Katakana'] as const).map(name =>
          <button key={name} aria-pressed={name === script} onClick={() => setScript(name)}>
            <span lang="ja" aria-hidden="true">{name === 'Hiragana' ? 'あ' : 'ア'}</span>{name}
          </button>)}
      </div>
    </div>
    <div className="chart-toolbar">
      <h2>{groups[group]}</h2>
      <div className="group-switch" role="group" aria-label="Kana forms">
        {(Object.keys(groups) as Group[]).map(name =>
          <button key={name} aria-pressed={group === name} onClick={() => setGroup(name)}>{name}</button>)}
      </div>
    </div>
    {group === 'Voiced' && <p className="chart-note">Two short marks change the consonant sound. A small circle marks the P row.</p>}
    {group === 'Combined' && <p className="chart-note">Read the pair as one mora. The second character is a small ya, yu, or yo.</p>}
    <table className="kana-chart">
      <caption className="sr-only">{script} {groups[group]} chart</caption>
      <thead><tr><th scope="col">Row</th>{columns.map(v => <th scope="col" key={v}>{v}</th>)}</tr></thead>
      <tbody>{chart(script, group).map(({ label, cells }) =>
        <tr key={label}><th scope="row">{label}</th>
          {(label === 'Final n' ? cells.slice(0, 1) : cells).map((kana, i) =>
            <td key={i} colSpan={label === 'Final n' ? columns.length : undefined}>
              {kana && <button type="button" aria-haspopup="dialog" onClick={event => {
                trigger.current = event.currentTarget
                setSelected(kana)
              }}>
                <span className="kana-letter" lang="ja">{kana.text}</span>
                <span className="reading">{kana.reading}{kana.rare && <span> · rare</span>}</span>
              </button>}
            </td>)}
        </tr>)}</tbody>
    </table>
    <p className="kana-sources">Character chart checked against <a href={script === 'Hiragana'
      ? 'https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L01.pdf#page=14'
      : 'https://www.irodori.jpf.go.jp/assets/data/starter/pdf/X_L02.pdf#page=15'}>Irodori</a>.
      {' '}Stroke artwork by FM-SH, adapted from <a href="https://github.com/parsimonhi/animCJK/tree/c63765b150cbd567c71d05cf4a4f8d00b57045c9/svgsJaKana">AnimCJK</a>.
      {' '}<a href="/licenses/animcjk/LGPL.txt">LGPL v3 or later</a> · <a href="/licenses/animcjk/kana-svg-source.json.gz" download>Download stroke source</a>
    </p>
    {selected && <CharacterDetail kana={selected} script={script} onClose={() => { setSelected(null); trigger.current?.focus() }} />}
  </>
}
