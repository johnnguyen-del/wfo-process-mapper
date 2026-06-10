import { useState } from 'react'
import type { ProcessMap, SwimLane } from '@/lib/types'
import { CheckCircle, XCircle, MinusCircle, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadIdealFlowReferences } from '@/lib/idealFlows'
import type { IdealFlowReference } from '@/lib/idealFlows'

interface MapQualityChecklistProps {
  processMap: ProcessMap
  activeLanes: SwimLane[]
  domain?: string
}

export default function MapQualityChecklist({ processMap, activeLanes, domain }: MapQualityChecklistProps) {
  // Hooks must be first — before any derived values or early returns
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'reference'>('ai')
  const [references, setReferences] = useState<IdealFlowReference[]>([])
  const [loadingRefs, setLoadingRefs] = useState(false)

  const nodes = processMap.nodes
  const populatedLanes = new Set(nodes.map((n) => n.lane))
  const hasDecisions = nodes.some((n) => n.type === 'decision')
  const hasAutomation = nodes.some((n) => n.type === 'automation')

  // Automation is N/A (not a failure) when there are no Workato/Decagon steps in the process —
  // many manual processes correctly have zero automation nodes.
  const automationNA = nodes.length > 0 && !hasAutomation &&
    nodes.filter((n) => n.type !== 'start' && n.type !== 'end' && n.type !== 'comms').length > 0

  const criteria: { label: string; met: boolean; na?: boolean; hint: string }[] = [
    {
      label: 'Swimlanes per team',
      met: populatedLanes.size >= 2,
      hint: `${populatedLanes.size} lane(s) populated`,
    },
    {
      label: 'Time estimates',
      met: nodes.some((n) => !!n.timeEstimate),
      hint: 'Click a node to set',
    },
    {
      label: 'Automation markers',
      met: hasAutomation,
      na: automationNA,
      hint: automationNA ? 'N/A — no automated steps' : 'Add an Automation node',
    },
    {
      label: 'Decision points',
      met: hasDecisions,
      hint: 'Add a Decision node',
    },
    {
      label: 'Client comms',
      met: nodes.some((n) => n.type === 'comms'),
      hint: 'Add a Comms node',
    },
  ]

  const applicable = criteria.filter((c) => !c.na)
  const metCount = applicable.filter((c) => c.met).length

  async function fetchSuggestions() {
    // Strip characters that could confuse JSON parsing of the response
    const stepLabels = nodes
      .filter(n => n.type !== 'start' && n.type !== 'end')
      .map(n => n.label.replace(/["\\[\]]/g, ' ').trim())
      .filter(Boolean)

    if (stepLabels.length === 0) {
      setSuggestions(['Add process step nodes to get suggestions.'])
      setShowSuggestions(true)
      return
    }

    setLoadingSuggestions(true)
    setSuggestions([])
    setShowSuggestions(true)

    try {
      const prompt = `You are reviewing a business process map. Here are the step labels:\n${stepLabels.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\nProvide 3-5 concrete suggestions to improve the clarity, brevity, or efficiency of this process map. Focus on:\n- Label wording (should be action-verb + subject, max 5 words)\n- Missing steps that are commonly needed\n- Redundant or combined steps\n\nReturn ONLY a JSON array of strings, no other text. Example: ["Suggestion 1", "Suggestion 2"]`

      let buffer = ''
      const stream = await (window as any).MagicAI?.stream({ prompt, maxTokens: 500 })
      if (stream) {
        for await (const chunk of stream) {
          buffer += chunk
        }
      }

      // Extract JSON array from response
      const match = buffer.match(/\[[\s\S]*\]/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setSuggestions(Array.isArray(parsed) ? parsed : ['Could not parse suggestions.'])
      } else {
        setSuggestions(['Could not generate suggestions. Try again.'])
      }
    } catch {
      setSuggestions(['AI suggestions unavailable. Check your connection.'])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function fetchReferences() {
    setLoadingRefs(true)
    try {
      const refs = await loadIdealFlowReferences(domain)
      setReferences(refs)
    } finally {
      setLoadingRefs(false)
    }
  }

  const SHORT_LABELS: Record<string, string> = {
    'Swimlanes per team': 'Swimlanes',
    'Time estimates': 'Times',
    'Automation markers': 'Auto',
    'Decision points': 'Decisions',
    'Client comms': 'Comms',
  }

  return (
    <div className="border-t shrink-0">
      {/* Existing checklist bar */}
      <div className="bg-muted/20 px-2 py-2 flex items-center gap-3 overflow-x-auto">
        <span className="text-[10px] font-medium text-muted-foreground shrink-0">
          {metCount}/{applicable.length}
        </span>
        <div className="flex gap-2 flex-1">
          {criteria.map((c) => (
            <div key={c.label} className="flex items-center gap-1 text-[10px] shrink-0">
              {c.na ? (
                <MinusCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
              ) : c.met ? (
                <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-muted-foreground/60 shrink-0" />
              )}
              <span
                title={`${c.label}: ${c.hint}`}
                className={cn(
                  c.na ? 'text-muted-foreground/50 line-through' :
                  c.met ? 'text-foreground' : 'text-muted-foreground',
                  'whitespace-nowrap'
                )}
              >
                {SHORT_LABELS[c.label] ?? c.label}
              </span>
            </div>
          ))}
        </div>
        {/* Optimization Suggestions button — right side */}
        <button
          onClick={loadingSuggestions ? undefined : (showSuggestions ? () => setShowSuggestions(false) : () => { setShowSuggestions(true); fetchSuggestions(); fetchReferences() })}
          disabled={loadingSuggestions}
          className="flex items-center gap-1.5 text-[11px] text-violet-600 hover:text-violet-700 font-medium shrink-0 disabled:opacity-50"
          title="Get optimization suggestions"
        >
          {loadingSuggestions
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Sparkles className="w-3 h-3" />}
          {loadingSuggestions ? 'Analyzing…' : showSuggestions ? 'Hide' : 'Suggestions'}
        </button>
      </div>

      {/* Suggestions panel — tabbed: AI + Reference */}
      {showSuggestions && (
        <div className="bg-violet-50 border-t border-violet-100 px-4 py-3">
          {/* Tab bar */}
          <div className="flex gap-1 mb-2 border-b border-violet-200">
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                'text-xs px-2 py-1 border-b-2 transition-colors',
                activeTab === 'ai'
                  ? 'border-violet-500 text-violet-600 font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              ✦ AI
            </button>
            <button
              onClick={() => setActiveTab('reference')}
              className={cn(
                'text-xs px-2 py-1 border-b-2 transition-colors',
                activeTab === 'reference'
                  ? 'border-violet-500 text-violet-600 font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              📚 Reference ({references.length})
            </button>
            <button
              onClick={() => setShowSuggestions(false)}
              className="ml-auto text-muted-foreground hover:text-foreground text-xs leading-none pb-1"
            >
              ✕
            </button>
          </div>

          {/* AI tab */}
          {activeTab === 'ai' && (
            loadingSuggestions ? (
              <div className="text-[11px] text-violet-500">Analyzing your process map…</div>
            ) : (
              <ul className="space-y-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-violet-800">
                    <span className="text-violet-400 shrink-0">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* Reference tab */}
          {activeTab === 'reference' && (
            loadingRefs ? (
              <div className="text-[11px] text-muted-foreground">Loading reference flows…</div>
            ) : references.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                No ideal flows found{domain ? ` for ${domain}` : ''}. Create an Ideal Flow (✦ Ideal mode) on any process to add it as a reference.
              </p>
            ) : (
              <div className="space-y-1.5">
                {references.map(ref => (
                  <a
                    key={ref.id}
                    href={`#/edit/${ref.id}`}
                    className="block border rounded p-2 hover:bg-muted/40 transition-colors text-[11px]"
                  >
                    <div className="font-medium truncate">{ref.processName}</div>
                    <div className="text-muted-foreground">{ref.domain} · {ref.nodeCount} steps in ideal flow</div>
                  </a>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
