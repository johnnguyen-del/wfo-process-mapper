// src/test/export.test.ts
import { describe, it, expect } from 'vitest'
import { fromYaml } from '../lib/export'

const YAML = `
process:
  name: Test
  domain: Banking
  process_map:
    nodes:
      - { id: n1, type: start, label: Start, lane: CS, position: { x: 0, y: 0 } }
      - { id: n2, type: step,  label: Do Thing, lane: Ops, position: { x: 0, y: 0 } }
      - { id: n3, type: end,   label: End, lane: CS, position: { x: 0, y: 0 } }
    edges:
      - { id: e1, source: n1, target: n2 }
      - { id: e2, source: n2, target: n3 }
`

describe('autoLayout direction', () => {
  it('LR layout places nodes left-to-right (x increases)', () => {
    const entry = fromYaml(YAML, 'LR')
    const nodes = entry!.processMap!.nodes
    expect(nodes[1].position.x).toBeGreaterThan(nodes[0].position.x)
    expect(nodes[2].position.x).toBeGreaterThan(nodes[1].position.x)
  })

  it('TB layout places nodes top-to-bottom (y increases)', () => {
    const entry = fromYaml(YAML, 'TB')
    const nodes = entry!.processMap!.nodes
    expect(nodes[1].position.y).toBeGreaterThan(nodes[0].position.y)
    expect(nodes[2].position.y).toBeGreaterThan(nodes[1].position.y)
  })
})
