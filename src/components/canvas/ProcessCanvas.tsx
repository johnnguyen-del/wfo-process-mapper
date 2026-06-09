import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, BarChart2, Clock, GitBranch, GitMerge, Map, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { KbLink, ProcessMap, ProcessNode, ProcessEdge, ProcessNodeType, SwimLane, TeamOwner, CanvasDirection, LineStyle } from '@/lib/types'
import StepNode from './node-types/StepNode'
import DecisionNode from './node-types/DecisionNode'
import AutomationNode from './node-types/AutomationNode'
import CommsNode from './node-types/CommsNode'
import StartEndNode from './node-types/StartEndNode'
import NodePalette from './NodePalette'
import MapQualityChecklist from './MapQualityChecklist'
import NodeEditDialog from './NodeEditDialog'
import CanvasLegend from './CanvasLegend'
import MetricsDashboard from './MetricsDashboard'
import OutcomePanel from './OutcomePanel'

const NODE_TYPES = {
  step: StepNode,
  decision: DecisionNode,
  automation: AutomationNode,
  comms: CommsNode,
  start: StartEndNode,
  end: StartEndNode,
}

export const LANE_HEIGHT = 200

export const LANE_COLORS: Record<SwimLane, string> = {
  CS: '#dbeafe',
  Ops: '#dcfce7',
  'Fraud Ops': '#f3e8ff',
  'L2 - Risk': '#fef9c3',
  Automation: '#e5e7eb',
  Client: '#f1f5f9',
}

export const LANE_LABEL_COLORS: Record<SwimLane, string> = {
  CS: '#1d4ed8',
  Ops: '#15803d',
  'Fraud Ops': '#7e22ce',
  'L2 - Risk': '#a16207',
  Automation: '#374151',
  Client: '#475569',
}

const ALL_LANES: SwimLane[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client']

const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 14, height: 14 }

function toRfNodes(nodes: ProcessNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.label, lane: n.lane, timeEstimate: n.timeEstimate, type: n.type, badge: n.badge, durationMinutes: n.durationMinutes, attachments: n.attachments },
  }))
}

function edgeColor(label?: string): string {
  if (!label) return '#94a3b8'
  const l = label.toLowerCase()
  if (l.startsWith('yes') || l.includes('passed') || l.includes('legitimate') || l.includes('resolved') || l.includes('success')) return '#16a34a'
  if (l.startsWith('no') || l.includes('failed') || l.includes('failure') || l.includes('fraudulent') || l.includes('unable') || l.includes('escalate') || l.includes('triage')) return '#dc2626'
  return '#f59e0b' // amber for other conditions
}

function toRfEdges(edges: ProcessEdge[], lineStyle: LineStyle = 'default'): Edge[] {
  return edges.map((e) => {
    const color = edgeColor(e.label)
    return ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: lineStyle,
    style: { strokeWidth: e.label ? 2 : 1.5, stroke: color },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    labelStyle: { fontSize: 10, fontWeight: 700, fill: color },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
    labelBgPadding: [4, 6] as [number, number],
    labelBgBorderRadius: 4,
  })})
}

function fromRfNodes(rfNodes: Node[]): ProcessNode[] {
  return rfNodes
    .filter((n) => !n.id.startsWith('lane-'))
    .map((n) => ({
      id: n.id,
      type: n.type as ProcessNodeType,
      label: (n.data as any).label,
      lane: (n.data as any).lane as SwimLane,
      timeEstimate: (n.data as any).timeEstimate,
      badge: (n.data as any).badge,
      durationMinutes: (n.data as any).durationMinutes,
      attachments: (n.data as any).attachments,
      position: n.position,
    }))
}

function fromRfEdges(rfEdges: Edge[]): ProcessEdge[] {
  return rfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === 'string' ? e.label : undefined,
  }))
}

function laneYFromFlowY(y: number, lanes: SwimLane[]): SwimLane {
  const idx = Math.max(0, Math.min(lanes.length - 1, Math.floor(y / LANE_HEIGHT)))
  return lanes[idx]
}

function laneYCenter(lanes: SwimLane[], lane: SwimLane): number {
  const idx = lanes.indexOf(lane)
  // For ALL_LANES, this produces CS=80, Ops=280, Fraud Ops=480, L2-Risk=680, Automation=880, Client=1080
  return idx === -1 ? LANE_HEIGHT / 2 - 20 : idx * LANE_HEIGHT + LANE_HEIGHT / 2 - 20
}

// Bands + labels in viewport transform. Empty lanes collapse to a thin 28px divider.
function SwimlaneOverlay({ lanes, populatedLanes }: { lanes: SwimLane[]; populatedLanes: Set<SwimLane> }) {
  const { x, y, zoom } = useViewport()
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {lanes.map((lane, i) => {
          const hasNodes = populatedLanes.has(lane)
          // Empty lanes stay full height (preserves coordinate system) but are visually faint
          const alpha = hasNodes ? 1 : 0.18
          return (
            <div
              key={lane}
              style={{
                position: 'absolute',
                top: i * LANE_HEIGHT,
                left: -9999,
                width: 99999,
                height: LANE_HEIGHT,
                backgroundColor: LANE_COLORS[lane],
                borderBottom: `1px solid ${LANE_LABEL_COLORS[lane]}${hasNodes ? '40' : '15'}`,
                opacity: alpha,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 9999 + 4,
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  borderLeft: `4px solid ${LANE_LABEL_COLORS[lane]}`,
                  paddingLeft: 8,
                  paddingRight: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: LANE_LABEL_COLORS[lane],
                  backgroundColor: LANE_COLORS[lane],
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {lane}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface CanvasInnerProps {
  processMap: ProcessMap
  lanes: SwimLane[]
  direction: CanvasDirection
  lineStyle: LineStyle
  canvasLabel?: string
  readOnly?: boolean
  onChange: (map: ProcessMap) => void
  onRelayout: (direction: CanvasDirection) => void
  onLineStyleChange: (style: LineStyle) => void
}

function CanvasInner({ processMap, lanes, direction, lineStyle, canvasLabel, readOnly = false, onChange, onRelayout, onLineStyleChange }: CanvasInnerProps) {
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(toRfNodes(processMap.nodes))
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(toRfEdges(processMap.edges, lineStyle))
  const [draggingType, setDraggingType] = useState<{ type: ProcessNodeType; lane: SwimLane } | null>(null)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const [showTimes, setShowTimes] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showOutcomes, setShowOutcomes] = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const idCounter = useRef(processMap.nodes.length + 1)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  function handleFullscreen() {
    const el = canvasContainerRef.current?.closest('.canvas-fullscreen-target') as HTMLElement | null
    if (!document.fullscreenElement) {
      ;(el ?? document.documentElement).requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Auto-fit when nodes are imported (canvas remounts with pre-loaded nodes)
  useEffect(() => {
    if (processMap.nodes.length > 0) {
      const t = setTimeout(() => fitView({ padding: 0.12, duration: 300 }), 150)
      return () => clearTimeout(t)
    }
  }, [])

  // Regenerate edge styles when lineStyle changes
  useEffect(() => {
    setRfEdges(toRfEdges(processMap.edges, lineStyle))
  }, [lineStyle, processMap.edges])

  // Dim non-highlighted nodes when a path is selected
  useEffect(() => {
    if (highlightedNodes.size === 0) {
      setRfNodes(prev => prev.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })))
    } else {
      setRfNodes(prev => prev.map(n => ({
        ...n,
        style: { ...n.style, opacity: highlightedNodes.has(n.id) ? 1 : 0.2 },
      })))
    }
  }, [highlightedNodes])

  function commit(nodes: Node[], edges: Edge[]) {
    onChange({
      nodes: fromRfNodes(nodes),
      edges: fromRfEdges(edges),
    })
  }

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: lineStyle,
        style: { strokeWidth: 1.5, stroke: '#94a3b8' },
        markerEnd: EDGE_MARKER,
      }
      setRfEdges((eds) => {
        const updated = addEdge(newEdge, eds)
        commit(rfNodes, updated)
        return updated
      })
    },
    [rfNodes, rfEdges]
  )

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (readOnly || !draggingType) return

    // Use screenToFlowPosition so drop works correctly at any zoom/pan
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const lane = laneYFromFlowY(flowPos.y, lanes)
    const snappedY = laneYCenter(lanes, lane)

    const newNode: Node = {
      id: `n${idCounter.current++}`,
      type: draggingType.type,
      position: { x: Math.max(50, flowPos.x), y: snappedY },
      data: {
        label: draggingType.type.charAt(0).toUpperCase() + draggingType.type.slice(1),
        lane,
        type: draggingType.type,
        showTimes,
      },
      style: highlightedNodes.size > 0 ? { opacity: 0.2 } : undefined,
    }
    setRfNodes((prev) => {
      const updated = [...prev, newNode]
      commit(updated, rfEdges)
      return updated
    })
    setDraggingType(null)
  }

  function handleNodeDoubleClick(_e: React.MouseEvent, node: Node) {
    // Double-click opens edit dialog — single click is used for selection
    if (!node.id.startsWith('lane-')) {
      setEditingNode(node)
    }
  }

  function handleDeleteSelected() {
    const selectedIds = new Set(rfNodes.filter(n => n.selected).map(n => n.id))
    if (selectedIds.size === 0) return
    setRfNodes(prev => {
      const updated = prev.filter(n => !selectedIds.has(n.id))
      const filteredEdges = rfEdges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target))
      setRfEdges(filteredEdges)
      commit(updated, filteredEdges)
      return updated
    })
  }

  const selectedCount = rfNodes.filter(n => n.selected).length

  function handleNodeDelete(nodeId: string) {
    setRfNodes((prev) => {
      const updated = prev.filter((n) => n.id !== nodeId)
      const filteredEdges = rfEdges.filter((e) => e.source !== nodeId && e.target !== nodeId)
      setRfEdges(filteredEdges)
      commit(updated, filteredEdges)
      return updated
    })
  }

  function handleToggleTimes() {
    const next = !showTimes
    setShowTimes(next)
    setRfNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, showTimes: next } })))
  }

  function handleEditSave(id: string, label: string, timeEstimate: string, lane: SwimLane, badge?: ProcessNode['badge'], durationMinutes?: number, attachments?: KbLink[]) {
    setRfNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, label, timeEstimate: timeEstimate || undefined, lane, badge, durationMinutes, attachments } }
          : n
      )
      commit(updated, rfEdges)
      return updated
    })
    setEditingNode(null)
  }

  return (
    <div className="flex flex-col h-full" ref={canvasContainerRef}>
      {/* Canvas toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 shrink-0 gap-2">
        {/* Lane legend + optional label chip */}
        <div className="flex items-center gap-2 flex-wrap">
          {canvasLabel && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">
              {canvasLabel}
            </span>
          )}
          {(['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client'] as const).map(lane => (
            <span key={lane} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: LANE_LABEL_COLORS[lane] }}>
              <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: LANE_COLORS[lane], border: `1.5px solid ${LANE_LABEL_COLORS[lane]}` }} />
              {lane}
            </span>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleToggleTimes}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              showTimes ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
          >
            <Clock className="w-3 h-3" />
            {showTimes ? 'Hiding times' : 'Show times'}
          </button>

          {/* Direction toggle */}
          <button
            onClick={() => onRelayout(direction === 'LR' ? 'TB' : 'LR')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
            title={direction === 'LR' ? 'Switch to top-down layout' : 'Switch to left-right layout'}
          >
            {direction === 'LR' ? <ArrowRight className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {direction === 'LR' ? 'L→R' : 'T→B'}
          </button>

          {/* Line style toggle */}
          <button
            onClick={() => onLineStyleChange(lineStyle === 'default' ? 'step' : 'default')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              lineStyle === 'step'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
            title={lineStyle === 'step' ? 'Switch to curved lines' : 'Switch to straight lines'}
          >
            <GitBranch className="w-3 h-3" />
            {lineStyle === 'step' ? 'Straight' : 'Curved'}
          </button>
          <button
            onClick={() => setShowLegend(s => !s)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              showLegend
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
          >
            <Map className="w-3 h-3" /> Legend
          </button>
          <button
            onClick={handleFullscreen}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              isFullscreen
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setShowMetrics(s => !s)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
              showMetrics
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
            )}
          >
            <BarChart2 className="w-3 h-3" /> Metrics
          </button>
          {!readOnly && (
            <button
              onClick={() => { setShowOutcomes(s => !s); if (showOutcomes) setHighlightedNodes(new Set()) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                showOutcomes
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
              )}
            >
              <GitMerge className="w-3 h-3" /> Outcomes
            </button>
          )}
        </div>
      </div>

      <div
        className="relative flex-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {showLegend && <CanvasLegend onClose={() => setShowLegend(false)} />}
        {showMetrics && (
          <MetricsDashboard processMap={processMap} onClose={() => setShowMetrics(false)} />
        )}
        {showOutcomes && (
          <OutcomePanel
            processMap={processMap}
            onHighlight={setHighlightedNodes}
            onClose={() => { setShowOutcomes(false); setHighlightedNodes(new Set()) }}
          />
        )}
        {/* Multi-select toolbar — appears when nodes are selected */}
        {selectedCount > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-foreground text-background rounded-lg px-3 py-1.5 shadow-lg text-xs font-medium">
            <span>{selectedCount} node{selectedCount > 1 ? 's' : ''} selected</span>
            <span className="opacity-40">|</span>
            <span className="opacity-60 text-[10px]">drag to move · Delete to remove</span>
            <button
              onClick={handleDeleteSelected}
              className="text-red-300 hover:text-red-200 transition-colors"
            >
              Delete all
            </button>
          </div>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={readOnly ? undefined : handleNodeDoubleClick}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          nodeTypes={NODE_TYPES}
          minZoom={0.2}
          defaultViewport={{ x: 80, y: 10, zoom: 0.9 }}
          deleteKeyCode={readOnly ? null : 'Delete'}
          multiSelectionKeyCode="Shift"
          selectionOnDrag
          panOnDrag={[1, 2]}
          onNodesDelete={readOnly ? undefined : (deleted) => deleted.forEach((n) => handleNodeDelete(n.id))}
          style={{ background: 'transparent' }}
        >
          {/* SwimlaneOverlay removed — free layout with color-coded nodes instead */}
          <Background gap={20} size={1} color="#e5e7eb50" />
          <Controls />
        </ReactFlow>

        {!readOnly && <NodePalette onDragStart={(type, lane) => setDraggingType({ type, lane })} />}
      </div>

      <MapQualityChecklist processMap={processMap} activeLanes={lanes} />

      {editingNode && (
        <NodeEditDialog
          node={editingNode}
          onSave={(id, label, time, lane, badge, durationMinutes, attachments) => handleEditSave(id, label, time, lane, badge, durationMinutes, attachments)}
          onDelete={() => { handleNodeDelete(editingNode.id); setEditingNode(null) }}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  )
}

interface ProcessCanvasProps {
  processMap: ProcessMap
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  direction: CanvasDirection
  lineStyle: LineStyle
  canvasLabel?: string
  readOnly?: boolean
  onChange: (map: ProcessMap) => void
  onRelayout: (direction: CanvasDirection) => void
  onLineStyleChange: (style: LineStyle) => void
}

export default function ProcessCanvas({ processMap, teamOwner, workato, decagonL0, direction, lineStyle, canvasLabel, readOnly, onChange, onRelayout, onLineStyleChange }: ProcessCanvasProps) {
  // When imported nodes exist, always show ALL_LANES so node y-positions match
  // the fixed LANE_Y constants (CS=60, Ops=220, Fraud Ops=380, L2-Risk=540, Automation=700, Client=860).
  // Only filter lanes when the canvas is empty (manual drag mode).
  const nodeLanes = new Set(processMap.nodes.map((n) => n.lane))

  const lanes: SwimLane[] = processMap.nodes.length > 0
    ? ALL_LANES
    : (() => {
        const active = ALL_LANES.filter((lane) => {
          if (lane === 'Client') return true
          if (lane === 'Automation') return workato || decagonL0 || nodeLanes.has('Automation')
          return teamOwner.includes(lane as TeamOwner) || nodeLanes.has(lane)
        })
        return active.length > 1 ? active : ALL_LANES
      })()

  // Re-mount canvas when nodes are replaced externally (e.g. paste from AI)
  const canvasKey = `canvas-${processMap.nodes.length}-${processMap.nodes.map(n => n.id).join(',')}`

  return (
    <ReactFlowProvider>
      <CanvasInner
        key={canvasKey}
        processMap={processMap}
        lanes={lanes}
        direction={direction}
        lineStyle={lineStyle}
        canvasLabel={canvasLabel}
        readOnly={readOnly}
        onChange={onChange}
        onRelayout={onRelayout}
        onLineStyleChange={onLineStyleChange}
      />
    </ReactFlowProvider>
  )
}
