# KPI widgets

## What it is

AI-generated **KPI cards** (SPI, CPI, open RFIs, defects, delays, productivity, etc.) inserted as a row of widgets below your selection or table.

## Problem it solves

Dashboard-style metrics in a narrative report usually mean copy-paste from another tool. KPI widgets surface numbers from notes or tables in one step.

## How to use

1. Select relevant text **or** place cursor in a metrics table.
2. **Spark AI → Analytics → KPI widgets**.
3. Cards insert below; edit surrounding narrative as needed.

## Notes

- API: `/api/ai/kpi-widgets`
- TipTap node: `kpiRow` (`kpi-row.ts`)
- **Uses AI** — interprets messy text; verify numbers against source systems.
- Marked **New** in UI.

## Related

- [Spark Chart](../smart-features/spark-chart.md) — instant charts without AI
- [Progress analytics](./progress-analytics.md)
