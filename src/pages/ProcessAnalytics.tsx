import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { listEntries } from '@/lib/storage'
import { computeMetrics } from '@/lib/metrics'
import type { ProcessEntry } from '@/lib/types'

type SortKey = 'name' | 'touchpoints' | 'transitions' | 'duration'

interface Row {
  entry: ProcessEntry
  totalTouchpoints: number
  totalTransitions: number
  totalDurationMinutes: number
  avgDurationMinutes: number
  missingCount: number
}

export default function ProcessAnalytics() {
  const [rows, setRows] = useState<Row[]>([])
  const [sortBy, setSortBy] = useState<SortKey>('duration')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listEntries().then(entries => {
      setRows(
        entries.map(entry => {
          const m = computeMetrics(entry.processMap)
          return {
            entry,
            totalTouchpoints: m.totalTouchpoints,
            totalTransitions: m.totalTransitions,
            totalDurationMinutes: m.totalDurationMinutes,
            avgDurationMinutes: m.avgDurationMinutes,
            missingCount: m.missingDuration.length,
          }
        })
      )
      setLoading(false)
    })
  }, [])

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'name') return (a.entry.processName || '').localeCompare(b.entry.processName || '')
    if (sortBy === 'touchpoints') return b.totalTouchpoints - a.totalTouchpoints
    if (sortBy === 'transitions') return b.totalTransitions - a.totalTransitions
    return b.totalDurationMinutes - a.totalDurationMinutes
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">← Back</Link>
        </Button>
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Process Analytics</h1>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-2 mb-4 items-center">
          <span className="text-xs text-muted-foreground">Sort by:</span>
          {([
            ['duration', 'Duration'],
            ['touchpoints', 'Touchpoints'],
            ['transitions', 'Transitions'],
            ['name', 'Name'],
          ] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded text-xs font-medium border transition-colors',
                sortBy === key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/40'
              )}
            >
              {label}
              {sortBy === key && <ArrowUpDown className="w-3 h-3" />}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-muted-foreground text-sm py-8 text-center">Loading processes…</p>
        )}

        {!loading && sorted.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No saved processes yet. <Link to="/new" className="underline">Create one</Link>.
          </p>
        )}

        {!loading && sorted.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Process</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">Touchpoints</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">Transitions</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">Total (min)</th>
                  <th className="text-right px-4 py-2.5 font-medium text-xs text-muted-foreground">Avg (min)</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(({ entry, totalTouchpoints, totalTransitions, totalDurationMinutes, avgDurationMinutes, missingCount }) => (
                  <tr key={entry.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link to={`/edit/${entry.id}`} className="font-medium hover:underline">
                        {entry.processName || 'Untitled'}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {entry.domain}
                        {missingCount > 0 && (
                          <span className="ml-2 text-amber-500">⏱ {missingCount} missing</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totalTouchpoints}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{totalTransitions}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{totalDurationMinutes}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {totalTouchpoints > 0 ? avgDurationMinutes : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
