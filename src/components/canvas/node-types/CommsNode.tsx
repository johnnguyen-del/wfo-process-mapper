import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Mail } from 'lucide-react'

export default function CommsNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-medium min-w-[100px] max-w-[160px] shadow-sm flex items-center gap-1.5">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo-400" />
      <Mail className="w-3 h-3 shrink-0 text-indigo-600" />
      <span className="text-indigo-900">{(data as any).label}</span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo-400" />
    </div>
  )
}
