# ProcessList UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search bar, folder process counts, folder drag-to-reorder, and drag-process-to-folder to the ProcessList page.

**Architecture:** All state lives in `ProcessList.tsx`. `FolderSidebar` receives `entries` (for counts) and `onAssignProcess` + `onReorderFolders` as new callbacks. Process rows in `EntryRow` become draggable using native HTML drag events. Folder reorder order is persisted by calling `saveFolders` with the reordered array.

**Tech Stack:** React 19, TypeScript 5, native HTML Drag and Drop API (no library)

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `feature/platform-upgrades`

---

## File Map

**Modified:**
- `src/components/FolderSidebar.tsx` — add count badges; folder drag-to-reorder; process drop target + highlight
- `src/pages/ProcessList.tsx` — add search bar; make EntryRow draggable; add onAssignProcess + onReorderFolders handlers; pass new props to FolderSidebar

---

## Task 1 — Upgrade FolderSidebar

**Files:** `src/components/FolderSidebar.tsx`

Replace the entire file contents with:

- [ ] **Step 1: Write the new FolderSidebar.tsx**

```tsx
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
  onReorderFolders: (reordered: FolderEntry[]) => void        // folder drag-to-reorder
  onAssignProcess: (processId: string, folderId: string | null) => void  // process drop
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
  const draggingFolderRef = useRef<string | null>(null)

  const rootFolders = folders.filter(f => !f.parentId)

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    onCreateFolder(trimmed)
    setNewName('')
    setCreating(false)
  }

  // ── Folder reorder ────────────────────────────────────────────────
  function handleFolderDragStart(e: React.DragEvent, folderId: string) {
    draggingFolderRef.current = folderId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('folder-id', folderId)
  }

  function handleFolderDragOver(e: React.DragEvent, targetFolderId: string) {
    // Only handle folder-reorder drags (not process drags)
    if (!draggingFolderRef.current) return
    if (draggingFolderRef.current === targetFolderId) return
    e.preventDefault()
    const from = rootFolders.findIndex(f => f.id === draggingFolderRef.current)
    const to = rootFolders.findIndex(f => f.id === targetFolderId)
    if (from === -1 || to === -1) return
    const reordered = [...rootFolders]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    onReorderFolders(reordered)
    draggingFolderRef.current = targetFolderId
  }

  function handleFolderDragEnd() {
    draggingFolderRef.current = null
  }

  // ── Process-to-folder drop ────────────────────────────────────────
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

  function handleProcessDragLeave() {
    setDragOverFolderId(null)
  }

  function countForFolder(folderId: string) {
    return entries.filter(e => e.folderId === folderId).length
  }

  const isProcessDragOver = (id: string | null) =>
    dragOverFolderId === (id === null ? 'all' : id)

  return (
    <div className="w-44 shrink-0 border-r bg-muted/10 p-3 flex flex-col gap-1 overflow-y-auto">
      {/* All Processes — also a drop target */}
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

      {/* Folder list */}
      {rootFolders.map(folder => {
        const count = countForFolder(folder.id)
        const isDropTarget = isProcessDragOver(folder.id)
        return (
          <div
            key={folder.id}
            className="flex items-center gap-1 group"
            onDragOver={e => handleProcessDragOver(e, folder.id)}
            onDrop={e => handleProcessDrop(e, folder.id)}
            onDragLeave={handleProcessDragLeave}
          >
            {/* Grip for folder reorder */}
            <div
              draggable
              onDragStart={e => handleFolderDragStart(e, folder.id)}
              onDragOver={e => handleFolderDragOver(e, folder.id)}
              onDragEnd={handleFolderDragEnd}
              className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0 text-muted-foreground p-0.5"
            >
              <GripVertical className="w-3 h-3" />
            </div>
            <button
              onClick={() => onSelect(folder.id)}
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

      {/* New folder */}
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: errors only about missing props on FolderSidebar in ProcessList.tsx (we fix those in Task 2). Not about the sidebar itself.

- [ ] **Step 3: Commit**

```bash
git add src/components/FolderSidebar.tsx
git commit -m "feat(folders): add count badges, drag-to-reorder, process drop target to FolderSidebar"
```

---

## Task 2 — ProcessList: search bar + drag glue

**Files:** `src/pages/ProcessList.tsx`

Read the file first before editing.

- [ ] **Step 1: Add search state**

In the component, after `selectedFolderId` state:
```typescript
const [query, setQuery] = useState('')
```

- [ ] **Step 2: Apply search filter to visibleEntries**

Replace the current `visibleEntries` computation:
```typescript
// Replace:
const visibleEntries = selectedFolderId
  ? entries.filter(e => e.folderId === selectedFolderId)
  : entries

// With:
const folderFiltered = selectedFolderId
  ? entries.filter(e => e.folderId === selectedFolderId)
  : entries

const visibleEntries = query.trim()
  ? folderFiltered.filter(e =>
      e.processName.toLowerCase().includes(query.toLowerCase()) ||
      (e.domain ?? '').toLowerCase().includes(query.toLowerCase())
    )
  : folderFiltered
```

- [ ] **Step 3: Add onReorderFolders handler**

After `handleDeleteFolder`:
```typescript
async function handleReorderFolders(reordered: FolderEntry[]) {
  setFolders(reordered)
  await saveFolders(reordered)
}
```

Import `saveFolders` from `@/lib/storage` if not already imported.

- [ ] **Step 4: Add onAssignProcess handler**

After `handleReorderFolders`:
```typescript
function handleAssignProcess(processId: string, folderId: string | null) {
  const entry = entries.find(e => e.id === processId)
  if (!entry) return
  const updated = { ...entry, folderId: folderId ?? undefined }
  saveEntry(updated)
  setEntries(prev => prev.map(e => e.id === processId ? updated : e))
}
```

- [ ] **Step 5: Add search bar JSX above the domain list**

In the right-side content div, add the search bar between the header and the loading/content section:

```tsx
{/* Search bar */}
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
  <input
    type="text"
    value={query}
    onChange={e => setQuery(e.target.value)}
    placeholder="Search processes…"
    className="w-full max-w-sm border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
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
```

Import `Search` from `lucide-react`.

- [ ] **Step 6: Pass new props to FolderSidebar**

Update the `<FolderSidebar ... />` JSX to include the three new props:
```tsx
<FolderSidebar
  folders={folders}
  entries={entries}
  selectedFolderId={selectedFolderId}
  onSelect={setSelectedFolderId}
  onCreateFolder={handleCreateFolder}
  onDeleteFolder={handleDeleteFolder}
  onReorderFolders={handleReorderFolders}
  onAssignProcess={handleAssignProcess}
/>
```

- [ ] **Step 7: Make EntryRow draggable**

`EntryRow` is a component at the bottom of the file. It needs to accept `onDragStart`. Update its props and render:

```typescript
// Update EntryRow props interface:
function EntryRow({
  entry,
  owner,
  onDelete,
  onDragStart,
}: {
  entry: ProcessEntry
  owner: boolean
  onDelete: (e: ProcessEntry) => void
  onDragStart: (e: React.DragEvent, entryId: string) => void
}) {
```

In `EntryRow`'s return, add `draggable` and `onDragStart` to the outer div:
```tsx
<div
  draggable
  onDragStart={e => onDragStart(e, entry.id)}
  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing"
>
```

In ProcessList, pass `onDragStart` to each `EntryRow`:
```tsx
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
```

Update all 3 places where `<EntryRow>` is rendered (domainEntries loop, undomained loop).

- [ ] **Step 8: TypeScript check + test**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit && pnpm test
```

Expected: no errors, 9/9 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/pages/ProcessList.tsx
git commit -m "feat(folders): add search bar, drag-process-to-folder, folder reorder wiring in ProcessList"
```

---

## Verification

- [ ] Search bar filters processes by name and domain in real-time
- [ ] ✕ button clears search
- [ ] Each folder shows count badge (0 when empty)
- [ ] Drag a folder's ⠿ grip up/down — folders reorder, order persists on reload
- [ ] Drag a process row onto a folder — folder turns blue, drop assigns it; process appears in that folder
- [ ] Drag a process onto "All Processes" — removes folder assignment
- [ ] `pnpm build` — clean

---

## Self-Review

**Spec coverage:**
- ✅ Search bar (name + domain)
- ✅ Count badges on folders
- ✅ Folder drag-to-reorder via GripVertical handle
- ✅ Process drag → folder drop with blue highlight
- ✅ Drop on "All Processes" clears folderId

**No placeholders.**

**Type consistency:** `onAssignProcess: (processId: string, folderId: string | null) => void` matches usage in both FolderSidebar (called with string or null) and ProcessList handler (accepts string | null, converts null to undefined for storage).
