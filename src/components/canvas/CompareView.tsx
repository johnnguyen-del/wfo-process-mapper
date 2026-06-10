import { useState, useMemo, useRef, useEffect } from 'react'
import ProcessCanvas, { LANE_COLORS, LANE_LABEL_COLORS } from './ProcessCanvas'
import type { ProcessMap, CanvasDirection, LineStyle, TeamOwner, SwimLane } from '@/lib/types'
import { computeMetrics } from '@/lib/metrics'
import { autoLayout } from '@/lib/export'
import { cn } from '@/lib/utils'

interface CompareViewProps {
  currentMap: ProcessMap
  optimizationMap: ProcessMap
  interimMap: ProcessMap
  direction: CanvasDirection
  lineStyle: LineStyle
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  layoutKey?: number
  compareSplit: number
  onCompareSplitChange: (pct: number, persist?: boolean) => void
  onLineStyleChange: (style: LineStyle) => void
  onDirectionChange: (dir: CanvasDirection) => void
  onCurrentChange: (map: ProcessMap) => void
  onInterimChange: (map: ProcessMap) => void
  onIdealChange: (map: ProcessMap) => void
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
  layoutKey, compareSplit, onCompareSplitChange, onLineStyleChange, onDirectionChange,
  onCurrentChange, onInterimChange, onIdealChange,
}: CompareViewProps) {
  const [showStats, setShowStats] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<PanelId>>(new Set())

  // Per-panel direction state (independent T→B / L→R per panel)
  const [panelDirections, setPanelDirections] = useState<Record<PanelId, CanvasDirection>>({
    current: direction,
    interim: direction,
    ideal: direction,
  })

  // Per-panel layout keys — increment to force canvas remount when direction changes
  const [panelLayoutKeys, setPanelLayoutKeys] = useState<Record<PanelId, number>>({
    current: 0, interim: 0, ideal: 0,
  })

  // Panel widths as percentages (used when panels are expanded)
  const [panelWidths, setPanelWidths] = useState({ current: 33, interim: 34, ideal: 33 })

  const containerRef = useRef<HTMLDivElement>(null)
  const dragCleanupRef1 = useRef<(() => void) | null>(null)
  const dragCleanupRef2 = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      dragCleanupRef1.current?.()
      dragCleanupRef2.current?.()
    }
  }, [])

  function startDrag(e: React.MouseEvent, panelA: PanelId, panelB: PanelId) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.getBoundingClientRect().width
    const startX = e.clientX
    const startA = panelWidths[panelA]
    const startB = panelWidths[panelB]
    document.body.style.cursor = 'col-resize'

    function onMove(ev: MouseEvent) {
      const deltaPct = ((ev.clientX - startX) / containerWidth) * 100
      setPanelWidths(prev => ({
        ...prev,
        [panelA]: Math.max(10, Math.min(80, startA + deltaPct)),
        [panelB]: Math.max(10, Math.min(80, startB - deltaPct)),
      }))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    dragCleanupRef1.current = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
  }

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
  const onChanges: Record<PanelId, (map: ProcessMap) => void> = {
    current: onCurrentChange,
    interim: onInterimChange,
    ideal: onIdealChange,
  }

  function PanelWrapper({ id }: { id: PanelId }) {
    const cfg = PANEL_CONFIG[id]
    const col = isCollapsed(id)
    const panelStyle = col
      ? { width: `${COLLAPSED_WIDTH}px`, flex: '0 0 auto' as const }
      : { flex: `${panelWidths[id]} 1 0%` }
    return (
      <div
        className="flex flex-col overflow-hidden transition-all duration-200"
        style={panelStyle}
      >
        {/* Panel header — click to collapse/expand */}
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
        {/* Editable canvas — double-click nodes to edit, local dialog appears */}
        {!col && (
          <div className="flex-1 relative overflow-hidden">
            <ProcessCanvas
              processMap={maps[id]}
              teamOwner={teamOwner}
              workato={workato}
              decagonL0={decagonL0}
              direction={panelDirections[id]}
              lineStyle={lineStyle}
              layoutKey={panelLayoutKeys[id]}
              hideLegend
              onChange={onChanges[id]}
              onRelayout={(dir) => {
                // 1. Relayout nodes for the new direction
                const map = maps[id]
                const relaid = autoLayout(map.nodes, map.edges, dir)
                onChanges[id]({ nodes: relaid, edges: map.edges })
                // 2. Update this panel's direction
                setPanelDirections(prev => ({ ...prev, [id]: dir }))
                // 3. Increment this panel's layoutKey to force canvas remount
                setPanelLayoutKeys(prev => ({ ...prev, [id]: prev[id] + 1 }))
              }}
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

      {/* Shared legend — shown once above all panels */}
      <div className="border-b bg-muted/10 px-3 py-1.5 flex items-center gap-3 flex-wrap shrink-0 text-[10px]">
        <span className="font-medium text-muted-foreground shrink-0">Legend:</span>
        {(['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client'] as const).map(lane => (
          <span key={lane} className="flex items-center gap-1 font-medium shrink-0" style={{ color: LANE_LABEL_COLORS[lane as SwimLane] }}>
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: LANE_COLORS[lane as SwimLane], border: `1.5px solid ${LANE_LABEL_COLORS[lane as SwimLane]}` }} />
            {lane}
          </span>
        ))}
        <span className="text-muted-foreground/30">|</span>
        {[
          { label: 'Start/End', color: '#f97316' },
          { label: 'Step', color: '#3b82f6' },
          { label: 'Decision', color: '#a855f7', diamond: true },
          { label: 'Auto', color: '#10b981' },
          { label: 'Comms', color: '#f59e0b' },
        ].map(({ label, color, diamond }) => (
          <span key={label} className="flex items-center gap-1 text-muted-foreground shrink-0">
            <span className="w-2 h-2 inline-block shrink-0" style={{ backgroundColor: color, borderRadius: diamond ? 0 : 2, transform: diamond ? 'rotate(45deg)' : undefined }} />
            {label}
          </span>
        ))}
      </div>

      {/* Three panels */}
      <div ref={containerRef} className="flex flex-1 min-h-0">
        <PanelWrapper id="current" />
        {/* Drag handle between current and interim */}
        <div
          className={cn(
            'w-1.5 shrink-0 bg-border transition-colors flex items-center justify-center group',
            !isCollapsed('current') && !isCollapsed('interim')
              ? 'cursor-col-resize hover:bg-indigo-400'
              : 'cursor-default opacity-30'
          )}
          onMouseDown={(!isCollapsed('current') && !isCollapsed('interim'))
            ? (e) => startDrag(e, 'current', 'interim')
            : undefined}
        >
          <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
        </div>
        <PanelWrapper id="interim" />
        {/* Drag handle between interim and ideal */}
        <div
          className={cn(
            'w-1.5 shrink-0 bg-border transition-colors flex items-center justify-center group',
            !isCollapsed('interim') && !isCollapsed('ideal')
              ? 'cursor-col-resize hover:bg-indigo-400'
              : 'cursor-default opacity-30'
          )}
          onMouseDown={(!isCollapsed('interim') && !isCollapsed('ideal'))
            ? (e) => startDrag(e, 'interim', 'ideal')
            : undefined}
        >
          <div className="w-0.5 h-7 rounded-full bg-muted-foreground/30 group-hover:bg-white/70 transition-colors" />
        </div>
        <PanelWrapper id="ideal" />
      </div>
    </div>
  )
}
