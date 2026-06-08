import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Settings, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AutomationNode({ data }: NodeProps) {
  const timeEstimate = (data as any).timeEstimate as string | undefined
  const showTimes = (data as any).showTimes as boolean | undefined
  return (
    <div className="rounded-lg border-2 border-gray-400 bg-gray-100 px-3 py-2 text-xs font-medium min-w-[110px] max-w-[160px] shadow-sm">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500" />
      <div className="mb-1"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Automation</span></div>
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
