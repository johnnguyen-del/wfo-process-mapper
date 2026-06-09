# Resizable Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independent drag handles (Form↔Canvas and Current↔Ideal) that persist to localStorage, fix the T/B orientation toggle bug, and add a Reset Layout button.

**Architecture:** `leftWidth` (px) and `compareSplit` (%) states live in `ProcessBuilder.tsx` and are initialised from `localStorage`. A `layoutKey` counter in ProcessBuilder forces canvas remounts when relayout is triggered. `CompareView` receives `compareSplit` + `onCompareSplitChange` as controlled props so ProcessBuilder owns the reset. All drag logic uses native `mousedown/mousemove/mouseup` — no library needed.

**Tech Stack:** React 19, TypeScript 5, Tailwind CSS 4, @xyflow/react 12

---

## File Map

**Modified:**
- `src/components/canvas/ProcessCanvas.tsx` — add `layoutKey?: number` to `ProcessCanvasProps` and `CanvasInnerProps`; include in `canvasKey`
- `src/components/canvas/CompareView.tsx` — replace `flex-1` panels with `compareSplit`-driven widths; add violet drag handle; accept `compareSplit` + `onCompareSplitChange` props
- `src/pages/ProcessBuilder.tsx` — add `leftWidth`, `compareSplit`, `layoutKey` state; indigo drag handle; increment `layoutKey` in relayout handlers; Reset button; pass new props down

---

## Task 1 — Fix T/B orientation bug (layoutKey)

**Files:**
- Modify: `src/components/canvas/ProcessCanvas.tsx` (lines 554–600)
- Modify: `src/pages/ProcessBuilder.tsx` (lines 25–35, 103–116, 280–330)

- [ ] **Step 1: Add `layoutKey` prop to ProcessCanvasProps and CanvasInnerProps**

In `src/components/canvas/ProcessCanvas.tsx`, find the `CanvasInnerProps` interface (~line 194) and `ProcessCanvasProps` interface (~line 554). Add `layoutKey?: number` to both:

```typescript
// CanvasInnerProps — add after onLineStyleChange:
layoutKey?: number

// ProcessCanvasProps — add after onLineStyleChange:
layoutKey?: number
```

- [ ] **Step 2: Thread layoutKey into canvasKey**

Find the `canvasKey` constant in the outer `ProcessCanvas` component (~line 586):

```typescript
// Replace:
const canvasKey = `canvas-${processMap.nodes.length}-${processMap.nodes.map(n => n.id).join(',')}`

// With:
const canvasKey = `canvas-${processMap.nodes.length}-${processMap.nodes.map(n => n.id).join(',')}-${layoutKey ?? 0}`
```

Also pass `layoutKey` through to `CanvasInner` in the `ProcessCanvas` return:
```tsx
<CanvasInner
  key={canvasKey}
  processMap={processMap}
  lanes={lanes}
  direction={direction}
  lineStyle={lineStyle}
  canvasLabel={canvasLabel}
  readOnly={readOnly}
  layoutKey={layoutKey}
  onChange={onChange}
  onRelayout={onRelayout}
  onLineStyleChange={onLineStyleChange}
/>
```

(Note: `CanvasInner` receives `layoutKey` but doesn't use it directly — `key={canvasKey}` on the element is what triggers the remount. The prop just needs to exist in the interface for TypeScript.)

- [ ] **Step 3: Add layoutKey state to ProcessBuilder**

In `src/pages/ProcessBuilder.tsx`, add after the existing `canvasDirection` / `lineStyle` state:

```typescript
const [layoutKey, setLayoutKey] = useState(0)
```

- [ ] **Step 4: Increment layoutKey in both relayout handlers**

```typescript
function handleRelayout(direction: CanvasDirection) {
  setCanvasDirection(direction)
  const relaidNodes = autoLayout(entry.processMap.nodes, entry.processMap.edges, direction)
  patch({ processMap: { nodes: relaidNodes, edges: entry.processMap.edges } })
  setLayoutKey(k => k + 1)   // ← add this line
}

function handleOptimizationRelayout(direction: CanvasDirection) {
  setCanvasDirection(direction)
  setEntry(prev => {
    if (!prev.optimizationMap) return prev
    const relaid = autoLayout(prev.optimizationMap.nodes, prev.optimizationMap.edges, direction)
    return { ...prev, optimizationMap: { nodes: relaid, edges: prev.optimizationMap.edges } }
  })
  setLayoutKey(k => k + 1)   // ← add this line
}
```

- [ ] **Step 5: Pass layoutKey to all ProcessCanvas instances**

In the right-panel JSX of ProcessBuilder, add `layoutKey={layoutKey}` to all three `<ProcessCanvas>` instances (current, optimization, and inside CompareView — CompareView doesn't use it directly since it receives readOnly canvases, so skip it there):

```tsx
{viewMode === 'current' && (
  <ProcessCanvas
    ...
    layoutKey={layoutKey}
    ...
  />
)}
{viewMode === 'optimization' && (
  <>
    <ProcessCanvas
      ...
      layoutKey={layoutKey}
      ...
    />
    ...
  </>
)}
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify T/B fix in dev**

```bash
pnpm dev
```

Open http://localhost:5173, load a process with nodes, click the L→R / T→B toggle. Nodes should visibly reflow between horizontal and vertical layouts.

- [ ] **Step 8: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx src/pages/ProcessBuilder.tsx
git commit -m "fix(canvas): add layoutKey to force canvas remount on relayout (fixes T/B toggle)"
```

---

## Task 2 — Form ↔ Canvas drag handle (indigo)

**Files:**
- Modify: `src/pages/ProcessBuilder.tsx`

- [ ] **Step 1: Add leftWidth state with localStorage initialisation**

In `src/pages/ProcessBuilder.tsx`, add after the `layoutKey` state:

```typescript
const DEFAULT_LEFT_WIDTH = Math.max(280, Math.round(window.innerWidth * 0.4))

const [leftWidth, setLeftWidth] = useState<number>(() => {
  const saved = localStorage.getItem('wfo-layout-left')
  return saved ? Number(saved) : DEFAULT_LEFT_WIDTH
})
```

- [ ] **Step 2: Add drag handler for the form panel**

Add this function inside the component, after `handleOptimizationRelayout`:

```typescript
function handleLeftDragStart(e: React.MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = leftWidth

  function onMove(ev: MouseEvent) {
    const newWidth = Math.min(
      Math.max(280, startWidth + (ev.clientX - startX)),
      Math.round(window.innerWidth * 0.65)
    )
    setLeftWidth(newWidth)
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    setLeftWidth(prev => {
      localStorage.setItem('wfo-layout-left', String(prev))
      return prev
    })
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
```

- [ ] **Step 3: Replace left panel class with inline width style**

Find the left panel div (currently `className="w-[40%] min-w-[320px] border-r flex flex-col overflow-hidden shrink-0"`):

```tsx
// Replace that className with:
<div
  className="border-r flex flex-col overflow-hidden shrink-0"
  style={{ width: leftWidth, minWidth: 280 }}
>
```

- [ ] **Step 4: Add the indigo drag handle div**

In the main split div (`<div className="flex flex-1 overflow-hidden">`), insert the handle between the left panel and the right canvas div:

```tsx
{/* Left: Form / AI tabs */}
<div
  className="border-r flex flex-col overflow-hidden shrink-0"
  style={{ width: leftWidth, minWidth: 280 }}
>
  {/* ... existing form content unchanged ... */}
</div>

{/* Indigo drag handle — Form ↔ Canvas */}
<div
  onMouseDown={handleLeftDragStart}
  className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-indigo-400 transition-colors flex items-center justify-center group"
  title="Drag to resize"
>
  <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
</div>

{/* Right: Canvas */}
<div className="flex-1 flex flex-col overflow-hidden canvas-fullscreen-target">
  {/* ... existing canvas content unchanged ... */}
</div>
```

- [ ] **Step 5: TypeScript + visual check**

```bash
pnpm tsc --noEmit
```

Then `pnpm dev` — drag the indigo handle left/right. Panel resizes. Reload page — width is remembered.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProcessBuilder.tsx
git commit -m "feat(layout): add resizable form/canvas split with localStorage persistence"
```

---

## Task 3 — Current ↔ Ideal drag handle in CompareView (violet)

**Files:**
- Modify: `src/components/canvas/CompareView.tsx` — add `compareSplit` prop + drag handle
- Modify: `src/pages/ProcessBuilder.tsx` — add `compareSplit` state, pass to CompareView

- [ ] **Step 1: Add compareSplit state to ProcessBuilder**

After `leftWidth` state:

```typescript
const [compareSplit, setCompareSplit] = useState<number>(() => {
  const saved = localStorage.getItem('wfo-layout-compare')
  return saved ? Number(saved) : 50
})
```

Add `onCompareSplitChange` handler in ProcessBuilder:

```typescript
function handleCompareSplitChange(pct: number) {
  setCompareSplit(pct)
  localStorage.setItem('wfo-layout-compare', String(pct))
}
```

- [ ] **Step 2: Pass compareSplit to CompareView**

Find the `<CompareView ... />` JSX in ProcessBuilder and add two new props:

```tsx
{viewMode === 'compare' && (
  <CompareView
    currentMap={entry.processMap}
    optimizationMap={entry.optimizationMap ?? { nodes: [], edges: [] }}
    direction={canvasDirection}
    lineStyle={lineStyle}
    teamOwner={entry.teamOwner}
    workato={entry.workato}
    decagonL0={entry.decagonL0}
    compareSplit={compareSplit}
    onCompareSplitChange={handleCompareSplitChange}
  />
)}
```

- [ ] **Step 3: Update CompareView props interface and add drag logic**

Replace the full contents of `src/components/canvas/CompareView.tsx`:

```tsx
import { useRef } from 'react'
import ProcessCanvas from './ProcessCanvas'
import type { ProcessMap, CanvasDirection, LineStyle, TeamOwner } from '@/lib/types'

interface CompareViewProps {
  currentMap: ProcessMap
  optimizationMap: ProcessMap
  direction: CanvasDirection
  lineStyle: LineStyle
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  compareSplit: number                        // 20–80, percentage of container width
  onCompareSplitChange: (pct: number) => void
}

export default function CompareView({
  currentMap,
  optimizationMap,
  direction,
  lineStyle,
  teamOwner,
  workato,
  decagonL0,
  compareSplit,
  onCompareSplitChange,
}: CompareViewProps) {
  const noOp = () => {}
  const containerRef = useRef<HTMLDivElement>(null)

  function handleSplitDragStart(e: React.MouseEvent) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.getBoundingClientRect().width
    const startX = e.clientX
    const startPct = compareSplit

    function onMove(ev: MouseEvent) {
      const deltaPct = ((ev.clientX - startX) / containerWidth) * 100
      onCompareSplitChange(Math.min(80, Math.max(20, startPct + deltaPct)))
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div ref={containerRef} className="flex h-full">
      {/* Left: Current Flow */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: `${compareSplit}%` }}
      >
        <div className="px-3 py-1.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground shrink-0">
          Current Flow
        </div>
        <div className="flex-1 relative">
          <ProcessCanvas
            processMap={currentMap}
            teamOwner={teamOwner}
            workato={workato}
            decagonL0={decagonL0}
            direction={direction}
            lineStyle={lineStyle}
            readOnly
            onChange={noOp}
            onRelayout={noOp}
            onLineStyleChange={noOp}
          />
        </div>
      </div>

      {/* Violet drag handle — Current ↔ Ideal */}
      <div
        onMouseDown={handleSplitDragStart}
        className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-violet-400 transition-colors flex items-center justify-center group"
        title="Drag to resize"
      >
        <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
      </div>

      {/* Right: Ideal Flow */}
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="px-3 py-1.5 bg-violet-50 border-b text-xs font-semibold text-violet-700 shrink-0">
          ✦ Ideal Flow
        </div>
        <div className="flex-1 relative">
          <ProcessCanvas
            processMap={optimizationMap}
            teamOwner={teamOwner}
            workato={workato}
            decagonL0={decagonL0}
            direction={direction}
            lineStyle={lineStyle}
            readOnly
            onChange={noOp}
            onRelayout={noOp}
            onLineStyleChange={noOp}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript + visual check**

```bash
pnpm tsc --noEmit
```

Then `pnpm dev` — switch to Compare mode, drag the violet handle. Left canvas grows, right canvas shrinks. Reload — split is remembered.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/CompareView.tsx src/pages/ProcessBuilder.tsx
git commit -m "feat(layout): add resizable Current/Ideal split in CompareView"
```

---

## Task 4 — Reset Layout button

**Files:**
- Modify: `src/pages/ProcessBuilder.tsx`

- [ ] **Step 1: Add reset handler**

In `src/pages/ProcessBuilder.tsx`, add after `handleCompareSplitChange`:

```typescript
function handleResetLayout() {
  setLeftWidth(DEFAULT_LEFT_WIDTH)
  setCompareSplit(50)
  localStorage.removeItem('wfo-layout-left')
  localStorage.removeItem('wfo-layout-compare')
}
```

- [ ] **Step 2: Add Reset button to top bar**

In the top bar's right-side `<div className="flex gap-2 items-center">`, add before the Save button:

```tsx
{(leftWidth !== DEFAULT_LEFT_WIDTH || compareSplit !== 50) && (
  <button
    onClick={handleResetLayout}
    className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-colors"
    title="Reset to default layout"
  >
    ⊞ Reset layout
  </button>
)}
```

- [ ] **Step 3: TypeScript + visual check**

```bash
pnpm tsc --noEmit
```

Then `pnpm dev` — drag either handle, confirm "⊞ Reset layout" button appears. Click it — both panels snap back to defaults, button disappears.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProcessBuilder.tsx
git commit -m "feat(layout): add Reset Layout button that clears both drag handle positions"
```

---

## Verification

- [ ] `pnpm tsc --noEmit` — clean
- [ ] `pnpm test` — 9/9 pass (no regressions)
- [ ] `pnpm build` — clean build
- [ ] T/B toggle: nodes reflow to top-down layout and back
- [ ] Indigo handle: drag resizes form panel, persists on reload
- [ ] Violet handle (Compare mode): drag resizes Current vs Ideal canvases, persists on reload
- [ ] Reset button: appears only after a handle has moved, resets both to defaults

---

## Self-Review

**Spec coverage:**
- ✅ T/B bug fix via layoutKey
- ✅ Form↔Canvas handle (indigo), 280px min, 65% max, localStorage
- ✅ Current↔Ideal handle (violet), 20–80%, localStorage
- ✅ Reset button, conditional display, clears localStorage

**No placeholders found.**

**Type consistency:** `compareSplit: number` used consistently in ProcessBuilder + CompareView. `handleCompareSplitChange(pct: number)` matches `onCompareSplitChange: (pct: number) => void` in CompareView props.
