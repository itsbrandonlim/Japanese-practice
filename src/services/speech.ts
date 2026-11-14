export interface SpeechSynthesisService {
  voices(): SpeechSynthesisVoice[]
  subscribe(refresh: () => void): () => void
  play(text: string, voice: SpeechSynthesisVoice, rate: number, finish: (failed: boolean) => void): void
  stop(): void
}

export function browserSpeech(): SpeechSynthesisService | null {
  const synth = window.speechSynthesis
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') return null
  let current: SpeechSynthesisUtterance | undefined
  function stop() {
    if (!current) return
    current.onend = null
    current.onerror = null
    current = undefined
    synth.cancel()
  }
  return {
    voices: () => synth.getVoices().filter(v => /^ja(?:[-_]JP)?$/i.test(v.lang))
      .sort((a, b) => Number(b.localService) - Number(a.localService)),
    subscribe(refresh) {
      synth.addEventListener('voiceschanged', refresh)
      return () => synth.removeEventListener('voiceschanged', refresh)
    },
    play(text, voice, rate, finish) {
      stop()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = 'ja-JP'
      utterance.rate = rate
      current = utterance
      function done(failed: boolean) {
        if (current !== utterance) return
        current = undefined
        finish(failed)
      }
      utterance.onend = () => done(false)
      utterance.onerror = () => done(true)
      try { synth.speak(utterance) } catch { done(true) }
    },
    stop,
  }
}
