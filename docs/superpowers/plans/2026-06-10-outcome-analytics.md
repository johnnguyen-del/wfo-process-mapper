# Outcome Analytics Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat process metrics table with an accordion page that shows every outcome path per process as a color-coded, horizontally-scrollable linear flow — and lets users click directly into any path on the canvas with it pre-highlighted.

**Architecture:** Three self-contained tasks. (1) Extract shared DFS path utilities. (2) Rewrite ProcessAnalytics as an accordion with per-outcome linear flow cards. (3) Add `?path=` URL param support to ProcessBuilder so "View path in canvas" instantly highlights the chosen path on load.

**Tech Stack:** React 19, TypeScript 5, React Router v7 (`useSearchParams`), Tailwind CSS 4, existing `LANE_COLORS`/`LANE_LABEL_COLORS` exports from ProcessCanvas

**Repo:** `/Users/johnnguyen/wfo-process-mapper`, branch `main`

---

## File Map

**Create:**
- `src/lib/outcomeUtils.ts` — `findPaths()`, `pathDuration()`, `pathWorkSteps()` shared utilities

**Modify:**
- `src/components/canvas/OutcomePanel.tsx` — import from outcomeUtils instead of local copy
- `src/components/canvas/MetricsDashboard.tsx` — import from outcomeUtils instead of local copy
- `src/pages/ProcessAnalytics.tsx` — full rewrite: accordion layout, outcome cards, linear flow
- `src/components/canvas/ProcessCanvas.tsx` — add `initialHighlight?: Set<string>` prop
- `src/pages/ProcessBuilder.tsx` — read `?path=` URL param, pass as `initialHighlight`

---

## Task 1 — Extract shared outcome utilities

**Files:**
- Create: `src/lib/outcomeUtils.ts`
- Modify: `src/components/canvas/OutcomePanel.tsx`
- Modify: `src/components/canvas/MetricsDashboard.tsx`

- [ ] **Step 1: Create src/lib/outcomeUtils.ts**

```typescript
import type { ProcessMap, ProcessNode } from './types'

/**
 * DFS — finds all paths from start nodes to end nodes in a process map.
 * Returns an array of node-ID arrays. Capped at 50 paths.
 */
export function findPaths(map: ProcessMap): string[][] {
  const adj = new Map<string, string[]>()
  map.edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  })
  const startIds = map.nodes.filter(n => n.type === 'start').map(n => n.id)
  const endSet = new Set(map.nodes.filter(n => n.type === 'end').map(n => n.id))
  const paths: string[][] = []

  function dfs(nodeId: string, path: string[], visited: Set<string>) {
    if (visited.has(nodeId)) return
    if (paths.length >= 50) return
    if (endSet.has(nodeId)) { paths.push([...path, nodeId]); return }
    visited.add(nodeId)
    for (const next of adj.get(nodeId) ?? []) {
      dfs(next, [...path, nodeId], new Set(visited))
    }
  }

  startIds.forEach(s => dfs(s, [], new Set()))
  return paths
}

/** Sum of durationMinutes for all nodes in the path. */
export function pathDuration(path: string[], nodeMap: Map<string, ProcessNode>): number {
  return path.reduce((sum, id) => sum + (nodeMap.get(id)?.durationMinutes ?? 0), 0)
}

/** Step count excluding start and end nodes. */
export function pathWorkSteps(path: string[]): number {
  return Math.max(0, path.length - 2)
}
```

- [ ] **Step 2: Update OutcomePanel.tsx to import from outcomeUtils**

In `src/components/canvas/OutcomePanel.tsx`, remove the local `findPaths` function and import from the shared util:

```typescript
// Replace the local findPaths function with this import:
import { findPaths, pathDuration, pathWorkSteps } from '@/lib/outcomeUtils'
```

Remove the local `pathDuration` helper function too (it's now in the util). Update the `pathDuration` call in the component to pass `nodeMap` as second argument:
```typescript
const dur = pathDuration(path, nodeMap)
const workSteps = pathWorkSteps(path)
```

- [ ] **Step 3: Update MetricsDashboard.tsx to import from outcomeUtils**

In `src/components/canvas/MetricsDashboard.tsx`, remove the local `findPaths` function copy and import from the shared util. Update `pathDuration` call to pass `nodeMap`.

- [ ] **Step 4: TypeScript check + tests**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit && pnpm test
```

Expected: 0 errors, 9/9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/outcomeUtils.ts src/components/canvas/OutcomePanel.tsx src/components/canvas/MetricsDashboard.tsx
git commit -m "refactor(canvas): extract findPaths/pathDuration/pathWorkSteps to shared outcomeUtils"
```

---

## Task 2 — Rewrite ProcessAnalytics with accordion + linear flow

**Files:**
- Modify: `src/pages/ProcessAnalytics.tsx` (full rewrite)

Read the current file first to preserve the existing filter logic (domain, folder, search — added in the bug fix batch). Keep those imports and state, replace the rendering section.

- [ ] **Step 1: Replace ProcessAnalytics.tsx with the new implementation**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listEntries, loadFolders } from '@/lib/storage'
import type { ProcessEntry, FolderEntry, SwimLane } from '@/lib/types'
import { findPaths, pathDuration, pathWorkSteps } from '@/lib/outcomeUtils'
import { LANE_COLORS, LANE_LABEL_COLORS } from '@/components/canvas/ProcessCanvas'

const DOMAINS = ['Banking', 'Transfers', 'Invest', 'Security & Risk', 'PRR'] as const

// Determine outcome header color from the end node's label
function outcomeVariant(endLabel: string): 'green' | 'red' | 'amber' | 'neutral' {
  const l = endLabel.toLowerCase()
  if (/resolv|complet|success|done|approv|pass|legitimate/.test(l)) return 'green'
  if (/escalat|fail|block|deny|declin|fraud|unable|reject/.test(l)) return 'red'
  if (/pend|hold|wait|review|triage/.test(l)) return 'amber'
  return 'neutral'
}

const VARIANT_STYLES = {
  green: { header: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', text: 'text-green-700', end: 'border-green-400' },
  red: { header: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', text: 'text-red-700', end: 'border-red-400' },
  amber: { header: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', text: 'text-amber-700', end: 'border-amber-400' },
  neutral: { header: 'bg-muted/30 border-border', badge: 'bg-muted text-muted-foreground', text: 'text-foreground', end: 'border-border' },
}

const VARIANT_ICON = { green: '✓', red: '✗', amber: '⚠', neutral: '○' }

export default function ProcessAnalytics() {
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterFolderId, setFilterFolderId] = useState('')
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFolders().then(setFolders).catch(() => {})
    listEntries().then(all => {
      setEntries(all.filter(e => !e.deletedAt))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (filterDomain && e.domain !== filterDomain) return false
      if (filterFolderId && e.folderId !== filterFolderId) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return (e.processName?.toLowerCase().includes(q) || (e.domain ?? '').toLowerCase().includes(q))
      }
      return true
    })
  }, [entries, filterDomain, filterFolderId, query])

  // Group by domain
  const grouped = useMemo(() => {
    const map = new Map<string, ProcessEntry[]>()
    DOMAINS.forEach(d => map.set(d, []))
    map.set('__other__', [])
    filtered.forEach(e => {
      const key = DOMAINS.includes(e.domain as any) ? e.domain : '__other__'
      map.get(key)!.push(e)
    })
    return map
  }, [filtered])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">← Back</Link>
        </Button>
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Process Analytics</h1>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search processes…"
              className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs bg-background">
            <option value="">All Domains</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {folders.length > 0 && (
            <select value={filterFolderId} onChange={e => setFilterFolderId(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs bg-background">
              <option value="">All Folders</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} process{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {loading && <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No processes found. <Link to="/new" className="underline">Create one</Link>.
          </p>
        )}

        {/* Domain groups */}
        {[...grouped.entries()].map(([domain, domainEntries]) => {
          if (domainEntries.length === 0) return null
          const label = domain === '__other__' ? 'Other' : domain
          return (
            <div key={domain} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {label} · {domainEntries.length} process{domainEntries.length !== 1 ? 'es' : ''}
              </h2>
              <div className="space-y-3">
                {domainEntries.map(entry => (
                  <ProcessCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedIds.has(entry.id)}
                    onToggle={() => toggleExpanded(entry.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ProcessCard ─────────────────────────────────────────────────────────────

function ProcessCard({ entry, expanded, onToggle }: {
  entry: ProcessEntry
  expanded: boolean
  onToggle: () => void
}) {
  const processMap = entry.processMap ?? { nodes: [], edges: [] }
  const paths = useMemo(() => findPaths(processMap), [processMap])
  const nodeMap = useMemo(() => new Map(processMap.nodes.map(n => [n.id, n])), [processMap])

  // Aggregate stats
  const steps = paths.map(p => pathWorkSteps(p))
  const durations = paths.map(p => pathDuration(p, nodeMap))
  const teamCounts = paths.map(p => new Set(p.map(id => nodeMap.get(id)?.lane).filter(Boolean)).size)

  const minSteps = steps.length ? Math.min(...steps) : 0
  const maxSteps = steps.length ? Math.max(...steps) : 0
  const minDur = durations.length ? Math.min(...durations) : 0
  const maxDur = durations.length ? Math.max(...durations) : 0
  const maxTeams = teamCounts.length ? Math.max(...teamCounts) : 0

  const stepsLabel = minSteps === maxSteps ? `${minSteps}` : `${minSteps}–${maxSteps}`
  const durLabel = minDur === maxDur ? (minDur > 0 ? `${minDur} min` : '—') : `${minDur}–${maxDur} min`

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-colors',
      expanded ? 'border-blue-300' : 'border-border'
    )}>
      {/* Card header — click to toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
          expanded ? 'bg-blue-50' : 'bg-background hover:bg-muted/30'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{entry.processName || 'Untitled'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {entry.domain}{entry.teamOwner?.length ? ` · ${entry.teamOwner.join(', ')}` : ''}
          </div>
        </div>
        {/* Summary pills */}
        <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0">
          {paths.length} outcome{paths.length !== 1 ? 's' : ''}
        </span>
        {steps.length > 0 && (
          <span className="bg-muted text-muted-foreground text-[10px] rounded-full px-2 py-0.5 shrink-0 hidden sm:block">
            {stepsLabel} steps
          </span>
        )}
        {minDur > 0 && (
          <span className="bg-muted text-muted-foreground text-[10px] rounded-full px-2 py-0.5 shrink-0 hidden sm:block">
            {durLabel}
          </span>
        )}
        <Link
          to={`/edit/${entry.id}`}
          onClick={e => e.stopPropagation()}
          className="text-[10px] text-indigo-600 hover:underline shrink-0 hidden sm:block"
        >
          Open canvas ↗
        </Link>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* Expanded: aggregate stats + outcome cards */}
      {expanded && (
        <div className="border-t border-blue-200 bg-white">
          {/* Aggregate stat tiles */}
          {paths.length > 0 && (
            <div className="grid grid-cols-4 gap-px border-b border-border bg-border">
              {[
                { label: 'Outcomes', value: paths.length },
                { label: 'Steps range', value: stepsLabel },
                { label: 'Time range', value: durLabel },
                { label: 'Max teams', value: maxTeams || '—' },
              ].map(s => (
                <div key={s.label} className="bg-muted/20 px-4 py-2 text-center">
                  <div className="text-base font-bold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {paths.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-4">
              No complete paths found — add Start and End nodes connected by edges.
            </p>
          )}

          {/* Outcome cards */}
          {paths.map((path, i) => (
            <OutcomeCard
              key={path.join('-')}
              path={path}
              index={i}
              nodeMap={nodeMap}
              processId={entry.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── OutcomeCard ─────────────────────────────────────────────────────────────

function OutcomeCard({ path, index, nodeMap, processId }: {
  path: string[]
  index: number
  nodeMap: Map<string, ReturnType<typeof nodeMap.get> extends infer T ? NonNullable<T> : never>
  processId: string
}) {
  const endNode = nodeMap.get(path[path.length - 1])
  const endLabel = endNode?.label ?? 'End'
  const variant = outcomeVariant(endLabel)
  const styles = VARIANT_STYLES[variant]
  const dur = pathDuration(path, nodeMap as any)
  const workSteps = pathWorkSteps(path)

  // Team counts per lane along this path
  const laneCounts = new Map<string, number>()
  path.forEach(id => {
    const lane = (nodeMap.get(id) as any)?.lane
    if (lane) laneCounts.set(lane, (laneCounts.get(lane) ?? 0) + 1)
  })

  // "View path in canvas" URL
  const pathParam = path.join(',')
  const canvasUrl = `#/edit/${processId}?path=${encodeURIComponent(pathParam)}`

  return (
    <div className={cn('border-b last:border-0', styles.header.split(' ')[0])}>
      {/* Outcome header */}
      <div className={cn('px-4 py-2 flex items-center gap-2 border-b', styles.header)}>
        <span className={cn('text-xs font-bold', styles.text)}>
          {VARIANT_ICON[variant]} Outcome {index + 1}: {endLabel}
        </span>
        <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', styles.badge)}>
          {workSteps} step{workSteps !== 1 ? 's' : ''}
        </span>
        {dur > 0 && (
          <span className={cn('text-[10px] rounded-full px-2 py-0.5', styles.badge)}>
            {dur} min
          </span>
        )}
        <div className="flex-1" />
        <a href={canvasUrl} className="text-[10px] text-blue-600 hover:underline shrink-0">
          View path in canvas →
        </a>
      </div>

      {/* Linear flow — horizontally scrollable */}
      <div className="px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
        <div className="flex items-center gap-1.5 min-w-max">
          {path.map((nodeId, ni) => {
            const node = nodeMap.get(nodeId) as any
            const label = node?.label ?? nodeId
            const lane = node?.lane as SwimLane | undefined
            const isStart = node?.type === 'start'
            const isEnd = node?.type === 'end'
            const bgColor = lane ? LANE_COLORS[lane] : '#f1f5f9'
            const borderColor = lane ? LANE_LABEL_COLORS[lane] : '#94a3b8'

            return (
              <div key={nodeId} className="flex items-center gap-1.5">
                {ni > 0 && (
                  <span className="text-slate-300 font-bold text-sm select-none">→</span>
                )}
                <span
                  className="text-[10px] font-medium px-2.5 py-1 whitespace-nowrap"
                  style={{
                    backgroundColor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: (isStart || isEnd) ? '999px' : '4px',
                    color: borderColor,
                  }}
                >
                  {isStart ? '● ' : isEnd ? '' : ''}{label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team chips */}
      {laneCounts.size > 0 && (
        <div className="px-4 pb-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Teams:</span>
          {[...laneCounts.entries()].map(([lane, count]) => (
            <span
              key={lane}
              className="text-[10px] font-semibold rounded px-1.5 py-0.5"
              style={{
                backgroundColor: LANE_COLORS[lane as SwimLane] ?? '#f1f5f9',
                color: LANE_LABEL_COLORS[lane as SwimLane] ?? '#374151',
              }}
            >
              {lane} ×{count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

Note: The `OutcomeCard`'s `nodeMap` prop type uses a workaround — simplify to `Map<string, any>` if TypeScript complains about the inferred type.

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit
```

Fix any type errors (most likely the `nodeMap` type in `OutcomeCard` — change to `Map<string, any>`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProcessAnalytics.tsx
git commit -m "feat(analytics): rewrite as accordion with per-outcome linear flow and team chips"
```

---

## Task 3 — URL-based instant path highlight

**Files:**
- Modify: `src/components/canvas/ProcessCanvas.tsx` — add `initialHighlight` prop
- Modify: `src/pages/ProcessBuilder.tsx` — read `?path=` URL param, pass as `initialHighlight`

- [ ] **Step 1: Add initialHighlight prop to ProcessCanvas**

In `src/components/canvas/ProcessCanvas.tsx`:

Add `initialHighlight?: Set<string>` to both `CanvasInnerProps` and `ProcessCanvasProps`:
```typescript
// In CanvasInnerProps and ProcessCanvasProps — add:
initialHighlight?: Set<string>
```

In `CanvasInner`, change the `highlightedNodes` initial state from empty set to the prop value:
```typescript
// Change:
const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
// To:
const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
  () => initialHighlight && initialHighlight.size > 0 ? new Set(initialHighlight) : new Set()
)
```

The existing `useEffect([highlightedNodes, isolateMode])` will automatically apply the dimming effect when the canvas mounts with a non-empty `highlightedNodes`. No additional code needed.

Thread the prop through `ProcessCanvas` to `CanvasInner` in the JSX:
```tsx
<CanvasInner
  key={canvasKey}
  ...
  initialHighlight={initialHighlight}
/>
```

- [ ] **Step 2: Read ?path= param in ProcessBuilder and pass initialHighlight**

In `src/pages/ProcessBuilder.tsx`:

Add `useSearchParams` to the react-router-dom import:
```typescript
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
```

Add inside the component (after existing state declarations):
```typescript
const [searchParams] = useSearchParams()

// Compute initialHighlight from URL — memoized so it only runs once on mount
const initialHighlight = useMemo(() => {
  const pathParam = searchParams.get('path')
  if (!pathParam) return undefined
  const ids = pathParam.split(',').filter(Boolean)
  return ids.length > 0 ? new Set(ids) : undefined
}, []) // intentionally empty deps — only read on mount
```

Add `useMemo` to the imports from react:
```typescript
import { useEffect, useMemo, useRef, useState } from 'react'
```

Pass `initialHighlight` to the `'current'` mode `ProcessCanvas`:
```tsx
{viewMode === 'current' && (
  <ProcessCanvas
    ...
    initialHighlight={initialHighlight}
  />
)}
```

- [ ] **Step 3: TypeScript check + tests**

```bash
cd /Users/johnnguyen/wfo-process-mapper && pnpm tsc --noEmit && pnpm test
```

Expected: 0 errors, 9/9 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/ProcessCanvas.tsx src/pages/ProcessBuilder.tsx
git commit -m "feat(canvas): support ?path= URL param to pre-highlight an outcome path on canvas load"
```

---

## Final Verification

- [ ] `pnpm tsc --noEmit` — clean
- [ ] `pnpm test` — 9/9 pass
- [ ] `pnpm build` — no errors
- [ ] Open Analytics page → see processes grouped by domain as cards
- [ ] Click a process → outcomes expand below with linear flow
- [ ] Long path (8+ steps) shows a scrollable bar with the horizontal flow
- [ ] Click "View path in canvas →" → canvas opens, that path is highlighted, other nodes dimmed
- [ ] "Open canvas ↗" link navigates to the process without any highlight
- [ ] Short paths (3-4 nodes) fit entirely without needing to scroll
- [ ] Deploy: `magic put`

---

## Self-Review

**Spec coverage:**
- ✅ Single-column accordion — process card → expand below
- ✅ Aggregate stats row (outcomes, steps range, duration range, max teams)
- ✅ Per-outcome: color-coded header (green/red/amber), step count, duration, "View path" link
- ✅ Horizontal scroll with visible thin scrollbar, `min-width: max-content` keeps single line
- ✅ Lane-colored node chips (uses exported LANE_COLORS/LANE_LABEL_COLORS)
- ✅ Team chips row with per-lane step count
- ✅ "View path in canvas →" passes `?path=n1,n2,n3` in URL
- ✅ ProcessBuilder reads `?path=`, passes as `initialHighlight` to ProcessCanvas
- ✅ Existing domain/folder/search filters preserved

**No placeholders found.**

**Type note:** `nodeMap` in `OutcomeCard` — if TypeScript infers a complex type, simplify the prop type to `Map<string, any>` and cast inside the component. This is an acceptable tradeoff to avoid overly complex generic typing for a render-only component.
