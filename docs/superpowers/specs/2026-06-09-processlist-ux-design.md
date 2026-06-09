# ProcessList UX Improvements Design

## 1. Search Bar

A controlled text input above the domain-grouped list. Searches by `processName` and `domain` (case-insensitive). When a query is active, domain section headers that have zero matches are hidden.

```
[🔍 Search processes…]                  Analytics  Refresh  + New Process
```

State: `const [query, setQuery] = useState('')`
Filter: `visibleEntries.filter(e => e.processName.toLowerCase().includes(q) || e.domain.toLowerCase().includes(q))`

---

## 2. Folder count badges

In `FolderSidebar`, each folder row shows a small pill badge with the count of processes assigned to it. `ProcessList` passes `entries` (the full unfiltered list) to `FolderSidebar` as a new prop so the sidebar can compute counts independently of the active folder filter.

Badge: count = `entries.filter(e => e.folderId === folder.id).length`. Show `0` when empty (helps users see which folders are unused).

---

## 3. Folder drag-to-reorder

Each folder row has a drag grip (⠿) icon on its left. Dragging a folder row over another swaps their position. Order is persisted by updating the `folders` array order and calling `saveFolders(reorderedFolders)`.

Implementation:
- `draggingFolderRef = useRef<string | null>(null)` — stores the id of the folder being dragged
- `onDragStart`: sets `draggingFolderRef.current = folder.id`
- `onDragOver(targetId)`: if `draggingFolderRef.current !== targetId`, swap the two items in the `folders` array and call `setFolders` + `saveFolders`
- `onDragEnd`: clear `draggingFolderRef.current`
- Use `e.preventDefault()` in `onDragOver` to enable drop

---

## 4. Drag process row → drop on folder

Each `EntryRow` is made `draggable`. On `dragStart`, it stores the entry ID in `dataTransfer`:
```
e.dataTransfer.setData('process-id', entry.id)
```

`FolderSidebar` folder rows handle `onDragOver` (preventDefault + show highlight) and `onDrop` (read `process-id`, call `onAssignProcess(processId, folderId)`). A `dragOverFolderId` state in `FolderSidebar` drives the highlight.

`ProcessList` wires up `onAssignProcess(processId, folderId)`:
```typescript
async function handleAssignProcess(processId: string, folderId: string) {
  const entry = entries.find(e => e.id === processId)
  if (!entry) return
  const updated = { ...entry, folderId }
  saveEntry(updated)
  setEntries(prev => prev.map(e => e.id === processId ? updated : e))
}
```

Dropping on "All Processes" clears `folderId` (sets to `undefined`).

---

## Files Changed

- `src/pages/ProcessList.tsx` — add search state + filter logic; wire `onAssignProcess`; pass `entries` + `onAssignProcess` to FolderSidebar
- `src/components/FolderSidebar.tsx` — add count badges; folder drag-to-reorder; process drop target with highlight
