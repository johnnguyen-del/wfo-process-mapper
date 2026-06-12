// src/test/guru.test.ts
import { parseGuruCardId, hasWorkflowData } from '@/lib/guru'
import { describe, it, expect } from 'vitest'

describe('parseGuruCardId', () => {
  it('extracts id from full Guru URL', () => {
    expect(parseGuruCardId('https://app.getguru.com/card/cxE5E4ai/Credit-Card-Interest'))
      .toBe('cxE5E4ai')
  })
  it('extracts id from URL without trailing slug', () => {
    expect(parseGuruCardId('https://app.getguru.com/card/abc12345'))
      .toBe('abc12345')
  })
  it('returns direct id when input looks like a card id', () => {
    expect(parseGuruCardId('cxE5E4ai')).toBe('cxE5E4ai')
  })
  it('returns null for garbage input', () => {
    expect(parseGuruCardId('not a url or id')).toBeNull()
  })
  it('returns null for empty string', () => {
    expect(parseGuruCardId('')).toBeNull()
  })
})

describe('hasWorkflowData', () => {
  it('returns true for content with role and action keywords', () => {
    expect(hasWorkflowData('CS agent should verify the account and escalate to L2 if needed')).toBe(true)
  })
  it('returns false for generic policy content', () => {
    expect(hasWorkflowData('This policy governs how we handle refunds at Wealthsimple.')).toBe(false)
  })
  it('returns true for content with step-like structure', () => {
    expect(hasWorkflowData('Step 1: Review account. Step 2: Submit JIRA ticket.')).toBe(true)
  })
})
