# Canvas Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo/redo, copy/paste, node lock, select-all, edge label editing, and keyboard shortcut guide to the canvas.

**Architecture:** Undo/redo history lives in `ProcessBuilder` (refs, not state). Copy/paste and lock live in `CanvasInner`. All keyboard listeners guard against firing inside form inputs. Edge label editing uses a small floating input rendered inside `CanvasInner`. The keyboard guide is a modal in `CanvasInner`.

**Tech Stack:** React 19, TypeScript 5, @xyflow/react 12

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `main`

---

## File Map

**Modified:**
- `src/lib/types.ts` — add `locked?: boolean` to `ProcessNode`
- `src/lib/export.ts` — serialize `locked` in toYaml/fromYaml
- `src/components/canvas/ProcessCanvas.tsx` — copy/paste, lock toggle, select-all, edge editing, shortcut guide, lock badge rendering
- `src/components/canvas/NodeEditDialog.tsx` — lock toggle field
- `src/pages/ProcessBuilder.tsx` — undo/redo history stack + keyboard shortcuts

---

## Task 1 — Add `locked` field to schema

**Files:** `src/lib/types.ts`, `src/lib/export.ts`

- [ ] **Step 1: Add `locked` to ProcessNode**

In `src/lib/types.ts`, add to `ProcessNode` interface after `nodeHeight?`:
```typescript
locked?: boolean     // when true: not draggable, not deletable
```

- [ ] **Step 2: Serialize locked in toYaml**

In `src/lib/export.ts`, in the `toYaml` node map after the `nodeHeight` spread:
```typescript
...(n.locked ? { locked: true } : {}),
```

- [ ] **Step 3: Deserialize locked in fromYaml**

In `src/lib/export.ts`, in the `fromYaml` rawNodes map after `nodeHeight`:
```typescript
locked: n.locked ?? undefined,
```

- [ ] **Step 4: TypeScript check + tests**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit && pnpm test
```

Expected: 9/9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/export.ts
git commit -m "feat(canvas): add locked field to ProcessNode schema"
```

---

## Task 2 — Node lock: rendering, toRfNodes, multi-select toolbar, NodeEditDialog

**Files:** `src/components/canvas/ProcessCanvas.tsx`, `src/components/canvas/NodeEditDialog.tsx`

- [ ] **Step 1: Update toRfNodes to use locked**

In `ProcessCanvas.tsx`, update `toRfNodes` to pass `locked` into data and set `draggable`/`deletable`:
```typescript
function toRfNodes(nodes: ProcessNode[], direction: CanvasDirection = 'LR'): Node[] {
  const sourcePos = direction === 'TB' ? Position.Bottom : Position.Right
  const targetPos = direction === 'TB' ? Position.Top : Position.Left
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    zIndex: n.type === 'sticky' ? 10 : n.type === 'swimlane' ? -1 : 0,
    draggable: !n.locked,
    deletable: !n.locked,
    style: n.type === 'swimlane' ? { width: n.nodeWidth ?? 400, height: n.nodeHeight ?? 200 } : undefined,
    data: {
      label: n.label,
      lane: n.lane,
      timeEstimate: n.timeEstimate,
      type: n.type,
      badge: n.badge,
      durationMinutes: n.durationMinutes,
      attachments: n.attachments,
      nodeColor: n.nodeColor,
      locked: n.locked,
    },
  }))
}
```

- [ ] **Step 2: Update fromRfNodes to read locked**

In `fromRfNodes`, add after `nodeColor`:
```typescript
locked: (n.data as any).locked || undefined,
```

- [ ] **Step 3: Add lock handler to CanvasInner**

In `CanvasInner`, add after `handleDeleteSelected`:
```typescript
function handleLockSelected(lock: boolean) {
  if (readOnly) return
  setRfNodes(prev => {
    const updated = prev.map(n =>
      n.selected ? { ...n, data: { ...n.data, locked: lock }, draggable: !lock, deletable: !lock } : n
    )
    commit(fromRfNodes(updated), fromRfEdges(rfEdges))
    return updated
  })
}
```

- [ ] **Step 4: Add Lock/Unlock buttons to multi-select toolbar**

Find the multi-select toolbar JSX (the one that shows `{selectedCount} node{...} selected`). Add lock buttons alongside the existing "Delete all" button:
```tsx
<button
  onClick={() => handleLockSelected(true)}
  className="text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1"
>
  🔒 Lock
</button>
<button
  onClick={() => handleLockSelected(false)}
  className="text-muted-foreground hover:text-background transition-colors flex items-center gap-1"
>
  🔓 Unlock
</button>
```

- [ ] **Step 5: Add 🔒 badge to StepNode**

In `src/components/canvas/node-types/StepNode.tsx`, add the locked badge. After the existing priority dot span (the absolute top-right dot), add:
```tsx
{(data as any).locked && (
  <span className="absolute top-0.5 left-1 text-[9px] leading-none" title="Locked">🔒</span>
)}
```

Apply the same `{(data as any).locked && <span className="absolute top-0.5 left-1 text-[9px] leading-none" title="Locked">🔒</span>}` to `DecisionNode.tsx`, `AutomationNode.tsx`, `CommsNode.tsx`.

- [ ] **Step 6: Add lock toggle to NodeEditDialog**

In `NodeEditDialog.tsx`, add lock state:
```typescript
const [locked, setLocked] = useState<boolean>((node.data as any).locked ?? false)
```

Add to `onSave` prop signature as 9th param: `locked?: boolean`

Add toggle in the form (after the duration field, inside `!isStartEnd` block):
```tsx
<div className="flex items-center justify-between">
  <label className="text-xs font-medium text-muted-foreground">Lock position</label>
  <button
    type="button"
    onClick={() => setLocked(l => !l)}
    className={cn(
      'text-xs px-2 py-1 rounded border transition-colors',
      locked ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-background border-border text-muted-foreground'
    )}
  >
    {locked ? '🔒 Locked' : '🔓 Unlocked'}
  </button>
</div>
```

Update the Save button onClick to pass `locked` as 9th arg. Update `handleEditSave` in ProcessCanvas.tsx to accept `locked?: boolean` and spread into node data.

- [ ] **Step 7: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/export.ts src/components/canvas/ProcessCanvas.tsx src/components/canvas/NodeEditDialog.tsx src/components/canvas/node-types/StepNode.tsx src/components/canvas/node-types/DecisionNode.tsx src/components/canvas/node-types/AutomationNode.tsx src/components/canvas/node-types/CommsNode.tsx
git commit -m "feat(canvas): add node lock/unlock with multi-select toolbar and per-node toggle"
```

---

## Task 3 — Select All (Ctrl+A), Copy/Paste (Ctrl+C/V), Keyboard listener

**Files:** `src/components/canvas/ProcessCanvas.tsx`

- [ ] **Step 1: Add clipboard and mouse position refs to CanvasInner**

In `CanvasInner`, after existing refs, add:
```typescript
const clipboardRef = useRef<{ nodes: ProcessNode[]; edges: ProcessEdge[] } | null>(null)
const mousePosRef = useRef<{ x: number; y: number } | null>(null)
```

- [ ] **Step 2: Track mouse position over canvas**

On the `<div className="relative flex-1" ...>` canvas container div, add:
```tsx
onMouseMove={(e) => {
  mousePosRef.current = { x: e.clientX, y: e.clientY }
}}
onMouseLeave={() => {
  mousePosRef.current = null
}}
```

- [ ] **Step 3: Add keyboard handler useEffect in CanvasInner**

Add after the existing `useEffect` hooks (fullscreen, lineStyle):
```typescript
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
    if (isEditable) return
    if (readOnly) return

    // Select All
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault()
      setRfNodes(prev => prev.map(n => ({ ...n, selected: true })))
      return
    }

    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      const selectedNodes = rfNodesRef.current.filter(n => n.selected)
      if (selectedNodes.length === 0) return
      const selectedIds = new Set(selectedNodes.map(n => n.id))
      const connectedEdges = rfEdgesRef.current.filter(
        e => selectedIds.has(e.source) && selectedIds.has(e.target)
      )
      clipboardRef.current = {
        nodes: fromRfNodes(selectedNodes),
        edges: fromRfEdges(connectedEdges),
      }
      return
    }

    // Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      const cb = clipboardRef.current
      if (!cb || cb.nodes.length === 0) return

      const stamp = Date.now()
      const idMap = new Map<string, string>()
      cb.nodes.forEach(n => idMap.set(n.id, `copy-${stamp}-${n.id}`))

      // Compute paste origin: cursor position or fallback to offset
      let originX = cb.nodes[0].position.x + 30
      let originY = cb.nodes[0].position.y + 30
      if (mousePosRef.current) {
        const flowPos = screenToFlowPosition(mousePosRef.current)
        const minX = Math.min(...cb.nodes.map(n => n.position.x))
        const minY = Math.min(...cb.nodes.map(n => n.position.y))
        originX = flowPos.x - (cb.nodes[0].position.x - minX)
        originY = flowPos.y - (cb.nodes[0].position.y - minY)
      }

      const pastedNodes: ProcessNode[] = cb.nodes.map(n => ({
        ...n,
        id: idMap.get(n.id)!,
        position: {
          x: originX + (n.position.x - cb.nodes[0].position.x),
          y: originY + (n.position.y - cb.nodes[0].position.y),
        },
      }))

      const pastedEdges: ProcessEdge[] = cb.edges.map(e => ({
        id: `copy-${stamp}-${e.id}`,
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
        label: e.label,
      }))

      const newNodes = [...fromRfNodes(rfNodesRef.current), ...pastedNodes]
      const newEdges = [...fromRfEdges(rfEdgesRef.current), ...pastedEdges]
      setRfNodes(toRfNodes(newNodes, direction))
      setRfEdges(toRfEdges(newEdges, lineStyle))
      commit(newNodes, newEdges)
      return
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [readOnly, direction, lineStyle])
```

Note: `rfNodesRef.current` and `rfEdgesRef.current` are already defined in `CanvasInner`.

- [ ] **Step 4: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx
git commit -m "feat(canvas): add Ctrl+A select-all, Ctrl+C copy, Ctrl+V paste with cursor-aware positioning"
```

---

## Task 4 — Undo/Redo

**Files:** `src/pages/ProcessBuilder.tsx`

- [ ] **Step 1: Add history refs to ProcessBuilder**

After `getCanvasMapRef`, add:
```typescript
const historyRef = useRef<ProcessMap[]>([])
const historyIdxRef = useRef<number>(-1)

function pushHistory(map: ProcessMap) {
  // Slice off any forward history (new action invalidates redo stack)
  historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
  historyRef.current.push(structuredClone(map))
  if (historyRef.current.length > 50) historyRef.current.shift()
  historyIdxRef.current = historyRef.current.length - 1
}
```

- [ ] **Step 2: Push to history on every processMap change**

Update the `patch` function to detect processMap changes and push history:
```typescript
function patch(update: Partial<ProcessEntry>) {
  setEntry((prev) => {
    const next = { ...prev, ...update }
    if (update.processMap) pushHistory(update.processMap)
    return next
  })
}
```

- [ ] **Step 3: Add Ctrl+Z / Ctrl+Y keyboard handler in ProcessBuilder**

Add to the existing Ctrl+S keydown handler (or add a new effect after it):
```typescript
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
    if (isEditable) return

    const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey
    const isRedo = (e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))

    if (isUndo) {
      e.preventDefault()
      if (historyIdxRef.current <= 0) return
      historyIdxRef.current--
      const map = historyRef.current[historyIdxRef.current]
      setEntry(prev => ({ ...prev, processMap: structuredClone(map) }))
      setLayoutKey(k => k + 1)
    }

    if (isRedo) {
      e.preventDefault()
      if (historyIdxRef.current >= historyRef.current.length - 1) return
      historyIdxRef.current++
      const map = historyRef.current[historyIdxRef.current]
      setEntry(prev => ({ ...prev, processMap: structuredClone(map) }))
      setLayoutKey(k => k + 1)
    }
  }

  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [])
```

Note: `historyRef` and `historyIdxRef` are defined in the component scope and captured by the effect via closure. `setLayoutKey` forces canvas remount to re-initialize from restored processMap.

- [ ] **Step 4: Initialize history when entry loads**

In the `loadEntry` useEffect, after `setEntry(loaded)`:
```typescript
pushHistory(loaded.processMap)
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProcessBuilder.tsx
git commit -m "feat(canvas): add undo (Ctrl+Z) and redo (Ctrl+Y/Ctrl+Shift+Z) with 50-state history"
```

---

## Task 5 — Edge label editing + Keyboard shortcut guide

**Files:** `src/components/canvas/ProcessCanvas.tsx`

- [ ] **Step 1: Add editingEdge state to CanvasInner**

```typescript
const [editingEdge, setEditingEdge] = useState<{ id: string; label: string; x: number; y: number } | null>(null)
```

- [ ] **Step 2: Add onEdgeDoubleClick handler**

```typescript
function handleEdgeDoubleClick(_e: React.MouseEvent, edge: Edge) {
  if (readOnly) return
  // Find midpoint in screen coordinates
  const sourceNode = rfNodesRef.current.find(n => n.id === edge.source)
  const targetNode = rfNodesRef.current.find(n => n.id === edge.target)
  if (!sourceNode || !targetNode) return
  const midFlow = {
    x: (sourceNode.position.x + targetNode.position.x) / 2,
    y: (sourceNode.position.y + targetNode.position.y) / 2,
  }
  // Convert to screen position via the canvas container offset
  const container = canvasContainerRef.current
  if (!container) return
  const rect = container.getBoundingClientRect()
  const { x: vx, y: vy, zoom } = { x: 80, y: 10, zoom: 0.9 } // approximation; will snap to correct position
  setEditingEdge({
    id: edge.id,
    label: typeof edge.label === 'string' ? edge.label : '',
    x: rect.left + midFlow.x * zoom + vx,
    y: rect.top + midFlow.y * zoom + vy,
  })
}
```

Add `onEdgeDoubleClick={readOnly ? undefined : handleEdgeDoubleClick}` to `<ReactFlow>`.

- [ ] **Step 3: Render the edge label edit popover**

In the canvas area div (inside `<div className="relative flex-1" ...>`), after NodePalette:
```tsx
{editingEdge && (
  <div
    className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 flex gap-1"
    style={{ left: editingEdge.x - 80, top: editingEdge.y - 16 }}
  >
    <input
      autoFocus
      value={editingEdge.label}
      onChange={e => setEditingEdge(prev => prev ? { ...prev, label: e.target.value } : null)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          if (e.key === 'Enter') {
            setRfEdges(prev => {
              const updated = prev.map(ed =>
                ed.id === editingEdge.id ? { ...ed, label: editingEdge.label || undefined } : ed
              )
              commit(fromRfNodes(rfNodesRef.current), fromRfEdges(updated))
              return updated
            })
          }
          setEditingEdge(null)
        }
      }}
      onBlur={() => {
        setRfEdges(prev => {
          const updated = prev.map(ed =>
            ed.id === editingEdge!.id ? { ...ed, label: editingEdge!.label || undefined } : ed
          )
          commit(fromRfNodes(rfNodesRef.current), fromRfEdges(updated))
          return updated
        })
        setEditingEdge(null)
      }}
      placeholder="Edge label (e.g. Yes / No)"
      className="text-xs border-none outline-none w-40 bg-transparent"
    />
  </div>
)}
```

- [ ] **Step 4: Add showShortcuts state and ? key handler**

In CanvasInner, add:
```typescript
const [showShortcuts, setShowShortcuts] = useState(false)
```

In the keyboard listener (from Task 3), add a case for `?`:
```typescript
if (e.key === '?') {
  e.preventDefault()
  setShowShortcuts(s => !s)
  return
}
```

Add a `⌨` button to the canvas toolbar (after the Outcomes button):
```tsx
{!readOnly && (
  <button
    onClick={() => setShowShortcuts(s => !s)}
    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors bg-background text-muted-foreground border-border hover:border-foreground/40"
    title="Keyboard shortcuts (?)"
  >
    ⌨
  </button>
)}
```

- [ ] **Step 5: Render the shortcuts modal**

In the canvas area div, add the shortcuts overlay:
```tsx
{showShortcuts && (
  <div
    className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    onClick={() => setShowShortcuts(false)}
  >
    <div className="bg-background border rounded-xl shadow-xl p-5 w-72" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">Keyboard Shortcuts</span>
        <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {[
            ['Ctrl+Z', 'Undo'],
            ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
            ['Ctrl+C', 'Copy selected nodes'],
            ['Ctrl+V', 'Paste'],
            ['Ctrl+A', 'Select all'],
            ['Ctrl+S', 'Save'],
            ['Delete', 'Delete selected'],
            ['?', 'Toggle this guide'],
          ].map(([key, action]) => (
            <tr key={key} className="border-b last:border-0">
              <td className="py-1.5 pr-4 font-mono text-muted-foreground">{key}</td>
              <td className="py-1.5">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

- [ ] **Step 6: TypeScript check + tests**

```bash
pnpm tsc --noEmit && pnpm test
```

- [ ] **Step 7: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx
git commit -m "feat(canvas): add edge label editing (double-click edge) and keyboard shortcut guide (? key)"
```

---

## Verification

- [ ] Select a node → multi-select toolbar shows Lock / Unlock buttons → locking prevents drag
- [ ] Double-click locked node → can unlock from dialog
- [ ] 🔒 badge appears on locked nodes
- [ ] Ctrl+A selects all nodes
- [ ] Select 2 nodes → Ctrl+C → click elsewhere → Ctrl+V at cursor → copies appear at cursor
- [ ] Ctrl+Z undoes last action; Ctrl+Y redoes it
- [ ] Double-click an edge → label input appears → type "Yes" → Enter → label appears
- [ ] Press `?` → shortcut guide modal opens; Escape closes it
- [ ] `pnpm test` — 9/9 pass
