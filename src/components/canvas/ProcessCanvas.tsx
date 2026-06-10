import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import html2canvas from 'html2canvas'
import { ArrowDown, ArrowRight, BarChart2, Clock, Download, GitBranch, GitMerge, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useViewport,
  MarkerType,
  Position,
  type Node,
  type Edge,
  type NodeChange,
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
import SwimlaneNode from './node-types/SwimlaneNode'
import StickyNode from './node-types/StickyNode'
import NodePalette from './NodePalette'
import MapQualityChecklist from './MapQualityChecklist'
import NodeEditDialog from './NodeEditDialog'
import MetricsDashboard from './MetricsDashboard'
import OutcomePanel from './OutcomePanel'

const NODE_TYPES = {
  step: StepNode,
  decision: DecisionNode,
  automation: AutomationNode,
  comms: CommsNode,
  start: StartEndNode,
  end: StartEndNode,
  swimlane: SwimlaneNode,
  sticky: StickyNode,
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

const NODE_MINIMAP_COLORS: Partial<Record<ProcessNodeType, string>> = {
  start: '#f97316',
  end: '#f97316',
  step: '#3b82f6',
  decision: '#a855f7',
  automation: '#10b981',
  comms: '#f59e0b',
  swimlane: '#bfdbfe',
  sticky: '#fef9c3',
}

function toRfNodes(nodes: ProcessNode[], direction: CanvasDirection = 'LR'): Node[] {
  const sourcePos = direction === 'TB' ? Position.Bottom : Position.Right
  const targetPos = direction === 'TB' ? Position.Top : Position.Left
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    zIndex: n.type === 'sticky' ? 10 : n.type === 'swimlane' ? -1 : 0,
    draggable: !n.locked,
    deletable: !n.locked,
    style: n.type === 'swimlane' ? { width: n.nodeWidth ?? 400, height: n.nodeHeight ?? 200 } : undefined,
    data: {
      label: n.label,
      lane: n.lane,
      timeEstimate: n.timeEstimate,
      type: n.type,
      badge: n.badge,
      durationMinutes: n.durationMinutes,
      attachments: n.attachments,
      nodeColor: n.nodeColor,
      locked: n.locked,
    },
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
      nodeColor: (n.data as any).nodeColor,
      locked: (n.data as any).locked || undefined,
      nodeWidth: n.type === 'swimlane' && n.measured?.width ? Math.round(n.measured.width) : undefined,
      nodeHeight: n.type === 'swimlane' && n.measured?.height ? Math.round(n.measured.height) : undefined,
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
  colorMode?: 'light' | 'dark'
  onChange: (map: ProcessMap) => void
  onRelayout: (direction: CanvasDirection) => void
  onLineStyleChange: (style: LineStyle) => void
  onRegisterGetter?: (getter: () => ProcessMap) => void
}

function CanvasInner({ processMap, lanes, direction, lineStyle, canvasLabel, readOnly = false, colorMode, onChange, onRelayout, onLineStyleChange, onRegisterGetter }: CanvasInnerProps) {
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(toRfNodes(processMap.nodes, direction))
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(toRfEdges(processMap.edges, lineStyle))
  const [draggingType, setDraggingType] = useState<{ type: ProcessNodeType; lane: SwimLane } | null>(null)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const [showTimes, setShowTimes] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [showOutcomes, setShowOutcomes] = useState(false)
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  const [isolateMode, setIsolateMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [editingEdge, setEditingEdge] = useState<{
    id: string
    label: string
    screenX: number
    screenY: number
  } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const idCounter = useRef(processMap.nodes.length + 1)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Refs always hold the latest rendered state — used to read fresh values
  // inside event callbacks where the closure would otherwise be stale.
  const rfNodesRef = useRef(rfNodes)
  rfNodesRef.current = rfNodes
  const rfEdgesRef = useRef(rfEdges)
  rfEdgesRef.current = rfEdges
  const clipboardRef = useRef<{ nodes: ProcessNode[]; edges: ProcessEdge[] } | null>(null)
  const mousePosRef = useRef<{ x: number; y: number } | null>(null)

  // Register a getter so ProcessBuilder can read live canvas state at save time.
  // The getter always reads from rfNodesRef/rfEdgesRef (updated each render),
  // so it returns fresh positions regardless of when it's called.
  useEffect(() => {
    onRegisterGetter?.(() => ({
      nodes: fromRfNodes(rfNodesRef.current),
      edges: fromRfEdges(rfEdgesRef.current),
    }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleExportPng() {
    const container = canvasContainerRef.current
    if (!container) return
    const reactFlowEl = container.querySelector('.react-flow') as HTMLElement | null
    if (!reactFlowEl) return
    try {
      const canvas = await html2canvas(reactFlowEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      })
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `process-map.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (err) {
      console.error('PNG export failed:', err)
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (e.target as HTMLElement)?.isContentEditable

      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false)
        return
      }

      if (isEditable || readOnly) return

      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(s => !s)
        return
      }

      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        setRfNodes(prev => prev.map(n => ({ ...n, selected: true })))
        return
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedNodes = rfNodesRef.current.filter(n => n.selected)
        if (selectedNodes.length === 0) return
        const selectedIds = new Set(selectedNodes.map(n => n.id))
        const connectedEdges = rfEdgesRef.current.filter(
          edge => selectedIds.has(edge.source) && selectedIds.has(edge.target)
        )
        clipboardRef.current = {
          nodes: fromRfNodes(selectedNodes),
          edges: fromRfEdges(connectedEdges),
        }
        return
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const cb = clipboardRef.current
        if (!cb || cb.nodes.length === 0) return

        const stamp = crypto.randomUUID().split('-')[0]
        const idMap = new Map<string, string>()
        cb.nodes.forEach(n => idMap.set(n.id, `copy-${stamp}-${n.id}`))

        // Compute paste position: cursor or +30/+30 offset from bounding-box top-left
        const minX = Math.min(...cb.nodes.map(n => n.position.x))
        const minY = Math.min(...cb.nodes.map(n => n.position.y))
        let originX = minX + 30
        let originY = minY + 30

        if (mousePosRef.current) {
          const flowPos = screenToFlowPosition(mousePosRef.current)
          originX = flowPos.x
          originY = flowPos.y
        }

        const pastedNodes: ProcessNode[] = cb.nodes.map(n => ({
          ...n,
          id: idMap.get(n.id)!,
          locked: undefined, // pasted nodes start unlocked
          position: {
            x: originX + (n.position.x - minX),
            y: originY + (n.position.y - minY),
          },
        }))

        const pastedEdges: ProcessEdge[] = cb.edges.map(e => ({
          id: `copy-${stamp}-${e.id}`,
          source: idMap.get(e.source) ?? e.source,
          target: idMap.get(e.target) ?? e.target,
          label: e.label,
        }))

        const allNodes = [...fromRfNodes(rfNodesRef.current), ...pastedNodes]
        const allEdges = [...fromRfEdges(rfEdgesRef.current), ...pastedEdges]
        const newRfNodes = toRfNodes(allNodes, direction)
        const newRfEdges = toRfEdges(allEdges, lineStyle)
        setRfNodes(newRfNodes)
        setRfEdges(newRfEdges)
        commit(newRfNodes, newRfEdges)
        return
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [readOnly, direction, lineStyle, showShortcuts])

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

  // Dim/hide non-highlighted nodes when a path is selected
  useEffect(() => {
    if (highlightedNodes.size === 0) {
      setRfNodes(prev => prev.map(n => ({ ...n, style: { ...n.style, opacity: 1, pointerEvents: undefined } })))
      setIsolateMode(false)
    } else if (isolateMode) {
      setRfNodes(prev => prev.map(n => ({
        ...n,
        style: {
          ...n.style,
          opacity: highlightedNodes.has(n.id) ? 1 : 0,
          pointerEvents: highlightedNodes.has(n.id) ? undefined : 'none' as const,
        },
      })))
    } else {
      setRfNodes(prev => prev.map(n => ({
        ...n,
        style: { ...n.style, opacity: highlightedNodes.has(n.id) ? 1 : 0.2 },
      })))
    }
  }, [highlightedNodes, isolateMode])

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

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const isAnnotation = draggingType.type === 'swimlane' || draggingType.type === 'sticky'
    const lane = isAnnotation ? (draggingType.lane as SwimLane) : laneYFromFlowY(flowPos.y, lanes)
    const yPos = isAnnotation ? flowPos.y : laneYCenter(lanes, lane)

    const baseStyle = highlightedNodes.size > 0 ? { opacity: 0.2 as number } : {}
    const nodeStyle = draggingType.type === 'swimlane'
      ? { ...baseStyle, width: 400, height: 200 }
      : Object.keys(baseStyle).length > 0 ? baseStyle : undefined

    const newNode: Node = {
      id: `n${idCounter.current++}`,
      type: draggingType.type,
      position: { x: Math.max(50, flowPos.x), y: yPos },
      zIndex: draggingType.type === 'sticky' ? 10 : draggingType.type === 'swimlane' ? -1 : 0,
      style: nodeStyle,
      data: {
        label: draggingType.type === 'swimlane' ? 'Lane' : draggingType.type === 'sticky' ? 'Note' : draggingType.type.charAt(0).toUpperCase() + draggingType.type.slice(1),
        lane,
        type: draggingType.type,
        showTimes,
        nodeColor: draggingType.type === 'swimlane' ? '#dbeafe' : draggingType.type === 'sticky' ? '#fef9c3' : undefined,
      },
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

  function handleEdgeDoubleClick(_e: React.MouseEvent, edge: Edge) {
    if (readOnly) return
    // Find midpoint between source and target node positions
    const sourceNode = rfNodesRef.current.find(n => n.id === edge.source)
    const targetNode = rfNodesRef.current.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return
    const midFlow = {
      x: (sourceNode.position.x + targetNode.position.x) / 2 + 100,
      y: (sourceNode.position.y + targetNode.position.y) / 2 + 20,
    }
    // Convert flow coords to screen coords via the canvas container
    const container = canvasContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    // Use the ReactFlow viewport to convert (read from the DOM transform)
    const transform = container.querySelector('.react-flow__viewport') as HTMLElement | null
    const style = transform ? window.getComputedStyle(transform) : null
    const matrix = style ? new DOMMatrixReadOnly(style.transform) : null
    const zoom = matrix ? matrix.a : 1
    const tx = matrix ? matrix.e : 80
    const ty = matrix ? matrix.f : 10
    setEditingEdge({
      id: edge.id,
      label: typeof edge.label === 'string' ? edge.label : '',
      screenX: rect.left + midFlow.x * zoom + tx,
      screenY: rect.top + midFlow.y * zoom + ty,
    })
  }

  function saveEdgeLabel(edgeId: string, newLabel: string) {
    setRfEdges(prev => {
      const updated = prev.map(e =>
        e.id === edgeId
          ? { ...e, label: newLabel.trim() || undefined }
          : e
      )
      commit(fromRfNodes(rfNodesRef.current), fromRfEdges(updated))
      return updated
    })
    setEditingEdge(null)
  }

  function handleDeleteSelected() {
    const selectedIds = new Set(
      rfNodes.filter(n => n.selected && !n.data?.locked).map(n => n.id)
    )
    if (selectedIds.size === 0) return
    setRfNodes(prev => {
      const updated = prev.filter(n => !selectedIds.has(n.id))
      const filteredEdges = rfEdges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target))
      setRfEdges(filteredEdges)
      commit(updated, filteredEdges)
      return updated
    })
  }

  function handleLockSelected(lock: boolean) {
    if (readOnly) return
    setRfNodes(prev => {
      const updated = prev.map(n =>
        n.selected && n.type !== 'start' && n.type !== 'end'
          ? { ...n, data: { ...n.data, locked: lock }, draggable: !lock, deletable: !lock }
          : n
      )
      commit(updated, rfEdges)
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

  function handleEditSave(
    id: string, label: string, timeEstimate: string, lane: SwimLane,
    badge?: ProcessNode['badge'], durationMinutes?: number, attachments?: KbLink[],
    nodeColor?: string, locked?: boolean
  ) {
    setRfNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, label, timeEstimate: timeEstimate || undefined, lane, badge, durationMinutes, attachments, nodeColor, locked },
              draggable: !locked, deletable: !locked }
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
          {/* Separator + node type chips */}
          <span className="text-muted-foreground/30 text-[10px] select-none">|</span>
          {[
            { label: 'Start/End', color: '#f97316' },
            { label: 'Step', color: '#3b82f6' },
            { label: 'Decision', color: '#a855f7', diamond: true },
            { label: 'Auto', color: '#10b981' },
            { label: 'Comms', color: '#f59e0b' },
            { label: 'Lane', color: '#1d4ed8' },
            { label: 'Note', color: '#fde047' },
          ].map(({ label, color, diamond }) => (
            <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <span
                className="w-2 h-2 inline-block shrink-0"
                style={{
                  backgroundColor: color,
                  borderRadius: diamond ? 0 : 2,
                  transform: diamond ? 'rotate(45deg)' : undefined,
                }}
              />
              {label}
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
          {!readOnly && rfNodes.length > 0 && (
            <button
              onClick={handleExportPng}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors bg-background text-muted-foreground border-border hover:border-foreground/40"
              title="Export canvas as PNG"
            >
              <Download className="w-3 h-3" />
              PNG
            </button>
          )}
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
              onClick={() => { setShowOutcomes(s => !s); if (showOutcomes) { setHighlightedNodes(new Set()); setIsolateMode(false) } }}
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
          {!readOnly && (
            <button
              onClick={() => setShowShortcuts(s => !s)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                showShortcuts
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
              )}
              title="Keyboard shortcuts (?)"
            >
              ⌨
            </button>
          )}
        </div>
      </div>

      <div
        className="relative flex-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onMouseMove={(e) => { mousePosRef.current = { x: e.clientX, y: e.clientY } }}
        onMouseLeave={() => { mousePosRef.current = null }}
      >
        {showMetrics && (
          <MetricsDashboard processMap={processMap} onClose={() => setShowMetrics(false)} onHighlight={setHighlightedNodes} />
        )}
        {showOutcomes && (
          <OutcomePanel
            processMap={processMap}
            onHighlight={setHighlightedNodes}
            onClose={() => { setShowOutcomes(false); setHighlightedNodes(new Set()); setIsolateMode(false) }}
            onIsolate={setIsolateMode}
          />
        )}
        {editingEdge && (
          <div
            className="fixed z-50 bg-background border rounded-lg shadow-xl p-2 flex items-center gap-1.5"
            style={{ left: editingEdge.screenX - 90, top: editingEdge.screenY - 20, minWidth: 200 }}
          >
            <input
              autoFocus
              value={editingEdge.label}
              onChange={e => setEditingEdge(prev => prev ? { ...prev, label: e.target.value } : null)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdgeLabel(editingEdge.id, editingEdge.label)
                if (e.key === 'Escape') setEditingEdge(null)
              }}
              onBlur={() => saveEdgeLabel(editingEdge.id, editingEdge.label)}
              placeholder="Edge label (e.g. Yes / No)"
              className="flex-1 text-xs border-none outline-none bg-transparent min-w-0"
            />
            <button
              onMouseDown={e => { e.preventDefault(); saveEdgeLabel(editingEdge.id, editingEdge.label) }}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1"
            >
              ✓
            </button>
            <button
              onMouseDown={e => { e.preventDefault(); setEditingEdge(null) }}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1"
            >
              ✕
            </button>
          </div>
        )}
        {showShortcuts && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          >
            <div
              className="bg-background border rounded-xl shadow-xl p-5 w-72 text-xs"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-sm">Keyboard Shortcuts</span>
                <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground leading-none">✕</button>
              </div>
              <table className="w-full">
                <tbody>
                  {[
                    ['Ctrl+Z', 'Undo'],
                    ['Ctrl+Y / Ctrl+Shift+Z', 'Redo'],
                    ['Ctrl+C', 'Copy selected nodes'],
                    ['Ctrl+V', 'Paste'],
                    ['Ctrl+A', 'Select all'],
                    ['Ctrl+S', 'Save'],
                    ['Delete', 'Delete selected'],
                    ['? or ⌨', 'Toggle this guide'],
                  ].map(([key, action]) => (
                    <tr key={key} className="border-b last:border-0">
                      <td className="py-1.5 pr-4 font-mono text-muted-foreground text-[10px]">{key}</td>
                      <td className="py-1.5">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Multi-select toolbar — appears when nodes are selected */}
        {selectedCount > 0 && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-foreground text-background rounded-lg px-3 py-1.5 shadow-lg text-xs font-medium">
            <span>{selectedCount} node{selectedCount > 1 ? 's' : ''} selected</span>
            <span className="opacity-40">|</span>
            <span className="opacity-60 text-[10px]">drag to move · Delete to remove</span>
            <button
              onClick={() => handleLockSelected(true)}
              className="text-amber-300 hover:text-amber-200 transition-colors"
            >
              🔒 Lock
            </button>
            <button
              onClick={() => handleLockSelected(false)}
              className="text-muted-foreground hover:text-background/80 transition-colors"
            >
              🔓 Unlock
            </button>
            <button
              onClick={handleDeleteSelected}
              className="text-red-300 hover:text-red-200 transition-colors"
            >
              Delete all
            </button>
          </div>
        )}

        {rfNodes.length === 0 && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-2">
            <p className="text-sm text-muted-foreground/40 select-none">
              Drag nodes from the palette to start mapping
            </p>
          </div>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={(changes: NodeChange[]) => {
            onNodesChange(changes)
            // When a drag ends (position change with dragging===false), commit positions.
            // We use applyNodeChanges() to compute the final node positions synchronously
            // from the pending changes — this avoids stale-ref and setTimeout timing bugs
            // where rfNodesRef.current might not yet reflect the final drag position.
            if (!readOnly && changes.some(c => c.type === 'position' && !(c as any).dragging)) {
              const updatedNodes = applyNodeChanges(changes, rfNodesRef.current)
              commit(fromRfNodes(updatedNodes), fromRfEdges(rfEdgesRef.current))
            }
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={readOnly ? undefined : handleNodeDoubleClick}
          onEdgeDoubleClick={readOnly ? undefined : handleEdgeDoubleClick}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          nodeTypes={NODE_TYPES}
          minZoom={0.2}
          defaultViewport={{ x: 80, y: 10, zoom: 0.9 }}
          deleteKeyCode={readOnly ? null : 'Delete'}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          selectionOnDrag
          panOnDrag={[0, 1, 2]}
          panOnScroll={true}
          onNodesDelete={readOnly ? undefined : (deleted) => deleted.forEach((n) => handleNodeDelete(n.id))}
          colorMode={colorMode ?? 'light'}
          style={{ background: 'transparent' }}
        >
          {/* SwimlaneOverlay removed — free layout with color-coded nodes instead */}
          <Background gap={20} size={1} color="#e5e7eb50" />
          <Controls />
          {!readOnly && (
            <MiniMap
              nodeColor={(n) => NODE_MINIMAP_COLORS[n.type as ProcessNodeType] ?? '#94a3b8'}
              maskColor="rgba(0,0,0,0.04)"
              style={{ bottom: 64, right: 8, width: 160, height: 100 }}
              pannable
              zoomable
            />
          )}
        </ReactFlow>

        {!readOnly && <NodePalette onDragStart={(type, lane) => setDraggingType({ type, lane })} />}
      </div>

      <MapQualityChecklist processMap={processMap} activeLanes={lanes} />

      {editingNode && (
        <NodeEditDialog
          node={editingNode}
          onSave={(id, label, time, lane, badge, durationMinutes, attachments, nodeColor, locked) =>
            handleEditSave(id, label, time, lane, badge, durationMinutes, attachments, nodeColor, locked)
          }
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
  colorMode?: 'light' | 'dark'
  onChange: (map: ProcessMap) => void
  onRelayout: (direction: CanvasDirection) => void
  onLineStyleChange: (style: LineStyle) => void
  layoutKey?: number
  // Registers a getter that ProcessBuilder can call at save time to read
  // the current canvas state directly from rfNodes, bypassing entry.processMap
  onRegisterGetter?: (getter: () => ProcessMap) => void
}

export default function ProcessCanvas({ processMap, teamOwner, workato, decagonL0, direction, lineStyle, canvasLabel, readOnly, onChange, onRelayout, onLineStyleChange, layoutKey, onRegisterGetter }: ProcessCanvasProps) {
  const { resolvedTheme } = useTheme()
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
  const canvasKey = `canvas-${processMap.nodes.length}-${processMap.nodes.map(n => n.id).join(',')}-${layoutKey ?? 0}`

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
        colorMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={onChange}
        onRelayout={onRelayout}
        onLineStyleChange={onLineStyleChange}
        onRegisterGetter={onRegisterGetter}
      />
    </ReactFlowProvider>
  )
}
