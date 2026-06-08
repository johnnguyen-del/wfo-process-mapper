import type { ProcessEntry } from '@/lib/types'
import { validateEntry } from '@/lib/validate'
import { downloadYaml } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewStepProps {
  entry: ProcessEntry
  onSubmit: () => void
  submitting: boolean
}

export default function ReviewStep({ entry, onSubmit, submitting }: ReviewStepProps) {
  const errors = validateEntry(entry)
  const criticalErrors = errors.filter((e) => e.critical)
  const warnings = errors.filter((e) => !e.critical)
  const canSubmit = criticalErrors.length === 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fix any critical issues before submitting. Warnings are allowed but flagged in the output.
        </p>
      </div>

      {canSubmit && criticalErrors.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          All required fields complete — ready to submit.
        </div>
      )}

      {criticalErrors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {criticalErrors.length} issue{criticalErrors.length > 1 ? 's' : ''} must be fixed:
          </p>
          <ul className="space-y-1">
            {criticalErrors.map((e) => (
              <li
                key={e.field}
                className="text-sm text-destructive bg-destructive/5 rounded px-3 py-1.5"
              >
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-yellow-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} warning{warnings.length > 1 ? 's' : ''}:
          </p>
          <ul className="space-y-1">
            {warnings.map((e) => (
              <li
                key={e.field}
                className="text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-1.5"
              >
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="bg-muted/40 rounded-lg p-4 text-sm space-y-1.5 border">
        <Row label="Process" value={entry.processName || '—'} />
        <Row label="Domain" value={entry.domain || '—'} />
        <Row label="Team Owner" value={entry.teamOwner.join(', ') || '—'} />
        <Row label="Volume Tier" value={entry.volumeTier || '—'} />
        <Row label="Atlas Copilot" value={entry.atlasCopilot ? 'Yes' : 'No'} />
        <Row label="Decagon (L0)" value={entry.decagonL0 ? 'Yes' : 'No'} />
        <Row label="L0 Containable" value={entry.l0Containable ? 'Yes' : 'No'} />
        <Row label="Workato" value={entry.workato ? 'Yes' : 'No'} />
        <Row label="Spoofable Risk" value={entry.spoofableRisk || '—'} />
        <Row label="Map nodes" value={String(entry.processMap.nodes.length)} />
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => downloadYaml(entry)}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Download YAML
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className={cn('flex-1', canSubmit ? '' : 'opacity-50')}
        >
          {submitting ? 'Submitting…' : 'Submit to Notion'}
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
