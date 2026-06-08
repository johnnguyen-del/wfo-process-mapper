import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export default function DecisionNode({ data }: NodeProps) {
  return (
    <div className="relative w-[120px] h-[60px] flex items-center justify-center">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-500 !left-0" />
      <div
        className="absolute inset-0 bg-amber-100 border-2 border-amber-400"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      <span className="relative text-[10px] font-semibold text-amber-900 text-center px-4 leading-tight">
        {(data as any).label}
      </span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-amber-500 !right-0" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!w-2 !h-2 !bg-amber-500" />
    </div>
  )
}
