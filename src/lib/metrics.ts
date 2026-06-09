import type { ProcessMap, SwimLane } from './types'

export interface ProcessMetrics {
  totalTouchpoints: number
  totalTransitions: number
  totalDurationMinutes: number
  avgDurationMinutes: number
  byLane: Record<SwimLane, { count: number; durationMinutes: number }>
  missingDuration: string[]   // IDs of step/decision/etc nodes with no durationMinutes
}

const ALL_LANES: SwimLane[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client']

export function computeMetrics(map: ProcessMap): ProcessMetrics {
  const touchpoints = map.nodes.filter(n => n.type !== 'start' && n.type !== 'end')
  const totalDurationMinutes = touchpoints.reduce((s, n) => s + (n.durationMinutes ?? 0), 0)

  const byLane = Object.fromEntries(
    ALL_LANES.map(lane => {
      const laneNodes = touchpoints.filter(n => n.lane === lane)
      return [lane, {
        count: laneNodes.length,
        durationMinutes: laneNodes.reduce((s, n) => s + (n.durationMinutes ?? 0), 0),
      }]
    })
  ) as ProcessMetrics['byLane']

  return {
    totalTouchpoints: touchpoints.length,
    totalTransitions: map.edges.length,
    totalDurationMinutes,
    avgDurationMinutes: touchpoints.length > 0
      ? Math.round(totalDurationMinutes / touchpoints.length)
      : 0,
    byLane,
    missingDuration: touchpoints
      .filter(n => n.durationMinutes == null)
      .map(n => n.id),
  }
}
