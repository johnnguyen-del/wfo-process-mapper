import type { ProcessEntry } from './types'

const DB_ID = 'ac032564-55fc-45e0-85fd-3e2a3e2d4c12'

// MCPLocker tool name: mcp__mcplocker__notion__notion-create-pages
// MagicTools canonical name strips mcp__mcplocker__ prefix
const NOTION_CREATE_PAGES = 'notion__notion-create-pages'

function isoDate(d: string): string {
  return d ? d.split('T')[0] : new Date().toISOString().split('T')[0]
}

function text(content: string) {
  return { rich_text: [{ text: { content } }] }
}

function title(content: string) {
  return { title: [{ text: { content } }] }
}

function select(name: string) {
  return name ? { select: { name } } : undefined
}

function multiSelect(names: string[]) {
  return { multi_select: names.map((name) => ({ name })) }
}

function checkbox(value: boolean) {
  return { checkbox: value }
}

function url(value: string) {
  return value ? { url: value } : undefined
}

function date(start: string) {
  return { date: { start } }
}

export async function submitToNotion(
  entry: ProcessEntry,
  toolUrl: string
): Promise<string> {
  if (typeof MagicTools === 'undefined') {
    throw new Error('MagicTools not available — is this running on Magic?')
  }

  const properties: Record<string, unknown> = {
    'Process Name': title(entry.processName),
    ...(entry.domain && { Domain: select(entry.domain) }),
    Description: text(entry.description),
    'Team Owner': multiSelect(entry.teamOwner),
    ...(entry.volumeTier && { 'Volume Tier': select(entry.volumeTier) }),
    'User Tools': multiSelect(entry.userTools),
    'Jira Board(s)': multiSelect(entry.jiraBoards),
    'Atlas Copilot': checkbox(entry.atlasCopilot),
    'Decagon (L0)': checkbox(entry.decagonL0),
    'L0 Containable': checkbox(entry.l0Containable),
    Workato: checkbox(entry.workato),
    'Doc Review': checkbox(entry.docReview),
    'Outbound Comms': multiSelect(entry.outboundComms),
    ...(entry.spoofableRisk && { 'Spoofable Risk': select(entry.spoofableRisk) }),
    'Last Reviewed': date(isoDate(entry.lastReviewed)),
    ...(toolUrl && { 'Figma Map': url(toolUrl) }),
  }

  if (entry.containmentBlocker?.trim()) {
    properties['Containment Blocker'] = text(entry.containmentBlocker)
  }
  if (entry.workatoRecipeLink?.trim()) {
    properties['Workato Recipe Link'] = url(entry.workatoRecipeLink)
  }
  if (entry.clientComms?.trim()) {
    properties['Client Comms'] = url(entry.clientComms)
  }
  if (entry.opsDomains.length > 0) {
    properties['Ops Domains'] = multiSelect(entry.opsDomains)
  }
  if (entry.otherMetrics?.trim()) {
    properties['Other Metrics'] = text(entry.otherMetrics)
  }

  const result = await MagicTools.call(
    NOTION_CREATE_PAGES,
    { database_id: DB_ID, properties },
    { raw: true }
  )

  const pageUrl: string =
    (result as any)?.url ||
    (result as any)?.page?.url ||
    `https://www.notion.so/${DB_ID.replace(/-/g, '')}`

  return pageUrl
}
