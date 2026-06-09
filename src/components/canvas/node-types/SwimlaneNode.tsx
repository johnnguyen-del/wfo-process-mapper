import { NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

const BORDER_MAP: Record<string, string> = {
  '#dbeafe': '#1d4ed8',
  '#dcfce7': '#15803d',
  '#f3e8ff': '#7e22ce',
  '#fef9c3': '#a16207',
  '#e5e7eb': '#374151',
  '#f1f5f9': '#475569',
}

export default function SwimlaneNode({ data, selected }: NodeProps) {
  const bg = (data as any).nodeColor ?? '#dbeafe'
  const border = BORDER_MAP[bg] ?? '#94a3b8'
  const label = (data as any).label ?? 'Lane'

  return (
    <>
      <NodeResizer
        minWidth={120}
        minHeight={60}
        isVisible={selected}
        lineStyle={{ borderColor: border }}
        handleStyle={{ borderColor: border, backgroundColor: 'white' }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bg,
          border: `2px dashed ${border}`,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          opacity: 0.85,
        }}
      >
        <div
          style={{
            width: 44,
            flexShrink: 0,
            backgroundColor: `${border}22`,
            borderRight: `2px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: border,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ flex: 1 }} />
      </div>
    </>
  )
}
