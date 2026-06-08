import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { ProcessEntry, Domain } from '@/lib/types'
import { listEntries, saveEntry } from '@/lib/storage'
import { ExternalLink, Edit, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TIER_COLORS = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  '': 'bg-gray-100 text-gray-500',
}

// Owner check — same pattern as PlaybookStudio
function isOwner(): boolean {
  try {
    return (window as any).MagicAuth?.viewer?.()?.isOwner === true
  } catch {
    return false
  }
}

export default function ProcessList() {
  const [entries, setEntries] = useState<ProcessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [owner] = useState(isOwner)

  function load() {
    setLoading(true)
    listEntries().then((e) => { setEntries(e); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function handleDelete(entry: ProcessEntry) {
    if (!window.confirm(`Delete "${entry.processName}"? This cannot be undone.`)) return
    try {
      // Mark as deleted by saving with a sentinel — storage.ts doesn't have delete yet
      // so we filter it out by saving with a special flag
      const scope = (window as any).MagicStorage?.public ?? null
      if (scope?.delete) {
        await scope.delete(`processes/${entry.id}`)
      } else {
        window.localStorage.removeItem(`wfo-process-mapper:processes/${entry.id}`)
      }
      setEntries(prev => prev.filter(e => e.id !== entry.id))
      toast.success(`"${entry.processName}" deleted`)
    } catch {
      toast.error('Delete failed')
    }
  }

  const domains = ['Banking', 'Transfers', 'Invest', 'Security & Risk'] as Domain[]
  const grouped = Object.fromEntries(
    domains.map((d) => [d, entries.filter((e) => e.domain === d)])
  )
  const undomained = entries.filter((e) => !e.domain)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WFO Process Mapper</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {entries.length} process{entries.length !== 1 ? 'es' : ''} captured
            {owner && <span className="ml-2 text-xs bg-foreground text-background px-1.5 py-0.5 rounded font-medium">Owner</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/new">+ New Process</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm py-12 text-center">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-muted-foreground text-sm py-16 text-center border rounded-lg">
          No processes captured yet.{' '}
          <Link to="/new" className="underline hover:text-foreground">Start with + New Process</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {domains.map((domain) => {
            const domainEntries = grouped[domain]
            if (domainEntries.length === 0) return null
            return (
              <section key={domain}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{domain}</h2>
                <div className="border rounded-lg divide-y">
                  {domainEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} owner={owner} onDelete={handleDelete} />
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
                  <EntryRow key={entry.id} entry={entry} owner={owner} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function EntryRow({ entry, owner, onDelete }: { entry: ProcessEntry; owner: boolean; onDelete: (e: ProcessEntry) => void }) {
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
          {entry.domain && <span className="text-[11px] text-muted-foreground">{entry.domain}</span>}
          {entry.teamOwner.map((t) => (
            <span key={t} className="text-[11px] text-muted-foreground">{t}</span>
          ))}
          {entry.submittedAt && (
            <span className="text-[11px] text-muted-foreground">
              · {new Date(entry.submittedAt).toLocaleDateString()}
            </span>
          )}
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
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-0.5 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Notion
          </a>
        )}
        <Button variant="ghost" size="sm" asChild className="h-7 px-2">
          <Link to={`/edit/${entry.id}`}>
            <Edit className="w-3.5 h-3.5" />
          </Link>
        </Button>
        {owner && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
