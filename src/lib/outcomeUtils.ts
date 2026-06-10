import type { ProcessMap, ProcessNode } from './types'

/**
 * DFS — finds all paths from start nodes to end nodes.
 * Returns array of node-ID arrays. Capped at 50 paths.
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

/** Work step count — excludes start and end nodes. */
export function pathWorkSteps(path: string[]): number {
  return Math.max(0, path.length - 2)
}
