# Canvas UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimap, empty-canvas hint, auto-save, and Ctrl+S to the WFO Process Mapper canvas.

**Architecture:** Minimap and empty-canvas hint live entirely in `CanvasInner` (ProcessCanvas.tsx). Auto-save and Ctrl+S live in `ProcessBuilder.tsx` as a `useEffect` + keyboard listener — they call the existing `handleSave()` function.

**Tech Stack:** React 19, @xyflow/react 12 (MiniMap built-in), TypeScript 5

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `main`

---

## File Map

**Modified:**
- `src/components/canvas/ProcessCanvas.tsx` — add `<MiniMap>` inside ReactFlow; add empty-canvas hint
- `src/pages/ProcessBuilder.tsx` — add debounced auto-save effect; add Ctrl+S listener

---

## Task 1 — Minimap + empty canvas hint

**Files:** `src/components/canvas/ProcessCanvas.tsx`

- [ ] **Step 1: Add MiniMap import**

In the `@xyflow/react` import block, add `MiniMap`:
```typescript
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  ...
} from '@xyflow/react'
```

- [ ] **Step 2: Add NODE_MINIMAP_COLORS constant**

After the `EDGE_MARKER` constant, add:
```typescript
const NODE_MINIMAP_COLORS: Partial<Record<ProcessNodeType, string>> = {
  start: '#f97316',
  end: '#f97316',
  step: '#3b82f6',
  decision: '#a855f7',
  automation: '#10b981',
  comms: '#f59e0b',
  swimlane: '#bfdbfe',
  sticky: '#fef9c3',
}
```

- [ ] **Step 3: Add MiniMap inside ReactFlow**

Inside the `<ReactFlow>` JSX (after `<Controls />`), add:
```tsx
{!readOnly && (
  <MiniMap
    nodeColor={(n) => NODE_MINIMAP_COLORS[n.type as ProcessNodeType] ?? '#94a3b8'}
    maskColor="rgba(0,0,0,0.04)"
    style={{ bottom: 64, right: 8, width: 160, height: 100 }}
    pannable
    zoomable
  />
)}
```

- [ ] **Step 4: Add empty canvas hint**

In the `<div className="relative flex-1" ...>` canvas area (the outer div that wraps ReactFlow), add after the multi-select toolbar and before `<ReactFlow>`:
```tsx
{rfNodes.length === 0 && !readOnly && (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-2">
    <p className="text-sm text-muted-foreground/40 select-none">
      Drag nodes from the palette to start mapping
    </p>
  </div>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx
git commit -m "feat(canvas): add minimap and empty canvas hint"
```

---

## Task 2 — Auto-save (debounced 30s) + Ctrl+S

**Files:** `src/pages/ProcessBuilder.tsx`

- [ ] **Step 1: Add auto-save state indicator**

Inside `ProcessBuilder`, add state for the auto-save indicator:
```typescript
const [autoSaving, setAutoSaving] = useState(false)
```

- [ ] **Step 2: Add debounced auto-save effect**

After the existing `useEffect` hooks (around line 116), add:
```typescript
// Auto-save: debounce 30s after any entry change, draft only, named process only
useEffect(() => {
  if (entry.status === 'submitted' || !entry.processName.trim()) return
  setAutoSaving(true)
  const timer = setTimeout(() => {
    handleSave()
    setAutoSaving(false)
  }, 30_000)
  return () => {
    clearTimeout(timer)
    setAutoSaving(false)
  }
}, [entry])
```

Note: `handleSave` is defined below this effect in the file. To avoid a lint warning about the dependency, this is intentional — `handleSave` is recreated each render but always reads fresh `entry` state.

- [ ] **Step 3: Add Ctrl+S keyboard listener**

After the auto-save effect, add:
```typescript
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable
      if (!isEditable) {
        e.preventDefault()
        handleSave()
      }
    }
  }
  document.addEventListener('keydown', onKeyDown)
  return () => document.removeEventListener('keydown', onKeyDown)
}, [])
```

- [ ] **Step 4: Show auto-saving indicator in top bar**

In the top bar's right-side div (near the Save button), add before the Save button:
```tsx
{autoSaving && (
  <span className="text-xs text-muted-foreground animate-pulse">Auto-saving…</span>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProcessBuilder.tsx
git commit -m "feat(builder): add debounced auto-save (30s) and Ctrl+S keyboard shortcut"
```

---

## Verification

- [ ] Open a process, drag a node, wait 30 seconds — "Auto-saving…" appears briefly, then disappears, "Changes saved" toast fires
- [ ] Press Ctrl+S — saves immediately
- [ ] Ctrl+S while typing in a form field — does NOT save (native browser behavior preserved)
- [ ] Open a blank new process — see "Drag nodes from the palette to start mapping" hint
- [ ] Add a node — hint disappears
- [ ] Click the minimap — canvas pans to that position
- [ ] `pnpm test` — 9/9 pass
