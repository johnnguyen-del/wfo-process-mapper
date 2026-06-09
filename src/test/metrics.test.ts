import { describe, it, expect } from 'vitest'
import { computeMetrics } from '../lib/metrics'
import type { ProcessMap } from '../lib/types'

const MAP: ProcessMap = {
  nodes: [
    { id: 'n1', type: 'start', label: 'Start', lane: 'CS', position: { x: 0, y: 0 } },
    { id: 'n2', type: 'step', label: 'Step A', lane: 'CS', durationMinutes: 10, position: { x: 0, y: 0 } },
    { id: 'n3', type: 'step', label: 'Step B', lane: 'Ops', durationMinutes: 20, position: { x: 0, y: 0 } },
    { id: 'n4', type: 'end', label: 'End', lane: 'CS', position: { x: 0, y: 0 } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' },
    { id: 'e3', source: 'n3', target: 'n4' },
  ],
}

describe('computeMetrics', () => {
  it('counts non-start/end nodes as touchpoints', () => {
    expect(computeMetrics(MAP).totalTouchpoints).toBe(2)
  })

  it('counts all edges as transitions', () => {
    expect(computeMetrics(MAP).totalTransitions).toBe(3)
  })

  it('sums duration across all touchpoint nodes', () => {
    expect(computeMetrics(MAP).totalDurationMinutes).toBe(30)
  })

  it('calculates average duration per touchpoint', () => {
    expect(computeMetrics(MAP).avgDurationMinutes).toBe(15)
  })

  it('groups touchpoints and duration by swimlane', () => {
    const m = computeMetrics(MAP)
    expect(m.byLane['CS'].count).toBe(1)
    expect(m.byLane['Ops'].count).toBe(1)
    expect(m.byLane['CS'].durationMinutes).toBe(10)
    expect(m.byLane['Ops'].durationMinutes).toBe(20)
  })

  it('lists node IDs of touchpoints missing durationMinutes', () => {
    const mapWithGap: ProcessMap = {
      ...MAP,
      nodes: MAP.nodes.map(n => n.id === 'n2' ? { ...n, durationMinutes: undefined } : n),
    }
    expect(computeMetrics(mapWithGap).missingDuration).toContain('n2')
    expect(computeMetrics(mapWithGap).missingDuration).not.toContain('n3')
  })

  it('returns zero avgDurationMinutes when no touchpoints', () => {
    const emptyMap: ProcessMap = { nodes: [], edges: [] }
    expect(computeMetrics(emptyMap).avgDurationMinutes).toBe(0)
  })
})
