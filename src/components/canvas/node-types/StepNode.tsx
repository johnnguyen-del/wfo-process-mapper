import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'

const LANE_COLORS: Record<string, string> = {
  CS: 'bg-blue-50 border-blue-300 text-blue-900',
  Ops: 'bg-green-50 border-green-300 text-green-900',
  'Fraud Ops': 'bg-purple-50 border-purple-300 text-purple-900',
  'L2 - Risk': 'bg-yellow-50 border-yellow-300 text-yellow-900',
  Automation: 'bg-gray-50 border-gray-300 text-gray-900',
  Client: 'bg-slate-50 border-slate-300 text-slate-900',
}

export default function StepNode({ data }: NodeProps) {
  const color = LANE_COLORS[(data as any).lane] ?? 'bg-white border-gray-300'
  return (
    <div className={cn('rounded-lg border-2 px-3 py-2 text-xs font-medium min-w-[100px] max-w-[160px] shadow-sm', color)}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-400" />
      <div className="text-center">{(data as any).label}</div>
      {(data as any).timeEstimate && (
        <div className="text-[10px] text-center mt-1 opacity-60">{(data as any).timeEstimate}</div>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  )
}
