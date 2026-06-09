import { useEffect } from 'react'
import type { ProcessEntry, OutboundComm, SpoofableRisk } from '@/lib/types'
import { Input } from '@/components/ui/input'
import FieldGroup from './FieldGroup'
import MultiToggle from './MultiToggle'
import { isSpoofableRiskAutoNA } from '@/lib/validate'
import { cn } from '@/lib/utils'

const OUTBOUND_COMMS: OutboundComm[] = ['None', 'Manual', 'Workato', 'Auto Comms', 'Docusign']
const SPOOFABLE_RISKS: SpoofableRisk[] = ['High', 'Medium', 'Low', 'N/A']

const RISK_STYLES: Record<SpoofableRisk, string> = {
  High: 'border-red-400 text-red-700 bg-red-50',
  Medium: 'border-yellow-400 text-yellow-700 bg-yellow-50',
  Low: 'border-green-400 text-green-700 bg-green-50',
  'N/A': 'border-muted text-muted-foreground bg-muted/30',
}

interface CommsStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
}

export default function CommsStep({ entry, onChange }: CommsStepProps) {
  const autoNA = isSpoofableRiskAutoNA(entry.outboundComms)

  useEffect(() => {
    if (autoNA && entry.spoofableRisk !== 'N/A') {
      onChange({ spoofableRisk: 'N/A' })
    }
  }, [autoNA])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Comms & Fraud Risk</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select all outbound communication types — critical for fraud risk analysis. Gaps create blind spots.
        </p>
      </div>

      <FieldGroup
        label="Outbound Comms"
        hint="All comms triggered by this workflow. Select all that apply."
        required
      >
        <MultiToggle<OutboundComm>
          options={OUTBOUND_COMMS}
          value={entry.outboundComms}
          onChange={(v) => onChange({ outboundComms: v })}
          customizable
        />
      </FieldGroup>

      {entry.outboundComms.length > 0 && (
        <FieldGroup
          label="Spoofable Risk"
          hint={
            autoNA
              ? 'Auto-set to N/A because Outbound Comms is None'
              : 'Risk that these comms could be spoofed for fraud. When in doubt, rate higher.'
          }
          required
        >
          {autoNA ? (
            <div className="text-sm px-3 py-2 rounded-lg border border-muted bg-muted/30 text-muted-foreground">
              N/A — no outbound comms
            </div>
          ) : (
            <div className="flex gap-2">
              {SPOOFABLE_RISKS.filter((r) => r !== 'N/A').map((risk) => (
                <button
                  key={risk}
                  type="button"
                  onClick={() => onChange({ spoofableRisk: risk })}
                  className={cn(
                    'flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                    entry.spoofableRisk === risk
                      ? RISK_STYLES[risk]
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  )}
                >
                  {risk}
                </button>
              ))}
            </div>
          )}
        </FieldGroup>
      )}

      <FieldGroup
        label="Client Comms Example"
        hint="Link to Braze template, email example, or Docusign template — leave blank if none exists"
      >
        <Input
          value={entry.clientComms}
          onChange={(e) => onChange({ clientComms: e.target.value })}
          placeholder="https://..."
          type="url"
        />
      </FieldGroup>
    </div>
  )
}
