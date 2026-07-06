# Spark Chart

## What it is

**Spark Chart** turns the **current table** into a chart block below the table — bar, line, pie, area, scatter, or doughnut — **instantly**, with no AI call.

Branded with the Spark shimmer style in the table toolbar.

## Problem it solves

Users should not export to Excel just to visualize a small trade/hours/cost table. One click from the table should produce a presentation-ready chart.

## How to use

1. Click inside a table that has:
   - A **label column** (first column — e.g. Trade names)
   - At least one **numeric column** (Hours, Cost, etc.)
2. In the **table toolbar**, click **Spark Chart** (shimmer label).
3. Pick a chart type from the dropdown.
4. Chart appears **below** the table.

Alternative: **Spark AI → Analytics → Spark Chart** (same chart types; table must be in context).

## Notes

- Logic: `chart-from-table.ts` + `use-analytics-tools.ts`
- Uses **Recharts** for rendering.
- **Not AI** — documented under smart features for accuracy; also listed in Spark AI Analytics for discoverability.
- Chart is editable after insert — see [chart-blocks.md](./chart-blocks.md).
