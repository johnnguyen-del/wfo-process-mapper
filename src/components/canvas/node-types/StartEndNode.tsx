import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'

export default function StartEndNode({ data }: NodeProps) {
  const isEnd = (data as any).type === 'end'
  const sourcePos = (data as any).sourcePosition ?? Position.Right
  const targetPos = (data as any).targetPosition ?? Position.Left
  return (
    <div
      className={cn(
        'rounded-full px-4 py-1.5 text-xs font-bold shadow-sm border-2',
        isEnd
          ? 'bg-green-100 border-green-500 text-green-800'
          : 'bg-orange-100 border-orange-400 text-orange-800'
      )}
    >
      {!isEnd && <Handle type="source" position={sourcePos} className="!w-2 !h-2 !bg-green-500" />}
      {isEnd && <Handle type="target" position={targetPos} className="!w-2 !h-2 !bg-red-500" />}
      {(data as any).label || (isEnd ? 'End' : 'Start')}
    </div>
  )
}
