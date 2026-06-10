import { useEffect, useRef, useState, useMemo } from 'react'
import ProcessCanvas from './ProcessCanvas'
import type { ProcessMap, CanvasDirection, LineStyle, TeamOwner } from '@/lib/types'
import { computeMetrics } from '@/lib/metrics'

interface CompareViewProps {
  currentMap: ProcessMap
  optimizationMap: ProcessMap
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

export default function CompareView({
  currentMap,
  optimizationMap,
  direction,
  lineStyle,
  teamOwner,
  workato,
  decagonL0,
  compareSplit,
  onCompareSplitChange,
  onLineStyleChange,
  onDirectionChange,
}: CompareViewProps) {
  const [showStats, setShowStats] = useState(false)

  const currentMetrics = useMemo(() => computeMetrics(currentMap), [currentMap])
  const idealMetrics = useMemo(() => computeMetrics(optimizationMap), [optimizationMap])

  const hasData = currentMetrics.totalTouchpoints > 0 || idealMetrics.totalTouchpoints > 0

  const noOp = () => {}
  const containerRef = useRef<HTMLDivElement>(null)
  const splitDragCleanupRef = useRef<(() => void) | null>(null)

  function handleSplitDragStart(e: React.MouseEvent) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.getBoundingClientRect().width
    const startX = e.clientX
    const startPct = compareSplit
    document.body.style.cursor = 'col-resize'

    let finalPct = startPct

    function onMove(ev: MouseEvent) {
      const deltaPct = ((ev.clientX - startX) / containerWidth) * 100
      finalPct = Math.min(80, Math.max(20, startPct + deltaPct))
      onCompareSplitChange(finalPct)
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      splitDragCleanupRef.current = null
      onCompareSplitChange(finalPct, true)  // persist only on drag end
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)

    splitDragCleanupRef.current = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      splitDragCleanupRef.current?.()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
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
          <div className="px-4 pb-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1 pr-4 font-medium">Metric</th>
                  <th className="text-right py-1 pr-4 font-medium">Current</th>
                  <th className="text-right py-1 font-medium text-violet-600">✦ Ideal</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Touchpoints', currentMetrics.totalTouchpoints, idealMetrics.totalTouchpoints],
                  ['Transitions', currentMetrics.totalTransitions, idealMetrics.totalTransitions],
                  ['Total Duration (min)', currentMetrics.totalDurationMinutes || '—', idealMetrics.totalDurationMinutes || '—'],
                  ['Avg per Step (min)', currentMetrics.totalTouchpoints > 0 ? currentMetrics.avgDurationMinutes : '—', idealMetrics.totalTouchpoints > 0 ? idealMetrics.avgDurationMinutes : '—'],
                ].map(([label, cur, ideal]) => (
                  <tr key={String(label)} className="border-t">
                    <td className="py-1.5 pr-4 text-muted-foreground">{label}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums font-medium">{String(cur)}</td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${
                      typeof cur === 'number' && typeof ideal === 'number' && ideal < cur
                        ? 'text-green-600'
                        : typeof cur === 'number' && typeof ideal === 'number' && ideal > cur
                        ? 'text-red-500'
                        : 'text-violet-600'
                    }`}>
                      {String(ideal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground mt-2">Green = ideal improves on current · Red = ideal has more</p>
          </div>
        )}
      </div>
    )}
    <div ref={containerRef} className="flex flex-1 min-h-0">
      {/* Left: Current Flow */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: `${compareSplit}%` }}
      >
        <div className="px-3 py-1.5 bg-muted/30 border-b text-xs font-semibold text-muted-foreground shrink-0">
          Current Flow
        </div>
        <div className="flex-1 relative">
          <ProcessCanvas
            processMap={currentMap}
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
      </div>

      {/* Violet drag handle — Current ↔ Ideal */}
      <div
        onMouseDown={handleSplitDragStart}
        className="w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-violet-400 transition-colors flex items-center justify-center group"
        title="Drag to resize"
      >
        <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
      </div>

      {/* Right: Ideal Flow */}
      <div className="flex flex-col overflow-hidden flex-1">
        <div className="px-3 py-1.5 bg-violet-50 border-b text-xs font-semibold text-violet-700 shrink-0">
          ✦ Ideal Flow
        </div>
        <div className="flex-1 relative">
          <ProcessCanvas
            processMap={optimizationMap}
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
      </div>
    </div>
    </div>
  )
}
