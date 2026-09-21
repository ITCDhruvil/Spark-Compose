import { describe, it, expect } from 'vitest'
import { parseNumericValue, parseDelimitedText } from './table-data'
import { buildChartFromTable, buildProgressChart } from './chart-from-table'

describe('parseNumericValue', () => {
  it('parses currency and percent', () => {
    expect(parseNumericValue('£1,234.5')).toBe(1234.5)
    expect(parseNumericValue('85%')).toBe(85)
  })
})

describe('parseDelimitedText', () => {
  it('parses CSV', () => {
    const t = parseDelimitedText('Week,Remaining\nW1,100\nW2,75\nW3,50')
    expect(t?.headers).toEqual(['Week', 'Remaining'])
    expect(t?.rows).toHaveLength(3)
  })
})

describe('buildChartFromTable', () => {
  const table = {
    headers: ['Trade', 'Hours', 'Cost'],
    rows: [
      ['Steel', '120', '45000'],
      ['Concrete', '80', '32000'],
      ['MEP', '95', '28000'],
    ],
    pos: 0,
    end: 10,
  }

  it('builds bar chart with multiple series', () => {
    const chart = buildChartFromTable(table, 'bar')
    expect(chart?.chartType).toBe('bar')
    expect(chart?.labels).toEqual(['Steel', 'Concrete', 'MEP'])
    expect(chart?.datasets).toHaveLength(2)
  })

  it('builds pie from first numeric column', () => {
    const chart = buildChartFromTable(table, 'pie')
    expect(chart?.datasets[0]?.data).toEqual([120, 80, 95])
  })

  it('builds scatter', () => {
    const chart = buildChartFromTable(table, 'scatter')
    expect(chart?.scatterData).toHaveLength(3)
  })
})

describe('buildProgressChart', () => {
  it('builds burndown from date column', () => {
    const table = {
      headers: ['Week', 'Remaining tasks'],
      rows: [['W1', '40'], ['W2', '28'], ['W3', '15']],
      pos: 0,
      end: 10,
    }
    const chart = buildProgressChart(table, 'burndown')
    expect(chart?.chartType).toBe('line')
    expect(chart?.datasets[0]?.data).toEqual([40, 28, 15])
  })
})
