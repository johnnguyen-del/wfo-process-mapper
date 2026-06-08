import type { ProcessEntry, OpsDomain } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldGroup from './FieldGroup'
import MultiToggle from './MultiToggle'

const OPS_DOMAINS: OpsDomain[] = ['C&B', 'I&O', 'I&C', 'C&D']

interface TaxonomyStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
}

export default function TaxonomyStep({ entry, onChange }: TaxonomyStepProps) {
  const isSecurityRisk = entry.domain === 'Security & Risk'

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Taxonomy & Admin</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Links and metadata that connect this process to the broader inventory.
        </p>
      </div>

      {isSecurityRisk && (
        <FieldGroup
          label="Ops Domains"
          hint="Security & Risk pod only — the Ops domain(s) involved"
        >
          <MultiToggle<OpsDomain>
            options={OPS_DOMAINS}
            value={entry.opsDomains}
            onChange={(v) => onChange({ opsDomains: v })}
          />
        </FieldGroup>
      )}

      <FieldGroup
        label="CX Ticket Driver"
        hint="Link to or name the 1C-level STELLA driver(s) — ties process changes to ticket volume shifts"
      >
        <Input
          value={entry.cxTicketDriver}
          onChange={(e) => onChange({ cxTicketDriver: e.target.value })}
          placeholder="e.g. Banking — Wire Transfer — Not Received"
        />
      </FieldGroup>

      <FieldGroup
        label="Other Metrics"
        hint="Edge cases, known issues, tools not in User Tools list, or caveats about current state"
      >
        <Textarea
          value={entry.otherMetrics}
          onChange={(e) => onChange({ otherMetrics: e.target.value })}
          placeholder="e.g. Requires OAS access + Persona lookup. Some L3 volume due to complex FX wires."
          rows={3}
        />
      </FieldGroup>
    </div>
  )
}
