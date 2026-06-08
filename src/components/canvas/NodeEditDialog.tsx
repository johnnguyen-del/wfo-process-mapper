import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, X } from 'lucide-react'

interface NodeEditDialogProps {
  node: Node
  onSave: (id: string, label: string, timeEstimate: string) => void
  onDelete: () => void
  onClose: () => void
}

export default function NodeEditDialog({ node, onSave, onDelete, onClose }: NodeEditDialogProps) {
  const [label, setLabel] = useState((node.data as any).label ?? '')
  const [timeEstimate, setTimeEstimate] = useState((node.data as any).timeEstimate ?? '')

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-xl p-4 w-72">
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
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Time estimate (optional)</label>
          <Input
            value={timeEstimate}
            onChange={(e) => setTimeEstimate(e.target.value)}
            placeholder="e.g. 2–5 min"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(node.id, label, timeEstimate)}
          className="flex-1"
        >
          Save
        </Button>
      </div>
    </div>
  )
}
