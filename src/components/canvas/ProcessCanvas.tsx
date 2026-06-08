import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { ProcessMap, ProcessNode, ProcessEdge, ProcessNodeType, SwimLane, TeamOwner } from '@/lib/types'
import StepNode from './node-types/StepNode'
import DecisionNode from './node-types/DecisionNode'
import AutomationNode from './node-types/AutomationNode'
import CommsNode from './node-types/CommsNode'
import StartEndNode from './node-types/StartEndNode'
import NodePalette from './NodePalette'
import MapQualityChecklist from './MapQualityChecklist'
import NodeEditDialog from './NodeEditDialog'

const NODE_TYPES = {
  step: StepNode,
  decision: DecisionNode,
  automation: AutomationNode,
  comms: CommsNode,
  start: StartEndNode,
  end: StartEndNode,
}

const LANE_HEIGHT = 150
const LANE_COLORS: Record<SwimLane, string> = {
  CS: '#dbeafe99',
  Ops: '#dcfce799',
  'Fraud Ops': '#f3e8ff99',
  'L2 - Risk': '#fef9c399',
  Automation: '#e5e7eb99',
  Client: '#f1f5f999',
}
const LANE_LABEL_COLORS: Record<SwimLane, string> = {
  CS: '#1d4ed8',
  Ops: '#15803d',
  'Fraud Ops': '#7e22ce',
  'L2 - Risk': '#a16207',
  Automation: '#374151',
  Client: '#475569',
}

const ALL_LANES: SwimLane[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk', 'Automation', 'Client']

function toRfNodes(nodes: ProcessNode[], lanes: SwimLane[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { label: n.label, lane: n.lane, timeEstimate: n.timeEstimate, type: n.type },
    style: { zIndex: 1 },
  }))
}

function toRfEdges(edges: ProcessEdge[]): Edge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'smoothstep',
    style: { strokeWidth: 1.5 },
  }))
}

function fromRfNodes(rfNodes: Node[], lanes: SwimLane[]): ProcessNode[] {
  return rfNodes.map((n) => ({
    id: n.id,
    type: n.type as ProcessNodeType,
    label: (n.data as any).label,
    lane: (n.data as any).lane as SwimLane,
    timeEstimate: (n.data as any).timeEstimate,
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

function laneYFromPosition(y: number, lanes: SwimLane[]): SwimLane {
  const idx = Math.max(0, Math.min(lanes.length - 1, Math.floor(y / LANE_HEIGHT)))
  return lanes[idx]
}

function laneYCenter(lanes: SwimLane[], lane: SwimLane): number {
  const idx = lanes.indexOf(lane)
  return idx === -1 ? 0 : idx * LANE_HEIGHT + LANE_HEIGHT / 2 - 20
}

interface ProcessCanvasProps {
  processMap: ProcessMap
  teamOwner: TeamOwner[]
  workato: boolean
  decagonL0: boolean
  onChange: (map: ProcessMap) => void
}

export default function ProcessCanvas({
  processMap,
  teamOwner,
  workato,
  decagonL0,
  onChange,
}: ProcessCanvasProps) {
  const activeLanes: SwimLane[] = [
    ...(['CS', 'Ops', 'Fraud Ops', 'L2 - Risk'] as SwimLane[]).filter((l) =>
      teamOwner.includes(l as TeamOwner)
    ),
    ...(workato || decagonL0 ? ['Automation' as SwimLane] : []),
    'Client' as SwimLane,
  ]
  const lanes = activeLanes.length > 0 ? activeLanes : ALL_LANES

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(toRfNodes(processMap.nodes, lanes))
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(toRfEdges(processMap.edges))

  const [draggingType, setDraggingType] = useState<{ type: ProcessNodeType; lane: SwimLane } | null>(null)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const idCounter = useRef(processMap.nodes.length + 1)

  function commit(nodes: Node[], edges: Edge[]) {
    onChange({
      nodes: fromRfNodes(nodes, lanes),
      edges: fromRfEdges(edges),
    })
  }

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'smoothstep',
        style: { strokeWidth: 1.5 },
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
    if (!draggingType || !wrapperRef.current) return
    const bounds = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - bounds.left - 60
    const y = e.clientY - bounds.top
    const lane = laneYFromPosition(y, lanes)
    const snappedY = laneYCenter(lanes, lane)

    const newNode: Node = {
      id: `n${idCounter.current++}`,
      type: draggingType.type,
      position: { x: Math.max(100, x), y: snappedY },
      data: { label: draggingType.type.charAt(0).toUpperCase() + draggingType.type.slice(1), lane, type: draggingType.type },
    }
    setRfNodes((prev) => {
      const updated = [...prev, newNode]
      commit(updated, rfEdges)
      return updated
    })
    setDraggingType(null)
  }

  function handleNodeDoubleClick(_e: React.MouseEvent, node: Node) {
    setEditingNode(node)
  }

  function handleNodeDelete(nodeId: string) {
    setRfNodes((prev) => {
      const updated = prev.filter((n) => n.id !== nodeId)
      const filteredEdges = rfEdges.filter((e) => e.source !== nodeId && e.target !== nodeId)
      setRfEdges(filteredEdges)
      commit(updated, filteredEdges)
      return updated
    })
  }

  function handleEditSave(id: string, label: string, timeEstimate: string) {
    setRfNodes((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label, timeEstimate: timeEstimate || undefined } } : n
      )
      commit(updated, rfEdges)
      return updated
    })
    setEditingNode(null)
  }

  const totalHeight = lanes.length * LANE_HEIGHT

  return (
    <div className="flex flex-col h-full">
      <div
        ref={wrapperRef}
        className="relative flex-1"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Swimlane background */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {lanes.map((lane, i) => (
            <div
              key={lane}
              className="absolute left-0 right-0 border-b border-border/50 flex items-center"
              style={{
                top: i * LANE_HEIGHT,
                height: LANE_HEIGHT,
                backgroundColor: LANE_COLORS[lane],
                borderLeft: `3px solid ${LANE_LABEL_COLORS[lane]}`,
              }}
            >
              <span
                className="text-[11px] font-bold px-2 select-none w-20 shrink-0"
                style={{ color: LANE_LABEL_COLORS[lane] }}
              >
                {lane}
              </span>
            </div>
          ))}
        </div>

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={(changes) => {
            onNodesChange(changes)
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes)
          }}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodeTypes={NODE_TYPES}
          fitView
          minZoom={0.3}
          defaultViewport={{ x: 80, y: 0, zoom: 0.85 }}
          deleteKeyCode="Delete"
          onNodesDelete={(deleted) => {
            deleted.forEach((n) => handleNodeDelete(n.id))
          }}
          style={{ background: 'transparent' }}
        >
          <Background gap={20} size={1} color="#e5e7eb" />
          <Controls />
        </ReactFlow>

        <NodePalette
          onDragStart={(type, lane) => setDraggingType({ type, lane })}
        />
      </div>

      <MapQualityChecklist processMap={processMap} activeLanes={lanes} />

      {editingNode && (
        <NodeEditDialog
          node={editingNode}
          onSave={handleEditSave}
          onDelete={() => {
            handleNodeDelete(editingNode.id)
            setEditingNode(null)
          }}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  )
}
