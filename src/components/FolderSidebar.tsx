import { useState } from 'react'
import { Folder, FolderOpen, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FolderEntry } from '@/lib/types'

interface FolderSidebarProps {
  folders: FolderEntry[]
  selectedFolderId: string | null   // null = "All Processes"
  onSelect: (id: string | null) => void
  onCreateFolder: (name: string) => void
  onDeleteFolder: (id: string) => void
}

export default function FolderSidebar({
  folders,
  selectedFolderId,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreateFolder(trimmed)
    setNewName('')
    setCreating(false)
  }

  // Only root folders (no parentId) for the sidebar
  const rootFolders = folders.filter(f => !f.parentId)

  return (
    <div className="w-44 shrink-0 border-r bg-muted/10 p-3 flex flex-col gap-1 overflow-y-auto">
      {/* All Processes */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium w-full text-left transition-colors',
          selectedFolderId === null
            ? 'bg-foreground text-background'
            : 'text-foreground hover:bg-muted/40'
        )}
      >
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        All Processes
      </button>

      {/* Folder list */}
      {rootFolders.map(folder => (
        <div key={folder.id} className="flex items-center gap-1 group">
          <button
            onClick={() => onSelect(folder.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left transition-colors min-w-0',
              selectedFolderId === folder.id
                ? 'bg-foreground text-background'
                : 'text-foreground hover:bg-muted/40'
            )}
          >
            <Folder className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{folder.name}</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete folder "${folder.name}"?`)) {
                onDeleteFolder(folder.id)
              }
            }}
            className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-red-500 transition-all p-0.5"
            title="Delete folder"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* New folder input */}
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
          <button
            onClick={handleCreate}
            className="text-xs bg-foreground text-background rounded px-1.5 py-1 shrink-0"
          >
            ✓
          </button>
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
