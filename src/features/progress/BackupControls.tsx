import { useState } from 'react'
import { decodeBackup, encodeBackup } from './backup'
import { snapshot, mergeProgress } from './storage'

export function BackupControls() {
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof decodeBackup>> | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function previewFile(file: File) {
    setBusy(true)
    setPreview(null)
    setMessage('Checking backup…')
    try { setPreview(await decodeBackup(file)); setMessage('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read this file.') }
    finally { setBusy(false) }
  }
  async function restore() {
    if (!preview) return
    setBusy(true)
    try {
      await mergeProgress(preview.entries, preview.results)
      setPreview(null)
      setMessage('Backup merged. Your progress is saved in this browser.')
    } catch { setMessage('Import failed. Existing progress was preserved. Try again.') }
    finally { setBusy(false) }
  }
  async function download() {
    setBusy(true)
    try {
      const { entries, results } = await snapshot()
      const url = URL.createObjectURL(new Blob([encodeBackup(entries, results)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'japanese-study-progress-' + new Date().toISOString().slice(0, 10) + '.json'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Backup download started.')
    } catch { setMessage('The backup could not be exported. Try again.') }
    finally { setBusy(false) }
  }
  return <section className="progress-backups" aria-labelledby="backup-title">
    <h2 id="backup-title">Backups</h2>
    <p>Export your marks and practice results to move them to another browser. Merging keeps existing marks and the latest 100 completed sessions.</p>
    <button type="button" disabled={busy} onClick={() => void download()}>Export backup</button>
    <label>Import backup<input type="file" accept=".json,application/json" disabled={busy} onChange={event => {
      const file = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (file) void previewFile(file)
    }} /></label>
    {preview && <div>
      <p role="status">Ready to merge {preview.entries.length} {preview.entries.length === 1 ? 'character' : 'characters'}{preview.results.length > 0 && ' and ' + preview.results.length + (preview.results.length === 1 ? ' session' : ' sessions')}.</p>
      <button disabled={busy} onClick={() => void restore()}>Merge backup</button>
      <button disabled={busy} onClick={() => { setPreview(null); setMessage('Import canceled.') }}>Cancel</button>
    </div>}
    <p role="status">{message}</p>
  </section>
}
