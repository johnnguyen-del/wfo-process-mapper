import type { ProcessEntry, EditLogEntry } from '@/lib/types'

function avatarColor(email: string): string {
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16']
  return colors[Math.abs(hash) % colors.length]
}

function avatarInitials(email: string): string {
  const name = email.split('@')[0] ?? email
  return name.slice(0, 2).toUpperCase()
}

function Avatar({ email, size = 28 }: { email: string; size?: number }) {
  return (
    <div
      title={email}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        backgroundColor: avatarColor(email),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 700, color: 'white',
        flexShrink: 0,
        border: '2px solid white',
      }}
    >
      {avatarInitials(email)}
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

interface DetailsTabProps {
  entry: ProcessEntry
}

export default function DetailsTab({ entry }: DetailsTabProps) {
  const collaboratorsOnly = (entry.collaborators ?? []).filter(c => c !== entry.author)
  const log = entry.editLog ?? []

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Author</p>
        {entry.author ? (
          <div className="flex items-center gap-2">
            <Avatar email={entry.author} />
            <div>
              <p className="text-xs font-medium">{entry.author}</p>
              {log.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Created {relativeTime(log[log.length - 1].at)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not yet saved</p>
        )}
      </div>

      {collaboratorsOnly.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Collaborators</p>
          <div className="flex flex-wrap gap-2">
            {collaboratorsOnly.map(email => (
              <div key={email} className="flex items-center gap-1.5">
                <Avatar email={email} size={24} />
                <span className="text-xs text-muted-foreground">{email.split('@')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Edit Log {log.length > 0 && <span className="font-normal normal-case">({log.length})</span>}
        </p>
        {log.length === 0 ? (
          <p className="text-xs text-muted-foreground">No edits recorded yet</p>
        ) : (
          <div className="space-y-2">
            {log.map((logEntry: EditLogEntry, i: number) => (
              <div key={i} className="flex gap-2.5 text-xs">
                <Avatar email={logEntry.by} size={20} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">{logEntry.by.split('@')[0]}</span>
                    <span className={logEntry.action === 'submitted' ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                      {logEntry.action === 'submitted' ? 'Submitted' : 'Saved'}
                    </span>
                    <span className="text-muted-foreground">{relativeTime(logEntry.at)}</span>
                  </div>
                  {logEntry.changed && logEntry.changed.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Updated: {logEntry.changed.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
