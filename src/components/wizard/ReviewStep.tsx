import { useState } from 'react'
import type { ProcessEntry } from '@/lib/types'
import { validateEntry } from '@/lib/validate'
import { downloadYaml, toYaml } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle, Download, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import KbLinksPanel from '@/components/canvas/KbLinksPanel'

interface ReviewStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
  onSubmit: () => void
  submitting: boolean
}

export default function ReviewStep({ entry, onChange, onSubmit, submitting }: ReviewStepProps) {
  const [yamlOpen, setYamlOpen] = useState(false)
  const errors = validateEntry(entry)
  const criticalErrors = errors.filter((e) => e.critical)
  const warnings = errors.filter((e) => !e.critical)
  const canSubmit = criticalErrors.length === 0
  const yaml = toYaml(entry)

  function copyYaml() {
    navigator.clipboard.writeText(yaml).then(() => toast.success('YAML copied'))
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fix any critical issues before submitting. Warnings are allowed but flagged in the output.
        </p>
      </div>

      {canSubmit && (
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
              <li key={e.field} className="text-sm text-destructive bg-destructive/5 rounded px-3 py-1.5">
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-yellow-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            {warnings.length} warning{warnings.length > 1 ? 's' : ''}:
          </p>
          {warnings.map((e) => (
            <p key={e.field} className="text-sm text-yellow-700 bg-yellow-50 rounded px-3 py-1.5">{e.message}</p>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1.5 border">
        <Row label="Process" value={entry.processName || '—'} />
        <Row label="Domain" value={entry.domain || '—'} />
        <Row label="Team Owner" value={entry.teamOwner.join(', ') || '—'} />
        <Row label="Volume Tier" value={entry.volumeTier || '—'} />
        <Row label="Spoofable Risk" value={entry.spoofableRisk || '—'} />
        <Row label="L0 Containable" value={entry.l0Containable ? 'Yes' : 'No'} />
        <Row label="Workato" value={entry.workato ? 'Yes' : 'No'} />
        <Row label="Map nodes" value={String(entry.processMap.nodes.length)} />
      </div>

      {/* Process-level KB links */}
      <div className="border rounded-lg p-3">
        <KbLinksPanel
          links={entry.kbLinks ?? []}
          onChange={links => onChange({ kbLinks: links })}
          label="Process Documentation Links"
        />
      </div>

      {/* YAML preview — collapsible */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setYamlOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {yamlOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            YAML export preview
          </span>
          {yamlOpen && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); copyYaml() }}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3 h-3" /> Copy
            </span>
          )}
        </button>
        {yamlOpen && (
          <pre className="text-[10px] leading-relaxed p-3 overflow-auto max-h-48 bg-background font-mono text-foreground">
            {yaml}
          </pre>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadYaml(entry)} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Download YAML
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || submitting}
          className={cn('flex-1', !canSubmit && 'opacity-50')}
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
      <span className="text-muted-foreground w-32 shrink-0 text-xs">{label}</span>
      <span className="font-medium text-xs">{value}</span>
    </div>
  )
}
