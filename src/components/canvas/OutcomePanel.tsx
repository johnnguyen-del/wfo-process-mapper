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
}

export default function OutcomePanel({ processMap, onHighlight, onClose }: OutcomePanelProps) {
  const paths = findPaths(processMap)
  const nodeMap = new Map(processMap.nodes.map(n => [n.id, n]))

  function pathDuration(path: string[]): number {
    return path.reduce((sum, id) => sum + (nodeMap.get(id)?.durationMinutes ?? 0), 0)
  }

  return (
    <div className="absolute right-2 top-12 z-30 bg-background border rounded-lg shadow-lg p-3 w-72 max-h-[60vh] overflow-y-auto text-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Outcomes ({paths.length})</span>
        <button
          onClick={() => { onHighlight(new Set()); onClose() }}
          className="text-muted-foreground hover:text-foreground leading-none"
        >✕</button>
      </div>

      {paths.length === 0 && (
        <p className="text-muted-foreground py-2">
          No complete paths found. Add Start and End nodes connected by edges.
        </p>
      )}

      {paths.map((path, i) => {
        const endNode = nodeMap.get(path[path.length - 1])
        const dur = pathDuration(path)
        return (
          <button
            key={i}
            onClick={() => onHighlight(new Set(path))}
            className="w-full text-left p-2 rounded border mb-1.5 hover:bg-muted/40 transition-colors text-xs"
          >
            <div className="font-medium mb-0.5">
              Outcome {i + 1}: {endNode?.label ?? 'End'}
            </div>
            <div className="text-muted-foreground">
              {path.length} step{path.length !== 1 ? 's' : ''}
              {dur > 0 ? ` · ${dur} min` : ''}
            </div>
          </button>
        )
      })}

      {paths.length > 0 && (
        <button
          onClick={() => onHighlight(new Set())}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear highlight
        </button>
      )}
    </div>
  )
}
