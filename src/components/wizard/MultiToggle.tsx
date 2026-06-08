import { cn } from '@/lib/utils'

interface MultiToggleProps<T extends string> {
  options: T[]
  value: T[]
  onChange: (v: T[]) => void
  single?: boolean
}

export default function MultiToggle<T extends string>({
  options,
  value,
  onChange,
  single,
}: MultiToggleProps<T>) {
  function toggle(opt: T) {
    if (single) {
      onChange([opt])
      return
    }
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
      onChange([...value, opt])
    }
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
    </div>
  )
}
