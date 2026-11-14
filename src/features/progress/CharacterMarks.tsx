import { useCallback, useState } from 'react'
import type { Flag } from './backup'
import { readMark, setFlag } from './storage'
import { useProgress } from './useProgress'
import './progress.css'

export function CharacterMarks({ char }: { char: string }) {
  const load = useCallback(() => readMark(char), [char])
  const { data, error, retry } = useProgress(load)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  async function change(flag: Flag) {
    if (!data) return
    setSaving(true)
    setFailed(false)
    try { await setFlag(char, flag, !data[flag]) }
    catch { setFailed(true) }
    finally { setSaving(false) }
  }
  return <div className="mark-controls" role="group" aria-label="Study progress">
    {(['favorite', 'learned'] as const).map(flag =>
      <button key={flag} type="button" aria-pressed={!!data?.[flag]} disabled={!data || saving} onClick={() => void change(flag)}>
        <span aria-hidden="true">{data?.[flag] ? '✓ ' : ''}</span>{flag === 'favorite' ? 'Favorite' : 'Learned'}
      </button>)}
    {error && <p role="alert">Local progress is unavailable. <button onClick={retry}>Retry storage</button></p>}
    {failed && <p role="alert">Your change could not be saved. Try again.</p>}
  </div>
}
