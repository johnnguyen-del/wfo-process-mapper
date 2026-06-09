export type Domain = 'Banking' | 'Transfers' | 'Invest' | 'Security & Risk'
export type TeamOwner = 'CS' | 'Ops' | 'Fraud Ops' | 'L2 - Risk'
export type VolumeTier = 'High' | 'Medium' | 'Low'
export type UserTool = 'Atlas' | 'Persona' | 'OAS' | 'JIRA' | 'Google Sheets' | 'DOCX'
export type JiraBoard = 'BOPSIT' | 'BOPSFUND' | 'EOC' | 'BOSM' | 'BOTAX' | 'WORP' | 'BOAO' | 'LEDGE' | 'DAM' | 'FRAUD' | 'DOCX'
export type OutboundComm = 'None' | 'Manual' | 'Workato' | 'Auto Comms' | 'Docusign'
export type SpoofableRisk = 'High' | 'Medium' | 'Low' | 'N/A'
export type OpsDomain = 'C&B' | 'I&O' | 'I&C' | 'C&D'
export type ProcessNodeType = 'start' | 'end' | 'step' | 'decision' | 'automation' | 'comms'
export type SwimLane = 'CS' | 'Ops' | 'Fraud Ops' | 'L2 - Risk' | 'Automation' | 'Client'

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
}

export interface ProcessEdge {
  id: string
  source: string
  target: string
  label?: string
}

export type CanvasDirection = 'LR' | 'TB'
export type LineStyle = 'default' | 'step'

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

  // Meta
  submittedBy: string
  submittedAt: string
  notionPageUrl: string | null
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
    submittedBy: '',
    submittedAt: '',
    notionPageUrl: null,
    status: 'draft',
  }
}
