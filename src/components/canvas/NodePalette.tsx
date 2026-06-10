import type { ProcessNodeType, SwimLane } from '@/lib/types'
import { Settings, Mail, GitBranch, Play, Square, Layers, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaletteItem {
  type: ProcessNodeType
  label: string
  defaultLane: SwimLane
  icon: React.ReactNode
  colorClass: string
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'start',      label: 'Start',      defaultLane: 'CS',         icon: <Play className="w-3.5 h-3.5" />,      colorClass: 'border-green-400 text-green-700 bg-green-50' },
  { type: 'step',       label: 'Step',       defaultLane: 'CS',         icon: <Square className="w-3.5 h-3.5" />,    colorClass: 'border-blue-300 text-blue-700 bg-blue-50' },
  { type: 'decision',   label: 'Decision',   defaultLane: 'CS',         icon: <GitBranch className="w-3.5 h-3.5" />, colorClass: 'border-amber-400 text-amber-700 bg-amber-50' },
  { type: 'automation', label: 'Automation', defaultLane: 'Automation', icon: <Settings className="w-3.5 h-3.5" />, colorClass: 'border-gray-400 text-gray-700 bg-gray-50' },
  { type: 'comms',      label: 'Comms',      defaultLane: 'Client',     icon: <Mail className="w-3.5 h-3.5" />,      colorClass: 'border-indigo-300 text-indigo-700 bg-indigo-50' },
  { type: 'end',        label: 'End',        defaultLane: 'CS',         icon: <Square className="w-3.5 h-3.5" />,    colorClass: 'border-red-400 text-red-700 bg-red-50' },
  { type: 'swimlane',   label: 'Lane',       defaultLane: 'CS',         icon: <Layers className="w-3.5 h-3.5" />,    colorClass: 'border-blue-300 text-blue-700 bg-blue-50' },
  { type: 'sticky',     label: 'Sticky',     defaultLane: 'CS',         icon: <StickyNote className="w-3.5 h-3.5" />, colorClass: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
]

interface NodePaletteProps {
  onDragStart: (type: ProcessNodeType, defaultLane: SwimLane) => void
  onClickInsert: (type: ProcessNodeType, defaultLane: SwimLane) => void
}

export default function NodePalette({ onDragStart, onClickInsert }: NodePaletteProps) {
  return (
    <div className="absolute left-1 top-2 z-10 flex flex-col gap-1 bg-background/90 backdrop-blur-sm border rounded-lg py-1.5 px-1 shadow-sm">
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={() => onDragStart(item.type, item.defaultLane)}
          onClick={() => onClickInsert(item.type, item.defaultLane)}
          title={item.label}
          className={cn(
            'w-7 h-7 rounded border flex items-center justify-center cursor-pointer',
            'hover:opacity-80 transition-opacity active:scale-95',
            item.colorClass
          )}
        >
          {item.icon}
        </div>
      ))}
    </div>
  )
}
