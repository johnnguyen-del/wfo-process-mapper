import type { ProcessEntry, Domain, TeamOwner } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldGroup from './FieldGroup'
import MultiToggle from './MultiToggle'

const DOMAINS: Domain[] = ['Banking', 'Transfers', 'Invest', 'Security & Risk', 'PRR']
const TEAM_OWNERS: TeamOwner[] = ['CS', 'Ops', 'Fraud Ops', 'L2 - Risk']

interface CoreIdentityStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
}

export default function CoreIdentityStep({ entry, onChange }: CoreIdentityStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Core Identity</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Name and describe this process so someone outside your pod understands it.
        </p>
      </div>

      <FieldGroup
        label="Process Name"
        hint="Use a clear, specific name — e.g. Metal Card Reissuance — Client Request, not Metal Card thing"
        required
      >
        <Input
          value={entry.processName}
          onChange={(e) => onChange({ processName: e.target.value })}
          placeholder="e.g. Wire Transfer Trace Request"
        />
      </FieldGroup>

      <FieldGroup
        label="Domain"
        hint="The pod that owns this process — accountability, not who touches it"
        required
      >
        <MultiToggle<Domain>
          options={DOMAINS}
          value={entry.domain ? [entry.domain] : []}
          onChange={(v) => onChange({ domain: v[0] ?? '' })}
          single
          customizable
        />
      </FieldGroup>

      <FieldGroup
        label="Description"
        hint="1–3 sentences: what triggers it, what action is taken, how it resolves. Not step-by-step."
        required
      >
        <Textarea
          value={entry.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="e.g. Triggered when a client reports a wire transfer not received. Agent looks up the wire in OAS, confirms status, and escalates to Ops via BOPSIT JIRA if the wire shows as sent."
          rows={4}
        />
      </FieldGroup>

      <FieldGroup
        label="Source Link (Blowout Link)"
        hint="URL to the original process documentation — Guru card, Notion page, or GDoc"
      >
        <input
          type="url"
          value={entry.sourceUrl ?? ''}
          onChange={e => onChange({ sourceUrl: e.target.value || undefined })}
          placeholder="https://... (original process documentation)"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </FieldGroup>

      <FieldGroup
        label="Team Owner"
        hint="The team that owns and executes this workflow. L1 triages to L2? Select L2 only."
        required
      >
        <MultiToggle<TeamOwner>
          options={TEAM_OWNERS}
          value={entry.teamOwner}
          onChange={(v) => onChange({ teamOwner: v })}
          customizable
        />
      </FieldGroup>
    </div>
  )
}
