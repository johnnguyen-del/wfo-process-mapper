import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'

interface WorthMappingGateProps {
  onYes: () => void
  onNo: () => void
}

const CRITERIA = [
  'Agent must take an action in an internal tool (Atlas, OAS, Persona, JIRA…)',
  'Agent must look something up or verify data in a system',
  'Agent must coordinate with back-office or another team',
  'Resolving it has multiple decision points or branches',
]

export default function WorthMappingGate({ onYes, onNo }: WorthMappingGateProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Is this process worth mapping?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Before capturing a process, confirm it meets at least one of these criteria.
          Processes answerable from the Help Centre alone don't need a row.
        </p>
      </div>

      <ul className="space-y-2">
        {CRITERIA.map((c) => (
          <li key={c} className="flex items-start gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            {c}
          </li>
        ))}
      </ul>

      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Examples:</strong> Metal Card Reissuance, Wire Transfer Trace,
        Fraud Investigation Hold, NSF Reversal — these all map. "What is the e-Transfer limit?" — does not.
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={onYes} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-1.5" />
          Yes, it's worth mapping
        </Button>
        <Button variant="outline" onClick={onNo} className="flex-1">
          <XCircle className="w-4 h-4 mr-1.5" />
          No, skip this one
        </Button>
      </div>
    </div>
  )
}
