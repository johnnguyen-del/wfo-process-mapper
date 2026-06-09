import { useRef, useState } from 'react'
import { Folder, FolderOpen, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FolderEntry, ProcessEntry } from '@/lib/types'

interface FolderSidebarProps {
  folders: FolderEntry[]
  entries: ProcessEntry[]                                      // for count badges
  selectedFolderId: string | null
  onSelect: (id: string | null) => void
  onCreateFolder: (name: string) => void
  onDeleteFolder: (id: string) => void
  onReorderFolders: (reordered: FolderEntry[]) => void
  onAssignProcess: (processId: string, folderId: string | null) => void
}

export default function FolderSidebar({
  folders,
  entries,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
  onReorderFolders,
  onAssignProcess,
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | 'all'>(null)
  const [localFolders, setLocalFolders] = useState<FolderEntry[]>([])
  const draggingFolderRef = useRef<string | null>(null)

  const rootFolders = folders.filter(f => !f.parentId)
  const displayFolders = localFolders.length > 0 ? localFolders : rootFolders

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreateFolder(trimmed)
    setNewName('')
    setCreating(false)
  }

  function handleFolderDragStart(e: React.DragEvent, folderId: string) {
    draggingFolderRef.current = folderId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('folder-id', folderId)
    setLocalFolders([...rootFolders])  // snapshot current order
  }

  function handleFolderDragOver(e: React.DragEvent, targetFolderId: string) {
    if (!draggingFolderRef.current) return
    if (draggingFolderRef.current === targetFolderId) return
    e.preventDefault()
    setLocalFolders(prev => {
      const list = prev.length > 0 ? prev : [...rootFolders]
      const from = list.findIndex(f => f.id === draggingFolderRef.current)
      const to = list.findIndex(f => f.id === targetFolderId)
      if (from === -1 || to === -1) return list
      const reordered = [...list]
      const [moved] = reordered.splice(from, 1)
      reordered.splice(to, 0, moved)
      draggingFolderRef.current = targetFolderId
      return reordered
    })
  }

  function handleFolderDragEnd() {
    if (localFolders.length > 0) {
      onReorderFolders(localFolders)
    }
    setLocalFolders([])
    draggingFolderRef.current = null
  }

  function handleProcessDragOver(e: React.DragEvent, targetId: string | null) {
    if (e.dataTransfer.types.includes('process-id')) {
      e.preventDefault()
      setDragOverFolderId(targetId === null ? 'all' : targetId)
    }
  }

  function handleProcessDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault()
    setDragOverFolderId(null)
    const processId = e.dataTransfer.getData('process-id')
    if (processId) onAssignProcess(processId, targetFolderId)
  }

  function handleProcessDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverFolderId(null)
    }
  }

  function countForFolder(folderId: string) {
    return entries.filter(e => e.folderId === folderId).length
  }

  const isProcessDragOver = (id: string | null) =>
    dragOverFolderId === (id === null ? 'all' : id)

  return (
    <div className="w-44 shrink-0 border-r bg-muted/10 p-3 flex flex-col gap-1 overflow-y-auto">
      <button
        onClick={() => onSelect(null)}
        onDragOver={e => handleProcessDragOver(e, null)}
        onDrop={e => handleProcessDrop(e, null)}
        onDragLeave={handleProcessDragLeave}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium w-full text-left transition-colors',
          selectedFolderId === null && !isProcessDragOver(null)
            ? 'bg-foreground text-background'
            : isProcessDragOver(null)
            ? 'bg-blue-500 text-white'
            : 'text-foreground hover:bg-muted/40'
        )}
      >
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        All Processes
      </button>

      {displayFolders.map(folder => {
        const count = countForFolder(folder.id)
        const isDropTarget = isProcessDragOver(folder.id)
        return (
          <div
            key={folder.id}
            className="flex items-center gap-1 group"
            onDragOver={e => handleFolderDragOver(e, folder.id)}
          >
            <div
              draggable
              onDragStart={e => handleFolderDragStart(e, folder.id)}
              onDragEnd={handleFolderDragEnd}
              className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0 text-muted-foreground p-0.5"
            >
              <GripVertical className="w-3 h-3" />
            </div>
            <button
              onClick={() => onSelect(folder.id)}
              onDragOver={e => handleProcessDragOver(e, folder.id)}
              onDrop={e => handleProcessDrop(e, folder.id)}
              onDragLeave={handleProcessDragLeave}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 rounded text-xs w-full text-left transition-colors min-w-0',
                isDropTarget
                  ? 'bg-blue-500 text-white'
                  : selectedFolderId === folder.id
                  ? 'bg-foreground text-background'
                  : 'text-foreground hover:bg-muted/40'
              )}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{folder.name}</span>
              <span className={cn(
                'text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                isDropTarget || selectedFolderId === folder.id
                  ? 'bg-white/20 text-white'
                  : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Delete folder "${folder.name}"?`)) onDeleteFolder(folder.id)
              }}
              className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-red-500 transition-all p-0.5"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )
      })}

      {creating ? (
        <div className="flex gap-1 mt-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setCreating(false); setNewName('') }
            }}
            placeholder="Folder name"
            className="flex-1 border rounded px-2 py-1 text-xs min-w-0 bg-background"
          />
          <button onClick={handleCreate} className="text-xs bg-foreground text-background rounded px-1.5 py-1 shrink-0">✓</button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 mt-1 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New folder
        </button>
      )}
    </div>
  )
}
