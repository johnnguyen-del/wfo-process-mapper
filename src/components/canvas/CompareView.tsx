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
}

export default function CompareView({
  currentMap,
  optimizationMap,
  direction,
  lineStyle,
  teamOwner,
  workato,
  decagonL0,
}: CompareViewProps) {
  const noOp = () => {}

  return (
    <div className="flex h-full">
      {/* Left: Current Flow */}
      <div className="flex-1 flex flex-col border-r overflow-hidden">
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
            onRelayout={noOp}
            onLineStyleChange={noOp}
          />
        </div>
      </div>

      {/* Right: Ideal Flow */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            onRelayout={noOp}
            onLineStyleChange={noOp}
          />
        </div>
      </div>
    </div>
  )
}
