# Resizable Layout Design

## Overview

Add two independent drag handles to the ProcessBuilder layout so users can resize the form panel and the compare-view split. Both sizes persist in localStorage and can be reset to defaults with a single button.

Also fixes a pre-existing bug: the T/B orientation toggle correctly recalculates node positions but `CanvasInner` never remounts to show them, because `canvasKey` only tracks node IDs/count, not positions. Fix: add a `layoutKey` counter prop that increments on every explicit relayout call.

---

## Handle 1 — Form ↔ Canvas (always visible)

**Location:** The vertical border between the left wizard/form panel and the right canvas area in `ProcessBuilder.tsx`.

**Behaviour:**
- Drag left/right to resize. Cursor changes to `col-resize` on hover over the 6px handle bar.
- Default width: `Math.max(280, window.innerWidth * 0.4)` pixels, evaluated once at component mount. The constant `DEFAULT_LEFT_WIDTH` is derived at mount so it doesn't shift on window resize.
- Minimum: `280px` (prevents the form from becoming unusable).
- Maximum: `65%` of window inner width (preserves meaningful canvas space).
- State: `leftWidth: number` (pixels) in `ProcessBuilder`, initialised from `localStorage['wfo-layout-left']` or the default.
- On drag end, write `leftWidth` to `localStorage['wfo-layout-left']`.

**Visual:** 6px wide bar, `bg-indigo-400` on hover/drag, subtle `bg-border` at rest. Two-dot grip indicator centred vertically.

---

## Handle 2 — Current ↔ Ideal in Compare mode (visible only when `viewMode === 'compare'`)

**Location:** Inside `CompareView.tsx`, between the two read-only canvases.

**Behaviour:**
- Drag left/right. Same cursor behaviour as Handle 1.
- Default: `50%` (equal split).
- Minimum: `20%`, Maximum: `80%` (both sides always readable).
- State: `compareSplit: number` (percentage 0–100) in `CompareView`, initialised from `localStorage['wfo-layout-compare']` or `50`.
- On drag end, write to `localStorage['wfo-layout-compare']`.

**Visual:** Same 6px bar, `bg-violet-400` on hover/drag, `bg-border` at rest. Two-dot grip indicator.

---

## Reset Button

**Location:** Top bar of `ProcessBuilder`, right side, between the mode toggle and the Save button.

**Behaviour:** Only rendered when `leftWidth !== defaultLeftWidth || compareSplit !== 50`. Clicking resets both to defaults and removes both localStorage keys.

**Label:** `⊞ Reset layout` (12px, muted text).

---

## T/B Orientation Bug Fix

**Root cause:** `canvasKey` in `ProcessCanvas.tsx` is `canvas-{nodeCount}-{nodeIds}`. When `handleRelayout` patches node positions, the key is unchanged so `CanvasInner` is not remounted and continues displaying stale positions.

**Fix:** Add `layoutKey?: number` prop to `ProcessCanvasProps` and `CanvasInnerProps`. Include it in `canvasKey`:

```
canvasKey = `canvas-${nodes.length}-${nodeIds}-${layoutKey ?? 0}`
```

In `ProcessBuilder`, add `const [layoutKey, setLayoutKey] = useState(0)` and increment it in both `handleRelayout` and `handleOptimizationRelayout`. Pass `layoutKey` to all `<ProcessCanvas>` instances.

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ProcessBuilder.tsx` | Replace `w-[40%] min-w-[320px]` with `leftWidth` state; add drag handle div; add `layoutKey` state; increment in relayout handlers; add Reset button; pass `layoutKey` to ProcessCanvas |
| `src/components/canvas/CompareView.tsx` | Add `compareSplit` state; replace `flex-1` on both panels with explicit `width`; add drag handle div between panels |
| `src/components/canvas/ProcessCanvas.tsx` | Add `layoutKey?: number` to `ProcessCanvasProps` and `CanvasInnerProps`; include in `canvasKey` |

---

## Out of Scope

- Vertical resizing (canvas height vs quality checklist bar).
- Persisting per-process (localStorage is global, not per-entry).
- Animated transitions on reset (instant snap is fine).
