import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createRecording, maxBytes, maxSeconds, type CaptureEvent } from './recording'

const stopTrack = vi.fn()
const stream = { getTracks: () => [{ stop: stopTrack }] }
const acquire = vi.fn()
class Recorder {
  static current: Recorder
  static isTypeSupported = () => true
  state = 'inactive'
  mimeType = 'audio/webm'
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  constructor() { Recorder.current = this }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive' }
  emit(size: number) { this.ondataavailable?.({ data: new Blob([new Uint8Array(size)]) }) }
}
beforeEach(() => {
  vi.useFakeTimers()
  stopTrack.mockClear()
  acquire.mockReset().mockResolvedValue(stream)
  vi.stubGlobal('MediaRecorder', Recorder)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: acquire } })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
function setup() {
  const events: CaptureEvent[] = []
  const service = createRecording(event => events.push(event))
  expect(acquire).not.toHaveBeenCalled()
  service.start()
  return { service, events }
}
it('releases a late permission grant after cancellation without starting a recorder', async () => {
  let grant!: (s: typeof stream) => void
  acquire.mockImplementation(() => new Promise(resolve => { grant = resolve }))
  const { service, events } = setup()
  service.cancel()
  grant(stream)
  await Promise.resolve()
  expect(stopTrack).toHaveBeenCalledOnce()
  expect(events.map(e => e.state)).toEqual(['requesting'])
})
it('stops on the time limit and includes the final queued audio chunk', async () => {
  const { events } = setup()
  await Promise.resolve()
  const r = Recorder.current
  r.emit(10)
  vi.advanceTimersByTime(maxSeconds * 1000)
  expect(r.state).toBe('inactive')
  expect(stopTrack).toHaveBeenCalled()
  r.emit(12); r.onstop?.()
  expect(events.map(e => e.state)).toEqual(['requesting', 'recording', 'stopping', 'ready'])
  expect(events.at(-1)).toMatchObject({ blob: { type: 'audio/webm', size: 22 } })
})
it('rejects an oversized final chunk and releases the device', async () => {
  const { service, events } = setup()
  await Promise.resolve()
  const r = Recorder.current
  r.emit(maxBytes)
  service.stop(); r.emit(1); r.onstop?.()
  expect(events.at(-1)).toMatchObject({ state: 'error', message: expect.stringContaining('4 MiB') })
  expect(events.some(e => e.state === 'ready')).toBe(false)
  expect(stopTrack).toHaveBeenCalled()
})
it('rejects empty input and ignores recorder events after an interruption', async () => {
  const { events } = setup()
  await Promise.resolve()
  Recorder.current.onstop?.()
  expect(events.at(-1)).toMatchObject({state: 'error', message: expect.stringContaining('No audio')})
  acquire.mockClear()
  const interrupted = setup()
  await Promise.resolve()
  Recorder.current.onerror?.()
  Recorder.current.emit(10); Recorder.current.onstop?.()
  expect(interrupted.events.at(-1)).toMatchObject({ state: 'error' })
  expect(stopTrack).toHaveBeenCalledTimes(2)
})
it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError'])('handles %s and leaves the mic inactive', async name => {
  acquire.mockRejectedValue(new DOMException('', name))
  const { events } = setup()
  await Promise.resolve()
  await Promise.resolve()
  expect(events.map(e => e.state)).toEqual(['requesting', 'error'])
})
it('releases an acquired stream when recorder construction fails', async () => {
  vi.stubGlobal('MediaRecorder', class { constructor() { throw new Error() } })
  const { events } = setup()
  await Promise.resolve()
  expect(events.at(-1)?.state).toBe('error')
  expect(stopTrack).toHaveBeenCalledOnce()
})
