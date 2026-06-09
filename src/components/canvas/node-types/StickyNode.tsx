import type { NodeProps } from '@xyflow/react'

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  '#fef9c3': { bg: '#fef9c3', border: '#fde047', text: '#713f12' },
  '#fce7f3': { bg: '#fce7f3', border: '#f9a8d4', text: '#831843' },
  '#dcfce7': { bg: '#dcfce7', border: '#86efac', text: '#14532d' },
  '#dbeafe': { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
}

const DEFAULT = COLOR_MAP['#fef9c3']

export default function StickyNode({ data }: NodeProps) {
  const key = (data as any).nodeColor ?? '#fef9c3'
  const { bg, border, text } = COLOR_MAP[key] ?? DEFAULT
  const label = (data as any).label ?? ''

  return (
    <div
      style={{
        width: 160,
        minHeight: 100,
        backgroundColor: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 6,
        padding: '8px 10px',
        fontSize: 11,
        color: text,
        fontWeight: 500,
        boxShadow: '2px 3px 6px rgba(0,0,0,0.12)',
        lineHeight: 1.4,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
    >
      {label || <span style={{ opacity: 0.4 }}>Double-click to edit</span>}
    </div>
  )
}
