import { useMemo, useState } from 'react'
import { computeMetrics } from '@/lib/metrics'
import type { ProcessMap } from '@/lib/types'
import { LANE_LABEL_COLORS } from './ProcessCanvas'
import { findPaths, pathDuration, pathWorkSteps } from '@/lib/outcomeUtils'

interface MetricsDashboardProps {
  processMap: ProcessMap
  onClose: () => void
  onHighlight?: (nodeIds: Set<string>) => void
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/40 rounded p-2">
      <div className="text-muted-foreground text-[10px]">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  )
}

export default function MetricsDashboard({ processMap, onClose, onHighlight }: MetricsDashboardProps) {
  const m = computeMetrics(processMap)
  const activeLanes = Object.entries(m.byLane).filter(([, v]) => v.count > 0)
  const paths = useMemo(() => findPaths(processMap), [processMap])
  const nodeMap = useMemo(() => new Map(processMap.nodes.map(n => [n.id, n])), [processMap])
  const [showOutcomes, setShowOutcomes] = useState(false)

  return (
    <div className="absolute top-2 right-2 z-30 bg-background border rounded-lg shadow-lg p-4 w-72 text-xs">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm">Process Metrics</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground leading-none">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Touchpoints" value={m.totalTouchpoints} />
        <Stat label="Transitions" value={m.totalTransitions} />
        <Stat label="Total Duration" value={m.totalTouchpoints > 0 ? `${m.totalDurationMinutes} min` : '—'} />
        <Stat label="Avg per Step" value={m.totalTouchpoints > 0 ? `${m.avgDurationMinutes} min` : '—'} />
      </div>
      {m.missingDuration.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-3 text-amber-700">
          ⏱ {m.missingDuration.length} step{m.missingDuration.length !== 1 ? 's' : ''} missing duration
        </div>
      )}
      {activeLanes.length > 0 && (
        <div>
          <div className="font-medium text-muted-foreground mb-1.5">By swimlane</div>
          {activeLanes.map(([lane, v]) => (
            <div
              key={lane}
              className="flex justify-between mb-1"
              style={{ color: LANE_LABEL_COLORS[lane as keyof typeof LANE_LABEL_COLORS] }}
            >
              <span>{lane}</span>
              <span>{v.count} step{v.count !== 1 ? 's' : ''} · {v.durationMinutes} min</span>
            </div>
          ))}
        </div>
      )}
      {paths.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowOutcomes(s => !s)}
            className="flex items-center justify-between w-full font-medium text-muted-foreground mb-1.5 hover:text-foreground transition-colors"
          >
            <span>By outcome ({paths.length}{paths.length === 50 ? '+' : ''})</span>
            <span>{showOutcomes ? '▲' : '▼'}</span>
          </button>
          {showOutcomes && (
            <div className="space-y-1">
              {paths.map((path, i) => {
                const endNode = nodeMap.get(path[path.length - 1])
                const dur = pathDuration(path, nodeMap)
                const workSteps = pathWorkSteps(path)
                return (
                  <button
                    key={path.join('-')}
                    onClick={() => onHighlight?.(new Set(path))}
                    className="w-full text-left px-2 py-1.5 rounded border hover:bg-muted/40 transition-colors"
                  >
                    <div className="font-medium">Outcome {i + 1}: {endNode?.label ?? 'End'}</div>
                    <div className="text-muted-foreground text-[10px] mt-0.5">
                      {workSteps} step{workSteps !== 1 ? 's' : ''}
                      {dur > 0 ? ` · ${dur} min` : ''}
                    </div>
                  </button>
                )
              })}
              {onHighlight && (
                <button
                  onClick={() => onHighlight(new Set())}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline mt-1"
                >
                  Clear highlight
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {paths.length === 0 && m.totalTouchpoints > 0 && (
        <p className="text-muted-foreground text-center py-2 mt-2">Add Start and End nodes to see outcome breakdown</p>
      )}
      {m.totalTouchpoints === 0 && (
        <p className="text-muted-foreground text-center py-2">Add step or decision nodes to see metrics</p>
      )}
    </div>
  )
}
