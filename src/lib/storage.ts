import type { ProcessEntry } from './types'

const PREFIX = 'wfo-process:'

function getStorage(): Storage {
  return window.localStorage
}

export function saveEntry(entry: ProcessEntry): void {
  try {
    const store = (window as any).MagicStorage?.public ?? getStorage()
    const key = `${PREFIX}${entry.id}`
    const value = JSON.stringify(entry)
    if (store?.setItem) {
      store.setItem(key, value)
    } else if (typeof store?.put === 'function') {
      void store.put(key, value)
    }
  } catch {
    getStorage().setItem(`${PREFIX}${entry.id}`, JSON.stringify(entry))
  }
}

export async function loadEntry(id: string): Promise<ProcessEntry | null> {
  try {
    const store = (window as any).MagicStorage?.public
    const key = `${PREFIX}${id}`
    if (store?.get) {
      const raw = await store.get(key)
      if (raw) return JSON.parse(raw) as ProcessEntry
    }
    const local = getStorage().getItem(key)
    return local ? (JSON.parse(local) as ProcessEntry) : null
  } catch {
    return null
  }
}

export async function listEntries(): Promise<ProcessEntry[]> {
  try {
    const store = (window as any).MagicStorage?.public
    let raw: Record<string, string> = {}
    if (store?.list) {
      raw = await store.list(PREFIX)
    } else {
      for (let i = 0; i < getStorage().length; i++) {
        const k = getStorage().key(i)!
        if (k.startsWith(PREFIX)) {
          raw[k] = getStorage().getItem(k)!
        }
      }
    }
    return Object.values(raw)
      .map((v) => {
        try { return JSON.parse(v) as ProcessEntry } catch { return null }
      })
      .filter((e): e is ProcessEntry => e !== null)
      .sort((a, b) => (b.submittedAt || b.id).localeCompare(a.submittedAt || a.id))
  } catch {
    return []
  }
}

export function generateId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
