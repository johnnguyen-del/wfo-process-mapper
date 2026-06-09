import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Settings, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border-green-300',
  review: 'bg-amber-100 text-amber-700 border-amber-300',
  deprecated: 'bg-red-100 text-red-600 border-red-300',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
}

export default function AutomationNode({ data }: NodeProps) {
  const timeEstimate = (data as any).timeEstimate as string | undefined
  const showTimes = (data as any).showTimes as boolean | undefined
  const badge = (data as any).badge as { status?: string; priority?: string } | undefined

  return (
    <div className="relative rounded-lg border-2 border-gray-400 bg-gray-100 px-3 py-2 text-xs font-medium min-w-[110px] max-w-[160px] shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500" />
      {badge?.priority && (
        <span className={cn('absolute top-1 right-1 w-2 h-2 rounded-full', PRIORITY_COLORS[badge.priority] ?? '')} />
      )}
      <div className="flex items-center justify-between mb-1 gap-1">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Automation</span>
        {badge?.status && (
          <span className={cn('text-[9px] font-semibold px-1 rounded border', STATUS_COLORS[badge.status] ?? '')}>
            {badge.status === 'review' ? 'Needs Review' : badge.status}
          </span>
        )}
      </div>
      <div className={cn('flex items-center gap-1.5 justify-center', showTimes && 'mb-1')}>
        <Settings className="w-3 h-3 shrink-0 text-gray-600" />
        <span className="text-gray-800 font-semibold">{(data as any).label}</span>
      </div>
      {showTimes && (
        <div className="flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-700">
          <Clock className="w-2.5 h-2.5 shrink-0" />
          {timeEstimate ? <span className="font-medium">{timeEstimate}</span> : <span className="opacity-50">add time</span>}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-500" />
    </div>
  )
}
