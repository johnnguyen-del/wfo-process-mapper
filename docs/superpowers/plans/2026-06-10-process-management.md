# Process Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add duplicate process and export-as-PNG to the WFO Process Mapper.

**Architecture:** Duplicate is a pure data operation in `ProcessList.tsx` — deep-clone + new ID + reset metadata. PNG export uses `html2canvas` on the `.react-flow` DOM element; a button is added to the canvas toolbar in `CanvasInner`.

**Tech Stack:** React 19, TypeScript 5, html2canvas (new dependency)

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `main`

---

## File Map

**Modified:**
- `src/pages/ProcessList.tsx` — add Duplicate button to EntryRow
- `src/components/canvas/ProcessCanvas.tsx` — add Export PNG button + handler
- `package.json` — add html2canvas

---

## Task 1 — Duplicate process

**Files:** `src/pages/ProcessList.tsx`

- [ ] **Step 1: Import Copy icon**

Add `Copy` to the existing lucide-react import:
```typescript
import { ExternalLink, Edit, Trash2, RefreshCw, BarChart2, Search, Copy } from 'lucide-react'
```

- [ ] **Step 2: Add handleDuplicate to ProcessList component**

After `handleReorderFolders`, add:
```typescript
function handleDuplicate(entry: ProcessEntry) {
  const duplicate: ProcessEntry = {
    ...structuredClone(entry),
    id: generateId(),
    processName: `Copy of ${entry.processName || 'Untitled'}`,
    status: 'draft',
    submittedAt: '',
    submittedBy: '',
    notionPageUrl: null,
    author: undefined,
    collaborators: undefined,
    editLog: undefined,
    deletedAt: undefined,
  }
  saveEntry(duplicate)
  setEntries(prev => [duplicate, ...prev])
}
```

- [ ] **Step 3: Add onDuplicate prop to EntryRow and pass handler**

Update the `EntryRow` props interface to add `onDuplicate`:
```typescript
function EntryRow({
  entry,
  owner,
  currentUserEmail,
  isTrash = false,
  onDelete,
  onRestore,
  onDuplicate,
  onDragStart,
}: {
  ...
  onDuplicate?: (e: ProcessEntry) => void
  ...
})
```

Pass it in all three `<EntryRow>` usages (domainEntries loop, undomained loop):
```tsx
<EntryRow
  key={entry.id}
  entry={entry}
  owner={owner}
  currentUserEmail={currentUserEmail}
  onDelete={handleDelete}
  onDuplicate={handleDuplicate}
  onDragStart={...}
/>
```

- [ ] **Step 4: Add Duplicate button to EntryRow JSX**

In the EntryRow actions div (after the Edit button, before the Trash button), add:
```tsx
{!isTrash && onDuplicate && (
  <Button
    variant="ghost"
    size="sm"
    className="h-7 px-2 text-muted-foreground hover:text-foreground"
    onClick={() => onDuplicate(entry)}
    title="Duplicate process"
  >
    <Copy className="w-3.5 h-3.5" />
  </Button>
)}
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProcessList.tsx
git commit -m "feat(list): add duplicate process button"
```

---

## Task 2 — Export as PNG

**Files:** `src/components/canvas/ProcessCanvas.tsx`, `package.json`

- [ ] **Step 1: Install html2canvas**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm add html2canvas
```

Also add the type declaration:
```bash
pnpm add -D @types/html2canvas
```

- [ ] **Step 2: Add import to ProcessCanvas.tsx**

```typescript
import html2canvas from 'html2canvas'
```

- [ ] **Step 3: Add export handler to CanvasInner**

In CanvasInner, add after `handleFullscreen`:
```typescript
async function handleExportPng() {
  const container = canvasContainerRef.current
  if (!container) return
  const reactFlowEl = container.querySelector('.react-flow') as HTMLElement | null
  if (!reactFlowEl) return

  try {
    const canvas = await html2canvas(reactFlowEl, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    })
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(document.title || 'process-map')}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  } catch (err) {
    console.error('Export failed:', err)
  }
}
```

- [ ] **Step 4: Add Export PNG button to toolbar**

In the toolbar action buttons (after the Fullscreen button), add:
```tsx
{!readOnly && rfNodes.length > 0 && (
  <button
    onClick={handleExportPng}
    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors bg-background text-muted-foreground border-border hover:border-foreground/40"
    title="Export canvas as PNG"
  >
    <Download className="w-3 h-3" />
    PNG
  </button>
)}
```

Import `Download` from `lucide-react` (add to existing import).

- [ ] **Step 5: TypeScript check + tests**

```bash
pnpm tsc --noEmit && pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx package.json pnpm-lock.yaml
git commit -m "feat(canvas): add Export as PNG button using html2canvas"
```

---

## Verification

- [ ] Process list shows Copy icon on each card — clicking creates "Copy of [name]" at top of list, status = Draft, no author/log
- [ ] Duplicate of a submitted process is a draft (not submitted)
- [ ] Canvas has "PNG" button in toolbar when nodes exist — clicking downloads `[name].png` at 2× resolution
- [ ] PNG button hidden on empty canvas and in readOnly (compare) mode
- [ ] `pnpm test` — 9/9 pass
