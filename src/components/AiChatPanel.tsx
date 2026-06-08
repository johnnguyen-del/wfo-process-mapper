import { useRef, useState } from 'react'
import { Sparkles, Send, Trash2, CheckCircle, AlertCircle, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { streamFormFill, type AiMessage, type FormFillPatch } from '@/lib/ai'
import { fromYaml } from '@/lib/export'
import { cn } from '@/lib/utils'

interface AiChatPanelProps {
  onApply: (patch: FormFillPatch) => void
}

export default function AiChatPanel({ onApply }: AiChatPanelProps) {
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
      const patch = await streamFormFill({
        description: text,
        signal: abortRef.current.signal,
        onChunk: (raw, parsed) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, text: raw } : m))
          )
          if (parsed) setLastPatch(parsed)
        },
      })
      if (patch) setLastPatch(patch)
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
                <p>Describe a process in plain English and Claude will fill in all the inventory fields for you.</p>
                <p className="text-xs bg-muted/40 rounded-lg p-3 leading-relaxed">
                  <strong className="text-foreground">Example:</strong> "Metal card reissuance — client calls in requesting a replacement metal card. CS agent verifies identity in Atlas, submits a BOPSIT JIRA ticket. Client receives new card in 7–10 days. High volume, manual comms only."
                </p>
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
                      <div className="bg-muted/40 rounded-2xl rounded-tl-sm px-3 py-2 text-xs font-mono leading-relaxed max-w-full whitespace-pre-wrap break-all">
                        {m.text || <span className="animate-pulse text-muted-foreground">Thinking…</span>}
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
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }} placeholder="Describe the process…" rows={3} className="resize-none text-sm" disabled={streaming} />
              <Button size="sm" onClick={handleSend} disabled={!input.trim() || streaming} className="self-end"><Send className="w-3.5 h-3.5" /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">⌘↵ to send</p>
          </div>
        </>
      )}
    </div>
  )
}
