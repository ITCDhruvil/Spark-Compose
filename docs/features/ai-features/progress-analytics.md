# Progress analytics

## What it is

AI-assisted **progress charts** from project data — burn-down, trends, or CSV-style visualizations.

## Problem it solves

Progress reporting often lives in spreadsheets. This inserts trend/burn-down charts from table or CSV-like selection into the document.

## How to use

1. Select a **table** or **CSV text**, or provide context via selection.
2. **Spark AI → Analytics → Progress** → choose:
   - **Burn-down** — remaining work over time
   - **Trends** — metrics by period
   - **From CSV** — chart pasted spreadsheet data
3. Chart block inserts below source.

## Notes

- API: `/api/ai/progress-analytics`
- Falls back to rule-based chart build when table structure is clear (`buildProgressChart`)
- Marked **New** in UI.

## Related

- [Spark Chart](../smart-features/spark-chart.md) for instant non-AI charts from tables
