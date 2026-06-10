# Polish Upgrades Design — Canvas UX, Interactions, Process Mgmt, Dark Mode

## Sub-project B — Canvas UX Polish

### Minimap
Add `<MiniMap />` from `@xyflow/react` inside the `<ReactFlow>` component in `CanvasInner`. Position: bottom-right (Controls is already bottom-left). Style: small, semi-transparent, respects lane colors. Only shown when not `readOnly`.

```tsx
<MiniMap
  nodeColor={(n) => NODE_MINIMAP_COLORS[n.type as ProcessNodeType] ?? '#94a3b8'}
  maskColor="rgba(0,0,0,0.05)"
  style={{ bottom: 60, right: 8 }}
/>
```

`NODE_MINIMAP_COLORS` maps node types to their accent colors (orange=start/end, blue=step, purple=decision, green=automation, amber=comms, blue=swimlane, yellow=sticky).

### Auto-save
Debounced auto-save in `ProcessBuilder.tsx`. On every `entry` change, reset a 30-second timer. When it fires, call `handleSave()` — but only when `entry.status === 'draft'` and `entry.processName` is non-empty (don't silently save unnamed/empty processes). Show a subtle "Auto-saving…" chip in the top bar when the timer is active.

```typescript
useEffect(() => {
  if (entry.status === 'submitted' || !entry.processName) return
  const timer = setTimeout(() => handleSave(), 30_000)
  return () => clearTimeout(timer)
}, [entry])
```

### Ctrl+S
In `ProcessBuilder`, add a `keydown` listener for `Ctrl+S` / `Cmd+S` that calls `handleSave()`. Guard: skip when `e.target` is an `<input>`, `<textarea>`, or `[contenteditable]` — those need their native save behavior.

### Empty canvas hint
In `CanvasInner`, when `rfNodes.length === 0` and `!readOnly`, render centered placeholder text inside the canvas area:

```tsx
{rfNodes.length === 0 && !readOnly && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <p className="text-sm text-muted-foreground/40 select-none">
      Drag nodes from the palette to start mapping
    </p>
  </div>
)}
```

---

## Sub-project A — Canvas Interactions

### Undo / Redo
History lives in `ProcessBuilder` as a ref (not state, to avoid render loops):

```typescript
const historyRef = useRef<ProcessMap[]>([])
const historyIdxRef = useRef(-1)
```

**Push**: every time `patch({ processMap })` is called (from `onChange`), push a snapshot. Slice forward history on new push (standard undo behavior). Cap at 50 entries.

**Undo (Ctrl+Z)**: decrement index, call `patch({ processMap: historyRef.current[idx] })` + `setLayoutKey(k+1)` to force canvas remount with restored positions.

**Redo (Ctrl+Y or Ctrl+Shift+Z)**: increment index, same.

Guard: keyboard listener must not fire when focus is in a form input.

### Copy / Paste
State lives in `CanvasInner`:

```typescript
const clipboardRef = useRef<{ nodes: ProcessNode[]; edges: ProcessEdge[] } | null>(null)
const mousePosRef = useRef<{ x: number; y: number } | null>(null)
```

Track mouse position over canvas via `onMouseMove` on the canvas container div (stored in `mousePosRef`).

**Ctrl+C**: collect selected rfNodes + any edges whose source AND target are both selected. Convert to ProcessNode/ProcessEdge and store in `clipboardRef`.

**Ctrl+V**: if clipboard empty, no-op. Compute paste position:
- If `mousePosRef.current` is set → `screenToFlowPosition(mousePosRef.current)`
- Else → first node's position + `{ x: 30, y: 30 }`

Create new nodes with fresh IDs (prefix `copy-${Date.now()}-`) and the computed offset. Create new edges between the new IDs. Add to canvas via `setRfNodes` / `setRfEdges` and call `commit`.

### Node Lock
Add `locked?: boolean` to `ProcessNode` (in `types.ts`).

In `toRfNodes`: set `draggable: !n.locked` and `deletable: !n.locked`.

Show 🔒 badge (small, absolute top-right) on all node types when `data.locked === true`.

In `NodeEditDialog`: add a Lock toggle (checkbox/button) when not isStartEnd.

In the multi-select toolbar (the floating bar that appears on node selection), add **Lock** / **Unlock** buttons that call `handleLockSelected(true/false)`:
```typescript
function handleLockSelected(lock: boolean) {
  setRfNodes(prev => {
    const updated = prev.map(n => n.selected ? { ...n, data: { ...n.data, locked: lock } } : n)
    commit(fromRfNodes(updated), fromRfEdges(rfEdges))
    return updated
  })
}
```

### Select All (Ctrl+A)
Keyboard listener in `CanvasInner`. On Ctrl+A (when canvas focused, not in input):
```typescript
setRfNodes(prev => prev.map(n => ({ ...n, selected: true })))
```

### Edge Label Editing
Double-clicking an edge opens a small floating input for editing its label. Use `onEdgeDoubleClick` prop on `<ReactFlow>`.

State: `const [editingEdge, setEditingEdge] = useState<Edge | null>(null)`

Render a small popover div positioned at the edge's center point (midpoint of source/target node positions). On Enter/blur, call `setRfEdges` to update the label and `commit`.

Edge midpoint: `{ x: (sourceNode.x + targetNode.x) / 2, y: (sourceNode.y + targetNode.y) / 2 }` converted via `flowToScreenPosition`.

### Keyboard Shortcut Guide
A `⌨` button in the canvas toolbar. Opens a small modal overlay. Contents:

| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy selected |
| Ctrl+V | Paste |
| Ctrl+A | Select all |
| Ctrl+S | Save |
| Delete | Delete selected |
| ? | This guide |

Dismiss on Escape or click outside.

---

## Sub-project C — Process Management

### Duplicate Process
Add a "Duplicate" button to `EntryRow` in `ProcessList.tsx` (copy icon, always visible). On click:
1. Deep-clone the entry with `structuredClone`
2. Assign a new `generateId()`
3. Set `processName = 'Copy of ' + entry.processName`
4. Clear `status = 'draft'`, `submittedAt = ''`, `submittedBy = ''`, `notionPageUrl = null`, `author = undefined`, `collaborators = undefined`, `editLog = undefined`
5. Call `saveEntry(newEntry)` and `setEntries(prev => [newEntry, ...prev])`

### Export as PNG
Uses `html2canvas` (new dependency: `html2canvas`).

Add an "Export PNG" button to the canvas toolbar. On click:
1. Get the `.react-flow` container ref
2. Call `html2canvas(containerEl, { backgroundColor: '#ffffff', scale: 2 })` for 2× resolution
3. Convert canvas to blob → download as `[processName].png`

Only shown when `!readOnly` and there are nodes on the canvas.

---

## Sub-project D — Dark Mode

### Token status
`ws-shim.css` already defines all CSS variables for both `:root` (light) and `.dark` (dark). Nothing to add there.

### ThemeProvider
Wrap `App.tsx` with `next-themes` `ThemeProvider`:
```tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
  {/* existing app */}
</ThemeProvider>
```

`attribute="class"` puts `.dark` on `<html>`, which matches `ws-shim.css`.

### Toggle button
Add a Sun/Moon icon button to the `<header>` in `App.tsx`, right side:
```tsx
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
```

### ReactFlow dark mode
ReactFlow's built-in styles use CSS variables that already work with the theme system. Add `colorMode={theme === 'dark' ? 'dark' : 'light'}` prop to `<ReactFlow>` in `CanvasInner`.

---

## Files Changed Summary

| File | Sub-project |
|---|---|
| `src/App.tsx` | D — ThemeProvider, toggle |
| `src/pages/ProcessBuilder.tsx` | A (history, Ctrl+S, auto-save), B (auto-save) |
| `src/pages/ProcessList.tsx` | C (duplicate) |
| `src/components/canvas/ProcessCanvas.tsx` | A (undo/redo, copy/paste, lock, select-all, edge edit, shortcut guide), B (minimap, empty hint) |
| `src/components/canvas/NodeEditDialog.tsx` | A (lock toggle) |
| `src/lib/types.ts` | A (locked field) |
| `package.json` | C (html2canvas) |

## Out of Scope
- Undo spanning form field changes (process name, domain, etc.) — canvas-only as agreed
- Copy-paste across different process maps
- Multi-user conflict detection
- Swimlane/sticky node special handling in copy (they are copied as-is)
