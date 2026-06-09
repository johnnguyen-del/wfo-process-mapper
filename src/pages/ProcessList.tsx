import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { ProcessEntry, Domain, FolderEntry } from '@/lib/types'
import { listEntries, loadFolders, saveEntry, saveFolder, deleteFolder, saveFolders } from '@/lib/storage'
import { ExternalLink, Edit, Trash2, RefreshCw, BarChart2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import FolderSidebar from '@/components/FolderSidebar'

const TIER_COLORS = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  '': 'bg-gray-100 text-gray-500',
}

// Owner check — same pattern as PlaybookStudio
function isOwner(): boolean {
  try {
    return (window as any).MagicAuth?.viewer?.()?.isOwner === true
  } catch {
    return false
  }
}

export default function ProcessList() {
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [owner] = useState(isOwner)
  const [currentUserEmail] = useState<string>(() =>
    (window as any).MagicAuth?.viewer?.()?.email ?? ''
  )
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  function load() {
    setLoading(true)
    listEntries().then((e) => { setEntries(e); setLoading(false) })
  }

  useEffect(() => {
    load()
    loadFolders().then(setFolders)
  }, [])

  async function handleCreateFolder(name: string) {
    const folder: FolderEntry = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    }
    await saveFolder(folder)
    setFolders(prev => [...prev, folder])
  }

  async function handleReorderFolders(reordered: FolderEntry[]) {
    setFolders(reordered)
    await saveFolders(reordered)
  }

  function handleAssignProcess(processId: string, folderId: string | null) {
    const entry = entries.find(e => e.id === processId)
    if (!entry) return
    const updated = { ...entry, folderId: folderId ?? undefined }
    saveEntry(updated)
    setEntries(prev => prev.map(e => e.id === processId ? updated : e))
  }

  async function handleDeleteFolder(id: string) {
    await deleteFolder(id)
    // Clear folderId from any processes that pointed to this folder
    const affected = entries.filter(e => e.folderId === id)
    for (const entry of affected) {
      const updated = { ...entry, folderId: undefined }
      saveEntry(updated)
    }
    if (affected.length > 0) {
      setEntries(prev => prev.map(e => e.folderId === id ? { ...e, folderId: undefined } : e))
    }
    setFolders(prev => prev.filter(f => f.id !== id))
    if (selectedFolderId === id) setSelectedFolderId(null)
  }

  // Soft delete — moves to trash
  function handleDelete(entry: ProcessEntry) {
    if (!window.confirm(`Move "${entry.processName}" to Trash?`)) return
    const trashed = { ...entry, deletedAt: new Date().toISOString() }
    saveEntry(trashed)
    setEntries(prev => prev.map(e => e.id === entry.id ? trashed : e))
    toast.success(`"${entry.processName}" moved to Trash`)
  }

  // Restore from trash
  function handleRestore(entry: ProcessEntry) {
    const restored = { ...entry, deletedAt: undefined }
    saveEntry(restored)
    setEntries(prev => prev.map(e => e.id === entry.id ? restored : e))
    toast.success(`"${entry.processName}" restored`)
  }

  // Permanent delete from trash
  async function handlePermanentDelete(entry: ProcessEntry) {
    if (!window.confirm(`Permanently delete "${entry.processName}"? This cannot be undone.`)) return
    try {
      const scope = (window as any).MagicStorage?.public ?? null
      if (scope?.delete) {
        await scope.delete(`processes/${entry.id}`)
      } else {
        window.localStorage.removeItem(`wfo-process-mapper:processes/${entry.id}`)
      }
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      toast.success(`"${entry.processName}" permanently deleted`)
    } catch {
      toast.error('Delete failed')
    }
  }

  const activeEntries = entries.filter(e => !e.deletedAt)
  const trashedEntries = entries.filter(e => !!e.deletedAt)
  const isTrashView = selectedFolderId === '__trash__'

  const folderFiltered = isTrashView
    ? trashedEntries
    : selectedFolderId
    ? activeEntries.filter(e => e.folderId === selectedFolderId)
    : activeEntries

  const visibleEntries = query.trim()
    ? folderFiltered.filter(e =>
        e.processName.toLowerCase().includes(query.toLowerCase()) ||
        (e.domain ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : folderFiltered

  const domains = ['Banking', 'Transfers', 'Invest', 'Security & Risk', 'PRR'] as Domain[]
  const grouped = Object.fromEntries(
    domains.map((d) => [d, visibleEntries.filter((e) => e.domain === d)])
  )
  const undomained = visibleEntries.filter((e) => !e.domain)

  return (
    <div className="flex min-h-screen">
      <FolderSidebar
        folders={folders}
        entries={entries}
        selectedFolderId={selectedFolderId}
        onSelect={setSelectedFolderId}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onReorderFolders={handleReorderFolders}
        onAssignProcess={handleAssignProcess}
        trashCount={trashedEntries.length}
      />
      <div className="flex-1 p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WFO Process Mapper</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {visibleEntries.length} process{visibleEntries.length !== 1 ? 'es' : ''}
            {selectedFolderId ? ' in folder' : ' captured'}
            {owner && <span className="ml-2 text-xs bg-foreground text-background px-1.5 py-0.5 rounded font-medium">Owner</span>}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/analytics" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium">
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </Link>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/new">+ New Process</Link>
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search processes…"
          className="w-full max-w-sm border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-12 text-center">Loading…</div>
      ) : visibleEntries.length === 0 ? (
        <div className="text-muted-foreground text-sm py-16 text-center border rounded-lg">
          {isTrashView ? 'Trash is empty.' : selectedFolderId ? 'No processes in this folder.' : <>No processes captured yet.{' '}<Link to="/new" className="underline hover:text-foreground">Start with + New Process</Link></>}
        </div>
      ) : isTrashView ? (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
            Trash
            <span className="text-[10px] font-normal normal-case text-muted-foreground">Restore or permanently delete</span>
          </h2>
          <div className="border rounded-lg divide-y">
            {visibleEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                owner={owner}
                currentUserEmail={currentUserEmail}
                isTrash
                onDelete={handlePermanentDelete}
                onRestore={handleRestore}
                onDragStart={() => {}}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-8">
          {domains.map((domain) => {
            const domainEntries = grouped[domain]
            if (domainEntries.length === 0) return null
            return (
              <section key={domain}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{domain}</h2>
                <div className="border rounded-lg divide-y">
                  {domainEntries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      owner={owner}
                      currentUserEmail={currentUserEmail}
                      onDelete={handleDelete}
                      onDragStart={(e, id) => {
                        e.dataTransfer.setData('process-id', id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {undomained.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Drafts (no domain)</h2>
              <div className="border rounded-lg divide-y">
                {undomained.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    owner={owner}
                    onDelete={handleDelete}
                    onDragStart={(e, id) => {
                      e.dataTransfer.setData('process-id', id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
  return colors[Math.abs(hash) % colors.length]
}

function avatarInitials(email: string): string {
  const name = email.split('@')[0] ?? email
  return name.slice(0, 2).toUpperCase()
}

function EntryRow({
  entry,
  owner,
  currentUserEmail,
  isTrash = false,
  onDelete,
  onRestore,
  onDragStart,
}: {
  entry: ProcessEntry
  owner: boolean
  currentUserEmail: string
  isTrash?: boolean
  onDelete: (e: ProcessEntry) => void
  onRestore?: (e: ProcessEntry) => void
  onDragStart: (e: React.DragEvent, entryId: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, entry.id)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {entry.processName || <span className="text-muted-foreground italic">Untitled</span>}
          </span>
          {entry.status === 'submitted' ? (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Submitted</span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {entry.domain && <span className="text-[11px] text-muted-foreground">{entry.domain}</span>}
          {entry.teamOwner.map((t) => (
            <span key={t} className="text-[11px] text-muted-foreground">{t}</span>
          ))}
          {entry.submittedAt && (
            <span className="text-[11px] text-muted-foreground">
              · {new Date(entry.submittedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {/* Author + collaborators */}
        {(entry.author || (entry.collaborators?.length ?? 0) > 0) && (() => {
          const people = Array.from(
            new Set([entry.author, ...(entry.collaborators ?? [])].filter(Boolean) as string[])
          )
          const visible = people.slice(0, 4)
          const overflow = people.length - visible.length
          return (
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex -space-x-1">
                {visible.map(email => (
                  <div
                    key={email}
                    title={email}
                    style={{
                      width: 16, height: 16,
                      borderRadius: '50%',
                      backgroundColor: avatarColor(email),
                      border: '1.5px solid white',
                      fontSize: 7, fontWeight: 700, color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {avatarInitials(email)}
                  </div>
                ))}
                {overflow > 0 && (
                  <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#94a3b8', border: '1.5px solid white', fontSize: 7, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    +{overflow}
                  </div>
                )}
              </div>
              {entry.author && (
                <span className="text-[10px] text-muted-foreground">{entry.author.split('@')[0]}</span>
              )}
            </div>
          )
        })()}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.volumeTier && (
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', TIER_COLORS[entry.volumeTier])}>
            {entry.volumeTier}
          </span>
        )}
        {entry.notionPageUrl && (
          <a
            href={entry.notionPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-0.5 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Notion
          </a>
        )}
        <Button variant="ghost" size="sm" asChild className="h-7 px-2">
          <Link to={`/edit/${entry.id}`}>
            <Edit className="w-3.5 h-3.5" />
          </Link>
        </Button>
        {isTrash ? (
          <>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onRestore?.(entry)}>
              Restore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(entry)}
              title="Permanently delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(entry)}
            title="Move to Trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
