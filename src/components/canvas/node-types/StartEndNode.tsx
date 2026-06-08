import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'

export default function StartEndNode({ data }: NodeProps) {
  const isEnd = (data as any).type === 'end'
  return (
    <div
      className={cn(
        'rounded-full px-4 py-1.5 text-xs font-bold shadow-sm border-2',
        isEnd
          ? 'bg-red-100 border-red-400 text-red-800'
          : 'bg-green-100 border-green-400 text-green-800'
      )}
    >
      {!isEnd && <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-green-500" />}
      {isEnd && <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-red-500" />}
      {(data as any).label || (isEnd ? 'End' : 'Start')}
    </div>
  )
}
