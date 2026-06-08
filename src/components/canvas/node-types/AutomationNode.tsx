import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Settings } from 'lucide-react'

export default function AutomationNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-gray-400 bg-gray-100 px-3 py-2 text-xs font-medium min-w-[100px] max-w-[160px] shadow-sm flex items-center gap-1.5">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-500" />
      <Settings className="w-3 h-3 shrink-0 text-gray-600" />
      <span className="text-gray-800">{(data as any).label}</span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-500" />
    </div>
  )
}
