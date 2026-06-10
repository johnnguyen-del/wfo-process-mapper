import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
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

export default function DecisionNode({ data }: NodeProps) {
  const badge = (data as any).badge as { status?: string; priority?: string } | undefined
  const targetPos = (data as any).targetPosition ?? Position.Left

  return (
    <div className="relative w-[120px] h-[60px] flex items-center justify-center">
      {(data as any).locked && (
        <span className="absolute top-0.5 left-1 text-[9px] leading-none opacity-60 z-10" title="Locked">🔒</span>
      )}
      <Handle type="target" position={targetPos} className="!w-2 !h-2 !bg-amber-500 !left-0" />
      <div
        className="absolute inset-0 bg-amber-100 border-2 border-amber-400"
        style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
      />
      {badge?.priority && (
        <span className={cn('absolute top-1 right-1 w-2 h-2 rounded-full z-10', PRIORITY_COLORS[badge.priority] ?? '')} />
      )}
      <span className="relative text-[10px] font-semibold text-amber-900 text-center px-4 leading-tight">
        {(data as any).label}
      </span>
      {badge?.status && (
        <span className={cn('absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold px-1 rounded border whitespace-nowrap z-10', STATUS_COLORS[badge.status] ?? '')}>
          {badge.status === 'review' ? 'Needs Review' : badge.status}
        </span>
      )}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-amber-500 !right-0" />
      <Handle type="source" id="bottom" position={Position.Bottom} className="!w-2 !h-2 !bg-amber-500" />
    </div>
  )
}
