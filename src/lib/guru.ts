// src/lib/guru.ts

// MagicTools is a browser global injected by the Magic platform (@wealthsimple/magic).
// It is not available in local dev — guard every call with typeof MagicTools === 'undefined'.

/**
 * MagicTools wraps MCP responses as { content: [{ text: '...json...', type: 'text' }] }.
 * Unwrap and parse to get the actual tool result object.
 */
function unwrapMagicTools(result: unknown): any {
  const raw = result as any
  const text = raw?.content?.[0]?.text
  if (typeof text === 'string') {
    try { return JSON.parse(text) } catch { return raw }
  }
  return raw
}

/** Strip HTML tags and decode common entities for plain-text AI processing. */
function stripHtml(html: unknown): string {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x[0-9a-f]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface GuruCard {
  id: string
  title: string
  content: string      // plain text (HTML stripped)
  lastModified?: string
}

export interface GuruKnowledgeAgent {
  id: string
  name: string
  description?: string
}

/**
 * Extract an 8–16 char Guru card ID from a full URL or a bare ID string.
 * Handles: https://app.getguru.com/card/{id}/slug and bare IDs like "cxE5E4ai".
 */
export function parseGuruCardId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const urlMatch = trimmed.match(/\/card\/([A-Za-z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]
  if (/^[A-Za-z0-9_-]{8,16}$/.test(trimmed)) return trimmed
  return null
}

/** Heuristic: does the stripped card content look like an actionable workflow? */
export function hasWorkflowData(content: string): boolean {
  const lower = content.toLowerCase()
  const hasRole = /\b(cs|l1|l2|ops|fraud|agent|team)\b/.test(lower)
  const hasAction = ['verify', 'submit', 'review', 'escalate', 'check', 'step', 'process', 'procedure', 'jira', 'atlas'].some(k => lower.includes(k))
  // Also pass if content has numbered step structure with action keywords
  const hasStepStructure = /step\s+\d+/i.test(content) && hasAction
  return (hasRole && hasAction) || hasStepStructure
}

/**
 * List available Guru knowledge agents.
 * MUST call before searchGuru() — both search and answer_generation require an agentId.
 */
/**
 * List available Guru knowledge agents.
 * Note: guru__guru_list_knowledge_agents itself requires an agentId in the current
 * Guru MCP implementation — so this function is not useful for bootstrapping.
 * The modal instead persists agentId in localStorage via a one-time setup prompt.
 */
export async function listKnowledgeAgents(): Promise<GuruKnowledgeAgent[]> {
  if (typeof MagicTools === 'undefined') return []
  const result = await MagicTools.call('guru__guru_list_knowledge_agents', {})
  const items: any[] = Array.isArray(result) ? result : ((result as any)?.agents ?? (result as any)?.items ?? (result as any)?.data ?? [])
  return items.map((a: any) => ({
    id: a.id ?? a.agentId ?? '',
    name: a.name ?? a.title ?? 'Unknown Agent',
    description: a.description,
  })).filter(agent => agent.id !== '')
}

/**
 * Search Guru knowledge base. Requires agentId from guru__guru_list_knowledge_agents.
 * Returns max 10 results.
 */
export async function searchGuru(query: string, agentId: string): Promise<GuruCard[]> {
  if (typeof MagicTools === 'undefined') {
    throw new Error('Guru search requires deployment — not available in local dev.')
  }
  const raw = await MagicTools.call('guru__guru_search_documents', { agentId, query })
  const result = unwrapMagicTools(raw)
  const items: any[] = Array.isArray(result) ? result : (result?.results ?? result?.items ?? result?.cards ?? [])
  return items.slice(0, 10).map((d: any) => ({
    id: d.id ?? d.cardId ?? '',
    title: d.preferredPhrase ?? d.title ?? 'Untitled',
    content: stripHtml(d.content ?? d.body ?? d.snippet ?? ''),
    lastModified: d.lastModified ?? d.dateUpdated,
  })).filter(card => card.id !== '')
}

/**
 * Fetch a single Guru card's full content by ID. No agentId required.
 */
export async function getGuruCardById(cardId: string): Promise<GuruCard> {
  if (typeof MagicTools === 'undefined') {
    throw new Error('Guru card fetch requires deployment — not available in local dev.')
  }
  const raw = await MagicTools.call('guru__guru_get_card_by_id', { id: cardId })
  const card = unwrapMagicTools(raw)
  return {
    id: card?.id ?? cardId,
    title: card?.preferredPhrase ?? card?.title ?? 'Untitled',
    content: stripHtml(card?.content ?? card?.body ?? ''),
    lastModified: card?.lastModified ?? card?.dateUpdated,
  }
}
