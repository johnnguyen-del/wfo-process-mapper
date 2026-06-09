import type { ProcessEntry } from './types'
import { toYaml } from './export'

const DATA_SOURCE_ID = 'ac032564-55fc-45e0-85fd-3e2a3e2d4c12'

function isoDate(d: string): string {
  return d ? d.split('T')[0] : new Date().toISOString().split('T')[0]
}

function bool(v: boolean): string {
  return v ? '__YES__' : '__NO__'
}

export async function submitToNotion(
  entry: ProcessEntry,
  toolUrl: string
): Promise<string> {
  if (typeof MagicTools === 'undefined') {
    throw new Error('MagicTools not available — is this running on Magic?')
  }

  const properties: Record<string, string | number | null> = {
    'Process Name': entry.processName,
    'Domain': entry.domain || null,
    'Description': entry.description || null,
    'Team Owner': JSON.stringify(entry.teamOwner),
    'Volume Tier': entry.volumeTier || null,
    'User Tools': JSON.stringify(entry.userTools),
    'Jira Board(s)': JSON.stringify(entry.jiraBoards),
    'Atlas Copilot': bool(entry.atlasCopilot),
    'Decagon (L0)': bool(entry.decagonL0),
    'L0 Containable': bool(entry.l0Containable),
    'Containment Blocker': entry.containmentBlocker || null,
    'Workato': bool(entry.workato),
    'Workato Recipe Link': entry.workatoRecipeLink || null,
    'Outbound Comms': JSON.stringify(entry.outboundComms),
    'Spoofable Risk': entry.spoofableRisk || null,
    'Client Comms': entry.clientComms || null,
    'Ops Domains': JSON.stringify(entry.opsDomains),
    'Other Metrics': entry.otherMetrics || null,
    'date:Last Reviewed:start': isoDate(entry.lastReviewed),
    'date:Last Reviewed:is_datetime': 0,
    'Doc Review': bool(entry.docReview),
    'Figma Map': toolUrl || null,
  }

  // Check Notion is connected first
  let services: Array<{ name: string; connected: boolean }> = []
  try {
    const svcResult = await MagicTools.services()
    services = svcResult.services
  } catch { /* ignore */ }

  const notionSvc = services.find(s => s.name?.toLowerCase().includes('notion'))
  if (notionSvc && !notionSvc.connected) {
    throw new Error('Notion is not connected in MCPLocker. Go to your Magic account settings and connect the Notion integration.')
  }

  let result: any
  try {
    result = await MagicTools.call(
      'notion__notion-create-pages',
      {
        parent: {
          type: 'data_source_id',
          data_source_id: DATA_SOURCE_ID,
        },
        pages: [{
          properties,
          content: `## Process YAML\n\nStored for Claude analysis across all domain pods.\n\n\`\`\`yaml\n${toYaml(entry)}\`\`\``,
        }],
      },
      { raw: true }
    )
  } catch (err: any) {
    // Surface the actual MagicTools error
    throw new Error(`MagicTools Notion call failed: ${err?.message ?? err?.code ?? String(err)}`)
  }

  // Check result looks like a real created page
  // MagicTools raw result for notion-create-pages should have pages with urls
  const rawStr = JSON.stringify(result ?? '')
  const hasError = rawStr.toLowerCase().includes('error') || rawStr.toLowerCase().includes('unauthorized')

  if (hasError) {
    throw new Error(`Notion write failed. Response: ${rawStr.slice(0, 300)}`)
  }

  // Extract URL from result
  const page = result?.results?.[0] ?? result?.pages?.[0] ?? result?.[0]
  const pageUrl: string =
    page?.url ||
    page?.page?.url ||
    (typeof result === 'object' && result?.url) ||
    `https://app.notion.com/p/wealthsimple/WFO-Master-Process-Inventory-6d5cbb7a96744e8e82522e532228bad0`

  return pageUrl
}
