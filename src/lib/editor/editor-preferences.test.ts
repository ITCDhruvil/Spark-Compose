import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLastTable,
  setLastTable,
  recordSlashCommand,
  getRecentSlashKeys,
  setLastCallout,
  getLastCallout,
} from './editor-preferences'

describe('editor-preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and reads last table size', () => {
    setLastTable({ rows: 4, cols: 5, header: true })
    expect(getLastTable()).toEqual({ rows: 4, cols: 5, header: true })
  })

  it('stores last callout type', () => {
    setLastCallout('warning')
    expect(getLastCallout()).toBe('warning')
  })

  it('tracks recent slash keys with dedupe', () => {
    recordSlashCommand('table')
    recordSlashCommand('heading-2')
    recordSlashCommand('table')
    expect(getRecentSlashKeys()).toEqual(['table', 'heading-2'])
  })
})
