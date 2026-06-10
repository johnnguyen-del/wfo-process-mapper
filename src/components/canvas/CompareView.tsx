import { useEffect, useRef } from 'react'
import ProcessCanvas from './ProcessCanvas'
import type { ProcessMap, CanvasDirection, LineStyle, TeamOwner } from '@/lib/types'

interface CompareViewProps {
  currentMap: ProcessMap
  optimizationMap: ProcessMap
  direction: CanvasDirection
  lineStyle: LineStyle
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  compareSplit: number                         // 20–80, percentage of container width
  onCompareSplitChange: (pct: number, persist?: boolean) => void
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
}: CompareViewProps) {
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
    <div ref={containerRef} className="flex h-full">
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
            direction="LR"
            lineStyle={lineStyle}
            readOnly
            onChange={noOp}
            onRelayout={noOp}
            onLineStyleChange={noOp}
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
            direction="LR"
            lineStyle={lineStyle}
            readOnly
            onChange={noOp}
            onRelayout={noOp}
            onLineStyleChange={noOp}
          />
        </div>
      </div>
    </div>
  )
}
