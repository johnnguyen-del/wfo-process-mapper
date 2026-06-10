import { listEntries } from './storage'
import type { ProcessEntry } from './types'

export interface IdealFlowReference {
  id: string
  processName: string
  domain: string
  nodeCount: number  // count of nodes in optimizationMap
}

/**
 * Load all processes that have an optimizationMap set, optionally filtered by domain.
 * Returns lightweight reference objects (no full processMap to save memory).
 */
export async function loadIdealFlowReferences(domain?: string): Promise<IdealFlowReference[]> {
  try {
    const entries = await listEntries()
    return entries
      .filter((e): e is ProcessEntry & { optimizationMap: NonNullable<ProcessEntry['optimizationMap']> } =>
        !e.deletedAt &&
        !!e.optimizationMap &&
        e.optimizationMap.nodes.length > 0 &&
        (!domain || e.domain === domain)
      )
      .map(e => ({
        id: e.id,
        processName: e.processName || 'Untitled',
        domain: e.domain || '',
        nodeCount: e.optimizationMap!.nodes.filter(n => n.type !== 'start' && n.type !== 'end').length,
      }))
  } catch {
    return []
  }
}
