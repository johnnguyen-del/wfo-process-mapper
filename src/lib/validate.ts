import type { ProcessEntry } from './types'

export interface ValidationError {
  field: string
  message: string
  critical: boolean
}

export function validateEntry(entry: ProcessEntry): ValidationError[] {
  const errors: ValidationError[] = []

  const req = (field: string, value: string | string[] | boolean, label: string) => {
    const empty = Array.isArray(value) ? value.length === 0 : value === '' || value === false
    if (empty) {
      errors.push({ field, message: `${label} is required`, critical: true })
    }
  }

  // Core Identity
  req('processName', entry.processName, 'Process Name')
  req('domain', entry.domain, 'Domain')
  req('description', entry.description, 'Description')
  req('teamOwner', entry.teamOwner, 'Team Owner')

  // Volume & Tooling
  req('volumeTier', entry.volumeTier, 'Volume Tier')
  req('userTools', entry.userTools, 'User Tools')

  // Automation — conditional
  if (entry.l0Containable && !entry.decagonL0) {
    if (!entry.containmentBlocker.trim()) {
      errors.push({
        field: 'containmentBlocker',
        message: 'Containment Blocker is required when L0 Containable is checked but Decagon (L0) is not',
        critical: true,
      })
    }
  }
  if (entry.workato && !entry.workatoRecipeLink.trim()) {
    errors.push({
      field: 'workatoRecipeLink',
      message: 'Workato Recipe Link is required when Workato is checked',
      critical: true,
    })
  }

  // Comms
  req('outboundComms', entry.outboundComms, 'Outbound Comms')
  if (entry.outboundComms.length > 0 && !entry.spoofableRisk) {
    errors.push({
      field: 'spoofableRisk',
      message: 'Spoofable Risk is required',
      critical: true,
    })
  }

  // Process map — non-critical gap warning
  if (entry.processMap.nodes.length === 0) {
    errors.push({
      field: 'processMap',
      message: 'No process map nodes added — consider building a map before submitting',
      critical: false,
    })
  }

  return errors
}

export function isSpoofableRiskAutoNA(outboundComms: string[]): boolean {
  return outboundComms.length > 0 && outboundComms.every((c) => c === 'None')
}
