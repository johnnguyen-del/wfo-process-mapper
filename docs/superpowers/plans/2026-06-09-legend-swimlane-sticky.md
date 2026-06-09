# Legend Inline + Swimlane + Sticky Note Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline legend chips to the canvas toolbar, a resizable swimlane background node, and a multi-colour sticky note node.

**Architecture:** All three features extend the existing @xyflow/react node system. New node types (`swimlane`, `sticky`) are added to `ProcessNodeType` and wired into `NODE_TYPES`. A single new `nodeColor` field on `ProcessNode` drives both the swimlane background colour and sticky note colour. The existing toolbar legend section already has lane chips — this plan adds node-type chips and removes the floating overlay.

**Tech Stack:** React 19, TypeScript 5, @xyflow/react 12 (NodeResizer for swimlane), Tailwind CSS 4

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `feature/platform-upgrades`

---

## File Map

**Modified:**
- `src/lib/types.ts` — add `'swimlane' | 'sticky'` to ProcessNodeType; add `nodeColor?`, `nodeWidth?`, `nodeHeight?` to ProcessNode
- `src/lib/export.ts` — serialize `node_color`, `node_width`, `node_height` in toYaml/fromYaml
- `src/components/canvas/ProcessCanvas.tsx` — add node type chips to toolbar; remove showLegend/Legend button/CanvasLegend; add swimlane+sticky to NODE_TYPES; update toRfNodes (zIndex, style, dimensions); update fromRfNodes (read style.width/height); update handleDrop (no lane-snap for swimlane/sticky); update handleEditSave (nodeColor param)
- `src/components/canvas/NodePalette.tsx` — add swimlane and sticky palette entries
- `src/components/canvas/NodeEditDialog.tsx` — add nodeColor state + color picker for swimlane/sticky

**Created:**
- `src/components/canvas/node-types/SwimlaneNode.tsx`
- `src/components/canvas/node-types/StickyNode.tsx`

**Deleted:**
- `src/components/canvas/CanvasLegend.tsx`

---

## Task 1 — Schema: add swimlane/sticky types + nodeColor field

**Files:** `src/lib/types.ts`, `src/lib/export.ts`

- [ ] **Step 1: Update ProcessNodeType and ProcessNode in types.ts**

```typescript
// src/lib/types.ts

// Change ProcessNodeType:
export type ProcessNodeType = 'start' | 'end' | 'step' | 'decision' | 'automation' | 'comms' | 'swimlane' | 'sticky'

// Add to ProcessNode interface (after attachments):
nodeColor?: string    // hex — swimlane background or sticky note colour
nodeWidth?: number    // px — stored after NodeResizer drag (swimlane only)
nodeHeight?: number   // px — stored after NodeResizer drag (swimlane only)
```

- [ ] **Step 2: Update toYaml in export.ts**

In the node map inside `toYaml`, add after the `attachments` spread:
```typescript
...(n.nodeColor ? { node_color: n.nodeColor } : {}),
...(n.nodeWidth != null ? { node_width: n.nodeWidth } : {}),
...(n.nodeHeight != null ? { node_height: n.nodeHeight } : {}),
```

- [ ] **Step 3: Update fromYaml in export.ts**

In the rawNodes map inside `fromYaml`, add after `attachments`:
```typescript
nodeColor: n.node_color ?? undefined,
nodeWidth: n.node_width ?? undefined,
nodeHeight: n.node_height ?? undefined,
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/export.ts
git commit -m "feat(canvas): add swimlane/sticky to ProcessNodeType, add nodeColor/nodeWidth/nodeHeight to ProcessNode"
```

---

## Task 2 — Legend inline chips + remove floating overlay

**Files:** `src/components/canvas/ProcessCanvas.tsx`, delete `src/components/canvas/CanvasLegend.tsx`

- [ ] **Step 1: Add node-type chips to the toolbar's left legend section**

Find the `<div className="flex items-center gap-2 flex-wrap">` section in `CanvasInner`'s toolbar (around line 384). It already renders lane chips. After the lane chips loop, add a divider and node type chips:

```tsx
{/* Separator */}
<span className="text-muted-foreground/30 text-[10px]">|</span>

{/* Node type chips */}
{[
  { label: 'Start/End', color: '#f97316' },
  { label: 'Step', color: '#3b82f6' },
  { label: 'Decision', color: '#a855f7', diamond: true },
  { label: 'Auto', color: '#10b981' },
  { label: 'Comms', color: '#f59e0b' },
  { label: 'Lane', color: '#1d4ed8' },
  { label: 'Note', color: '#fde047' },
].map(({ label, color, diamond }) => (
  <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
    <span
      className="w-2 h-2 inline-block shrink-0"
      style={{
        backgroundColor: color,
        borderRadius: diamond ? 0 : 2,
        transform: diamond ? 'rotate(45deg)' : undefined,
      }}
    />
    {label}
  </span>
))}
```

- [ ] **Step 2: Remove showLegend state, Legend button, CanvasLegend import and render**

In `CanvasInner`:
- Remove `const [showLegend, setShowLegend] = useState(false)`
- Remove the `import CanvasLegend from './CanvasLegend'` line
- Remove `import { Map, ... }` — specifically remove `Map` from the lucide-react import (keep others)
- Remove the Legend `<button>` from the toolbar
- Remove `{showLegend && <CanvasLegend onClose={() => setShowLegend(false)} />}` from the canvas div

- [ ] **Step 3: Delete CanvasLegend.tsx**

```bash
rm /Users/johnnguyen/wfo-process-mapper/src/components/canvas/CanvasLegend.tsx
```

- [ ] **Step 4: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx
git rm src/components/canvas/CanvasLegend.tsx
git commit -m "feat(canvas): replace floating legend with inline toolbar chips, remove CanvasLegend"
```

---

## Task 3 — SwimlaneNode component + wire into canvas

**Files:** `src/components/canvas/node-types/SwimlaneNode.tsx` (new), `src/components/canvas/ProcessCanvas.tsx`

- [ ] **Step 1: Create SwimlaneNode.tsx**

```tsx
// src/components/canvas/node-types/SwimlaneNode.tsx
import { NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

const DEFAULT_COLOR = '#dbeafe'

const BORDER_MAP: Record<string, string> = {
  '#dbeafe': '#1d4ed8',   // CS blue
  '#dcfce7': '#15803d',   // Ops green
  '#f3e8ff': '#7e22ce',   // Fraud Ops purple
  '#fef9c3': '#a16207',   // L2-Risk yellow
  '#e5e7eb': '#374151',   // Automation gray
  '#f1f5f9': '#475569',   // Client slate
}

export default function SwimlaneNode({ data, selected }: NodeProps) {
  const bg = (data as any).nodeColor ?? DEFAULT_COLOR
  const border = BORDER_MAP[bg] ?? '#94a3b8'
  const label = (data as any).label ?? 'Lane'

  return (
    <>
      <NodeResizer
        minWidth={120}
        minHeight={60}
        isVisible={selected}
        lineStyle={{ borderColor: border }}
        handleStyle={{ borderColor: border, backgroundColor: 'white' }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bg,
          border: `2px dashed ${border}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          opacity: 0.85,
        }}
      >
        {/* Label tab on left edge */}
        <div
          style={{
            width: 44,
            flexShrink: 0,
            backgroundColor: `${border}22`,
            borderRight: `2px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: border,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ flex: 1 }} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add swimlane to NODE_TYPES in ProcessCanvas.tsx**

```typescript
import SwimlaneNode from './node-types/SwimlaneNode'

// In NODE_TYPES:
const NODE_TYPES = {
  step: StepNode,
  decision: DecisionNode,
  automation: AutomationNode,
  comms: CommsNode,
  start: StartEndNode,
  end: StartEndNode,
  swimlane: SwimlaneNode,   // ADD
  sticky: StickyNode,        // will add in Task 4
}
```

- [ ] **Step 3: Update toRfNodes to set z-index and initial style for swimlane/sticky**

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
    style: n.type === 'swimlane'
      ? { width: n.nodeWidth ?? 400, height: n.nodeHeight ?? 200 }
      : undefined,
    data: {
      label: n.label,
      lane: n.lane,
      timeEstimate: n.timeEstimate,
      type: n.type,
      badge: n.badge,
      durationMinutes: n.durationMinutes,
      attachments: n.attachments,
      nodeColor: n.nodeColor,
    },
  }))
}
```

- [ ] **Step 4: Update fromRfNodes to capture nodeWidth/nodeHeight for swimlane**

```typescript
function fromRfNodes(rfNodes: Node[]): ProcessNode[] {
  return rfNodes
    .filter((n) => !n.id.startsWith('lane-'))
    .map((n) => ({
      id: n.id,
      type: n.type as ProcessNodeType,
      label: (n.data as any).label,
      lane: (n.data as any).lane as SwimLane,
      timeEstimate: (n.data as any).timeEstimate,
      badge: (n.data as any).badge,
      durationMinutes: (n.data as any).durationMinutes,
      attachments: (n.data as any).attachments,
      nodeColor: (n.data as any).nodeColor,
      // Capture NodeResizer dimensions for swimlane nodes
      nodeWidth: n.type === 'swimlane' && n.measured?.width ? Math.round(n.measured.width) : undefined,
      nodeHeight: n.type === 'swimlane' && n.measured?.height ? Math.round(n.measured.height) : undefined,
      position: n.position,
    }))
}
```

- [ ] **Step 5: Skip lane-snap for swimlane nodes in handleDrop**

In `handleDrop`, find where `snappedY` is computed and the new node is constructed. Modify so swimlane/sticky don't snap to lane y-center:

```typescript
function handleDrop(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault()
  if (readOnly || !draggingType) return
  const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })

  // Swimlane and sticky sit at drop position; other nodes snap to lane y-center
  const isAnnotation = draggingType.type === 'swimlane' || draggingType.type === 'sticky'
  const lane = isAnnotation ? draggingType.lane : laneYFromFlowY(flowPos.y, lanes)
  const yPos = isAnnotation ? flowPos.y : laneYCenter(lanes, lane)

  const newNode: Node = {
    id: `n${idCounter.current++}`,
    type: draggingType.type,
    position: { x: Math.max(50, flowPos.x), y: yPos },
    zIndex: draggingType.type === 'sticky' ? 10 : draggingType.type === 'swimlane' ? -1 : 0,
    style: draggingType.type === 'swimlane' ? { width: 400, height: 200 } : undefined,
    data: {
      label: draggingType.type === 'swimlane' ? 'Lane' : draggingType.type === 'sticky' ? 'Note' : draggingType.type.charAt(0).toUpperCase() + draggingType.type.slice(1),
      lane,
      type: draggingType.type,
      showTimes,
      nodeColor: draggingType.type === 'swimlane' ? '#dbeafe' : draggingType.type === 'sticky' ? '#fef9c3' : undefined,
    },
    style: draggingType.type === 'swimlane'
      ? { ...(highlightedNodes.size > 0 ? { opacity: 0.2 } : {}), width: 400, height: 200 }
      : highlightedNodes.size > 0 ? { opacity: 0.2 } : undefined,
  }
  // ... rest of handleDrop unchanged
}
```

Note: There's a duplicate `style` key in the snippet above. Fix it to merge both conditions:
```typescript
style: (() => {
  const base = draggingType.type === 'swimlane' ? { width: 400, height: 200 } : {}
  return { ...base, ...(highlightedNodes.size > 0 ? { opacity: 0.2 } : {}) }
})(),
```

- [ ] **Step 6: Add swimlane to NodePalette.tsx**

In `PALETTE_ITEMS`, add after the `comms` entry (before `end`):
```typescript
import { Layers } from 'lucide-react'

// In PALETTE_ITEMS array:
{ type: 'swimlane', label: 'Lane', defaultLane: 'CS', icon: <Layers className="w-3 h-3" />, colorClass: 'border-blue-300 text-blue-800 bg-blue-50' },
```

Import `Layers` from `lucide-react` alongside the existing imports.

- [ ] **Step 7: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/components/canvas/node-types/SwimlaneNode.tsx src/components/canvas/ProcessCanvas.tsx src/components/canvas/NodePalette.tsx
git commit -m "feat(canvas): add SwimlaneNode with NodeResizer, lane-snap skip for annotations"
```

---

## Task 4 — StickyNode component + wire into canvas

**Files:** `src/components/canvas/node-types/StickyNode.tsx` (new), `src/components/canvas/ProcessCanvas.tsx`, `src/components/canvas/NodePalette.tsx`

- [ ] **Step 1: Create StickyNode.tsx**

```tsx
// src/components/canvas/node-types/StickyNode.tsx
import type { NodeProps } from '@xyflow/react'

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  '#fef9c3': { bg: '#fef9c3', border: '#fde047', text: '#713f12' },   // yellow
  '#fce7f3': { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },   // pink
  '#dcfce7': { bg: '#dcfce7', border: '#86efac', text: '#14532d' },   // green
  '#dbeafe': { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },   // blue
}

const DEFAULT = COLOR_MAP['#fef9c3']

export default function StickyNode({ data }: NodeProps) {
  const key = (data as any).nodeColor ?? '#fef9c3'
  const { bg, border, text } = COLOR_MAP[key] ?? DEFAULT
  const label = (data as any).label ?? ''

  return (
    <div
      style={{
        width: 160,
        minHeight: 100,
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 6,
        padding: '8px 10px',
        fontSize: 11,
        color: text,
        fontWeight: 500,
        boxShadow: '2px 3px 6px rgba(0,0,0,0.12)',
        lineHeight: 1.4,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {label || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
    </div>
  )
}
```

Note: No `<Handle>` components — sticky notes cannot be connected to flow edges.

- [ ] **Step 2: Add sticky to NODE_TYPES in ProcessCanvas.tsx**

```typescript
import StickyNode from './node-types/StickyNode'

const NODE_TYPES = {
  // ... existing ...
  swimlane: SwimlaneNode,
  sticky: StickyNode,   // ADD
}
```

- [ ] **Step 3: Add sticky to NodePalette.tsx**

```typescript
import { StickyNote } from 'lucide-react'  // or use MessageSquare if StickyNote not available

// In PALETTE_ITEMS after swimlane:
{ type: 'sticky', label: 'Sticky', defaultLane: 'CS', icon: <StickyNote className="w-3 h-3" />, colorClass: 'border-yellow-300 text-yellow-800 bg-yellow-50' },
```

If `StickyNote` is not available in the installed lucide-react version, use `StickyNote` or `FileText` or `MessageSquare` — check with:
```bash
grep -r "StickyNote\|Sticky" /Users/johnnguyen/wfo-process-mapper/node_modules/lucide-react/dist/lucide-react.js | head -3
```
Use whichever is available. `MessageSquare` is a safe fallback.

- [ ] **Step 4: TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/node-types/StickyNode.tsx src/components/canvas/ProcessCanvas.tsx src/components/canvas/NodePalette.tsx
git commit -m "feat(canvas): add StickyNode (no connection handles, 4 colour options)"
```

---

## Task 5 — Color picker in NodeEditDialog

**Files:** `src/components/canvas/NodeEditDialog.tsx`, `src/components/canvas/ProcessCanvas.tsx`

- [ ] **Step 1: Add nodeColor state and color picker to NodeEditDialog**

In `NodeEditDialog.tsx`, add:

```typescript
const [nodeColor, setNodeColor] = useState<string>((node.data as any).nodeColor ?? '')

const isSwimlane = node.type === 'swimlane'
const isSticky = node.type === 'sticky'

const SWIMLANE_COLORS = [
  { color: '#dbeafe', label: 'CS' },
  { color: '#dcfce7', label: 'Ops' },
  { color: '#f3e8ff', label: 'Fraud Ops' },
  { color: '#fef9c3', label: 'L2-Risk' },
  { color: '#e5e7eb', label: 'Automation' },
  { color: '#f1f5f9', label: 'Client' },
]

const STICKY_COLORS = [
  { color: '#fef9c3', label: 'Yellow' },
  { color: '#fce7f3', label: 'Pink' },
  { color: '#dcfce7', label: 'Green' },
  { color: '#dbeafe', label: 'Blue' },
]
```

In the form JSX, add a color picker section when `isSwimlane || isSticky`:

```tsx
{(isSwimlane || isSticky) && (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground">
      {isSwimlane ? 'Lane colour' : 'Note colour'}
    </label>
    <div className="flex gap-2 flex-wrap">
      {(isSwimlane ? SWIMLANE_COLORS : STICKY_COLORS).map(({ color, label: colorLabel }) => (
        <button
          key={color}
          type="button"
          onClick={() => setNodeColor(color)}
          title={colorLabel}
          className="w-6 h-6 rounded-full border-2 transition-all"
          style={{
            backgroundColor: color,
            borderColor: nodeColor === color ? '#374151' : '#e2e8f0',
            transform: nodeColor === color ? 'scale(1.2)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Update onSave prop type and call to include nodeColor**

Update the `onSave` prop signature to add `nodeColor?: string` as the 9th param:

```typescript
onSave: (
  id: string,
  label: string,
  timeEstimate: string,
  lane: SwimLane,
  badge?: ProcessNode['badge'],
  durationMinutes?: number,
  attachments?: KbLink[],
  nodeColor?: string
) => void
```

Update the Save button onClick to pass `nodeColor`:
```typescript
onClick={() => onSave(
  node.id, label, timeEstimate, lane,
  { status: badgeStatus || undefined, priority: badgePriority || undefined },
  durationMinutes !== '' ? Number(durationMinutes) : undefined,
  attachments.length > 0 ? attachments : undefined,
  nodeColor || undefined
)}
```

- [ ] **Step 3: Update handleEditSave in ProcessCanvas.tsx**

Add `nodeColor?: string` as 8th param to `handleEditSave` and persist it in node data:

```typescript
function handleEditSave(
  id: string,
  label: string,
  timeEstimate: string,
  lane: SwimLane,
  badge?: ProcessNode['badge'],
  durationMinutes?: number,
  attachments?: KbLink[],
  nodeColor?: string
) {
  setRfNodes((prev) => {
    const updated = prev.map((n) =>
      n.id === id
        ? { ...n, data: { ...n.data, label, timeEstimate: timeEstimate || undefined, lane, badge, durationMinutes, attachments, nodeColor } }
        : n
    )
    commit(updated, rfEdges)
    return updated
  })
  setEditingNode(null)
}
```

Also update the `<NodeEditDialog onSave={...}>` JSX to forward the 8th param:
```tsx
<NodeEditDialog
  node={editingNode}
  onSave={(id, label, time, lane, badge, durationMinutes, attachments, nodeColor) =>
    handleEditSave(id, label, time, lane, badge, durationMinutes, attachments, nodeColor)
  }
  onDelete={() => { handleNodeDelete(editingNode.id); setEditingNode(null) }}
  onClose={() => setEditingNode(null)}
/>
```

- [ ] **Step 4: TypeScript check + full test run**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit && pnpm test
```

Expected: no TS errors, 9/9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/NodeEditDialog.tsx src/components/canvas/ProcessCanvas.tsx
git commit -m "feat(canvas): add colour picker for swimlane/sticky nodes in NodeEditDialog"
```

---

## Verification

- [ ] `pnpm tsc --noEmit` — clean
- [ ] `pnpm test` — 9/9 pass
- [ ] `pnpm build` — no errors
- [ ] Drag "Lane" from palette → blue band appears, resize handles visible when selected, double-click → can rename + change color
- [ ] Drag "Sticky" from palette → yellow note appears, double-click → can edit text + pick color
- [ ] Toolbar legend chips always visible with lane + node type chips
- [ ] No floating Legend button or overlay
- [ ] `magic put` deploy and verify on https://magic.w10e.com/johnnguyen/wfo-process-mapper

---

## Self-Review

**Spec coverage:**
- ✅ Feature B: inline legend chips + remove floating overlay
- ✅ Feature C: SwimlaneNode, NodeResizer, 6 lane colors, label tab, z-index -1, no lane snap
- ✅ Feature D: StickyNode, 4 colors, no connection handles, z-index 10, no lane snap
- ✅ Color picker in NodeEditDialog for both types
- ✅ nodeColor serialized in YAML (toYaml/fromYaml)
- ✅ nodeWidth/nodeHeight stored via fromRfNodes measured dimensions

**Gaps / notes:**
- StickyNote lucide icon availability uncertain — Task 4 Step 3 includes a verification command with a fallback.
- `n.measured` in fromRfNodes: ReactFlow v12 populates `node.measured` after layout. If it's undefined on first render, nodeWidth/nodeHeight will be undefined → next render uses stored ProcessNode dimensions correctly.
