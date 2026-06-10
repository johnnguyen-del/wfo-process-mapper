import { useRef, useState, useMemo } from 'react'
import ProcessCanvas from './ProcessCanvas'
import type { ProcessMap, CanvasDirection, LineStyle, TeamOwner } from '@/lib/types'
import { computeMetrics } from '@/lib/metrics'

interface CompareViewProps {
  currentMap: ProcessMap
  optimizationMap: ProcessMap
  interimMap: ProcessMap
  direction: CanvasDirection
  lineStyle: LineStyle
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  compareSplit: number
  onCompareSplitChange: (pct: number, persist?: boolean) => void
  onLineStyleChange: (style: LineStyle) => void
  onDirectionChange: (dir: CanvasDirection) => void
}

type PanelId = 'current' | 'interim' | 'ideal'

const PANEL_CONFIG: Record<PanelId, { label: string; headerClass: string; textClass: string }> = {
  current:  { label: 'Current Flow',    headerClass: 'bg-muted/30 border-b',            textClass: 'text-muted-foreground font-semibold' },
  interim:  { label: '⚡ Interim Fixed', headerClass: 'bg-amber-50 border-b border-amber-200', textClass: 'text-amber-700 font-semibold' },
  ideal:    { label: '✦ Long-term Ideal', headerClass: 'bg-violet-50 border-b border-violet-200', textClass: 'text-violet-700 font-semibold' },
}

const COLLAPSED_WIDTH = 28

export default function CompareView({
  currentMap, optimizationMap, interimMap,
  direction, lineStyle, teamOwner, workato, decagonL0,
  compareSplit, onCompareSplitChange, onLineStyleChange, onDirectionChange,
}: CompareViewProps) {
  const [showStats, setShowStats] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<PanelId>>(new Set())

  const currentMetrics  = useMemo(() => computeMetrics(currentMap),      [currentMap])
  const interimMetrics  = useMemo(() => computeMetrics(interimMap),       [interimMap])
  const idealMetrics    = useMemo(() => computeMetrics(optimizationMap),  [optimizationMap])

  const hasData = currentMetrics.totalTouchpoints > 0 || interimMetrics.totalTouchpoints > 0 || idealMetrics.totalTouchpoints > 0

  const noOp = () => {}

  function toggleCollapse(id: PanelId) {
    setCollapsed(prev => {
      const next = new Set(prev)
      // Always keep at least 1 panel expanded
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 2) {
        next.add(id)
      }
      return next
    })
  }

  const isCollapsed = (id: PanelId) => collapsed.has(id)

  const maps: Record<PanelId, ProcessMap> = {
    current: currentMap,
    interim: interimMap,
    ideal: optimizationMap,
  }

  function PanelWrapper({ id }: { id: PanelId }) {
    const cfg = PANEL_CONFIG[id]
    const col = isCollapsed(id)
    return (
      <div
        className="flex flex-col overflow-hidden transition-all duration-200"
        style={{ width: col ? `${COLLAPSED_WIDTH}px` : undefined, flex: col ? '0 0 auto' : 1 }}
      >
        {/* Panel header */}
        <div
          className={`px-2 py-1.5 flex items-center justify-between shrink-0 cursor-pointer select-none ${cfg.headerClass}`}
          onClick={() => toggleCollapse(id)}
          title={col ? `Expand ${cfg.label}` : `Collapse ${cfg.label}`}
        >
          {col ? (
            <span
              className={`text-[10px] ${cfg.textClass}`}
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
            >
              {cfg.label} ▶
            </span>
          ) : (
            <>
              <span className={`text-xs ${cfg.textClass}`}>{cfg.label}</span>
              <span className="text-[10px] text-muted-foreground">▼</span>
            </>
          )}
        </div>
        {/* Canvas */}
        {!col && (
          <div className="flex-1 relative">
            <ProcessCanvas
              processMap={maps[id]}
              teamOwner={teamOwner}
              workato={workato}
              decagonL0={decagonL0}
              direction={direction}
              lineStyle={lineStyle}
              readOnly
              onChange={noOp}
              onRelayout={(dir) => onDirectionChange(dir)}
              onLineStyleChange={onLineStyleChange}
            />
          </div>
        )}
      </div>
    )
  }

  function metricVal(val: number, ref1: number, ref2: number, lowerIsBetter = true) {
    if (val === 0 && ref1 === 0 && ref2 === 0) return <span className="text-muted-foreground">—</span>
    const best = lowerIsBetter ? Math.min(ref1, ref2, val) : Math.max(ref1, ref2, val)
    const worst = lowerIsBetter ? Math.max(ref1, ref2, val) : Math.min(ref1, ref2, val)
    const cls = val === best ? 'text-green-600 font-semibold' : val === worst ? 'text-red-500 font-semibold' : 'font-medium'
    return <span className={cls}>{val}</span>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      {hasData && (
        <div className="border-b bg-muted/10 shrink-0">
          <button
            onClick={() => setShowStats(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Statistical Comparison</span>
            <span>{showStats ? '▲' : '▼'}</span>
          </button>
          {showStats && (
            <div className="px-4 pb-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left py-1 pr-4 font-medium">Metric</th>
                    <th className="text-right py-1 pr-4 font-medium">Current</th>
                    <th className="text-right py-1 pr-4 font-medium text-amber-600">⚡ Interim</th>
                    <th className="text-right py-1 font-medium text-violet-600">✦ Ideal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-1.5 pr-4 text-muted-foreground">Touchpoints</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(currentMetrics.totalTouchpoints, interimMetrics.totalTouchpoints, idealMetrics.totalTouchpoints)}</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(interimMetrics.totalTouchpoints, currentMetrics.totalTouchpoints, idealMetrics.totalTouchpoints)}</td>
                    <td className="py-1.5 text-right">{metricVal(idealMetrics.totalTouchpoints, currentMetrics.totalTouchpoints, interimMetrics.totalTouchpoints)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1.5 pr-4 text-muted-foreground">Transitions</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(currentMetrics.totalTransitions, interimMetrics.totalTransitions, idealMetrics.totalTransitions)}</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(interimMetrics.totalTransitions, currentMetrics.totalTransitions, idealMetrics.totalTransitions)}</td>
                    <td className="py-1.5 text-right">{metricVal(idealMetrics.totalTransitions, currentMetrics.totalTransitions, interimMetrics.totalTransitions)}</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-1.5 pr-4 text-muted-foreground">Duration (min)</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(currentMetrics.totalDurationMinutes, interimMetrics.totalDurationMinutes, idealMetrics.totalDurationMinutes)}</td>
                    <td className="py-1.5 pr-4 text-right">{metricVal(interimMetrics.totalDurationMinutes, currentMetrics.totalDurationMinutes, idealMetrics.totalDurationMinutes)}</td>
                    <td className="py-1.5 text-right">{metricVal(idealMetrics.totalDurationMinutes, currentMetrics.totalDurationMinutes, interimMetrics.totalDurationMinutes)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground mt-2">Green = best · Red = worst across all three flows</p>
            </div>
          )}
        </div>
      )}

      {/* Three panels */}
      <div className="flex flex-1 min-h-0">
        <PanelWrapper id="current" />
        <div className="w-px bg-border shrink-0" />
        <PanelWrapper id="interim" />
        <div className="w-px bg-border shrink-0" />
        <PanelWrapper id="ideal" />
      </div>
    </div>
  )
}
