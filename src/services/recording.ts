export const maxSeconds = 30
export const maxBytes = 4 * 1024 * 1024

export type CaptureEvent =
  | { state: 'requesting' | 'recording' | 'stopping' }
  | { state: 'ready'; blob: Blob }
  | { state: 'error'; message: string }

export interface RecordingService {
  start(): void
  stop(): void
  cancel(): void
}

export function recordingUnavailable() {
  if (!window.isSecureContext) return 'Open this page over HTTPS or on localhost to enable the microphone.'
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== 'function') {
    return 'Microphone recording is unavailable in this browser.'
  }
  return ''
}

function captureError(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Microphone permission was denied. Allow microphone access in your browser settings and try again.'
  if (name === 'NotFoundError') return 'No microphone was found. Connect one and try again.'
  if (name === 'NotReadableError') return 'The microphone could not be opened. Check your device and try again.'
  return 'Recording failed. Check your microphone and try again.'
}

// One service owns one permission request and take. A late grant after cancel
// must release its stream even if another take has already started.
export function createRecording(notify: (event: CaptureEvent) => void): RecordingService {
  let phase: 'idle' | 'requesting' | 'recording' | 'stopping' | 'finished' = 'idle'
  let stream: MediaStream | undefined
  let recorder: MediaRecorder | undefined
  let timer: number | undefined
  let chunks: Blob[] = []
  let bytes = 0

  function release() {
    phase = 'finished'
    window.clearTimeout(timer)
    if (recorder) {
      recorder.ondataavailable = recorder.onerror = recorder.onstop = null
      if (recorder.state !== 'inactive') {
        try { recorder.stop() } catch { /* A disconnected device may already be stopped. */ }
      }
    }
    stream?.getTracks().forEach(track => track.stop())
    stream = recorder = undefined
    chunks = []
  }
  function fail(message: string) {
    release()
    notify({ state: 'error', message })
  }
  function stop() {
    if (phase !== 'recording' || !recorder) return
    phase = 'stopping'
    window.clearTimeout(timer)
    notify({ state: 'stopping' })
    try {
      if (recorder.state !== 'inactive') recorder.stop()
      stream?.getTracks().forEach(track => track.stop())
    } catch (error) { fail(captureError(error)) }
  }
  async function start() {
    if (phase !== 'idle') return
    phase = 'requesting'
    notify({ state: 'requesting' })
    try {
      const granted = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      if (cancelled()) { granted.getTracks().forEach(track => track.stop()); return }
      stream = granted
      const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported?.(type))
      recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      recorder.ondataavailable = event => {
        bytes += event.data.size
        if (bytes > maxBytes) { fail('The recording exceeded 4 MiB and was discarded. Try a shorter take.'); return }
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onerror = () => fail('Recording was interrupted. Please try again.')
      recorder.onstop = () => {
        if (!bytes) { fail('No audio was recorded. Please try again.'); return }
        const blob = new Blob(chunks, { type: recorder?.mimeType || chunks[0].type })
        release()
        notify({ state: 'ready', blob })
      }
      recorder.start(250)
      phase = 'recording'
      timer = window.setTimeout(stop, maxSeconds * 1000)
      notify({ state: 'recording' })
    } catch (error) { if (!cancelled()) fail(captureError(error)) }
  }
  function cancelled() { return phase === 'finished' }
  return { start: () => { void start() }, stop, cancel: release }
}
