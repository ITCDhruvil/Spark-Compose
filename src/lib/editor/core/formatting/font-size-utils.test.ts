import { describe, expect, it } from 'vitest'
import {
  fontSizePtToCSSValue,
  isValidCustomFontSizePt,
  labelFromFontSizeAttr,
} from './font-size-utils'

describe('font-size-utils', () => {
  it('accepts whole and half-point sizes', () => {
    expect(isValidCustomFontSizePt('11')).toBe(true)
    expect(isValidCustomFontSizePt('4.5')).toBe(true)
    expect(isValidCustomFontSizePt('6.5')).toBe(true)
  })

  it('rejects invalid fractional steps', () => {
    expect(isValidCustomFontSizePt('6.6')).toBe(false)
    expect(isValidCustomFontSizePt('6.623')).toBe(false)
  })

  it('converts valid input to pt CSS values', () => {
    expect(fontSizePtToCSSValue('11')).toBe('11pt')
    expect(fontSizePtToCSSValue('11.5')).toBe('11.5pt')
    expect(fontSizePtToCSSValue('6.6')).toBeNull()
  })

  it('labels font size attributes', () => {
    expect(labelFromFontSizeAttr('11.5pt')).toBe('11.5')
    expect(labelFromFontSizeAttr('12pt')).toBe('12')
    expect(labelFromFontSizeAttr(undefined)).toBe('11')
  })
})
