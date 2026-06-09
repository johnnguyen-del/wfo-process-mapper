// src/components/canvas/CanvasLegend.tsx
import { LANE_COLORS, LANE_LABEL_COLORS } from './ProcessCanvas'
import type { SwimLane } from '@/lib/types'

const NODE_LEGEND = [
  { color: '#f97316', label: 'Start / End' },
  { color: '#3b82f6', label: 'Step' },
  { color: '#a855f7', label: 'Decision' },
  { color: '#10b981', label: 'Automation' },
  { color: '#f59e0b', label: 'Comms' },
]

const SWIMLANES: SwimLane[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client']

export default function CanvasLegend({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-16 right-2 z-30 bg-background border rounded-lg shadow-lg p-3 w-52 text-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">Legend</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground leading-none">✕</button>
      </div>
      <div className="mb-3">
        <div className="font-medium text-muted-foreground mb-1.5">Node types</div>
        {NODE_LEGEND.map(item => (
          <div key={item.label} className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-sm inline-block shrink-0" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="font-medium text-muted-foreground mb-1.5">Swimlanes</div>
        {SWIMLANES.map(lane => (
          <div key={lane} className="flex items-center gap-2 mb-1">
            <span
              className="w-4 h-4 rounded-sm inline-block shrink-0"
              style={{ backgroundColor: LANE_COLORS[lane], border: `1.5px solid ${LANE_LABEL_COLORS[lane]}` }}
            />
            <span style={{ color: LANE_LABEL_COLORS[lane] }}>{lane}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
