import type { ProcessEntry } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import FieldGroup from './FieldGroup'
import { cn } from '@/lib/utils'

interface AutomationStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
}

interface CheckItemProps {
  id: string
  label: string
  description: string
  checked: boolean
  onCheck: (v: boolean) => void
}

function CheckItem({ id, label, description, checked, onCheck }: CheckItemProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        checked ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/40'
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheck(!!v)}
        className="mt-0.5"
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  )
}

export default function AutomationStep({ entry, onChange }: AutomationStepProps) {
  const needsBlocker = entry.l0Containable && !entry.decagonL0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Automation State</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Current state only — check what is actively working today, not what could work.
        </p>
      </div>

      <div className="space-y-2">
        <CheckItem
          id="atlas-copilot"
          label="Atlas Copilot"
          description="A complete, reliable Copilot procedure exists that lets L1 fully resolve this without escalation"
          checked={entry.atlasCopilot}
          onCheck={(v) => onChange({ atlasCopilot: v })}
        />
        <CheckItem
          id="decagon-l0"
          label="Decagon (L0)"
          description="Decagon is actively resolving this today — current state, not potential. If partially contained, leave unchecked"
          checked={entry.decagonL0}
          onCheck={(v) => onChange({ decagonL0: v })}
        />
        <CheckItem
          id="l0-containable"
          label="L0 Containable"
          description="A plausible path to full L0 containment exists, even if not there yet"
          checked={entry.l0Containable}
          onCheck={(v) => onChange({ l0Containable: v })}
        />
      </div>

      {needsBlocker && (
        <FieldGroup
          label="Containment Blocker"
          hint='Required — be specific. e.g. "Decagon cannot access OAS to verify account status" not "not ready yet"'
          required
        >
          <Textarea
            value={entry.containmentBlocker}
            onChange={(e) => onChange({ containmentBlocker: e.target.value })}
            placeholder='e.g. "Decagon cannot access OAS to verify card status before initiating reissuance"'
            rows={3}
          />
        </FieldGroup>
      )}

      <div className="border-t pt-4 space-y-3">
        <CheckItem
          id="workato"
          label="Workato"
          description="A Workato recipe is involved at any point — sending a comm, creating a ticket, or automating a step"
          checked={entry.workato}
          onCheck={(v) => onChange({ workato: v, workatoRecipeLink: v ? entry.workatoRecipeLink : '' })}
        />

        {entry.workato && (
          <FieldGroup
            label="Workato Recipe Link"
            hint="Direct recipe URL from the Workato inventory"
            required
          >
            <Input
              value={entry.workatoRecipeLink}
              onChange={(e) => onChange({ workatoRecipeLink: e.target.value })}
              placeholder="https://app.workato.com/recipes/..."
              type="url"
            />
          </FieldGroup>
        )}
      </div>
    </div>
  )
}
