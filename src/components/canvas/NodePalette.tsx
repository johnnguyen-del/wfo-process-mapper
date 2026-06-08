import type { ProcessNodeType, SwimLane } from '@/lib/types'
import { Settings, Mail, GitBranch, Play, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaletteItem {
  type: ProcessNodeType
  label: string
  defaultLane: SwimLane
  icon: React.ReactNode
  colorClass: string
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'start', label: 'Start', defaultLane: 'CS', icon: <Play className="w-3 h-3" />, colorClass: 'border-green-400 text-green-800 bg-green-50' },
  { type: 'step', label: 'Step', defaultLane: 'CS', icon: <Square className="w-3 h-3" />, colorClass: 'border-blue-300 text-blue-800 bg-blue-50' },
  { type: 'decision', label: 'Decision', defaultLane: 'CS', icon: <GitBranch className="w-3 h-3" />, colorClass: 'border-amber-400 text-amber-800 bg-amber-50' },
  { type: 'automation', label: 'Automation', defaultLane: 'Automation', icon: <Settings className="w-3 h-3" />, colorClass: 'border-gray-400 text-gray-800 bg-gray-50' },
  { type: 'comms', label: 'Comms', defaultLane: 'Client', icon: <Mail className="w-3 h-3" />, colorClass: 'border-indigo-300 text-indigo-800 bg-indigo-50' },
  { type: 'end', label: 'End', defaultLane: 'CS', icon: <Square className="w-3 h-3" />, colorClass: 'border-red-400 text-red-800 bg-red-50' },
]

interface NodePaletteProps {
  onDragStart: (type: ProcessNodeType, defaultLane: SwimLane) => void
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5 bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-sm">
      <p className="text-[10px] text-muted-foreground font-medium px-1">Drag to add</p>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={() => onDragStart(item.type, item.defaultLane)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded border text-[11px] font-medium cursor-grab active:cursor-grabbing',
            item.colorClass
          )}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>
  )
}
