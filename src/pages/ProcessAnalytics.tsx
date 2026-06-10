import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listEntries, loadFolders } from '@/lib/storage'
import type { ProcessEntry, FolderEntry, SwimLane } from '@/lib/types'
import { findPaths, pathDuration, pathWorkSteps } from '@/lib/outcomeUtils'
import { LANE_COLORS, LANE_LABEL_COLORS } from '@/components/canvas/ProcessCanvas'

const DOMAINS = ['Banking', 'Transfers', 'Invest', 'Security & Risk', 'PRR'] as const

function outcomeVariant(endLabel: string): 'green' | 'red' | 'amber' | 'neutral' {
  const l = endLabel.toLowerCase()
  if (/resolv|complet|success|done|approv|pass|legitimate/.test(l)) return 'green'
  if (/escalat|fail|block|deny|declin|fraud|unable|reject/.test(l)) return 'red'
  if (/pend|hold|wait|review|triage/.test(l)) return 'amber'
  return 'neutral'
}

const VARIANT_STYLES = {
  green:   { header: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700',   text: 'text-green-700'  },
  red:     { header: 'bg-red-50 border-red-200',      badge: 'bg-red-100 text-red-700',       text: 'text-red-700'    },
  amber:   { header: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700',   text: 'text-amber-700'  },
  neutral: { header: 'bg-muted/30 border-border',     badge: 'bg-muted text-muted-foreground', text: 'text-foreground' },
}
const VARIANT_ICON = { green: '✓', red: '✗', amber: '⚠', neutral: '○' }

export default function ProcessAnalytics() {
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterFolderId, setFilterFolderId] = useState('')
  const [query, setQuery] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadFolders().then(setFolders).catch(() => {})
    listEntries()
      .then(all => { setEntries(all.filter(e => !e.deletedAt)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => entries.filter(e => {
    if (filterDomain && e.domain !== filterDomain) return false
    if (filterFolderId && e.folderId !== filterFolderId) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      return e.processName?.toLowerCase().includes(q) || (e.domain ?? '').toLowerCase().includes(q)
    }
    return true
  }), [entries, filterDomain, filterFolderId, query])

  const grouped = useMemo(() => {
    const map = new Map<string, ProcessEntry[]>()
    DOMAINS.forEach(d => map.set(d, []))
    map.set('__other__', [])
    filtered.forEach(e => {
      const key = (DOMAINS as readonly string[]).includes(e.domain ?? '') ? (e.domain ?? '__other__') : '__other__'
      map.get(key)!.push(e)
    })
    return map
  }, [filtered])

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/processes">← Back</Link></Button>
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Process Analytics</h1>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search processes…"
              className="border rounded-lg pl-8 pr-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-foreground/20" />
          </div>
          <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs bg-background">
            <option value="">All Domains</option>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {folders.length > 0 && (
            <select value={filterFolderId} onChange={e => setFilterFolderId(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs bg-background">
              <option value="">All Folders</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} process{filtered.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {loading && <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No processes found. <Link to="/new" className="underline">Create one</Link>.
          </p>
        )}

        {[...grouped.entries()].map(([domain, domainEntries]) => {
          if (domainEntries.length === 0) return null
          const label = domain === '__other__' ? 'Other' : domain
          return (
            <div key={domain} className="mb-8">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {label} · {domainEntries.length} process{domainEntries.length !== 1 ? 'es' : ''}
              </h2>
              <div className="space-y-3">
                {domainEntries.map(entry => (
                  <ProcessCard key={entry.id} entry={entry}
                    expanded={expandedIds.has(entry.id)}
                    onToggle={() => toggleExpanded(entry.id)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── ProcessCard ───────────────────────────────────────────────────────────────

function ProcessCard({ entry, expanded, onToggle }: {
  entry: ProcessEntry; expanded: boolean; onToggle: () => void
}) {
  const processMap = entry.processMap ?? { nodes: [], edges: [] }
  const paths = useMemo(() => findPaths(processMap), [processMap])
  const nodeMap = useMemo(() => new Map(processMap.nodes.map(n => [n.id, n])), [processMap])

  const steps = paths.map(p => pathWorkSteps(p))
  const durations = paths.map(p => pathDuration(p, nodeMap))

  const minSteps = steps.length ? Math.min(...steps) : 0
  const maxSteps = steps.length ? Math.max(...steps) : 0
  const minDur = durations.length ? Math.min(...durations) : 0
  const maxDur = durations.length ? Math.max(...durations) : 0
  const maxTeams = paths.length
    ? Math.max(...paths.map(p => new Set(p.map(id => nodeMap.get(id)?.lane).filter(Boolean)).size))
    : 0

  const stepsLabel = minSteps === maxSteps ? `${minSteps}` : `${minSteps}–${maxSteps}`
  const durLabel = minDur === 0 && maxDur === 0 ? '—'
    : minDur === maxDur ? `${minDur} min` : `${minDur}–${maxDur} min`

  return (
    <div className={cn('border rounded-xl overflow-hidden transition-colors',
      expanded ? 'border-blue-300' : 'border-border')}>
      <button onClick={onToggle}
        className={cn('w-full text-left px-4 py-3 flex items-center gap-3 transition-colors',
          expanded ? 'bg-blue-50' : 'bg-background hover:bg-muted/30')}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{entry.processName || 'Untitled'}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {entry.domain}{entry.teamOwner?.length ? ` · ${entry.teamOwner.join(', ')}` : ''}
          </div>
        </div>
        <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full px-2 py-0.5 shrink-0">
          {paths.length} outcome{paths.length !== 1 ? 's' : ''}
        </span>
        {steps.length > 0 && (
          <span className="bg-muted text-muted-foreground text-[10px] rounded-full px-2 py-0.5 shrink-0 hidden sm:block">
            {stepsLabel} steps
          </span>
        )}
        {minDur > 0 && (
          <span className="bg-muted text-muted-foreground text-[10px] rounded-full px-2 py-0.5 shrink-0 hidden sm:block">
            {durLabel}
          </span>
        )}
        <Link to={`/edit/${entry.id}`} onClick={e => e.stopPropagation()}
          className="text-[10px] text-indigo-600 hover:underline shrink-0 hidden sm:block">
          Open canvas ↗
        </Link>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-blue-200 bg-white">
          {/* Aggregate stats */}
          {paths.length > 0 && (
            <div className="grid grid-cols-4 gap-px border-b border-border bg-border">
              {[
                { label: 'Outcomes', value: paths.length },
                { label: 'Steps range', value: stepsLabel },
                { label: 'Time range', value: durLabel },
                { label: 'Max teams', value: maxTeams || '—' },
              ].map(s => (
                <div key={s.label} className="bg-muted/20 px-4 py-2 text-center">
                  <div className="text-base font-bold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {paths.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-4">
              No complete paths found — add Start and End nodes connected by edges.
            </p>
          )}
          {paths.map((path, i) => (
            <OutcomeCard key={path.join('-')} path={path} index={i}
              nodeMap={nodeMap} processId={entry.id} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── OutcomeCard ───────────────────────────────────────────────────────────────

function OutcomeCard({ path, index, nodeMap, processId }: {
  path: string[]
  index: number
  nodeMap: Map<string, any>
  processId: string
}) {
  const endNode = nodeMap.get(path[path.length - 1])
  const endLabel: string = endNode?.label ?? 'End'
  const variant = outcomeVariant(endLabel)
  const styles = VARIANT_STYLES[variant]
  const dur = pathDuration(path, nodeMap)
  const workSteps = pathWorkSteps(path)

  // Lane counts along this path
  const laneCounts = new Map<string, number>()
  path.forEach(id => {
    const lane = nodeMap.get(id)?.lane
    if (lane) laneCounts.set(lane, (laneCounts.get(lane) ?? 0) + 1)
  })

  const canvasUrl = `/edit/${processId}?path=${encodeURIComponent(path.join(','))}`

  return (
    <div className={cn('border-b last:border-0', styles.header.split(' ')[0])}>
      {/* Header */}
      <div className={cn('px-4 py-2 flex items-center gap-2 border-b', styles.header)}>
        <span className={cn('text-xs font-bold', styles.text)}>
          {VARIANT_ICON[variant]} Outcome {index + 1}: {endLabel}
        </span>
        <span className={cn('text-[10px] font-semibold rounded-full px-2 py-0.5', styles.badge)}>
          {workSteps} step{workSteps !== 1 ? 's' : ''}
        </span>
        {dur > 0 && (
          <span className={cn('text-[10px] rounded-full px-2 py-0.5', styles.badge)}>{dur} min</span>
        )}
        <div className="flex-1" />
        <Link to={canvasUrl} className="text-[10px] text-blue-600 hover:underline shrink-0">
          View path in canvas →
        </Link>
      </div>

      {/* Linear flow — horizontal scroll */}
      <div className="px-4 py-2.5 overflow-x-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
        <div className="flex items-center gap-1.5" style={{ minWidth: 'max-content' }}>
          {path.map((nodeId, ni) => {
            const node = nodeMap.get(nodeId)
            const label: string = node?.label ?? nodeId
            const lane = node?.lane as SwimLane | undefined
            const isStart = node?.type === 'start'
            const isEnd = node?.type === 'end'
            const bgColor = lane ? (LANE_COLORS[lane] ?? '#f1f5f9') : '#f1f5f9'
            const borderColor = lane ? (LANE_LABEL_COLORS[lane] ?? '#94a3b8') : '#94a3b8'
            return (
              <div key={`${nodeId}-${ni}`} className="flex items-center gap-1.5">
                {ni > 0 && <span className="text-slate-300 font-bold text-sm select-none">→</span>}
                <span className="text-[10px] font-medium px-2.5 py-1 whitespace-nowrap"
                  style={{
                    backgroundColor: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: (isStart || isEnd) ? '999px' : '4px',
                    color: borderColor,
                  }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team chips */}
      {laneCounts.size > 0 && (
        <div className="px-4 pb-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Teams:</span>
          {[...laneCounts.entries()].map(([lane, count]) => (
            <span key={lane} className="text-[10px] font-semibold rounded px-1.5 py-0.5"
              style={{
                backgroundColor: LANE_COLORS[lane as SwimLane] ?? '#f1f5f9',
                color: LANE_LABEL_COLORS[lane as SwimLane] ?? '#374151',
              }}>
              {lane} ×{count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
