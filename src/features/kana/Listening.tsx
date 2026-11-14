import { useEffect, useState } from 'react'
import { browserSpeech } from '../../services/speech'

interface ListeningProps {
  text: string
  disabled?: boolean
  onListen?: () => void
  stopSignal?: number
  sentence?: boolean
}
export function Listening({ text, disabled = false, onListen, stopSignal, sentence = false }: ListeningProps) {
  const [service] = useState(browserSpeech)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [choice, setChoice] = useState('')
  const [rate, setRate] = useState(1)
  const [state, setState] = useState<'idle' | 'playing' | 'done' | 'failed'>('idle')
  useEffect(() => {
    if (!service) return
    const refresh = () => setVoices(service.voices())
    const unsubscribe = service.subscribe(refresh)
    refresh()
    return () => { unsubscribe(); service.stop() }
  }, [service])
  const voice = voices.find(v => v.voiceURI === choice) ?? voices[0]
  useEffect(() => { service?.stop(); setState('idle') }, [service, text, disabled, stopSignal])
  function listen() {
    if (!service || !voice || disabled || !text.trim()) return
    onListen?.()
    setState('playing')
    service.play(text, voice, rate, failed => setState(failed ? 'failed' : 'done'))
  }
  return <section className="listening" aria-label="Listening">
    <h3>Listening</h3>
    {voice && <div className="detail-controls">
      <label>Japanese voice<select value={voice.voiceURI} onChange={e => setChoice(e.target.value)}>
        {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? '' : ' (online)'}</option>)}
      </select></label>
      <label>Speech speed<select value={rate} onChange={e => setRate(Number(e.target.value))}>
        <option value=".7">Slow</option><option value="1">Normal</option>
      </select></label>
      <button type="button" disabled={disabled || !text.trim()} onClick={listen}>{state === 'done' || state === 'playing' ? 'Listen again' : 'Listen'}</button>
    </div>}
    {sentence && voice && !voice.localService && <p>This online voice may send the sentence text to your device’s speech provider when you press Listen.</p>}
    {state === 'playing' && <button type="button" onClick={() => { service?.stop(); setState('idle') }}>Stop audio</button>}
    <p role="status">{!service ? 'Speech playback is unavailable in this browser.'
      : !voice ? 'No Japanese voice is available. Enable a Japanese voice in your device settings.'
      : state === 'failed' ? 'The voice could not play. Try another voice or try again.'
      : state === 'playing' ? 'Playing Japanese audio.' : state === 'done' ? 'Playback finished.' : ''}</p>
  </section>
}
