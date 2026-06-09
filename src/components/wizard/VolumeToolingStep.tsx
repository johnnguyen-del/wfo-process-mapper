import type { ProcessEntry, VolumeTier, UserTool, JiraBoard } from '@/lib/types'
import FieldGroup from './FieldGroup'
import MultiToggle from './MultiToggle'
import { cn } from '@/lib/utils'

const VOLUME_TIERS: VolumeTier[] = ['High', 'Medium', 'Low']
const USER_TOOLS: UserTool[] = ['Atlas', 'Persona', 'OAS', 'JIRA', 'Google Sheets', 'DOCX']
const JIRA_BOARDS: JiraBoard[] = ['BOPSIT', 'BOPSFUND', 'EOC', 'BOSM', 'BOTAX', 'WORP', 'BOAO', 'LEDGE', 'DAM', 'FRAUD', 'DOCX']

const TIER_COLORS: Record<VolumeTier, string> = {
  High: 'border-red-400 text-red-700 bg-red-50',
  Medium: 'border-yellow-400 text-yellow-700 bg-yellow-50',
  Low: 'border-green-400 text-green-700 bg-green-50',
}

interface VolumeToolingStepProps {
  entry: ProcessEntry
  onChange: (patch: Partial<ProcessEntry>) => void
}

export default function VolumeToolingStep({ entry, onChange }: VolumeToolingStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Volume & Tooling</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calibrate volume using STELLA/Preset data — not a guess. Select all tools an agent needs end-to-end.
        </p>
      </div>

      <FieldGroup
        label="Volume Tier"
        hint="High = top driver; Medium = moderate; Low = infrequent"
        required
      >
        <div className="flex gap-3">
          {VOLUME_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onChange({ volumeTier: tier })}
              className={cn(
                'flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all',
                entry.volumeTier === tier
                  ? TIER_COLORS[tier]
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              )}
            >
              {tier}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup
        label="User Tools"
        hint="All tools needed to handle this workflow end-to-end — note unlisted tools in Other Metrics"
        required
      >
        <MultiToggle<UserTool>
          options={USER_TOOLS}
          value={entry.userTools}
          onChange={(v) => onChange({ userTools: v })}
          customizable
        />
      </FieldGroup>

      <FieldGroup
        label="Jira Board(s)"
        hint="Every board that receives a ticket as part of this workflow — leave empty if no JIRA ticket is created"
      >
        <MultiToggle<JiraBoard>
          options={JIRA_BOARDS}
          value={entry.jiraBoards}
          onChange={(v) => onChange({ jiraBoards: v })}
          customizable
        />
      </FieldGroup>
    </div>
  )
}
