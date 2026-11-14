import { Link, useLocation, useParams } from 'react-router-dom'
import { StrokePlayback } from '../components/StrokePlayback'
import { CharacterMarks } from '../features/progress/CharacterMarks'
import { gradeLabel, type Detail } from '../features/kanji/catalog'
import { Sources } from '../features/kanji/Sources'
import { useCatalogFile } from '../features/kanji/useCatalogFile'

function Drawing({ entry, bucket }: { entry: Detail; bucket: string }) {
  const available = entry.diagram === 'available'
  const { data, retry, status } = useCatalogFile<Record<string, string[]>>(available ? 'strokes/' + bucket + '.json' : null)
  if (!available) return <p>Stroke order unavailable. {entry.diagram === 'different-count'
    ? 'The source diagram has a different stroke count.' : 'No verified diagram matches this character.'}</p>
  if (status === 'loading') return <p role="status">Loading stroke order…</p>
  const paths = data?.[entry.char]
  if (!paths) return <p role="status">Stroke diagram could not load. <button onClick={retry}>Retry diagram</button></p>
  return <StrokePlayback total={paths.length}>{progress => <div className="stroke-paper">
    <svg viewBox="0 0 109 109" className="stroke-cell" role="img" aria-label={'Stroke order for ' + entry.char}
      fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => <g key={i}><path d={d} stroke="var(--stroke-guide)" />
        {progress > i && <path d={d} stroke="currentColor" pathLength="1" strokeDasharray="1 1" strokeDashoffset={1 - Math.min(progress - i, 1)} />}
      </g>)}
    </svg>
  </div>}</StrokePlayback>
}

function Entry({ char, bucket }: { char: string; bucket: string }) {
  const { data, status, retry } = useCatalogFile<Record<string, Detail>>('details/' + bucket + '.json')
  if (status === 'loading') return <p role="status">Loading character details…</p>
  if (!data) return <p role="status">Character details could not load. <button onClick={retry}>Try again</button></p>
  const entry = data[char]
  if (!entry) return <p>This character is outside the catalog.</p>
  return <>
    <p className="intro">{entry.meanings.join(', ') || 'English meaning unavailable.'}</p>
    <CharacterMarks char={entry.char} />
    <div className="entry-layout">
      <div>
        <h2>Character details</h2>
        <dl className="entry-facts">
          <dt>On readings</dt><dd lang={entry.on.length ? 'ja' : 'en'}>{entry.on.join('、') || 'Unavailable'}</dd>
          <dt>Kun readings</dt><dd lang={entry.kun.length ? 'ja' : 'en'}>{entry.kun.join('、') || 'Unavailable'}</dd>
          {entry.names.length > 0 && <><dt>Name readings</dt><dd lang="ja">{entry.names.join('、')}</dd></>}
          <dt>Stroke count</dt><dd>{entry.strokes[0]}{entry.strokes.length > 1 && ' (alternate counts: ' + entry.strokes.slice(1).join(', ') + ')'}</dd>
          <dt>Classical radical</dt><dd>{entry.radical ? <><span lang="ja">{String.fromCodePoint(0x2f00 + entry.radical - 1)}</span> · No. {entry.radical}</> : 'Unavailable'}</dd>
          <dt>Study group</dt><dd>{gradeLabel(entry.grade)}</dd>
        </dl>
        <h2>Vocabulary</h2>
        {entry.examples.length ? <ul className="word-examples">{entry.examples.map(([id, word, reading, gloss]) =>
          <li key={id}><span lang="ja"><strong>{word}</strong>　{reading}</span><span>{gloss}</span></li>)}</ul>
          : <p>No linked example in the common-word selection.</p>}
      </div>
      <section className="entry-drawing"><h2>Stroke order</h2><Drawing key={entry.char} entry={entry} bucket={bucket} /></section>
    </div>
  </>
}

export function KanjiDetailPage() {
  const { id = '' } = useParams()
  const { search } = useLocation()
  const valid = /^\p{Script=Han}$/u.test(id)
  const bucket = valid ? (id.codePointAt(0)! >> 8).toString(16) : ''
  const { data, retry, status } = useCatalogFile<{ detailBuckets: string[] }>(valid ? 'manifest.json' : null)
  return <div className="kanji kanji-detail">
    <Link className="back-catalog" to={{ pathname: '/kanji', search }}>Back to catalog</Link>
    <h1 lang={valid ? 'ja' : 'en'} tabIndex={-1}>{valid ? id : 'Kanji details'}</h1>
    {!valid ? <p>This address does not identify a single kanji.</p>
      : status === 'loading' ? <p role="status">Loading character details…</p>
      : !data ? <p role="status">Catalog information could not load. <button onClick={retry}>Try again</button></p>
      : data.detailBuckets.includes(bucket) ? <Entry key={id} char={id} bucket={bucket} />
      : <p>This character is outside the catalog.</p>}
    <Sources />
  </div>
}
