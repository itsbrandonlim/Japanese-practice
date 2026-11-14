import type { Flag, Mark } from './backup'
import { historyLimit, recentFirst, type Result } from '../practice/results'

const database = 'japanese-study-progress'
const storeName = 'characters'
const changeEvent = 'japanese-study-progress-changed'
let channel: BroadcastChannel | undefined

function changes() {
  if (!channel && typeof BroadcastChannel !== 'undefined') {
    try { channel = new BroadcastChannel(database) } catch { /* Refresh on focus when messaging is blocked. */ }
  }
  return channel
}

export function subscribeProgress(refresh: () => void) {
  const bus = changes()
  window.addEventListener(changeEvent, refresh)
  window.addEventListener('focus', refresh)
  bus?.addEventListener('message', refresh)
  return () => {
    window.removeEventListener(changeEvent, refresh)
    window.removeEventListener('focus', refresh)
    bus?.removeEventListener('message', refresh)
  }
}

let connection: IDBDatabase | undefined
let opening: Promise<IDBDatabase> | undefined
function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(database, 2)
    let blocked = false
    request.onupgradeneeded = event => {
      if (event.oldVersion < 1) request.result.createObjectStore(storeName, { keyPath: ['char', 'flag'] })
      if (event.oldVersion < 2) request.result.createObjectStore('results', { keyPath: 'id' })
    }
    request.onblocked = () => { blocked = true; reject(new Error('Close other study tabs and retry.')) }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else {
        const db = request.result
        connection = db
        function release() {
          if (connection === db) connection = undefined
          db.close()
        }
        db.onversionchange = release
        db.onclose = release
        resolve(db)
      }
    }
  })
}

async function transaction<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore, tx: IDBTransaction) => () => T, withResults = false) {
  // Once the initial read enables the controls, start the transaction in the
  // click handler itself, even if the learner immediately reloads the page.
  const db = connection ?? await (opening ??= openDatabase().finally(() => { opening = undefined }))
  const result = await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(withResults ? [storeName, 'results'] : [storeName], mode)
    tx.onabort = () => reject(tx.error ?? new Error('Progress transaction interrupted.'))
    try {
      const result = work(tx.objectStore(storeName), tx)
      tx.oncomplete = () => resolve(result())
    } catch (error) { tx.abort(); reject(error) }
  })
  if (mode === 'readwrite') {
    window.dispatchEvent(new Event(changeEvent))
    try { changes()?.postMessage('changed') } catch { /* Data is already committed. */ }
  }
  return result
}

function readMarks(store: IDBObjectStore) {
  const request = store.getAll()
  return () => {
    const entries = new Map<string, Mark>()
    for (const { char, flag } of request.result as { char: string; flag: Flag }[]) {
      const entry = entries.get(char) ?? { char, favorite: false, learned: false }
      entry[flag] = true
      entries.set(char, entry)
    }
    return [...entries.values()]
  }
}

export function snapshot() {
  return transaction('readonly', (store, tx) => {
    const marks = readMarks(store)
    const results = tx.objectStore('results').getAll()
    return () => ({ entries: marks(), results: (results.result as Result[]).sort(recentFirst) })
  }, true)
}

export function readMark(char: string): Promise<Mark> {
  return transaction('readonly', store => {
    const favorite = store.getKey([char, 'favorite'])
    const learned = store.getKey([char, 'learned'])
    return () => ({ char, favorite: !!favorite.result, learned: !!learned.result })
  })
}

export function setFlag(char: string, flag: Flag, value: boolean) {
  return transaction('readwrite', (store, tx) => {
    if (value) store.put({ char, flag })
    else store.delete([char, flag])
    // All requests are queued. Start committing now, including if navigation follows the click.
    tx.commit?.()
    return () => undefined
  })
}

export function mergeProgress(entries: Mark[], results: Result[]) {
  return transaction('readwrite', (store, tx) => {
    for (const entry of entries) {
      if (entry.favorite) store.put({ char: entry.char, flag: 'favorite' })
      if (entry.learned) store.put({ char: entry.char, flag: 'learned' })
    }
    if (results.length) {
      const history = tx.objectStore('results')
      const read = history.getAll()
      read.onsuccess = () => {
        const existing = read.result as Result[]
        const ids = new Set(existing.map(r => r.id))
        const added = results.filter(r => !ids.has(r.id))
        for (const r of added) history.put(r)
        for (const r of [...existing, ...added].sort(recentFirst).slice(historyLimit)) history.delete(r.id)
      }
    }
    return () => undefined
  }, true)
}
