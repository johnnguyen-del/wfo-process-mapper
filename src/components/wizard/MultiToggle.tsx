import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MultiToggleProps<T extends string> {
  options: T[]
  value: T[]
  onChange: (v: T[]) => void
  single?: boolean
  customizable?: boolean   // when true, shows "+ Custom" chip with inline input
}

export default function MultiToggle<T extends string>({
  options,
  value,
  onChange,
  single,
  customizable,
}: MultiToggleProps<T>) {
  const [adding, setAdding] = useState(false)
  const [customInput, setCustomInput] = useState('')

  // Custom values = values not in the predefined options list
  const customValues = value.filter(v => !options.includes(v))

  function toggle(opt: T) {
    if (single) {
      onChange(value.includes(opt) ? [] : [opt])
      return
    }
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) { setAdding(false); return }
    const next = value.includes(trimmed as T)
      ? value
      : single
      ? [trimmed as T]
      : [...value, trimmed as T]
    onChange(next)
    setCustomInput('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm border transition-colors font-medium',
              selected
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:border-foreground/40'
            )}
          >
            {opt}
          </button>
        )
      })}

      {/* Custom values already selected */}
      {customizable && customValues.map(cv => (
        <button
          key={cv}
          type="button"
          onClick={() => onChange(value.filter(v => v !== cv))}
          className="px-3 py-1.5 rounded-full text-sm border transition-colors font-medium bg-foreground text-background border-foreground flex items-center gap-1"
        >
          {cv}
          <span className="text-background/60 text-xs leading-none">✕</span>
        </button>
      ))}

      {/* + Custom button / inline input */}
      {customizable && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-full text-sm border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Custom
        </button>
      )}

      {customizable && adding && (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addCustom() }
              if (e.key === 'Escape') { setAdding(false); setCustomInput('') }
            }}
            placeholder="Type and press Enter"
            className="border rounded-full px-3 py-1 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <button
            type="button"
            onClick={addCustom}
            className="text-xs bg-foreground text-background rounded-full px-2 py-1"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setCustomInput('') }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
