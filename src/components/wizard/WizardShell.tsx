import { cn } from '@/lib/utils'

const STEPS = [
  'Worth Mapping?',
  'Core Identity',
  'Volume & Tools',
  'Automation',
  'Comms & Risk',
  'Taxonomy',
  'Review',
]

interface WizardShellProps {
  step: number
  onStepClick?: (s: number) => void
  children: React.ReactNode
}

export default function WizardShell({ step, onStepClick, children }: WizardShellProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Step progress */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 overflow-x-auto shrink-0 scrollbar-none">
        {STEPS.map((label, i) => (
          <button
            key={i}
            onClick={() => step > 0 && onStepClick?.(i)}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full shrink-0 transition-colors',
              i === step
                ? 'bg-foreground text-background font-medium'
                : i < step
                ? 'bg-muted text-foreground cursor-pointer hover:bg-muted/80'
                : 'text-muted-foreground cursor-default'
            )}
          >
            <span className={cn(
              'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
              i === step ? 'bg-background text-foreground'
              : i < step ? 'bg-green-500 text-white'
              : 'bg-muted-foreground/30 text-muted-foreground'
            )}>
              {i < step ? '✓' : i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-5">
        {children}
      </div>
    </div>
  )
}

export { STEPS }
