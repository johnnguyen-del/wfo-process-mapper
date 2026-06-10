# Outcome Analytics Page — Design Spec

## What This Replaces

The current `ProcessAnalytics` page shows a flat sortable table of processes with aggregate metrics (total touchpoints, transitions, duration). This gives no insight into *how* a process flows or *why* some outcomes are slower than others.

## New Design: Accordion Process Cards with Outcome Breakdown

### Page Layout

Single-column page. Existing domain filter, folder filter, and search bar stay at the top (already implemented in the bug fix batch). Below the filters: process cards grouped by domain.

### Process Card (collapsed)

Each process is a card with:
- Process name (bold)
- Domain · team owners (muted)
- Summary pills: `N outcomes` · `X–Y steps` · `X–Y min`
- "Open canvas ↗" link (navigates to edit view)
- Expand chevron `▼`

Click anywhere on the card header to expand/collapse.

### Process Card (expanded — outcome breakdown)

When expanded, outcomes render directly below the card header — no separate panel, no navigation. The card border highlights (blue) when expanded.

**Aggregate stats row** (4 stat tiles):
- Outcomes count
- Steps range (min–max across all outcomes)
- Duration range in minutes (min–max)
- Max teams in any single outcome

**One outcome section per path** (from `findPaths()` DFS, same as OutcomePanel):

Each outcome section has:

1. **Header row**: outcome number + end-node label, step count badge, duration badge, "Teams: X, Y, Z" summary, "View path in canvas →" link
   - Header background color-coded by outcome type (green for resolved/success, red for escalated/failure, amber for pending/hold, neutral for unknown)

2. **Linear flow row** — horizontal scroll container with visible scrollbar:
   - `overflow-x: auto` with `scrollbar-width: thin` (styled, always visible when overflow exists)
   - Nodes rendered as chips: `● Start (pill shape)` → `Step label (rounded rect)` → ... → `● End (pill shape)`
   - Each chip colored by its `lane` using `LANE_COLORS`/`LANE_LABEL_COLORS` from `ProcessCanvas.tsx` (already exported)
   - `white-space: nowrap` on each chip, `min-width: max-content` on the flex container — enforces single line
   - Arrows (`→`) between chips, muted gray
   - If path > 8 visible chips at default width, horizontal scrollbar appears naturally

3. **Team chips row**: "Teams touched:" then one badge per lane that appears in the path, showing `LaneName ×N` (count of steps in that lane), color-coded

### "View path in canvas" — Instant Highlight

Clicking the link navigates to `#/edit/:processId?path=n1,n2,n3,...` where the path query param is the comma-joined node IDs for that outcome path.

In `ProcessBuilder.tsx`, on mount: read `?path=` from the URL search params. If present, after the process loads, call `setHighlightedNodes(new Set(pathIds))` — this immediately dims non-path nodes and highlights the path, exactly as clicking in OutcomePanel does.

The canvas opens in 'current' viewMode. No extra interaction needed.

### Cross-Process Comparison (secondary)

A "⚖ Compare with another process" button at the bottom of each expanded card. When clicked:
- Opens a compact inline comparison panel
- User selects a second process from a dropdown
- Shows a two-column outcome matrix: left = this process outcomes, right = selected process outcomes, with best/worst/avg stats

This is a stretch goal — implement only after the core layout is done.

## Files Changed

| File | Change |
|---|---|
| `src/pages/ProcessAnalytics.tsx` | Full rewrite — accordion layout, outcome cards, linear flow rendering |
| `src/pages/ProcessBuilder.tsx` | Read `?path=` URL param on mount; call `setHighlightedNodes` after entry loads |
| `src/lib/outcomeUtils.ts` (new) | Extract `findPaths()` and `pathDuration()` as shared utilities (currently duplicated in OutcomePanel and MetricsDashboard) |

## Data Flow

All data is already in storage. `listEntries()` gives full `ProcessEntry` including `processMap` (nodes + edges). No new fetching needed.

Per process:
1. `findPaths(entry.processMap)` → array of node-ID arrays
2. For each path: `pathDuration(path, nodeMap)` → total minutes
3. For each path: count nodes per lane → team chips
4. Node labels: read from `nodeMap = new Map(nodes.map(n => [n.id, n]))`
5. Node colors: look up `LANE_COLORS[n.lane]` for chip background

## Out of Scope

- Saving/exporting analytics view
- Real-time collaboration indicators
- Pagination (load all processes, same as today)
- Cross-process comparison (deferred to stretch goal)
