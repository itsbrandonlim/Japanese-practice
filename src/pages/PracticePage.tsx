import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { advance, answer, bank, matches, reveal, shuffle, start, type Session } from '../features/practice/session'
import { decks, describe, resultId, type Deck, type Mode, type Result } from '../features/practice/results'
import { mergeProgress } from '../features/progress/storage'
import '../features/practice/practice.css'

export function PracticePage() {
  const [deck, setDeck] = useState<Deck>('Hiragana')
  const [mode, setMode] = useState<Mode>('Quiz')
  const [size, setSize] = useState<5 | 10>(5)
  const [session, setSession] = useState<Session | null>(null)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [save, setSave] = useState<'saving' | 'saved' | 'error'>('saving')
  const focus = useRef<HTMLHeadingElement>(null)
  const setupButton = useRef<HTMLButtonElement>(null)
  const card = session?.queue[0]
  const count = session ? session.total - session.queue.length + 1 : 0
  const graded = session?.answer != null
  useEffect(() => { if (session) focus.current?.focus() }, [card, graded, count, result, session?.again])
  function reset() {
    setSession(null); setResult(null); setInput('')
    requestAnimationFrame(() => setupButton.current?.focus())
  }
  async function persist(r: Result) {
    setSave('saving')
    try { await mergeProgress([], [r]); setSave('saved') } catch { setSave('error') }
  }
  function next(again = false) {
    if (!session) return
    const s = advance(session, again)
    setInput(''); setSession(s)
    if (!s.queue.length) {
      const r = { id: resultId(), finished: new Date().toISOString(), mode: s.mode, deck: s.deck,
        total: s.total, count: s.mode === 'Quiz' ? s.correct : s.again }
      setResult(r); void persist(r)
    }
  }
  return <div className="practice"><h1 tabIndex={-1}>Practice</h1>
    {!session ? <>
      <p className="intro">Test your reading or turn over a few cards at your own pace.</p>
      <section className="study-panel" aria-labelledby="setup-title">
        <p className="study-label">Study session</p><h2 id="setup-title">Choose a deck</h2>
        <div className="practice-fields">
          <label>Deck<select value={deck} onChange={e => setDeck(e.target.value as Deck)}>{decks.map(d => <option key={d}>{d}</option>)}</select></label>
          <label>Mode<select value={mode} onChange={e => setMode(e.target.value as Mode)}><option>Quiz</option><option>Flashcards</option></select></label>
          <label>Session length<select value={size} onChange={e => setSize(Number(e.target.value) as 5 | 10)}><option value={5}>5 cards</option><option value={10}>10 cards</option></select></label>
        </div>
        <p>{bank(deck).length} {deck === 'Kanji vocabulary' ? 'words · readings from JMdict common entries.' : 'kana · basic, voiced, and combined forms.'}</p>
        <button className="study-primary" ref={setupButton} onClick={() => { setInput(''); setSession(start(deck, mode, size)) }}>Start {mode.toLowerCase()}</button>
      </section>
      <Link className="return-link" to="/progress">View practice history</Link>
    </> : result ? <section className="study-panel" aria-labelledby="finished-title">
      <p className="study-label">{result.deck} · {result.mode}</p><h2 id="finished-title" tabIndex={-1} ref={focus}>Session complete</h2>
      <p className="result-line">{describe(result)}</p>
      {session.missed.length > 0 && <><h3>Readings to review</h3><ul>{session.missed.map(q => <li key={q.text}><span lang="ja">{q.text}</span> · <span lang={q.meaning ? 'ja' : 'en'}>{q.readings.join(' / ')}</span></li>)}</ul></>}
      <p role="status">{save === 'saved' ? 'Saved in this browser.' : save === 'saving' ? 'Saving result…' : 'Could not save this result. Your session summary is still available here.'}</p>
      {save === 'error' && <button onClick={() => void persist(result)}>Retry saving</button>}
      <button ref={setupButton} disabled={save === 'saving'} onClick={reset}>Choose another session</button> <Link className="return-link" to="/progress">View practice history</Link>
    </section> : card && <section className="study-panel" aria-labelledby="card-title">
      <p className="study-label">{deck} · {mode} · {mode === 'Quiz' ? 'Question ' + count + ' of ' + session.total : session.queue.length + ' remaining'}</p>
      <h2 id="card-title" tabIndex={-1} ref={graded ? undefined : focus} className="card-face"><span className="sr-only">Read </span><span lang="ja">{card.text}</span></h2>
      {mode === 'Quiz' ? !graded ? card.choices.length ? <>
        <p>Which chart reading matches this kana?</p><div className="answer-choices">{card.choices.map(choice => <button key={choice} onClick={() => setSession(s => s && answer(s, choice))}>{choice}</button>)}</div>
      </> : <form onSubmit={e => { e.preventDefault(); setSession(s => s && answer(s, input)) }}>
        <label>Enter a dictionary reading in kana<input value={input} onChange={e => setInput(e.target.value)} autoComplete="off" maxLength={100} lang="ja" /></label>
        <button className="study-primary" disabled={!input.trim()} type="submit">Check answer</button>
      </form> : <>
        <h3 tabIndex={-1} ref={focus}>{matches(card, session.answer!) ? 'Correct' : 'Review this reading'}</h3>
        {!matches(card, session.answer!) && <p>Your answer: {session.answer}</p>}
      </> : !graded ? <button className="study-primary" onClick={() => setSession(reveal(session))}>Reveal reading</button> :
        <h3 tabIndex={-1} ref={focus}>Card revealed</h3>}
      {graded && <>
        <p>Listed {card.readings.length === 1 ? 'reading' : 'readings'}: <strong lang={card.meaning ? 'ja' : 'en'}>{card.readings.join(' / ')}</strong></p>
        {card.meaning && <p>One meaning: {card.meaning}</p>}
        <div className="practice-actions">{mode === 'Flashcards' && <button onClick={() => next(true)}>Study again</button>}
          <button className="study-primary" onClick={() => next()}>{mode === 'Flashcards' ? 'Set aside' : session.queue.length === 1 ? 'See results' : 'Next question'}</button></div>
      </>}
      <div className="session-tools">
        {mode === 'Flashcards' && !graded && session.queue.length > 1 && <button onClick={() => setSession({ ...session, queue: shuffle(session.queue) })}>Shuffle remaining</button>}
        <button onClick={reset}>End without saving</button>
      </div>
    </section>}
    {deck === 'Kanji vocabulary' && <p className="practice-source">Vocabulary: JMdict (EDRDG), common entries. <a href="/licenses/kanji/NOTICE.txt">Source and license</a></p>}
  </div>
}
