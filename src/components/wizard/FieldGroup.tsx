import { cn } from '@/lib/utils'

interface FieldGroupProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export default function FieldGroup({ label, hint, error, required, children, className }: FieldGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
