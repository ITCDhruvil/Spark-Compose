import { describe, it, expect } from 'vitest'
import { parseSlashQuery } from './slash-command-parser'

describe('parseSlashQuery', () => {
  it('parses table dimensions with x, ×, and +', () => {
    expect(parseSlashQuery('table 3x3')).toEqual({
      kind: 'table', rows: 3, cols: 3, header: false,
    })
    expect(parseSlashQuery('table3x3')).toEqual({
      kind: 'table', rows: 3, cols: 3, header: false,
    })
    expect(parseSlashQuery('table 4+6')).toEqual({
      kind: 'table', rows: 4, cols: 6, header: false,
    })
    expect(parseSlashQuery('table4+6')).toEqual({
      kind: 'table', rows: 4, cols: 6, header: false,
    })
    expect(parseSlashQuery('table 2×5 header')).toEqual({
      kind: 'table', rows: 2, cols: 5, header: true,
    })
    expect(parseSlashQuery('table2x5header')).toEqual({
      kind: 'table', rows: 2, cols: 5, header: true,
    })
  })

  it('defaults table keyword to 3x3 with header', () => {
    expect(parseSlashQuery('table')).toEqual({
      kind: 'table', rows: 3, cols: 3, header: true,
    })
  })

  it('parses partial table as square', () => {
    expect(parseSlashQuery('table 4')).toEqual({
      kind: 'table', rows: 4, cols: 4, header: false,
    })
    expect(parseSlashQuery('table4')).toEqual({
      kind: 'table', rows: 4, cols: 4, header: false,
    })
  })

  it('parses headings with optional title', () => {
    expect(parseSlashQuery('h2')).toEqual({ kind: 'heading', level: 2 })
    expect(parseSlashQuery('h2 Site briefing')).toEqual({
      kind: 'heading', level: 2, title: 'Site briefing',
    })
  })

  it('parses callout types and aliases', () => {
    expect(parseSlashQuery('callout')).toEqual({ kind: 'callout', type: 'info' })
    expect(parseSlashQuery('callout warning')).toEqual({ kind: 'callout', type: 'warning' })
    expect(parseSlashQuery('callout warn')).toEqual({ kind: 'callout', type: 'warning' })
    expect(parseSlashQuery('calloutwarning')).toEqual({ kind: 'callout', type: 'warning' })
  })

  it('parses checklist counts', () => {
    expect(parseSlashQuery('checklist')).toEqual({ kind: 'checklist', items: 3 })
    expect(parseSlashQuery('checklist 5')).toEqual({ kind: 'checklist', items: 5 })
    expect(parseSlashQuery('checklist5')).toEqual({ kind: 'checklist', items: 5 })
  })

  it('parses cols shorthand', () => {
    expect(parseSlashQuery('cols 4')).toEqual({ kind: 'cols', cols: 4 })
    expect(parseSlashQuery('cols4')).toEqual({ kind: 'cols', cols: 4 })
    expect(parseSlashQuery('col')).toEqual({ kind: 'cols', cols: 4 })
  })

  it('returns null for unknown queries', () => {
    expect(parseSlashQuery('banana')).toBeNull()
    expect(parseSlashQuery('table 3x')).toBeNull()
  })
})
