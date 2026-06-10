import { useMemo, useState } from 'react'
import type { ProcessMap } from '@/lib/types'

// DFS to find all paths from start nodes to end nodes
// Returns array of node-ID paths
function findPaths(map: ProcessMap): string[][] {
  const adj = new Map<string, string[]>()
  map.edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  })

  const startIds = map.nodes.filter(n => n.type === 'start').map(n => n.id)
  const endSet = new Set(map.nodes.filter(n => n.type === 'end').map(n => n.id))
  const paths: string[][] = []

  function dfs(nodeId: string, path: string[], visited: Set<string>) {
    if (visited.has(nodeId)) return         // cycle guard
    if (paths.length >= 50) return          // safety cap
    if (endSet.has(nodeId)) {
      paths.push([...path, nodeId])
      return
    }
    visited.add(nodeId)
    for (const next of adj.get(nodeId) ?? []) {
      dfs(next, [...path, nodeId], new Set(visited))
    }
  }

  startIds.forEach(s => dfs(s, [], new Set()))
  return paths
}

interface OutcomePanelProps {
  processMap: ProcessMap
  onHighlight: (nodeIds: Set<string>) => void
  onClose: () => void
  onIsolate?: (isolate: boolean) => void
}

export default function OutcomePanel({ processMap, onHighlight, onClose, onIsolate }: OutcomePanelProps) {
  const paths = useMemo(() => findPaths(processMap), [processMap])
  const nodeMap = new Map(processMap.nodes.map(n => [n.id, n]))

  const [isolateMode, setIsolateMode] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<number>>(new Set())

  function pathDuration(path: string[]): number {
    return path.reduce((sum, id) => sum + (nodeMap.get(id)?.durationMinutes ?? 0), 0)
  }

  return (
    <div className="absolute right-2 top-12 z-30 bg-background border rounded-lg shadow-lg p-3 w-72 max-h-[60vh] overflow-y-auto text-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Outcomes ({paths.length}{paths.length === 50 ? '+' : ''})</span>
        <div className="flex gap-1 items-center">
          {paths.length >= 2 && (
            <button
              onClick={() => { setCompareMode(c => !c); setSelectedPaths(new Set()) }}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                compareMode ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground/40'
              }`}
            >
              ⚖ Compare
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground leading-none" title="Close panel (keeps highlight)">✕</button>
        </div>
      </div>

      {paths.length === 0 && (
        <p className="text-muted-foreground py-2">
          No complete paths found. Add Start and End nodes connected by edges.
        </p>
      )}

      {paths.map((path, i) => {
        const endNode = nodeMap.get(path[path.length - 1])
        const dur = pathDuration(path)
        const workSteps = Math.max(0, path.length - 2)
        const isSelected = selectedPaths.has(i)

        if (compareMode) {
          return (
            <button
              key={path.join('-')}
              onClick={() => {
                const next = new Set(selectedPaths)
                if (next.has(i)) {
                  next.delete(i)
                } else if (next.size < 2) {
                  next.add(i)
                }
                setSelectedPaths(next)
                // Highlight both selected paths
                const allIds = new Set([...next].flatMap(idx => paths[idx]))
                onHighlight(allIds)
              }}
              className={`w-full text-left p-2 rounded border mb-1.5 transition-colors text-xs ${
                isSelected ? 'border-foreground bg-muted/40' : 'hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm border flex-shrink-0 ${isSelected ? 'bg-foreground' : 'border-border'}`} />
                <span className="font-medium">Outcome {i + 1}: {endNode?.label ?? 'End'}</span>
              </div>
              <div className="text-muted-foreground ml-4.5">
                {workSteps} step{workSteps !== 1 ? 's' : ''}{dur > 0 ? ` · ${dur} min` : ''}
              </div>
            </button>
          )
        }

        return (
          <button
            key={path.join('-')}
            onClick={() => onHighlight(new Set(path))}
            className="w-full text-left p-2 rounded border mb-1.5 hover:bg-muted/40 transition-colors text-xs"
          >
            <div className="font-medium mb-0.5">Outcome {i + 1}: {endNode?.label ?? 'End'}</div>
            <div className="text-muted-foreground">
              {workSteps} step{workSteps !== 1 ? 's' : ''}{dur > 0 ? ` · ${dur} min` : ''}
            </div>
          </button>
        )
      })}

      {compareMode && selectedPaths.size === 2 && (() => {
        const [idxA, idxB] = [...selectedPaths].sort((a, b) => a - b)
        const pathA = paths[idxA], pathB = paths[idxB]
        const durA = pathDuration(pathA), durB = pathDuration(pathB)
        const stepsA = Math.max(0, pathA.length - 2), stepsB = Math.max(0, pathB.length - 2)
        return (
          <div className="mt-2 border rounded p-2 bg-muted/20 text-xs">
            <div className="font-semibold mb-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Comparison</div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div />
              <div className="font-medium text-[10px]">O{idxA + 1}</div>
              <div className="font-medium text-[10px]">O{idxB + 1}</div>
              <div className="text-left text-muted-foreground">Steps</div>
              <div className={stepsA < stepsB ? 'text-green-600 font-semibold' : stepsA > stepsB ? 'text-red-500 font-semibold' : ''}>{stepsA}</div>
              <div className={stepsB < stepsA ? 'text-green-600 font-semibold' : stepsB > stepsA ? 'text-red-500 font-semibold' : ''}>{stepsB}</div>
              <div className="text-left text-muted-foreground">Duration</div>
              <div className={durA > 0 && durB > 0 && durA < durB ? 'text-green-600 font-semibold' : durA > 0 && durB > 0 && durA > durB ? 'text-red-500 font-semibold' : ''}>{durA > 0 ? `${durA}m` : '—'}</div>
              <div className={durB > 0 && durA > 0 && durB < durA ? 'text-green-600 font-semibold' : durB > 0 && durA > 0 && durB > durA ? 'text-red-500 font-semibold' : ''}>{durB > 0 ? `${durB}m` : '—'}</div>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">Green = fewer/faster · Red = more/slower</p>
          </div>
        )
      })()}

      {paths.length > 0 && (
        <div className="flex gap-2 mt-1">
          {onIsolate && (
            <button
              onClick={() => {
                const next = !isolateMode
                setIsolateMode(next)
                onIsolate(next)
              }}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                isolateMode
                  ? 'bg-foreground text-background border-foreground'
                  : 'text-muted-foreground hover:text-foreground border-border'
              }`}
            >
              {isolateMode ? '🔍 Isolated' : '🔍 Isolate'}
            </button>
          )}
          <button
            onClick={() => { onHighlight(new Set()); setIsolateMode(false); onIsolate?.(false) }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear highlight
          </button>
        </div>
      )}
    </div>
  )
}
