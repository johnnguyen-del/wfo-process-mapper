import type { ProcessEntry } from './types'

const DB_ID = 'ac032564-55fc-45e0-85fd-3e2a3e2d4c12'

function bool(v: boolean): string {
  return v ? '__YES__' : '__NO__'
}

function isoDate(d: string): string {
  return d ? d.split('T')[0] : new Date().toISOString().split('T')[0]
}

export async function submitToNotion(
  entry: ProcessEntry,
  toolUrl: string
): Promise<string> {
  const tools = (window as any).MagicTools
  if (!tools) throw new Error('MagicTools not available')

  const props: Record<string, unknown> = {
    'Process Name': entry.processName,
    Domain: entry.domain,
    Description: entry.description,
    'Team Owner': JSON.stringify(entry.teamOwner),
    'Volume Tier': entry.volumeTier,
    'User Tools': JSON.stringify(entry.userTools),
    'Jira Board(s)': JSON.stringify(entry.jiraBoards),
    'Atlas Copilot': bool(entry.atlasCopilot),
    'Decagon (L0)': bool(entry.decagonL0),
    'L0 Containable': bool(entry.l0Containable),
    'Containment Blocker': entry.containmentBlocker,
    Workato: bool(entry.workato),
    'Workato Recipe Link': entry.workatoRecipeLink,
    'Outbound Comms': JSON.stringify(entry.outboundComms),
    'Spoofable Risk': entry.spoofableRisk,
    'Client Comms': entry.clientComms,
    'Ops Domains': JSON.stringify(entry.opsDomains),
    'Other Metrics': entry.otherMetrics,
    'date:Last Reviewed:start': isoDate(entry.lastReviewed),
    'Doc Review': bool(entry.docReview),
    'Figma Map': toolUrl,
  }

  const result = await tools.notion_create_pages({
    database_id: DB_ID,
    properties: props,
  })

  const url: string =
    result?.url ||
    result?.page?.url ||
    `https://app.notion.com/p/wealthsimple/WFO-Master-Process-Inventory-6d5cbb7a96744e8e82522e532228bad0`

  return url
}
