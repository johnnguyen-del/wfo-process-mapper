import { useRef, useState } from 'react'
import { Sparkles, Send, Trash2, CheckCircle, AlertCircle, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamFormFill, parsePatch, type AiMessage, type FormFillPatch, type MapPatch } from '@/lib/ai'
import type { ProcessEntry, ProcessNode, ProcessEdge } from '@/lib/types'
import { fromYaml, autoLayout } from '@/lib/export'
import { cn } from '@/lib/utils'

/** Merges a targeted MapPatch against the current entry's processMap. Returns a full FormFillPatch. */
function applyMapPatch(mapPatch: MapPatch, entry?: ProcessEntry): FormFillPatch {
  // Field-only patch — no structural changes needed
  const hasStructural = (mapPatch.addNodes?.length ?? 0) > 0
    || (mapPatch.removeNodeIds?.length ?? 0) > 0
    || (mapPatch.addEdges?.length ?? 0) > 0
    || (mapPatch.removeEdgeIds?.length ?? 0) > 0

  if (!hasStructural) {
    return { ...(mapPatch.updateFields ?? {}) }
  }

  const existing = entry?.processMap ?? { nodes: [], edges: [] }
  let nodes: ProcessNode[] = [...existing.nodes]
  let edges: ProcessEdge[] = [...existing.edges]

  const maxNodeNum = nodes.reduce((max, n) => {
    const num = parseInt(n.id.replace(/\D/g, ''), 10)
    return isNaN(num) ? max : Math.max(max, num)
  }, 0)

  const newNodeIds: string[] = []

  if (mapPatch.addNodes) {
    mapPatch.addNodes.forEach((n: any, i: number) => {
      const id = `n${maxNodeNum + i + 1}`
      newNodeIds.push(id)
      nodes.push({
        id,
        type: n.type ?? 'step',
        label: n.label ?? '',
        lane: n.lane ?? 'CS',
        timeEstimate: n.time_estimate ?? n.timeEstimate,
        position: { x: 0, y: 0 },
      } as ProcessNode)
    })
  }

  if (mapPatch.removeNodeIds?.length) {
    const rm = new Set(mapPatch.removeNodeIds)
    nodes = nodes.filter(n => !rm.has(n.id))
    edges = edges.filter(e => !rm.has(e.source) && !rm.has(e.target))
  }

  if (mapPatch.addEdges?.length) {
    const maxEdgeNum = edges.reduce((max, e) => {
      const num = parseInt(e.id.replace(/\D/g, ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    const resolve = (ref?: string) =>
      ref?.startsWith('new_')
        ? newNodeIds[parseInt(ref.replace('new_', ''), 10) - 1] ?? ref
        : ref ?? ''
    mapPatch.addEdges.forEach((e: any, i: number) => {
      edges.push({ id: `e${maxEdgeNum + i + 1}`, source: resolve(e.source), target: resolve(e.target), label: e.label })
    })
  }

  if (mapPatch.removeEdgeIds?.length) {
    const rm = new Set(mapPatch.removeEdgeIds)
    edges = edges.filter(e => !rm.has(e.id))
  }

  const laidOutNodes = autoLayout(nodes, edges, 'LR')

  return {
    ...(mapPatch.updateFields ?? {}),
    processMap: { nodes: laidOutNodes, edges },
  }
}

interface AiChatPanelProps {
  onApply: (patch: FormFillPatch) => void
  viewMode?: string
  currentEntry?: ProcessEntry  // current form state so AI makes targeted edits
  onApplyToCanvas?: (patch: FormFillPatch, target: 'current' | 'interim' | 'ideal') => void
}

export default function AiChatPanel({ onApply, viewMode, currentEntry, onApplyToCanvas }: AiChatPanelProps) {
  const [mode, setMode] = useState<'stream' | 'paste'>('stream')
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [pasteInput, setPasteInput] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pastePreview, setPastePreview] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [lastPatch, setLastPatch] = useState<FormFillPatch | null>(null)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingPatch, setPendingPatch] = useState<FormFillPatch | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    const userMsg: AiMessage = { id: `u${Date.now()}`, role: 'user', text }
    const assistantMsg: AiMessage = { id: `a${Date.now()}`, role: 'assistant', text: '' }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    setLastPatch(null)
    setApplied(false)
    setError(null)
    abortRef.current = new AbortController()
    try {
      const history = messages
      let fullText = ''
      const patch = await streamFormFill({
        description: text,
        history,
        currentEntry,
        signal: abortRef.current.signal,
        onChunk: (raw, parsed) => {
          fullText = raw
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, text: raw } : m))
          )
          if (parsed) setLastPatch(parsed)
        },
      })
      if (patch) {
        setLastPatch(patch)
      } else {
        // Try patch: format (targeted edit — much smaller than full YAML)
        const mapPatch = parsePatch(fullText)
        if (mapPatch) setLastPatch(applyMapPatch(mapPatch, currentEntry))
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message ?? 'Something went wrong.')
      }
    } finally {
      setStreaming(false)
    }
  }

  function handlePasteApply() {
    setPasteError(null)
    const raw = pasteInput.trim()
    if (!raw) { setPasteError('Paste the YAML from Claude first.'); return }

    // Try YAML first (canonical format), fall back to JSON for backwards compat
    const stripped = raw.replace(/^```(?:ya?ml|json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let parsed: FormFillPatch | null = null

    // Detect YAML (starts with "process:" key) vs JSON
    if (stripped.startsWith('process:') || stripped.startsWith('---')) {
      parsed = fromYaml(stripped) as FormFillPatch | null
      if (!parsed) {
        setPasteError('Could not parse YAML — check the output starts with "process:" and matches the schema.')
        return
      }
    } else {
      try {
        parsed = JSON.parse(stripped) as FormFillPatch
      } catch {
        setPasteError('Paste a YAML block starting with "process:" or a valid JSON object.')
        return
      }
    }

    const name = (parsed as any).processName
    const nodeCount = (parsed as any).processMap?.nodes?.length ?? 0
    if (!name) {
      setPasteError('Parsed but no processName found — check you copied the full output.')
      return
    }
    try {
      if (viewMode === 'compare') {
        setPendingPatch(parsed)
        return
      }
      onApply(parsed)
      setApplied(true)
      setPasteInput('')
      setPastePreview(`✓ Applied "${name}" — ${nodeCount} map nodes`)
    } catch (err: any) {
      setPasteError(`Apply failed: ${err?.message ?? 'unknown error'} — check the browser console.`)
    }
  }

  function handleApply() {
    if (!lastPatch) return
    if (viewMode === 'compare') {
      setPendingPatch(lastPatch)
      return
    }
    onApply(lastPatch)
    setApplied(true)
  }

  function handleClear() {
    abortRef.current?.abort()
    setMessages([])
    setLastPatch(null)
    setApplied(false)
    setError(null)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Canvas selector — shown in compare mode after applying */}
      {pendingPatch && (
        <div className="border-t p-3 bg-violet-50 shrink-0">
          <p className="text-xs font-medium text-violet-700 mb-2">Apply to which canvas?</p>
          <div className="flex flex-col gap-1.5">
            {([
              { id: 'current', label: 'Current Flow' },
              { id: 'interim', label: '⚡ Interim Fixed' },
              { id: 'ideal', label: '✦ Long-term Ideal' },
            ] as { id: 'current' | 'interim' | 'ideal'; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  onApplyToCanvas?.(pendingPatch, id)
                  setPendingPatch(null)
                  setApplied(true)
                }}
                className="text-xs text-left px-3 py-1.5 rounded border bg-white hover:bg-violet-50 transition-colors font-medium"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setPendingPatch(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Header + mode tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-violet-500" />
          AI Form Fill
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('stream')}
            className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', mode === 'stream' ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground/40')}
          >
            Auto-fill
          </button>
          <button
            onClick={() => setMode('paste')}
            className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors', mode === 'paste' ? 'bg-foreground text-background border-foreground' : 'text-muted-foreground border-border hover:border-foreground/40')}
          >
            Paste YAML
          </button>
        </div>
      </div>

      {mode === 'paste' ? (
        // ── Paste YAML mode ────────────────────────────────────────────────
        <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3 min-h-0">
          <div className="text-sm text-muted-foreground space-y-1.5 shrink-0">
            <p className="text-xs">Generate YAML at the <a href="https://llm.w10e.com/?model=process-mapping-assistant-" target="_blank" rel="noreferrer" className="underline hover:text-foreground font-medium text-foreground">Process Mapping Assistant ↗</a>, then paste here and click Apply.</p>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">Copy prompt for Claude →</summary>
              <div className="mt-2 bg-muted/50 rounded p-2 font-mono text-[10px] leading-relaxed select-all whitespace-pre-wrap">
{`You are a process mapping assistant for Wealthsimple's Workflow Optimization team.

Output ONLY valid YAML — no explanation, no markdown fences. Must start with "process:".

process:
  name: string                          # e.g. "Metal Card Reissuance — Client Request"
  domain: Banking|Transfers|Invest|Security & Risk
  description: string                   # 1-3 sentences: trigger, action, resolution
  team_owner: [CS, Ops, Fraud Ops, L2 - Risk]
  volume_tier: High|Medium|Low
  user_tools: [Atlas, Persona, OAS, JIRA, Google Sheets, DOCX]
  jira_boards: [BOPSIT, BOPSFUND, EOC, BOSM, BOTAX, WORP, BOAO, LEDGE, DAM, FRAUD, DOCX]
  automation:
    atlas_copilot: bool
    decagon_l0: bool
    l0_containable: bool
    containment_blocker: string         # required if l0_containable true + decagon_l0 false
    workato: bool
    workato_recipe_link: string
  comms:
    outbound: [None, Manual, Workato, Auto Comms, Docusign]
    spoofable_risk: High|Medium|Low|N/A
    client_comms_example: string
  taxonomy:
    ops_domains: [C&B, I&O, I&C, C&D]  # Security & Risk only, else []
    cx_ticket_driver: string
    other_metrics: string
  process_map:
    nodes:
      - id: n1
        type: start|end|step|decision|automation|comms
        label: string
        lane: CS|Ops|Fraud Ops|L2 - Risk|Automation|Client
        time_estimate: string           # optional e.g. "2-5 min"
        position:
          x: 150                        # start=150, add ~200 per step
          y: 60                         # CS=60 Ops=220 Fraud Ops=380 L2-Risk=540 Automation=700 Client=860
    edges:
      - id: e1
        source: n1
        target: n2
        label: string                   # optional

Rules:
- Always include a start node (lane: CS) and an end node
- step/decision → acting team lane; automation → Automation; comms → Client
- containment_blocker must be specific, not "not ready yet"
- Use null for unknown optional fields

Process description:
[DESCRIBE YOUR PROCESS HERE]`}
              </div>
            </details>
          </div>

          <Textarea
            value={pasteInput}
            onChange={(e) => { setPasteInput(e.target.value); setPasteError(null); setApplied(false) }}
            placeholder={'Paste YAML from the Process Mapping Assistant here…\n\nprocess:\n  name: ...\n  domain: ...'}
            className="resize-none text-xs font-mono flex-1 min-h-0"
          />

          {pasteError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {pasteError}
            </p>
          )}

          {pastePreview && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {pastePreview} — form + canvas updated
            </p>
          )}

          <Button onClick={handlePasteApply} disabled={!pasteInput.trim()} className="gap-1.5">
            <ClipboardPaste className="w-3.5 h-3.5" />
            Apply to form
          </Button>
        </div>
      ) : (
        // ── Auto-fill (MagicAI streaming) mode ────────────────────────────
        <>
          <ScrollArea className="flex-1 px-4 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Describe a process and I'll help you map it. I'll ask clarifying questions first, then generate the form fields and canvas map when you're ready.</p>
                <p className="text-xs bg-muted/40 rounded-lg p-3 leading-relaxed">
                  <strong className="text-foreground">Example:</strong> "Metal card reissuance — client requests a replacement. CS verifies identity, submits a JIRA ticket, client gets the card in 7–10 days."
                </p>
                <p className="text-xs text-muted-foreground">Say <strong className="text-foreground">"generate"</strong> or <strong className="text-foreground">"fill it in"</strong> when ready to create the map.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={cn('text-sm', m.role === 'user' ? 'text-right' : 'text-left')}>
                    {m.role === 'user' ? (
                      <span className="inline-block bg-foreground text-background rounded-2xl rounded-tr-sm px-3 py-2 text-xs max-w-[85%]">
                        {m.text}
                      </span>
                    ) : (
                      <div className="rounded-2xl rounded-tl-sm px-3 py-2 text-xs max-w-full bg-muted/40">
                        {!m.text
                          ? <span className="animate-pulse text-muted-foreground">Thinking…</span>
                          : (m.text.trimStart().startsWith('process:') || m.text.trimStart().startsWith('patch:'))
                            // YAML / patch output — monospace code block
                            ? <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">{m.text}</pre>
                            // Conversational — render markdown (bold, lists, etc.)
                            : <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                className="leading-relaxed space-y-1.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-1 last:[&_p]:mb-0"
                              >
                                {m.text}
                              </ReactMarkdown>
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {lastPatch && !streaming && (
            <div className={cn('mx-4 mb-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2 border', applied ? 'bg-green-50 border-green-200 text-green-800' : 'bg-violet-50 border-violet-200 text-violet-800')}>
              {applied ? (
                <><CheckCircle className="w-3.5 h-3.5 shrink-0" /><span>Applied — switch to <strong>Form</strong> to review</span></>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 shrink-0" /><span className="flex-1">Fields ready</span><Button size="sm" onClick={handleApply} className="h-6 px-2 text-[11px] bg-violet-600 hover:bg-violet-700">Apply to form</Button></>
              )}
            </div>
          )}

          {error && (
            <div className="mx-4 mb-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error} <button onClick={() => setMode('paste')} className="underline ml-1">Use Paste YAML instead →</button></span>
            </div>
          )}

          <div className="px-4 pb-4 pt-2 shrink-0 border-t">
            {hasMessages && (
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={streaming} className="mb-2 h-7 px-2 text-xs w-full justify-start text-muted-foreground">
                <Trash2 className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
            <div className="flex gap-2">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }} placeholder="Describe the process, or say 'generate' when ready to create the map…" rows={3} className="resize-none text-sm" disabled={streaming} />
              <Button size="sm" onClick={handleSend} disabled={!input.trim() || streaming} className="self-end"><Send className="w-3.5 h-3.5" /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">↵ to send · Shift+↵ for new line</p>
          </div>
        </>
      )}
    </div>
  )
}
