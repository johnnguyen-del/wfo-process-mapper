import { useState, useEffect } from 'react'
import { Search, Link, Loader2, CheckCircle, AlertTriangle, BookOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  searchGuru, getGuruCardById, parseGuruCardId, hasWorkflowData,
  type GuruCard,
} from '@/lib/guru'

interface GuruImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (card: GuruCard) => void
}

export default function GuruImportModal({ open, onOpenChange, onImport }: GuruImportModalProps) {
  const [inputMode, setInputMode] = useState<'url' | 'search'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<GuruCard[]>([])
  const [preview, setPreview] = useState<GuruCard | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setUrlInput(''); setSearchQuery(''); setResults([]); setPreview(null); setError(null)
    }
  }, [open])

  async function handleFetchByUrl() {
    const cardId = parseGuruCardId(urlInput)
    if (!cardId) {
      setError('Paste a Guru card URL (app.getguru.com/card/…) or an 8-char card ID.')
      return
    }
    setLoading(true); setError(null); setPreview(null)
    try {
      const card = await getGuruCardById(cardId)
      setPreview(card)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch card.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setLoading(true); setError(null); setResults([]); setPreview(null)
    try {
      const cards = await searchGuru(searchQuery.trim())
      if (cards.length === 0) setError('No cards found. Try different keywords.')
      else setResults(cards)
    } catch (err: any) {
      setError(err?.message ?? 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  function handleImport(card: GuruCard) {
    onImport(card)
    onOpenChange(false)
  }

  const isDevMode = typeof MagicTools === 'undefined'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4 text-green-600" />
            Import from Guru
          </DialogTitle>
        </DialogHeader>

        {isDevMode ? (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-3">
            Guru import requires the deployed version. Run <code className="font-mono text-xs bg-muted px-1 rounded">magic put</code> then open the deployed app at <strong>magic.w10e.com</strong>.
          </p>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex gap-1 border rounded-lg p-0.5 bg-muted/30">
              <button
                onClick={() => { setInputMode('url'); setError(null); setResults([]) }}
                className={cn('flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5',
                  inputMode === 'url' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Link className="w-3 h-3" /> Card URL / ID
              </button>
              <button
                onClick={() => { setInputMode('search'); setError(null); setPreview(null) }}
                className={cn('flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1.5',
                  inputMode === 'search' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <Search className="w-3 h-3" /> Search
              </button>
            </div>

            {inputMode === 'url' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="app.getguru.com/card/cxE5E4ai/… or card ID"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setError(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchByUrl()}
                    className="text-sm"
                  />
                  <Button onClick={handleFetchByUrl} disabled={!urlInput.trim() || loading} size="sm" className="shrink-0">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                  </Button>
                </div>
                {preview && <CardPreviewRow card={preview} onImport={handleImport} />}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. metal card reissuance, NSF fee, wire transfer…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setError(null) }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-sm"
                  />
                  <Button onClick={handleSearch} disabled={!searchQuery.trim() || loading} size="sm" className="shrink-0">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {results.length > 0 && (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {results.map((card) => (
                      <CardPreviewRow key={card.id} card={card} onImport={handleImport} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CardPreviewRow({ card, onImport }: { card: GuruCard; onImport: (c: GuruCard) => void }) {
  const hasData = hasWorkflowData(card.content)
  return (
    <div className="border rounded-lg p-3 space-y-1.5 bg-background">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium leading-tight">{card.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {card.content.slice(0, 180)}{card.content.length > 180 ? '…' : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => onImport(card)} className="shrink-0 h-7 px-3 text-xs">
          Import
        </Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasData ? (
          <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            <CheckCircle className="w-2.5 h-2.5" /> Has workflow data
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <AlertTriangle className="w-2.5 h-2.5" /> May lack workflow steps
          </span>
        )}
        {card.lastModified && (
          <span className="text-[10px] text-muted-foreground">
            Updated {new Date(card.lastModified).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  )
}
