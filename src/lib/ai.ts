import type { ProcessEntry, ProcessNode, ProcessEdge } from './types'
import { fromYaml, toYaml } from './export'
import { parse } from 'yaml'

/** Targeted patch — only changed parts, no full YAML needed */
export interface MapPatch {
  addNodes?: Partial<ProcessNode>[]
  removeNodeIds?: string[]
  addEdges?: Partial<ProcessEdge>[]
  removeEdgeIds?: string[]
  updateFields?: FormFillPatch
}

/** Parse the lightweight patch: format the AI uses for small edits */
export function parsePatch(raw: string): MapPatch | null {
  const stripped = raw.replace(/^```(?:ya?ml)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (!stripped.startsWith('patch:')) return null
  try {
    const doc = parse(stripped) as any
    const p = doc?.patch
    if (!p) return null
    const result: MapPatch = {}
    if (Array.isArray(p.add_nodes)) result.addNodes = p.add_nodes
    if (Array.isArray(p.remove_nodes)) result.removeNodeIds = p.remove_nodes
    if (Array.isArray(p.add_edges)) result.addEdges = p.add_edges
    if (Array.isArray(p.remove_edges)) result.removeEdgeIds = p.remove_edges
    if (p.update_fields && typeof p.update_fields === 'object') result.updateFields = p.update_fields
    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}

const SYSTEM_PROMPT = `You are a process mapping assistant for Wealthsimple's Workflow Optimization team.

You operate in two modes:

**CONVERSATION MODE** (default):
- Respond in plain English. Ask clarifying questions. Help the user refine the process.
- Use this when the description is vague, incomplete, or the user is asking a question.
- Do NOT generate YAML unless the user explicitly requests it (says "generate", "fill in", "apply", "create the map", "go ahead", etc.) OR the description is detailed enough to map accurately.
- Ask about: team owners, volume tier, automation (Workato/Decagon), comms type, spoofable risk.

**YAML GENERATION MODE** (new processes only):
- Triggered when user explicitly asks to generate a new process from scratch, OR when you have sufficient detail for a brand-new process.
- Output ONLY valid YAML. No explanation, no markdown fences, no preamble.
- Start with exactly "process:" on the first line.
- After generating, stay in conversation — for follow-up edits use PATCH MODE.

**PATCH MODE** (targeted edits — ALWAYS use this for changes to an existing process):
- Use when the user asks to add, remove, update, or change ANYTHING on an existing process.
- Output ONLY the patch YAML. No explanation. Start with exactly "patch:" on the first line.
- The tool AUTOMATICALLY preserves all existing nodes/edges — you only list what changes.

patch:
  add_nodes:          # NEW nodes only — existing nodes are preserved automatically
    - type: step
      label: "L1: Review account status in Atlas"
      lane: CS
      time_estimate: "2 min"
  add_edges:          # NEW edges only (use "new_N" to reference the Nth node in add_nodes, 1-indexed)
    - source: n4
      target: new_1
      label: "Yes — proceed"
  remove_nodes:       # IDs of existing nodes to delete
    - n5
  remove_edges:       # IDs of existing edges to delete
    - e7
  update_fields:      # ONLY the form fields that changed (omit everything else)
    domain: Banking

- Do NOT include id fields on add_nodes — the tool assigns them automatically
- Only include the keys that actually change. Adding nodes? Only include add_nodes (and add_edges if needed).
- NEVER use patch format for new processes from scratch — use full process: YAML for that

CRITICAL FORMATTING RULES:
1. The output MUST start with exactly "process:" on the first line
2. ALL fields must be indented exactly 2 spaces under "process:"
3. Nested sections (automation, comms, taxonomy, process_map) must use 4 spaces
4. Use plain quoted strings — never use YAML block scalars (> or |) for multi-line text
5. Null values: write null (not "", not ~)

EXACT SCHEMA (copy this structure):

process:
  name: "string"
  domain: "Banking"
  description: "1-3 sentences as a single quoted string"
  team_owner:
    - CS
  volume_tier: High
  user_tools:
    - Atlas
  jira_boards:
    - BOPSIT
  automation:
    atlas_copilot: false
    decagon_l0: false
    l0_containable: false
    containment_blocker: "string or null"
    workato: false
    workato_recipe_link: null
  comms:
    outbound:
      - Manual
    spoofable_risk: High
    client_comms_example: null
  taxonomy:
    ops_domains: []
    cx_ticket_driver: "string"
    other_metrics: "string or null"
  process_map:
    nodes:
      - id: n1
        type: start
        label: "string"
        lane: CS
        time_estimate: "1-2 min"
        position:
          x: 150
          y: 0
    edges:
      - id: e1
        source: n1
        target: n2
        label: "Yes — condition"

VALID VALUES:
- domain: Banking | Transfers | Invest | Security & Risk
- team_owner items: CS | Ops | Fraud Ops | L2 - Risk
- volume_tier: High | Medium | Low
- user_tools items: Atlas | Persona | OAS | JIRA | Google Sheets | DOCX
- jira_boards items: BOPSIT | BOPSFUND | EOC | BOSM | BOTAX | WORP | BOAO | LEDGE | DAM | FRAUD | DOCX
- outbound items: None | Manual | Workato | Auto Comms | Docusign
- spoofable_risk: High | Medium | Low | N/A
- ops_domains items: C&B | I&O | I&C | C&D (Security & Risk pod only — use [] for all others)
- node type: start | end | step | decision | automation | comms
- node lane: CS | Ops | Fraud Ops | L2 - Risk | Automation | Client

NODE TYPE DEFINITIONS — critical, do not confuse:
- step: ANY action performed by a human agent, even if using a tool. Atlas Copilot, OAS, Persona, i2c Portal, JIRA are tools agents use — actions in them are ALWAYS step nodes in the agent's lane.
- automation: ONLY system actions with NO human involved: Workato recipe, Decagon bot, Braze auto-send. If a human initiates it → step, not automation.
- decision: agent evaluates a condition and chooses a path (Yes/No branch).
- comms: ONLY macros or messages sent DIRECTLY TO THE CLIENT. Internal triage macros (any macro with "Triage Notes") are step nodes in CS/Ops — never comms. Example: "Send Credit Card::Unblocking::PIN Instructions macro" = comms. "Send Level 1::Triage Notes: Credit Card macro" = step in CS lane.
- start: entry point. Always lane: CS.
- end: final resolution. Always lane: CS.

PROCESS MAP RULES:
- NODE COUNT: aim for 5-8 nodes per lane maximum. Combine related sequential actions into one node. Do not create a node for every sub-bullet in the source.
- Always start with a start node (lane: CS) and end with an end node (lane: CS).
- step/decision nodes → use the lane of the team PERFORMING the action (CS = L1/L1 24/7, Ops = L2 back-office, L2 - Risk = Security Risk L2).
- AGENT TIER PREFIX: prefix every step/decision label with the agent tier — e.g. "L1 24/7: Perform enhanced verification", "L2 Ops: Reset PIN counter", "L1: Confirm issue is blocked card".
- automation nodes → always lane: Automation.
- comms nodes → always lane: Client.
- Position x: start at 150, increment ~200 per step. Position y: set to 0 — the tool auto-computes layout from graph topology.
- containment_blocker must be specific (not "not ready yet").
- If outbound includes Manual, default spoofable_risk to High.
- STRICT FIDELITY: ONLY create nodes explicitly described by the user. Do NOT infer steps. Do NOT add nodes for things the user didn't mention.
- DECISION NODES — CRITICAL: ONLY add a decision node if the user EXPLICITLY describes a Yes/No branch, a conditional check, or a fork in the flow. Do NOT infer decision nodes from ambiguous language. If unsure, use a step node and ask the user if they want a decision branch added.
- DECISION EDGES: every edge from a decision node MUST have a label (e.g. "Yes — passed", "No — failed"). Unlabelled decision edges are unusable.
- KEEP IT SIMPLE: when in doubt, use step nodes. A clean linear flow with a few steps is far more useful than a complex decision tree the user didn't ask for.
- EDITING AN EXISTING PROCESS: Use PATCH MODE — never regenerate the full YAML. The tool merges your patch automatically.`

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type FormFillPatch = Partial<Omit<ProcessEntry, 'id' | 'submittedBy' | 'submittedAt' | 'notionPageUrl' | 'status' | 'lastReviewed' | 'docReview'>>

function parseYamlPatch(raw: string): FormFillPatch | null {
  const stripped = raw.replace(/^```(?:ya?ml)?\s*/i, '').replace(/\s*```$/, '').trim()
  const result = fromYaml(stripped)
  return result as FormFillPatch | null
}

export async function streamFormFill(opts: {
  description: string
  history?: AiMessage[]       // conversation history for multi-turn context
  currentEntry?: ProcessEntry // current form state — AI makes targeted edits, not full rewrites
  onChunk: (raw: string, patch: FormFillPatch | null) => void
  signal?: AbortSignal
}): Promise<FormFillPatch | null> {
  if (typeof MagicAI === 'undefined') {
    throw new Error('MagicAI not available — deploy via `magic put` to use AI Fill.')
  }

  // Build message array with full conversation history for multi-turn refinement
  const historyMessages = (opts.history ?? []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.text,
  }))

  // Inject current form state as context so AI makes targeted edits, not full rewrites
  const currentStateContext = opts.currentEntry
    ? `\n\nCURRENT FORM STATE (the existing process — edit this, do not replace it wholesale):\n\`\`\`\n${toYaml(opts.currentEntry)}\n\`\`\`\nWhen generating YAML, start from this existing state and apply only the requested changes. Preserve all fields the user did not ask to change.`
    : ''

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT + currentStateContext },
    ...historyMessages,
    { role: 'user' as const, content: opts.description.trim() },
  ]

  let full = ''
  for await (const chunk of MagicAI.stream({ model: 'bedrock-claude-sonnet-4-6', messages, signal: opts.signal })) {
    if (opts.signal?.aborted) break
    full += chunk
    opts.onChunk(full, parseYamlPatch(full))
  }
  return parseYamlPatch(full)
}
