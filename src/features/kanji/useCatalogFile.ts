import { useEffect, useState } from 'react'
import { dataRoot } from './catalog'

export function useCatalogFile<T>(file: string | null) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ file: string; attempt: number; data?: T; status: 'ready' | 'missing' | 'error' }>()
  useEffect(() => {
    if (!file) return
    const controller = new AbortController()
    async function load(path: string) {
      try {
        const response = await fetch(dataRoot + '/' + path, { signal: controller.signal })
        if (response.status === 404) {
          setResult({ file: path, attempt, status: 'missing' })
          return
        }
        if (!response.ok) throw new Error('Data request failed')
        const data: T = await response.json()
        if (!controller.signal.aborted) setResult({ file: path, attempt, status: 'ready', data })
      } catch {
        if (!controller.signal.aborted) setResult({ file: path, attempt, status: 'error' })
      }
    }
    void load(file)
    return () => controller.abort()
  }, [file, attempt])
  const current = result?.file === file && result?.attempt === attempt ? result : undefined
  return { data: current?.data, status: current?.status ?? 'loading', retry: () => setAttempt(n => n + 1) }
}
