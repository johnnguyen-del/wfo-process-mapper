import { useState } from 'react'
import { ExternalLink, Trash2, Plus } from 'lucide-react'
import type { KbLink } from '@/lib/types'

const TYPE_LABELS: Record<KbLink['type'], string> = {
  guru: 'Guru Card',
  notion: 'Notion',
  gdoc: 'Google Doc',
  custom: 'Link',
}
const TYPE_ICONS: Record<KbLink['type'], string> = {
  guru: '🟢',
  notion: '⬛',
  gdoc: '📄',
  custom: '🔗',
}

interface KbLinksPanelProps {
  links: KbLink[]
  onChange: (links: KbLink[]) => void
  label?: string   // optional section label, defaults to "Knowledge Base Links"
}

export default function KbLinksPanel({ links, onChange, label = 'Knowledge Base Links' }: KbLinksPanelProps) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{ type: KbLink['type']; url: string; title: string }>({
    type: 'notion',
    url: '',
    title: '',
  })

  function handleAdd() {
    if (!form.url.trim()) return
    const newLink: KbLink = {
      id: crypto.randomUUID(),
      type: form.type,
      url: form.url.trim(),
      title: form.title.trim() || undefined,
    }
    onChange([...links, newLink])
    setForm({ type: 'notion', url: '', title: '' })
    setAdding(false)
  }

  function handleRemove(id: string) {
    onChange(links.filter(l => l.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setAdding(s => !s)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {links.map(link => (
        <div key={link.id} className="flex items-center gap-2 text-xs border rounded px-2 py-1.5">
          <span className="shrink-0">{TYPE_ICONS[link.type]}</span>
          <span className="text-muted-foreground shrink-0">{TYPE_LABELS[link.type]}</span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-blue-600 hover:underline min-w-0"
          >
            {link.title || link.url}
          </a>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </a>
          <button type="button" onClick={() => handleRemove(link.id)} className="shrink-0">
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500 transition-colors" />
          </button>
        </div>
      ))}

      {adding && (
        <div className="border rounded p-2 space-y-2 bg-muted/20">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as KbLink['type'] }))}
            className="w-full border rounded px-2 py-1 text-xs bg-background"
          >
            {(Object.keys(TYPE_LABELS) as KbLink['type'][]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            type="url"
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Display title (optional)"
            className="w-full border rounded px-2 py-1 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 bg-foreground text-background rounded py-1 text-xs font-medium"
            >
              Add Link
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 border rounded py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
