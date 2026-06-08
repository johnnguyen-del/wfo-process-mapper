import type { ProcessMap, SwimLane } from '@/lib/types'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MapQualityChecklistProps {
  processMap: ProcessMap
  activeLanes: SwimLane[]
}

export default function MapQualityChecklist({ processMap, activeLanes }: MapQualityChecklistProps) {
  const nodes = processMap.nodes
  const populatedLanes = new Set(nodes.map((n) => n.lane))

  const criteria = [
    {
      label: 'Swimlanes per team',
      met: populatedLanes.size >= 2,
      hint: `${populatedLanes.size} lane(s) populated`,
    },
    {
      label: 'Time estimates on nodes',
      met: nodes.some((n) => !!n.timeEstimate),
      hint: 'Set via node edit (double-click)',
    },
    {
      label: 'Automation markers',
      met: nodes.some((n) => n.type === 'automation'),
      hint: 'Add an Automation node',
    },
    {
      label: 'Decision points shown',
      met: nodes.some((n) => n.type === 'decision'),
      hint: 'Add a Decision node',
    },
    {
      label: 'Client comms labelled',
      met: nodes.some((n) => n.type === 'comms'),
      hint: 'Add a Comms node',
    },
  ]

  const metCount = criteria.filter((c) => c.met).length

  return (
    <div className="border-t bg-muted/20 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
        Map quality: {metCount}/{criteria.length}
      </span>
      <div className="flex gap-3">
        {criteria.map((c) => (
          <div key={c.label} className="flex items-center gap-1 text-[11px] shrink-0">
            {c.met ? (
              <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-3 h-3 text-muted-foreground/60 shrink-0" />
            )}
            <span className={cn(c.met ? 'text-foreground' : 'text-muted-foreground')}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
