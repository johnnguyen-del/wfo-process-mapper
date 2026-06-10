import type { ProcessEntry } from './types'
import { toYaml } from './export'

const DATA_SOURCE_ID = 'ac032564-55fc-45e0-85fd-3e2a3e2d4c12'

// Notion-accepted options for each select/multi-select field.
// Custom values (e.g. "PRR" domain, custom team names) are not in these lists
// and would cause silent failures — we filter them out and append to Other Metrics instead.
const NOTION_DOMAINS = new Set(['Banking', 'Transfers', 'Invest', 'Security & Risk'])
const NOTION_TEAM_OWNERS = new Set(['CS', 'Ops', 'Fraud Ops', 'L2 - Risk'])
const NOTION_USER_TOOLS = new Set(['Atlas', 'Persona', 'OAS', 'JIRA', 'Google Sheets', 'DOCX'])
const NOTION_JIRA_BOARDS = new Set(['BOPSIT', 'BOPSFUND', 'EOC', 'BOSM', 'BOTAX', 'WORP', 'BOAO', 'LEDGE', 'DAM', 'FRAUD', 'DOCX', 'REIMB'])
const NOTION_OUTBOUND_COMMS = new Set(['None', 'Auto Comms', 'Manual', 'Workato', 'Docusign'])
const NOTION_OPS_DOMAINS = new Set(['C&B', 'I&O', 'I&C', 'C&D'])
const NOTION_SPOOFABLE_RISK = new Set(['High', 'Medium', 'Low', 'N/A'])
const NOTION_VOLUME_TIERS = new Set(['High', 'Medium', 'Low'])

/** Filter an array to only values Notion accepts; returns the rest as custom values. */
function filterMulti<T extends string>(values: T[], allowed: Set<string>): { valid: T[]; custom: T[] } {
  return { valid: values.filter(v => allowed.has(v)) as T[], custom: values.filter(v => !allowed.has(v)) as T[] }
}

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

  // Filter multi-select values to Notion-accepted options; collect custom values
  const teamOwner = filterMulti(entry.teamOwner ?? [], NOTION_TEAM_OWNERS)
  const userTools = filterMulti(entry.userTools ?? [], NOTION_USER_TOOLS)
  const jiraBoards = filterMulti(entry.jiraBoards ?? [], NOTION_JIRA_BOARDS)
  const outboundComms = filterMulti(entry.outboundComms ?? [], NOTION_OUTBOUND_COMMS)
  const opsDomains = filterMulti(entry.opsDomains ?? [], NOTION_OPS_DOMAINS)

  // Collect any custom/non-standard values to append to Other Metrics
  const customNotes: string[] = []
  if (entry.domain && !NOTION_DOMAINS.has(entry.domain)) {
    customNotes.push(`Domain (custom): ${entry.domain}`)
  }
  if (teamOwner.custom.length) customNotes.push(`Team Owner (custom): ${teamOwner.custom.join(', ')}`)
  if (userTools.custom.length) customNotes.push(`User Tools (custom): ${userTools.custom.join(', ')}`)
  if (jiraBoards.custom.length) customNotes.push(`Jira Boards (custom): ${jiraBoards.custom.join(', ')}`)
  if (outboundComms.custom.length) customNotes.push(`Outbound Comms (custom): ${outboundComms.custom.join(', ')}`)
  if (opsDomains.custom.length) customNotes.push(`Ops Domains (custom): ${opsDomains.custom.join(', ')}`)
  if (entry.cxTicketDriver) customNotes.push(`CX Ticket Driver: ${entry.cxTicketDriver}`)

  const otherMetrics = [entry.otherMetrics, ...customNotes].filter(Boolean).join('\n') || null

  const properties: Record<string, string | number | null> = {
    'Process Name': entry.processName,
    'Domain': (entry.domain && NOTION_DOMAINS.has(entry.domain)) ? entry.domain : null,
    'Description': entry.description || null,
    'Team Owner': JSON.stringify(teamOwner.valid),
    'Volume Tier': (entry.volumeTier && NOTION_VOLUME_TIERS.has(entry.volumeTier)) ? entry.volumeTier : null,
    'User Tools': JSON.stringify(userTools.valid),
    'Jira Board(s)': JSON.stringify(jiraBoards.valid),
    'Atlas Copilot': bool(entry.atlasCopilot),
    'Decagon (L0)': bool(entry.decagonL0),
    'L0 Containable': bool(entry.l0Containable),
    'Containment Blocker': entry.containmentBlocker || null,
    'Workato': bool(entry.workato),
    'Workato Recipe Link': entry.workatoRecipeLink || null,
    'Outbound Comms': JSON.stringify(outboundComms.valid),
    'Spoofable Risk': (entry.spoofableRisk && NOTION_SPOOFABLE_RISK.has(entry.spoofableRisk)) ? entry.spoofableRisk : null,
    'Client Comms': entry.clientComms || null,
    'Ops Domains': JSON.stringify(opsDomains.valid),
    'Other Metrics': otherMetrics,
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
