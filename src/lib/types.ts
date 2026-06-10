export type Domain = 'Banking' | 'Transfers' | 'Invest' | 'Security & Risk' | 'PRR' | (string & {})
export type TeamOwner = 'CS' | 'Ops' | 'Fraud Ops' | 'L2 - Risk' | (string & {})
export type VolumeTier = 'High' | 'Medium' | 'Low'
export type UserTool = 'Atlas' | 'Persona' | 'OAS' | 'JIRA' | 'Google Sheets' | 'DOCX' | (string & {})
export type JiraBoard = 'BOPSIT' | 'BOPSFUND' | 'EOC' | 'BOSM' | 'BOTAX' | 'WORP' | 'BOAO' | 'LEDGE' | 'DAM' | 'FRAUD' | 'DOCX' | (string & {})
export type OutboundComm = 'None' | 'Manual' | 'Workato' | 'Auto Comms' | 'Docusign' | (string & {})
export type SpoofableRisk = 'High' | 'Medium' | 'Low' | 'N/A'
export type OpsDomain = 'C&B' | 'I&O' | 'I&C' | 'C&D' | (string & {})
export type ProcessNodeType = 'start' | 'end' | 'step' | 'decision' | 'automation' | 'comms' | 'swimlane' | 'sticky'
export type SwimLane = 'CS' | 'Ops' | 'Fraud Ops' | 'L2 - Risk' | 'Automation' | 'Client'

export interface KbLink {
  id: string               // use crypto.randomUUID() when creating
  type: 'guru' | 'notion' | 'gdoc' | 'custom'
  url: string
  title?: string
}

export interface EditLogEntry {
  by: string           // editor email
  at: string           // ISO timestamp
  action: 'saved' | 'submitted'
  changed?: string[]   // friendly field names e.g. ['Process Name', 'Domain']
}

export interface FolderEntry {
  id: string
  name: string
  parentId?: string        // undefined = root folder
  createdAt: string
}

export interface ProcessNode {
  id: string
  type: ProcessNodeType
  label: string
  lane: SwimLane
  timeEstimate?: string
  durationMinutes?: number
  position: { x: number; y: number }
  badge?: {
    status?: 'active' | 'review' | 'deprecated'
    priority?: 'high' | 'medium' | 'low'
    ownerNote?: string
  }
  attachments?: KbLink[]
  nodeColor?: string    // hex color — swimlane background or sticky note colour
  nodeWidth?: number    // px — stored after NodeResizer drag (swimlane only)
  nodeHeight?: number   // px — stored after NodeResizer drag (swimlane only)
  locked?: boolean     // when true: not draggable, not deletable
}

export interface ProcessEdge {
  id: string
  source: string
  target: string
  label?: string
}

export type CanvasDirection = 'LR' | 'TB'
export type LineStyle = 'default' | 'step'
export type ViewMode = 'current' | 'optimization' | 'compare'

export interface ProcessMap {
  nodes: ProcessNode[]
  edges: ProcessEdge[]
}

export interface ProcessEntry {
  id: string

  // Core Identity
  processName: string
  domain: Domain | ''
  description: string
  teamOwner: TeamOwner[]

  // Volume & Tooling
  volumeTier: VolumeTier | ''
  userTools: UserTool[]
  jiraBoards: JiraBoard[]

  // Automation State
  atlasCopilot: boolean
  decagonL0: boolean
  l0Containable: boolean
  containmentBlocker: string
  workato: boolean
  workatoRecipeLink: string

  // Comms & Fraud Risk
  outboundComms: OutboundComm[]
  spoofableRisk: SpoofableRisk | ''
  clientComms: string

  // Taxonomy & Admin
  opsDomains: OpsDomain[]
  cxTicketDriver: string
  lastReviewed: string
  docReview: boolean
  otherMetrics: string

  // Process Map
  processMap: ProcessMap
  optimizationMap?: ProcessMap   // stores the "ideal flow" canvas for Mirror Mode

  // Integrations & Organization
  sourceUrl?: string         // "Blowout Link" — original process source
  kbLinks?: KbLink[]         // process-level knowledge base links
  folderId?: string          // organizational folder ID

  // Meta
  submittedBy: string
  submittedAt: string
  notionPageUrl: string | null
  author?: string            // email — set on first save, never overwritten
  collaborators?: string[]   // all editors deduped
  editLog?: EditLogEntry[]   // newest first
  deletedAt?: string         // ISO timestamp — set on soft delete, absent = active
  status: 'draft' | 'submitted'
}

export function emptyEntry(id: string): ProcessEntry {
  return {
    id,
    processName: '',
    domain: '',
    description: '',
    teamOwner: [],
    volumeTier: '',
    userTools: [],
    jiraBoards: [],
    atlasCopilot: false,
    decagonL0: false,
    l0Containable: false,
    containmentBlocker: '',
    workato: false,
    workatoRecipeLink: '',
    outboundComms: [],
    spoofableRisk: '',
    clientComms: '',
    opsDomains: [],
    cxTicketDriver: '',
    lastReviewed: '',
    docReview: false,
    otherMetrics: '',
    processMap: { nodes: [], edges: [] },
    optimizationMap: undefined,
    sourceUrl: undefined,
    kbLinks: undefined,
    folderId: undefined,
    submittedBy: '',
    submittedAt: '',
    notionPageUrl: null,
    author: undefined,
    collaborators: undefined,
    editLog: undefined,
    status: 'draft',
  }
}
