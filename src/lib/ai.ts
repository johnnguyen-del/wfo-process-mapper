import type { ProcessEntry } from './types'

const SYSTEM_PROMPT = `You are a process mapping assistant for Wealthsimple's Workflow Optimization team.

Your job is to extract structured process inventory data from a plain-English description of an operational process.

Output ONLY a valid JSON object. No markdown, no explanation, no code fences. Just raw JSON.

The JSON object must use these exact field names and value constraints:

{
  "processName": string,        // Clear name — e.g. "Metal Card Reissuance — Client Request"
  "domain": "Banking" | "Transfers" | "Invest" | "Security & Risk",
  "description": string,        // 1–3 sentences: trigger, action taken, how it resolves
  "teamOwner": array of zero or more of ["CS", "Ops", "Fraud Ops", "L2 - Risk"],
  "volumeTier": "High" | "Medium" | "Low",
  "userTools": array of zero or more of ["Atlas", "Persona", "OAS", "JIRA", "Google Sheets", "DOCX"],
  "jiraBoards": array of zero or more of ["BOPSIT", "BOPSFUND", "EOC", "BOSM", "BOTAX", "WORP", "BOAO", "LEDGE", "DAM", "FRAUD", "DOCX"],
  "atlasCopilot": boolean,      // true only if a complete Copilot procedure exists for L1 to fully resolve
  "decagonL0": boolean,         // true only if Decagon is actively resolving this today
  "l0Containable": boolean,     // true if a plausible path to full L0 containment exists
  "containmentBlocker": string, // required if l0Containable true and decagonL0 false — be specific
  "workato": boolean,           // true if any Workato recipe is involved
  "workatoRecipeLink": string,  // only if workato is true
  "outboundComms": array of zero or more of ["None", "Manual", "Workato", "Auto Comms", "Docusign"],
  "spoofableRisk": "High" | "Medium" | "Low" | "N/A",  // N/A only if outboundComms is ["None"]
  "clientComms": string,        // URL to Braze template or email example — empty string if unknown
  "opsDomains": array of zero or more of ["C&B", "I&O", "I&C", "C&D"],  // only for Security & Risk
  "cxTicketDriver": string,     // STELLA driver name if known, empty string otherwise
  "otherMetrics": string        // any caveats, edge cases, or known issues
}

Rules:
- Only set fields you can confidently determine from the description. Use empty string or empty array for unknowns.
- volumeTier: base on how common this process sounds relative to the whole banking/transfers operation.
- outboundComms: "None" means no client-facing communication at all. "Manual" means an agent sends an email or message directly.
- spoofableRisk: if outboundComms includes Manual, default to "High" unless context says otherwise.
- Do not invent details not present in the description.`

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type FormFillPatch = Partial<Omit<ProcessEntry, 'id' | 'processMap' | 'submittedBy' | 'submittedAt' | 'notionPageUrl' | 'status' | 'lastReviewed' | 'docReview'>>

function parseFormFill(raw: string): FormFillPatch | null {
  const trimmed = raw.trim()
  // Strip code fences if present
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i)
  const jsonStr = fenceMatch ? fenceMatch[1] : trimmed

  // Find the last complete JSON object in the stream
  const lastBrace = jsonStr.lastIndexOf('}')
  if (lastBrace === -1) return null
  const candidate = jsonStr.slice(0, lastBrace + 1)
  const firstBrace = candidate.indexOf('{')
  if (firstBrace === -1) return null

  try {
    return JSON.parse(candidate.slice(firstBrace)) as FormFillPatch
  } catch {
    return null
  }
}

export async function streamFormFill(opts: {
  description: string
  onChunk: (raw: string, patch: FormFillPatch | null) => void
  signal?: AbortSignal
}): Promise<FormFillPatch | null> {
  if (typeof MagicAI === 'undefined') {
    throw new Error(
      'MagicAI is not available. Deploy with `magic put` — local dev does not inject Magic globals.'
    )
  }

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: `Extract the process inventory fields from this description:\n\n${opts.description.trim()}` },
  ]

  let full = ''
  for await (const chunk of MagicAI.stream({
    model: MagicAI.SONNET,
    messages,
    signal: opts.signal,
  })) {
    if (opts.signal?.aborted) break
    full += chunk
    opts.onChunk(full, parseFormFill(full))
  }

  return parseFormFill(full)
}
