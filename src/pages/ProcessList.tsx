import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProcessEntry, Domain } from '@/lib/types'
import { listEntries } from '@/lib/storage'
import { ExternalLink, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

const DOMAIN_COLORS: Record<Domain, string> = {
  Banking: 'bg-blue-100 text-blue-800',
  Transfers: 'bg-green-100 text-green-800',
  Invest: 'bg-purple-100 text-purple-800',
  'Security & Risk': 'bg-red-100 text-red-800',
}

const TIER_COLORS = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  '': 'bg-gray-100 text-gray-500',
}

export default function ProcessList() {
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listEntries().then((e) => {
      setEntries(e)
      setLoading(false)
    })
  }, [])

  const domains = ['Banking', 'Transfers', 'Invest', 'Security & Risk'] as Domain[]
  const grouped = Object.fromEntries(
    domains.map((d) => [d, entries.filter((e) => e.domain === d)])
  )
  const undomained = entries.filter((e) => !e.domain)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WFO Process Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-guided process mapping — {entries.length} process{entries.length !== 1 ? 'es' : ''} captured
          </p>
        </div>
        <Button asChild>
          <Link to="/new">+ New Process</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-12 text-center">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-muted-foreground text-sm py-16 text-center border rounded-lg">
          No processes captured yet.{' '}
          <Link to="/new" className="underline hover:text-foreground">
            Start with + New Process
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {domains.map((domain) => {
            const domainEntries = grouped[domain]
            if (domainEntries.length === 0) return null
            return (
              <section key={domain}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {domain}
                </h2>
                <div className="border rounded-lg divide-y">
                  {domainEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            )
          })}
          {undomained.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Drafts (no domain)</h2>
              <div className="border rounded-lg divide-y">
                {undomained.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry }: { entry: ProcessEntry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {entry.processName || <span className="text-muted-foreground italic">Untitled</span>}
          </span>
          {entry.status === 'submitted' ? (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Submitted</span>
          ) : (
            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Draft</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {entry.teamOwner.map((t) => (
            <span key={t} className="text-[11px] text-muted-foreground">{t}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.volumeTier && (
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', TIER_COLORS[entry.volumeTier])}>
            {entry.volumeTier}
          </span>
        )}
        {entry.notionPageUrl && (
          <a
            href={entry.notionPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <Button variant="ghost" size="sm" asChild className="h-7 px-2">
          <Link to={`/edit/${entry.id}`}>
            <Edit className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
