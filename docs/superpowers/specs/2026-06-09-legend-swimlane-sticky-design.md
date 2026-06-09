# Legend Inline + Swimlane Node + Sticky Note Design

## Feature B — Legend as Inline Toolbar Chips

### What changes
Replace the floating `CanvasLegend` overlay (and its toggle button) with permanent inline chips in the canvas toolbar row. No extra height, always visible.

### Layout
Left half of the toolbar row: lane chips + separator + node type chips.
Right half: existing action buttons (Show times, L→R, Curved/Straight, Metrics, Outcomes, Fullscreen).

```
[CS] [Ops] [Fraud Ops] [L2-Risk] [Auto] [Client]  |  [●Start/End] [●Step] [◆Decision] [●Auto] [●Comms]   ···   [⏱ Show times] [L→R] [Curved] [Metrics] [Outcomes] [⛶]
```

### Lane chips
Each chip: colored square swatch (8×8px) + lane name abbreviation. Color matches `LANE_COLORS` / `LANE_LABEL_COLORS`. Font: `text-[10px] font-semibold`. Only show populated lanes (same `populatedLanes` set already computed in `CanvasInner`).

### Node type chips
Static, always shown (regardless of which types exist on canvas): Start/End (orange `#f97316`), Step (blue `#3b82f6`), Decision (purple `#a855f7` rotated square), Automation (green `#10b981`), Comms (amber `#f59e0b`).

### Removals
- Delete `src/components/canvas/CanvasLegend.tsx`
- Remove `showLegend` state, Legend button, and `<CanvasLegend>` render from `ProcessCanvas.tsx`

### Files changed
- `src/components/canvas/ProcessCanvas.tsx` — replace Legend button + overlay with inline chips
- `src/components/canvas/CanvasLegend.tsx` — delete

---

## Feature C — Swimlane Node (Decorative Background Band)

### New type
Add `'swimlane'` to `ProcessNodeType` union in `src/lib/types.ts`.
Add `stickyColor?: string` placeholder as well (used by Feature D below).

### New fields on ProcessNode
```typescript
nodeColor?: string  // hex color string; used by swimlane (lane bg color) and sticky (note color)
```
`nodeColor` is the single new field. Swimlane uses it for background; sticky uses it for note color.

### New file: src/components/canvas/node-types/SwimlaneNode.tsx
- Renders a colored rectangle with a label tab on the left edge
- Uses `@xyflow/react`'s `NodeResizer` for drag-to-resize (width + height)
- Background color: `nodeColor` or `#dbeafe` (CS blue default)
- Label tab: darker shade of the background, 44px wide, label text rotated or horizontal
- `zIndex: -1` so it sits behind all other nodes
- `isConnectable={false}` — no edge handles
- Double-click opens `NodeEditDialog` for label + color change

### Color picker in NodeEditDialog
When `node.type === 'swimlane'` or `node.type === 'sticky'`, show a color swatch picker instead of the lane selector. For swimlane: 6 options (one per lane color). For sticky: 4 options (yellow/pink/green/blue).

### Node palette
Add a "Lane" entry to `NodePalette.tsx` that drags out a swimlane node. Default size: 400×200px.

### Z-index
In `ProcessCanvas.tsx`, nodes of type `swimlane` are passed with `zIndex={-1}` (or style `{zIndex: -1}`) via `toRfNodes`. All other nodes keep default z-index.

### Files changed
- `src/lib/types.ts` — add `'swimlane'` | `'sticky'` to ProcessNodeType; add `nodeColor?: string` to ProcessNode
- `src/lib/export.ts` — serialize `node_color` in `toYaml` / `fromYaml`
- `src/components/canvas/node-types/SwimlaneNode.tsx` — new
- `src/components/canvas/ProcessCanvas.tsx` — add `swimlane` to NODE_TYPES; zIndex in toRfNodes; pass nodeColor through data
- `src/components/canvas/NodePalette.tsx` — add swimlane entry
- `src/components/canvas/NodeEditDialog.tsx` — add color picker for swimlane/sticky types

---

## Feature D — Sticky Note Node (4 Colours)

### New type
`'sticky'` added to `ProcessNodeType` (done alongside swimlane above).

### New file: src/components/canvas/node-types/StickyNode.tsx
- Renders a colored post-it rectangle (160×120px default)
- No `NodeResizer` (fixed size for v1)
- `isConnectable={false}` — no source/target handles rendered
- `zIndex: 10` — floats above swimlanes and process nodes
- Background from `nodeColor` mapping:
  - `yellow`: `#fef9c3` border `#fde047`
  - `pink`: `#fce7f3` border `#f9a8d4`
  - `green`: `#dcfce7` border `#86efac`
  - `blue`: `#dbeafe` border `#93c5fd`
- Label renders as the note text (multiline, wraps)
- No lane badge, no team badge

### Color picker in NodeEditDialog
When `node.type === 'sticky'`: show 4 color swatches (yellow/pink/green/blue). Selecting one updates `nodeColor`. Label field still shown for the note text.

### Node palette
Add a "Sticky" entry to `NodePalette.tsx`.

### Files changed
- `src/components/canvas/node-types/StickyNode.tsx` — new
- `src/components/canvas/ProcessCanvas.tsx` — add `sticky` to NODE_TYPES; zIndex in toRfNodes
- `src/components/canvas/NodePalette.tsx` — add sticky entry

---

## Out of scope (v1)
- Swimlane auto-capture of child nodes
- Sticky note resize
- Sticky note connection handles
- Swimlane stacking/ordering controls
- Exporting swimlane/sticky to Notion (they're canvas-only annotations)
