import type { ProcessMap, SwimLane } from '@/lib/types'
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapQualityChecklistProps {
  processMap: ProcessMap
  activeLanes: SwimLane[]
}

export default function MapQualityChecklist({ processMap, activeLanes }: MapQualityChecklistProps) {
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

  return (
    <div className="border-t bg-muted/20 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
        Map quality: {metCount}/{applicable.length}
      </span>
      <div className="flex gap-3">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-1 text-[11px] shrink-0">
            {c.na ? (
              <MinusCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            ) : c.met ? (
              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            )}
            <span className={cn(
              c.na ? 'text-muted-foreground/50 line-through' :
              c.met ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
