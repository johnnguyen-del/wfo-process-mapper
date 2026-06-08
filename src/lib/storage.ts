import type { ProcessEntry } from './types'

const PREFIX = 'processes/'

// localStorage fallback for local dev (same pattern as PlaybookStudio)
function makeLocalScope() {
  const ns = (key: string) => `wfo-process-mapper:${key}`
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = window.localStorage.getItem(ns(key))
      if (raw === null) return null
      try { return JSON.parse(raw) as T } catch { return null }
    },
    async put<T>(key: string, value: T): Promise<void> {
      window.localStorage.setItem(ns(key), JSON.stringify(value))
    },
    async delete(key: string): Promise<void> {
      window.localStorage.removeItem(ns(key))
    },
    async list(prefix = ''): Promise<string[]> {
      const fullPrefix = `wfo-process-mapper:${prefix}`
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key && key.startsWith(fullPrefix)) {
          keys.push(key.slice('wfo-process-mapper:'.length))
        }
      }
      return keys
    },
  }
}

const localScope = makeLocalScope()

function scope() {
  if (typeof MagicStorage !== 'undefined' && MagicStorage?.public) {
    return MagicStorage.public
  }
  return localScope
}

export function saveEntry(entry: ProcessEntry): void {
  void scope().put(`${PREFIX}${entry.id}`, entry)
}

export async function loadEntry(id: string): Promise<ProcessEntry | null> {
  try {
    return await scope().get<ProcessEntry>(`${PREFIX}${id}`)
  } catch {
    return null
  }
}

export async function listEntries(): Promise<ProcessEntry[]> {
  try {
    const keys = await scope().list(PREFIX)
    const entries = await Promise.all(keys.map((k) => scope().get<ProcessEntry>(k)))
    return entries
      .filter((e): e is ProcessEntry => e !== null)
      .sort((a, b) => (b.submittedAt || b.id).localeCompare(a.submittedAt || a.id))
  } catch {
    return []
  }
}

export function generateId(): string {
  return `proc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
