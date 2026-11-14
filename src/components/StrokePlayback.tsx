import { useEffect, useRef, useState, type ReactNode } from 'react'

export function StrokePlayback({ total, children }: { total: number; children: (progress: number) => ReactNode }) {
  const position = useRef(total)
  const [progress, setProgress] = useState(total)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  function seek(value: number) {
    position.current = value
    setProgress(value)
  }
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    function update() {
      setReduced(media.matches)
      if (media.matches) {
        setPlaying(false)
        seek(Math.ceil(position.current))
      }
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!playing || reduced) return
    let frame: number
    let previous = performance.now()
    function draw(now: number) {
      seek(Math.min(total, position.current + (now - previous) * speed / 800))
      previous = now
      if (position.current >= total) setPlaying(false)
      else frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, total, reduced])

  function step(value: number) { setPlaying(false); seek(value) }
  const completed = Math.floor(progress)
  return <section className="stroke-viewer" aria-label="Stroke order">
    {children(progress)}
    <p className="stroke-count" role="status">{completed} of {total} strokes complete</p>
    <div className="detail-controls">
      {reduced ? <button onClick={() => step(0)}>Start over</button> : <>
        <button onClick={() => { seek(0); setPlaying(true) }}>Replay strokes</button>
        <button disabled={!playing && progress === total} onClick={() => setPlaying(!playing)}>
          {playing ? 'Pause' : 'Resume'}
        </button>
      </>}
      <button disabled={progress === 0} onClick={() => step(Math.ceil(progress) - 1)}>Previous stroke</button>
      <button disabled={progress === total} onClick={() => step(completed + 1)}>Next stroke</button>
      {!reduced && <label>Stroke speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}>
        <option value=".5">0.5×</option><option value="1">1×</option><option value="2">2×</option>
      </select></label>}
    </div>
    {reduced && <p>Reduced motion is on. Use the stroke buttons to step through the strokes.</p>}
  </section>
}
