import { useEffect, useState } from 'react'
import { subscribeProgress } from './storage'

export function useProgress<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ load: typeof load; data?: T; error?: boolean }>()
  useEffect(() => {
    let sequence = 0
    function refresh() {
      const id = ++sequence
      load().then(data => {
        if (id === sequence) setResult({ load, data })
      }, () => {
        if (id === sequence) setResult({ load, error: true })
      })
    }
    const stop = subscribeProgress(refresh)
    refresh()
    return () => { sequence++; stop() }
  }, [load, attempt])
  return { ...(result?.load === load ? result : {}), retry: () => setAttempt(n => n + 1) }
}
