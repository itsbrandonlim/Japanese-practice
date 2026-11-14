import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CharacterDetail } from './KanaPage'
import { BackupControls } from '../features/progress/BackupControls'
import { kanaByText, type Flag } from '../features/progress/backup'
import { snapshot } from '../features/progress/storage'
import { describe } from '../features/practice/results'
import { useProgress } from '../features/progress/useProgress'

const pageSize = 24
export function ProgressPage() {
  const { data: saved, error, retry } = useProgress(snapshot)
  const data = saved?.entries
  const [filter, setFilter] = useState<'all' | Flag>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const detail = kanaByText.get(selected)
  const matches = (data ?? []).filter(mark => filter === 'all' || mark[filter])
  const pages = Math.max(1, Math.ceil(matches.length / pageSize))
  const current = Math.min(page, pages)
  return <div className="progress-page">
    <h1 tabIndex={-1}>Progress</h1>
    <p className="intro">Your favorites and learned characters are saved in this browser.</p>
    {error ? <p role="alert">Local progress is unavailable. <button onClick={retry}>Retry storage</button></p>
      : !data ? <p role="status">Loading progress…</p> : <>
        <div className="progress-layout">
          <section aria-labelledby="saved-title"><h2 id="saved-title">Saved characters</h2>
            <div className="progress-filters" role="group" aria-label="Show saved characters">
              {(['all', 'favorite', 'learned'] as const).map(value =>
                <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1) }}>
                  {value === 'all' ? 'All' : value === 'favorite' ? 'Favorites' : 'Learned'} ({value === 'all' ? data.length : data.filter(item => item[value]).length})
                </button>)}
            </div>
            {!matches.length && <p className="progress-empty">{data.length ? 'No characters with this mark.' :
              <>Open a character in <Link to="/kana">Kana</Link> or <Link to="/kanji">Kanji</Link> and select Favorite or Learned.</>}</p>}
            <ul className="saved-list">{matches.slice((current - 1) * pageSize, current * pageSize).map(item => {
              const kana = kanaByText.get(item.char)
              const label = <><span className="saved-char" lang="ja">{item.char}</span><span>{kana ? kana.script + ' · ' + kana.kana.reading : 'Kanji'}
                <small>{[item.favorite && 'Favorite', item.learned && 'Learned'].filter(Boolean).join(' · ')}</small></span></>
              return <li key={item.char}>{kana ? <button aria-haspopup="dialog" onClick={() => setSelected(item.char)}>{label}</button>
                : <Link to={'/kanji/' + item.char}>{label}</Link>}</li>
            })}</ul>
            {pages > 1 && <nav aria-label="Saved character pages" className="progress-filters">
              <button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>
              <span>Page {current} of {pages}</span>
              <button disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button>
            </nav>}
          </section>
          <BackupControls />
        </div>
        <section className="practice-history" aria-labelledby="history-title"><h2 id="history-title">Practice history</h2>
          <p>The latest 100 completed sessions in this browser.</p>
          {saved?.results.length ? <ol>{saved.results.map(r => <li key={r.id}><strong>{r.deck} · {r.mode}</strong>
            <span>{describe(r)}</span><time dateTime={r.finished}>{new Date(r.finished).toLocaleString()}</time></li>)}</ol>
            : <p>No completed sessions yet. <Link to="/practice">Start practicing</Link></p>}
        </section>
      </>}
    {detail && <CharacterDetail kana={detail.kana} script={detail.script} onClose={() => setSelected('')} />}
  </div>
}
