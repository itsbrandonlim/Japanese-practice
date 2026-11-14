import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { gradeLabel, pageSize, prepareSearch, search, type IndexEntry } from '../features/kanji/catalog'
import { Sources } from '../features/kanji/Sources'
import { useCatalogFile } from '../features/kanji/useCatalogFile'
import '../features/kanji/kanji.css'

export function KanjiPage() {
  const [params, setParams] = useSearchParams()
  const { data, status, retry } = useCatalogFile<IndexEntry[]>('index.json')
  const query = params.get('q') || ''
  const grade = params.get('grade') || ''
  const strokes = params.get('strokes') || ''
  const index = useMemo(() => prepareSearch(data ?? []), [data])
  const matches = useMemo(() => search(index, query, grade, strokes), [index, query, grade, strokes])
  const counts = useMemo(() => [...new Set(data?.map(row => row.strokes))].sort((a, b) => a - b), [data])
  const pages = Math.max(1, Math.ceil(matches.length / pageSize))
  const requested = Number(params.get('page'))
  const page = Number.isSafeInteger(requested) ? Math.min(pages, Math.max(1, requested)) : 1
  const start = (page - 1) * pageSize
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (key !== 'page') next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: key === 'q', preventScrollReset: true })
  }
  return <div className="kanji">
    <h1 tabIndex={-1}>Kanji</h1>
    <p className="intro">Find a character by its writing, kana reading, or English meaning.</p>
    <div className="catalog-filters">
      <label>Search kanji<input type="search" value={query} onChange={e => update('q', e.target.value)} placeholder="水, みず, or water" /></label>
      <label>Study group<select value={grade} onChange={e => update('grade', e.target.value)}>
        <option value="">All groups</option>
        {[1, 2, 3, 4, 5, 6, 8, 9, 10, null].map(n => <option key={n ?? 'none'} value={n ?? 'none'}>{gradeLabel(n)}</option>)}
      </select></label>
      <label>Stroke count<select value={strokes} onChange={e => update('strokes', e.target.value)}>
        <option value="">Any count</option>{counts.map(n => <option key={n}>{n}</option>)}
      </select></label>
    </div>
    {status === 'loading' ? <p role="status">Loading the kanji catalog…</p> : !data ?
      <div role="status">The catalog could not load. <button onClick={retry}>Try again</button></div> : <>
        <div className="results-bar">
          <p role="status">{matches.length ? (start + 1).toLocaleString('en-US') + '–' + Math.min(start + pageSize, matches.length).toLocaleString('en-US') + ' of ' + matches.length.toLocaleString('en-US') + ' characters' : 'No matching characters.'}</p>
          {(query || grade || strokes) && <button onClick={() => setParams({})}>Clear filters</button>}
        </div>
        <ul className="kanji-list">{matches.slice(start, start + pageSize).map(item => <li key={item.char}>
          <Link to={{ pathname: '/kanji/' + item.char, search: params.toString() }}>
            <span className="kanji-glyph" lang="ja">{item.char}</span>
            <span><strong>{item.meanings.slice(0, 2).join(', ') || 'English meaning unavailable'}</strong>
              <small>{item.strokes} {item.strokes === 1 ? 'stroke' : 'strokes'} · {gradeLabel(item.grade)}</small></span>
          </Link></li>)}</ul>
        {pages > 1 && <nav aria-label="Catalog pages" className="catalog-pagination">
          <button disabled={page === 1} onClick={() => update('page', String(page - 1))}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => update('page', String(page + 1))}>Next</button>
        </nav>}
      </>}
    <Sources />
  </div>
}
