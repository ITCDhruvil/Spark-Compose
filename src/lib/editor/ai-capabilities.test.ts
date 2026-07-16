import { describe, expect, it } from 'vitest'
import { isAiSlashKey, resolveAiEnabled } from './ai-capabilities'

describe('resolveAiEnabled', () => {
  it('defaults to true when unset', () => {
    expect(resolveAiEnabled()).toBe(true)
    expect(resolveAiEnabled(undefined)).toBe(true)
  })

  it('respects boolean toggle', () => {
    expect(resolveAiEnabled(true)).toBe(true)
    expect(resolveAiEnabled(false)).toBe(false)
  })

  it('respects object form', () => {
    expect(resolveAiEnabled({})).toBe(true)
    expect(resolveAiEnabled({ enabled: true })).toBe(true)
    expect(resolveAiEnabled({ enabled: false })).toBe(false)
  })
})

describe('isAiSlashKey', () => {
  it('detects Ask / Draft commands', () => {
    expect(isAiSlashKey('ask')).toBe(true)
    expect(isAiSlashKey('draft')).toBe(true)
    expect(isAiSlashKey('draft-coach')).toBe(true)
    expect(isAiSlashKey('heading-1')).toBe(false)
    expect(isAiSlashKey(undefined)).toBe(false)
  })
})
