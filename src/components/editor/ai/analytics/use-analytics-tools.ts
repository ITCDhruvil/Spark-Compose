'use client'

import { useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { aiApi } from '@/lib/api/ai-client'
import type { ChartKind } from '@/lib/editor/smart/spark-chart/chart-from-table'
import { buildChartFromTable, buildProgressChart } from '@/lib/editor/smart/spark-chart/chart-from-table'
import type { ProgressAnalyticsMode } from '@/lib/api/ai-types'
import {
  extractTableAtSelection,
  getContextText,
  parseDelimitedText,
  type TableData,
} from '@/lib/editor/smart/spark-chart/table-data'

function insertBelowPos(editor: Editor, pos: number, run: () => boolean) {
  editor.chain().focus().setTextSelection(pos).run()
  return run()
}

function insertAfterTable(editor: Editor, table: TableData, run: () => boolean) {
  return insertBelowPos(editor, table.end, run)
}

export function useAnalyticsTools(editor: Editor) {
  const insertChart = useCallback((chartType: ChartKind) => {
    const table = extractTableAtSelection(editor)
    if (!table) return false
    const config = buildChartFromTable(table, chartType)
    if (!config) return false
    return insertAfterTable(editor, table, () =>
      editor.chain().insertChartBlock(config).run(),
    )
  }, [editor])

  const insertKpis = useCallback(async () => {
    const text = getContextText(editor)
    if (!text.trim()) return false

    const table = extractTableAtSelection(editor)
    const insertPos = table ? table.end : editor.state.selection.to

    try {
      const res = await aiApi.kpiWidgets({ text })
      if (!res.kpis.length) return false
      return insertBelowPos(editor, insertPos, () =>
        editor.chain().insertKpiRow(res.kpis).run(),
      )
    } catch {
      return false
    }
  }, [editor])

  const insertProgress = useCallback(async (mode: ProgressAnalyticsMode) => {
    const table = extractTableAtSelection(editor)
    const selectionText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
      '\n',
    ).trim()

    let dataTable: TableData | null = table
    if (!dataTable && selectionText) {
      dataTable = parseDelimitedText(selectionText)
    }

    const insertPos = table
      ? table.end
      : dataTable?.end && dataTable.end > 0
        ? dataTable.end
        : editor.state.selection.to

    if (dataTable && dataTable.rows.length) {
      const config = buildProgressChart(dataTable, mode)
      if (config) {
        return insertBelowPos(editor, insertPos > 0 ? insertPos : editor.state.selection.to, () =>
          editor.chain().insertChartBlock(config).run(),
        )
      }
    }

    const text = getContextText(editor)
    if (!text.trim()) return false

    try {
      const res = await aiApi.progressAnalytics({ text, mode })
      const normalized: TableData = {
        headers: res.headers,
        rows: res.rows,
        pos: -1,
        end: insertPos,
      }
      const config = buildProgressChart(normalized, mode, res.title)
      if (!config) return false
      return insertBelowPos(editor, insertPos, () =>
        editor.chain().insertChartBlock(config).run(),
      )
    } catch {
      return false
    }
  }, [editor])

  const hasTableContext = useCallback(() => {
    return !!extractTableAtSelection(editor)
  }, [editor])

  return {
    insertChart,
    insertKpis,
    insertProgress,
    hasTableContext,
  }
}
