import { stringify } from 'yaml'
import type { ProcessEntry } from './types'

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
        nodes: entry.processMap.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          lane: n.lane,
          ...(n.timeEstimate ? { time_estimate: n.timeEstimate } : {}),
        })),
        edges: entry.processMap.edges.map((e) => ({
          source: e.source,
          target: e.target,
          ...(e.label ? { label: e.label } : {}),
        })),
      },
    },
  }
  return stringify(doc)
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
