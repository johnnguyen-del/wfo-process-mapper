import { stringify, parse } from 'yaml'
import dagre from 'dagre'
import type { CanvasDirection, ProcessEntry, ProcessNode, ProcessEdge } from './types'

const NODE_W = 200
const NODE_H = 60
const RANK_SEP = 300  // wide horizontal spacing so edges have room
const NODE_SEP = 40   // tighter vertical — keeps Yes/No branches closer together

// Still exported for the canvas swimlane bands (used when showSwimlanes=true)
export const LANE_Y: Record<string, number> = {
  CS: 80, Ops: 280, 'Fraud Ops': 480, 'L2 - Risk': 680, Automation: 880, Client: 1080,
}

export function autoLayout(
  nodes: ProcessNode[],
  edges: ProcessEdge[],
  direction: CanvasDirection = 'LR'
): ProcessNode[] {
  if (nodes.length === 0) return nodes

  const normalised = nodes.map(n => ({
    ...n,
    lane: (n.type === 'start' || n.type === 'end' ? 'CS' : n.lane) as ProcessNode['lane'],
  }))

  // Full dagre layout — no lane y constraint, nodes go where the graph topology puts them
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: direction, nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 60, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))
  normalised.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach(e => { if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target) })
  try { dagre.layout(g) } catch { /* fallback to original positions */ }

  return normalised.map(n => {
    const pos = g.node(n.id)
    return {
      ...n,
      position: {
        x: pos ? Math.round(pos.x - NODE_W / 2) : n.position.x,
        y: pos ? Math.round(pos.y - NODE_H / 2) : n.position.y,
      },
    }
  })
}

export function toYaml(entry: ProcessEntry): string {
  const doc = {
    process: {
      name: entry.processName,
      domain: entry.domain,
      description: entry.description,
      team_owner: entry.teamOwner,
      volume_tier: entry.volumeTier,
      user_tools: entry.userTools,
      jira_boards: entry.jiraBoards,
      automation: {
        atlas_copilot: entry.atlasCopilot,
        decagon_l0: entry.decagonL0,
        l0_containable: entry.l0Containable,
        containment_blocker: entry.containmentBlocker || null,
        workato: entry.workato,
        workato_recipe_link: entry.workatoRecipeLink || null,
      },
      comms: {
        outbound: entry.outboundComms,
        spoofable_risk: entry.spoofableRisk || null,
        client_comms_example: entry.clientComms || null,
      },
      taxonomy: {
        ops_domains: entry.opsDomains,
        cx_ticket_driver: entry.cxTicketDriver || null,
        other_metrics: entry.otherMetrics || null,
      },
      meta: {
        last_reviewed: entry.lastReviewed,
        doc_review: entry.docReview,
        submitted_by: entry.submittedBy || null,
        submitted_at: entry.submittedAt || null,
      },
      process_map: {
        nodes: entry.processMap.nodes.map(n => ({
          id: n.id, type: n.type, label: n.label, lane: n.lane,
          ...(n.timeEstimate ? { time_estimate: n.timeEstimate } : {}),
          ...(n.badge ? { badge: n.badge } : {}),
          position: n.position,
        })),
        edges: entry.processMap.edges.map(e => ({
          id: e.id, source: e.source, target: e.target,
          ...(e.label ? { label: e.label } : {}),
        })),
      },
    },
  }
  return stringify(doc)
}

export function fromYaml(
  rawYaml: string,
  direction: CanvasDirection = 'LR'
): Partial<ProcessEntry> | null {
  try {
    const doc = parse(rawYaml) as any
    const p =
      doc?.process && typeof doc.process === 'object' && (doc.process.name || doc.process.domain)
        ? doc.process
        : doc?.name || doc?.domain ? doc : null
    if (!p) return null

    const rawNodes: ProcessNode[] = (p.process_map?.nodes ?? []).map((n: any, i: number) => ({
      id: n.id ?? `n${i + 1}`,
      type: n.type ?? 'step',
      label: n.label ?? '',
      lane: (n.lane ?? 'CS') as ProcessNode['lane'],
      timeEstimate: n.time_estimate ?? undefined,
      badge: n.badge ?? undefined,
      position: { x: n.position?.x ?? 150 + i * 220, y: n.position?.y ?? 80 },
    }))

    const edges: ProcessEdge[] = (p.process_map?.edges ?? []).map((e: any) => ({
      id: e.id ?? `e${e.source}-${e.target}`,
      source: e.source, target: e.target,
      label: e.label ?? undefined,
    }))

    const nodes = autoLayout(rawNodes, edges, direction)

    return {
      processName: p.name ?? '',
      domain: p.domain ?? '',
      description: p.description ?? '',
      teamOwner: p.team_owner ?? [],
      volumeTier: p.volume_tier ?? '',
      userTools: p.user_tools ?? [],
      jiraBoards: p.jira_boards ?? [],
      atlasCopilot: p.automation?.atlas_copilot ?? false,
      decagonL0: p.automation?.decagon_l0 ?? false,
      l0Containable: p.automation?.l0_containable ?? false,
      containmentBlocker: p.automation?.containment_blocker ?? '',
      workato: p.automation?.workato ?? false,
      workatoRecipeLink: p.automation?.workato_recipe_link ?? '',
      outboundComms: p.comms?.outbound ?? [],
      spoofableRisk: p.comms?.spoofable_risk ?? '',
      clientComms: p.comms?.client_comms_example ?? '',
      opsDomains: p.taxonomy?.ops_domains ?? [],
      cxTicketDriver: p.taxonomy?.cx_ticket_driver ?? '',
      otherMetrics: p.taxonomy?.other_metrics ?? '',
      processMap: { nodes, edges },
    }
  } catch {
    return null
  }
}

export function downloadYaml(entry: ProcessEntry): void {
  const yaml = toYaml(entry)
  const blob = new Blob([yaml], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${entry.processName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'process'}.yaml`
  a.click()
  URL.revokeObjectURL(url)
}
