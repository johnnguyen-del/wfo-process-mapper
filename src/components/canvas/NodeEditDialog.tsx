import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, X } from 'lucide-react'
import type { SwimLane, ProcessNode } from '@/lib/types'

const LANES: SwimLane[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client']
const LANE_COLORS: Record<string, string> = {
  CS: '#1d4ed8', Ops: '#15803d', 'Fraud Ops': '#7e22ce',
  'L2 - Risk': '#a16207', Automation: '#374151', Client: '#475569',
}

interface NodeEditDialogProps {
  node: Node
  onSave: (id: string, label: string, timeEstimate: string, lane: SwimLane, badge?: ProcessNode['badge'], durationMinutes?: number) => void
  onDelete: () => void
  onClose: () => void
}

export default function NodeEditDialog({ node, onSave, onDelete, onClose }: NodeEditDialogProps) {
  const [label, setLabel] = useState((node.data as any).label ?? '')
  const [timeEstimate, setTimeEstimate] = useState((node.data as any).timeEstimate ?? '')
  const [lane, setLane] = useState<SwimLane>((node.data as any).lane ?? 'CS')
  const [badgeStatus, setBadgeStatus] = useState<string>((node.data as any).badge?.status ?? '')
  const [badgePriority, setBadgePriority] = useState<string>((node.data as any).badge?.priority ?? '')
  const [durationMinutes, setDurationMinutes] = useState<string>(
    (node.data as any).durationMinutes != null
      ? String((node.data as any).durationMinutes)
      : ''
  )

  const isStartEnd = node.type === 'start' || node.type === 'end'

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-xl p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Edit node</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Label</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Node label"
            autoFocus
          />
        </div>

        {!isStartEnd && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Team / Lane (badge)</label>
            <div className="flex flex-wrap gap-1.5">
              {LANES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLane(l)}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded border transition-all"
                  style={{
                    backgroundColor: lane === l ? `${LANE_COLORS[l]}22` : 'transparent',
                    borderColor: lane === l ? LANE_COLORS[l] : '#e2e8f0',
                    color: lane === l ? LANE_COLORS[l] : '#94a3b8',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Time estimate (optional)</label>
          <Input
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
            placeholder="e.g. 2–5 min"
          />
        </div>

        {!isStartEnd && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status badge</label>
              <select
                value={badgeStatus}
                onChange={e => setBadgeStatus(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-xs bg-background"
              >
                <option value="">None</option>
                <option value="active">Active</option>
                <option value="review">Needs Review</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <select
                value={badgePriority}
                onChange={e => setBadgePriority(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-xs bg-background"
              >
                <option value="">None</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
              <input
                type="number"
                min={0}
                value={durationMinutes}
                onChange={e => setDurationMinutes(e.target.value)}
                placeholder="e.g. 5"
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1">
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
        <Button size="sm" onClick={() => onSave(node.id, label, timeEstimate, lane, { status: badgeStatus || undefined, priority: badgePriority || undefined }, durationMinutes ? Number(durationMinutes) : undefined)} className="flex-1">
          Save
        </Button>
      </div>
    </div>
  )
}
