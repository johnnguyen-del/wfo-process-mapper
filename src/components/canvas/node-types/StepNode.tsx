import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const LANE_COLORS: Record<string, string> = {
  CS: 'bg-blue-100 border-blue-400 text-blue-900',
  Ops: 'bg-green-100 border-green-400 text-green-900',
  'Fraud Ops': 'bg-purple-100 border-purple-400 text-purple-900',
  'L2 - Risk': 'bg-yellow-100 border-yellow-400 text-yellow-900',
  Automation: 'bg-gray-100 border-gray-400 text-gray-900',
  Client: 'bg-slate-100 border-slate-400 text-slate-900',
}

const LANE_LABEL_COLORS: Record<string, string> = {
  CS: '#1d4ed8',
  Ops: '#15803d',
  'Fraud Ops': '#7e22ce',
  'L2 - Risk': '#a16207',
  Automation: '#374151',
  Client: '#475569',
}

const TIME_COLORS: Record<string, string> = {
  CS: 'bg-blue-200 text-blue-800',
  Ops: 'bg-green-200 text-green-800',
  'Fraud Ops': 'bg-purple-200 text-purple-800',
  'L2 - Risk': 'bg-yellow-200 text-yellow-800',
  Automation: 'bg-gray-200 text-gray-700',
  Client: 'bg-slate-200 text-slate-700',
}

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

export default function StepNode({ data }: NodeProps) {
  const lane = (data as any).lane ?? 'CS'
  const color = LANE_COLORS[lane] ?? 'bg-white border-gray-300 text-gray-900'
  const timeColor = TIME_COLORS[lane] ?? 'bg-gray-100 text-gray-600'
  const timeEstimate = (data as any).timeEstimate as string | undefined
  const showTimes = (data as any).showTimes as boolean | undefined
  const badge = (data as any).badge as { status?: string; priority?: string } | undefined
  const durationMinutes = (data as any).durationMinutes as number | undefined
  const sourcePos = (data as any).sourcePosition ?? Position.Right
  const targetPos = (data as any).targetPosition ?? Position.Left

  return (
    <div className={cn('relative rounded-lg border-2 px-3 py-2 text-xs font-medium min-w-[110px] max-w-[160px] shadow-sm', color)}>
      {(data as any).locked && (
        <span className="absolute top-0.5 left-1 text-[9px] leading-none opacity-60" title="Locked">🔒</span>
      )}
      <Handle type="target" position={targetPos} className="!w-2 !h-2 !bg-gray-400" />
      {badge?.priority && (
        <span className={cn('absolute top-1 right-1 w-2 h-2 rounded-full', PRIORITY_COLORS[badge.priority] ?? '')} />
      )}
      <div className="flex items-center justify-between mb-1 gap-1">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${LANE_LABEL_COLORS[lane] ?? '#374151'}22`, color: LANE_LABEL_COLORS[lane] ?? '#374151' }}>
          {lane}
        </span>
        {badge?.status && (
          <span className={cn('text-[9px] font-semibold px-1 rounded border', STATUS_COLORS[badge.status] ?? '')}>
            {badge.status === 'review' ? 'Needs Review' : badge.status}
          </span>
        )}
      </div>
      <div className={cn('text-center font-semibold leading-tight', showTimes && 'mb-1')}>{(data as any).label}</div>
      {showTimes && (
        <div className={cn('flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[10px]', timeColor)}>
          <Clock className="w-2.5 h-2.5 shrink-0" />
          {timeEstimate ? (
            <span className="font-medium">{timeEstimate}</span>
          ) : (
            <span className="opacity-50">add time</span>
          )}
        </div>
      )}
      {durationMinutes == null && (
        <span className="absolute bottom-0.5 right-1 text-[9px] text-amber-500" title="Duration not set">⏱</span>
      )}
      <Handle type="source" position={sourcePos} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  )
}
