import { useEffect, useRef, useState } from 'react'
import { Listening } from '../features/kana/Listening'
import { assessmentProvider } from '../services/assessment'
import { createRecording, maxSeconds, recordingUnavailable, type CaptureEvent, type RecordingService } from '../services/recording'
import '../features/speak/speak.css'

const phrases = [
  { label: 'Morning greeting', text: 'おはようございます。' },
  { label: 'Afternoon greeting', text: 'こんにちは。' },
  { label: 'Evening greeting', text: 'こんばんは。' },
]
type CaptureState = CaptureEvent['state'] | 'idle'
interface Take { url: string; sentence: string }

export function SpeakPage() {
  const [sentence, setSentence] = useState(phrases[0].text)
  const [state, setState] = useState<CaptureState>('idle')
  const [message, setMessage] = useState('')
  const [take, setTake] = useState<Take | null>(null)
  const [stopSignal, setStopSignal] = useState(0)
  const session = useRef<RecordingService | null>(null)
  const url = useRef('')
  const player = useRef<HTMLAudioElement>(null)
  const busy = ['requesting', 'recording', 'stopping'].includes(state)
  const unavailable = recordingUnavailable()

  function revoke() {
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = ''
  }
  useEffect(() => {
    function release() {
      session.current?.cancel()
      session.current = null
      revoke()
    }
    function leavePage() {
      release()
      setTake(null); setState('idle'); setMessage(''); setStopSignal(n => n + 1)
    }
    window.addEventListener('pagehide', leavePage)
    return () => { window.removeEventListener('pagehide', leavePage); release() }
  }, [])
  function begin() {
    if (session.current || unavailable || !sentence.trim()) return
    player.current?.pause()
    setStopSignal(n => n + 1)
    setMessage('')
    const capture = createRecording(event => {
      if (session.current !== capture) return
      if (event.state === 'ready') {
        session.current = null
        try {
          const nextUrl = URL.createObjectURL(event.blob)
          revoke()
          url.current = nextUrl
          setTake({ url: nextUrl, sentence: sentence.trim() })
          setMessage('Recording ready to replay.')
        } catch { setState('error'); setMessage('Could not open the new recording for replay. Please try again.'); return }
      } else if (event.state === 'error') {
        session.current = null
        setMessage(event.message)
      }
      setState(event.state)
    })
    session.current = capture
    capture.start()
  }
  function cancel() {
    session.current?.cancel()
    session.current = null
    setState(take ? 'ready' : 'idle')
    setMessage('Recording canceled.')
  }
  function remove() {
    player.current?.pause()
    revoke(); setTake(null); setState('idle'); setMessage('Recording deleted.')
  }
  const status = { requesting: 'Waiting for microphone permission…', recording: 'Recording · microphone on',
    stopping: 'Finishing recording…', idle: message, ready: message, error: message }[state]
  return <div className="speak-page"><h1 tabIndex={-1}>Speak</h1>
    <p className="intro">Listen to a Japanese sentence, then record yourself and compare by ear.</p>
    <div className="speak-layout">
      <section className="sentence-panel" aria-labelledby="sentence-title">
        <h2 id="sentence-title">Practice sentence</h2>
        <label htmlFor="sentence">Japanese text</label>
        <textarea id="sentence" lang="ja" rows={3} maxLength={300} disabled={busy}
          value={sentence} onChange={e => setSentence(e.target.value)} />
        <div className="phrase-choices" role="group" aria-label="Example sentences">
          {phrases.map(p => <button key={p.label} disabled={busy} aria-pressed={p.text === sentence}
            onClick={() => setSentence(p.text)}>{p.label}</button>)}
        </div>
        <Listening text={sentence.trim()} disabled={busy} sentence stopSignal={stopSignal} onListen={() => player.current?.pause()} />
      </section>
      <section className="take-panel" aria-labelledby="take-title">
        <h2 id="take-title">Your recording</h2>
        <p>Audio stays in this tab until you delete it or leave Speak. Each take is limited to {maxSeconds} seconds and 4 MiB.</p>
        {unavailable ? <p>{unavailable}</p> : <div className="record-actions">
          {!busy && <button className="record-button" disabled={!sentence.trim()} onClick={begin}>
            {take ? 'Record another take' : 'Enable microphone and record'}</button>}
          {state === 'recording' && <button className="record-button" onClick={() => session.current?.stop()}>Stop recording</button>}
          {busy && <button onClick={cancel}>Cancel recording</button>}
        </div>}
        <p role="status" className={state === 'recording' ? 'mic-active' : undefined}>{status}</p>
        {take && !busy && <div className="take-review">
          <h3>Replay your take</h3><p lang="ja">{take.sentence}</p>
          <audio ref={player} key={take.url} controls src={take.url} aria-label="Your recording"
            onPlay={() => setStopSignal(n => n + 1)} onError={() => setMessage('The browser could not play this take. Try recording again.')} />
          <button onClick={remove}>Delete recording</button>
        </div>}
        <div className="assessment-note">
          {assessmentProvider.state === 'unavailable' && <><h3>{assessmentProvider.message}</h3>
            <p>No audio is uploaded. External scoring would require separate consent.</p></>}
        </div>
      </section>
    </div>
  </div>
}
