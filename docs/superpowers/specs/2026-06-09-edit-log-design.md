# Author / Collaborators / Edit Log Design

## Schema additions (types.ts)

```typescript
export interface EditLogEntry {
  by: string           // email of editor
  at: string           // ISO timestamp
  action: 'saved' | 'submitted'
  changed?: string[]   // human-readable field names that changed, e.g. ['Process Name', 'Domain']
}

// Add to ProcessEntry:
author?: string           // email — set on first save, never overwritten
collaborators?: string[]  // all editors deduped (includes author)
editLog?: EditLogEntry[]  // chronological, newest first
```

## What triggers a log entry

Every `handleSave` and `handleSubmit` call. On each save:
1. Capture current user email via `(window as any).MagicAuth?.viewer?.()?.email ?? 'unknown'`
2. Set `author` if not already set
3. Add email to `collaborators` (deduped)
4. Diff current entry against `lastSavedRef` to detect changed fields
5. Append log entry (newest first)

## Changed-fields diff

Compare these top-level fields between saves. Use friendly names:
```
processName → 'Process Name'
domain → 'Domain'
description → 'Description'
teamOwner → 'Team Owner'
volumeTier → 'Volume Tier'
userTools → 'User Tools'
jiraBoards → 'JIRA Boards'
atlasCopilot / decagonL0 / workato → 'Automation'
outboundComms → 'Outbound Comms'
spoofableRisk → 'Spoofable Risk'
opsDomains → 'Ops Domains'
cxTicketDriver → 'Ticket Driver'
processMap → 'Process Map'
```

Use `JSON.stringify` comparison for arrays/objects.

## Details tab — third tab in form panel

Sits alongside "Form" and "AI Fill". Shows:
- **Author** section: avatar initials chip + email + created date
- **Collaborators** section: row of avatar chips (deduped, excludes author to avoid repetition)
- **Edit log** section: scrollable list, newest first — `action · by · relative time · changed fields`

Avatar initials: take first 2 chars of the username part of email (before `@`), uppercase. Background colour derived from a simple hash of the email string.

## ProcessList card

Add a compact author + collaborator avatar row at the bottom of each EntryRow, showing max 3 avatars + "+N" overflow. Only shown when `author` or `collaborators` data exists.

## Files

- `src/lib/types.ts` — EditLogEntry, ProcessEntry additions, emptyEntry update
- `src/components/wizard/DetailsTab.tsx` — new component
- `src/pages/ProcessBuilder.tsx` — lastSavedRef, updated handleSave/handleSubmit, add Details tab
- `src/pages/ProcessList.tsx` / EntryRow — avatar chips
